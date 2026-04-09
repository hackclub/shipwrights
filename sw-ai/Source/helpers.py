import requests, re, json, os, logging
from dotenv import load_dotenv

load_dotenv()

SW_API_KEY = os.environ.get("SW_API_KEY")
PORT = 45200
OPENROUTER_KEY = os.environ.get("OPENROUTER_KEY")

logging.basicConfig(
    level=logging.ERROR,
    format='[%(asctime)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

VIBES_CACHE = {
    "created_at": None,
    "content": None
}

REJECTION_REASONS = {
    "broken_feature": "A core feature of the project is broken, non-functional, or crashes during use",
    "demo_link_problems": "The demo link is missing, broken, leads to a 404, or does not showcase the project",
    "readme_problems": "The README is missing, incomplete, or does not explain the project's purpose, usage, or setup",
    "undisclosed_ai": "The project contains patterns of AI-generated code or content that was not declared by the user",
    "releases_format_compiled_error": "GitHub releases are missing, improperly formatted, or the provided build does not compile or run",
    "non_raw_readme": "The README is not raw and contains rendered HTML or non-standard formatting instead of plain markdown",
    "repo_or_project": "The repository is private, empty, has no meaningful code, or the project structure is fundamentally broken",
    "did_not_meet_requirements": "The project does not meet the minimum shipping requirements for its category (e.g. web app without live demo, bot not hosted)",
    "not_marked_as_update": "The project is an update to a previously shipped project but was not marked as an update submission",
    "no_devlogs_or_time": "The project has no development logs or insufficient tracked time on Hackatime to verify effort",
    "insufficient_instructions": "The project lacks clear instructions on how to install, set up, or use it beyond what the README covers",
    "requested": "The user themselves requested the project be rejected or withdrawn",
    "fraud": "The submission is fraudulent, plagiarized, or otherwise dishonest",
    "ysws": "The project does not meet the You Ship We Ship program-specific requirements",
}

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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-GPC": "1",
    "Priority": "u=0, i",
    "TE": "trailers",
}

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
You need to provide helpful things to make it as easy as possible to get the project up and test it well or reject it from the first look because of a remade or a bad demo


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

You need to be helpufl and provide as much "unnoticeable info" or hard ones, don't try to give a reject or accept, just your thoughts
But try to lean towards a one, like if it's really obvious just say it and try to be really concise but detailed for hard/weird projects

## Response Format
Return ONLY valid JSON with no markdown, no code blocks and try to be concise:
{{"summary": "Your analysis and decision"}}"""


def format_rejection_analysis_prompt(project_description, reviewer_feedback):
    reasons_formatted = "\n".join(
        f"- **{reason}**: {meaning}" for reason, meaning in REJECTION_REASONS.items()
    )
    return f"""You are a rejection classifier for the Shipwrights team at Hack Club.

## Your Task
Analyze the project description and the reviewer's feedback to determine the primary reason the project was rejected.

## Rejection Categories
{reasons_formatted}

## Project Description
{project_description}

## Reviewer Feedback
{reviewer_feedback}

## Instructions
1. Read the reviewer's feedback carefully and match it to the most fitting rejection category.
2. If multiple reasons apply, pick the single most dominant one that caused the rejection.
3. Provide a short explanation of why this category was chosen.

## Response Format
Return ONLY valid JSON with no markdown, no code blocks, no explanation:
{{"reason": "category_key", "explanation": "Brief justification for this classification"}}"""


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
        print(f"Error occurred whilst fetching readme for {url}: {e}")
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
        print(f"Error occurred whilst fetching releases for {url}: {e}")
        return data

def get_first_commit_date(repo_url):
    if not repo_url or "github.com" not in repo_url:
        return None
    try:
        match = re.search(r'github\.com/([^/]+)/([^/]+)', repo_url)
        if not match:
            return None
        owner, repo = match.groups()
        repo = repo.replace(".git", "")

        res = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1",
            timeout=10,
            headers={"Accept": "application/vnd.github.v3+json"},
        )
        if not res.ok:
            return None

        link_header = res.headers.get("Link", "")
        last_url = None
        for part in link_header.split(","):
            if 'rel="last"' in part:
                last_url = part.split(";")[0].strip().strip("<>")
                break

        if last_url:
            res = requests.get(last_url, timeout=10, headers={"Accept": "application/vnd.github.v3+json"})
            if not res.ok:
                return None

        commits = res.json()
        if not commits:
            return None

        return commits[-1]["commit"]["committer"]["date"]
    except Exception as e:
        print(f"Error fetching first commit date for {repo_url}: {e}")
        return None


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


def format_vibes_message(tickets, old_tickets):
    ticket_data = ""
    old_ticket_data = ""

    for ticket in tickets:
        ticket_data += f"#{ticket['id']}: {ticket['question']}\n{ticket['messages']}\n\n"

    for ticket in old_tickets:
        old_ticket_data += f"#{ticket['id']}: {ticket['question']}\n{ticket['messages']}\n\n"

    return f"""Analyze these support tickets for the Shipwrights team.

