def edit_message(message_ts):
    return {
            "type": "modal",
            "callback_id": "edited_message",
            "private_metadata": message_ts,
            "title": {
                "type": "plain_text",
                "text": "Shipwrighter",
                "emoji": True
            },
            "submit": {
                "type": "plain_text",
                "text": "Edit",
                "emoji": True
            },
            "close": {
                "type": "plain_text",
                "text": "Cancel",
                "emoji": True
            },
            "blocks": [
                {
                    "type": "input",
                    "block_id": "input_block",
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "user_input"
                    },
                    "label": {
                        "type": "plain_text",
                        "text": "Edited Message"
                    }
                }
            ]
        }

def show_unauthorized():
    return {
            "title": {
                "type": "plain_text",
                "text": "Shipwrighter",
                "emoji": True
            },
            "type": "modal",
            "blocks": [
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*You can't close this ticket* :("
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "plain_text",
                            "text": "Only shipwrights and the ticket owner can close tickets, Or this ticket is already closed",
                            "emoji": True
                        }
                    ]
                }
            ]
        }