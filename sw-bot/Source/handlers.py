import json
import ai, blocks, db, errors, relay, views, worker
from slack_sdk.errors import SlackApiError
from cache import cache
from globals import (
    ADMINS, CANNOT_CLOSE_OWN, ALREADY_CLAIMED, MESSAGE_NOT_RECEIVED, META_CHANNEL,
    OPEN_TICKET_REACTION, STAFF_CHANNEL, TICKET_CLAIMED, USER_CHANNEL, client,
)
from helpers import (
    get_user_info, is_shipwright, respond,
    show_edit_modal, show_feedback_modal, show_unauthorized_close,
)


def handle_message(event: dict) -> None:
    if event.get("bot_id"):
        return
    subtype = event.get("subtype")
    if subtype and subtype not in ("file_share", "message_changed", "thread_broadcast", "message_deleted"):
        return
    channel = event["channel"]
    if subtype == "message_changed":
        prev_ts = event.get("previous_message", {}).get("ts")
        if channel != USER_CHANNEL or prev_ts in cache.ignorable:
            if prev_ts in cache.ignorable:
                cache.ignorable.remove(prev_ts)
            return
        relay.edit_message(event)
        return
    if not event.get("text") and event.get("attachments", [{}])[0].get("is_share", False):
        event["text"] = event.get("attachments", [{}])[0].get("text")
    if channel == USER_CHANNEL:
        if not relay.handle_client_reply(event):
            relay.create_ticket(event)
    elif channel == STAFF_CHANNEL:
        relay.handle_staff_reply(event)
    elif channel == META_CHANNEL:
        if not subtype and not event.get("thread_ts"):
            worker.task_runner.enqueue_meta_sticky_update()


