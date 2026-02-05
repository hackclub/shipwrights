import requests, json
import db
from datetime import datetime, timedelta
from globals import SWAI_KEY, MACROS, STAFF_CHANNEL,client

CACHED_METRICS = {
    "cached_at": None,
    "quote_otd": None,
    "recommendation" : None,
    "bool" : None,
    "paused" : False,
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
        channel=STAFF_CHANNEL,
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
        channel=STAFF_CHANNEL,
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
        channel=STAFF_CHANNEL,
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

def get_metrics():
    if CACHED_METRICS["paused"]:
        return CACHED_METRICS
    if not CACHED_METRICS.get("cached_at") or (datetime.now() - CACHED_METRICS["cached_at"] > timedelta(hours=2)):
        CACHED_METRICS["paused"] = True
        metrics = json.loads(requests.get(
            url="https://ai.review.hackclub.com/metrics/qualitative",
            headers={"X-API-Key": SWAI_KEY},
            json={}
        ).text)
        CACHED_METRICS["cached_at"] = datetime.now()
        CACHED_METRICS["quote_otd"] = metrics.get("quote_otd")
        CACHED_METRICS["recommendation"] = metrics.get("recommendation")
        CACHED_METRICS["bool"] = metrics.get("bool")
        CACHED_METRICS["paused"] = False
        return metrics
    return CACHED_METRICS
