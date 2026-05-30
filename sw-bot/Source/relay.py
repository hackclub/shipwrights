import json, logging, os, tempfile, time
import requests
from slack_sdk.errors import SlackApiError
import ai, blocks, db, worker
from cache import cache
from globals import (
    ADMINS, BOT_TOKEN, MACROS, OPEN_TICKET_REACTION,
    RESOLVE_MESSAGES, STAFF_CHANNEL, USER_CHANNEL, client,
)
# from helpers import get_stardance_project  # ship_certs
from helpers import is_shipwright, parse_slack_link


def swap_reactions(client_inst, ticket, add_name, remove_name):
    for channel, ts in [(STAFF_CHANNEL, ticket["staff_thread_ts"]), (USER_CHANNEL, ticket["user_thread_ts"])]:
        try:
            client_inst.reactions_add(channel=channel, timestamp=ts, name=add_name)
        except SlackApiError:
            pass
        try:
            client_inst.reactions_remove(channel=channel, timestamp=ts, name=remove_name)
        except SlackApiError:
            pass


def clear_reactions(ticket):
    for channel, ts in [(STAFF_CHANNEL, ticket["staff_thread_ts"]), (USER_CHANNEL, ticket["user_thread_ts"])]:
        try:
            resp = client.reactions_get(channel=channel, timestamp=ts)
            for reaction in resp.get("message", {}).get("reactions", []):
                if cache.bot_user_id and cache.bot_user_id not in reaction.get("users", []):
                    continue
                try:
                    client.reactions_remove(channel=channel, timestamp=ts, name=reaction["name"])
                except SlackApiError:
                    pass
        except SlackApiError:
            pass


def post_resolve_messages(client_inst, ticket, ticket_id, user_id):
    client_inst.chat_postMessage(
        channel=STAFF_CHANNEL,
        thread_ts=ticket["staff_thread_ts"],
        text=RESOLVE_MESSAGES["staff"].replace("(user_id)", user_id),
    )
    if db.mark_feedback_requested(ticket_id):
        resp = client_inst.chat_postMessage(
            channel=USER_CHANNEL,
            thread_ts=ticket["user_thread_ts"],
            text=RESOLVE_MESSAGES["user"],
            blocks=blocks.ticket_user_resolve_with_feedback(ticket_id),
        )
        worker.enqueue(db.save_resolve_message_ts, ticket_id, resp["ts"])
    else:
        client_inst.chat_postMessage(
            channel=USER_CHANNEL,
            thread_ts=ticket["user_thread_ts"],
            text=RESOLVE_MESSAGES["user"],
            blocks=blocks.ticket_user_resolve(ticket_id),
        )


def send_files(event, dest_channel, dest_ts):
    results = []
    for f in event.get("files") or []:
        url = f.get("url_private_download") or f.get("url_private")
        if not url:
            continue
        name = f.get("name") or "file"
        suffix = f".{name.split('.')[-1]}" if "." in name else ""
        tmp_path = None
        try:
            fd, tmp_path = tempfile.mkstemp(suffix=suffix)
            with requests.get(url, headers={"Authorization": f"Bearer {BOT_TOKEN}"}, stream=True) as r:
                r.raise_for_status()
                with os.fdopen(fd, "wb") as fout:
                    for chunk in r.iter_content(chunk_size=8192):
                        fout.write(chunk)
            up = client.files_upload_v2(channel=dest_channel, thread_ts=dest_ts, filename=name, file=tmp_path)
            new_ts = None
            file_id = up.get("file", {}).get("id")
            if file_id:
                time.sleep(2)
                info = client.files_info(file=file_id)
                shares = info.get("file", {}).get("shares", {})
                for visibility in ("public", "private"):
                    chan_dict = shares.get(visibility, {})
                    if dest_channel in chan_dict:
                        new_ts = chan_dict[dest_channel][0]["ts"]
                        break
            results.append(new_ts)
        except (OSError, requests.RequestException, SlackApiError) as e:
            logging.error(f"send_files upload failed: {e}")
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except OSError as e:
                    logging.error(f"send_files unlink failed: {e}")
    return results


