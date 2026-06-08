import logging, time
import pytz
import schedule
import blocks, db
from cache import cache
from globals import REMINDERS_CHANNEL, STAFF_CHANNEL, client

scheduler = schedule.Scheduler()



def check_unresolved_tickets():
    stats = db.get_daily_ticket_stats()
    if stats:
        try:
            client.chat_postMessage(
                channel=REMINDERS_CHANNEL,
                text="Daily ticket check-in",
                blocks=blocks.daily_ticket_alert(stats, STAFF_CHANNEL),
                unfurl_links=False,
                unfurl_media=False,
            )
        except Exception as e:
            logging.error(f"check_unresolved_tickets failed: {e}")


def bump_stale_tickets():
    try:
        tickets = cache.get_tickets_due_for_bump()
        for ticket in tickets:
            try:
                created_at = ticket["created_at"]
                if not created_at or not ticket.get("staff_thread_ts"):
                    continue

                if created_at.tzinfo is None:
                    created_at = pytz.utc.localize(created_at)

                client.chat_postMessage(
                    channel=STAFF_CHANNEL,
                    thread_ts=ticket["staff_thread_ts"],
                    text="Bump, this ticket hasn't been resolved yet and it's been over 24 hours.",
                    reply_broadcast=True,
                )
                db.mark_ticket_bumped(ticket["id"])
                cache.invalidate_bump_cache()
                time.sleep(1)  # slack rate limiting
            except Exception as e:
                logging.error(f"Bump failed for ticket {ticket.get('id')}: {e}")
    except Exception as e:
        logging.error(f"bump_stale_tickets failed: {e}")


def alerts_loop():
    scheduler.every().day.at("11:00", "UTC").do(check_unresolved_tickets)
    scheduler.every().hour.do(bump_stale_tickets)
    while True:
        scheduler.run_pending()
        time.sleep(30)
