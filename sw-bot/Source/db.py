import json
import logging
import math
from contextlib import contextmanager
from datetime import datetime, timedelta

import psycopg2
import pytz
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from globals import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, TICKET_PAY

connection_pool: pool.ThreadedConnectionPool | None = None


def init_pool():
    global connection_pool
    connection_pool = pool.ThreadedConnectionPool(
        minconn=2,
        maxconn=10,
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME,
        keepalives=1,
        keepalives_idle=60,
        keepalives_interval=10,
        keepalives_count=5,
    )


def _acquire_conn() -> psycopg2.extensions.connection:
    global connection_pool
    if connection_pool is None:
        init_pool()
    for attempt in range(3):
        conn = connection_pool.getconn()
        if conn.closed:
            connection_pool.putconn(conn, close=True)
            continue
        try:
            conn.cursor().execute("SELECT 1")
            return conn
        except Exception as e:
            logging.error(f"DB connection validation failed (attempt {attempt + 1}): {e}")
            connection_pool.putconn(conn, close=True)
            try:
                connection_pool.closeall()
            except Exception:
                pass
            init_pool()
    raise psycopg2.OperationalError("DB connection unavailable after 3 attempts")


def _release_conn(conn, *, success: bool) -> None:
    bad = bool(conn.closed)
    if not bad:
        try:
            conn.commit() if success else conn.rollback()
        except Exception as e:
            logging.error(f"DB {'commit' if success else 'rollback'} failed: {e}")
            bad = True
    connection_pool.putconn(conn, close=bad)


@contextmanager
def get_db():
    conn = _acquire_conn()
    try:
        yield conn
        _release_conn(conn, success=True)
    except Exception as e:
        logging.error(f"DB query failed: {e}")
        _release_conn(conn, success=False)
        raise


def format_seconds(seconds):
    if not seconds or seconds <= 0:
        return "0s"
    days, rem = divmod(int(seconds), 86400)
    hours, rem = divmod(rem, 3600)
    minutes, secs = divmod(rem, 60)
    parts = []
    if days:
        parts.append(f"{days}d")
    if hours:
        parts.append(f"{hours}h")
    if minutes:
        parts.append(f"{minutes}m")
    if secs or not parts:
        parts.append(f"{secs}s")
    return " ".join(parts)


def est_day_range_utc(days_back=1):
    est = pytz.timezone("US/Eastern")
    now_est = datetime.now(est)
    target_date = (now_est - timedelta(days=days_back)).date()
    start_est = est.localize(datetime.combine(target_date, datetime.min.time()))
    next_day_est = start_est + timedelta(days=1)
    return (
        start_est.astimezone(pytz.utc).replace(tzinfo=None),
        next_day_est.astimezone(pytz.utc).replace(tzinfo=None),
    )


def period_filter(period):
    p = (period or "all").lower()
    if p == "day":
        return "closed_at >= NOW() - INTERVAL '1 day'"
    if p == "week":
        return "closed_at >= NOW() - INTERVAL '7 days'"
    if p == "month":
        return "closed_at >= NOW() - INTERVAL '1 month'"
    return None


