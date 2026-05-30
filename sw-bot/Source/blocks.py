import json
import re

from globals import ANNOUNCE_META, FEEDBACK_MESSAGE, USER_CLOSED_MESSAGE


def raffle_winners(month_name: str, winners: list) -> list:
    lines = []
    for w in winners:
        comment = w.get("comment", "")
        snippet = f' — _"{comment[:60]}{"…" if len(comment) > 60 else ""}"_' if comment else ""
        lines.append(f"• <@{w['user_id']}> rated *{w['rating']}/10*{snippet}")
    body = "\n".join(lines) if lines else "No winners this month."
    return [
        {"type": "header", "text": {"type": "plain_text", "text": f":cookie: Feedback Raffle — {month_name}", "emoji": True}},
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*{len(winners)} winner{'s' if len(winners) != 1 else ''} selected from last month's feedback.*\n"
                    f"Each receives *10 cookies* — handle payouts manually.\n\n{body}"
                ),
            },
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": "Randomly selected · one entry per user · internal only"}],
        },
    ]


def meta_create_button():
    return [
        {"type": "header", "text": {"type": "plain_text", "text": "Shipwrights Meta", "emoji": True}},
        {"type": "section", "text": {"type": "mrkdwn", "text": "Keep us up at night!"}},
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Meta us.", "emoji": True},
                    "style": "primary",
                    "action_id": "open_create_meta",
                }
            ],
        },
    ]


def ticket_staff_header(text, user_id, user_thread_link):
    return [
        {"type": "section", "text": {"type": "mrkdwn", "text": text}},
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"<@{user_id}> `{user_id}` | <{user_thread_link}|thread>"}],
        },
    ]


def ticket_staff_controls(ticket_id, user_id):
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": "New ticket!"},
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "Resolve Ticket"},
                "style": "primary",
                "value": str(ticket_id),
                "action_id": "resolve_ticket",
            },
        },
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"#sw-{ticket_id}"}],
        },
    ]


def ticket_user_ack(ticket_id, staff_link):
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": "Hey there! We have received your question, and someone from Shipwrights Team will get back to you shortly!"},
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "Resolve Ticket"},
                "style": "primary",
                "value": str(ticket_id),
                "action_id": "resolve_ticket",
            },
        },
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"ticket sw-{ticket_id} • <{staff_link}|staff link>"}],
        },
        {
            "type": "context",
            "elements": [{"type": "plain_text", "text": "AI is used to enhance your ticket experience. Please don't share any personal identifying information to ensure your privacy.", "emoji": True}],
        },
    ]


def ai_opt_notice(user_opt_in, thread_ts):
    return [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    "*Hey There!*\nIt looks like you're currently *opted into* _Ticket AI_.\nWe use AI to improve your ticket experience and to give faster responses.\n_This is *optional* but may result in *longer* wait times if you decide to opt out._"
                    if user_opt_in
                    else "*Hey There!*\nIt looks like you're currently *opted out* of _Ticket AI_.\nWe use AI to improve your ticket experience and to give *faster* responses.\n_This is *optional* but may result in shorter wait times if you decide to opt in._"
                ),
            },
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "Opt Out" if user_opt_in else "Opt In"},
                "style": "primary",
                "value": json.dumps({"opt": "0" if user_opt_in else "1", "thread_ts": str(thread_ts)}),
                "action_id": "modify_opt",
            },
        }
    ]


# def project_found(project):  # ship_certs
#     return [
#         {"type": "header", "text": {"type": "plain_text", "text": "Project Found!", "emoji": True}},
#         {"type": "divider"},
#         {
#             "type": "section",
#             "text": {
#                 "type": "mrkdwn",
#                 "text": (
#                     f"*User:* <@{project['ft_slack_id']}>\n\n"
#                     f"*Project:* <https://review.hackclub.com/admin/ship_certifications/{project['id']}/edit|{project['project_name']}>\n\n"
#                     f"*Status:* {project['status']}"
#                 ),
#             },
#         },
#         {"type": "divider"},
#         {
#             "type": "context",
#             "elements": [{"type": "mrkdwn", "text": f"*Project Type:* {project['project_type']}"}],
#         },
#     ]


def sent_message_controls(dest_ts):
    return [
        {"type": "section", "text": {"type": "mrkdwn", "text": "Message sent."}},
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Delete message"},
                    "style": "danger",
                    "value": json.dumps({"ts": dest_ts}),
                    "action_id": "delete_message",
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Edit message"},
                    "value": json.dumps({"ts": dest_ts}),
                    "action_id": "edit_message",
                },
            ],
        },
    ]


def sent_files_controls(uploaded_ts_list):
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": "Attachments sent."},
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "Delete Attachments"},
                "style": "danger",
                "value": json.dumps({"ts": uploaded_ts_list}),
                "action_id": "delete_message",
            },
        }
    ]


def claim_ticket_prompt(ticket_id):
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": USER_CLOSED_MESSAGE},
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "Claim Ticket"},
                "style": "primary",
                "value": str(ticket_id),
                "action_id": "claim_ticket",
            },
        }
    ]