# def post_project_block(ticket, project):  # ship_certs
#     client.chat_postMessage(
#         channel=STAFF_CHANNEL,
#         thread_ts=ticket["staff_thread_ts"],
#         text="Project identified!",
#         blocks=blocks.project_found(project),
#     )
#
#
# def check_stardance(text, ticket):  # ship_certs
#     project_id = get_stardance_project(text)
#     if not project_id:
#         return
#     project = db.get_project_by_sd_id(str(project_id))
#     if project:
#         post_project_block(ticket, project)
#     else:
#         client.chat_postMessage(
#             channel=STAFF_CHANNEL,
#             thread_ts=ticket["staff_thread_ts"],
#             text="Failed to fetch project.. Perhaps it hasn't been shipped?",
#         )


def handle_staff_reply(event):
    thread = event.get("thread_ts")
    if not thread:
        return

    ticket = cache.find_ticket_by_ts(thread)
    if not ticket:
        return

    text = event.get("text", "")
    files = event.get("files", [])
    if not text and not files:
        return

    user_id = event["user"]
    user_info_resp = client.users_info(user=user_id)
    staff_name = user_info_resp["user"]["profile"].get("display_name") or user_info_resp["user"]["profile"].get("real_name")
    staff_avatar = user_info_resp["user"]["profile"]["image_48"]

    # check_stardance(text, ticket)  # ship_certs

    if text.startswith("?"):
        if ticket.get("status") == "closed":
            if cache.can_notify_closed(user_id, ticket["id"]):
                client.chat_postEphemeral(
                    channel=STAFF_CHANNEL,
                    thread_ts=ticket["staff_thread_ts"],
                    user=user_id,
                    text="Hey there! Looks like this ticket was resolved. The user did not receive your response.",
                )
            return

        clean_text = text[1:].strip()
        if not clean_text and not files:
            return

        dest_ts = ticket["user_thread_ts"]
        uploaded = []

        if files:
            uploaded = send_files(event, USER_CHANNEL, dest_ts)

        if clean_text:
            resp = client.chat_postMessage(
                channel=USER_CHANNEL,
                thread_ts=ticket["user_thread_ts"],
                text=clean_text,
                username=f"{staff_name} | Shipwrights Team",
                icon_url=staff_avatar,
            )
            dest_ts = resp["ts"]

        worker.enqueue(db.save_message, ticket["id"], user_id, staff_name, staff_avatar, text, True, None, dest_ts, event["ts"])

        if not files:
            client.chat_postEphemeral(
                channel=STAFF_CHANNEL,
                user=user_id,
                thread_ts=thread,
                blocks=blocks.sent_message_controls(dest_ts),
            )
        else:
            client.chat_postEphemeral(
                channel=STAFF_CHANNEL,
                user=user_id,
                thread_ts=thread,
                blocks=blocks.sent_files_controls(uploaded),
            )
        worker.enqueue(client.reactions_add, channel=STAFF_CHANNEL, timestamp=event["ts"], name="heavy_check_mark")
        return

    cmd = text.strip().lower().split()[0] if text.strip() else ""

    macro_key = cmd.lstrip("!")
    if macro_key in MACROS:
        if ticket.get("status") == "closed":
            if cache.can_notify_closed(user_id, ticket["id"]):
                client.chat_postEphemeral(
                    channel=STAFF_CHANNEL,
                    thread_ts=ticket["staff_thread_ts"],
                    user=user_id,
                    text="Hey there! Looks like this ticket was resolved. The user did not receive your response.",
                )
            return
        resp = client.chat_postMessage(
            channel=USER_CHANNEL,
            thread_ts=ticket["user_thread_ts"],
            text=MACROS[macro_key],
            username=f"{staff_name} | Shipwrights Team",
            icon_url=staff_avatar,
        )
        dest_ts = resp["ts"]
        worker.enqueue(db.save_message, ticket["id"], user_id, staff_name, staff_avatar, MACROS[macro_key], True, None, dest_ts, event["ts"])
        client.chat_postEphemeral(
            channel=STAFF_CHANNEL,
            user=user_id,
            thread_ts=thread,
            blocks=blocks.sent_message_controls(dest_ts),
        )
        worker.enqueue(client.reactions_add, channel=STAFF_CHANNEL, timestamp=event["ts"], name="white_check_mark")
        cache.close_ticket(ticket["id"])
        cache.claim_ticket(ticket["id"], user_id)
        close_resp = client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staff_thread_ts"],
            text=f"Hey! Would you look at that, This ticket was marked as resolved by <@{user_id}>!",
        )
        worker.enqueue(db.save_message, ticket["id"], "BOT", "Shipwrighter", None, f"ticket resolved by <@{user_id}>", True, None, close_resp["ts"])
        if db.mark_feedback_requested(ticket["id"]):
            resp = client.chat_postMessage(
                channel=USER_CHANNEL,
                thread_ts=ticket["user_thread_ts"],
                text=RESOLVE_MESSAGES["user"],
                blocks=blocks.ticket_user_resolve_with_feedback(ticket["id"]),
            )
            worker.enqueue(db.save_resolve_message_ts, ticket["id"], resp["ts"])
        else:
            client.chat_postMessage(
                channel=USER_CHANNEL,
                thread_ts=ticket["user_thread_ts"],
                text=RESOLVE_MESSAGES["user"],
                blocks=blocks.ticket_user_resolve(ticket["id"]),
            )
        swap_reactions(client, ticket, "checks-passed-octicon", OPEN_TICKET_REACTION)
        return

    if cmd in ("!tldr", "!ai") and not cache.get_user_opt_in(ticket["user_id"]):
        client.chat_postMessage(channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"], text="User has opted out of AI use.")
        return

    if cmd == "!help":
        macro_list = "\n".join(f"  `!{k}` — {v[:60]}{'…' if len(v) > 60 else ''}" for k, v in MACROS.items())
        help_text = (
            "*Shipwrights Bot Commands*\n\n"
            "*Sending messages*\n"
            "  `?<text>` — relay a message to the user\n\n"
            "*Ticket actions*\n"
            "  `!resolve` — close this ticket\n"
            "  `!reopen` — reopen a closed ticket\n"
            "  `!delete <link>` — delete a message from both sides\n"
            "  `!purge` _(admin)_ — delete all user-side messages and close ticket\n\n"
            "*AI*\n"
            "  `!tldr` — generate a ticket summary _(requires user opt-in)_\n"
            "  `!ai <text>` — AI-paraphrase a reply before sending _(requires user opt-in)_\n\n"
            f"*Macros* _(send message + auto-close)_\n{macro_list}"
        )
        client.chat_postEphemeral(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staff_thread_ts"],
            user=user_id,
            text=help_text,
        )
        return

    if cmd == "!tldr":
        worker.enqueue(client.reactions_add, channel=STAFF_CHANNEL, timestamp=event["ts"], name="white_check_mark")
        ai.summarize_ticket(ticket["id"])
        return

    if cmd == "!ai":
        clean_text = text.strip()[len("!ai"):].strip()
        worker.enqueue(db.save_message, ticket["id"], user_id, staff_name, staff_avatar, text, True, None, event.get("ts"))
        worker.enqueue(client.reactions_add, channel=STAFF_CHANNEL, timestamp=event["ts"], name="white_check_mark")
        ai.paraphrase_message(ticket["id"], clean_text)
        return

    if cmd == "!reopen":
        cache.open_ticket(ticket["id"])
        client.chat_postMessage(
            channel=USER_CHANNEL,
            thread_ts=ticket["user_thread_ts"],
            text=f"Hey it seems that this ticket was reopened by <@{user_id}>!",
        )
        resp = client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staff_thread_ts"],
            text=f"<@{user_id}> has reopened this ticket.",
        )
        worker.enqueue(db.save_message, ticket["id"], "BOT", "Shipwrighter", None, f"<@{user_id}> has reopened this ticket", True, None, resp["ts"])
        worker.enqueue(client.reactions_add, channel=STAFF_CHANNEL, timestamp=event["ts"], name="white_check_mark")
        swap_reactions(client, ticket, OPEN_TICKET_REACTION, "checks-passed-octicon")
        return

    if cmd == "!resolve":
        if ticket["status"] != "open":
            return
        cache.close_ticket(ticket["id"])
        cache.claim_ticket(ticket["id"], user_id)
        swap_reactions(client, ticket, "checks-passed-octicon", OPEN_TICKET_REACTION)
        resp = client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staff_thread_ts"],
            text=f"Hey! Would you look at that, This ticket was marked as resolved by <@{user_id}>!",
        )
        worker.enqueue(db.save_message, ticket["id"], "BOT", "Shipwrighter", None, f"ticket closed by <@{user_id}>", True, None, resp["ts"])
        worker.enqueue(client.reactions_add, channel=STAFF_CHANNEL, timestamp=event["ts"], name="white_check_mark")
        if db.mark_feedback_requested(ticket["id"]):
            resp = client.chat_postMessage(
                channel=USER_CHANNEL,
                thread_ts=ticket["user_thread_ts"],
                text=RESOLVE_MESSAGES["user"],
                blocks=blocks.ticket_user_resolve_with_feedback(ticket["id"]),
            )
            worker.enqueue(db.save_resolve_message_ts, ticket["id"], resp["ts"])
        else:
            client.chat_postMessage(
                channel=USER_CHANNEL,
                thread_ts=ticket["user_thread_ts"],
                text=RESOLVE_MESSAGES["user"],
                blocks=blocks.ticket_user_resolve(ticket["id"]),
            )
        return

    if cmd == "!purge":
        if user_id not in ADMINS:
            client.chat_postEphemeral(
                channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"],
                user=user_id, text="Only admins can use !purge.",
            )
            return
        header_ts = ticket["user_thread_ts"]
        deleted = 0
        cursor = None
        while True:
            kwargs = {"channel": USER_CHANNEL, "ts": header_ts, "limit": 200}
            if cursor:
                kwargs["cursor"] = cursor
            result = client.conversations_replies(**kwargs)
            for msg in result.get("messages", []):
                if msg["ts"] == header_ts:
                    continue
                try:
                    client.chat_delete(channel=USER_CHANNEL, ts=msg["ts"])
                    deleted += 1
                except SlackApiError:
                    pass
            cursor = result.get("response_metadata", {}).get("next_cursor")
            if not cursor:
                break
        cache.close_ticket(ticket["id"])
        cache.claim_ticket(ticket["id"], user_id)
        clear_reactions(ticket)
        worker.enqueue(client.reactions_add, channel=STAFF_CHANNEL, timestamp=event["ts"], name="white_check_mark")
        client.chat_postEphemeral(
            channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"],
            user=user_id, text=f"Purged {deleted} messages and closed ticket.",
        )
        return

    if cmd == "!delete":
        if not is_shipwright(user_id) and user_id not in ADMINS:
            client.chat_postEphemeral(
                channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"],
                user=user_id, text="Only shipwrights and admins can use !delete.",
            )
            return
        parts = text.strip().split(None, 1)
        if len(parts) < 2:
            client.chat_postEphemeral(
                channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"],
                user=user_id, text="Usage: !delete <message_link>",
            )
            return
        parsed = parse_slack_link(parts[1].strip())
        if not parsed:
            client.chat_postEphemeral(
                channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"],
                user=user_id, text="Could not parse that link.",
            )
            return
        link_channel, link_ts = parsed
        if link_channel not in (USER_CHANNEL, STAFF_CHANNEL):
            client.chat_postEphemeral(
                channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"],
                user=user_id, text="Link must point to a message in the user or staff channel.",
            )
            return
        if link_ts in (ticket["user_thread_ts"], ticket["staff_thread_ts"]):
            client.chat_postEphemeral(
                channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"],
                user=user_id, text="Cannot delete the ticket header message.",
            )
            return
        if not db.message_belongs_to_ticket(link_ts, ticket["id"]):
            client.chat_postEphemeral(
                channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"],
                user=user_id, text="That message does not belong to this ticket.",
            )
            return
        linked_ts = db.get_linked_message_ts(link_ts)
        user_ts = link_ts if link_channel == USER_CHANNEL else linked_ts
        staff_ts = link_ts if link_channel == STAFF_CHANNEL else linked_ts
        deleted = []
        for ch, ts in ((USER_CHANNEL, user_ts), (STAFF_CHANNEL, staff_ts)):
            if not ts:
                continue
            try:
                client.chat_delete(channel=ch, ts=ts)
                deleted.append("user" if ch == USER_CHANNEL else "staff")
            except SlackApiError:
                pass
        if deleted:
            worker.enqueue(client.reactions_add, channel=STAFF_CHANNEL, timestamp=event["ts"], name="white_check_mark")
        client.chat_postEphemeral(
            channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"],
            user=user_id, text=f"Deleted from: {', '.join(deleted)}." if deleted else "Could not delete message.",
        )
        return

    file_info = [{"name": f.get("name"), "url": f.get("url_private"), "mimetype": f.get("mimetype"), "size": f.get("size")} for f in files] if files else None
    worker.enqueue(db.save_message, ticket["id"], user_id, staff_name, staff_avatar, text.lstrip("?"), True, file_info, event.get("ts"))


