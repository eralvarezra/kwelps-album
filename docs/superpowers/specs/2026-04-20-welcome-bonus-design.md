# Welcome Bonus Design Spec
Date: 2026-04-20

## Overview
New users (registered after this feature ships) see a non-dismissable welcome modal on the dashboard the first time they log in. The modal lets them claim  USD added directly to their wallet balance.

## Scope
- Applies only to NEW users going forward. Existing users are ineligible.
- Modal appears on /dashboard only.
- Bonus can only be claimed once per user.

## Database

### Wallet model change
Add field: bonusClaimed Boolean @default(true)

- Migration sets true on all existing wallets (ineligible).
- New wallets are created with bonusClaimed: false explicitly in getWallet() upsert.

## Backend

### getWallet() change (src/lib/actions/wallet.ts)
In the prisma.wallet.upsert create block, add: bonusClaimed: false
This marks every newly created wallet as eligible.

### New server action: claimWelcomeBonus()
Location: src/lib/actions/wallet.ts

- Requires authenticated user (not admin-only).
- Inside a Prisma transaction:
  1. Fetch wallet for current user.
  2. If wallet.bonusClaimed is true, return error (already claimed or ineligible).
  3. Create DEPOSIT transaction with amount=2, source=ADMIN.
  4. Increment wallet.balance by 2, wallet.adminBalance by 2.
  5. Set wallet.bonusClaimed = true.
- Returns { success: boolean, error?: string }.
- Calls revalidatePath(/dashboard) on success.

## Frontend

### Dashboard page (src/app/(dashboard)/dashboard/page.tsx)
- Already a server component that loads the wallet.
- Pass showWelcomeBonus={wallet?.bonusClaimed === false} to WelcomeBonusModal.

### WelcomeBonusModal (src/components/ui/welcome-bonus-modal.tsx)
- New client component.
- Props: show: boolean
- Renders nothing if show is false.
- When show is true: renders a fixed overlay (z-50) with a centered glass card.
- Card content:
  - Welcome heading and enthusiastic message mentioning the  bonus.
  - Single CTA button: Reclamar mis 
  - Loading state while claimWelcomeBonus() is in flight.
  - Inline error message if claim fails.
  - On success: hides the modal via local state.
- No close/dismiss button — user must claim to remove the modal.

## Error Handling
- Double-claim attempt returns error message inline in modal.
- Network error: shows generic error message, allows retry.
- Modal never closes on error — user can retry.

## Out of Scope
- Bonus expiry date.
- Multiple bonus types.
- Retroactive bonus for existing users.
- Email notification.
