import schedule
import time
import db
from globals import client, STAFF_CHANNEL, REMINDERS_CHANNEL

def _format_date(dt, fallback="Unknown"):
    if not dt:
        return fallback
    try:
        return dt.strftime("%b %-d")
    except Exception:
        return dt.strftime("%b %d").replace(" 0", " ")

def _ticket_blocks(stats):

    leaderboard_lines = []

    for i, user in enumerate(stats["leaderboard"], 1):
        leaderboard_lines.append(f"{i}. <@{user['slackId']}> - {user['count']} closed tickets")
    leaderboard_text = "\n".join(leaderboard_lines) if leaderboard_lines else "no one closed any tickets today :("

    display_tickets = stats["old_tickets"][:7]
    ticket_lines = []

    for i, t in enumerate(display_tickets, 1):
        created_str = _format_date(t.get("createdAt"))
        last_reply_str = _format_date(t.get("last_reply"), fallback=created_str)

        question = t.get("question", "")
        preview = question.replace('\n', ' ')
        preview = preview[:50] + "..." if len(preview) > 50 else preview

        thread_ts = t.get("staffThreadTs", "")
        ts_str = thread_ts.replace(".", "") if thread_ts else ""
        ticket_url = f"https://hackclub.slack.com/archives/{STAFF_CHANNEL}/p{ts_str}" if ts_str else "No link available"
        ticket_lines.append(f"{i}. <{ticket_url}|{preview}> (created {created_str}, last reply {last_reply_str})")

    remaining = len(stats["old_tickets"]) - len(display_tickets)

    if remaining > 0:
        ticket_lines.append(f"_(plus {remaining} more)_")

    tickets_text = "\n".join(ticket_lines) if ticket_lines else "no old tickets right now, nice!"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "Tickets check-in time!! here's how things are looking :yay:",
                "emoji": True
            }
        },
        {
            "type": "divider"
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"In the last 24 hours {stats['opened_24h']} tickets were opened and you managed to close {stats['closed_24h']} of them! there are currently {stats['total_open']} open tickets in the queue {'great job team!!' if stats['closed_24h'] >= stats['opened_24h'] else 'lets try to get that number down :)'}"
            }
        },
        {
            "type": "divider"
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*today's top closers* :star:\n{leaderboard_text}"
            }
        },
        {
            "type": "divider"
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*tickets that could use some attention* :eyes:\nthese have been open for a while and might need a response\n\n{tickets_text}"
            }
        },
        {
            "type": "divider"
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "image",
                    "image_url": "https://a.slack-edge.com/production-standard-emoji-assets/14.0/google-large/1f6a2@2x.png",
                    "alt_text": "shipwrights"
                },
                {
                    "type": "mrkdwn",
                    "text": "<!subteam^S09TJU4TT36>"
                }
            ]
        }
    ]
    return blocks

def check_unresolved_tickets():
    stats = db.get_daily_ticket_stats()
    if not stats:
        return

    try:
        client.chat_postMessage(
            channel=REMINDERS_CHANNEL,
            text="Daily ticket check-in",
            blocks=_ticket_blocks(stats),
            unfurl_links=False,
            unfurl_media=False
        )
    except Exception as e:
        print(f"couldn't notify for tickets: {e}")

def alerts_loop():
    schedule.every().day.at("11:00", "UTC").do(check_unresolved_tickets)
    while True:
        schedule.run_pending()
        time.sleep(30)