def handle_client_reply(event):
    if event.get("subtype") == "thread_broadcast":
        return True
    user_id = event["user"]
    text = event.get("text", "")
    files = event.get("files", [])

    if not event.get("thread_ts"):
        return False
    if not text and not files:
        return True

    ticket = cache.find_ticket_by_ts(event["thread_ts"])
    if not ticket:
        return True

    if ticket.get("status") == "closed":
        if cache.can_notify_closed(user_id, ticket["id"]):
            client.chat_postEphemeral(
                channel=USER_CHANNEL,
                thread_ts=ticket["user_thread_ts"],
                user=user_id,
                text="Hey there! Looks like this ticket was resolved. Shipwrights did not receive your response.",
            )
        return True

    user_info_resp = client.users_info(user=user_id)
    user_name = user_info_resp["user"]["profile"].get("display_name") or user_info_resp["user"]["profile"].get("real_name")
    user_avatar = user_info_resp["user"]["profile"]["image_48"]

    file_info = [{"name": f.get("name"), "url": f.get("url_private"), "mimetype": f.get("mimetype"), "size": f.get("size")} for f in files] if files else None

    if text:
        resp = client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staff_thread_ts"],
            text=text,
            username=user_name,
            icon_url=user_avatar,
        )
        dest_ts = resp["ts"]
        worker.enqueue(db.save_message, ticket["id"], user_id, user_name, user_avatar, text, False, file_info, dest_ts, event.get("ts"))
        # check_stardance(text, ticket)  # ship_certs

    if files:
        send_files(event, STAFF_CHANNEL, ticket["staff_thread_ts"])

    return True


