-- AlterTable
ALTER TABLE `users` MODIFY `skills` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `ysws_reviews` MODIFY `devlogs` LONGTEXT NULL,
    MODIFY `commits` LONGTEXT NULL,
    MODIFY `decisions` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `metrics_history` MODIFY `output` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `sys_logs` MODIFY `metadata` LONGTEXT NULL,
    MODIFY `reqBody` LONGTEXT NULL,
    MODIFY `reqHeaders` LONGTEXT NULL,
    MODIFY `resBody` LONGTEXT NULL,
    MODIFY `resHeaders` LONGTEXT NULL,
    MODIFY `changes` LONGTEXT NULL;

-- CreateTable
CREATE TABLE `spot_check_session_certs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` INTEGER NOT NULL,
    `certId` INTEGER NOT NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `spot_check_session_certs_certId_idx`(`certId`),
    INDEX `spot_check_session_certs_sessionId_idx`(`sessionId`),
    UNIQUE INDEX `spot_check_session_certs_sessionId_certId_key`(`sessionId`, `certId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spot_check_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staffId` INTEGER NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pausedAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `totalSecondsAccrued` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `wrightId` INTEGER NULL,

    INDEX `spot_check_sessions_staffId_idx`(`staffId`),
    INDEX `spot_check_sessions_status_idx`(`status`),
    INDEX `spot_check_sessions_wrightId_idx`(`wrightId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `payout_reqs_adminId_fkey` ON `payout_reqs`(`adminId`);

-- CreateIndex
CREATE INDEX `sessions_userId_fkey` ON `sessions`(`userId`);

-- CreateIndex
CREATE INDEX `ship_certs_claimerId_fkey` ON `ship_certs`(`claimerId`);

-- CreateIndex
CREATE INDEX `ft_submitter_notes_staffId_fkey` ON `ft_submitter_notes`(`staffId`);

-- CreateIndex
CREATE INDEX `ticket_notes_authorId_fkey` ON `ticket_notes`(`authorId`);

-- CreateIndex
CREATE INDEX `spot_checks_resolvedBy_fkey` ON `spot_checks`(`resolvedBy`);

-- AddForeignKey
ALTER TABLE `spot_check_session_certs` ADD CONSTRAINT `spot_check_session_certs_certId_fkey` FOREIGN KEY (`certId`) REFERENCES `ship_certs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_check_session_certs` ADD CONSTRAINT `spot_check_session_certs_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `spot_check_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_check_sessions` ADD CONSTRAINT `spot_check_sessions_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_check_sessions` ADD CONSTRAINT `spot_check_sessions_wrightId_fkey` FOREIGN KEY (`wrightId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
