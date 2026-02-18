import os, math, json
from datetime import datetime, timedelta
import pytz
from dotenv import load_dotenv
from mysql.connector import pooling

load_dotenv()

db_pool = pooling.MySQLConnectionPool(
    pool_name="bot_pool",
    pool_size=5,
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT", 3306)),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
)

def _format_seconds(seconds):
    if seconds <= 0 or seconds is None:
        return "0s"
    days, rem = divmod(seconds, 86400)
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

def _get_est_day_range_utc(days_back=1):
    """Return (start_utc, next_day_start_utc) for the EST calendar day `days_back` days ago.
    E.g. days_back=1 gives yesterday 00:00 EST and today 00:00 EST in UTC."""
    est = pytz.timezone("US/Eastern")
    now_est = datetime.now(est)
    target_date = (now_est - timedelta(days=days_back)).date()
    start_est = est.localize(datetime.combine(target_date, datetime.min.time()))
    next_day_est = start_est + timedelta(days=1)
    return start_est.astimezone(pytz.utc).replace(tzinfo=None), next_day_est.astimezone(pytz.utc).replace(tzinfo=None)

def _period_where_clause(period):
    p = (period or "all").lower()
    if p == "all":
        return None
    if p == "day":
        return ("closedAt >= (NOW() - INTERVAL 1 DAY)",)
    if p == "week":
        return ("closedAt >= (NOW() - INTERVAL 7 DAY)",)
    if p == "month":
        return ("closedAt >= (NOW() - INTERVAL 1 MONTH)",)


def get_db():
    try:
        return db_pool.get_connection()
    except Exception as e:
        print(f"db connection fucked up: {e}")
        return None

def save_ticket(user_id, user_name, user_avatar, question, user_thread, staff_thread):
    db = get_db()
    if not db:
        return None
    
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO tickets (userId, userName, userAvatar, question, userThreadTs, staffThreadTs, status) VALUES (%s, %s, %s, %s, %s, %s, 'open')",
            (user_id, user_name, user_avatar, question, user_thread, staff_thread)
        )
        db.commit()
        ticket_id = cursor.lastrowid
        return ticket_id
    except Exception as e:
        print(f"shit broke when saving ticket: {e}")
        return None
    finally:
        cursor.close()
        db.close()

def save_message(ticket_id, sender_id, sender_name, sender_avatar, msg, from_staff, files=None, message_ts=None, origin_message_ts=None):
    db = get_db()
    if not db:
        return
    
    cursor = db.cursor()
    try:
        files_json = json.dumps(files) if files else None
        cursor.execute(
            "INSERT INTO ticket_msgs (ticketId, senderId, senderName, senderAvatar, msg, files, isStaff, messageTs, originMessageTs) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (ticket_id, sender_id, sender_name, sender_avatar, msg, files_json, from_staff, message_ts, origin_message_ts)
        )
        db.commit()
    except Exception as e:
        print(f"couldnt save message lol: {e}")
    finally:
        cursor.close()
        db.close()

def get_ticket(ticket_id):
    db = get_db()
    if not db:
        return None

    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM tickets WHERE id = %s", (ticket_id,))
        return cursor.fetchone()
    except Exception as  e:
        print(f"couldnt get ticket: {e}")
        return None
    finally:
        cursor.close()
        db.close()

def find_ticket(thread):
    db = get_db()
    if not db:
        return None
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM tickets WHERE staffThreadTs = %s OR userThreadTs = %s", (thread, thread))
        return cursor.fetchone()
    except Exception as e:
        print(f"ticket lookup failed: {e}")
        return None
    finally:
        cursor.close()
        db.close()

def claim_ticket(ticket_id, closer):
    db = get_db()
    if not db:
        return False

    cursor = db.cursor()
    try:
        cursor.execute(
            "UPDATE tickets SET closedBy = %s WHERE id = %s",
            (closer ,ticket_id,)
        )
        db.commit()
        return True
    except Exception as e:
        print(f"couldn't close ticket: {e}")
        return False
    finally:
        cursor.close()
        db.close()


def close_ticket(ticket_id):
    db = get_db()
    if not db:
        return False
    
    cursor = db.cursor()
    try:
        cursor.execute(
            "UPDATE tickets SET status = 'closed', closedAt = NOW() WHERE id = %s",
            (ticket_id,)
        )
        db.commit()
        return True
    except Exception as e:
        print(f"couldn't close ticket: {e}")
        return False
    finally:
        cursor.close()
        db.close()


