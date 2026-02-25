import os, json
from helpers import format_messages
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

def get_ticket_ts(ticket_id):
    conn = db_pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT userThreadTs FROM tickets WHERE id = %s
            """, (ticket_id,)
        )
        result = cursor.fetchone()
        return result['userThreadTs'] if result else None
    finally:
        cursor.close()
        conn.close()

def get_ticket_messages(ticket_id):
    conn = db_pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT msg, isStaff
            FROM ticket_msgs
            WHERE ticketId = %s
            ORDER BY createdAt ASC
            """,
            (ticket_id,)
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

def get_ticket_question(ticket_id):
    conn = db_pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT question FROM tickets WHERE id = %s
            """, (ticket_id,)
        )
        result = cursor.fetchone()
        return result['question'] if result else None
    finally:
        cursor.close()
        conn.close()

def get_recent_tickets():
    conn = db_pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, question FROM tickets
            WHERE createdAt >= NOW() - INTERVAL 24 HOUR
        """)
        tickets = cursor.fetchall()
        result = []
        for ticket in tickets:
            cursor.execute(
                """
                SELECT msg, isStaff
                FROM ticket_msgs
                WHERE ticketId = %s
                ORDER BY createdAt ASC
                """,
                (ticket['id'],)
            )
            messages = cursor.fetchall()

            result.append({
                'id': ticket['id'],
                'question': ticket['question'],
                'messages': format_messages(messages, False)
            })

        return result
    finally:
        cursor.close()
        conn.close()


def save_metrics_history(data, created_at=None):
    conn = db_pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        payload = json.dumps(data, ensure_ascii=False)
        if created_at:
            cursor.execute(
                "INSERT INTO metrics_history (createdAt, output) VALUES (%s, %s)",
                (created_at, payload),
            )
        else:
            cursor.execute("INSERT INTO metrics_history (output) VALUES (%s)", (payload,))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"Error saving metrics: {e}")
        try:
            conn.rollback()
        except Exception as e:
            print(f"Rolling back transaction: {e}")
            pass
        return None
    finally:
        cursor.close()
        conn.close()
