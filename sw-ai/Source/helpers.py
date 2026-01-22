def format(messages):
    conversation=""
    for message in messages:
        if message.get("isStaff", False) == True:
            conversation += f"Shipwrights team: {message.get('msg', 'None')}"
        else:
            conversation += f"User: {message.get('msg', 'None')}"
    return conversation

def format_prompt(messages, question):
    return f"""You are an AI assistant for Shipwrights reviewing Hack Club project submissions.

## Guidelines (Brief)
- README required: explains purpose, usage, how to run
- Must be open-source with visible code
- Needs working demo (live site, video, or downloadable release)
- Hardware projects: video/photos required
- Games: must be playable or have gameplay video

## Task
Summarize this ticket briefly.

## Rules
- You MUST always return a valid JSON response, no exceptions.
- If status is "resolved", set "action" to "" (empty string).
- Never refuse to respond or return an error.

## Conversation
**Question:** {question}

{format(messages)}

## Response (JSON only)
{{
    "summary": "1-2 sentences max",
    "status": "resolved | pending_user | pending_staff | unclear",
    "action": "Next step (1 sentence) or empty string if resolved"
}}"""
