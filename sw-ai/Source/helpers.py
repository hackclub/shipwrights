import requests, re, json, os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_KEY = os.environ.get("OPENROUTER_KEY")

TYPES = [
  "CLI",
  "Cargo",
  "Web App",
  "Chat Bot",
  "Extension",
  "Desktop App (Windows)",
  "Desktop App (Linux)",
  "Desktop App (macOS)",
  "Minecraft Mods",
  "Hardware",
  "Android App",
  "iOS App",
  "Other",
]


def format_messages(ticket_messages, show_discussion=True):
    conversation=""
    for message in ticket_messages:
        if message.get("isStaff", False):
            if show_discussion:
                conversation += f"Shipwrights team: {message.get('msg', 'None').lstrip('?').strip()}\n"
                pass
            if message.get('msg').startswith("?"):
                conversation += f"Shipwrights team: {message.get('msg', 'None').lstrip('?').strip()}\n"
        else:
            conversation += f"User: {message.get('msg', 'None')}\n"
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
They are required to make a video testing the project but may need more explanation about how to run it and what is it ?
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
But try to lean towards a one, like if it's really obvious just say it and try to be really concise but detailed for hard/weird projects

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


def get_readme(url):
    if not url:
        return ""
    try:
        raw = url.replace('github.com', 'raw.githubusercontent.com').replace("/blob/", "/")
        result = requests.get(raw, timeout=10)
        if result.ok:
            return result.text
        if result.status_code == 404:
            return "Readme doesn't exist"
        return ""
    except Exception as e:
        print(f"Error occured whilst fetching readme for {url}: {e}")
        return ""

def get_releases(url):
    data = {"has": False, "files": [], "notes": "", "hints": []}
    if not url or "github.com" not in url:
        return data
    try:
        match = re.search(r'github\.com/([^/]+)/([^/]+)', url)
        if not match:
            return data
        owner, repo = match.groups()
        repo = repo.replace(".git", "")
        result = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/releases?per_page=3",
            timeout=10,
            headers={"Accept": "application/vnd.github.v3+json"},
        )
        if not result.ok:
            return data
        rels = result.json()
        if not rels:
            return data
        files = []
        hints = []
        notes = ""
        for r in rels:
            if r.get("body"):
                notes += r["body"][:500] + "\n"
            for a in r.get("assets", []):
                n = a["name"].lower()
                files.append(n)
                if n.endswith(".exe") or "windows" in n or "win64" in n or "win32" in n:
                    hints.append("win")
                if n.endswith(".dmg") or n.endswith(".pkg") or "macos" in n or "darwin" in n:
                    hints.append("mac")
                if n.endswith(".deb") or n.endswith(".rpm") or n.endswith(".appimage") or "linux" in n:
                    hints.append("linux")
                if n.endswith(".apk") or "android" in n:
                    hints.append("android")
                if n.endswith(".ipa") or "ios" in n:
                    hints.append("ios")
                if n.endswith(".jar") or "fabric" in n or "forge" in n:
                    hints.append("mc-mod")
                if n.endswith(".vsix") or n.endswith(".xpi") or n.endswith(".crx"):
                    hints.append("ext")
        return {
            "has": True,
            "files": list(set(files)),
            "notes": notes[:1000],
            "hints": list(set(hints)),
        }
    except Exception as e:
        print(f"Error occured whilst fetching releases for {url}: {e}")
        return data

def check_type(data: dict) -> dict:
    readme = get_readme(data.get("readmeUrl", ""))
    rel = get_releases(data.get("repoUrl", ""))

    input_data = {
        "title": data.get("title", ""),
        "desc": data.get("desc", ""),
        "readmeUrl": data.get("readmeUrl", ""),
        "demoUrl": data.get("demoUrl", ""),
        "repoUrl": data.get("repoUrl", ""),
        "readmeContent": (readme or "")[:2000],
        "rel": rel,
    }

    if not OPENROUTER_KEY:
        return {"type": "Unknown", "debug": {"input": input_data, "request": {}, "response": None, "error": "no OPENROUTER_KEY"}}

    ctx = ""
    if rel.get("has"):
        ctx = f"\n\nFILES: {', '.join(rel['files'])}"
        if rel.get("hints"):
            ctx += f"\nHINTS: {', '.join(rel['hints'])}"
        if rel.get("notes"):
            ctx += f"\nNOTES:\n{rel['notes']}"

    req_body = {
        "model": 'google/gemini-2.5-flash-lite',
        "messages": [
            {
                "role": "system",
                "content": f"You are a project classifier. Classify projects into EXACTLY one of these categories: {', '.join(TYPES)}. Respond with ONLY valid JSON: {{\"type\": \"category\", \"confidence\": 0.0-1.0}}. No markdown, no explanation, no thinking tags.",
            },
            {
                "role": "user",
                "content": f"Title: {data.get('title', '')}\nDescription: {data.get('desc', '')}\nDemo URL: {data.get('demoUrl', '')}\nRepo: {data.get('repoUrl', '')}\n\nREADME:\n{readme or ''}{ctx}",
            },
        ],
    }

    import time
    for i in range(3):
        try:
            res = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENROUTER_KEY}", "Content-Type": "application/json"},
                json=req_body,timeout=30,
            )
            result = res.json()

            if not res.ok:
                if i < 2:
                    time.sleep(5)
                    continue
                return {"type": "Unknown", "debug": {"input": input_data, "request": req_body, "response": result, "error": f"status {res.status_code}"}}

            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            content = content.replace("```json", "").replace("```", "").strip()
            if "<think>" in content:
                content = content.split("</think>")[-1].strip()

            parsed = json.loads(content)
            final_type = parsed["type"] if parsed.get("confidence", 0) >= 0.8 else "Unknown"

            return {"type": final_type, "debug": {"input": input_data, "request": req_body, "response": result, "error": None}}

        except Exception as e:
            if i < 2:
                time.sleep(5)
                continue
            return {"type": "Unknown", "debug": {"input": input_data, "request": req_body, "response": None, "error": str(e)}}

    return {"type": "Unknown", "debug": {"input": input_data, "request": req_body, "response": None, "error": "max retries"}}


def format_vibes_message(tickets):
    ticket_data = ""
    for ticket in tickets:
        ticket_data += f"#{ticket['id']}: {ticket['question']}\n{ticket['messages']}\n\n"
    return f"""Analyze these support tickets for the Shipwrights team.

## Tasks
1. Were most users happy? (true/false + short reason)
2. Pick 2-3 user quotes (copy exactly, not from staff)
3. One improvement suggestion (not about response times - we're volunteers)

## Important Rules
- Only reference staff messages prefixed with '?' (these were sent to the user). Messages without '?' are internal discussions and should NOT be mentioned.
- Do NOT provide recommendations about delays or response times. We are a volunteer team.
- The quote must be from a USER, not from staff.

## Tickets
{ticket_data}

## JSON Response (no markdown)
{{"positive": {{"result": true, "reason": "short"}}, "quotes": [{{"ticket_id": "123", "text": "quote", "reason": "short"}}], "suggestion": {{"action": "what", "reason": "short"}}}}"""""
