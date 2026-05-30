import logging
from time import monotonic
import db, worker

SHIPWRIGHTS_TTL = 600.0
DEFAULT_TTL = 7200.0


class Cache:
    def __init__(self):
        self.bot_user_id: str | None = None
        self.sticky_message_ts = None
        self.meta_sticky_ts = None
        self.ticket_users: dict = {}
        self.tickets: dict = {}
        self.feedback: dict = {}
        self.metas: dict = {}
        self.shipwrights: list = []
        self.ignorable: list = []
        self.deleted_headers: set = set()
        self.closed_notified: dict[tuple, float] = {}
        self.metrics: dict = {
            "cached_at": None,
            "quote_otd": None,
            "recommendation": None,
            "bool": None,
            "paused": False,
        }
        self.fetch_times: dict[str, float] = {}

    def can_notify_closed(self, user_id: str, ticket_id, ttl: float = 30.0) -> bool:
        key = (user_id, ticket_id)
        now = monotonic()
        if now - self.closed_notified.get(key, 0.0) < ttl:
            return False
        self.closed_notified[key] = now
        return True

    def is_stale(self, key: str, ttl: float) -> bool:
        return monotonic() - self.fetch_times.get(key, 0.0) > ttl

    def mark_fresh(self, key: str):
        self.fetch_times[key] = monotonic()

    def get_user_opt_in(self, user_id):
        if user_id in self.ticket_users and not self.is_stale(f"tu:{user_id}", DEFAULT_TTL):
            return self.ticket_users[user_id]
        user_data = db.get_ticket_user(user_id)
        if user_data:
            self.ticket_users[user_data["user_id"]] = user_data["is_opted_in"]
            self.mark_fresh(f"tu:{user_id}")
            return self.ticket_users[user_id]
        worker.enqueue(db.create_ticket_user, user_id)
        self.ticket_users[user_id] = True
        self.mark_fresh(f"tu:{user_id}")
        return True

    def modify_user_opt(self, user_id, state=True):
        self.ticket_users[user_id] = state
        self.mark_fresh(f"tu:{user_id}")
        worker.enqueue(db.update_ticket_user_opt, user_id, state)

    def ticket_data_saver(self, ticket_data):
        self.tickets[ticket_data["id"]] = {
            "id": ticket_data["id"],
            "user_id": ticket_data["user_id"],
            "user_name": ticket_data["user_name"],
            "question": ticket_data["question"],
            "user_thread_ts": ticket_data["user_thread_ts"],
            "staff_thread_ts": ticket_data["staff_thread_ts"],
            "status": ticket_data["status"],
            "closed_by": ticket_data["closed_by"],
        }

    def get_ticket_by_id(self, ticket_id):
        if ticket_id not in self.tickets:
            ticket_data = db.get_ticket(ticket_id)
            if not ticket_data:
                return None
            self.ticket_data_saver(ticket_data)
        return self.tickets.get(ticket_id)

    def find_ticket_by_ts(self, ts):
        for ticket in self.tickets.values():
            if ticket["staff_thread_ts"] == ts or ticket["user_thread_ts"] == ts:
                return ticket
        ticket_data = db.find_ticket(ts)
        if ticket_data:
            self.ticket_data_saver(ticket_data)
            return self.tickets.get(ticket_data["id"])
        return None

    def _load_ticket(self, ticket_id):
        ticket_data = db.get_ticket(ticket_id)
        if ticket_data:
            self.ticket_data_saver(ticket_data)
            return True
        logging.critical(f"ticket {ticket_id} not found in cache or db")
        return False

    def open_ticket(self, ticket_id):
        if ticket_id not in self.tickets and not self._load_ticket(ticket_id):
            return
        self.tickets[ticket_id]["status"] = "open"
        worker.enqueue(db.open_ticket, ticket_id)

    def close_ticket(self, ticket_id):
        if ticket_id not in self.tickets and not self._load_ticket(ticket_id):
            return
        self.tickets[ticket_id]["status"] = "closed"
        worker.enqueue(db.close_ticket, ticket_id)

    def is_ticket_claimed(self, ticket_id):
        if ticket_id not in self.tickets and not self._load_ticket(ticket_id):
            self.tickets = {}
            return None
        return self.tickets[ticket_id]["closed_by"]

    def claim_ticket(self, ticket_id, claimer):
        if ticket_id not in self.tickets and not self._load_ticket(ticket_id):
            self.tickets = {}
            return
        self.tickets[ticket_id]["closed_by"] = claimer
        worker.enqueue(db.claim_ticket, ticket_id, claimer)
        worker.enqueue(db.add_stardust, claimer, ticket_id)

    def get_shipwrights(self):
        if self.shipwrights and not self.is_stale("shipwrights", SHIPWRIGHTS_TTL):
            return self.shipwrights
        self.shipwrights = db.get_shipwrights()
        self.mark_fresh("shipwrights")
        return self.shipwrights

    def get_feedback(self, ticket_id):
        if ticket_id in self.feedback and not self.is_stale(f"fb:{ticket_id}", DEFAULT_TTL):
            return self.feedback[ticket_id]
        feedback_data = db.get_feedback(ticket_id)
        if not feedback_data:
            return None
        self.feedback[ticket_id] = feedback_data
        self.mark_fresh(f"fb:{ticket_id}")
        return self.feedback[ticket_id]

    def save_feedback(self, ticket_id, rating, comment):
        entry = {"rating": int(rating), "comment": comment}
        if ticket_id in self.feedback:
            self.feedback[ticket_id].append(entry)
        else:
            self.feedback[ticket_id] = [entry]
        self.mark_fresh(f"fb:{ticket_id}")
        worker.enqueue(db.save_feedback, ticket_id, int(rating), comment)

    def save_meta(self, text, meta_message_ts, votes_message_ts):
        self.metas[meta_message_ts] = {
            "upvotes": 0,
            "downvotes": 0,
            "votes_message_ts": votes_message_ts,
            "text": text,
            "voters": {},
        }
        self.mark_fresh(f"meta:{meta_message_ts}")
        worker.enqueue(db.save_meta, text, meta_message_ts, votes_message_ts)

    def get_meta_by_meta_ts(self, meta_message_ts):
        if meta_message_ts in self.metas and not self.is_stale(f"meta:{meta_message_ts}", DEFAULT_TTL):
            return self.metas[meta_message_ts]
        meta_data = db.find_meta_by_meta_ts(meta_message_ts)
        if meta_data:
            self.metas[meta_message_ts] = {
                "upvotes": meta_data.get("upvotes", 0),
                "downvotes": meta_data.get("downvotes", 0),
                "votes_message_ts": meta_data["votes_message_ts"],
                "text": meta_data["text"],
                "voters": {},
            }
            self.mark_fresh(f"meta:{meta_message_ts}")
            return self.metas[meta_message_ts]
        logging.critical("get_meta_by_meta_ts: meta not found in cache or db")
        return None

    def add_vote(self, meta_message_ts, user_id, delta):
        meta = self.get_meta_by_meta_ts(meta_message_ts)
        if not meta:
            return None
        previous = meta["voters"].get(user_id)
        if previous == delta:
            return False
        upvote_delta = downvote_delta = 0
        if delta == 1:
            upvote_delta = 1
            if previous == -1:
                downvote_delta = -1
        else:
            downvote_delta = 1
            if previous == 1:
                upvote_delta = -1
        meta["voters"][user_id] = delta
        meta["upvotes"] = max(0, meta["upvotes"] + upvote_delta)
        meta["downvotes"] = max(0, meta["downvotes"] + downvote_delta)
        worker.enqueue(db.update_meta_votes, meta_message_ts, upvote_delta, downvote_delta)
        return (meta["upvotes"], meta["downvotes"])


cache = Cache()
