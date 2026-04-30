import os
from slack_sdk import WebClient
from dotenv import load_dotenv

load_dotenv()

client = WebClient(token=os.getenv('SLACK_BOT_TOKEN'))
REMINDERS_CHANNEL = os.getenv("REMINDER_CHANNEL_ID", "C09TTRZH94Z")
AIDE_CHANNEL = os.getenv("AIDE_CHANNEL_ID")
APP_ID = os.getenv("APP_ID")
ANNOUNCE_META = os.getenv("ANNOUNCE_META", False)
META_CHANNEL = os.getenv("META_CHANNEL_ID")
DASH_URL = os.getenv("DASHBOARD_URL", "http://localhost:3000")
API_KEY = os.getenv("API_KEY")
USER_CHANNEL = os.getenv("USER_CHANNEL_ID")
ADMINS = os.getenv("ADMINS").split(',')
STAFF_CHANNEL = os.getenv("STAFF_CHANNEL_ID")
BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SWAI_KEY = os.getenv("SW_AI")
PORT = int(os.getenv('PORT', '45100'))
BOT_URL = os.getenv('BOT_URL', f'http://127.0.0.1:{PORT}')
DB_NAME = os.getenv("DB_NAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_USER = os.getenv("DB_USER")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_HOST = os.getenv("DB_HOST")
ENVIRONMENT = os.getenv("ENVIRONMENT", "PRODUCTION")
OPEN_TICKET_REACTION = os.getenv("OPEN_TICKET_REACTION", "frog-diabolical")

MACROS = {
    "fraud": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward any related questions to <@U091HC53CE8>.",
    "fthelp": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward related questions to <#C09MATKQM8C>.",
    "faq": "Hey there!\nPlease have a look at our FAQ <https://us.review.hackclub.com/faq | here>",
    "queue": "Hey there!\nWe currently have a backlog of projects waiting to be certified. Please be patient.\n\n*You can keep track of the queue <https://us.review.hackclub.com/queue | here>!*",
    "declare": "Hey there! We have noticed patterns of AI usage in your project. Please declare AI usage on your project. If you think this is a mistake please let us know!"
}

RESOLVE_MESSAGES = {
    "user": "Hey! Would you look at that, This ticket was marked as resolved! Shipwrights will no longer receive your messages. If you still have a question, please feel free to open a new ticket.",
    "staff": "Hey! Would you look at that, This ticket was marked as resolved by <@(user_id)>!",
}

USER_CLOSED_MESSAGE = "Hey! So it looks the user closed this ticket. Please claim this ticket if you handled the ticket."
ALREADY_CLAIMED = "*This ticket is already claimed by <@(user_id)>!*"
TICKET_CLAIMED = "*This ticket has been claimed by <@(user_id)>!*"
CANNOT_CLOSE_OWN = "You cannot close your own ticket as a shipwright."
MESSAGE_NOT_RECEIVED = "Hey! Looks like this ticket was resolved. Shipwrights did not receive your response."
FEEDBACK_MESSAGE = "If you could give us 20 seconds of your time, we would love to know how we did in this ticket!\n3 random fillers get picked each month to earn 10 cookies each!"

TICKET_PAY = 0.3