def feedback_message(ticket_id):
    return [
        {"type": "section", "text": {"type": "mrkdwn", "text": "*Hey there, fellow chef!* :wave-pikachu-2:\n"}},
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": FEEDBACK_MESSAGE},
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "Submit Feedback"},
                "style": "primary",
                "value": str(ticket_id),
                "action_id": "submit_feedback",
            },
        },
    ]


def meta_votes_message(upvotes, downvotes, meta_ts):
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"upvotes : *{upvotes}* :upvote:\ndownvotes : *{downvotes}* :downvote:"},
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "Delete Post", "emoji": True},
                "value": meta_ts,
                "action_id": "delete_meta",
            },
        },
        {"type": "divider"},
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Upvote Message", "emoji": True},
                    "value": json.dumps({"direction": 1, "meta_ts": meta_ts}),
                    "action_id": "modify_votes",
                    "style": "primary",
                }
            ],
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Downvote Message", "emoji": True},
                    "value": json.dumps({"direction": -1, "meta_ts": meta_ts}),
                    "action_id": "modify_votes",
                    "style": "danger",
                }
            ],
        },
    ]


def meta_message_blocks(text, user_id):
    cleaned = re.sub(
        r'<@[A-Z0-9]+(?:\|([^>]+))?>|<!(?:here|channel|subteam\^[A-Z0-9]+)(?:\|[^>]*)?>',
        lambda m: m.group(1) if m.group(1) else "",
        text,
    )
    cleaned = re.sub(r'@[a-zA-Z][a-zA-Z0-9._-]*', "", cleaned)
    cleaned = re.sub(r'\*\*|__', "", cleaned)
    indented = "\n".join(f">{line}" for line in cleaned.split("\n"))
    result = [
        {"type": "header", "text": {"type": "plain_text", "text": "Meta Post", "emoji": True}},
        {"type": "section", "text": {"type": "mrkdwn", "text": indented}},
        {"type": "divider"},
    ]
    has_mention = bool(
        re.search(r'<@[A-Z0-9]+', text) or re.search(r'@[a-zA-Z][a-zA-Z0-9._-]*', text)
    )
    if has_mention and ANNOUNCE_META:
        result.append({"type": "context", "elements": [{"type": "mrkdwn", "text": f"sent by <@{user_id}> - <!subteam^S0AFZAHP955>"}]})
    elif ANNOUNCE_META:
        result.append({"type": "context", "elements": [{"type": "mrkdwn", "text": "<!subteam^S0AFZAHP955>"}]})
    elif has_mention:
        result.append({"type": "context", "elements": [{"type": "mrkdwn", "text": f"sent by <@{user_id}>"}]})
    return result


def aide_message():
    return [
        {"type": "header", "text": {"type": "plain_text", "text": "Project Shipping Help", "emoji": True}},
        {"type": "section", "text": {"type": "mrkdwn", "text": "Unsure how to get your project shipped? Get personalized help now!"}},
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Create Help Ticket!", "emoji": True},
                    "action_id": "create_aide",
                    "style": "primary",
                }
            ],
        },
    ]


def ai_summary(summary_data):
    return [
        {"type": "header", "text": {"type": "plain_text", "text": "AI Ticket summary :rac_woah:", "emoji": True}},
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"_Status: {summary_data.get('status', 'Unknown')}_ :rac_info:\n\n"
                    f"*summary*: {summary_data.get('summary', 'AI decided you dont deserve a summary :rac_ded:')}\n"
                    f"*Recommended Action*: {summary_data.get('suggested_action') or 'idk bro'}"
                ),
            },
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [{"type": "plain_text", "text": "This summary is made by AI so please validate any information given.", "emoji": True}],
        },
    ]


def ai_paraphrase_suggestion(paraphrased, ticket_id):
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*AI Suggestion:*\n{paraphrased}"},
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "Send AI Completion"},
                "style": "primary",
                "value": json.dumps({"paraphrased": paraphrased, "ticket_id": ticket_id}),
                "action_id": "send_paraphrased",
            },
        },
        {
            "type": "context",
            "elements": [{"type": "plain_text", "text": "Please remember to review this before sending.", "emoji": True}],
        },
    ]


def ai_detection(macro_text, ticket_id):
    return [
        {"type": "header", "text": {"type": "plain_text", "text": "AI Ticket Type Detection", "emoji": True}},
        {"type": "divider"},
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": "*This ticket was detected as not related to the shipwrights*\n*Recommended reply:*"},
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": macro_text},
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "Reply and Resolve"},
                "style": "primary",
                "value": json.dumps({"reply": macro_text, "ticket_id": ticket_id}),
                "action_id": "resolve_detected",
            },
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [{"type": "plain_text", "text": "This detection was generated via AI. Please read through the ticket before resolving.", "emoji": True}],
        },
    ]


