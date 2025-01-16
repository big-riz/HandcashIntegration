import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { handCashConnect } from "./config/handcash";
import { db } from "@db";
import { users } from "@db/schema";
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

  app.get('/auth', async (req, res) => {
    const authToken = req.query.authToken as string;

    if (!authToken) {
      return res.redirect('/?error=no_auth_token');
    }

    try {
      const account = handCashConnect.getAccountFromAuthToken(authToken);
      const profile = await account.profile.getCurrentProfile();

      // Store or update user in database with complete profile data
      await db.insert(users).values({
        handle: profile.publicProfile.handle,
        authToken,
        publicProfile: true, // HandCash profiles are public by default
        displayName: profile.publicProfile.displayName,
        avatarUrl: profile.publicProfile.avatarUrl || null,
        paymail: profile.publicProfile.paymail,
      }).onConflictDoUpdate({
        target: users.handle,
        set: {
          authToken,
          displayName: profile.publicProfile.displayName,
          avatarUrl: profile.publicProfile.avatarUrl || null,
          paymail: profile.publicProfile.paymail,
        }
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