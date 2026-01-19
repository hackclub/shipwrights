import os
import time
import schedule
import db
from slack_sdk import WebClient
from dotenv import load_dotenv

load_dotenv()

REMINDERS_CHANNEL = os.getenv("REMINDER_CHANNEL_ID", "C09TTRZH94Z")
client = WebClient(token=os.getenv('SLACK_BOT_TOKEN'))

def message_blocks():
	reviews_done = db.recent_reviews()
	relative_performance = ((reviews_done["yesterday"] - reviews_done["day_before"]) / (reviews_done["day_before"] if reviews_done["day_before"] != 0 else 1)) * 100
	projects_shipped = db.shipped_yesterday()
	relative_number_of_reviews = reviews_done["yesterday"]-projects_shipped
	top_reviewer = db.top_reviewer_yesterday()
	return [
		{
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": "Guess what time it is! That's right daily summery time!! :yay:",
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
				"text": f"Today a total of {reviews_done['yesterday']} reviews have been done that's {abs(relative_performance):.0f}% {'more' if relative_performance >= 1 else 'less'} than yesterday! {'Great job team!!' if relative_performance >= 1 else ':(('} a total of {db.shipped_yesterday()} new ships have been sent that's {abs(relative_number_of_reviews)} {'less' if relative_number_of_reviews >= 0 else 'more'} than number of projects we reviewed {':)' if relative_number_of_reviews >= 0 else ':('} today's biggest contributor is <@{top_reviewer['slack_id']}> with a total of {top_reviewer['count']} reviews :cat-heart:\n _ps remember to do your daily reviews if you haven't already :c3:_"
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

def send_reminder():
	client.chat_postMessage(
        channel=REMINDERS_CHANNEL,
        text="Daily summary",
        blocks=message_blocks(),
    )


def reminders_loop():
	schedule.every().day.at("20:00", "America/New_York").do(send_reminder)
	while True:
		schedule.run_pending()
		time.sleep(240)