import { pgTable, text, serial, timestamp, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  handle: text("handle").unique().notNull(),
  authToken: text("auth_token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentRequests = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  handcashRequestId: text("handcash_request_id").unique().notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(), // in satoshis
  status: text("status").notNull().default("pending"),
  paymentRequestUrl: text("payment_request_url").notNull(),
  qrCodeUrl: text("qr_code_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  paymentRequestId: integer("payment_request_id").references(() => paymentRequests.id),
  eventType: text("event_type").notNull(),
  payload: json("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export const insertPaymentRequestSchema = createInsertSchema(paymentRequests);
export const selectPaymentRequestSchema = createSelectSchema(paymentRequests);
export type InsertPaymentRequest = typeof paymentRequests.$inferInsert;
export type SelectPaymentRequest = typeof paymentRequests.$inferSelect;

export const insertWebhookEventSchema = createInsertSchema(webhookEvents);
export const selectWebhookEventSchema = createSelectSchema(webhookEvents);
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;
export type SelectWebhookEvent = typeof webhookEvents.$inferSelect;