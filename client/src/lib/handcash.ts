import { HandCashConnect } from '@handcash/handcash-connect';

// We'll throw a clear error if credentials are missing
if (!import.meta.env.VITE_HANDCASH_APP_ID || !import.meta.env.VITE_HANDCASH_APP_SECRET) {
  throw new Error(
    'HandCash credentials are required. Please set VITE_HANDCASH_APP_ID and VITE_HANDCASH_APP_SECRET environment variables.'
  );
}

export const handCashConnect = new HandCashConnect({
  appId: import.meta.env.VITE_HANDCASH_APP_ID,
  appSecret: import.meta.env.VITE_HANDCASH_APP_SECRET,
});

export const getRedirectUrl = () => {
  // Get the current origin to handle both development and production
  const origin = window.location.origin;
  return handCashConnect.getRedirectionUrl({
    successUrl: `${origin}/auth`,
    failureUrl: `${origin}/?error=auth_failed`
  });
};