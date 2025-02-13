import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  integer,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const seeds = pgTable("seeds", {
  id: serial("id").primaryKey(),
  seed: integer("seed").notNull(),
  imageUrl: text("image_url").notNull(),
  initTime: timestamp("init_time").defaultNow().notNull(),
  active: boolean("active").notNull().default(false),
  tokenSupply: integer("token_supply").notNull().default(1),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  handle: text("handle").unique().notNull(),

  authToken: text("auth_token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  handcashCollectionId: text("handcash_collection_id").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentRequests = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  handcashRequestId: text("handcash_request_id").unique().notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  amount: integer("amount").notNull(), // in satoshis
  status: text("status").notNull().default("pending"),
  paymentRequestUrl: text("payment_request_url").notNull(),
  qrCodeUrl: text("qr_code_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  paymentRequestId: integer("payment_request_id").references(
    () => paymentRequests.id,
  ),
  eventType: text("event_type").notNull(),
  payload: json("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  collectionId: integer("collection_id")
    .references(() => collections.id)
    .notNull(),
  handcashItemId: text("handcash_item_id").unique().notNull(),
  origin: text("origin"), // New field to store HandCash origin
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  tokenSupply: integer("token_supply").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations
export const paymentRequestsRelations = relations(
  paymentRequests,
  ({ many }) => ({
    webhookEvents: many(webhookEvents),
  }),
);

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  paymentRequest: one(paymentRequests, {
    fields: [webhookEvents.paymentRequestId],
    references: [paymentRequests.id],
  }),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  user: one(users, {
    fields: [items.userId],
    references: [users.id],
  }),
  collection: one(collections, {
    fields: [items.collectionId],
    references: [collections.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export const insertCollectionSchema = createInsertSchema(collections);
export const selectCollectionSchema = createSelectSchema(collections);
export type InsertCollection = typeof collections.$inferInsert;
export type SelectCollection = typeof collections.$inferSelect;

export const insertPaymentRequestSchema = createInsertSchema(paymentRequests);
export const selectPaymentRequestSchema = createSelectSchema(paymentRequests);
export type InsertPaymentRequest = typeof paymentRequests.$inferInsert;
export type SelectPaymentRequest = typeof paymentRequests.$inferSelect;

export const insertWebhookEventSchema = createInsertSchema(webhookEvents);
export const selectWebhookEventSchema = createSelectSchema(webhookEvents);
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;
export type SelectWebhookEvent = typeof webhookEvents.$inferSelect;

export const insertItemSchema = createInsertSchema(items);
export const selectItemSchema = createSelectSchema(items);
export type InsertItem = typeof items.$inferInsert;
export type SelectItem = typeof items.$inferSelect;

export const insertSeedSchema = createInsertSchema(seeds);
export const selectSeedSchema = createSelectSchema(seeds);
export type InsertSeed = typeof seeds.$inferInsert;
export type SelectSeed = typeof seeds.$inferSelect;

