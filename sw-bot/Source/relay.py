import json, os, requests, tempfile, time
import db, ai

MACROS = {
    "fraud": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward any related questions to <@U091HC53CE8>.",
    "fthelp": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward related questions to <#C09MATKQM8C>.",
    "faq": "Hey there!\nPlease have a look at our FAQ <https://us.review.hackclub.com/faq | here>",
    "queue": "Hey there!\nwe currently have a backlog of projects waiting to be certified. Please be patient.\n\n*You can keep track of the queue <https://us.review.hackclub.com/queue | here>!*",
}


def send_files(event, client, dest_channel, dest_ts, bot_token):
    files = event.get("files") or []
    results = []

    for file in files:
        url = file.get("url_private_download") or file.get("url_private")
        if not url:
            continue

        name = file.get("name") or "file"
        suffix = f".{name.split('.')[-1]}" if "." in name else ""

        tmp_path = None
        try:
            fd, tmp_path = tempfile.mkstemp(suffix=suffix)
            with requests.get(url, headers={"Authorization": f"Bearer {bot_token}"}, stream=True) as r:
                r.raise_for_status()
                with os.fdopen(fd, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)

            up = client.files_upload_v2(
                channel=dest_channel,
                thread_ts=dest_ts,
                filename=name,
                file=tmp_path,
                initial_comment=None
            )
            new_ts = None
            file = up.get("file").get("id")
            if file:
                time.sleep(2)
                info = client.files_info(file=file)
                shares = info.get("file", {}).get("shares", {})
                for visibility in ("public", "private"):
                    chan_dict = shares.get(visibility, {})
                    if dest_channel in chan_dict:
                        new_ts = chan_dict[dest_channel][0]["ts"]
                        break
            results.append(new_ts)

        except Exception as e:
            print(f"file upload failed: {e}")
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception as e:
                    print(f"file unlink failed: {e}")

    return results


