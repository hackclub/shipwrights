import logging, uuid, queue
from typing import Callable
from slack_sdk.errors import SlackApiError
import blocks, cache, db, task_journal
from globals import META_CHANNEL, client
from helpers import find_meta_sticky_from_history
# from helpers import find_sticky_from_history  # user sticky

logger = logging.getLogger("worker")

write_queue: queue.Queue = queue.Queue()

TASK_REGISTRY: dict[str, Callable] = {
    f"db.{name}": getattr(db, name)
    for name in (
        "save_ticket", "save_message", "save_error",
        "close_ticket", "open_ticket", "claim_ticket",
        "add_stardust", "update_ticket_user_opt", "create_ticket_user",
        "save_feedback", "update_meta_votes", "save_meta",
        "save_resolve_message_ts", "mark_feedback_requested",
    )
}


def enqueue(fn: Callable, *args, **kwargs):
    task_id = str(uuid.uuid4())
    task_journal.record_enqueue(task_id, f"{fn.__module__}.{fn.__name__}", args, kwargs)
    write_queue.put((task_id, fn, args, kwargs))


def load_and_replay():
    pending = task_journal.load_pending()
    task_journal.compact()
    replayed = 0
    for task in pending:
        fn = TASK_REGISTRY.get(task["fn"])
        if fn is None:
            logger.warning(f"load_and_replay: unknown function {task['fn']!r}, skipping")
            continue
        task_id = str(uuid.uuid4())
        task_journal.record_enqueue(task_id, task["fn"], task["args"], task.get("kwargs", {}))
        write_queue.put((task_id, fn, task["args"], task.get("kwargs", {})))
        replayed += 1
    if replayed:
        logger.info(f"Replayed {replayed} pending tasks from journal")


class Worker:
    def __init__(self):
        self.tasks: list = []

    # def enqueue_sticky_message_update(self):  # user sticky
    #     if "update_sticky_message" not in self.tasks:
    #         self.tasks.append("update_sticky_message")

    def enqueue_meta_sticky_update(self):
        if "update_meta_sticky" not in self.tasks:
            self.tasks.append("update_meta_sticky")

    # def update_sticky_message(self):  # user sticky
    #     c = cache.cache
    #     if not c.sticky_message_ts:
    #         history = client.conversations_history(channel=USER_CHANNEL, limit=5)["messages"]
    #         c.sticky_message_ts = find_sticky_from_history(history)
    #         if c.sticky_message_ts:
    #             logger.info(f"Located user sticky via history fallback ts={c.sticky_message_ts}")
    #     if c.sticky_message_ts:
    #         try:
    #             client.chat_delete(ts=c.sticky_message_ts, channel=USER_CHANNEL)
    #         except SlackApiError as e:
    #             logger.warning(f"Could not delete user sticky ts={c.sticky_message_ts} error={e.response['error']}")
    #             c.sticky_message_ts = None
    #     try:
    #         resp = client.chat_postMessage(channel=USER_CHANNEL, text="Create Help Ticket Now!", blocks=blocks.aide_message())
    #         c.sticky_message_ts = resp["ts"]
    #         logger.info(f"User sticky updated ts={resp['ts']}")
    #     except SlackApiError as e:
    #         logger.error(f"Failed to post user sticky error={e.response['error']}")

    def update_meta_sticky(self):
        c = cache.cache
        if not c.meta_sticky_ts:
            history = client.conversations_history(channel=META_CHANNEL, limit=10)["messages"]
            c.meta_sticky_ts = find_meta_sticky_from_history(history)
            if c.meta_sticky_ts:
                logger.info(f"Located meta sticky via history fallback ts={c.meta_sticky_ts}")

        if c.meta_sticky_ts:
            try:
                client.chat_delete(ts=c.meta_sticky_ts, channel=META_CHANNEL)
            except SlackApiError as e:
                logger.warning(f"Could not delete meta sticky ts={c.meta_sticky_ts} error={e.response['error']}")
                c.meta_sticky_ts = None

        try:
            resp = client.chat_postMessage(channel=META_CHANNEL, text="Create Meta Post", blocks=blocks.meta_create_button())
            c.meta_sticky_ts = resp["ts"]
            logger.info(f"Meta sticky updated ts={resp['ts']}")
        except SlackApiError as e:
            logger.error(f"Failed to post meta sticky error={e.response['error']}")

    def run(self):
        while True:
            try:
                task_id, fn, args, kwargs = write_queue.get(timeout=0.1)
                task_journal.record_start(task_id)
                try:
                    fn(*args, **kwargs)
                except Exception as e:
                    logger.exception(f"write task {fn.__name__} failed: {e}")
                finally:
                    task_journal.record_done(task_id)
                    write_queue.task_done()
            except queue.Empty:
                working_copy, self.tasks = self.tasks, []
                for task in working_copy:
                    try:
                        # if task == "update_sticky_message":  # user sticky
                        #     self.update_sticky_message()
                        if task == "update_meta_sticky":
                            pass
                            #self.update_meta_sticky()
                    except Exception as e:
                        logger.exception(f"Unhandled error in task={task}: {e}")


task_runner = Worker()
