from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room
from flask_cors import CORS
from globals import API_KEY, PORT, STAFF_CHANNEL, USER_CHANNEL, client, MACROS
from cache import cache

app = Flask(__name__)

CORS(app, origins="*", supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*", path='/ws/socket.io', async_mode='threading', engineio_logger=False, logger=False)

@app.before_request
def require_api_key():
    if request.headers.get("X-API-Key") != API_KEY and request.path not in ["/health", "/ticket/assigned", "/macros"]:
        return jsonify({"error": "Unauthed"}), 401

@app.get('/health')
def health():
    return jsonify({'ok': True, 'bot': 'alive'})


@app.get('/macros')
def get_macros():
    return jsonify(MACROS)


@app.post('/ws/notify')
def ws_notify():
    data = request.json
    ticket_id = data.get('ticketId')
    if ticket_id:
        socketio.emit('new_message', {'ticketId': ticket_id}, room=f'ticket-{ticket_id}')
    return jsonify({'ok': True})


@app.post('/bridge/send-reply')
def bridge_send_reply():
    data = request.json or {}
    ticket_id = data.get('ticketId')
    staff_name = data.get('staffName', 'Staff')
    staff_avatar = data.get('staffAvatar')
    message = data.get('message', '')
    send_to_user = data.get('sendToUser', False)
    user_thread_ts = data.get('userThreadTs')
    staff_thread_ts = data.get('staffThreadTs')
    files = data.get('files', [])

    if not ticket_id or not staff_thread_ts:
        return jsonify({'ok': False, 'error': 'missing fields'}), 400

    try:
        blocks = []
        if message:
            blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": message}})
        for f in files:
            if f.get('mimetype', '').startswith('image/'):
                blocks.append({"type": "image", "image_url": f["url"], "alt_text": f.get("name", "file")})
            else:
                blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": f"<{f['url']}|{f.get('name', 'file')}>"}})

        fallback = message or (files[0]["name"] if files else "📎 attachment")

        if send_to_user and user_thread_ts:
            client.chat_postMessage(
                channel=USER_CHANNEL,
                thread_ts=user_thread_ts,
                blocks=blocks,
                text=fallback,
                username=f'{staff_name} | Shipwrights Team',
                icon_url=staff_avatar
            )

        prefix = "[→user] " if send_to_user else ""
        client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=staff_thread_ts,
            blocks=blocks,
            text=f'{prefix}{fallback}',
            username=staff_name,
            icon_url=staff_avatar
        )

        socketio.emit('new_message', {'ticketId': ticket_id}, room=f'ticket-{ticket_id}')
    except Exception as e:
        print(f'bridge send failed: {e}')
        return jsonify({'ok': False, 'error': str(e)}), 500

    return jsonify({'ok': True})


@app.post('/bridge/close-ticket')
def bridge_close_ticket():
    data = request.json or {}
    ticket_id = data.get('ticketId')
    user_thread_ts = data.get('userThreadTs')
    staff_thread_ts = data.get('staffThreadTs')
    staff_name = data.get('staffName', 'Staff')

    if not ticket_id or not staff_thread_ts:
        return jsonify({'ok': False, 'error': 'missing fields'}), 400

    try:
        cache.close_ticket(ticket_id)
    except Exception as e:
        print(f'cache close failed: {e}')

    try:
        client.chat_postMessage(
            channel=STAFF_CHANNEL, thread_ts=staff_thread_ts,
            text=f'ticket sw-{ticket_id} was closed by {staff_name} from the dashboard'
        )
        if user_thread_ts:
            client.chat_postMessage(
                channel=USER_CHANNEL, thread_ts=user_thread_ts,
                text='Hey! This ticket has been marked as resolved. Shipwrights will no longer receive your messages. If you still have a question, feel free to open a new ticket!'
            )
        client.reactions_add(channel=STAFF_CHANNEL, timestamp=staff_thread_ts, name='checks-passed-octicon')
        if user_thread_ts:
            client.reactions_add(channel=USER_CHANNEL, timestamp=user_thread_ts, name='checks-passed-octicon')
    except Exception as e:
        print(f'close notify failed: {e}')

    socketio.emit('ticket_updated', {'ticketId': ticket_id}, room=f'ticket-{ticket_id}')
    return jsonify({'ok': True})


@app.post('/ws/note_added')
def note_added():
    data = request.json
    ship_id = data.get('shipId')
    if ship_id:
        socketio.emit('note_added', {'shipId': ship_id})
    return jsonify({'ok': True})


@app.post('/ticket/assigned')
def ticket_assigned():
    data = request.json or {}
    ticket_id = data.get('ticketId')
    staff_thread_ts = data.get('staffThreadTs')
    assigned_to = data.get('assignees', [])
    removed = data.get('removed', [])

    if not ticket_id or not staff_thread_ts:
        return jsonify({'ok': True})

    try:
        if assigned_to:
            names = ', '.join(f'<@{uid}>' for uid in assigned_to)
            client.chat_postMessage(
                channel=STAFF_CHANNEL,
                thread_ts=staff_thread_ts,
                text=f'ticket sw-{ticket_id} assigned to {names}'
            )
        if removed:
            names = ', '.join(f'<@{uid}>' for uid in removed)
            client.chat_postMessage(
                channel=STAFF_CHANNEL,
                thread_ts=staff_thread_ts,
                text=f'{names} unassigned from ticket sw-{ticket_id}'
            )
    except Exception as e:
        print(f'assign notify failed: {e}')

    socketio.emit('ticket_updated', {'ticketId': ticket_id}, room=f'ticket-{ticket_id}')
    return jsonify({'ok': True})


@socketio.on('join_ticket')
def on_join(data):
    ticket_id = data.get('ticketId')
    if ticket_id:
        tid = str(ticket_id).replace('sw-', '')
        join_room(f'ticket-{tid}')


def run_server():
    socketio.run(app, host='0.0.0.0', port=PORT, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
