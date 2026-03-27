-- CreateTable
CREATE TABLE `meta_posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` TEXT NOT NULL,
    `votes` INTEGER NOT NULL DEFAULT 0,
    `metaMessageTs` VARCHAR(50) NULL,
    `votesMessageTs` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
