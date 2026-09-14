CREATE TABLE IF NOT EXISTS `invite_codes` (
  `code` text PRIMARY KEY NOT NULL,
  `activated_at` integer,
  `expires_at` integer,
  `usage_count` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_invite_codes_expires_at` ON `invite_codes` (`expires_at`);
