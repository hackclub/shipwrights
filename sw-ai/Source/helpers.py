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


def format_detection_prompt(ticket_messages, ticket_question):
    return f"""You are a ticket classifier for the Shipwrights team at Hack Club.

## Shipwrights Scope
The Shipwrights team reviews project submissions for quality and completeness. They handle:
- Project certification/rejection appeals
- Submission guidance and fixes
- Review status inquiries

They CANNOT help with:
- Cookie (currency) payouts or deductions
- Prize fulfillment
- User bans

## Classification Categories
Return exactly ONE of these:
- **fraud**: user bans (outside Shipwrights scope)
- **fthelp**: Non-project issues unrelated to certification/submission
- **queue**: Complaints about project waiting time in review queue
- **ship**: Project submission help, review requests, or rejection appeals

## Ticket Data
**Question:** {ticket_question}

**Conversation:**
{format_messages(ticket_messages)}

## Response Format
Return ONLY valid JSON with no markdown, no code blocks:
{{"detection": "fraud|fthelp|queue|ship"}}"""


def format_project_summary_prompt(project_name, project_type, readme_content, demo_url, repo_url):
    return f"""
Hey you are a project review assistant, 
You need to help the reviewer to make an accurate decision by checking the project, you need to explain to them what's the project how to test it, is it fine from the first look or not
They are requied to make a video testing the project but may need more explanation about how to run it and what is it ?
You need to provide helpful things to make it as easy as possible to get the project up and test it well or reject it from the first look because of a reamde or a bad demo


you should get all the info and if you not sure just say this pls

here's the shipwrights guidelines - but don't follow it word for word, just use it as a reference

Rules for shipping 

Web Apps:

Web apps must have a live demo, this could be GitHub pages, Vercel, Netlify, etc. 
Cannot be only local hosting instructions or an ngrok link.

Executable Files:

Must be in a GitHub releases as a .exe, .app, .deb or similar and should include instructions on how to run it properly.

Android App:

Should be a .apk in a GitHub releases (like an executable) or in the Google Play Store.

APIs:

Needs to be on something like Swagger where can test each endpoint and must have a detailed README.

Games:

Games must either be a web build and be on something like itch.io or be in a GitHub releases.

Bots:

Bots need to be hosted and online in order to test it out.
Shipwright should never host it themselves. Demo link should be to the channel or server with proper documentation on each command.
If you find anything wierd please note it!
This maybe>?

Extensions:

Extensions must either be on the applicable store, or be an unpacked file which works as an extension put in GitHub Releases.

Userscripts:

must be on Tampermonkey or Greasyfork. Cannot be a txt file on GitHub.

Hardware:

Use these guidelines by @user :
You can submit:

* Completed PCB/schematics as long as they are tracked with hackatime
* Lapse of you soldering pcbs/your circuit based on your schematic

Optional:

* Firmware
* Case

Demo

* If no physical, github release with kicad/eda files
* Otherwise video of the project.

Important

* If the project has been built physically it must have firmware 
* If it's physically built schematic isn't needed

Esolangs:

some sort of playground is preferred, but otherwise, detailed installation + syntax guide works.

CLI Tools:

Should be an executable file with instructions on how to use and set it up OR a demo links to a package manager, not everything needs a gh release just if there's some way to take it


Game Mods:
Mods should be uploaded to platforms like Modrinth & CurseForge. Avoid GitHub Releases.

README Guidelines:

the README should explain how to use the project and what it’s for. it can't be just “this is a ____” or similar, 
it always needs to include some info about the project like a minimum readme - give a note to reviewer if they need to look for this!
The README also must be raw!

Open-source:

All projects must be open-source, this means all files need to be available in some sort of git site, preferably GitHub

## Project Details
Name: {project_name}
Type: {project_type}
Demo URL: {demo_url}
Repo URL: {repo_url}

## README Content
{readme_content}

You need to be helpufl and provide as much "unnoticable info" or hard ones, don't try to give a reject or accept, just your thoughts
But try to lean towards a one, like if it's really obvious just say it and try to be really concise but detailed for hard/wierd projects

## Response Format
Return ONLY valid JSON with no markdown, no code blocks and try to be concise:
{{"summary": "Your analysis and decision"}}"""


def clean_json_response(content: str) -> str:
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()