def handle_send_paraphrased(payload: dict) -> None:
    action_value = json.loads(payload["actions"][0]["value"])
    user_id = payload["user"]["id"]
    user_info = get_user_info(client, user_id)
    ticket_id = action_value["ticket_id"]
    paraphrased = action_value["paraphrased"]
    ticket = cache.get_ticket_by_id(ticket_id)
    if not ticket:
        return
    if ticket.get("status") == "closed":
        client.chat_postEphemeral(channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"], user=user_id, text=MESSAGE_NOT_RECEIVED)
        return
    user_resp = client.chat_postMessage(
        channel=USER_CHANNEL, text=paraphrased, thread_ts=ticket["user_thread_ts"],
        username=f"{user_info['username']} | Shipwrights Team", icon_url=user_info["pfp"],
    )
    staff_resp = client.chat_postMessage(
        channel=STAFF_CHANNEL, text=paraphrased, thread_ts=ticket["staff_thread_ts"],
        username=f"{user_info['username']} | AI Paraphrased", icon_url=user_info["pfp"],
    )
    worker.enqueue(db.save_message, ticket_id, user_id, f"{user_info['username']} | AI Paraphrased", user_info["pfp"], paraphrased, True, None, staff_resp["ts"])
    client.chat_postEphemeral(channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"], user=user_id, text="Message sent.", blocks=blocks.sent_message_controls(user_resp["ts"]))


def handle_delete_message(payload: dict) -> None:
    action_value = json.loads(payload["actions"][0]["value"])
    response_url = payload.get("response_url", "")
    message_ts = action_value["ts"]
    if isinstance(message_ts, str):
        client.chat_delete(channel=USER_CHANNEL, ts=message_ts)
        if response_url:
            respond(response_url, "Deleted message")
    elif isinstance(message_ts, list):
        for ts in message_ts:
            client.chat_delete(channel=USER_CHANNEL, ts=ts)
        if response_url:
            respond(response_url, "Attachments deleted")


def handle_edit_message(payload: dict) -> None:
    action_value = json.loads(payload["actions"][0]["value"])
    show_edit_modal(client, payload, action_value["ts"])


def handle_modify_opt(payload: dict) -> None:
    action_value = json.loads(payload["actions"][0]["value"])
    user_id = payload["user"]["id"]
    cache.modify_user_opt(user_id, int(action_value["opt"]))
    client.chat_postEphemeral(
        text=f"Successfully {'opted in!' if action_value['opt'] == '1' else 'opted out!'}",
        thread_ts=action_value["thread_ts"],
        channel=USER_CHANNEL,
        user=user_id,
    )


def handle_resolve_detected(payload: dict) -> None:
    action_value = json.loads(payload["actions"][0]["value"])
    ticket_id = action_value["ticket_id"]
    reply = action_value["reply"]
    user_id = payload["user"]["id"]
    ticket = cache.get_ticket_by_id(ticket_id)
    if not ticket:
        return
    user_info = get_user_info(client, user_id)
    if ticket["status"] != "open":
        show_unauthorized_close(client, payload, "closing")
        return
    cache.close_ticket(ticket_id)
    cache.claim_ticket(ticket_id, user_id)
    reply_resp = client.chat_postMessage(channel=USER_CHANNEL, thread_ts=ticket["user_thread_ts"], text=reply, username=f"{user_info['username']} | Shipwrights Team", icon_url=user_info["pfp"])
    client.chat_postEphemeral(channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"], user=user_id, text="Message sent.", blocks=blocks.sent_message_controls(reply_resp["ts"]))
    relay.post_resolve_messages(client, ticket, ticket_id, user_id)
    client.chat_postMessage(channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"], text=reply, username=f"{user_info['username']} | AI Auto Detection", icon_url=user_info["pfp"])
    relay.swap_reactions(client, ticket, "checks-passed-octicon", OPEN_TICKET_REACTION)
    if cache.get_user_opt_in(ticket["user_id"]):
        ai.summarize_ticket(ticket_id)


def handle_resolve_ticket(payload: dict) -> None:
    ticket_id = json.loads(payload["actions"][0]["value"])
    ticket = cache.get_ticket_by_id(ticket_id)
    if not ticket:
        return
    user_id = payload["user"]["id"]
    is_sw = is_shipwright(user_id)
    is_owner = user_id == ticket["user_id"]
    if ticket["status"] != "open":
        show_unauthorized_close(client, payload, "closing")
        return
    if is_sw and is_owner:
        client.chat_postEphemeral(channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"], user=user_id, text=CANNOT_CLOSE_OWN)
        return
    if is_sw and not is_owner:
        cache.close_ticket(ticket_id)
        cache.claim_ticket(ticket_id, user_id)
        relay.post_resolve_messages(client, ticket, ticket_id, user_id)
        relay.swap_reactions(client, ticket, "checks-passed-octicon", OPEN_TICKET_REACTION)
        if cache.get_user_opt_in(ticket["user_id"]):
            ai.summarize_ticket(ticket_id)
        return
    if is_owner and not is_sw:
        cache.close_ticket(ticket_id)
        relay.post_resolve_messages(client, ticket, ticket_id, user_id)
        relay.swap_reactions(client, ticket, "checks-passed-octicon", OPEN_TICKET_REACTION)
        if cache.get_user_opt_in(ticket["user_id"]):
            ai.summarize_ticket(ticket_id)
        client.chat_postMessage(channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"], text="", blocks=blocks.claim_ticket_prompt(ticket_id))
        return
    show_unauthorized_close(client, payload, "closing")


def handle_submit_feedback(payload: dict) -> None:
    ticket_id = json.loads(payload["actions"][0]["value"])
    ticket = cache.get_ticket_by_id(ticket_id)
    user_id = payload["user"]["id"]
    if ticket["user_id"] != user_id or cache.get_feedback(ticket_id):
        show_unauthorized_close(client, payload, "feedback")
    else:
        show_feedback_modal(client, payload, ticket_id)


def handle_claim_ticket(payload: dict) -> None:
    ticket_id = json.loads(payload["actions"][0]["value"])
    ticket = cache.get_ticket_by_id(ticket_id)
    user_id = payload["user"]["id"]
    if cache.is_ticket_claimed(ticket_id):
        client.chat_postEphemeral(channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"], user=user_id, text=ALREADY_CLAIMED.replace("(user_id)", ticket["closed_by"]))
    else:
        cache.claim_ticket(ticket_id, user_id)
        client.chat_postMessage(channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"], text=TICKET_CLAIMED.replace("(user_id)", user_id))


def handle_modify_votes(payload: dict) -> None:
    user_id = payload["user"]["id"]
    action_value = json.loads(payload["actions"][0]["value"])
    meta_message_ts = action_value["meta_ts"]
    delta = action_value["direction"]
    result = cache.add_vote(meta_message_ts, user_id, delta)
    if result is False or result is None:
        return
    upvotes, downvotes = result
    meta = cache.get_meta_by_meta_ts(meta_message_ts)
    client.chat_update(
        channel=META_CHANNEL, ts=meta["votes_message_ts"],
        blocks=blocks.meta_votes_message(upvotes, downvotes, meta_message_ts),
        text="Vote on this meta",
    )


def handle_delete_meta(payload: dict) -> None:
    if payload["user"]["id"] not in ADMINS:
        return
    meta_message_ts = payload["actions"][0]["value"]
    meta = cache.get_meta_by_meta_ts(meta_message_ts)
    if meta:
        client.chat_delete(channel=META_CHANNEL, ts=meta["votes_message_ts"])
    client.chat_delete(channel=META_CHANNEL, ts=meta_message_ts)


def handle_open_create_meta(payload: dict) -> None:
    if not is_shipwright(payload["user"]["id"]):
        return
    client.views_open(trigger_id=payload["trigger_id"], view=views.create_meta_form())


def handle_edited_message(payload: dict) -> None:
    view = payload["view"]
    message_ts = view["private_metadata"]
    user_input = view["state"]["values"]["input_block"]["user_input"]["value"]
    cache.ignorable.append(message_ts)
    client.chat_update(channel=USER_CHANNEL, ts=message_ts, text=user_input)
    worker.enqueue(db.edit_message, message_ts, user_input)


def handle_reopen_ticket(payload: dict) -> None:
    ticket_id = json.loads(payload["actions"][0]["value"])
    ticket = cache.get_ticket_by_id(ticket_id)
    if not ticket:
        return
    user_id = payload["user"]["id"]
    if user_id != ticket["user_id"] or ticket.get("status") != "closed":
        return
    cache.open_ticket(ticket_id)
    resolve_ts = db.get_resolve_message_ts(ticket_id)
    if resolve_ts and not cache.get_feedback(ticket_id):
        try:
            client.chat_delete(channel=USER_CHANNEL, ts=resolve_ts)
        except SlackApiError:
            pass
    client.chat_postMessage(
        channel=USER_CHANNEL,
        thread_ts=ticket["user_thread_ts"],
        text="Your ticket has been reopened! Shipwrights will receive your replies again.",
    )
    client.chat_postMessage(
        channel=STAFF_CHANNEL,
        thread_ts=ticket["staff_thread_ts"],
        text=f"<@{user_id}> has reopened this ticket.",
    )
    relay.swap_reactions(client, ticket, OPEN_TICKET_REACTION, "checks-passed-octicon")


def handle_rating_form(payload: dict) -> None:
    view = payload["view"]
    ticket_id = int(view["private_metadata"])
    rating = view["state"]["values"]["rating_block"]["number_input-action"]["value"]
    comment = view["state"]["values"]["comment_block"]["plain_text_input-action"]["value"]
    cache.save_feedback(ticket_id, rating, comment)
    ticket = cache.get_ticket_by_id(ticket_id)
    if ticket:
        closer = ticket.get("closed_by")
        ping = f" <@{closer}>" if closer and closer != ticket["user_id"] else ""
        text = f"*Feedback received!*{ping}\n*Rating:* {rating}/10"
        if comment:
            text += f"\n*Comment:* _{comment}_"
        client.chat_postMessage(channel=STAFF_CHANNEL, thread_ts=ticket["staff_thread_ts"], text=text)


def handle_create_meta(payload: dict) -> None:
    if not is_shipwright(payload["user"]["id"]):
        return
    view = payload["view"]
    user_id = payload["user"]["id"]
    text = view["state"]["values"]["meta_text_block"]["meta_text_input"]["value"]
    meta_resp = client.chat_postMessage(
        channel=META_CHANNEL, blocks=blocks.meta_message_blocks(text, user_id),
        text="Shipwright Meta", username="Shipwright Meta",
    )
    meta_ts = meta_resp["ts"]
    vote_resp = client.chat_postMessage(
        channel=META_CHANNEL, blocks=blocks.meta_votes_message(0, 0, meta_ts),
        text="Vote on this meta", username="Shipwright Meta", thread_ts=meta_ts,
    )
    cache.save_meta(text, meta_ts, vote_resp["ts"])
    worker.task_runner.enqueue_meta_sticky_update()


def handle_meta_command(data: dict) -> None:
    user_id = data.get("user_id", "")
    if not is_shipwright(user_id):
        respond(data.get("response_url", ""), "You are not a shipwright!")
        return
    text = data.get("text", "")
    meta_resp = client.chat_postMessage(
        channel=META_CHANNEL, blocks=blocks.meta_message_blocks(text, user_id),
        text="Shipwright Meta", username="Shipwright Meta",
    )
    meta_ts = meta_resp["ts"]
    vote_resp = client.chat_postMessage(
        channel=META_CHANNEL, blocks=blocks.meta_votes_message(0, 0, meta_ts),
        text="Vote on this meta", username="Shipwright Meta", thread_ts=meta_ts,
    )
    cache.save_meta(text, meta_ts, vote_resp["ts"])


def handle_view_error(payload: dict) -> None:
    error_id = payload["actions"][0]["value"]
    full = errors.error_store.get(error_id, "Error details not found (may have been cleared on restart).")
    client.views_open(trigger_id=payload["trigger_id"], view=blocks.error_modal(full))
