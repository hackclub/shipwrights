import views
from collections import defaultdict
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

rate_limits = defaultdict(list)
MAX_REQS = 30
WINDOW = 60
AVAILABLE_TYPES = [
    "CLI", "Cargo", "Web App", "Chat Bot", "Extension",
    "Desktop App (Windows)", "Desktop App (Linux)", "Desktop App (macOS)",
    "Minecraft Mods", "Hardware", "Android App", "iOS App", "Other"
]


def check_rate(ip):
    now = datetime.now()
    rate_limits[ip] = [t for t in rate_limits[ip] if t > now - timedelta(seconds=WINDOW)]
    if len(rate_limits[ip]) >= MAX_REQS:
        return False
    rate_limits[ip].append(now)
    return True


def show_edit_modal(client, body, message_ts):
    client.views_open(
        trigger_id=body["trigger_id"],
        view=views.edit_message(message_ts)
    )

def show_unauthorized_close(client, body):
    client.views_open(
        trigger_id=body["trigger_id"],
        view=views.show_unauthorized()
    )

def get_user_info(client, user_id):
    result = client.users_info(user=user_id)
    if result["ok"]:
        user = result["user"]
        profile = user["profile"]
        username = profile.get("display_name") or profile.get("real_name") or user.get("name")
        pfp = profile.get("image_192")
        return {"username": username, "pfp": pfp}
    return None


