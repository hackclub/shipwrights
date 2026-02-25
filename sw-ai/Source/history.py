import schedule, time, requests, json
import helpers
from db import save_metrics_history, get_recent_tickets
from datetime import datetime

AI_MODEL = "google/gemini-3-flash-preview"


def save_metrics():
    now = datetime.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    for_date = today.strftime('%Y-%m-%d')

    try:
        resp = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {helpers.OPENROUTER_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": AI_MODEL,
                "max_tokens": 1000,
                "messages": [
                    {
                        "role": "user",
                        "content": helpers.format_vibes_message(get_recent_tickets())
                    }
                ]
            },
            timeout=60
        )
        resp.raise_for_status()
        result = resp.json()
    except Exception as e:
        print(f"Error saving metrics: {e}")
        return None

    try:
        content = None
        if isinstance(result, dict) and result.get('choices'):
            choice = result['choices'][0]
            if isinstance(choice, dict):
                msg = choice.get('message')
                if isinstance(msg, dict):
                    content = msg.get('content')
                if not content:
                    content = choice.get('text') or choice.get('message')
        if not content and isinstance(result, str):
            content = result

        if not content:
            return None

        cleaned = helpers.clean_json_response(content)
        ai_response = json.loads(cleaned)
    except Exception as e:
        print(f"Error saving metrics: {e}")
        return None

    payload = {
        'for_date': for_date,
        'generated_at': now.isoformat(),
        'output': ai_response,
    }

    try:
        saved = save_metrics_history(payload, created_at=today)
        return saved
    except Exception as e:
        print(f"Error saving metrics: {e}")
        return None


def history_loop():
    schedule.every().day.at("12:15", "US/Eastern").do(save_metrics)
    while True:
        schedule.run_pending()
        time.sleep(30)