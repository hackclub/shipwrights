import os, requests, json, logging
import db, helpers
import flask
from flask import jsonify, request
from dotenv import load_dotenv

load_dotenv()

PORT = 45200
SW_API_KEY = os.environ.get("SW_API_KEY")
AI_MODEL = "google/gemini-3-flash-preview"

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

app = flask.Flask(__name__)

@app.before_request
def require_api_key():
    if request.headers.get("X-API-Key") != SW_API_KEY and request.path != "/health":
        return jsonify({"error": "unauthorized please check your swai key"}), 401

@app.get("/health")
def health():
    return jsonify({"status": "ok", "message": "up and running!"}), 200


@app.get("/tickets/summery")
def ticket_summery():
    ticket_id = request.json.get("ticket_id")
    logger.info(f"Processing ticket_id: {ticket_id}")
    ticket_messages = db.get_ticket_messages(ticket_id)
    ticket_question = db.get_ticket_question(ticket_id)
    logger.info(f"Ticket messages count: {len(ticket_messages) if ticket_messages else 0}")
    logger.info(f"Ticket question: {ticket_question}")

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {helpers.OPENROUTER_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": AI_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": helpers.format_summary_prompt(ticket_messages, ticket_question)
                    }
                ]
            },
            timeout=30
        )
        logger.info(f"OpenRouter status code: {response.status_code}")
        logger.info(f"OpenRouter response headers: {dict(response.headers)}")
        logger.info(f"OpenRouter raw response: {response.text[:1000]}")
        response.raise_for_status()
        result = response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response status: {e.response.status_code}")
            logger.error(f"Response body: {e.response.text}")
        return jsonify({"error": f"API request failed: {str(e)}"}), 500

    if "error" in result:
        logger.error(f"OpenRouter returned error: {result['error']}")
        return jsonify({"error": result["error"]}), 500

    if "choices" not in result or not result["choices"]:
        logger.error(f"Unexpected API response structure: {result}")
        return jsonify({"error": "Unexpected API response", "response": result}), 500

    content = result["choices"][0]["message"]["content"]
    logger.info(f"AI content received: {content[:500] if content else 'EMPTY'}")

    if not content or not content.strip():
        logger.error("Empty response from AI")
        return jsonify({"error": "Empty response from AI"}), 500

    try:
        cleaned_content = helpers.clean_json_response(content)
        ai_response = json.loads(cleaned_content)
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        logger.error(f"Raw content that failed to parse: {content}")
        return jsonify({"error": "AI returned invalid JSON", "raw_content": content}), 500

    if not all(key in ai_response for key in ['action', 'status', 'summary']):
        logger.error(f"Missing required fields. Got: {ai_response.keys()}")
        return jsonify({"error": "Missing required fields in AI response", "raw_content": content}), 500

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
    ticket_messages = db.get_ticket_messages(ticket_id)
    ticket_question = db.get_ticket_question(ticket_id)
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {helpers.OPENROUTER_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": AI_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": helpers.format_completion_prompt(ticket_messages=ticket_messages, ticket_question=ticket_question, message=message)
                    }
                ]
            },
            timeout=30
        )
        logger.info(f"OpenRouter status code: {response.status_code}")
        logger.info(f"OpenRouter response headers: {dict(response.headers)}")
        logger.info(f"OpenRouter raw response: {response.text[:1000]}")
        response.raise_for_status()
        result = response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response status: {e.response.status_code}")
            logger.error(f"Response body: {e.response.text}")
        return jsonify({"error": f"API request failed: {str(e)}"}), 500

    if "error" in result:
        logger.error(f"OpenRouter returned error: {result['error']}")
        return jsonify({"error": result["error"]}), 500

    if "choices" not in result or not result["choices"]:
        logger.error(f"Unexpected API response structure: {result}")
        return jsonify({"error": "Unexpected API response", "response": result}), 500

    content = result["choices"][0]["message"]["content"]
    logger.info(f"AI content received: {content[:500] if content else 'EMPTY'}")

    if not content or not content.strip():
        logger.error("Empty response from AI")
        return jsonify({"error": "Empty response from AI"}), 500

    try:
        cleaned_content = helpers.clean_json_response(content)
        ai_response = json.loads(cleaned_content)
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        logger.error(f"Raw content that failed to parse: {content}")
        return jsonify({"error": "AI returned invalid JSON", "raw_content": content}), 500

    if not all(key in ai_response for key in ['paraphrased']):
        logger.error(f"Missing required fields. Got: {ai_response.keys()}")
        return jsonify({"error": "Missing required fields in AI response", "raw_content": content}), 500

    logger.info(f"Successfully processed ticket {ticket_id}")
    return jsonify({
        "paraphrased": ai_response['paraphrased'],
    }), 200