def handle_staff_reply(event, client, bot_token, staff_channel, user_channel):
    uploaded = []
    thread = event.get("thread_ts")
    if not thread:
        return

    ticket = db.find_ticket(thread)
    if not ticket:
        return

    text = event.get("text", "")
    files = event.get("files", [])

    if not text and not files:
        return

    user_id = event["user"]


    user_info = client.users_info(user=user_id)
    staff_name = user_info["user"]["profile"].get("display_name") or user_info["user"]["profile"].get("real_name")
    staff_avatar = user_info["user"]["profile"]["image_48"]

    if text.startswith("?"):

        if ticket.get("status") == "closed":
            client.chat_postEphemeral(
                channel=staff_channel,
                thread_ts=ticket["staffThreadTs"],
                user=user_id,
                text="Hey there! Looks like this ticket was resolved. The user did not receive your response."
            )
            return

        clean_text = text[1:].strip()

        file_info = []

        dest_ts = ticket["userThreadTs"]
        if files:
            uploaded = send_files(event, client, user_channel, dest_ts, bot_token)

        if clean_text:
            resp = client.chat_postMessage(
                channel=user_channel,
                thread_ts=ticket["userThreadTs"],
                text=clean_text,
                username=f"{staff_name} | Shipwrights Team",
                icon_url=staff_avatar
            )
            dest_ts = resp["ts"]

        db.save_message(ticket["id"], user_id, staff_name, staff_avatar, text, True, file_info if file_info else None, dest_ts)
        ping_ws(ticket["id"])

        if not files:
            client.chat_postEphemeral(
                channel=staff_channel,
                user=user_id,
                thread_ts=thread,
                blocks=[
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "Message sent."
                        }
                    },
                    {
                        "type": "actions",
                        "elements": [
                            {
                                "type": "button",
                                "text": {"type": "plain_text", "text": "Delete message"},
                                "style": "danger",
                                "value": json.dumps({"ts": dest_ts}),
                                "action_id": "delete_message"
                            },
                            {
                                "type": "button",
                                "text": {"type": "plain_text", "text": "Edit message"},
                                "value": json.dumps({"ts": dest_ts}),
                                "action_id": "edit_message"
                            }
                        ]
                    }
                ]
            )
        else:
            client.chat_postEphemeral(
                channel=staff_channel,
                user=user_id,
                thread_ts=thread,
                blocks=[
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "Attachments sent."
                        },
                        "accessory": {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "Delete Attachments"},
                            "style": "danger",
                            "value": json.dumps({"ts": uploaded}),
                            "action_id": "delete_message"
                        }
                    }
                ]
            )
    elif text.strip().lower().startswith('!') and text.strip('!') in MACROS:
        if ticket.get("status") == "closed":
            client.chat_postEphemeral(
                channel=staff_channel,
                thread_ts=ticket["staffThreadTs"],
                user=user_id,
                text="Hey there! Looks like this ticket was resolved. The user did not receive your response."
            )
            return

        clean_text = text[1:].strip().lower()
        if clean_text in MACROS:
            resp = client.chat_postMessage(
                channel=user_channel,
                thread_ts=ticket["userThreadTs"],
                text=MACROS[clean_text],
                username=f"{staff_name} | Shipwrights Team",
                icon_url=staff_avatar
            )
            dest_ts = resp["ts"]
            db.save_message(ticket["id"], user_id, staff_name, staff_avatar, text, True, None, dest_ts)
            ping_ws(ticket["id"])
            client.chat_postEphemeral(
                channel=staff_channel,
                user=user_id,
                thread_ts=thread,
                blocks=[
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "Message sent."
                        }
                    },
                    {
                        "type": "actions",
                        "elements": [
                            {
                                "type": "button",
                                "text": {"type": "plain_text", "text": "Delete message"},
                                "style": "danger",
                                "value": json.dumps({"ts": dest_ts}),
                                "action_id": "delete_message"
                            },
                            {
                                "type": "button",
                                "text": {"type": "plain_text", "text": "Edit message"},
                                "value": json.dumps({"ts": dest_ts}),
                                "action_id": "edit_message"
                            }
                        ]
                    }
                ]
            )
            db.close_ticket(ticket["id"])
            client.chat_postMessage(
                channel=staff_channel,
                thread_ts=ticket["staffThreadTs"],
                text=f"Hey! Would you look at that, This ticket was marked as resolved by <@{user_id}>!",
            )
            client.chat_postMessage(
                channel=user_channel,
                thread_ts=ticket["userThreadTs"],
                text=f"Hey! Would you look at that, This ticket was marked as resolved! Shipwrights will no longer receive your messages. If you still have a question, please feel free to open a new ticket.",
            )
            client.reactions_add(
                channel=staff_channel,
                timestamp=ticket["staffThreadTs"],
                name="checks-passed-octicon"
            )
            client.reactions_add(
                channel=user_channel,
                timestamp=ticket["userThreadTs"],
                name="checks-passed-octicon"
            )
    elif text.strip().lower().startswith('!summarize'):
        ai.summarize_ticket(ticket["id"])
    elif text.strip() == ".resolve":
        if not db.can_close(user_id):
            client.chat_postEphemeral(
                channel=staff_channel,
                thread_ts=thread,
                user=user_id,
                text="Are u sure u have the right perms for this?"
            )
            return

        if db.close_ticket(ticket["id"]):

            try:
                client.reactions_add(
                    channel=staff_channel,
                    timestamp=thread,
                    name="checks-passed-octicon"
                )
            except Exception as e:
                print(f"Failed to add staff thread reaction for a ticket: {e}")

            try:
                client.reactions_add(
                    channel=user_channel,
                    timestamp=ticket["userThreadTs"],
                    name="checks-passed-octicon"
                )
            except Exception as e:
                print(f"Failed to add client thread reaction for a ticket: {e}")

            client.chat_postMessage(
                channel=staff_channel,
                thread_ts=thread,
                text="ticket closed"
            )

            client.chat_postMessage(
                channel=user_channel,
                thread_ts=ticket["userThreadTs"],
                text="This ticket has been resolved. If you have any more questions create a new ticket!"
            )
        else:
            client.chat_postEphemeral(
                channel=staff_channel,
                thread_ts=thread,
                user=user_id,
                text="shit broke yo"
            )
    else:
        file_info = []
        if files:
            for f in files:
                file_info.append({
                    'name': f.get('name'),
                    'url': f.get('url_private'),
                    'mimetype': f.get('mimetype'),
                    'size': f.get('size')
                })
        db.save_message(ticket["id"], user_id, staff_name, staff_avatar, text, True, file_info if file_info else None,
                        event.get("ts"))
        ping_ws(ticket["id"])

