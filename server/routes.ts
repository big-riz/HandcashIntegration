import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { handCashConnect } from "./config/handcash";
import { db } from "@db";
import {
  users,
  paymentRequests,
  webhookEvents,
  items,
  collections,
  type SelectItem,
} from "@db/schema";
import { eq } from "drizzle-orm";
import { mintItem, getUserItems, makeItemProps } from "./services/handcash-items";
import { getUserInventory, getFilteredInventory } from "./services/handcash-inventory";

const MemoryStoreSession = MemoryStore(session);

interface HandCashItem {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  collection?: {
    id: string;
    name: string;
  };
  origin?: string;
}

interface HandCashInventory {
  items: HandCashItem[];
}

interface MergedItem extends HandCashItem {
  dbId?: number;
}

export function registerRoutes(app: Express): Server {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "handcash-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ message: "Failed to logout" });
      } else {
        res.json({ message: "Logged out successfully" });
      }
    });
  });

  app.get("/api/profile", async (req, res) => {
    const authToken = req.session.authToken;

    if (!authToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const account = handCashConnect.getAccountFromAuthToken(authToken);
      const profile = await account.profile.getCurrentProfile();
      res.json(profile);
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/payment-requests", async (req, res) => {
    const authToken = req.session.authToken;

    if (!authToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.authToken, authToken),
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create payment request with HandCash
      const response = await fetch(
        "https://cloud.handcash.io/v3/paymentRequests",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "App-Id": process.env.VITE_HANDCASH_APP_ID!,
            "App-Secret": process.env.VITE_HANDCASH_APP_SECRET!,
          },
          body: JSON.stringify({
            product: {
              name: "1 Cent Transaction",
              description: "Test payment request for 1 cent using HandCash",
              imageUrl:
                "https://res.cloudinary.com/dcerwavw6/image/upload/v1731101495/bober.exe_to3xyg.png",
            },
            instrumentCurrencyCode: "BSV",
            denominationCurrencyCode: "USD",
            receivers: [
              {
                sendAmount: 0.00000001,
                destination: user.handle,
              },
            ],
            requestedUserData: ["paymail"],
            notifications: {
              webhook: {
                webhookUrl: `${process.env.VITE_APP_URL || "https://745cd1fa-350c-4582-9e2b-ac2edebd963d-00-zhe9ic3zoc5q.picard.replit.dev/"}/api/webhooks/handcash`,
                customParameters: {
                  userId: user.id.toString(),
                },
              },
            },
            expirationType: "onPaymentCompleted",
            redirectUrl: `${process.env.VITE_APP_URL || "https://745cd1fa-350c-4582-9e2b-ac2edebd963d-00-zhe9ic3zoc5q.picard.replit.dev/"}/dashboard`,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HandCash API error response:", errorText);
        throw new Error(`HandCash API error: ${response.statusText}`);
      }

      const paymentRequest = await response.json();
      console.log("HandCash payment request created:", paymentRequest);

      // Store payment request in database
      const [savedRequest] = await db
        .insert(paymentRequests)
        .values({
          handcashRequestId: paymentRequest.id,
          userId: user.id,
          amount: 1, // 1 cent in satoshis
          paymentRequestUrl: paymentRequest.paymentRequestUrl,
          qrCodeUrl: paymentRequest.paymentRequestQrCodeUrl,
        })
        .returning();

      res.json({
        id: savedRequest.id,
        paymentUrl: paymentRequest.paymentRequestUrl,
        qrCodeUrl: paymentRequest.paymentRequestQrCodeUrl,
      });
    } catch (error) {
      console.error("Payment request creation error:", error);
      res.status(500).json({ message: "Failed to create payment request" });
    }
  });

  app.get("/api/payment-requests", async (req, res) => {
    const authToken = req.session.authToken;

    if (!authToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.authToken, authToken),
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch payment requests with their associated webhook events
      const userPaymentRequests = await db.query.paymentRequests.findMany({
        where: eq(paymentRequests.userId, user.id),
        with: {
          webhookEvents: true,
        },
        orderBy: (paymentRequests, { desc }) => [
          desc(paymentRequests.createdAt),
        ],
      });

      res.json(userPaymentRequests);
    } catch (error) {
      console.error("Payment requests fetch error:", error);
      res.status(500).json({ message: "Failed to fetch payment requests" });
    }
  });

  app.post("/api/webhooks/handcash", async (req, res) => {
    try {
      const { paymentRequestId, status, transactionId, appSecret } = req.body;
      console.log("Received webhook:", req.body);

      // Verify this is a valid HandCash webhook
      if (appSecret !== process.env.VITE_HANDCASH_APP_SECRET) {
        return res.status(403).json({ message: "Invalid webhook signature" });
      }

      // Find the payment request in our database
      const paymentRequest = await db.query.paymentRequests.findFirst({
        where: eq(paymentRequests.handcashRequestId, paymentRequestId),
      });

      if (!paymentRequest) {
        return res.status(404).json({ message: "Payment request not found" });
      }

      // If we have a transaction ID, consider it a completed payment
      const eventType = status || (transactionId ? "completed" : "pending");

      // Store the webhook event
      await db.insert(webhookEvents).values({
        paymentRequestId: paymentRequest.id,
        eventType,
        payload: req.body,
      });

      // Update payment request status
      await db
        .update(paymentRequests)
        .set({ status: eventType })
        .where(eq(paymentRequests.id, paymentRequest.id));


      await mintItem("",await makeItemProps(0, 1), req.body.userData.id);

      res.json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  app.get("/auth", async (req, res) => {
    const authToken = req.query.authToken as string;

    if (!authToken) {
      return res.redirect("/?error=no_auth_token");
    }

    try {
      const account = handCashConnect.getAccountFromAuthToken(authToken);
      const profile = await account.profile.getCurrentProfile();

      // Store or update user in database
      await db
        .insert(users)
        .values({
          handle: profile.publicProfile.handle,
          authToken: authToken,
        })
        .onConflictDoUpdate({
          target: users.handle,
          set: { authToken },
        });

      req.session.authToken = authToken;
      res.redirect("/dashboard");
    } catch (error) {
      console.error("HandCash auth error:", error);
      res.redirect("/?error=auth_failed");
    }
  });

  app.post("/api/items", async (req, res) => {
    const authToken = req.session.authToken;

    if (!authToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.authToken, authToken),
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userprofile =
        await handCashConnect.getAccountFromAuthToken(authToken);

      const { name, description, imageUrl, tokenSupply } = await makeItemProps(req.body.seed, req.body.tokenSupply);

      // Mint the item using HandCash with user's handle
      const mintedItem = await mintItem(
        authToken,
        {
          name,
          description,
          imageUrl,
          tokenSupply,
        },
        (await userprofile.profile.getCurrentProfile()).publicProfile.id,
      );

      // Store the item in our database
      const [savedItem] = await db
        .insert(items)
        .values({
          userId: user.id,
          collectionId: mintedItem.collectionId,
          handcashItemId: mintedItem.id,
          origin: mintedItem.origin,
          name: mintedItem.name,
          description: mintedItem.description,
          imageUrl: mintedItem.imageUrl,
          tokenSupply: mintedItem.count,
        })
        .returning();

      res.json(savedItem);
    } catch (error) {
      console.error("Item creation error:", error);
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.get("/api/items", async (req, res) => {
    const authToken = req.session.authToken;

    if (!authToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.authToken, authToken),
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch items from HandCash
      const handcashItems = (await getUserItems(authToken)) as HandCashItem[];

      // Fetch items from our database
      const dbItems = await db.query.items.findMany({
        where: eq(items.userId, user.id),
        orderBy: (items, { desc }) => [desc(items.createdAt)],
      });

      // Merge HandCash and database items
      const mergedItems: MergedItem[] = handcashItems.map((handcashItem) => {
        const dbItem = dbItems.find(
          (item) => item.handcashItemId === handcashItem.id,
        );
        return {
          ...handcashItem,
          dbId: dbItem?.id,
        };
      });

      res.json(mergedItems);
    } catch (error) {
      console.error("Items fetch error:", error);
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.get("/api/collections", async (req, res) => {
    const authToken = req.session.authToken;

    if (!authToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Get collections from our database first
      const dbCollections = await db.query.collections.findMany({
        orderBy: (collections, { desc }) => [desc(collections.createdAt)],
      });

      // Get user's inventory from HandCash to validate and enhance collections
      const inventoryItems = await getUserInventory(authToken);

      // Get the set of collection IDs from the user's inventory
      const userCollectionIds = new Set(
        inventoryItems.map((item: HandCashItem) => item.collection?.id).filter(Boolean)
      );

      // Filter collections that exist in the user's HandCash inventory
      // and enhance them with item counts
      const enhancedCollections = dbCollections
        .filter(collection => userCollectionIds.has(collection.handcashCollectionId))
        .map(collection => ({
          ...collection,
          itemCount: inventoryItems.filter(
            (item: HandCashItem) => item.collection?.id === collection.handcashCollectionId
          ).length || 0,
        }));

      res.json(enhancedCollections);
    } catch (error) {
      console.error("Collections fetch error:", error);
      res.status(500).json({ message: "Failed to fetch collections" });
    }
  });

  app.get("/api/inventory", async (req, res) => {
    const authToken = req.session.authToken;
    const { collectionId, search, attributes } = req.query;

    if (!authToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const inventory = await getFilteredInventory(
        authToken,
        collectionId as string,
        search as string,
        attributes ? JSON.parse(attributes as string) : undefined
      );

      res.json(inventory);
    } catch (error) {
      console.error("Inventory fetch error:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}