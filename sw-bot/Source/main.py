import os, threading, json, requests
import db, helpers, api, home
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

DASH_URL = os.getenv("DASHBOARD_URL", "http://localhost:3000")
API_KEY = os.getenv("API_KEY")
USER_CHANNEL = os.getenv("USER_CHANNEL_ID")
STAFF_CHANNEL = os.getenv("STAFF_CHANNEL_ID")
BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")

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
def msg(event, client, respond):
    if seen_already(event.get("client_msg_id") or event.get("event_ts")):
        return
    subtype = event.get("subtype")
    if subtype and subtype not in ["file_share"]:
        return
    channel = event["channel"]
    if channel == USER_CHANNEL:
        if event.get("thread_ts"):
            user_id = event["user"]
            text = event.get("text", "")
            files = event.get("files", [])
            
            if not text and not files:
                return
            
            ticket = db.find_ticket(event["thread_ts"])
            if ticket and ticket.get("status", None) != "closed":
                user_info = client.users_info(user=user_id)
                user_name = user_info["user"]["profile"].get("display_name") or user_info["user"]["profile"].get("real_name")
                user_avatar = user_info["user"]["profile"]["image_48"]
                
                file_info = []
                if files:
                    for f in files:
                        file_info.append({
                            'name': f.get('name'),
                            'url': f.get('url_private'),
                            'mimetype': f.get('mimetype'),
                            'size': f.get('size')
                        })
                
                db.save_message(ticket["id"], user_id, user_name, user_avatar, text or "", False, file_info if file_info else None, event.get("ts"))
                
                if text:
                    client.chat_postMessage(
                        channel=STAFF_CHANNEL,
                        thread_ts=ticket["staffThreadTs"],
                        text=text,
                        username=user_name,
                        icon_url=user_avatar
                    )
                
                if files:
                    helpers.send_files(event, client, STAFF_CHANNEL, ticket["staffThreadTs"], BOT_TOKEN)
                
                try:
                    port = os.getenv('PORT', '45100')
                    requests.post(f'http://localhost:{port}/ws/notify', json={'ticketId': ticket["id"]}, timeout=0.5)
                except:
                    pass
            elif ticket.get("status", None) == "closed" and USER_CHANNEL == event.get("channel"):
                client.chat_postEphemeral(
                    channel=USER_CHANNEL,
                    thread_ts=ticket["userThreadTs"],
                    user=user_id,
                    text="Hey there! Looks like this ticket was resolved. Shipwrights did not receive your response."

                )
        else:
            user_id = event["user"]
            text = event.get("text", "")
            files = event.get("files", [])
            
            if not text and not files:
                return
            
            user_info = client.users_info(user=user_id)
            user_name = user_info["user"]["profile"].get("display_name") or user_info["user"]["profile"].get("real_name")
            user_avatar = user_info["user"]["profile"]["image_48"]
            
            user_thread_link_resp = client.chat_getPermalink(channel=USER_CHANNEL, message_ts=event["ts"])
            user_thread_link = user_thread_link_resp["permalink"]

            staff_msg = client.chat_postMessage(
                channel=STAFF_CHANNEL,
                text=text,
                username=user_name,
                icon_url=user_avatar,
                blocks=[
                    {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": text}
                    },
                    {
                        "type": "context",
                        "elements": [
                            {"type": "mrkdwn", "text": f"<@{user_id}> `{user_id}` | <{user_thread_link}|thread>"}
                        ]
                    }
                ]
            )
            
            if files:
                helpers.send_files(event, client, STAFF_CHANNEL, staff_msg["ts"], BOT_TOKEN)
            
            staff_link_resp = client.chat_getPermalink(channel=STAFF_CHANNEL, message_ts=staff_msg["ts"])
            staff_link = staff_link_resp["permalink"]
            
            ticket_id = db.save_ticket(user_id, user_name, user_avatar, text or "📎 attachment", event["ts"], staff_msg["ts"])

            if ticket_id:
                dash_url = os.getenv("DASHBOARD_URL")
                dash_link = f"{dash_url}/admin/tickets/sw-{ticket_id}"
                
                client.chat_postMessage(
                    channel=STAFF_CHANNEL,
                    thread_ts=staff_msg["ts"],
                    text="New ticket!",
                    blocks=[
                        {
                            "type": "section",
                            "text": {"type": "mrkdwn", "text": "New ticket!"},
                            "accessory": {
                                "type": "button",
                                "text": {"type": "plain_text", "text": "Resolve Ticket"},
                                "style": "primary",
                                "value": str(ticket_id),
                                "action_id": "resolve_ticket"
                            }
                        },
                        {
                            "type": "context",
                            "elements": [
                                {"type": "mrkdwn", "text": f"#sw-{ticket_id} | <{dash_link}|view on dash>"}
                            ]
                        },
                    ]
                )
                
                client.chat_postMessage(
                    channel=USER_CHANNEL,
                    thread_ts=event["ts"],
                    text=f"Hey there! We have received your question, and someone from Shipwrights Team will get back to you shortly!",
                    unfurl_links=False,
                    unfurl_media=False,
                    blocks=[
                        {
                            "type": "section",
                            "text": {"type": "mrkdwn", "text": "Hey there! We have received your question, and someone from Shipwrights Team will get back to you shortly!"},
                            "accessory": {
                                "type": "button",
                                "text": {"type": "plain_text", "text": "Resolve Ticket"},
                                "style": "primary",
                                "value": str(ticket_id),
                                "action_id": "resolve_ticket"
                            }
                        },
                        {
                            "type": "context",
                            "elements": [
                                {"type": "mrkdwn", "text": f"ticket sw-{ticket_id} • <{staff_link}|staff link>"}
                            ]
                        }
                    ]
                )
    
    elif channel == STAFF_CHANNEL:
        helpers.handle_staff_reply(event, client, BOT_TOKEN, STAFF_CHANNEL, USER_CHANNEL)

@slack_app.event("app_home_opened")
def render_app_home(event, client):
    user_id = event.get("user")
    if not user_id:
        return
    home.publish_home(client, user_id, home.not_user())


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
def resolve_ticket(ack, body, client, respond):
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
    else:
        helpers.show_unauthorized_close(client, body)


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
    
    cache_emojis()

    port = int(os.getenv('PORT', 45100))
    server_thread = threading.Thread(target=api.run_server, daemon=True)
    server_thread.start()
    print(f"server on port {port}")
    
    print("bot starting...")
    run_bot()