def shipped_projects(time="all", status="approved"):
    db = get_db()
    if not db:
        return "DB seems to be down :/"
    cursor = db.cursor()
    try:
        if time == "all":
            cursor.execute("SELECT COUNT(*) FROM ship_certs WHERE status = %s", (status,))
        elif time == "day":
            cursor.execute("SELECT COUNT(*) FROM ship_certs WHERE status = %s AND reviewCompletedAt >= (NOW() - INTERVAL 1 DAY)",(status,),)
        elif time == "week":
            cursor.execute("SELECT COUNT(*) FROM ship_certs WHERE status = %s AND reviewCompletedAt >= (NOW() - INTERVAL 7 DAY)",(status,),)
        elif time == "month":
            cursor.execute("SELECT COUNT(*) FROM ship_certs WHERE status = %s AND reviewCompletedAt >= (NOW() - INTERVAL 1 MONTH)",(status,),)
        row = cursor.fetchone()
        return int(row[0] or 0)

    except Exception as e:
        return f"Error occurred, {e}"
    finally:
        cursor.close()
        db.close()

def avg_close_time(period="all"):
    db = get_db()
    if not db:
        return "DB seems to be down :/"
    cursor = db.cursor()
    try:
        where = _period_where_clause(period)
        if where is None:
            sql = "SELECT AVG(TIMESTAMPDIFF(SECOND, createdAt, closedAt)) FROM tickets WHERE status = %s AND closedAt IS NOT NULL"
            params = ("closed",)
        else:
            sql = f"SELECT AVG(TIMESTAMPDIFF(SECOND, createdAt, closedAt)) FROM tickets WHERE status = %s AND closedAt IS NOT NULL AND {where[0]}"
            params = ("closed",)
        cursor.execute(sql, params)
        row = cursor.fetchone()
        avg_seconds = None
        if row:
            try:
                avg_seconds = int(math.floor(float(row[0]))) if row[0] is not None else None
            except Exception:
                avg_seconds = None
        return _format_seconds(avg_seconds if avg_seconds is not None else 0)
    except Exception:
        return "N/A"
    finally:
        cursor.close()
        db.close()

def count_tickets(status = "all"):
    db = get_db()
    if not db:
        return 0
    cursor = db.cursor()
    try:
        s = (status or "all").lower()
        if s == "all":
            cursor.execute("SELECT COUNT(*) FROM tickets")
        elif s in ("open", "closed"):
            cursor.execute("SELECT COUNT(*) FROM tickets WHERE status = %s", (s,))
        row = cursor.fetchone()
        return int(row[0] or 0)
    except Exception:
        return 0
    finally:
        cursor.close()
        db.close()

def get_shipwrights():
    db = get_db()
    if not db:
        return ["DB seems to be down :/"]
    cursor = db.cursor()
    try:
        cursor.execute("SELECT slackId FROM users WHERE isActive = 1")
        rows = cursor.fetchall()
        return [row[0] for row in rows]
    except Exception:
        return []
    finally:
        cursor.close()
        db.close()

def edit_message(message_ts, new_text):
    db = get_db()
    if not db:
        print("DB seems to be down :/")
        return
    cursor = db.cursor()
    try:
        cursor.execute("UPDATE ticket_msgs SET msg = %s WHERE messageTS = %s", (new_text, message_ts))
        db.commit()
    except Exception as e:
        print(f"Error occurred, {e}")
        db.rollback()
    finally:
        cursor.close()

def insert_project_type(ft_project_id, project_type):
    db = get_db()
    if not db:
        print("DB seems to be down :/")
        return
    cursor = db.cursor()
    try:
        cursor.execute(
            "UPDATE ship_certs SET projectType = %s WHERE ftProjectId = %s",
            (project_type, ft_project_id)
        )
        db.commit()
    except Exception as e:
        print(f"Error updating project type: {e}")
        db.rollback()
    finally:
        cursor.close()
        db.close()

