import tempfile, requests, os
import helpers
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
from slack_sdk import WebClient
from dotenv import load_dotenv
load_dotenv()

USER_CHANNEL = os.getenv("USER_CHANNEL_ID")
STAFF_CHANNEL = os.getenv("STAFF_CHANNEL_ID")
API_KEY = os.getenv("API_KEY")
slack_client = WebClient(token=os.getenv("SLACK_BOT_TOKEN"))

app = Flask(__name__)

CORS(app, origins="*", supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*", path='/ws/socket.io', async_mode='threading', engineio_logger=False, logger=False)

@app.before_request
def require_api_key():
    if request.headers.get("X-API-Key") != API_KEY and request.path != "/health":
        return jsonify({"error": "Unauthed"}), 401

@app.get('/health')
def health():
    return jsonify({'ok': True, 'bot': 'alive'})


@app.post('/bridge/send-reply')
def send_reply():
    ip = request.remote_addr
    if not helpers.check_rate(ip):
        return jsonify({'error': 'slow down'}), 429

    data = request.json
    staff_name = data.get('staffName')
    staff_avatar = data.get('staffAvatar')
    message = data.get('message')
    send_to_user = data.get('sendToUser', False)
    user_thread_ts = data.get('userThreadTs')
    staff_thread_ts = data.get('staffThreadTs')
    files = data.get('files', [])

    if not all([staff_name, message, user_thread_ts, staff_thread_ts]):
        return jsonify({'error': 'missing shit'}), 400

    try:
        dest_ts_user = user_thread_ts
        dest_ts_staff = staff_thread_ts

        if files:
            for file_info in files:
                file_url = file_info.get('url')
                file_name = file_info.get('name')

                if not file_url or not file_name:
                    continue

                try:
                    file_resp = requests.get(file_url, timeout=10)
                    if not file_resp.ok:
                        continue

                    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file_name}") as tmp:
                        tmp.write(file_resp.content)
                        tmp_path = tmp.name

                    try:
                        if send_to_user:
                            upload_resp = slack_client.files_upload_v2(
                                channel=USER_CHANNEL,
                                thread_ts=user_thread_ts,
                                file=tmp_path,
                                filename=file_name,
                                initial_comment=f"< {staff_name} sent attachment >"
                            )
                            if upload_resp.get('ok') and upload_resp.get('file', {}).get('shares', {}).get('private',
                                                                                                           {}).get(
                                    USER_CHANNEL):
                                dest_ts_user = upload_resp['file']['shares']['private'][USER_CHANNEL][0]['ts']

                            slack_client.files_upload_v2(
                                channel=STAFF_CHANNEL,
                                thread_ts=staff_thread_ts,
                                file=tmp_path,
                                filename=file_name,
                                initial_comment=f"< {staff_name} sent attachment >"
                            )
                        else:
                            upload_resp = slack_client.files_upload_v2(
                                channel=STAFF_CHANNEL,
                                thread_ts=staff_thread_ts,
                                file=tmp_path,
                                filename=file_name,
                                initial_comment=f"< {staff_name} sent attachment >"
                            )
                            if upload_resp.get('ok') and upload_resp.get('file', {}).get('shares', {}).get('private',
                                                                                                           {}).get(
                                    STAFF_CHANNEL):
                                dest_ts_staff = upload_resp['file']['shares']['private'][STAFF_CHANNEL][0]['ts']
                    finally:
                        try:
                            os.unlink(tmp_path)
                        except:
                            pass
                except:
                    continue

        if message and message != '📎 attachment':
            if send_to_user:
                slack_client.chat_postMessage(
                    channel=USER_CHANNEL,
                    thread_ts=dest_ts_user,
                    text=message,
                    username=f"{staff_name} | Shipwrights Team",
                    icon_url=staff_avatar if staff_avatar else None
                )

                slack_client.chat_postMessage(
                    channel=STAFF_CHANNEL,
                    thread_ts=dest_ts_staff,
                    text=f"?{message}",
                    username=f"{staff_name} (sw dash)",
                    icon_url=staff_avatar if staff_avatar else None
                )
            else:
                slack_client.chat_postMessage(
                    channel=STAFF_CHANNEL,
                    thread_ts=dest_ts_staff,
                    text=message,
                    username=f"{staff_name} (sw dash)",
                    icon_url=staff_avatar if staff_avatar else None
                )

        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.post('/ws/notify')
def notify():
    data = request.json
    ticket_id = data.get('ticketId')

    if ticket_id:
        socketio.emit('new_message', {'ticketId': ticket_id})

    return jsonify({'ok': True})


@app.post('/ws/note_added')
def note_added():
    data = request.json
    ship_id = data.get('shipId')

    if ship_id:
        socketio.emit('note_added', {'shipId': ship_id}, room=f'ship_{ship_id}')

    return jsonify({'ok': True})



@app.post('/bridge/staff-note')
def staff_note():
    ip = request.remote_addr
    if not helpers.check_rate(ip):
        return jsonify({'error': 'slow down'}), 429

    data = request.json
    staff_thread_ts = data.get('staffThreadTs')
    staff_name = data.get('staffName')
    staff_avatar = data.get('staffAvatar')
    note = data.get('note')

    if not staff_thread_ts or not staff_name or not note:
        return jsonify({'error': 'missing shit'}), 400

    try:
        slack_client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=staff_thread_ts,
            text=f"📝 Internal note added to this ticket: _{note}_",
            username=f"{staff_name}",
            icon_url=staff_avatar if staff_avatar else None
        )
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.post('/bridge/close-ticket')
def close_ticket():
    ip = request.remote_addr
    if not helpers.check_rate(ip):
        return jsonify({'error': 'slow down'}), 429

    data = request.json
    user_thread_ts = data.get('userThreadTs')
    staff_thread_ts = data.get('staffThreadTs')
    staff_name = data.get('staffName')

    if not user_thread_ts or not staff_thread_ts:
        return jsonify({'error': 'missing shit'}), 400

    try:
        try:
            slack_client.reactions_add(
                channel=STAFF_CHANNEL,
                timestamp=staff_thread_ts,
                name="checks-passed-octicon"
            )
        except:
            pass

        try:
            slack_client.reactions_add(
                channel=USER_CHANNEL,
                timestamp=user_thread_ts,
                name="checks-passed-octicon"
            )
        except:
            pass

        slack_client.chat_postMessage(
            channel=STAFF_CHANNEL,
            thread_ts=staff_thread_ts,
            text=f"ticket closed via dash by {staff_name}"
        )

        slack_client.chat_postMessage(
            channel=USER_CHANNEL,
            thread_ts=user_thread_ts,
            text="This ticket has been resolved. If you have any more questions create a new ticket!"
        )

        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500




@socketio.on('join_ticket')
def join_ticket(data):
    ticket_id = data.get('ticketId')
    if ticket_id:
        join_room(f'ticket_{ticket_id}')
        emit('joined', {'ticketId': ticket_id})


@socketio.on('join_ship')
def join_ship(data):
    ship_id = data.get('shipId')
    if ship_id:
        join_room(f'ship_{ship_id}')
        emit('joined_ship', {'shipId': ship_id})



def run_server():
    port = int(os.getenv('PORT', 45100))
    socketio.run(app, host='0.0.0.0', port=port, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)