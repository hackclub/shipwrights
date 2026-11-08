def edit_message(message_ts):
    return {
        "type": "modal",
        "callback_id": "edited_message",
        "private_metadata": message_ts,
        "title": {"type": "plain_text", "text": "Shipwrighter", "emoji": True},
        "submit": {"type": "plain_text", "text": "Edit", "emoji": True},
        "close": {"type": "plain_text", "text": "Cancel", "emoji": True},
        "blocks": [
            {
                "type": "input",
                "block_id": "input_block",
                "element": {"type": "plain_text_input", "action_id": "user_input"},
                "label": {"type": "plain_text", "text": "Edited Message"},
            }
        ],
    }


def show_unauthorized(access):
    return {
        "type": "modal",
        "title": {"type": "plain_text", "text": "Shipwrighter", "emoji": True},
        "blocks": [
            {"type": "divider"},
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*You can't close this ticket* :(" if access == "closing" else "*You can't send feedback on this ticket* :(",
                },
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "plain_text",
                        "text": (
                            "Only shipwrights and the ticket owner can close tickets, Or this ticket is already closed"
                            if access == "closing"
                            else "Only the ticket owner can send feedback or the form has already been filled!"
                        ),
                        "emoji": True,
                    }
                ],
            },
        ],
    }


def show_rating_form(ticket_id):
    return {
        "type": "modal",
        "callback_id": "rating_form",
        "private_metadata": str(ticket_id),
        "title": {"type": "plain_text", "text": "Shipwrighter Feedback", "emoji": True},
        "submit": {"type": "plain_text", "text": "Submit", "emoji": True},
        "close": {"type": "plain_text", "text": "Cancel", "emoji": True},
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "How'd we do :blush-wx:", "emoji": True},
            },
            {"type": "divider"},
            {
                "type": "input",
                "block_id": "rating_block",
                "element": {
                    "type": "number_input",
                    "is_decimal_allowed": False,
                    "min_value": "1",
                    "max_value": "10",
                    "action_id": "number_input-action",
                },
                "label": {
                    "type": "plain_text",
                    "text": "How would you rate your ticket experience? (1-10)",
                    "emoji": True,
                },
                "optional": False,
            },
            {
                "type": "context",
                "elements": [{"type": "plain_text", "text": "(required)", "emoji": True}],
            },
            {
                "type": "input",
                "block_id": "comment_block",
                "element": {"type": "plain_text_input", "action_id": "plain_text_input-action"},
                "label": {"type": "plain_text", "text": "Any comments?", "emoji": True},
                "optional": True,
            },
            {
                "type": "context",
                "elements": [{"type": "plain_text", "text": "(optional)", "emoji": True}],
            },
        ],
    }


def cache_dump(data: dict) -> dict:
    def section(text):
        return {"type": "section", "text": {"type": "mrkdwn", "text": str(text)[:3000]}}

    def header(text):
        return {"type": "header", "text": {"type": "plain_text", "text": str(text)[:150]}}

    divider = {"type": "divider"}
    b = []

    b.append({
        "type": "actions",
        "elements": [
            {
                "type": "button",
                "text": {"type": "plain_text", "text": "🗑️ Clear Cache", "emoji": True},
                "style": "danger",
                "action_id": "clear_cache",
                "confirm": {
                    "title": {"type": "plain_text", "text": "Wipe the cache?"},
                    "text": {"type": "mrkdwn", "text": "This clears all in-memory caches (tickets, users, feedback, metas, shipwrights, freshness). Data is refetched from the DB on demand. Runtime state like paused/sticky is preserved."},
                    "confirm": {"type": "plain_text", "text": "Wipe it all"},
                    "deny": {"type": "plain_text", "text": "Cancel"},
                },
            }
        ],
    })

    b += [header("System"), section(
        f"*Bot:* `{data['bot_user_id'] or 'unknown'}`\n"
        f"*Paused:* `{data['metrics'].get('paused', False)}`\n"
        f"*Sticky TS:* `{data['sticky_message_ts'] or 'none'}`\n"
        f"*Meta Sticky TS:* `{data['meta_sticky_ts'] or 'none'}`"
    ), divider]

    tickets = data["tickets"]
    b.append(header(f"Tickets ({len(tickets)})"))
    if tickets:
        lines = [
            f"`{t['id']}` <@{t['user_id']}> _{t['status']}_ — {(t.get('question') or '')[:40]}"
            for t in tickets.values()
        ]
        b.append(section("\n".join(lines)))
    else:
        b.append(section("_none_"))
    b.append(divider)

    users = data["ticket_users"]
    b.append(header(f"Ticket Users ({len(users)})"))
    if users:
        lines = [f"<@{uid}>: opted {'in' if opted else 'out'}" for uid, opted in users.items()]
        b.append(section("\n".join(lines)))
    else:
        b.append(section("_none_"))
    b.append(divider)

    fb = data["feedback"]
    total_fb = sum(fb.values())
    b.append(header(f"Feedback ({total_fb} entries, {len(fb)} tickets)"))
    if fb:
        lines = [f"Ticket `{tid}`: {count} entr{'y' if count == 1 else 'ies'}" for tid, count in fb.items()]
        b.append(section("\n".join(lines)))
    else:
        b.append(section("_none_"))
    b.append(divider)

    sw = data["shipwrights"]
    b += [header(f"Shipwrights ({len(sw)})"), section(" ".join(f"<@{uid}>" for uid in sw) or "_none_"), divider]

    b += [header(f"Metas ({data['meta_count']}) — redacted"), section("_content redacted_"), divider]

    ages = data["fetch_ages"]
    b.append(header("Cache Freshness"))
    if ages:
        lines = [f"`{k}` — {v}s ago" for k, v in sorted(ages.items(), key=lambda x: x[1])]
        b.append(section("\n".join(lines)))
    else:
        b.append(section("_no cached keys_"))
    b.append(divider)

    b += [header("Misc"), section(
        f"*Ignorable:* {data['ignorable_count']}\n"
        f"*Deleted Headers:* {data['deleted_headers_count']}\n"
        f"*Closed Notified:* {data['closed_notified_count']}"
    )]

    return {
        "type": "modal",
        "title": {"type": "plain_text", "text": "Cache Dump"},
        "close": {"type": "plain_text", "text": "Close"},
        "blocks": b,
    }


def create_meta_form():
    return {
        "type": "modal",
        "callback_id": "create_meta",
        "title": {"type": "plain_text", "text": "New Meta Post", "emoji": True},
        "submit": {"type": "plain_text", "text": "Post"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "meta_text_block",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "meta_text_input",
                    "multiline": True,
                    "placeholder": {"type": "plain_text", "text": "What's on your mind?"},
                },
                "label": {"type": "plain_text", "text": "Meta Post"},
            }
        ],
    }
