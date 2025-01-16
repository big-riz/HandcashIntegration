import { HandCashConnect } from '@handcash/handcash-connect';

// We'll throw a clear error if credentials are missing
if (!process.env.HANDCASH_MINTER_APP_ID || !process.env.HANDCASH_MINTER_APP_SECRET || !process.env.HANDCASH_MINTER_AUTH_TOKEN) {
  throw new Error(
    'HandCash minting credentials are required. Please set HANDCASH_MINTER_APP_ID, HANDCASH_MINTER_APP_SECRET, and HANDCASH_MINTER_AUTH_TOKEN environment variables.'
  );
}

export const handCashMinter = new HandCashConnect({
  appId: process.env.HANDCASH_MINTER_APP_ID,
  appSecret: process.env.HANDCASH_MINTER_APP_SECRET,
});
