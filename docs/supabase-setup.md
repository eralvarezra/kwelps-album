# Supabase Setup Guide

## 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name: `kwelps-album`
4. Generate a secure database password
5. Choose region closest to your users
6. Wait for project to be created

## 2. Get Credentials

Go to Project Settings:

### Database URL
- Settings → Database → Connection string → URI
- Copy and replace `[YOUR-PASSWORD]` with your database password

### Supabase URL and Keys
- Settings → API
- Copy:
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## 3. Run Prisma DB Push

After setting up Supabase credentials in `.env.local`:

```bash
npx prisma db push --force-reset
```

This will create all tables in the database.

## 4. Run Initial SQL

Go to SQL Editor and run:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to create user-related records automatically
-- NOTE: Prisma uses camelCase column names, so we must quote them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, "createdAt", "updatedAt")
  VALUES (NEW.id, NEW.email, NOW(), NOW());
  
  INSERT INTO public.wallets (id, "userId", balance, "createdAt")
  VALUES (gen_random_uuid(), NEW.id, 0, NOW());
  
  INSERT INTO public.pity_counters (id, "userId", "legendaryCounter", "lastPullAt")
  VALUES (gen_random_uuid(), NEW.id, 0, NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 5. Configure Authentication

Go to Authentication → Providers:
- Enable Email/Password
- Disable "Confirm email" for immediate registration

## 6. Row Level Security (RLS)

Run this SQL to enable RLS policies:

```sql
-- Users: can only read own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Wallets: can only read/update own wallet
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  USING (auth.uid() = "userId");

-- Transactions: can only read own transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = "userId");

-- User photos: can only read/insert own photos
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own photos"
  ON user_photos FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own photos"
  ON user_photos FOR INSERT
  WITH CHECK (auth.uid() = "userId");

-- Pity counters: can only read/update own counter
ALTER TABLE pity_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pity"
  ON pity_counters FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can update own pity"
  ON pity_counters FOR UPDATE
  USING (auth.uid() = "userId");
```

## 7. Verify Setup

Test the trigger by creating a user through the app's register page. Check that:
- User appears in `auth.users`
- User appears in `users` table
- Wallet is created in `wallets`
- Pity counter is created in `pity_counters`