def recent_reviews():
    db = get_db()
    if not db:
        return {"yesterday": 0, "day_before": 0}
    cursor = db.cursor()
    try:
        y_start, y_end = _get_est_day_range_utc(1)
        db_start, db_end = _get_est_day_range_utc(2)
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN reviewCompletedAt >= %s AND reviewCompletedAt < %s THEN 1 ELSE 0 END) AS yesterday,
                SUM(CASE WHEN reviewCompletedAt >= %s AND reviewCompletedAt < %s THEN 1 ELSE 0 END) AS day_before
            FROM ship_certs
            WHERE reviewCompletedAt IS NOT NULL
        """, (y_start, y_end, db_start, db_end))
        row = cursor.fetchone()
        return {
            "yesterday": int(row[0] or 0),
            "day_before": int(row[1] or 0)
        }
    except Exception as e:
        print(f"Error fetching review counts: {e}")
        return {"yesterday": 0, "day_before": 0}
    finally:
        cursor.close()
        db.close()


def shipped_yesterday():
    db = get_db()
    if not db:
        return 0
    cursor = db.cursor()
    try:
        y_start, y_end = _get_est_day_range_utc(1)
        cursor.execute("""
            SELECT COUNT(*)
            FROM ship_certs
            WHERE createdAt >= %s AND createdAt < %s
        """, (y_start, y_end))
        row = cursor.fetchone()
        return int(row[0] or 0)
    except Exception as e:
        print(f"Error fetching ships created in last 24h: {e}")
        return 0
    finally:
        cursor.close()
        db.close()


def top_reviewer_yesterday():
    db = get_db()
    if not db:
        return {"slack_ids": [], "counts": []}
    cursor = db.cursor()
    try:
        y_start, y_end = _get_est_day_range_utc(1)
        cursor.execute("""
            SELECT u.slackId, COUNT(*) AS review_count
            FROM ship_certs s
            JOIN users u ON s.reviewerId = u.id
            WHERE s.reviewCompletedAt >= %s AND s.reviewCompletedAt < %s
              AND s.reviewCompletedAt IS NOT NULL
              AND s.reviewerId IS NOT NULL
            GROUP BY s.reviewerId
            ORDER BY review_count DESC
            LIMIT 3
        """, (y_start, y_end))
        rows = cursor.fetchall()
        slack_ids = [row[0] for row in rows]
        counts = [row[1] for row in rows]
        return {"slack_ids": slack_ids, "counts": counts}
    except Exception as e:
        print(f"Error fetching top reviewer: {e}")
        return {"slack_ids": [], "counts": []}
    finally:
        cursor.close()
        db.close()

def get_dest_message_ts(message_ts):
    db = get_db()
    if not db:
        return None
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT messageTs FROM ticket_msgs WHERE originMessageTs = %s", (message_ts,))
        row = cursor.fetchone()
        return row.get("messageTs") if row else None
    except Exception as e:
        print(f"couldn't get destMessageTs: {e}")
        return None
    finally:
        cursor.close()
        db.close()

def open_ticket(ticket_id):
    db = get_db()
    if not db:
        return False

    cursor = db.cursor()
    try:
        cursor.execute(
            "UPDATE tickets SET status = 'open' WHERE id = %s",
            (ticket_id,)
        )
        db.commit()
        return True
    except Exception as e:
        print(f"couldn't close ticket: {e}")
        return False
    finally:
        cursor.close()
        db.close()

def get_ticket_user(user_id):
    db = get_db()
    if not db:
        return None
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM ticket_users WHERE userId = %s", (user_id,))
        row = cursor.fetchone()
        return row if row else None
    except Exception as e:
        print(f"couldn't get ticket user info: {e}")
        return None
    finally:
        cursor.close()
        db.close()

def create_ticket_user(user_id):
    db = get_db()
    if not db:
        return None
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO ticket_users (userId, isOptedIn) VALUES (%s, %s)",
            (user_id, True)
        )
        db.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"couldn't create ticket user: {e}")
        return None
    finally:
        cursor.close()
        db.close()

def update_ticket_user_opt(user_id, state: bool):
    db = get_db()
    if not db:
        return False
    cursor = db.cursor()
    try:
        cursor.execute(
            "UPDATE ticket_users SET isOptedIn = %s WHERE userId = %s",
            (state, user_id)
        )
        db.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"couldn't update ticket user opt in: {e}")
        return False
    finally:
        cursor.close()
        db.close()
