ALTER TABLE `invite_codes` ADD COLUMN `device_hash` text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `key` text PRIMARY KEY NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `window_start` integer NOT NULL,
  `blocked_until` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `action` text NOT NULL,
  `actor_hash` text NOT NULL,
  `detail` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);
