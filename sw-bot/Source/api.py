from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from globals import API_KEY
from globals import PORT

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


@app.post('/ws/note_added')
def note_added():
    data = request.json
    ship_id = data.get('shipId')

    if ship_id:
        socketio.emit('note_added', {'shipId': ship_id})

    return jsonify({'ok': True})


def run_server():
    socketio.run(app, host='0.0.0.0', port=PORT, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)