def save_ticket(user_id, user_name, user_avatar, question, user_thread, staff_thread):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO tickets (user_id, user_name, user_avatar, question, user_thread_ts, staff_thread_ts, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'open')
                    RETURNING id
                    """,
                    (user_id, user_name, user_avatar, question, user_thread, staff_thread),
                )
                return cur.fetchone()[0]
    except psycopg2.Error as e:
        logging.error(f"save_ticket failed: {e}")
        return None


def save_message(ticket_id, sender_id, sender_name, sender_avatar, msg, is_staff, files=None, message_ts=None, origin_message_ts=None):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ticket_msgs
                        (ticket_id, sender_id, sender_name, sender_avatar, msg, files, is_staff, message_ts, origin_message_ts)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        ticket_id,
                        sender_id,
                        sender_name,
                        sender_avatar,
                        msg,
                        json.dumps(files) if files else None,
                        is_staff,
                        message_ts,
                        origin_message_ts,
                    ),
                )
    except psycopg2.Error as e:
        logging.error(f"save_message failed: {e}")


def get_ticket(ticket_id):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM tickets WHERE id = %s", (ticket_id,))
                row = cur.fetchone()
                return dict(row) if row else None
    except psycopg2.Error as e:
        logging.error(f"get_ticket failed: {e}")
        return None


def find_ticket(thread):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM tickets WHERE staff_thread_ts = %s OR user_thread_ts = %s",
                    (thread, thread),
                )
                row = cur.fetchone()
                return dict(row) if row else None
    except psycopg2.Error as e:
        logging.error(f"find_ticket failed: {e}")
        return None


def claim_ticket(ticket_id, closer):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE tickets SET closed_by = %s WHERE id = %s",
                    (closer, ticket_id),
                )
                return cur.rowcount > 0
    except psycopg2.Error as e:
        logging.error(f"claim_ticket failed: {e}")
        return False


def close_ticket(ticket_id):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE tickets SET status = 'closed', closed_at = NOW() WHERE id = %s",
                    (ticket_id,),
                )
                return cur.rowcount > 0
    except psycopg2.Error as e:
        logging.error(f"close_ticket failed: {e}")
        return False


def open_ticket(ticket_id):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE tickets SET status = 'open', closed_at = NULL WHERE id = %s",
                    (ticket_id,),
                )
                return cur.rowcount > 0
    except psycopg2.Error as e:
        logging.error(f"open_ticket failed: {e}")
        return False


def get_ticket_user(user_id):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM ticket_users WHERE user_id = %s", (user_id,))
                row = cur.fetchone()
                return dict(row) if row else None
    except psycopg2.Error as e:
        logging.error(f"get_ticket_user failed: {e}")
        return None


def create_ticket_user(user_id):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO ticket_users (user_id, is_opted_in) VALUES (%s, TRUE) ON CONFLICT (user_id) DO NOTHING RETURNING user_id",
                    (user_id,),
                )
                row = cur.fetchone()
                return row[0] if row else user_id
    except psycopg2.Error as e:
        logging.error(f"create_ticket_user failed: {e}")
        return None


def update_ticket_user_opt(user_id, state: bool):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE ticket_users SET is_opted_in = %s WHERE user_id = %s",
                    (state, user_id),
                )
                return cur.rowcount > 0
    except psycopg2.Error as e:
        logging.error(f"update_ticket_user_opt failed: {e}")
        return False


def add_stardust(slack_id, ticket_id=None, amount=TICKET_PAY):
    if not slack_id:
        return None
    try:
        increment = float(amount)
    except (TypeError, ValueError):
        return None
    if increment <= 0:
        return None

    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    UPDATE users
                    SET cookie_balance = cookie_balance + %s,
                        cookies_earned = cookies_earned + %s
                    WHERE slack_id = %s
                    RETURNING id, username, role, avatar, cookie_balance
                    """,
                    (increment, increment, slack_id),
                )
                row = cur.fetchone()
                if not row:
                    return None

                cur.execute(
                    """
                    INSERT INTO sys_logs
                        (user_id, slack_id, username, role, action, context, status_code,
                         avatar, target_id, target_type, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        row["id"],
                        slack_id,
                        row.get("username"),
                        row.get("role"),
                        "ticket_stardust_payout",
                        f"Awarded {increment:.2f} stardust for claiming a ticket",
                        200,
                        row.get("avatar"),
                        str(ticket_id) if ticket_id else None,
                        "ticket" if ticket_id else "user",
                        json.dumps({"source": "sw-bot", "amount": increment, "ticketId": ticket_id}),
                    ),
                )
                return float(row["cookie_balance"]) if row.get("cookie_balance") is not None else 0.0
    except psycopg2.Error as e:
        logging.error(f"add_stardust failed: {e}")
        return None


def edit_message(message_ts, new_text):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE ticket_msgs SET msg = %s WHERE message_ts = %s",
                    (new_text, message_ts),
                )
    except psycopg2.Error as e:
        logging.error(f"edit_message failed: {e}")


def message_belongs_to_ticket(message_ts: str, ticket_id: int) -> bool:
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM ticket_msgs WHERE (message_ts = %s OR origin_message_ts = %s) AND ticket_id = %s",
                    (message_ts, message_ts, ticket_id),
                )
                return cur.fetchone() is not None
    except psycopg2.Error as e:
        logging.error(f"message_belongs_to_ticket failed: {e}")
        return False


def get_dest_message_ts(message_ts):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT message_ts FROM ticket_msgs WHERE origin_message_ts = %s",
                    (message_ts,),
                )
                row = cur.fetchone()
                return row[0] if row else None
    except psycopg2.Error as e:
        logging.error(f"get_dest_message_ts failed: {e}")
        return None


def get_linked_message_ts(ts):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT message_ts FROM ticket_msgs WHERE origin_message_ts = %s", (ts,))
                row = cur.fetchone()
                if row:
                    return row[0]
                cur.execute("SELECT origin_message_ts FROM ticket_msgs WHERE message_ts = %s", (ts,))
                row = cur.fetchone()
                return row[0] if row else None
    except psycopg2.Error as e:
        logging.error(f"get_linked_message_ts failed: {e}")
        return None



def get_monthly_feedback_winners(year: int, month: int, count: int = 3) -> list[dict]:
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT * FROM (
                        SELECT DISTINCT ON (t.user_id)
                            t.user_id,
                            tf.rating,
                            tf.comment
                        FROM ticket_feedback tf
                        JOIN tickets t ON tf.ticket_id = t.id
                        WHERE EXTRACT(YEAR FROM tf.created_at AT TIME ZONE 'UTC') = %s
                          AND EXTRACT(MONTH FROM tf.created_at AT TIME ZONE 'UTC') = %s
                        ORDER BY t.user_id, RANDOM()
                    ) unique_users
                    ORDER BY RANDOM()
                    LIMIT %s
                    """,
                    (year, month, count),
                )
                return [dict(r) for r in cur.fetchall()]
    except psycopg2.Error as e:
        logging.error(f"get_monthly_feedback_winners failed: {e}")
        return []


