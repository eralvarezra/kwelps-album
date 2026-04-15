// PayPal configuration constants

export const DEPOSIT_AMOUNTS = [5, 10, 25, 50, 100] as const

export const PAYPAL_CONFIG = {
  minAmount: 1,
  maxAmount: 1000,
  currency: 'USD',
} as const