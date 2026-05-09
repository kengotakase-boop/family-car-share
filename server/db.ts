import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  familyGroups,
  familyMembers,
  cars,
  reservations,
  pushTokens,
  InsertFamilyGroup,
  InsertFamilyMember,
  InsertCar,
  InsertReservation,
  InsertPushToken,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
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

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== Family Groups ====================

export async function createFamilyGroup(data: InsertFamilyGroup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(familyGroups).values(data);
  return Number(result[0].insertId);
}

export async function getFamilyGroupByInviteCode(inviteCode: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(familyGroups).where(eq(familyGroups.inviteCode, inviteCode));
  return result[0] || null;
}

export async function getFamilyGroupById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(familyGroups).where(eq(familyGroups.id, id));
  return result[0] || null;
}

// ==================== Family Members ====================

export async function addFamilyMember(data: InsertFamilyMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(familyMembers).values(data);
  return Number(result[0].insertId);
}

export async function getFamilyMembersByGroupId(familyGroupId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(familyMembers).where(eq(familyMembers.familyGroupId, familyGroupId));
}

export async function getUserFamilyGroups(userId: number) {
  const db = await getDb();
  if (!db) return [];

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

  const result = await db.insert(cars).values(data);
  return Number(result[0].insertId);
}

export async function getCarsByFamilyGroup(familyGroupId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(cars).where(eq(cars.familyGroupId, familyGroupId));
}

export async function getCarById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(cars).where(eq(cars.id, id));
  return result[0] || null;
}

export async function updateCar(id: number, data: Partial<InsertCar>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(cars).set(data).where(eq(cars.id, id));
}

export async function deleteCar(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(cars).where(eq(cars.id, id));
}

// ==================== Reservations ====================

export async function createReservation(data: InsertReservation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reservations).values(data);
  return Number(result[0].insertId);
}

export async function getReservationsByFamilyGroup(familyGroupId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

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

  const result = await db.select().from(reservations).where(eq(reservations.id, id));
  return result[0] || null;
}

export async function updateReservation(id: number, data: Partial<InsertReservation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reservations).set(data).where(eq(reservations.id, id));
}

export async function deleteReservation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(reservations).where(eq(reservations.id, id));
}

// ==================== Push Tokens ====================

export async function savePushToken(data: InsertPushToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if token already exists
  const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, data.token));

  if (existing.length > 0) {
    // Update existing token
    await db.update(pushTokens).set({ userId: data.userId, platform: data.platform }).where(eq(pushTokens.token, data.token));
    return existing[0].id;
  } else {
    // Insert new token
    const result = await db.insert(pushTokens).values(data);
    return Number(result[0].insertId);
  }
}

export async function getPushTokensByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
}

export async function getPushTokensByFamilyGroup(familyGroupId: number) {
  const db = await getDb();
  if (!db) return [];

  const members = await getFamilyMembersByGroupId(familyGroupId);
  const userIds = members.map((m) => m.userId);

  if (userIds.length === 0) return [];

  const tokens = await Promise.all(userIds.map((userId) => getPushTokensByUserId(userId)));

  return tokens.flat();
}

export async function deletePushToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(pushTokens).where(eq(pushTokens.token, token));
}
