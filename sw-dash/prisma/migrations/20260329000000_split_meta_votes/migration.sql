-- AlterTable: replace votes with separate upvotes and downvotes
ALTER TABLE `meta_posts`
    ADD COLUMN `upvotes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `downvotes` INTEGER NOT NULL DEFAULT 0;

UPDATE `meta_posts` SET `upvotes` = GREATEST(`votes`, 0), `downvotes` = GREATEST(-`votes`, 0);

-- NOTE: Intentionally keeping the `votes` column for backward compatibility with existing consumers (e.g., sw-bot).
--       Once all consumers are migrated to use `upvotes` and `downvotes`, a separate migration can safely drop `votes`.
