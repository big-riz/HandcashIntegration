import { HandCashConnect } from '@handcash/handcash-connect';

// We'll throw a clear error if credentials are missing
if (!process.env.VITE_HANDCASH_APP_ID || !process.env.VITE_HANDCASH_APP_SECRET) {
  throw new Error(
    'HandCash credentials are required. Please set VITE_HANDCASH_APP_ID and VITE_HANDCASH_APP_SECRET environment variables.'
  );
}

export const handCashConnect = new HandCashConnect({
  appId: process.env.VITE_HANDCASH_APP_ID,
  appSecret: process.env.VITE_HANDCASH_APP_SECRET,
});