def handle_client_reply(event, client, bot_token, staff_channel, user_channel):
    user_id = event["user"]
    text = event.get("text", "")
    files = event.get("files", [])
    if not event.get("thread_ts"):
        return False

    if not text and not files:
        return True

    ticket = db.find_ticket(event["thread_ts"])
    if ticket and ticket.get("status", None) != "closed":
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"]["profile"].get("display_name") or user_info["user"]["profile"].get(
            "real_name")
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

        db.save_message(ticket["id"], user_id, user_name, user_avatar, text or "", False,
                        file_info if file_info else None, event.get("ts"))

        if text:
            client.chat_postMessage(
                channel=staff_channel,
                thread_ts=ticket["staffThreadTs"],
                text=text,
                username=user_name,
                icon_url=user_avatar
            )

        if files:
            send_files(event, client, staff_channel, ticket["staffThreadTs"], bot_token)

        try:
            requests.post(f'http://localhost:{os.getenv("port")}/ws/notify', json={'ticketId': ticket["id"]}, timeout=0.5)
        except Exception as e:
            print(f"failed to send notification: {e}")
    elif ticket.get("status", None) == "closed" and user_channel == event.get("channel"):
        client.chat_postEphemeral(
            channel=user_channel,
            thread_ts=ticket["userThreadTs"],
            user=user_id,
            text="Hey there! Looks like this ticket was resolved. Shipwrights did not receive your response."

        )
    else:
        return False
    return True

def create_ticket(event, client, bot_token, staff_channel, user_channel):
    user_id = event["user"]
    text = event.get("text", "")
    files = event.get("files", [])

    if not text and not files:
        return

    user_info = client.users_info(user=user_id)
    user_name = user_info["user"]["profile"].get("display_name") or user_info["user"]["profile"].get("real_name")
    user_avatar = user_info["user"]["profile"]["image_48"]

    user_thread_link_resp = client.chat_getPermalink(channel=user_channel, message_ts=event["ts"])
    user_thread_link = user_thread_link_resp["permalink"]

    staff_msg = client.chat_postMessage(
        channel=staff_channel,
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
        send_files(event, client, staff_channel, staff_msg["ts"], bot_token)

    staff_link_resp = client.chat_getPermalink(channel=staff_channel, message_ts=staff_msg["ts"])
    staff_link = staff_link_resp["permalink"]

    ticket_id = db.save_ticket(user_id, user_name, user_avatar, text or "📎 attachment", event["ts"], staff_msg["ts"])

    if ticket_id:
        dash_url = os.getenv("DASHBOARD_URL")
        dash_link = f"{dash_url}/admin/tickets/sw-{ticket_id}"

        client.chat_postMessage(
            channel=staff_channel,
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
                        {"type": "mrkdwn", "text": f"#sw-{ticket_id} | <{dash_link}|view on dash> | <{dash_url + '/admin/ship_certifications?search=' + user_id}| user projects (search)>"}
                    ]
                },
            ]
        )

        client.chat_postMessage(
            channel=user_channel,
            thread_ts=event["ts"],
            text=f"Hey there! We have received your question, and someone from Shipwrights Team will get back to you shortly!",
            unfurl_links=False,
            unfurl_media=False,
            blocks=[
                {
                    "type": "section",
                    "text": {"type": "mrkdwn",
                             "text": "Hey there! We have received your question, and someone from Shipwrights Team will get back to you shortly!"},
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


def ping_ws(ticket_id):
    try:
        port = os.getenv('PORT', '45100')
        requests.post(f'http://localhost:{port}/ws/notify', json={'ticketId': ticket_id}, timeout=0.5)
    except Exception as e:
        print(f"Failed to ping ws ticket: {e}")
