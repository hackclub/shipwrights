import json, logging, os, threading
from contextlib import asynccontextmanager
from urllib.parse import parse_qs
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from slack_sdk.signature import SignatureVerifier
import alerts, errors, raffle, summary, worker
from cache import cache
from globals import ENVIRONMENT, PORT, client
from handlers import (
    handle_claim_ticket, handle_create_meta, handle_delete_message, handle_delete_meta,
    handle_edit_message, handle_edited_message, handle_message, handle_meta_command,
    handle_modify_opt, handle_modify_votes, handle_open_create_meta, handle_rating_form,
    handle_reopen_ticket, handle_resolve_detected, handle_resolve_ticket, handle_send_paraphrased,
    handle_submit_feedback, handle_view_error,
)
from helpers import seen_already

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
dm_handler = errors.SlackDMErrorHandler(level=logging.ERROR)
dm_handler.setFormatter(logging.Formatter("%(asctime)s %(name)s: %(message)s"))
logging.getLogger().addHandler(dm_handler)

verifier = SignatureVerifier(os.getenv("SLACK_SIGNING_SECRET", ""))

COMMAND_HANDLERS = {
    "/metasw" if ENVIRONMENT == "PRODUCTION" else "/metastaging": handle_meta_command,
}

ACTION_HANDLERS = {
    "send_paraphrased": handle_send_paraphrased,
    "delete_message": handle_delete_message,
    "edit_message": handle_edit_message,
    "modify_opt": handle_modify_opt,
    "resolve_detected": handle_resolve_detected,
    "reopen_ticket": handle_reopen_ticket,
    "resolve_ticket": handle_resolve_ticket,
    "submit_feedback": handle_submit_feedback,
    "claim_ticket": handle_claim_ticket,
    "modify_votes": handle_modify_votes,
    "delete_meta": handle_delete_meta,
    "open_create_meta": handle_open_create_meta,
    "view_error": handle_view_error,
}

VIEW_HANDLERS = {
    "edited_message": handle_edited_message,
    "rating_form": handle_rating_form,
    "create_meta": handle_create_meta,
}


@asynccontextmanager
async def lifespan(_: FastAPI):
    cache.bot_user_id = client.auth_test()["user_id"]
    worker.load_and_replay()
    worker.task_runner.enqueue_meta_sticky_update()
    for target, name in [
        (summary.reminders_loop, "reminders"),
        (alerts.alerts_loop, "alerts"),
        (raffle.raffle_loop, "raffle"),
        (worker.task_runner.run, "worker"),
    ]:
        threading.Thread(target=target, daemon=True, name=name).start()
    yield


app = FastAPI(lifespan=lifespan)


async def verified_body(request: Request) -> bytes:
    body = await request.body()
    if not verifier.is_valid(
        body=body.decode(),
        timestamp=request.headers.get("X-Slack-Request-Timestamp", ""),
        signature=request.headers.get("X-Slack-Signature", ""),
    ):
        raise HTTPException(status_code=401)
    return body


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/slack/events")
async def slack_events(background: BackgroundTasks, request: Request):
    body = await request.body()
    payload = json.loads(body)
    if payload.get("type") == "url_verification":
        return JSONResponse({"challenge": payload["challenge"]})
    if not verifier.is_valid(
        body=body.decode(),
        timestamp=request.headers.get("X-Slack-Request-Timestamp", ""),
        signature=request.headers.get("X-Slack-Signature", ""),
    ):
        raise HTTPException(status_code=401)
    event = payload.get("event", {})
    if event.get("type") == "message":
        msg_id = event.get("client_msg_id") or event.get("event_ts") or ""
        if not seen_already(msg_id):
            background.add_task(handle_message, event)
    return JSONResponse({})


@app.post("/slack/actions")
async def slack_actions(background: BackgroundTasks, body: bytes = Depends(verified_body)):
    try:
        form = parse_qs(body.decode())
        payload = json.loads(form["payload"][0])
    except Exception:
        return JSONResponse({})
    ptype = payload.get("type")
    if ptype == "block_actions":
        handler = ACTION_HANDLERS.get(payload["actions"][0]["action_id"])
        if handler:
            background.add_task(handler, payload)
    elif ptype == "view_submission":
        handler = VIEW_HANDLERS.get(payload["view"]["callback_id"])
        if handler:
            background.add_task(handler, payload)
    return JSONResponse({})


@app.post("/slack/command")
async def slack_command(background: BackgroundTasks, body: bytes = Depends(verified_body)):
    form = parse_qs(body.decode())
    data = {k: v[0] for k, v in form.items()}
    handler = COMMAND_HANDLERS.get(data.get("command", ""))
    if handler:
        background.add_task(handler, data)
    return JSONResponse({})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
