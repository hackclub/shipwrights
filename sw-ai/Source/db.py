import logging
import os
from contextlib import contextmanager

import psycopg2
from dotenv import load_dotenv
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from helpers import format_messages

load_dotenv()

_pool: pool.ThreadedConnectionPool | None = None


def _init_pool():
    global _pool
    _pool = pool.ThreadedConnectionPool(
        minconn=2,
        maxconn=10,
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        dbname=os.getenv("DB_NAME"),
        keepalives=1,
        keepalives_idle=60,
        keepalives_interval=10,
        keepalives_count=5,
    )


def _acquire_conn():
    global _pool
    if _pool is None:
        _init_pool()
    for attempt in range(3):
        conn = _pool.getconn()
        if conn.closed:
            _pool.putconn(conn, close=True)
            continue
        try:
            conn.cursor().execute("SELECT 1")
            return conn
        except Exception as e:
            logging.error(f"DB connection validation failed (attempt {attempt + 1}): {e}")
            _pool.putconn(conn, close=True)
            try:
                _pool.closeall()
            except Exception:
                pass
            _init_pool()
    raise psycopg2.OperationalError("DB connection unavailable after 3 attempts")


def _release_conn(conn, *, success: bool):
    bad = bool(conn.closed)
    if not bad:
        try:
            conn.commit() if success else conn.rollback()
        except Exception as e:
            logging.error(f"DB {'commit' if success else 'rollback'} failed: {e}")
            bad = True
    _pool.putconn(conn, close=bad)


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


def get_ticket_ts(ticket_id):
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT user_thread_ts FROM tickets WHERE id = %s", (ticket_id,))
            result = cur.fetchone()
            return result["user_thread_ts"] if result else None


def get_ticket_messages(ticket_id):
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT msg, is_staff
                FROM ticket_msgs
                WHERE ticket_id = %s
                ORDER BY created_at ASC
                """,
                (ticket_id,),
            )
            return [{"msg": r["msg"], "isStaff": r["is_staff"]} for r in cur.fetchall()]


def get_ticket_question(ticket_id):
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT question FROM tickets WHERE id = %s", (ticket_id,))
            result = cur.fetchone()
            return result["question"] if result else None


def get_recent_tickets():
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, question FROM tickets
                WHERE created_at >= NOW() - INTERVAL '24 hours'
                """
            )
            tickets = cur.fetchall()
            result = []
            for ticket in tickets:
                cur.execute(
                    """
                    SELECT msg, is_staff
                    FROM ticket_msgs
                    WHERE ticket_id = %s
                    ORDER BY created_at ASC
                    """,
                    (ticket["id"],),
                )
                messages = [{"msg": r["msg"], "isStaff": r["is_staff"]} for r in cur.fetchall()]
                result.append({
                    "id": ticket["id"],
                    "question": ticket["question"],
                    "messages": format_messages(messages, False),
                })
            return result


def get_context_tickets():
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, question FROM tickets
                WHERE created_at < NOW() - INTERVAL '24 hours'
                  AND created_at >= NOW() - INTERVAL '96 hours'
                """
            )
            tickets = cur.fetchall()
            result = []
            for ticket in tickets:
                cur.execute(
                    """
                    SELECT msg, is_staff
                    FROM ticket_msgs
                    WHERE ticket_id = %s
                    ORDER BY created_at ASC
                    """,
                    (ticket["id"],),
                )
                messages = [{"msg": r["msg"], "isStaff": r["is_staff"]} for r in cur.fetchall()]
                result.append({
                    "id": ticket["id"],
                    "question": ticket["question"],
                    "messages": format_messages(messages, False),
                })
            return result
