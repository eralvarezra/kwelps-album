# Welcome Bonus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show new users a non-dismissable welcome modal on /dashboard that lets them claim $2 USD added to their wallet balance.

**Architecture:** Add `bonusClaimed Boolean @default(true)` to the Wallet model (existing rows get `true` = ineligible; new wallets are explicitly created with `false`). A `claimWelcomeBonus()` server action validates and gives the $2 atomically. The dashboard server component passes `showWelcomeBonus` to a client modal component.

**Tech Stack:** Next.js 14 App Router, Prisma, TypeScript, Tailwind CSS, server actions

---

## Files

- Modify: `prisma/schema.prisma` — add `bonusClaimed` field to Wallet
- Modify: `src/lib/actions/wallet.ts` — add `claimWelcomeBonus()`, update `getWallet()` create block
- Modify: `src/app/api/user/create/route.ts` — update wallet create block, remove pre-given $2
- Modify: `src/app/(dashboard)/dashboard/page.tsx` — update wallet create block, pass bonus flag, render modal
- Create: `src/components/ui/welcome-bonus-modal.tsx` — client modal component

---

### Task 1: Add `bonusClaimed` to Prisma schema and migrate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update the Wallet model in `/root/kwelps-album/prisma/schema.prisma`**

Find the Wallet model:
```prisma
model Wallet {
  id           String   @id @default(uuid())
  userId       String   @unique
  balance      Decimal  @default(0) @db.Decimal(10, 2)
  adminBalance  Decimal  @default(0) @db.Decimal(10, 2)
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("wallets")
}
```

Change to:
```prisma
model Wallet {
  id            String   @id @default(uuid())
  userId        String   @unique
  balance       Decimal  @default(0) @db.Decimal(10, 2)
  adminBalance  Decimal  @default(0) @db.Decimal(10, 2)
  bonusClaimed  Boolean  @default(true)
  createdAt     DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("wallets")
}
```

`@default(true)` ensures all existing wallets in the DB get `true` after migration (ineligible for bonus).

- [ ] **Step 2: Run the Prisma migration on the server**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "cd /root/kwelps-album && node -e 'console.log(process.version)'"
```

If Node.js is available (prints a version), run:
```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "cd /root/kwelps-album && npx prisma migrate dev --name add_bonus_claimed 2>&1"
```

If Node.js is NOT available on the host, run migration inside a temporary container:
```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "cd /root/kwelps-album && docker run --rm --network host --env-file .env -v /root/kwelps-album:/app -w /app node:20-alpine sh -c 'npm ci --silent && npx prisma migrate dev --name add_bonus_claimed' 2>&1"
```

Expected: migration created and applied, `bonusClaimed` column added to `wallets` table.

- [ ] **Step 3: Verify column exists in DB**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "docker exec kwelps-album-app-1 sh -c \"node -e \\\"const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.wallet.findFirst({select:{bonusClaimed:true}}).then(r=>console.log('bonusClaimed field ok:',r)).catch(e=>console.error(e)).finally(()=>p.\\\$disconnect())\\\"\" 2>&1"
```

Expected: prints `bonusClaimed field ok: ...` without errors.

- [ ] **Step 4: Commit**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "cd /root/kwelps-album && git add prisma/ && git commit -m 'feat: add bonusClaimed field to Wallet model'"
```

---

### Task 2: Add `claimWelcomeBonus()` action and update wallet creation points

**Files:**
- Modify: `src/lib/actions/wallet.ts`
- Modify: `src/app/api/user/create/route.ts`

- [ ] **Step 1: Update `getWallet()` create block in `src/lib/actions/wallet.ts`**

Find:
```ts
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0, adminBalance: 0 },
    update: {},
  })
```

Change to:
```ts
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0, adminBalance: 0, bonusClaimed: false },
    update: {},
  })
```

- [ ] **Step 2: Append `claimWelcomeBonus()` at the bottom of `src/lib/actions/wallet.ts`**

```ts
export async function claimWelcomeBonus(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: user.id } })

      if (!wallet || wallet.bonusClaimed) {
        throw new Error('Bono no disponible')
      }

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          amount: 2,
          status: 'COMPLETED',
          source: 'ADMIN',
        },
      })

      await tx.wallet.update({
        where: { userId: user.id },
        data: {
          balance: { increment: 2 },
          adminBalance: { increment: 2 },
          bonusClaimed: true,
        },
      })
    })

    revalidatePath('/dashboard')
    revalidatePath('/wallet')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error al reclamar' }
  }
}
```

- [ ] **Step 3: Update wallet create in `src/app/api/user/create/route.ts`**

Find:
```ts
    const wallet = await prisma.wallet.upsert({
      where: { userId: id },
      create: { userId: id, balance: 0, adminBalance: 2 },
      update: {},
    })
```

Change to:
```ts
    const wallet = await prisma.wallet.upsert({
      where: { userId: id },
      create: { userId: id, balance: 0, adminBalance: 0, bonusClaimed: false },
      update: {},
    })
