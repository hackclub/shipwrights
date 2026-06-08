"""
Migration 001: add last_bumped_at to tickets
Run once: python migrations/001_add_last_bumped_at.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "Source"))

import db

with db.get_db() as conn:
    with conn.cursor() as cur:
        cur.execute(
            """
            ALTER TABLE tickets
            ADD COLUMN IF NOT EXISTS last_bumped_at TIMESTAMPTZ DEFAULT NULL;
            """
        )
    print("Migration 001 complete: last_bumped_at added to tickets.")