def format_date(dt, fallback="Unknown"):
    if not dt:
        return fallback
    try:
        return dt.strftime("%b %-d")
    except (ValueError, AttributeError):
        return dt.strftime("%b %d").replace(" 0", " ")


def daily_ticket_alert(stats, staff_channel):
    leaderboard_lines = [
        f"{i}. <@{u['slack_id']}> - {u['count']} closed tickets"
        for i, u in enumerate(stats["leaderboard"], 1)
    ]
    leaderboard_text = "\n".join(leaderboard_lines) if leaderboard_lines else "no one closed any tickets today :("

    display = stats["old_tickets"][:7]
    ticket_lines = []
    for i, t in enumerate(display, 1):
        created_str = format_date(t.get("created_at"))
        last_reply_str = format_date(t.get("last_reply"), fallback=created_str)
        question = t.get("question", "")
        preview = question.replace("\n", " ")
        preview = preview[:50] + "..." if len(preview) > 50 else preview
        thread_ts = t.get("staff_thread_ts", "")
        ts_str = thread_ts.replace(".", "") if thread_ts else ""
        url = f"https://hackclub.slack.com/archives/{staff_channel}/p{ts_str}" if ts_str else "No link available"
        ticket_lines.append(f"{i}. <{url}|{preview}> (created {created_str}, last reply {last_reply_str})")

    remaining = len(stats["old_tickets"]) - len(display)
    if remaining > 0:
        ticket_lines.append(f"_(plus {remaining} more)_")

    tickets_text = "\n".join(ticket_lines) if ticket_lines else "no old tickets right now, nice!"

    return [
        {"type": "header", "text": {"type": "plain_text", "text": "Tickets check-in time!! here's how things are looking :yay:", "emoji": True}},
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"In the last 24 hours {stats['opened_24h']} tickets were opened and you managed to close "
                    f"{stats['closed_24h']} of them! there are currently {stats['total_open']} open tickets in the queue "
                    f"{'great job team!!' if stats['closed_24h'] >= stats['opened_24h'] else 'lets try to get that number down :)'}"
                ),
            },
        },
        {"type": "divider"},
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*today's top closers* :star:\n{leaderboard_text}"}},
        {"type": "divider"},
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*tickets that could use some attention* :eyes:\nthese have been open for a while and might need a response\n\n{tickets_text}"},
        },
        {"type": "divider"},
        {"type": "context", "elements": [{"type": "mrkdwn", "text": ":ship: <!subteam^S09TJU4TT36>"}]},
    ]


# def daily_summary_message(reviews, shipped, top_reviewer):  # ship_certs
#     day_before = reviews["day_before"] or 1
#     relative = ((reviews["yesterday"] - reviews["day_before"]) / day_before) * 100
#     diff = reviews["yesterday"] - shipped
#
#     def ref(idx):
#         ids = top_reviewer.get("slack_ids", [])
#         counts = top_reviewer.get("counts", [])
#         return (ids[idx], counts[idx]) if idx < len(ids) else ("nobody", 0)
#
#     first_id, first_count = ref(0)
#     second_id, second_count = ref(1)
#     third_id, third_count = ref(2)
#
#     return [
#         {"type": "header", "text": {"type": "plain_text", "text": "Guess what time it is! That's right daily summary time!! :yay:", "emoji": True}},
#         {"type": "divider"},
#         {
#             "type": "section",
#             "text": {
#                 "type": "mrkdwn",
#                 "text": (
#                     f"Today a total of {reviews['yesterday']} reviews have been done that's {abs(relative):.0f}% "
#                     f"{'more' if relative >= 1 else 'less'} than yesterday! "
#                     f"{'Great job team!!' if relative >= 1 else ':(('}  a total of {shipped} new ships have been sent "
#                     f"that's {abs(diff)} {'less' if diff >= 0 else 'more'} than number of projects we reviewed "
#                     f"{'::)' if diff >= 0 else ':('} today's biggest contributor is <@{first_id}> with a total of {first_count} reviews "
#                     f"and second place <@{second_id}> with {second_count} and last but not least.. "
#                     f"<@{third_id}> in third place with {third_count} :cat-heart:\n"
#                     f"_ps remember to do your daily reviews if you haven't already :c3:_"
#                 ),
#             },
#         },
#         {"type": "divider"},
#         {"type": "context", "elements": [{"type": "mrkdwn", "text": ":ship: <!subteam^S09TJU4TT36>"}]},
#     ]


def error_dm(level: str, name: str, short: str, error_id: str) -> list:
    text = f":warning: *{level}* in `{name}`\n" + short
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": text},
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "View Error"},
                    "action_id": "view_error",
                    "value": error_id,
                }
            ],
        },
    ]


def error_modal(full: str) -> dict:
    return {
        "type": "modal",
        "title": {"type": "plain_text", "text": "Error Details"},
        "close": {"type": "plain_text", "text": "Close"},
        "blocks": [
            {"type": "section", "text": {"type": "mrkdwn", "text": f"```{full[:2900]}```"}},
        ],
    }