```

Note: The old `adminBalance: 2` was a previous incomplete bonus implementation. The new system gives $2 only when the user clicks "Claim" in the modal.

- [ ] **Step 4: Verify TypeScript**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "docker exec kwelps-album-app-1 sh -c 'cd /app && npx tsc --noEmit 2>&1 | grep -E \"wallet|bonus|user/create\" | head -20'"
```

Expected: no errors in these files.

- [ ] **Step 5: Commit**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "cd /root/kwelps-album && git add src/lib/actions/wallet.ts 'src/app/api/user/create/route.ts' && git commit -m 'feat: add claimWelcomeBonus action and mark new wallets as eligible'"
```

---

### Task 3: Create `WelcomeBonusModal` component

**Files:**
- Create: `src/components/ui/welcome-bonus-modal.tsx`

- [ ] **Step 1: Create the file**

Write `/root/kwelps-album/src/components/ui/welcome-bonus-modal.tsx` with this content:

```tsx
'use client'

import { useState } from 'react'
import { claimWelcomeBonus } from '@/lib/actions/wallet'

export function WelcomeBonusModal({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!visible) return null

  async function handleClaim() {
    setLoading(true)
    setError('')
    const result = await claimWelcomeBonus()
    if (result.success) {
      setVisible(false)
    } else {
      setError(result.error || 'Error al reclamar el bono')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-8 w-full max-w-md text-center border border-yellow-500/30">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-3">
          ¡Bienvenido a Kwelps Album!
        </h1>
        <p className="text-gray-300 mb-2">
          Gracias por unirte a la plataforma de álbumes virtuales.
        </p>
        <p className="text-gray-300 mb-6">
          Como regalo de bienvenida te regalamos{' '}
          <span className="text-yellow-400 font-bold text-xl">$2.00 USD</span>{' '}
          para que pruebes tu suerte en la tienda. ¡Buena suerte!
        </p>
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleClaim}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold rounded-xl text-lg hover:from-yellow-600 hover:to-amber-700 transition-colors disabled:opacity-50 shadow-lg shadow-yellow-500/20"
        >
          {loading ? 'Reclamando...' : '¡Reclamar mis $2!'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "docker exec kwelps-album-app-1 sh -c 'cd /app && npx tsc --noEmit 2>&1 | grep -E \"welcome-bonus\" | head -10'"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "cd /root/kwelps-album && git add src/components/ui/welcome-bonus-modal.tsx && git commit -m 'feat: add WelcomeBonusModal component'"
```

---

### Task 4: Update dashboard page to show the modal

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Add `WelcomeBonusModal` import at the top of the file**

After the existing imports, add:
```ts
import { WelcomeBonusModal } from '@/components/ui/welcome-bonus-modal'
```

- [ ] **Step 2: Update the wallet upsert create block**

Find:
```ts
  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0 },
    update: {},
  })
```

Change to:
```ts
  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0, adminBalance: 0, bonusClaimed: false },
    update: {},
  })
```

- [ ] **Step 3: Add `WelcomeBonusModal` to the JSX return**

Find the opening of the return:
```tsx
  return (
    <div>
```

Change to:
```tsx
  return (
    <>
      <WelcomeBonusModal show={wallet?.bonusClaimed === false} />
      <div>
```

And find the closing tag at the end of the return:
```tsx
    </div>
  )
```

Change to:
```tsx
      </div>
    </>
  )
```

- [ ] **Step 4: Verify TypeScript**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "docker exec kwelps-album-app-1 sh -c 'cd /app && npx tsc --noEmit 2>&1 | grep -E \"dashboard|welcome\" | head -10'"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "cd /root/kwelps-album && git add 'src/app/(dashboard)/dashboard/page.tsx' && git commit -m 'feat: show welcome bonus modal on dashboard for eligible new users'"
```

---

### Task 5: Build and deploy

- [ ] **Step 1: Build**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "cd /root/kwelps-album && docker compose build 2>&1 | tail -15"
```

Expected: `Image kwelps-album-app Built` with no errors.

- [ ] **Step 2: Restart container**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "cd /root/kwelps-album && docker compose up -d && sleep 5 && docker ps | grep kwelps-album"
```

Expected: container shows `Up X seconds`.

- [ ] **Step 3: Run DB migration in new container**

The new build includes updated Prisma client. Run the migration against the live DB:

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "cd /root/kwelps-album && docker exec kwelps-album-app-1 npx prisma migrate deploy 2>&1"
```

Expected: `All migrations have been successfully applied.` or similar.

- [ ] **Step 4: Verify no crash logs**

```bash
plink -ssh root@135.181.37.72 -pw "53403E@@r" -hostkey "SHA256:TQnazPytHxcpvEnSb9mvYo/9NuygKw2hOdS+IDYm5co" "docker logs kwelps-album-app-1 --tail 20"
```

Expected: server startup logs, no `Error` or crash output.