def create_ticket(event):
    if event.get("thread_ts"):
        return
    user_id = event["user"]
    text = event.get("text", "")
    files = event.get("files", [])
    if not text and not files:
        return

    user_opt_in = cache.get_user_opt_in(user_id)
    user_info_resp = client.users_info(user=user_id)
    user_name = user_info_resp["user"]["profile"].get("display_name") or user_info_resp["user"]["profile"].get("real_name")
    user_avatar = user_info_resp["user"]["profile"]["image_48"]

    user_thread_link = client.chat_getPermalink(channel=USER_CHANNEL, message_ts=event["ts"])["permalink"]

    staff_msg = client.chat_postMessage(
        channel=STAFF_CHANNEL,
        text=text,
        username=user_name,
        icon_url=user_avatar,
        blocks=blocks.ticket_staff_header(text, user_id, user_thread_link),
    )

    if files:
        send_files(event, STAFF_CHANNEL, staff_msg["ts"])

    staff_link = client.chat_getPermalink(channel=STAFF_CHANNEL, message_ts=staff_msg["ts"])["permalink"]
    ticket_id = db.save_ticket(user_id, user_name, user_avatar, text or "📎 attachment", event["ts"], staff_msg["ts"])

    if not ticket_id:
        return

    cache.ticket_data_saver({
        "id": ticket_id,
        "user_id": user_id,
        "user_name": user_name,
        "question": text or "📎 attachment",
        "user_thread_ts": event["ts"],
        "staff_thread_ts": staff_msg["ts"],
        "status": "open",
        "closed_by": None,
    })

    client.chat_postMessage(
        channel=STAFF_CHANNEL,
        thread_ts=staff_msg["ts"],
        text="New ticket!",
        blocks=blocks.ticket_staff_controls(ticket_id, user_id),
    )

    client.chat_postMessage(
        channel=USER_CHANNEL,
        thread_ts=event["ts"],
        text="Hey there! We have received your question, and someone from Shipwrights Team will get back to you shortly!",
        unfurl_links=False,
        unfurl_media=False,
        blocks=blocks.ticket_user_ack(ticket_id, staff_link),
    )

    client.chat_postEphemeral(
        channel=USER_CHANNEL,
        thread_ts=event["ts"],
        text="AI Notice.",
        blocks=blocks.ai_opt_notice(user_opt_in, event["ts"]),
        user=user_id,
    )

    if user_opt_in:
        ai.detect_ticket(ticket_id)

    client.reactions_add(channel=STAFF_CHANNEL, timestamp=staff_msg["ts"], name=OPEN_TICKET_REACTION)
    client.reactions_add(channel=USER_CHANNEL, timestamp=event["ts"], name=OPEN_TICKET_REACTION)


