import os
from slack_sdk import WebClient
from dotenv import load_dotenv

load_dotenv()

client = WebClient(token=os.getenv('SLACK_BOT_TOKEN'))
REMINDERS_CHANNEL = os.getenv("REMINDER_CHANNEL_ID", "C09TTRZH94Z")
DASH_URL = os.getenv("DASHBOARD_URL", "http://localhost:3000")
API_KEY = os.getenv("API_KEY")
USER_CHANNEL = os.getenv("USER_CHANNEL_ID")
STAFF_CHANNEL = os.getenv("STAFF_CHANNEL_ID")
BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SWAI_KEY = os.getenv("SW_AI")
PORT = int(os.getenv('PORT', '45100'))

MACROS = {
    "fraud": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward any related questions to <@U091HC53CE8>.",
    "fthelp": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward related questions to <#C09MATKQM8C>.",
    "faq": "Hey there!\nPlease have a look at our FAQ <https://us.review.hackclub.com/faq | here>",
    "queue": "Hey there!\nwe currently have a backlog of projects waiting to be certified. Please be patient.\n\n*You can keep track of the queue <https://us.review.hackclub.com/queue | here>!*",
}