@app.get("/tickets/detect")
def detect_issue():
    ticket_id = request.json.get("ticket_id")
    logger.info(f"Processing ticket_id: {ticket_id}")
    ticket_messages = db.get_ticket_messages(ticket_id)
    ticket_question = db.get_ticket_question(ticket_id)
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {helpers.OPENROUTER_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": AI_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": helpers.format_detection_prompt(ticket_messages=ticket_messages,
                                                                    ticket_question=ticket_question)
                    }
                ]
            },
            timeout=30
        )
        logger.info(f"OpenRouter status code: {response.status_code}")
        logger.info(f"OpenRouter response headers: {dict(response.headers)}")
        logger.info(f"OpenRouter raw response: {response.text[:1000]}")
        response.raise_for_status()
        result = response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response status: {e.response.status_code}")
            logger.error(f"Response body: {e.response.text}")
        return jsonify({"error": f"API request failed: {str(e)}"}), 500

    if "error" in result:
        logger.error(f"OpenRouter returned error: {result['error']}")
        return jsonify({"error": result["error"]}), 500

    if "choices" not in result or not result["choices"]:
        logger.error(f"Unexpected API response structure: {result}")
        return jsonify({"error": "Unexpected API response", "response": result}), 500

    content = result["choices"][0]["message"]["content"]
    logger.info(f"AI content received: {content[:500] if content else 'EMPTY'}")

    if not content or not content.strip():
        logger.error("Empty response from AI")
        return jsonify({"error": "Empty response from AI"}), 500

    try:
        cleaned_content = helpers.clean_json_response(content)
        ai_response = json.loads(cleaned_content)
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        logger.error(f"Raw content that failed to parse: {content}")
        return jsonify({"error": "AI returned invalid JSON", "raw_content": content}), 500

    if not all(key in ai_response for key in ['detection']):
        logger.error(f"Missing required fields. Got: {ai_response.keys()}")
        return jsonify({"error": "Missing required fields in AI response", "raw_content": content}), 500

    logger.info(f"Successfully processed ticket {ticket_id}")
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
    result = helpers.check_type(data)
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

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {helpers.OPENROUTER_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": AI_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": helpers.format_project_summary_prompt(
                            project_name, project_type, readme_content, demo_url, repo_url
                        )
                    }
                ]
            },
            timeout=60
        )
        logger.info(f"OpenRouter status code: {response.status_code}")
        response.raise_for_status()
        result = response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response status: {e.response.status_code}")
            logger.error(f"Response body: {e.response.text}")
        return jsonify({"error": f"API request failed: {str(e)}"}), 500

    if "error" in result:
        logger.error(f"OpenRouter returned error: {result['error']}")
        return jsonify({"error": result["error"]}), 500

    if "choices" not in result or not result["choices"]:
        logger.error(f"Unexpected API response structure: {result}")
        return jsonify({"error": "Unexpected API response", "response": result}), 500

    content = result["choices"][0]["message"]["content"]
    logger.info(f"AI content received: {content[:500] if content else 'EMPTY'}")

    if not content or not content.strip():
        logger.error("Empty response from AI")
        return jsonify({"error": "Empty response from AI"}), 500

    try:
        cleaned_content = helpers.clean_json_response(content)
        ai_response = json.loads(cleaned_content)
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        logger.error(f"Raw content that failed to parse: {content}")
        return jsonify({"error": "AI returned invalid JSON", "raw_content": content}), 500

    if not all(key in ai_response for key in ['summary']):
        logger.error(f"Missing required fields. Got: {ai_response.keys()}")
        return jsonify({"error": "Missing required fields in AI response", "raw_content": content}), 500

    return jsonify(ai_response), 200


if __name__ == "__main__":
    try:
        print("Services up and running!")
        app.run(host='0.0.0.0', port=PORT, debug=False, use_reloader=False)
    except Exception as e:
        print(f"Error occurred whilst attempting to run SWAI: {e}")
