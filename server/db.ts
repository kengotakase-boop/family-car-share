import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type {
  InsertUser,
  InsertFamilyGroup,
  InsertFamilyMember,
  InsertCar,
  InsertReservation,
  InsertPushToken,
} from "../drizzle/schema";
import * as mysqlSchema from "../drizzle/schema";
import * as pgSchema from "../drizzle/schema.pg";
import { ENV } from "./_core/env";

type DbClient = any;

let _db: DbClient | null = null;
let _pgPool: Pool | null = null;

function isPostgresDatabase() {
  const value = ENV.databaseUrl || process.env.DATABASE_URL || "";
  return /^postgres(ql)?:\/\//i.test(value);
}

export function getTables() {
  return (isPostgresDatabase() ? pgSchema : mysqlSchema) as any;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (isPostgresDatabase()) {
        _pgPool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL.includes("supabase.co")
            ? { rejectUnauthorized: false }
            : undefined,
        });
        _db = drizzlePg(_pgPool);
      } else {
        _db = drizzleMysql(process.env.DATABASE_URL);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const { users } = getTables();
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    if (isPostgresDatabase()) {
      await (db as ReturnType<typeof drizzlePg>)
        .insert(users as typeof pgSchema.users)
        .values(values as typeof pgSchema.users.$inferInsert)
        .onConflictDoUpdate({
          target: (users as typeof pgSchema.users).openId,
          set: updateSet,
        });
    } else {
      await (db as ReturnType<typeof drizzleMysql>)
        .insert(users as typeof mysqlSchema.users)
        .values(values as typeof mysqlSchema.users.$inferInsert)
        .onDuplicateKeyUpdate({
          set: updateSet,
        });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const { users } = getTables();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== Family Groups ====================

export async function createFamilyGroup(data: InsertFamilyGroup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { familyGroups } = getTables();
  if (isPostgresDatabase()) {
    const result = await (db as ReturnType<typeof drizzlePg>)
      .insert(familyGroups as typeof pgSchema.familyGroups)
      .values(data as typeof pgSchema.familyGroups.$inferInsert)
      .returning({ id: (familyGroups as typeof pgSchema.familyGroups).id });
    return Number(result[0].id);
  }

  const result = await (db as ReturnType<typeof drizzleMysql>)
    .insert(familyGroups as typeof mysqlSchema.familyGroups)
    .values(data as typeof mysqlSchema.familyGroups.$inferInsert);
  return Number(result[0].insertId);
}

export async function getFamilyGroupByInviteCode(inviteCode: string) {
  const db = await getDb();
  if (!db) return null;

  const { familyGroups } = getTables();
  const result = await db.select().from(familyGroups).where(eq(familyGroups.inviteCode, inviteCode));
  return result[0] || null;
}

export async function getFamilyGroupById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const { familyGroups } = getTables();
  const result = await db.select().from(familyGroups).where(eq(familyGroups.id, id));
  return result[0] || null;
}

// ==================== Family Members ====================

export async function addFamilyMember(data: InsertFamilyMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { familyMembers } = getTables();
  if (isPostgresDatabase()) {
    const result = await (db as ReturnType<typeof drizzlePg>)
      .insert(familyMembers as typeof pgSchema.familyMembers)
      .values(data as typeof pgSchema.familyMembers.$inferInsert)
      .returning({ id: (familyMembers as typeof pgSchema.familyMembers).id });
    return Number(result[0].id);
  }

  const result = await (db as ReturnType<typeof drizzleMysql>)
    .insert(familyMembers as typeof mysqlSchema.familyMembers)
    .values(data as typeof mysqlSchema.familyMembers.$inferInsert);
  return Number(result[0].insertId);
}

export async function getFamilyMembersByGroupId(familyGroupId: number) {
  const db = await getDb();
  if (!db) return [];

  const { familyMembers } = getTables();
  return db.select().from(familyMembers).where(eq(familyMembers.familyGroupId, familyGroupId));
}

export async function getUserFamilyGroups(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { familyGroups, familyMembers } = getTables();
  const result = await db
    .select({
      id: familyGroups.id,
      name: familyGroups.name,
      inviteCode: familyGroups.inviteCode,
      createdBy: familyGroups.createdBy,
      createdAt: familyGroups.createdAt,
    })
    .from(familyMembers)
    .innerJoin(familyGroups, eq(familyMembers.familyGroupId, familyGroups.id))
    .where(eq(familyMembers.userId, userId));

  return result;
}

export async function isMemberOfFamily(userId: number, familyGroupId: number) {
  const db = await getDb();
  if (!db) return false;

  const { familyMembers } = getTables();
  const result = await db
    .select()
    .from(familyMembers)
    .where(and(eq(familyMembers.userId, userId), eq(familyMembers.familyGroupId, familyGroupId)));

  return result.length > 0;
}

// ==================== Cars ====================

export async function createCar(data: InsertCar) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { cars } = getTables();
  if (isPostgresDatabase()) {
    const result = await (db as ReturnType<typeof drizzlePg>)
      .insert(cars as typeof pgSchema.cars)
      .values(data as typeof pgSchema.cars.$inferInsert)
      .returning({ id: (cars as typeof pgSchema.cars).id });
    return Number(result[0].id);
  }

  const result = await (db as ReturnType<typeof drizzleMysql>)
    .insert(cars as typeof mysqlSchema.cars)
    .values(data as typeof mysqlSchema.cars.$inferInsert);
  return Number(result[0].insertId);
}