## Tasks
1. Were most users happy? (true/false + short reason)
2. Pick 2-3 user quotes (copy exactly, not from staff)
3. One improvement suggestion (not about response times - we're volunteers)

## Important Rules
- Only reference staff messages prefixed with '?' (these were sent to the user). Messages without '?' are internal discussions and should NOT be mentioned.
- Do NOT provide recommendations about delays or response times. We are a volunteer team.
- The quote must be from a USER, not from staff.
- You must always return in the specified JSON format as this is parsed never returning in markdown.
- Sentiment values are important to us we see as 1 being perfect and 0 being horrible please weigh against the context tickets to decide how good/bad we performed that day in comparison
- Please give detailed reasons for the day being good/bad as we try to use this to improve.
- For the quotes and suggestion please do not use old context tickets for them only new tickets.


## Old Tickets for context
{old_ticket_data}

## Tickets
{ticket_data}

## JSON Response (no markdown)
{{"positive": {{"result": true, "reason": "short but detailed", "sentiment": "number from 0 to 1"}}, "quotes": [{{"ticket_id": "123", "text": "quote", "reason": "short but detailed"}}], "suggestion": {{"action": "what", "reason": "short but detailed referencing the ticket this originates from."}}}}"""""


def format_submission_validation_message(readme, readme_link, demo_link, repo_url, description, is_updated, ai_declaration):
    project_releases = get_releases(repo_url)

    try:
        demo_status = requests.get(url=demo_link, headers=HEADERS, timeout=10, allow_redirects=True).status_code
        logger.error(f"[demo check] {demo_link} -> {demo_status}")
        if demo_status < 400:
            return_code = "Reachable"
        elif demo_status in (401, 403, 406, 429):
            return_code = "Reachable (access restricted to bots/crawlers, likely works in browser)"
        elif demo_status == 404:
            return_code = "Not Found (404)"
        elif demo_status >= 500:
            return_code = f"Server Error ({demo_status})"
        else:
            return_code = f"Returned {demo_status}"
    except Exception as e:
        logger.error(f"[demo check] {demo_link} -> exception: {e}")
        return_code = "Could not connect (DNS failure or host unreachable)"

    if not project_releases.get("has"):
        project_releases = "Failed to fetch. Please ignore."

    return f""" You are an automation being ran for the shipwrights to ensure that user submissions are valid. You will look through the following submission and decide if something looks off.
        
        #Valid submission rules
            - A submission MUST have a readme
            - Submission Readme's MUST explain simply what the project does and how to use it but this may depend on project complexity. Complex projects require complex explanations whilst a simple project such as a todo list may not require a how to use
            - Submissions must have a valid demo linked. Websites should be live and hosted. Games should preferably be on itch.io and such.
            - Demo links must be valid and existing. A broken demo link means an instant rejection.
            - If a project has a commit made before December 15th 2025, The project MUST be marked as updated.
            - If a project has been submitted before to any other hackclub program it MUST be marked as updated.
            - School/College projects are NOT allowed.
            - If user used AI in their project, they MUST adequately declare it.
        
        #Shipwright guidelines
            - Web Apps: Web apps must have a live demo, this could be GitHub pages, Vercel, Netlify, etc. 
            - Web Apps Cannot be only local hosting instructions or an ngrok link, cloudflared link or DuckDNS.
            - We also don’t accept Render, Hugging Face and Railway links
            - Executable Files: Must be in a GitHub releases as a .exe, .app, .deb or similar and should include instructions on how to run it properly.
            - Android App: Should be a .apk in a GitHub releases (like an executable) or in the Google Play Store.
            - iOS  App: Should be a TestFlight or the App Store.
            - APIs: Needs to be on something like Swagger where can test each endpoint and must have a detailed README.
            - Bots: Bots need to be hosted and online in order to test it out. Shipwright should never host it themselves. Demo link should be to the channel or server or a bot invite. proper documentation on each command is required.
            - Readme's MUST be raw.
        
        #Why
            - These submissions are sent for review by the Shipwrights team. The Shipwrights team decide if submissions are valid through the following criteria.
        
        #Task
            - You are being asked to help find mistakes before they even reach the Shipwrights team.
            - You are to identify what is being done incorrectly by a shipper and provide a detailed explanation of why it is incorrect.
            - You primary job is to flag mistakes helping users understand what they did wrong and how they could potentially fix it.
            - You MUST not directly quote the Shipwrights guidelines above.
            - You MUST not give the user direct instruction which includes giving them a readme to copy and paste.
            - You MUST only ever guide users and NOT provide step by step instructions.
            - You MUST never link the users outside of the platform.
            - You MUST phrase your messages in a friendly and clear manner.
            - You MUST make it clear that this is only a check and they can still continue with shipping if its a false alarm.
            - You MUST always return output in the form of JSON to be parsed by the Shipwrights team.
        
        #Notes
            - If a project is relatively simple then their readme may also be simple. For example a static website is allowed to only have a brief summary of what it does.
            - Try to be more lenient on users with easier projects as they tend to be newer users requiring more guidance.
            - Users are allowed to discuss their personal experience creating a project in their readme.
            - Projects may be distributed alternatively through package managers which include LuaRocks, Cargo and PyPi
            - Users shipping APIs may link documentation and not write it directly inside the readme.
            - Simple webapps don't need to include usage instructions but they should optionally do it.
            - Users often add env based install guides and guides on how to compile in their readme, That should not mean an automatic rejection if an exe is required. Users often provide both a ready exe and a guide to compile/install. This also applies to webapps as often live applications are included too.
            - For simple issues you should flag them as warnings not errors.
            - You should not push users to include usage instructions for simple webapps.
        
        #AI Declaration
            - Users MUST declare if their readme was AI generated.
            - You may be able to tell if a readme was AI generated via overuse of emojis and the presence of comments inside the raw readme. Another way is unfilled placeholder which include for example "YOUR PROJECT NAME", "YOUR REPO LINK", etc.
            - If you are unsure if the AI Declaration is sufficient then assume it is.
        
        #Data
            - Project Readme: {readme}
            - Project Demo Link: {demo_link}
            - Project Description: {description}
            - Demo link return Code: {return_code}
            - Project Readme Link: {readme_link}
            - Project Repo Link: {repo_url}
            - Project Releases: {project_releases}
            - Has the project been marked as updated: {is_updated}
            - Date of project's first commit: {get_first_commit_date(repo_url) or "N/A"}
            - Project AI Declaration: {ai_declaration}       
         
         #JSON Response (no markdown)         
         Return ONLY valid JSON with no markdown, no code blocks, no explanation:         
         {{"valid": true|false, "flags": [{{"field": "demo|readme|description|declaration|updated", "severity": "error|warning|suggestion", "message": "Friendly user-facing explanation"}}], "summary": "Overall message shown to the user"}}        
        """

def get_ai_response(content=None, tokens=1000, timeout=60, ai_model="google/gemini-3-flash-preview", keys=()):
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": ai_model,
                "max_tokens": tokens,
                "messages": [
                    {
                        "role": "user",
                        "content": content
                    }
                ]
            },
            timeout=timeout
        )
        logger.info(f"OpenRouter status code: {response.status_code}")
        response.raise_for_status()
        result = response.json()

    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response status: {e.response.status_code}")
            logger.error(f"Response body: {e.response.text}")
        return {"error" : str(e), content: None}

    if "error" in result:
        logger.error(f"OpenRouter returned error: {result['error']}")
        return {"error": result["error"], content: None}

    if "choices" not in result or not result["choices"]:
        logger.error(f"Unexpected API response structure: {result}")
        return {"error": "Unexpected API response", "response": result}

    content = result["choices"][0]["message"]["content"]
    logger.info(f"AI content received: {content[:500] if content else 'EMPTY'}")

    if not content or not content.strip():
        logger.error("Empty response from AI")
        return {"error": "Empty response from AI", content: None}

    try:
        cleaned_content = clean_json_response(content)
        ai_response = json.loads(cleaned_content)
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        logger.error(f"Raw content that failed to parse: {content}")
        return {"error": "AI returned invalid JSON", "content": content}

    if not all(key in ai_response for key in keys):
        logger.error(f"Missing required fields. Got: {ai_response.keys()}")
        return {"error": "Missing required fields in AI response", "content": content}

    return {"error": None, "content": ai_response}