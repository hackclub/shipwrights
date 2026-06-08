"""
Migration: add last_bumped_at to tickets
Run once: python migrate_add_last_bumped_at.py
"""
import db

with db.get_db() as conn:
    with conn.cursor() as cur:
        cur.execute(
            """
            ALTER TABLE tickets
            ADD COLUMN IF NOT EXISTS last_bumped_at TIMESTAMPTZ DEFAULT NULL;
            """
        )
    print("Migration complete: last_bumped_at added to tickets.")
