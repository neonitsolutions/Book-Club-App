/**
 * Every amount in the database is an integer number of kobo (₦1 = 100 kobo),
 * the unit Paystack and Flutterwave use. Integers add up exactly; floats
 * like 0.1 + 0.2 do not. Fields holding money end in `Kobo`.
 */
export const CURRENCY = 'NGN';

export const kobo = {
  type: Number,
  min: 0,
  validate: {
    validator: Number.isInteger,
    message: '{PATH} must be a whole number of kobo',
  },
} as const;

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}
