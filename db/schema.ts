import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const inviteCodes = sqliteTable("invite_codes", {
  code: text("code").primaryKey(),
  activatedAt: integer("activated_at"),
  expiresAt: integer("expires_at"),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  deviceHash: text("device_hash"),
});

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), attempts: integer("attempts").notNull().default(0),
  windowStart: integer("window_start").notNull(), blockedUntil: integer("blocked_until"),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }), action: text("action").notNull(),
  actorHash: text("actor_hash").notNull(), detail: text("detail").notNull().default(""), createdAt: integer("created_at").notNull(),
});
