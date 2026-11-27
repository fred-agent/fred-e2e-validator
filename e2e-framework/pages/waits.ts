/**
 * Startup includes the redirect to sign-in or, for a signed-in user, loading
 * the terms or home page. A busy environment can take longer than the usual
 * assertion timeout.
 */
export const FRED_START_TIMEOUT = 60_000;
