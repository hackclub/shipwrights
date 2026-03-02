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
BOT_URL = os.getenv('BOT_URL', f'http://127.0.0.1:{PORT}')

MACROS = {
    "fraud": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward any related questions to <@U091HC53CE8>.",
    "fthelp": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward related questions to <#C09MATKQM8C>.",
    "faq": "Hey there!\nPlease have a look at our FAQ <https://us.review.hackclub.com/faq | here>",
    "queue": "Hey there!\nWe currently have a backlog of projects waiting to be certified. Please be patient.\n\n*You can keep track of the queue <https://us.review.hackclub.com/queue | here>!*",
    "declare": "Hey there! We have noticed patterns of AI usage in your project. Please declare AI usage on your project. If you think this is a mistake please let us know!"
}