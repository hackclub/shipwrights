import re, requests as http_requests
from collections import defaultdict
from datetime import datetime, timedelta
from threading import Lock
from time import monotonic
import views
from cache import cache
from globals import APP_ID

rate_limits: defaultdict = defaultdict(list)
rate_lock = Lock()
MAX_REQS = 30
WINDOW = 60

seen_events: dict[str, float] = {}
seen_lock = Lock()
SEEN_TTL = 300.0


def seen_already(event_id: str) -> bool:
    now = monotonic()
    with seen_lock:
        if event_id in seen_events:
            return True
        seen_events[event_id] = now
        expired = [k for k, t in seen_events.items() if now - t > SEEN_TTL]
        for k in expired:
            del seen_events[k]
        return False


def check_rate(ip: str) -> bool:
    now = datetime.now()
    with rate_lock:
        rate_limits[ip] = [t for t in rate_limits[ip] if t > now - timedelta(seconds=WINDOW)]
        if len(rate_limits[ip]) >= MAX_REQS:
            return False
        rate_limits[ip].append(now)
        return True


def show_edit_modal(client, body, message_ts):
    client.views_open(trigger_id=body["trigger_id"], view=views.edit_message(message_ts))


def show_unauthorized_close(client, body, access):
    client.views_open(trigger_id=body["trigger_id"], view=views.show_unauthorized(access))


def show_feedback_modal(client, body, ticket_id):
    client.views_open(trigger_id=body["trigger_id"], view=views.show_rating_form(ticket_id))


def get_user_info(client, user_id):
    result = client.users_info(user=user_id)
    if result["ok"]:
        profile = result["user"]["profile"]
        username = profile.get("display_name") or profile.get("real_name") or result["user"].get("name")
        pfp = profile.get("image_192")
        return {"username": username, "pfp": pfp}
    return None


def is_shipwright(user_id) -> bool:
    return user_id in cache.get_shipwrights()


# def get_stardance_project(link: str):  # ship_certs
#     match = re.search(r"https://stardance\.hackclub\.com/projects/(\d+)", link)
#     return match.group(1) if match else None


def find_sticky_from_history(messages):
    for message in messages:
        if message.get("app_id") == APP_ID and message.get("text") == "Create Help Ticket Now!":
            return message["ts"]
    return None


def find_meta_sticky_from_history(messages):
    for message in messages:
        if message.get("app_id") == APP_ID and message.get("text") == "Create Meta Post":
            return message["ts"]
    return None


def parse_slack_link(link: str):
    match = re.search(r"/archives/([A-Z0-9]+)/p(\d{10})(\d+)", link)
    if not match:
        return None
    channel = match.group(1)
    ts = f"{match.group(2)}.{match.group(3).ljust(6, '0')}"
    return channel, ts


def respond(response_url: str, text: str) -> None:
    http_requests.post(response_url, json={"text": text, "response_type": "ephemeral"}, timeout=5)
