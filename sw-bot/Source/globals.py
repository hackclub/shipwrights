import os
import sys
from slack_sdk import WebClient
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SIGNING_SECRET = os.getenv("SLACK_SIGNING_SECRET")

client = WebClient(token=BOT_TOKEN)
REMINDERS_CHANNEL = os.getenv("REMINDER_CHANNEL_ID", "C09TTRZH94Z")
APP_ID = os.getenv("APP_ID")
ANNOUNCE_META = os.getenv("ANNOUNCE_META", "false").lower() == "true"
META_CHANNEL = os.getenv("META_CHANNEL_ID")
USER_CHANNEL = os.getenv("USER_CHANNEL_ID")
OPEN_TICKETS_CHANNEL = os.getenv("OPEN_TICKETS_CHANNEL_ID", "").strip() or None
ADMINS = os.getenv("ADMINS", "").split(",")
STAFF_CHANNEL = os.getenv("STAFF_CHANNEL_ID")
SWAI_KEY = os.getenv("SW_AI")
DB_NAME = os.getenv("DB_NAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_USER = os.getenv("DB_USER")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_HOST = os.getenv("DB_HOST", "localhost")
ENVIRONMENT = os.getenv("ENVIRONMENT", "PRODUCTION")
OPEN_TICKET_REACTION = os.getenv("OPEN_TICKET_REACTION", "frog-diabolical")
ERROR_DM_USER = os.getenv("ERROR_DM_USER", "")
TASK_JOURNAL_PATH = os.getenv("TASK_JOURNAL_PATH", "task_journal.jsonl")
CACHE_SNAPSHOT_PATH = os.getenv("CACHE_SNAPSHOT_PATH", "cache_snapshot.json")
PORT = int(os.getenv("PORT", "3000"))

MACROS = {
    "fraud": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward any related questions to <@U091HC53CE8>.",
    "sdhelp": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward related questions to <#C0AP0NMSP3P>.",
    "faq": "Hey there!\nPlease have a look at our FAQ <https://us.review.hackclub.com/faq | here>",
    "queue": "Hey there!\nWe currently have a backlog of projects waiting to be certified. Please be patient.\n\n*You can keep track of the queue <https://us.review.hackclub.com/queue | here>!*",
    "declare": "Hey there! We have noticed patterns of AI usage in your project. Please declare AI usage on your project. If you think this is a mistake please let us know!",
}

RESOLVE_MESSAGES = {
    "user": "Hey! Would you look at that, This ticket was marked as resolved! Shipwrights will no longer receive your messages. If you still have a question, please feel free to open a new ticket.",
    "staff": "Hey! Would you look at that, This ticket was marked as resolved by <@(user_id)>!",
}

USER_CLOSED_MESSAGE = "Hey! So it looks the user closed this ticket. Please claim this ticket if you handled the ticket."
ALREADY_CLAIMED = "*This ticket is already claimed by <@(user_id)>!*"
TICKET_CLAIMED = "*This ticket has been claimed by <@(user_id)>!*"
CANNOT_CLOSE_OWN = "You cannot close your own ticket as a shipwright."
FEEDBACK_MESSAGE = "If you could give us 20 seconds of your time, we would love to know how we did in this ticket!\n3 random fillers get picked each month to earn 10 stardust each!"

TICKET_PAY = 0.3


def _validate_env():
    required = {
        "SLACK_BOT_TOKEN": BOT_TOKEN,
        "SLACK_SIGNING_SECRET": SIGNING_SECRET,
        "APP_ID": APP_ID,
        "USER_CHANNEL_ID": USER_CHANNEL,
        "STAFF_CHANNEL_ID": STAFF_CHANNEL,
        "META_CHANNEL_ID": META_CHANNEL,
        "DB_NAME": DB_NAME,
        "DB_USER": DB_USER,
        "DB_PASSWORD": DB_PASSWORD,
    }
    missing = [key for key, val in required.items() if not val]
    if missing:
        print(
            "Missing required environment variables:\n" + "\n".join(f"  - {k}" for k in missing),
            file=sys.stderr,
        )
        sys.exit(1)


_validate_env()
