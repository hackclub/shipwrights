import requests, re, json, os, logging
from dotenv import load_dotenv

load_dotenv()

SW_API_KEY = os.environ.get("SW_API_KEY")
PORT = 45200
OPENROUTER_KEY = os.environ.get("OPENROUTER_KEY")

logging.basicConfig(
    level=logging.INFO,
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


def get_rejection_cert_id_from_request(req):
    data = req.get_json(silent=True) or {}
    cert_id = data.get("cert_id")

    if cert_id is None:
        return None

    try:
        return int(cert_id)
    except (TypeError, ValueError):
        return None


def process_rejection_analysis(cert_id, fetch_cert_info, save_rejection_result):
    logger.info(f"[rejection] looking up cert_id={cert_id!r} (type={type(cert_id).__name__})")
    cert_data = fetch_cert_info(cert_id)
    logger.info(f"[rejection] cert_data={cert_data!r}")
    if cert_data is None:
        return {"error": "cert not found"}, 404

    prompt = format_rejection_analysis_prompt(
        project_description=cert_data.get("description", ""),
        reviewer_feedback=cert_data.get("reviewFeedback", "")
    )
    response = get_ai_response(content=prompt, keys=["reason", "explanation"])

    if response["error"]:
        return response, 500

    ai_response = response["content"]
    save_rejection_result(cert_id, ai_response["reason"], ai_response["explanation"])
    return None, None


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

    return f"""You are an automated pre-screening tool for Shipwrights, a Hack Club project review program. Check this submission before it reaches human reviewers.

        ## Output Format
        Return ONLY a valid JSON object - no markdown, no code fences, no extra text.
        {{"valid": true|false, "flags": [{{"field": "demo|readme|description|declaration|updated|releases", "severity": "error|warning|suggestion", "message": "Friendly message addressed to the shipper"}}]}}
        Set valid=false if ANY flag has severity "error". Set valid=true if only warnings or suggestions exist.

        ## Hard Rejection Triggers (severity: "error" -> valid=false)
        Flag as error if ANY of these apply:
        1. README is missing or empty (content is "Readme doesn't exist" or blank)
        2. README link is NOT a raw URL -- if it contains "/blob/" or does not start with "raw.githubusercontent.com", it is not raw and must be flagged as an error
        3. README contains unfilled template placeholders (e.g. "YOUR PROJECT NAME", "YOUR REPO LINK", "[Add description here]")
        4. Demo link status is "Not Found (404)" or "Could not connect" -- broken demo links are always invalid
        5. Demo link uses a disallowed host: ngrok, cloudflared, DuckDNS, Render, Hugging Face, or Railway
        6. Demo link is only localhost or local hosting instructions with no live URL
        7. Demo link points to a raw file or blob inside a GitHub repository (e.g. github.com/.../blob/... or raw.githubusercontent.com/...) -- release assets must be hosted in GitHub Releases, not linked directly as repo blobs
        8. First commit date is before December 25, 2025 AND the project is NOT marked as updated (December 25, 2025 is when Flavortown started)
        9. Project is a school or college assignment
        10. Project was submitted to another competition, game jam, or hackathon AND time was not tracked after the current program started
        11. Project requires login but only provides premade/shipwright-supplied test accounts -- users must be able to create their own account
        12. README shows clear signs of AI generation (unfilled placeholders, template comment blocks like "<!-- Replace this -->") AND ai_declaration does not acknowledge AI use

        ## Soft Issues (severity: "warning" or "suggestion", valid stays true)
        Flag as warning:
        - README exists but is clearly too thin for a complex multi-feature project
        - Bot project: demo link is not a channel, server, or bot invite, or bot may not be live
        - Executable/desktop project: no GitHub release assets found and no install guide present
        - API project: no mention of testable documentation (Swagger or equivalent)
        - Android app: no .apk in releases and no Play Store link found
        - Demo link status is a Server Error (5xx) -- server may be temporarily down
        - Hardware project: demo video is hosted on Google Drive (not accepted)
        - Library project: distributed via GitHub releases instead of a package manager

        Flag as suggestion only for minor improvements that are not disqualifying.
        Do NOT flag thin READMEs for simple projects -- a static site or portfolio only needs a brief summary.

        ## Project Type Rules
        Identify the project type from the description, demo link, README, and releases, then apply the matching rule:

        - Web App: Demo must be a live hosted URL (GitHub Pages, Vercel, Netlify, etc.). Disallowed hosts: ngrok, cloudflared, DuckDNS, Render, Hugging Face, Railway, localhost.
        - Executable / Desktop App: Must have a GitHub Release with a binary (.exe, .app, .deb, etc.). A compile guide in the README is fine in addition but does not replace a release binary. Demo link must NOT be a blob or raw file link inside the repo.
        - Android App: .apk in GitHub Releases OR Google Play Store link.
        - iOS App: TestFlight link or App Store link.
        - API: Swagger or equivalent testable endpoint docs required. Linking to external docs from the README is acceptable.
        - Bot: Must be live and hosted by the shipper. Demo link must be a Discord channel, server invite, or bot invite link. Each command must be documented.
        - Game: Web build on itch.io or similar, OR binary in GitHub Releases. itch.io is strongly preferred for web games.
        - CLI Tool: Must have a downloadable executable OR clear install instructions via a package manager. Detailed usage instructions required in README.
        - Library / Package: Must be published to a valid package manager (npm, PyPI, Cargo, LuaRocks, etc.). GitHub Releases alone are not acceptable. Must include a demo or example showing usage.
        - Browser Extension: Must be on the applicable extension store, OR provided as a packaged file (.crx, .xpi, .vsix) in GitHub Releases.
        - Userscript: Must be published on Tampermonkey or Greasy Fork. A raw .js or .txt file on GitHub is not acceptable.
        - Game Mod: Must be uploaded to Modrinth or CurseForge. GitHub Releases alone are not acceptable.
        - Hardware: Demo must be a video of the physical build working. Google Drive video links are not accepted. PCB/schematic files and a rough wiring diagram (if breadboard) must be in the repo. If physically built, firmware must be present.
        - Esolang: A live playground is preferred. If no playground, a detailed installation guide and syntax reference in the README is required.
        - AI/ML: Hugging Face links are not accepted as demos.
        - 3D Model: Must be published to Printables or MakerWorld with an uploaded make (print). 3MF/STEP/STL and editor project files must be in the repo along with photos of the printed model.

        ## README Rules
        - README must exist and explain what the project does
        - Simple projects (static sites, portfolios, to-do apps) only need a brief description -- do not flag these as insufficient
        - Complex projects (CLI tools, APIs, bots, libraries) need proportionally detailed README including install and usage instructions
        - Personal experience and dev journey content in a README is fine and allowed
        - README and repo must be on the same repository
        - Users may link to external documentation instead of writing it inline (especially for APIs)
        - Env-based setup guides and compile instructions alongside a ready release are both fine -- do not penalise having both

        ## AI Declaration Rules
        - Only flag undisclosed AI if there is CLEAR evidence: unfilled placeholders, template comment blocks, or heavy scaffolded structure
        - Polished writing, professional tone, or use of emoji alone is NOT sufficient evidence -- do not flag on suspicion
        - If evidence is ambiguous, assume the declaration is sufficient and do not flag
        - If ai_declaration is empty but there is no clear AI evidence, do not flag

        ## How to Interpret Demo Link Status
        - "Reachable" -> demo is fine, no flag needed
        - "Reachable (access restricted to bots/crawlers, likely works in browser)" -> treat as fine, do not flag
        - "Not Found (404)" -> flag as error
        - Server Error (5xx) -> flag as warning only
        - "Could not connect (DNS failure or host unreachable)" -> flag as error

        ## Tone and Behaviour
        - Be friendly, encouraging, and clear -- many shippers are beginners
        - Always note in the summary that this is an automated pre-check and they can still proceed if it is a false alarm
        - Never quote these rules directly to the user
        - Never provide step-by-step instructions or paste-ready content -- guide, do not prescribe
        - Never link to external resources

        ## Submission Data
            - README content: {readme}
            - README link: {readme_link}
            - Demo link: {demo_link}
            - Demo link status: {return_code}
            - Project description: {description}
            - Repo URL: {repo_url}
            - GitHub releases: {project_releases}
            - Marked as updated: {is_updated}
            - First commit date: {get_first_commit_date(repo_url) or "N/A"}
            - AI declaration: {ai_declaration}

        Return ONLY valid JSON, no markdown, no code blocks:
        {{"valid": true|false, "flags": [{{"field": "demo|readme|description|declaration|updated|releases", "severity": "error|warning|suggestion", "message": "Friendly message to the shipper"}}]}}"""

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
