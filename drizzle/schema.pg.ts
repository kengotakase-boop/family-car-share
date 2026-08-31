import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const userRole = pgEnum("family_car_share_user_role", ["user", "admin"]);
export const pushPlatform = pgEnum("family_car_share_push_platform", ["ios", "android", "web"]);

export const users = pgTable("family_car_share_users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export const familyGroups = pgTable("family_car_share_family_groups", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  inviteCode: varchar("inviteCode", { length: 32 }).notNull().unique(),
  createdBy: integer("createdBy")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const familyMembers = pgTable("family_car_share_family_members", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  familyGroupId: integer("familyGroupId")
    .notNull()
    .references(() => familyGroups.id, { onDelete: "cascade" }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joinedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const cars = pgTable("family_car_share_cars", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  familyGroupId: integer("familyGroupId")
    .notNull()
    .references(() => familyGroups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 50 }),
  plateNumber: varchar("plateNumber", { length: 50 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const reservations = pgTable("family_car_share_reservations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  carId: integer("carId")
    .notNull()
    .references(() => cars.id, { onDelete: "cascade" }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id),
  familyGroupId: integer("familyGroupId")
    .notNull()
    .references(() => familyGroups.id, { onDelete: "cascade" }),
  startDate: timestamp("startDate", { withTimezone: true }).notNull(),
  endDate: timestamp("endDate", { withTimezone: true }).notNull(),
  isAllDay: integer("isAllDay").default(0).notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const pushTokens = pgTable("family_car_share_push_tokens", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  platform: pushPlatform("platform").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type FamilyGroup = typeof familyGroups.$inferSelect;
export type InsertFamilyGroup = typeof familyGroups.$inferInsert;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = typeof familyMembers.$inferInsert;
export type Car = typeof cars.$inferSelect;
export type InsertCar = typeof cars.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;
export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;
