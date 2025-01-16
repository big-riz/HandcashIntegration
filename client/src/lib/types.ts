export interface HandCashProfile {
  handle: string;
  publicProfile: boolean;
  paymail: string;
  displayName: string;
  avatarUrl: string;
}

export interface HandCashError {
  message: string;
  status: number;
}

declare module 'express-session' {
  interface SessionData {
    authToken: string;
  }
}