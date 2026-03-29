-- AlterTable: replace votes with separate upvotes and downvotes
ALTER TABLE `meta_posts`
    ADD COLUMN `upvotes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `downvotes` INTEGER NOT NULL DEFAULT 0;

UPDATE `meta_posts` SET `upvotes` = GREATEST(`votes`, 0), `downvotes` = GREATEST(-`votes`, 0);

ALTER TABLE `meta_posts` DROP COLUMN `votes`;
