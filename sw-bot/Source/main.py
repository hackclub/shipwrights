import os, threading, json, summery, threading
import db, helpers, api, home, relay, ai
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from summery import send_reminder

DASH_URL = os.getenv("DASHBOARD_URL", "http://localhost:3000")
API_KEY = os.getenv("API_KEY")
USER_CHANNEL = os.getenv("USER_CHANNEL_ID")
STAFF_CHANNEL = os.getenv("STAFF_CHANNEL_ID")
BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")

slack_app = App(token=BOT_TOKEN, signing_secret=os.getenv("SLACK_SIGNING_SECRET"), process_before_response=True)
EMOJI_MAP = {}
seen = set()
MAX_SEEN = 1000

def cache_emojis():
    global EMOJI_MAP
    try:
        result = slack_app.client.emoji_list()
        if result["ok"]:
            EMOJI_MAP = result["emoji"]
            with open("emoji_cache.json", "w") as f:
                json.dump(EMOJI_MAP, f)
            print(f"loaded {len(EMOJI_MAP)} emojis")
    except Exception as e:
        print(f"failed to load emoji cache: {e}")


def seen_already(event_id):
    if event_id in seen:
        return True
    seen.add(event_id)
    if len(seen) > MAX_SEEN:
        seen.pop()
    return False


@slack_app.event("message")
def msg(event, client):
    if seen_already(event.get("client_msg_id") or event.get("event_ts")):
        return
    subtype = event.get("subtype")
    if subtype and subtype not in ["file_share"]:
        return
    channel = event["channel"]

    if channel == USER_CHANNEL:
        if relay.handle_client_reply(event, client, BOT_TOKEN, STAFF_CHANNEL, USER_CHANNEL):
            pass
        else:
            relay.create_ticket(event, client, BOT_TOKEN, STAFF_CHANNEL, USER_CHANNEL)
    elif channel == STAFF_CHANNEL:
        relay.handle_staff_reply(event, client, BOT_TOKEN, STAFF_CHANNEL, USER_CHANNEL)

@slack_app.event("app_home_opened")
def render_app_home(event, client):
    user_id = event.get("user")
    if not user_id:
        return
    home.publish_home(client, user_id, home.not_user())

@slack_app.action("send_paraphrased")
def send_paraphrased(client, body, ack):
    ack()
    payload = json.loads(body["actions"][0]["value"])
    user_id = body["user"]["id"]
    user_info = helpers.get_user_info(client, user_id)
    ticket_id = payload["ticket_id"]
    paraphrased = payload["paraphrased"]
    ticket = db.get_ticket(ticket_id)
    client.chat_postMessage(
        channel=USER_CHANNEL,
        text=f"{paraphrased}",
        thread_ts=ticket["userThreadTs"],
        username=user_info["username"],
        icon_url=user_info["pfp"],
    )
@slack_app.action("delete_message")
def delete_message(ack, body, client, respond):
    ack()
    payload = json.loads(body["actions"][0]["value"])
    message_ts = payload["ts"]
    if type(message_ts) == str:
        client.chat_delete(channel=USER_CHANNEL, ts=message_ts)
        respond("Deleted message")
    elif isinstance(message_ts, list):
        for ts in message_ts:
            client.chat_delete(channel=USER_CHANNEL, ts=ts)
        respond("Attachments deleted")

@slack_app.action("edit_message")
def edit_message(ack, body, client):
    ack()
    payload = json.loads(body["actions"][0]["value"])
    message_ts = payload["ts"]
    helpers.show_edit_modal(client, body, message_ts)

@slack_app.action("resolve_ticket")
def resolve_ticket(ack, body, client):
    ack()
    ticket_id = json.loads(body["actions"][0]["value"])
    ticket = db.get_ticket(ticket_id)
    user_id = body["user"]["id"]
    if (user_id in db.get_shipwrights() or user_id == ticket["userId"]) and ticket["status"] == "open":
        db.close_ticket(ticket_id)
        client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staffThreadTs"],
            text= f"Hey! Would you look at that, This ticket was marked as resolved by <@{user_id}>!",
        )
        client.chat_postMessage(
            channel=USER_CHANNEL,
            thread_ts=ticket["userThreadTs"],
            text=f"Hey! Would you look at that, This ticket was marked as resolved! Shipwrights will no longer receive your messages. If you still have a question, please feel free to open a new ticket.",
        )
        client.reactions_add(
            channel=STAFF_CHANNEL,
            timestamp=ticket["staffThreadTs"],
            name="checks-passed-octicon"
        )
        client.reactions_add(
            channel=USER_CHANNEL,
            timestamp=ticket["userThreadTs"],
            name="checks-passed-octicon"
        )
        ai.summarize_ticket(ticket_id)
    else:
        helpers.show_unauthorized_close(client, body)

@slack_app.command("/swsummery")
def trigger_summery(command, ack):
    ack()
    if command.get("user_id") == "U092F9A8VMY":
        send_reminder()

@slack_app.view("edited_message")
def edited_message(ack, client, view):
    ack()
    message_ts = view["private_metadata"]
    user_input = view["state"]["values"]["input_block"]["user_input"]["value"]
    client.chat_update(
        channel=USER_CHANNEL,
        ts=message_ts,
        text=user_input,
    )
    db.edit_message(message_ts, user_input)

def run_bot():
    handler = SocketModeHandler(slack_app, os.getenv("SLACK_APP_TOKEN"))
    handler.start()

if __name__ == "__main__":
    print("starting services...")
    reminder_thread = threading.Thread(target=summery.reminders_loop, daemon=True)
    reminder_thread.start()
    cache_emojis()
    port = int(os.getenv('PORT', 45100))
    server_thread = threading.Thread(target=api.run_server, daemon=True)
    server_thread.start()
    print(f"server on port {port}")
    
    print("bot starting...")
    run_bot()
