export interface HandCashProfile {
  publicProfile: {
    handle: string;
    displayName: string;
    avatarUrl: string;
    publicKey: string;
    bsvAddress: string;
    paymail: string;
  };
  privateProfile: {
    email?: string;
    phoneNumber?: string;
  };
  publicKey: string;
  paymail: string;
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