def save_feedback(ticket_id, rating, comment):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO ticket_feedback (ticket_id, rating, comment) VALUES (%s, %s, %s) RETURNING id",
                    (ticket_id, rating, comment or ""),
                )
                row = cur.fetchone()
                return row[0] if row else None
    except psycopg2.Error as e:
        logging.error(f"save_feedback failed: {e}")
        return None


def get_feedback(ticket_id):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM ticket_feedback WHERE ticket_id = %s ORDER BY created_at DESC",
                    (ticket_id,),
                )
                return [dict(r) for r in cur.fetchall()]
    except psycopg2.Error as e:
        logging.error(f"get_feedback failed: {e}")
        return []


def get_shipwrights():
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT slack_id FROM users WHERE is_active = TRUE")
                return [row[0] for row in cur.fetchall()]
    except psycopg2.Error as e:
        logging.error(f"get_shipwrights failed: {e}")
        return []




def avg_close_time(period="all"):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                where = period_filter(period)
                base = "SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at))) FROM tickets WHERE status = 'closed' AND closed_at IS NOT NULL"
                sql = f"{base} AND {where}" if where else base
                cur.execute(sql)
                row = cur.fetchone()
                avg_seconds = None
                if row and row[0] is not None:
                    try:
                        avg_seconds = int(math.floor(float(row[0])))
                    except (TypeError, ValueError):
                        avg_seconds = None
                return format_seconds(avg_seconds or 0)
    except psycopg2.Error as e:
        logging.error(f"avg_close_time failed: {e}")
        return "N/A"


def count_tickets(status="all"):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                s = (status or "all").lower()
                if s == "all":
                    cur.execute("SELECT COUNT(*) FROM tickets")
                elif s in ("open", "closed"):
                    cur.execute("SELECT COUNT(*) FROM tickets WHERE status = %s", (s,))
                row = cur.fetchone()
                return int(row[0] or 0)
    except psycopg2.Error as e:
        logging.error(f"count_tickets failed: {e}")
        return 0


def get_unresolved_tickets_past_24h():
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM tickets WHERE status = 'open' AND created_at <= NOW() - INTERVAL '1 day'"
                )
                return [dict(r) for r in cur.fetchall()]
    except psycopg2.Error as e:
        logging.error(f"get_unresolved_tickets_past_24h failed: {e}")
        return []


