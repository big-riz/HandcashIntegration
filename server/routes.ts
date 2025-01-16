import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { handCashConnect } from "./config/handcash";
import { db } from "@db";
import { users, paymentRequests, webhookEvents } from "@db/schema";
import { eq } from "drizzle-orm";

const MemoryStoreSession = MemoryStore(session);

export function registerRoutes(app: Express): Server {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'handcash-secret',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ message: 'Failed to logout' });
      } else {
        res.json({ message: 'Logged out successfully' });
      }
    });
  });

  app.get('/api/profile', async (req, res) => {
    const authToken = req.session.authToken;

    if (!authToken) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const account = handCashConnect.getAccountFromAuthToken(authToken);
      const profile = await account.profile.getCurrentProfile();
      res.json(profile);
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  app.post('/api/payment-requests', async (req, res) => {
    const authToken = req.session.authToken;

    if (!authToken) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.authToken, authToken)
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create payment request with HandCash
      const response = await fetch('https://cloud.handcash.io/v3/paymentRequests', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'App-Id': process.env.VITE_HANDCASH_APP_ID!,
          'App-Secret': process.env.VITE_HANDCASH_APP_SECRET!
        },
        body: JSON.stringify({
          product: {
            name: '1 Cent Transaction',
            description: 'Test payment request for 1 cent using HandCash',
            imageUrl: 'https://handcash.io/resources/images/handcash-logo.png'
          },
          instrumentCurrencyCode: 'BSV',
          denominationCurrencyCode: 'USD',
          receivers: [{
            sendAmount: 0.01,
            destination: user.handle
          }],
          requestedUserData: ['paymail'],
          notifications: {
            webhook: {
              webhookUrl: `${process.env.VITE_APP_URL || 'https://your-domain.com'}/api/webhooks/handcash`,
              customParameters: {
                userId: user.id.toString()
              }
            }
          },
          expirationType: 'onPaymentCompleted',
          redirectUrl: `${process.env.VITE_APP_URL || 'https://your-domain.com'}/dashboard`
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HandCash API error response:', errorText);
        throw new Error(`HandCash API error: ${response.statusText}`);
      }

      const paymentRequest = await response.json();
      console.log('HandCash payment request created:', paymentRequest);

      // Store payment request in database
      const [savedRequest] = await db.insert(paymentRequests).values({
        handcashRequestId: paymentRequest.id,
        userId: user.id,
        amount: 1, // 1 cent in satoshis
        paymentRequestUrl: paymentRequest.paymentRequestUrl,
        qrCodeUrl: paymentRequest.paymentRequestQrCodeUrl
      }).returning();

      res.json({
        id: savedRequest.id,
        paymentUrl: paymentRequest.paymentRequestUrl,
        qrCodeUrl: paymentRequest.paymentRequestQrCodeUrl
      });
    } catch (error) {
      console.error('Payment request creation error:', error);
      res.status(500).json({ message: 'Failed to create payment request' });
    }
  });

  app.post('/api/webhooks/handcash', async (req, res) => {
    try {
      const { paymentRequestId, status, transactionId } = req.body;
      console.log('Received webhook:', { paymentRequestId, status, transactionId });

      // Find the payment request in our database
      const paymentRequest = await db.query.paymentRequests.findFirst({
        where: eq(paymentRequests.handcashRequestId, paymentRequestId)
      });

      if (!paymentRequest) {
        return res.status(404).json({ message: 'Payment request not found' });
      }

      // Store the webhook event
      await db.insert(webhookEvents).values({
        paymentRequestId: paymentRequest.id,
        eventType: status,
        payload: req.body
      });

      // Update payment request status
      await db
        .update(paymentRequests)
        .set({ status: status })
        .where(eq(paymentRequests.id, paymentRequest.id));

      res.json({ message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ message: 'Failed to process webhook' });
    }
  });

  app.get('/auth', async (req, res) => {
    const authToken = req.query.authToken as string;

    if (!authToken) {
      return res.redirect('/?error=no_auth_token');
    }

    try {
      const account = handCashConnect.getAccountFromAuthToken(authToken);
      const profile = await account.profile.getCurrentProfile();

      // Store or update user in database
      await db.insert(users).values({
        handle: profile.publicProfile.handle,
        authToken: authToken,
      }).onConflictDoUpdate({
        target: users.handle,
        set: { authToken }
      });

      req.session.authToken = authToken;
      res.redirect('/dashboard');
    } catch (error) {
      console.error('HandCash auth error:', error);
      res.redirect('/?error=auth_failed');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}