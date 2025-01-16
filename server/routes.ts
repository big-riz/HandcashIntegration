import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { handCashConnect } from "./config/handcash";
import { db } from "@db";
import { users, paymentRequests, webhookEvents, items } from "@db/schema";
import { eq } from "drizzle-orm";
import { mintItem, getUserItems } from "./services/handcash-items";

const MemoryStoreSession = MemoryStore(session);

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
                sendAmount: 0.01,
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
        orderBy: (paymentRequests, { desc }) => [desc(paymentRequests.createdAt)],
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
      console.log('Received webhook:', req.body);

      // Verify this is a valid HandCash webhook
      if (appSecret !== process.env.VITE_HANDCASH_APP_SECRET) {
        return res.status(403).json({ message: 'Invalid webhook signature' });
      }

      // Find the payment request in our database
      const paymentRequest = await db.query.paymentRequests.findFirst({
        where: eq(paymentRequests.handcashRequestId, paymentRequestId),
      });

      if (!paymentRequest) {
        return res.status(404).json({ message: "Payment request not found" });
      }

      // If we have a transaction ID, consider it a completed payment
      const eventType = status || (transactionId ? 'completed' : 'pending');

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

      const { name, description, imageUrl, tokenSupply } = req.body;

      // Mint the item using HandCash
      const mintedItem = await mintItem(authToken, {
        name,
        description,
        imageUrl,
        tokenSupply,
      });

      // Store the item in our database
      const [savedItem] = await db.insert(items).values({
        userId: user.id,
        collectionId: mintedItem.collectionId,
        handcashItemId: mintedItem.id,
        origin: mintedItem.origin, // Store the origin from HandCash response
        name: mintedItem.name,
        description: mintedItem.description,
        imageUrl: mintedItem.mediaDetails.image.url,
        tokenSymbol: mintedItem.tokenSymbol,
        tokenSupply: mintedItem.quantity,
      }).returning();

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
      const handcashItems = await getUserItems(authToken);

      // Fetch items from our database
      const dbItems = await db.query.items.findMany({
        where: eq(items.userId, user.id),
        orderBy: (items, { desc }) => [desc(items.createdAt)],
      });

      // Merge HandCash and database items
      const mergedItems = handcashItems.map(handcashItem => {
        const dbItem = dbItems.find(item => item.handcashItemId === handcashItem.id);
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

  const httpServer = createServer(app);
  return httpServer;
}