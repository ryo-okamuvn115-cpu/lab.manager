import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
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

  inventory: router({
    list: protectedProcedure.query(({ ctx }) => db.getUserInventory(ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(["protein", "antibody", "reagent", "other"]),
          manufacturer: z.string(),
          catalogNumber: z.string().optional(),
          quantity: z.number(),
          unit: z.string(),
          storageLocation: z.string().optional(),
          expiryDate: z.date().nullable().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        db.createInventoryItem({
          ...input,
          userId: ctx.user.id,
        })
      ),
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          quantity: z.number().optional(),
          unit: z.string().optional(),
          storageLocation: z.string().optional(),
          storageLocationImageUrl: z.string().nullable().optional(),
          storageLocationImageKey: z.string().nullable().optional(),
          expiryDate: z.date().nullable().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateInventoryItem(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => db.deleteInventoryItem(input.id, ctx.user.id)),
    setStorageLocationImage: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          base64: z.string(),
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const buffer = Buffer.from(input.base64, "base64");
          const key = `inventory/${input.id}/storage-location-${Date.now()}`;
          const { storagePut } = await import("../server/storage");
          const url = await storagePut(key, buffer, input.mimeType);
          await db.updateInventoryItem(input.id, 0, {
            storageLocationImageUrl: url,
            storageLocationImageKey: key,
          });
          return { url, key };
        } catch (error) {
          console.error("Failed to upload image:", error);
          throw error;
        }
      }),
    deleteStorageLocationImage: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const { storageDelete } = await import("../server/storage");
          const items = await db.getAllInventory();
          const item = items.find((i) => i.id === input.id);
          if (item?.storageLocationImageKey) {
            await storageDelete(item.storageLocationImageKey);
          }
          await db.updateInventoryItem(input.id, 0, {
            storageLocationImageUrl: null,
            storageLocationImageKey: null,
          });
          return { success: true };
        } catch (error) {
          console.error("Failed to delete image:", error);
          throw error;
        }
      }),
  }),

  orders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const orders = await db.getUserOrders(ctx.user.id);
      return Promise.all(
        orders.map(async (order) => ({
          ...order,
          items: await db.getOrderItems(order.id),
        }))
      );
    }),
    create: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string(),
          status: z.enum(["draft", "submitted", "approved", "received"]),
          totalAmount: z.number(),
          notes: z.string().optional(),
          items: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              catalogNumber: z.string().optional(),
              manufacturer: z.string().optional(),
              quantity: z.number(),
              unitPrice: z.number(),
              unit: z.string(),
              purpose: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { items, ...orderData } = input;
        await db.createOrder({
          ...orderData,
          userId: ctx.user.id,
        });
        for (const item of items) {
          await db.createOrderItem({
            ...item,
            orderId: input.id,
          });
        }
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.enum(["draft", "submitted", "approved", "received"]).optional(),
          title: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateOrder(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteOrderItems(input.id);
        return db.deleteOrder(input.id, ctx.user.id);
      }),
  }),

  protocols: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const protocols = await db.getUserProtocols(ctx.user.id);
      return Promise.all(
        protocols.map(async (protocol) => ({
          ...protocol,
          steps: await db.getProtocolSteps(protocol.id),
          reagents: (await db.getProtocolReagents(protocol.id)).map((r) => r.name),
          equipment: (await db.getProtocolEquipment(protocol.id)).map((e) => e.name),
        }))
      );
    }),
    create: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string(),
          category: z.string(),
          description: z.string().optional(),
          notes: z.string().optional(),
          steps: z.array(
            z.object({
              id: z.string(),
              stepNumber: z.number(),
              title: z.string(),
              description: z.string().optional(),
              duration: z.string().nullable().optional(),
              notes: z.string().optional(),
            })
          ),
          reagents: z.array(z.string()),
          equipment: z.array(z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { steps, reagents, equipment, ...protocolData } = input;
        await db.createProtocol({
          ...protocolData,
          userId: ctx.user.id,
        });
        for (const step of steps) {
          await db.createProtocolStep({
            ...step,
            protocolId: input.id,
          });
        }
        for (const reagent of reagents) {
          await db.createProtocolReagent({
            id: `reagent-${Date.now()}-${Math.random()}`,
            protocolId: input.id,
            name: reagent,
          });
        }
        for (const eq of equipment) {
          await db.createProtocolEquipment({
            id: `equipment-${Date.now()}-${Math.random()}`,
            protocolId: input.id,
            name: eq,
          });
        }
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteProtocolSteps(input.id);
        await db.deleteProtocolReagents(input.id);
        await db.deleteProtocolEquipment(input.id);
        return db.deleteProtocol(input.id, ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
