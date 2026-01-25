import requests, os, json
import db
from slack_sdk import WebClient
from dotenv import load_dotenv
load_dotenv()

SWAI_KEY = os.getenv("SW_AI")
client = WebClient(token=os.getenv('SLACK_BOT_TOKEN'))

MACROS = {
    "fraud": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward any related questions to <@U091HC53CE8>.",
    "fthelp": "Hey there!\nThe shipwrights team cannot help you with this query. Please forward related questions to <#C09MATKQM8C>.",
    "faq": "Hey there!\nPlease have a look at our FAQ <https://us.review.hackclub.com/faq | here>",
    "queue": "Hey there!\nwe currently have a backlog of projects waiting to be certified. Please be patient.\n\n*You can keep track of the queue <https://us.review.hackclub.com/queue | here>!*",
}

def get_ticket_summery(ticket_id):
    return json.loads(requests.get(
    url="https://ai.review.hackclub.com/tickets/summery",
    headers={"X-API-Key": SWAI_KEY},
    json={"ticket_id": str(ticket_id)}
).text)

def summarize_ticket(ticket_id):
    summary = get_ticket_summery(ticket_id)
    ticket = db.get_ticket(ticket_id)
    client.chat_postMessage(
        channel=os.getenv('STAFF_CHANNEL_ID'),
        thread_ts=ticket['staffThreadTs'],
        text='',
        blocks=[
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "AI Ticket Summery :rac_woah:",
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
                    "text": f"_Status: {summary.get('status', 'Unknown')}_ :rac_info:\n\n*Summery*: {summary.get('summary', 'AI decided you dont deserve a summary :rac_ded:')}\n*Recommended Action*: {summary.get('suggested_action') if summary.get('suggested_action').strip() else 'idk bro'}"
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "plain_text",
                        "text": "This summery is made by AI so please validate any information given.",
                        "emoji": True
                    }
                ]
            }
        ]
    )

def get_message_completion(ticket_id, message):
    return json.loads(requests.get(
        url="https://ai.review.hackclub.com/tickets/complete",
        headers={"X-API-Key": SWAI_KEY},
        json={
            "ticket_id": str(ticket_id),
            "message": message,
        }
    ).text)

def paraphrase_message(ticket_id, message):
    paraphrased = get_message_completion(ticket_id=ticket_id, message=message).get('paraphrased')
    ticket = db.get_ticket(ticket_id)
    client.chat_postMessage(
        channel=os.getenv('STAFF_CHANNEL_ID'),
        thread_ts=ticket['staffThreadTs'],
        text="",
        blocks=[
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*AI Suggestion:*\n{paraphrased}"
                },
                "accessory": {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Send AI Completion"},
                    "style": "primary",
                    "value": json.dumps({"paraphrased": paraphrased, "ticket_id": ticket_id}),
                    "action_id": "send_paraphrased"
                }
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "plain_text",
                        "text": "Please remember to review this before sending.",
                        "emoji": True
                    }
                ]
            }
        ]
    )

def get_ticket_detection(ticket_id):
    return json.loads(requests.get(
        url="https://ai.review.hackclub.com/tickets/detect",
        headers={"X-API-Key": SWAI_KEY},
        json={
            "ticket_id": str(ticket_id),
        }
    ).text)["detection"]

def detect_ticket(ticket_id):
    detection = get_ticket_detection(ticket_id)
    ticket = db.get_ticket(ticket_id)
    if detection not in MACROS.keys():
        return
    client.chat_postMessage(
        channel=os.getenv('STAFF_CHANNEL_ID'),
        thread_ts=ticket['staffThreadTs'],
        text="",
        blocks=[
		{
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": "AI Ticket Type Detection",
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
				"text": "*This ticket was detected as not related to the shipwrights*\n*Recommended reply:*"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": f"{MACROS[detection]}"
			},
			"accessory": {
				"type": "button",
				"text": {
					"type": "plain_text",
					"text": "Reply and Resolve"
				},
				"style": "primary",
				"value": json.dumps({"reply": MACROS[detection], "ticket_id": ticket_id}),
				"action_id": "resolve_detected"
			}
		},
		{
			"type": "divider"
		},
		{
			"type": "context",
			"elements": [
				{
					"type": "plain_text",
					"text": "This detection was generated via AI. Please read through the ticket before resolving.",
					"emoji": True
				}
			]
		}
	]
    )
