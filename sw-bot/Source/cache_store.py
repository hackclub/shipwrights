import json, logging, os
from globals import CACHE_SNAPSHOT_PATH


def save(cache) -> None:
    data = cache.snapshot()
    tmp = CACHE_SNAPSHOT_PATH + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f)
        os.replace(tmp, CACHE_SNAPSHOT_PATH)
    except OSError as e:
        logging.error(f"cache_store save failed: {e}")


def load(cache) -> None:
    if not os.path.exists(CACHE_SNAPSHOT_PATH):
        return
    try:
        with open(CACHE_SNAPSHOT_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        logging.error(f"cache_store load failed: {e}")
        return
    cache.restore(data)
    logging.info("cache_store: snapshot restored")