def edit_message(event):
    message_ts = event.get("previous_message", {}).get("ts")
    message = event.get("message", {}).get("text")
    ticket = cache.find_ticket_by_ts(message_ts)
    if not ticket:
        return

    if message == "This message was deleted.":
        if message_ts in cache.deleted_headers:
            return
        cache.deleted_headers.add(message_ts)
        resp = client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=ticket["staff_thread_ts"],
            text="User has deleted message header, If no messages have been sent please don't send a reply or resolve as this could cause messages to be sent directly in the channel and not threaded.",
        )
        worker.enqueue(db.save_message, ticket["id"], "BOT", "Shipwrighter", None, "User has deleted message header, don't reply or resolve - messages won't be threaded.", True, None, resp["ts"])
        return

    if event.get("message", {}).get("thread_ts") == event.get("message", {}).get("ts"):
        user_thread_link = client.chat_getPermalink(channel=USER_CHANNEL, message_ts=message_ts)["permalink"]
        client.chat_update(
            channel=STAFF_CHANNEL,
            ts=ticket["staff_thread_ts"],
            text="Ticket!",
            blocks=blocks.ticket_staff_header(message, ticket["user_id"], user_thread_link),
        )
        return

    dest_message_ts = db.get_dest_message_ts(message_ts)
    if dest_message_ts:
        client.chat_update(channel=STAFF_CHANNEL, ts=dest_message_ts, text=message)
