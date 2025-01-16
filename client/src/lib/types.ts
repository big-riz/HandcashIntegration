export interface HandCashProfile {
  handle: string;
  publicProfile: boolean;
  paymail: string;
  displayName: string;
  avatarUrl: string;
}

declare module 'express-session' {
  interface SessionData {
    authToken: string;
  }
}
