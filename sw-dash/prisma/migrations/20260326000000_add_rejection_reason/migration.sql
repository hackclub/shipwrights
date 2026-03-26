-- AlterTable
ALTER TABLE `ship_certs`
  ADD COLUMN `rejectionReason` VARCHAR(64) NULL,
  ADD COLUMN `rejectionExplanation` TEXT NULL;
