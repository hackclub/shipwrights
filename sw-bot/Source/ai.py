import requests, os, json
import db
from slack_sdk import WebClient
from dotenv import load_dotenv
load_dotenv()

SWAI_KEY = os.getenv("SW_AI")
client = WebClient(token=os.getenv('SLACK_BOT_TOKEN'))

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


    """
    blocks=[
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "Attachments sent."
                        },
                        "accessory": {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "Delete Attachments"},
                            "style": "danger",
                            "value": json.dumps({"ts": uploaded}),
                            "action_id": "delete_message"
                        }
                    }
                ]
            )
    """