import contextlib, logging, threading, uuid
import blocks, db, worker
from globals import ERROR_DM_USER, client

error_store: dict[str, str] = {}
_store_lock = threading.Lock()


class SlackDMErrorHandler(logging.Handler):
    def emit(self, record):
        if not ERROR_DM_USER:
            return
        error_id = str(uuid.uuid4())
        full = self.format(record)
        with _store_lock:
            error_store[error_id] = full
        short = record.getMessage()[:150]
        worker.enqueue(db.save_error, record.levelname, record.name, short, full)
        with contextlib.suppress(Exception):
            client.chat_postMessage(
                channel=ERROR_DM_USER,
                text=f"{record.levelname} in {record.name}: {short}",
                blocks=blocks.error_dm(record.levelname, record.name, short, error_id),
            )
