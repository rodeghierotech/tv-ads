import { pgTable, uuid, text, integer, timestamp, pgEnum, boolean, index, check } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------- Better Auth ----------
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  issuer: text("issuer").notNull(),
  password: text("password"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------- Domínio ----------
export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
export const tvStatusEnum = pgEnum("tv_status", ["online", "offline"]);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: mediaTypeEnum("type").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"), // segundos; null = vídeo usa duração real
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const playlist = pgTable("playlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const playlistItem = pgTable("playlist_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  playlistId: uuid("playlist_id").notNull().references(() => playlist.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  durationOverride: integer("duration_override"),
});

export const tv = pgTable("tv", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  location: text("location"),
  pairingCode: text("pairing_code").notNull().unique(),
  paired: boolean("paired").notNull().default(false),
  status: tvStatusEnum("status").notNull().default("offline"),
  lastHeartbeat: timestamp("last_heartbeat"),
  playlistId: uuid("playlist_id").references(() => playlist.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tvSchedule = pgTable("tv_schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  tvId: uuid("tv_id").notNull().references(() => tv.id, { onDelete: "cascade" }),
  playlistId: uuid("playlist_id").notNull().references(() => playlist.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  days: integer("days").array().notNull(),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("tv_schedule_tv_id_idx").on(table.tvId),
  check("tv_schedule_minutes_check", sql`${table.startMinute} >= 0 AND ${table.startMinute} < ${table.endMinute} AND ${table.endMinute} <= 1440`),
  check("tv_schedule_days_check", sql`cardinality(${table.days}) BETWEEN 1 AND 7 AND ${table.days} <@ ARRAY[0,1,2,3,4,5,6]::integer[] AND array_position(${table.days}, NULL) IS NULL`),
]);

// ---------- Relations ----------
export const tvScheduleRelations = relations(tvSchedule, ({ one }) => ({
  tv: one(tv, { fields: [tvSchedule.tvId], references: [tv.id] }),
  playlist: one(playlist, { fields: [tvSchedule.playlistId], references: [playlist.id] }),
}));

export const playlistRelations = relations(playlist, ({ many }) => ({
  items: many(playlistItem),
  tvs: many(tv),
}));

export const playlistItemRelations = relations(playlistItem, ({ one }) => ({
  playlist: one(playlist, { fields: [playlistItem.playlistId], references: [playlist.id] }),
  media: one(media, { fields: [playlistItem.mediaId], references: [media.id] }),
}));

export const tvRelations = relations(tv, ({ one }) => ({
  playlist: one(playlist, { fields: [tv.playlistId], references: [playlist.id] }),
}));

export const mediaRelations = relations(media, ({ many }) => ({
  playlistItems: many(playlistItem),
}));
