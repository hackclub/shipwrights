import os, json, summary, threading
import db, helpers, api, home, relay, ai
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from summary import send_reminder
from globals import BOT_TOKEN, USER_CHANNEL, STAFF_CHANNEL


slack_app = App(token=BOT_TOKEN, signing_secret=os.getenv("SLACK_SIGNING_SECRET"), process_before_response=True)
seen = set()
MAX_SEEN = 1000



def seen_already(event_id):
    if event_id in seen:
        return True
    seen.add(event_id)
    if len(seen) > MAX_SEEN:
        seen.pop()
    return False


@slack_app.event("message")
def msg(event):
    if seen_already(event.get("client_msg_id") or event.get("event_ts")):
        return
    subtype = event.get("subtype")
    if subtype and subtype not in ["file_share", "message_changed", "thread_broadcast"]:
        return
    channel = event["channel"]
    if subtype == "message_changed":
        if channel != USER_CHANNEL:
            return
        relay.edit_message(event)
        return
    if channel == USER_CHANNEL:
        if relay.handle_client_reply(event):
            pass
        else:
            relay.create_ticket(event)
    elif channel == STAFF_CHANNEL:
        relay.handle_staff_reply(event)

@slack_app.event("app_home_opened")
def render_app_home(event):
    user_id = event.get("user")
    if not user_id:
        return
    if user_id in db.get_authorized_users():
        home.publish_home(user_id, home.show_home())
        return
    home.publish_home(user_id, home.not_user())
    return

@slack_app.action("send_paraphrased")
def send_paraphrased(client, body, ack):
    ack()
    payload = json.loads(body["actions"][0]["value"])
    user_id = body["user"]["id"]
    user_info = helpers.get_user_info(client, user_id)
    ticket_id = payload["ticket_id"]
    paraphrased = payload["paraphrased"]
    ticket = db.get_ticket(ticket_id)
    if ticket.get("status") == "closed":
        client.chat_postEphemeral(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staffThreadTs"],
            user=user_id,
            text="Hey there! Looks like this ticket was resolved. The user did not receive your response."
        )
        return
    client.chat_postMessage(
        channel=USER_CHANNEL,
        text=f"{paraphrased}",
        thread_ts=ticket["userThreadTs"],
        username=f"{user_info['username']} | Shipwrights Team",
        icon_url=user_info["pfp"],
    )
    client.chat_postMessage(
        channel=STAFF_CHANNEL,
        text=f"{paraphrased}",
        thread_ts=ticket["staffThreadTs"],
        username=f"{user_info['username']} | AI Paraphrased",
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

@slack_app.action("resolve_detected")
def resolve_detected(ack, body, client):
    ack()
    payload = json.loads(body["actions"][0]["value"])
    ticket_id = payload["ticket_id"]
    reply = payload["reply"]
    user_id = body["user"]["id"]
    ticket = db.get_ticket(ticket_id)
    user_info = helpers.get_user_info(client, user_id)
    if ticket["status"] == "open":
        db.close_ticket(ticket_id)
        db.claim_ticket(ticket_id, user_id)
        client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staffThreadTs"],
            text=f"Hey! Would you look at that, This ticket was marked as resolved by <@{user_id}>!",
        )
        client.chat_postMessage(
            channel=USER_CHANNEL,
            thread_ts=ticket["userThreadTs"],
            text=reply,
            username=f"{user_info['username']} | Shipwrights Team",
            icon_url=user_info["pfp"],
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

@slack_app.action("resolve_ticket")
def resolve_ticket(ack, body, client):
    ack()
    ticket_id = json.loads(body["actions"][0]["value"])
    ticket = db.get_ticket(ticket_id)
    user_id = body["user"]["id"]
    if (helpers.is_shipwright(user_id) and user_id != ticket["userId"]) and ticket["status"] == "open":
        db.close_ticket(ticket_id)
        db.claim_ticket(ticket_id, user_id)
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

    elif (user_id == ticket["userId"] and not helpers.is_shipwright(user_id)) and ticket["status"] == "open":
        db.close_ticket(ticket_id)
        client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staffThreadTs"],
            text=f"Hey! Would you look at that, This ticket was marked as resolved by <@{user_id}>!",
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
        client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staffThreadTs"],
            text="",
            blocks=[
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": "Hey! So it looks the user closed this ticket. Please claim this ticket if you handled the ticket."},
                    "accessory": {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Claim Ticket"},
                        "style": "primary",
                        "value": str(ticket_id),
                        "action_id": "claim_ticket"
                    }
                },
            ]
        )

    elif helpers.is_shipwright(user_id) and user_id == ticket["userId"]:
        client.chat_postEphemeral(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staffThreadTs"],
            user=user_id,
            text="You cannot close your own ticket as a shipwright."
        )
    else:
        helpers.show_unauthorized_close(client, body)

@slack_app.action("claim_ticket")
def claim_ticket(body, client, ack):
    ack()
    ticket_id = json.loads(body["actions"][0]["value"])
    ticket = db.get_ticket(ticket_id)
    user_id = body["user"]["id"]
    if db.is_claimed(ticket_id):
        client.chat_postEphemeral(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staffThreadTs"],
            user=user_id,
            text=f"*This ticket is already claimed by <@{ticket['closedBy']}>!*"
        )
    else:
        db.claim_ticket(ticket_id, user_id)
        client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staffThreadTs"],
            text=f"*This ticket has been claimed by <@{user_id}>!*"
        )

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
    reminder_thread = threading.Thread(target=summary.reminders_loop, daemon=True)
    server_thread = threading.Thread(target=api.run_server, daemon=True)
    server_thread.start()
    reminder_thread.start()
    run_bot()