def get_tickets_due_for_bump():
    """Returns open tickets that are due for a bump:
    - Never bumped and older than 24h, OR
    - Last bumped more than 24h ago :)
    """
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT * FROM tickets
                    WHERE status = 'open'
                      AND (
                        (last_bumped_at IS NULL     AND created_at    <= NOW() - INTERVAL '1 day')
                        OR
                        (last_bumped_at IS NOT NULL AND last_bumped_at <= NOW() - INTERVAL '1 day')
                      )
                    """
                )
                return [dict(r) for r in cur.fetchall()]
    except psycopg2.Error as e:
        logging.error(f"get_tickets_due_for_bump failed: {e}")
        return []


def mark_ticket_bumped(ticket_id: int) -> bool:
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE tickets SET last_bumped_at = NOW() WHERE id = %s",
                    (ticket_id,),
                )
                return cur.rowcount > 0
    except psycopg2.Error as e:
        logging.error(f"mark_ticket_bumped failed: {e}")
        return False


def get_daily_ticket_stats():
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT COUNT(*) AS count FROM tickets WHERE created_at >= NOW() - INTERVAL '1 day'")
                opened_24h = cur.fetchone()["count"]

                cur.execute(
                    "SELECT COUNT(*) AS count FROM tickets WHERE status = 'closed' AND closed_at >= NOW() - INTERVAL '1 day'"
                )
                closed_24h = cur.fetchone()["count"]

                cur.execute("SELECT COUNT(*) AS count FROM tickets WHERE status = 'open'")
                total_open = cur.fetchone()["count"]

                cur.execute(
                    """
                    SELECT closed_by AS slack_id, COUNT(*) AS count
                    FROM tickets
                    WHERE status = 'closed'
                      AND closed_at >= NOW() - INTERVAL '1 day'
                      AND closed_by IS NOT NULL
                    GROUP BY closed_by
                    ORDER BY count DESC
                    LIMIT 3
                    """
                )
                leaderboard = [dict(r) for r in cur.fetchall()]

                cur.execute(
                    """
                    SELECT t.id, t.user_id, t.question, t.staff_thread_ts, t.created_at,
                           (SELECT MAX(created_at) FROM ticket_msgs WHERE ticket_id = t.id) AS last_reply
                    FROM tickets t
                    WHERE t.status = 'open' AND t.created_at <= NOW() - INTERVAL '1 day'
                    ORDER BY t.created_at ASC
                    LIMIT 11
                    """
                )
                old_tickets = [dict(r) for r in cur.fetchall()]

                return {
                    "opened_24h": opened_24h,
                    "closed_24h": closed_24h,
                    "total_open": total_open,
                    "leaderboard": leaderboard,
                    "old_tickets": old_tickets,
                }
    except psycopg2.Error as e:
        logging.error(f"get_daily_ticket_stats failed: {e}")
        return None




def save_meta(text, meta_message_ts=None, votes_message_ts=None):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO meta_posts (text, meta_message_ts, votes_message_ts) VALUES (%s, %s, %s) RETURNING id",
                    (text, meta_message_ts, votes_message_ts),
                )
                row = cur.fetchone()
                return row[0] if row else None
    except psycopg2.Error as e:
        logging.error(f"save_meta failed: {e}")
        return None


def update_meta_votes(meta_message_ts, upvote_delta, downvote_delta):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE meta_posts SET upvotes = upvotes + %s, downvotes = downvotes + %s WHERE meta_message_ts = %s RETURNING upvotes, downvotes",
                    (upvote_delta, downvote_delta, meta_message_ts),
                )
                row = cur.fetchone()
                return (int(row[0]), int(row[1])) if row else (None, None)
    except psycopg2.Error as e:
        logging.error(f"update_meta_votes failed: {e}")
        return (None, None)


def find_meta_by_meta_ts(meta_message_ts):
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM meta_posts WHERE meta_message_ts = %s",
                    (meta_message_ts,),
                )
                row = cur.fetchone()
                return dict(row) if row else None
    except psycopg2.Error as e:
        logging.error(f"find_meta_by_meta_ts failed: {e}")
        return None


# def get_project_by_sd_id(sd_project_id):  # ship_certs
#     try:
#         with get_db() as conn:
#             with conn.cursor(cursor_factory=RealDictCursor) as cur:
#                 cur.execute(
#                     "SELECT * FROM ship_certs WHERE sd_project_id = %s ORDER BY id DESC LIMIT 1",
#                     (sd_project_id,),
#                 )
#                 row = cur.fetchone()
#                 return dict(row) if row else None
#     except psycopg2.Error as e:
#         logging.error(f"get_project_by_sd_id failed: {e}")
#         return None
#
#
# def insert_project_type(sd_project_id, project_type):  # ship_certs
#     try:
#         with get_db() as conn:
#             with conn.cursor() as cur:
#                 cur.execute(
#                     "UPDATE ship_certs SET project_type = %s WHERE sd_project_id = %s",
#                     (project_type, sd_project_id),
#                 )
#     except psycopg2.Error as e:
#         logging.error(f"insert_project_type failed: {e}")
#
#
# def shipped_projects(time="all", status="approved"):  # ship_certs
#     try:
#         with get_db() as conn:
#             with conn.cursor() as cur:
#                 if time == "all":
#                     cur.execute("SELECT COUNT(*) FROM ship_certs WHERE status = %s", (status,))
#                 elif time == "day":
#                     cur.execute(
#                         "SELECT COUNT(*) FROM ship_certs WHERE status = %s AND review_completed_at >= NOW() - INTERVAL '1 day'",
#                         (status,),
#                     )
#                 elif time == "week":
#                     cur.execute(
#                         "SELECT COUNT(*) FROM ship_certs WHERE status = %s AND review_completed_at >= NOW() - INTERVAL '7 days'",
#                         (status,),
#                     )
#                 elif time == "month":
#                     cur.execute(
#                         "SELECT COUNT(*) FROM ship_certs WHERE status = %s AND review_completed_at >= NOW() - INTERVAL '1 month'",
#                         (status,),
#                     )
#                 row = cur.fetchone()
#                 return int(row[0] or 0)
#     except psycopg2.Error as e:
#         logging.error(f"shipped_projects failed: {e}")
#         return 0
#
#
# def recent_reviews():  # ship_certs
#     try:
#         with get_db() as conn:
#             with conn.cursor() as cur:
#                 y_start, y_end = est_day_range_utc(1)
#                 db_start, db_end = est_day_range_utc(2)
#                 cur.execute(
#                     """
#                     SELECT
#                         SUM(CASE WHEN review_completed_at >= %s AND review_completed_at < %s THEN 1 ELSE 0 END) AS yesterday,
#                         SUM(CASE WHEN review_completed_at >= %s AND review_completed_at < %s THEN 1 ELSE 0 END) AS day_before
#                     FROM ship_certs
#                     WHERE review_completed_at IS NOT NULL
#                     """,
#                     (y_start, y_end, db_start, db_end),
#                 )
#                 row = cur.fetchone()
#                 return {"yesterday": int(row[0] or 0), "day_before": int(row[1] or 0)}
#     except psycopg2.Error as e:
#         logging.error(f"recent_reviews failed: {e}")
#         return {"yesterday": 0, "day_before": 0}
#
#
# def shipped_yesterday():  # ship_certs
#     try:
#         with get_db() as conn:
#             with conn.cursor() as cur:
#                 y_start, y_end = est_day_range_utc(1)
#                 cur.execute(
#                     "SELECT COUNT(*) FROM ship_certs WHERE created_at >= %s AND created_at < %s",
#                     (y_start, y_end),
#                 )
#                 row = cur.fetchone()
#                 return int(row[0] or 0)
#     except psycopg2.Error as e:
#         logging.error(f"shipped_yesterday failed: {e}")
#         return 0
#
#
# def top_reviewer_yesterday():  # ship_certs
#     try:
#         with get_db() as conn:
#             with conn.cursor() as cur:
#                 y_start, y_end = est_day_range_utc(1)
#                 cur.execute(
#                     """
#                     SELECT u.slack_id, COUNT(*) AS review_count
#                     FROM ship_certs s
#                     JOIN users u ON s.reviewer_id = u.id
#                     WHERE s.review_completed_at >= %s AND s.review_completed_at < %s
#                       AND s.review_completed_at IS NOT NULL
#                       AND s.reviewer_id IS NOT NULL
#                     GROUP BY s.reviewer_id, u.slack_id
#                     ORDER BY review_count DESC
#                     LIMIT 3
#                     """,
#                     (y_start, y_end),
#                 )
#                 rows = cur.fetchall()
#                 return {
#                     "slack_ids": [r[0] for r in rows],
#                     "counts": [r[1] for r in rows],
#                 }
#     except psycopg2.Error as e:
#         logging.error(f"top_reviewer_yesterday failed: {e}")
#         return {"slack_ids": [], "counts": []}


def mark_feedback_requested(ticket_id) -> bool:
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE tickets SET feedback_requested = TRUE WHERE id = %s AND feedback_requested = FALSE RETURNING id",
                    (ticket_id,),
                )
                return cur.fetchone() is not None
    except psycopg2.Error as e:
        logging.error(f"mark_feedback_requested failed: {e}")
        return False


def save_resolve_message_ts(ticket_id, ts):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE tickets SET resolve_message_ts = %s WHERE id = %s",
                    (ts, ticket_id),
                )
    except psycopg2.Error as e:
        logging.error(f"save_resolve_message_ts failed: {e}")


def get_resolve_message_ts(ticket_id):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT resolve_message_ts FROM tickets WHERE id = %s", (ticket_id,))
                row = cur.fetchone()
                return row[0] if row else None
    except psycopg2.Error as e:
        logging.error(f"get_resolve_message_ts failed: {e}")
        return None


def save_error(level, logger, message, full_trace=None):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO error_logs (level, logger, message, full_trace) VALUES (%s, %s, %s, %s)",
                    (level, logger, message, full_trace),
                )
    except psycopg2.Error:
        pass
