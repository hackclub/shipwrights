import json
import db

class Cache:
    def __init__(self):
        self.ticket_users = {}
        self.tickets = {}
        self.shipwrights = []
        self.ignorable = []
        self.metrics = {
            "cached_at": None,
            "quote_otd": None,
            "recommendation" : None,
            "bool" : None,
            "paused" : False,
        }

    def get_user_opt_in(self, user_id):
        if user_id not in self.ticket_users.keys():
            user_data = db.get_ticket_user(user_id)
            if user_data:
                self.ticket_users[user_data["userId"]] = user_data["isOptedIn"]
                return self.ticket_users[user_id]
            else:
                db.create_ticket_user(user_id)
                self.ticket_users[user_id] = True
                return True
        else:
            return self.ticket_users[user_id]

    def modify_user_opt(self, user_id, state=True):
        if user_id not in self.ticket_users.keys():
            user_data = db.get_ticket_user(user_id)
            if user_data:
                self.ticket_users[user_id] = state
                db.update_ticket_user_opt(user_id, state)
                return
            else:
                self.ticket_users[user_id] = self.get_user_opt_in(user_id)
                db.update_ticket_user_opt(user_id, state)
                self.ticket_users[user_id] = state
                return
        else:
            self.ticket_users[user_id] = state
            db.update_ticket_user_opt(user_id, state)
            return

    def ticket_data_saver(self, ticket_data):
        self.tickets[ticket_data["id"]] = {
            "id": ticket_data["id"],
            "userId": ticket_data["userId"],
            "userName": ticket_data["userName"],
            "question": ticket_data["question"],
            "userThreadTs": ticket_data["userThreadTs"],
            "staffThreadTs": ticket_data["staffThreadTs"],
            "status": ticket_data["status"],
            "closedBy": ticket_data["closedBy"],
        }

    def get_ticket_by_id(self, ticket_id):
        if ticket_id not in self.tickets.keys():
            ticket_data = db.get_ticket(ticket_id)
            if not ticket_data:
                return None
            self.ticket_data_saver(ticket_data)
            return self.tickets[ticket_id]
        else:
            return self.tickets[ticket_id]

    def find_ticket_by_ts(self, ts):
        for ticket_id in self.tickets.keys():
            if self.tickets[ticket_id]["staffThreadTs"] == ts:
                return self.tickets[ticket_id]
            elif self.tickets[ticket_id]["userThreadTs"] == ts:
                return self.tickets[ticket_id]

        ticket_data = db.find_ticket(ts)

        if ticket_data:
            self.ticket_data_saver(ticket_data)
            return ticket_data
        return None

    def open_ticket(self, ticket_id):
        if ticket_id in self.tickets.keys():
            self.tickets[ticket_id]["status"] = "open"
            db.open_ticket(ticket_id)
        else:
            ticket_data = db.get_ticket(ticket_id)
            if ticket_data:
                self.ticket_data_saver(ticket_data)
                self.open_ticket(ticket_id)
            else:
                print(f"URGENT: Something went wrong. Someone tried reopening a ticket that simply doesn't exist in cache nor db... Ticket ID:{ticket_id}, Cache Dump:{json.dumps(self.tickets)}")

    def close_ticket(self, ticket_id):
        if ticket_id in self.tickets.keys():
            self.tickets[ticket_id]["status"] = "closed"
            db.close_ticket(ticket_id)
        else:
            ticket_data = db.get_ticket(ticket_id)
            if ticket_data:
                self.ticket_data_saver(ticket_data)
                self.close_ticket(ticket_id)
            else:
                print(f"URGENT: Something went wrong. Someone tried closing a ticket that simply doesn't exist in cache nor db... Ticket ID:{ticket_id}, Cache Dump:{json.dumps(self.tickets)}")

    def is_ticket_claimed(self, ticket_id):
        if ticket_id in self.tickets.keys():
            return self.tickets[ticket_id]["closedBy"]
        else:
            ticket_data = db.get_ticket(ticket_id)
            if ticket_data:
                self.ticket_data_saver(ticket_data)
                return ticket_data["closedBy"]
            else:
                print(f"URGENT: Something went wrong. Someone tried checking if a ticket is claimed and that ticket simply doesn't exist in cache nor db... Ticket ID:{ticket_id}, Cache Dump:{json.dumps(self.tickets)}")
                print("URGENT: Killing ticket cache...")
                self.tickets = {}
                return None
    def get_shipwrights(self):
        if self.shipwrights:
            return self.shipwrights
        self.shipwrights = db.get_shipwrights()
        return self.shipwrights

cache = Cache()