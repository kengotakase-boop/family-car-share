import { Router } from "express";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";

import { cars, reservations, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { sendReservationLineNotification } from "../line";

const router = Router();

const VEHICLE_ID_TO_ALIASES: Record<string, string[]> = {
  "9853a6e5-9521-42b9-bb44-4d788e8bb427": ["LEXUS NX", "LEXUS", "\u30ec\u30af\u30b5\u30b9"],
  "2c34a12a-e014-4634-9a14-7194533280f9": ["ALPHARD", "\u30a2\u30eb\u30d5\u30a1\u30fc\u30c9"],
};

const USER_ID_TO_ALIASES: Record<string, string[]> = {
  "20f4fab9-e32d-4435-8b08-14a8ddccafd1": ["\u9ad8\u702c\u5065\u543e", "\u5065\u543e"],
  "d5a798ef-04d1-47f3-9465-83669d77422b": ["\u9ad8\u702c\u307e\u3069\u304b", "\u307e\u3069\u304b"],
  "772bbbf8-3a37-4175-98b5-b5139689e5c9": ["\u9ad8\u702c\u5065\u4e00\u90ce", "\u5065\u4e00\u90ce"],
  "1657baf8-5e3a-4311-8aae-86920e359fd0": ["\u9ad8\u702c\u82f1\u592a\u90ce", "\u82f1\u592a\u90ce"],
  "b55938b6-f4a9-4505-a0f2-b73f3618c4a2": ["\u9ad8\u702c\u5149\u592a\u90ce", "\u5149\u592a\u90ce"],
};

const postReservationSchema = z.object({
  vehicle_id: z.string().min(1),
  user_id: z.string().min(1),
  type: z.enum(["all_day", "time_range"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
  note: z.string().optional(),
});

function includesAlias(value: string | null, aliases: string[]) {
  const normalized = (value ?? "").toLocaleLowerCase();
  return aliases.some((alias) => normalized.includes(alias.toLocaleLowerCase()));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatLocalDate(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function formatLocalDateTime(value: Date) {
  return `${formatLocalDate(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}:00`;
}

function buildDate(value: string, time: string) {
  return new Date(`${value}T${time}:00`);
}

function normalizeReservationDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function hasSameLocalDate(value: Date, date: string) {
  return formatLocalDate(value) === date;
}

function formatReservationTime(isAllDay: boolean, startDate: Date, endDate: Date) {
  if (isAllDay) {
    return "終日";
  }

  return `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}-${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
}

async function resolveCar(vehicleId: string) {
  const db = await getDb();
  if (!db) return null;

  const aliases = VEHICLE_ID_TO_ALIASES[vehicleId] ?? [vehicleId];
  const rows = await db.select().from(cars);
  return rows.find((car) => includesAlias(car.name, aliases)) ?? null;
}

async function resolveUser(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const aliases = USER_ID_TO_ALIASES[userId] ?? [userId];
  const rows = await db.select().from(users);
  return rows.find((user) => includesAlias(user.name, aliases)) ?? null;
}

router.get("/", async (_req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "DATABASE_URL is not configured" });
    }

    const rows = await db
      .select({
        id: reservations.id,
        carId: reservations.carId,
        userId: reservations.userId,
        familyGroupId: reservations.familyGroupId,
        startDate: reservations.startDate,
        endDate: reservations.endDate,
        isAllDay: reservations.isAllDay,
        comment: reservations.comment,
        vehicleName: cars.name,
        userName: users.name,
      })
      .from(reservations)
      .leftJoin(cars, eq(reservations.carId, cars.id))
      .leftJoin(users, eq(reservations.userId, users.id))
      .orderBy(desc(reservations.startDate));

    return res.json(
      rows.map((row) => {
        const startDate = normalizeReservationDate(row.startDate);
        const endDate = normalizeReservationDate(row.endDate);

        return {
          id: row.id,
          vehicle_id: String(row.carId),
          user_id: String(row.userId),
          type: row.isAllDay ? "all_day" : "time_range",
          date: formatLocalDate(startDate),
          start_at: row.isAllDay ? null : formatLocalDateTime(startDate),
          end_at: row.isAllDay ? null : formatLocalDateTime(endDate),
          note: row.comment ?? "",
          vehicles: row.vehicleName ? { name: row.vehicleName } : null,
          users: row.userName ? { name: row.userName } : null,
        };
      }),
    );
  } catch (error) {
    console.error("[Reservations REST] Failed to list reservations:", error);
    return res.status(500).json({ error: "Failed to list reservations" });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "DATABASE_URL is not configured" });
    }

    const input = postReservationSchema.parse(req.body);
    const car = await resolveCar(input.vehicle_id);
    if (!car) {
      return res.status(400).json({
        error: `Could not resolve vehicle_id ${input.vehicle_id} to an existing car`,
      });
    }

    const user = await resolveUser(input.user_id);
    if (!user) {
      return res.status(400).json({
        error: `Could not resolve user_id ${input.user_id} to an existing user`,
      });
    }

    const isAllDay = input.type === "all_day";
    const startDate = isAllDay
      ? buildDate(input.date, "00:00")
      : new Date(input.start_at ?? "");
    const endDate = isAllDay
      ? buildDate(input.date, "23:59")
      : new Date(input.end_at ?? "");

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid start_at or end_at" });
    }

    if (!isAllDay && (!hasSameLocalDate(startDate, input.date) || !hasSameLocalDate(endDate, input.date))) {
      return res.status(400).json({ error: "start_at and end_at must be on the reservation date" });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ error: "end_at must be after start_at" });
    }

    const conflicts = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.carId, car.id),
          lt(reservations.startDate, endDate),
          gt(reservations.endDate, startDate),
        ),
      )
      .limit(1);

    if (conflicts.length > 0) {
      return res.status(409).json({ error: "Reservation time conflicts with an existing reservation" });
    }

    const result = await db.insert(reservations).values({
      carId: car.id,
      userId: user.id,
      familyGroupId: car.familyGroupId,
      startDate,
      endDate,
      isAllDay: isAllDay ? 1 : 0,
      comment: input.note ?? "",
    });

    const reservationId = Number(result[0].insertId);
    void sendReservationLineNotification("created", {
      carName: car.name,
      userName: user.name ?? String(user.id),
      date: input.date,
      time: formatReservationTime(isAllDay, startDate, endDate),
      comment: input.note ?? "",
    });

    return res.status(201).json({ id: reservationId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid reservation payload", details: error.flatten() });
    }

    console.error("[Reservations REST] Failed to create reservation:", error);
    return res.status(500).json({ error: "Failed to create reservation" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "DATABASE_URL is not configured" });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid reservation id" });
    }

    const reservationRows = await db
      .select({
        id: reservations.id,
        startDate: reservations.startDate,
        endDate: reservations.endDate,
        isAllDay: reservations.isAllDay,
        comment: reservations.comment,
        vehicleName: cars.name,
        userName: users.name,
      })
      .from(reservations)
      .leftJoin(cars, eq(reservations.carId, cars.id))
      .leftJoin(users, eq(reservations.userId, users.id))
      .where(eq(reservations.id, id))
      .limit(1);
    const deletedReservation = reservationRows[0];

    await db.delete(reservations).where(eq(reservations.id, id));
    if (deletedReservation) {
      const startDate = normalizeReservationDate(deletedReservation.startDate);
      const endDate = normalizeReservationDate(deletedReservation.endDate);
      const isAllDay = deletedReservation.isAllDay === 1;
      void sendReservationLineNotification("deleted", {
        carName: deletedReservation.vehicleName ?? String(id),
        userName: deletedReservation.userName ?? "",
        date: formatLocalDate(startDate),
        time: formatReservationTime(isAllDay, startDate, endDate),
        comment: deletedReservation.comment ?? "",
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("[Reservations REST] Failed to delete reservation:", error);
    return res.status(500).json({ error: "Failed to delete reservation" });
  }
});

export default router;
