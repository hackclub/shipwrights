import logging, time
from datetime import datetime
import schedule
from slack_sdk.errors import SlackApiError
import blocks, db
from globals import REMINDERS_CHANNEL, client

scheduler = schedule.Scheduler()

RAFFLE_PRIZE = 10.0
RAFFLE_COUNT = 3


def run_raffle():
    now = datetime.now()
    year = now.year - 1 if now.month == 1 else now.year
    month = 12 if now.month == 1 else now.month - 1

    winners = db.get_monthly_feedback_winners(year, month, RAFFLE_COUNT)
    if not winners:
        logging.info(f"raffle: no eligible feedback for {year}-{month:02d}, skipping")
        return

    month_name = datetime(year, month, 1).strftime("%B %Y")

    for winner in winners:
        db.add_stardust(winner["user_id"], amount=RAFFLE_PRIZE)

    try:
        client.chat_postMessage(
            channel=REMINDERS_CHANNEL,
            text=f"Feedback raffle winners — {month_name}",
            blocks=blocks.raffle_winners(month_name, winners),
        )
    except SlackApiError as e:
        logging.error(f"raffle: failed to post winners: {e}")

    logging.info(f"raffle: {len(winners)} winner(s) awarded {RAFFLE_PRIZE} stardust each for {month_name}")


def maybe_run_raffle():
    if datetime.now().day == 1:
        run_raffle()


def raffle_loop():
    scheduler.every().day.at("09:00").do(maybe_run_raffle)
    while True:
        scheduler.run_pending()
        time.sleep(60)