export async function getCarsByFamilyGroup(familyGroupId: number) {
  const db = await getDb();
  if (!db) return [];

  const { cars } = getTables();
  return db.select().from(cars).where(eq(cars.familyGroupId, familyGroupId));
}

export async function getCarById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const { cars } = getTables();
  const result = await db.select().from(cars).where(eq(cars.id, id));
  return result[0] || null;
}

export async function updateCar(id: number, data: Partial<InsertCar>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { cars } = getTables();
  await db.update(cars).set(data).where(eq(cars.id, id));
}

export async function deleteCar(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { cars } = getTables();
  await db.delete(cars).where(eq(cars.id, id));
}

// ==================== Reservations ====================

export async function createReservation(data: InsertReservation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { reservations } = getTables();
  if (isPostgresDatabase()) {
    const result = await (db as ReturnType<typeof drizzlePg>)
      .insert(reservations as typeof pgSchema.reservations)
      .values(data as typeof pgSchema.reservations.$inferInsert)
      .returning({ id: (reservations as typeof pgSchema.reservations).id });
    return Number(result[0].id);
  }

  const result = await (db as ReturnType<typeof drizzleMysql>)
    .insert(reservations as typeof mysqlSchema.reservations)
    .values(data as typeof mysqlSchema.reservations.$inferInsert);
  return Number(result[0].insertId);
}

export async function getReservationsByFamilyGroup(familyGroupId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const { reservations } = getTables();
  let query = db.select().from(reservations).where(eq(reservations.familyGroupId, familyGroupId));

  if (startDate && endDate) {
    query = db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.familyGroupId, familyGroupId),
          gte(reservations.startDate, startDate),
          lte(reservations.endDate, endDate)
        )
      );
  }

  return query.orderBy(desc(reservations.startDate));
}

export async function getReservationById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const { reservations } = getTables();
  const result = await db.select().from(reservations).where(eq(reservations.id, id));
  return result[0] || null;
}

export async function updateReservation(id: number, data: Partial<InsertReservation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { reservations } = getTables();
  await db.update(reservations).set(data).where(eq(reservations.id, id));
}

export async function deleteReservation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { reservations } = getTables();
  await db.delete(reservations).where(eq(reservations.id, id));
}

// ==================== Push Tokens ====================

export async function savePushToken(data: InsertPushToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { pushTokens } = getTables();
  // Check if token already exists
  const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, data.token));

  if (existing.length > 0) {
    // Update existing token
    await db.update(pushTokens).set({ userId: data.userId, platform: data.platform }).where(eq(pushTokens.token, data.token));
    return existing[0].id;
  } else {
    // Insert new token
    if (isPostgresDatabase()) {
      const result = await (db as ReturnType<typeof drizzlePg>)
        .insert(pushTokens as typeof pgSchema.pushTokens)
        .values(data as typeof pgSchema.pushTokens.$inferInsert)
        .returning({ id: (pushTokens as typeof pgSchema.pushTokens).id });
      return Number(result[0].id);
    }

    const result = await (db as ReturnType<typeof drizzleMysql>)
      .insert(pushTokens as typeof mysqlSchema.pushTokens)
      .values(data as typeof mysqlSchema.pushTokens.$inferInsert);
    return Number(result[0].insertId);
  }
}

export async function getPushTokensByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { pushTokens } = getTables();
  return db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
}

export async function getPushTokensByFamilyGroup(familyGroupId: number) {
  const db = await getDb();
  if (!db) return [];

  const members = await getFamilyMembersByGroupId(familyGroupId);
  const userIds = members.map((m: { userId: number }) => m.userId);

  if (userIds.length === 0) return [];

  const tokens = await Promise.all(userIds.map((userId: number) => getPushTokensByUserId(userId)));

  return tokens.flat();
}

export async function deletePushToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { pushTokens } = getTables();
  await db.delete(pushTokens).where(eq(pushTokens.token, token));
}
