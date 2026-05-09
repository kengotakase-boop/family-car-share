import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { sendPushNotifications } from "./push";

// Helper function to generate random invite code
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ==================== Family Groups ====================
  family: router({
    // Get user's family groups
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFamilyGroups(ctx.user.id);
    }),

    // Create a new family group
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const inviteCode = generateInviteCode();
        const familyGroupId = await db.createFamilyGroup({
          name: input.name,
          inviteCode,
          createdBy: ctx.user.id,
        });

        // Add creator as first member
        await db.addFamilyMember({
          familyGroupId,
          userId: ctx.user.id,
        });

        return { id: familyGroupId, inviteCode };
      }),

    // Join a family group with invite code
    join: protectedProcedure
      .input(
        z.object({
          inviteCode: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const familyGroup = await db.getFamilyGroupByInviteCode(input.inviteCode);

        if (!familyGroup) {
          throw new Error("Invalid invite code");
        }

        // Check if already a member
        const isMember = await db.isMemberOfFamily(ctx.user.id, familyGroup.id);
        if (isMember) {
          throw new Error("Already a member of this family group");
        }

        await db.addFamilyMember({
          familyGroupId: familyGroup.id,
          userId: ctx.user.id,
        });

        return { familyGroupId: familyGroup.id };
      }),

    // Get family members
    members: protectedProcedure
      .input(
        z.object({
          familyGroupId: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        // Verify user is a member
        const isMember = await db.isMemberOfFamily(ctx.user.id, input.familyGroupId);
        if (!isMember) {
          throw new Error("Not a member of this family group");
        }

        return db.getFamilyMembersByGroupId(input.familyGroupId);
      }),
  }),

  // ==================== Cars ====================
  cars: router({
    // List cars for a family group
    list: protectedProcedure
      .input(
        z.object({
          familyGroupId: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        // Verify user is a member
        const isMember = await db.isMemberOfFamily(ctx.user.id, input.familyGroupId);
        if (!isMember) {
          throw new Error("Not a member of this family group");
        }

        return db.getCarsByFamilyGroup(input.familyGroupId);
      }),

    // Create a car
    create: protectedProcedure
      .input(
        z.object({
          familyGroupId: z.number(),
          name: z.string().min(1).max(255),
          color: z.string().max(50).optional(),
          plateNumber: z.string().max(50).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify user is a member
        const isMember = await db.isMemberOfFamily(ctx.user.id, input.familyGroupId);
        if (!isMember) {
          throw new Error("Not a member of this family group");
        }

        const carId = await db.createCar(input);
        return { id: carId };
      }),

    // Update a car
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          color: z.string().max(50).optional(),
          plateNumber: z.string().max(50).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const car = await db.getCarById(input.id);
        if (!car) {
          throw new Error("Car not found");
        }

        // Verify user is a member
        const isMember = await db.isMemberOfFamily(ctx.user.id, car.familyGroupId);
        if (!isMember) {
          throw new Error("Not a member of this family group");
        }

        const { id, ...updateData } = input;
        await db.updateCar(id, updateData);
        return { success: true };
      }),

    // Delete a car
    delete: protectedProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const car = await db.getCarById(input.id);
        if (!car) {
          throw new Error("Car not found");
        }

        // Verify user is a member
        const isMember = await db.isMemberOfFamily(ctx.user.id, car.familyGroupId);
        if (!isMember) {
          throw new Error("Not a member of this family group");
        }

        await db.deleteCar(input.id);
        return { success: true };
      }),
  }),

  // ==================== Reservations ====================
  reservations: router({
    // List reservations for a family group
    list: protectedProcedure
      .input(
        z.object({
          familyGroupId: z.number(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        // Verify user is a member
        const isMember = await db.isMemberOfFamily(ctx.user.id, input.familyGroupId);
        if (!isMember) {
          throw new Error("Not a member of this family group");
        }

        return db.getReservationsByFamilyGroup(input.familyGroupId, input.startDate, input.endDate);
      }),

    // Create a reservation
    create: protectedProcedure
      .input(
        z.object({
          carId: z.number(),
          familyGroupId: z.number(),
          startDate: z.date(),
          endDate: z.date(),
          isAllDay: z.boolean().default(false),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify user is a member
        const isMember = await db.isMemberOfFamily(ctx.user.id, input.familyGroupId);
        if (!isMember) {
          throw new Error("Not a member of this family group");
        }

        // Verify car belongs to family group
        const car = await db.getCarById(input.carId);
        if (!car || car.familyGroupId !== input.familyGroupId) {
          throw new Error("Invalid car");
        }

        const reservationId = await db.createReservation({
          ...input,
          isAllDay: input.isAllDay ? 1 : 0,
          userId: ctx.user.id,
        });

        // Send push notifications to all family members
        const tokens = await db.getPushTokensByFamilyGroup(input.familyGroupId);
        if (tokens.length > 0) {
          const userName = ctx.user.name || "Someone";
          const carName = car.name;
          await sendPushNotifications(
            tokens.map((t) => t.token),
            `${userName}が${carName}の予約を作成しました`,
            input.comment || "新しい予約が追加されました"
          );
        }

        return { id: reservationId };
      }),

    // Update a reservation
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          isAllDay: z.boolean().optional(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const reservation = await db.getReservationById(input.id);
        if (!reservation) {
          throw new Error("Reservation not found");
        }

        // Verify user is a member
        const isMember = await db.isMemberOfFamily(ctx.user.id, reservation.familyGroupId);
        if (!isMember) {
          throw new Error("Not a member of this family group");
        }

        const { id, isAllDay, ...updateData } = input;
        const dbUpdateData = {
          ...updateData,
          ...(isAllDay !== undefined ? { isAllDay: isAllDay ? 1 : 0 } : {}),
        };
        await db.updateReservation(id, dbUpdateData);

        // Send push notifications to all family members
        const tokens = await db.getPushTokensByFamilyGroup(reservation.familyGroupId);
        if (tokens.length > 0) {
          const userName = ctx.user.name || "Someone";
          const car = await db.getCarById(reservation.carId);
          const carName = car?.name || "車";
          await sendPushNotifications(
            tokens.map((t) => t.token),
            `${userName}が${carName}の予約を変更しました`,
            input.comment || "予約が更新されました"
          );
        }

        return { success: true };
      }),

    // Delete a reservation
    delete: protectedProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const reservation = await db.getReservationById(input.id);
        if (!reservation) {
          throw new Error("Reservation not found");
        }

        // Verify user is a member
        const isMember = await db.isMemberOfFamily(ctx.user.id, reservation.familyGroupId);
        if (!isMember) {
          throw new Error("Not a member of this family group");
        }

        await db.deleteReservation(input.id);

        // Send push notifications to all family members
        const tokens = await db.getPushTokensByFamilyGroup(reservation.familyGroupId);
        if (tokens.length > 0) {
          const userName = ctx.user.name || "Someone";
          const car = await db.getCarById(reservation.carId);
          const carName = car?.name || "車";
          await sendPushNotifications(
            tokens.map((t) => t.token),
            `${userName}が${carName}の予約を削除しました`,
            "予約が削除されました"
          );
        }

        return { success: true };
      }),
  }),

  // ==================== Push Notifications ====================
  push: router({
    // Register push token
    register: protectedProcedure
      .input(
        z.object({
          token: z.string(),
          platform: z.enum(["ios", "android", "web"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.savePushToken({
          userId: ctx.user.id,
          token: input.token,
          platform: input.platform,
        });

        return { success: true };
      }),

    // Unregister push token
    unregister: protectedProcedure
      .input(
        z.object({
          token: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await db.deletePushToken(input.token);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
