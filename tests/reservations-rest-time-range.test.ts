import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import reservationsRouter from "../server/routes/reservations";

const state = vi.hoisted(() => ({
  rows: [] as {
    id: number;
    carId: number;
    userId: number;
    familyGroupId: number;
    startDate: Date;
    endDate: Date;
    isAllDay: number;
    comment: string;
  }[],
  nextId: 1,
  cars: { id: "id", name: "name", familyGroupId: "familyGroupId" },
  users: { id: "id", name: "name" },
  reservations: {
    id: "id", carId: "carId", userId: "userId", familyGroupId: "familyGroupId",
    startDate: "startDate", endDate: "endDate", isAllDay: "isAllDay", comment: "comment",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (column: string, value: unknown) => (row: Record<string, unknown>) => row[column] === value,
  lt: (column: string, value: Date) => (row: Record<string, unknown>) => (row[column] as Date) < value,
  gt: (column: string, value: Date) => (row: Record<string, unknown>) => (row[column] as Date) > value,
  and: (...conditions: ((row: Record<string, unknown>) => boolean)[]) =>
    (row: Record<string, unknown>) => conditions.every((condition) => condition(row)),
  desc: () => undefined,
}));

vi.mock("../server/db", () => ({
  getTables: () => ({ cars: state.cars, users: state.users, reservations: state.reservations }),
  getDb: async () => ({
    select: () => ({
      from: (table: unknown) => {
        if (table === state.cars) return Promise.resolve([{ id: 1, name: "LEXUS NX", familyGroupId: 1 }]);
        if (table === state.users) return Promise.resolve([{ id: 2, name: "高瀬健吾" }]);
        const query = {
          where: (predicate: (row: Record<string, unknown>) => boolean) => ({
            limit: async (count: number) => state.rows.filter(predicate).slice(0, count),
          }),
          leftJoin: () => query,
          orderBy: async () => state.rows.map((row) => ({
            ...row, vehicleName: "LEXUS NX", userName: "高瀬健吾",
          })),
        };
        return query;
      },
    }),
  }),
  createReservation: async (data: typeof state.rows[number]) => {
    const id = state.nextId++;
    state.rows.push({ ...data, id });
    return id;
  },
}));

vi.mock("../server/line", () => ({ sendReservationLineNotification: async () => undefined }));

const vehicleId = "9853a6e5-9521-42b9-bb44-4d788e8bb427";
const userId = "20f4fab9-e32d-4435-8b08-14a8ddccafd1";
let server: Server;
let baseUrl: string;

async function post(date: string, type: "all_day" | "time_range", start: string | null, end: string | null) {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicle_id: vehicleId,
      user_id: userId,
      type,
      date,
      start_at: start === null ? null : `${date}T${start}:00`,
      end_at: end === null ? null : `${date}T${end}:00`,
      note: "",
    }),
  });
  return { status: response.status, body: await response.json() };
}

describe("reservation REST time range in UTC runtime", () => {
  beforeAll(async () => {
    process.env.TZ = "UTC";
    const app = express();
    app.use(express.json());
    app.use("/api/reservations", reservationsRouter);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  beforeEach(() => {
    state.rows.length = 0;
    state.nextId = 1;
  });

  it("preserves all-day registration and GET output", async () => {
    const result = await post("2027-03-16", "all_day", null, null);
    expect(result.status).toBe(201);
    expect(state.rows[0].isAllDay).toBe(1);
    expect(state.rows[0].startDate.toISOString()).toBe("2027-03-15T15:00:00.000Z");

    const response = await fetch(`${baseUrl}/api/reservations`);
    const rows = await response.json();
    expect(response.status).toBe(200);
    expect(rows[0]).toMatchObject({ date: "2027-03-16", type: "all_day", start_at: null, end_at: null });
  });

  it("registers JST ranges, lists exact times, rejects overlap and permits adjacent times", async () => {
    expect((await post("2027-03-15", "time_range", "09:00", "10:00")).status).toBe(201);
    expect((await post("2027-03-15", "time_range", "13:30", "15:00")).status).toBe(201);
    expect(state.rows[0].startDate.toISOString()).toBe("2027-03-15T00:00:00.000Z");
    expect(state.rows[1].startDate.toISOString()).toBe("2027-03-15T04:30:00.000Z");

    const response = await fetch(`${baseUrl}/api/reservations`);
    const rows = await response.json();
    expect(response.status).toBe(200);
    expect(rows.map((row: { start_at: string; end_at: string }) => [row.start_at, row.end_at])).toEqual([
      ["2027-03-15T09:00:00", "2027-03-15T10:00:00"],
      ["2027-03-15T13:30:00", "2027-03-15T15:00:00"],
    ]);

    const overlap = await post("2027-03-15", "time_range", "09:30", "10:30");
    expect(overlap.status).toBe(409);
    expect(state.rows).toHaveLength(2);
    expect((await post("2027-03-15", "time_range", "10:00", "11:00")).status).toBe(201);
    expect((await post("2027-03-17", "time_range", "09:00", "18:00")).status).toBe(201);
  });

  it("rejects missing or empty time values before INSERT", async () => {
    expect((await post("2027-03-15", "time_range", null, "10:00")).status).toBe(400);
    expect((await post("2027-03-15", "time_range", "", "10:00")).status).toBe(400);
    expect(state.rows).toHaveLength(0);
  });
});
