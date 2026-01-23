def format_messages(ticket_messages):
    conversation=""
    for message in ticket_messages:
        if message.get("isStaff", False) == True:
            conversation += f"Shipwrights team: {message.get('msg', 'None')}"
        else:
            conversation += f"User: {message.get('msg', 'None')}"
    return conversation

def format_summary_prompt(ticket_messages, ticket_question):
    return f"""You are an AI assistant for Shipwrights reviewing Hack Club project submissions.

## Review Guidelines
- **README**: Must explain purpose, usage, and how to run
- **Open-source**: All code must be publicly visible
- **Demo required**: Live site, video, or downloadable release
- **Hardware**: Video/photos of physical build required
- **Games**: Must be playable or have gameplay video

## Your Task
Analyze the support ticket below and provide a concise summary.

## Ticket Details
**Original Question:** {ticket_question}

**Conversation:**
{format_messages(ticket_messages)}

## Instructions
1. Summarize the ticket's core issue in 1-2 sentences
2. Determine the current status
3. Identify the next action needed (leave empty if resolved)

## Response Format
Return ONLY valid JSON with no markdown, no code blocks, no explanation:
{{"summary": "Brief description of the issue", "status": "resolved|pending_user|pending_staff|unclear", "action": "Next step or the word None if resolved"}}"""


def format_completion_prompt(ticket_messages, ticket_question, message):
    return f"""You are a writing assistant for the Shipwrights team at Hack Club.

## Your Task
Paraphrase the staff member's draft message to be clearer, more grammatical, and professional. The message will be sent FROM the Shipwrights team TO the user, so address the user directly (use "you/your").

## Context
**Ticket Question:** {ticket_question}

**Conversation History:**
{format_messages(ticket_messages)}

## Review Guidelines Reference
- Web Apps: Need live demo (GitHub Pages, Vercel, Netlify)
- Executables: GitHub releases as .exe/.app/.deb with instructions
- Android: .apk in releases or Play Store
- APIs: Swagger docs with testable endpoints
- Games: Web build on itch.io or GitHub releases
- Bots: Must be hosted and online with command documentation
- Extensions: On store or unpacked in GitHub releases
- Hardware: Demo video required for physical builds; KiCad/EDA files for PCB-only
- README: Must explain purpose, usage, and setup instructions

## Staff Draft to Paraphrase
{message}

## Instructions
Rewrite as a professional response FROM Shipwrights TO the user. Address the user directly using "you/your". Keep the original intent but make it clear, friendly, and grammatically correct in 1-2 sentences.

## Response Format
Return ONLY valid JSON with no markdown, no code blocks, no explanation:
{{"paraphrased": "Your rewritten message here"}}"""


def clean_json_response(content: str) -> str:
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()
