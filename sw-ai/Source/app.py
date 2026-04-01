import threading
from datetime import datetime, timedelta
from helpers import *
from db import *
from flask import jsonify, request, Flask
from dotenv import load_dotenv
from history import history_loop

load_dotenv()

app = Flask(__name__)

@app.before_request
def require_api_key():
    if request.headers.get("X-API-Key") != SW_API_KEY and request.path != "/health":
        return jsonify({"error": "unauthorized please check your swai key"}), 401

@app.get("/health")
def health():
    return jsonify({"status": "ok", "message": "up and running!"}), 200


@app.get("/tickets/summary")
def ticket_summary():
    ticket_id = request.json.get("ticket_id")
    logger.info(f"Processing ticket_id: {ticket_id}")
    ticket_messages = get_ticket_messages(ticket_id)
    ticket_question = get_ticket_question(ticket_id)
    logger.info(f"Ticket messages count: {len(ticket_messages) if ticket_messages else 0}")
    logger.info(f"Ticket question: {ticket_question}")

    summary_message = format_summary_prompt(ticket_messages=ticket_messages, ticket_question=ticket_question)
    response = get_ai_response(content=summary_message, keys=['action', 'status', 'summary'])

    if response["error"]:
        return jsonify(response), 500
    ai_response = response["content"]

    logger.info(f"Successfully processed ticket {ticket_id}")
    return jsonify({
        "suggested_action": ai_response['action'],
        "status": ai_response['status'],
        "summary": ai_response['summary']
    }), 200

@app.get("/tickets/complete")
def auto_complete():
    ticket_id = request.json.get("ticket_id")
    message = request.json.get("message")
    logger.info(f"Processing ticket_id: {ticket_id}")
    ticket_messages = get_ticket_messages(ticket_id)
    ticket_question = get_ticket_question(ticket_id)

    completion_message = format_completion_prompt(ticket_messages=ticket_messages, ticket_question=ticket_question, message=message)
    response = get_ai_response(content=completion_message, keys=['paraphrased'])
    if response["error"]:
        return jsonify(response), 500
    ai_response = response["content"]

    logger.info(f"Successfully processed ticket {ticket_id}")
    return jsonify({
        "paraphrased": ai_response['paraphrased'],
    }), 200

@app.get("/tickets/detect")
def detect_issue():
    ticket_id = request.json.get("ticket_id")
    logger.info(f"Processing ticket_id: {ticket_id}")
    ticket_messages = get_ticket_messages(ticket_id)
    ticket_question = get_ticket_question(ticket_id)

    issue_detection_message = format_detection_prompt(ticket_messages=ticket_messages, ticket_question=ticket_question)
    response = get_ai_response(content=issue_detection_message, keys=['detection'])

    if response["error"]:
        return jsonify(response), 500
    ai_response = response["content"]

    return jsonify({
        "detection": ai_response['detection'].lower(),
    }), 200

@app.post("/projects/type")
def type_check():
    data = {
        "title": request.json.get("title"),
        "desc": request.json.get("desc"),
        "readmeUrl": request.json.get("readmeUrl"),
        "demoUrl": request.json.get("demoUrl"),
        "repoUrl": request.json.get("repoUrl"),
    }
    result = check_type(data)
    return jsonify(result), 200



@app.post("/projects/summary")
def project_summary():
    data = request.json
    project_name = data.get("projectName")
    project_type = data.get("projectType")
    readme_content = data.get("readmeContent")
    demo_url = data.get("demoUrl")
    repo_url = data.get("repoUrl")

    logger.info(f"Processing summary for project: {project_name}")
    summary_message = format_project_summary_prompt(project_name, project_type, readme_content, demo_url, repo_url)
    response = get_ai_response(content=summary_message, keys=['summary'])
    if response["error"]:
        return jsonify(response), 500
    ai_response = response["content"]
    return jsonify(ai_response), 200

@app.get("/metrics/qualitative")
def get_vibes():
    logger.info(f"Processing today's qualitative metrics.")
    if VIBES_CACHE["created_at"] and VIBES_CACHE["content"]:
        if VIBES_CACHE["created_at"] > datetime.now() - timedelta(hours=12):
            logger.info(f"Using cached qualitative metrics.")
            return jsonify(VIBES_CACHE["content"]), 200

    vibes_message = format_vibes_message(get_recent_tickets(), get_context_tickets())
    response = get_ai_response(content=vibes_message, tokens=2500, timeout=180, keys=['positive', 'quotes', 'suggestion'])

    if response["error"]:
        return jsonify(response), 500
    ai_response = response["content"]

    for i, quote in enumerate(ai_response["quotes"]):
        ticket_id = quote["ticket_id"].lstrip("#")
        thread = get_ticket_ts(ticket_id)
        if thread:
            ai_response["quotes"][i]["link"] = "https://hackclub.slack.com/archives/C099P9FQQ91/p" + thread[:10] + thread[11:]
    VIBES_CACHE["content"] = ai_response
    VIBES_CACHE["created_at"] = datetime.now()
    return jsonify(ai_response), 200

@app.get("/analysis/rejection")
def analyze_rejection_reason():
    data = request.json
    cert_id = data.get("cert_id")

    logger.info(f"[rejection] looking up cert_id={cert_id!r} (type={type(cert_id).__name__})")
    cert_data = get_cert_rejection_info(cert_id)
    logger.info(f"[rejection] cert_data={cert_data!r}")
    if cert_data is None:
        return jsonify({"error": "cert not found"}), 404

    prompt = format_rejection_analysis_prompt(
        project_description=cert_data.get("description", ""),
        reviewer_feedback=cert_data.get("reviewFeedback", "")
    )
    response = get_ai_response(content=prompt, keys=["reason", "explanation"])

    if response["error"]:
        return jsonify(response), 500
    ai_response = response["content"]

    save_rejection_reason(cert_id, ai_response["reason"], ai_response["explanation"])

    return jsonify({
        "reason": ai_response["reason"],
        "explanation": ai_response["explanation"],
    }), 200



if __name__ == "__main__":
    try:
        reminder_thread = threading.Thread(target=history_loop, daemon=True)
        reminder_thread.start()
        print("Services up and running!")
        app.run(host='0.0.0.0', port=PORT, debug=False, use_reloader=False)
    except Exception as e:
        print(f"Error occurred whilst attempting to run SW-AI: {e}")
