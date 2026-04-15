-- =============================================
-- DIAGNÓSTICO - Ejecutar en SQL Editor
-- =============================================

-- 1. Verificar que las tablas existen
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'wallets', 'pity_counters', 'collections', 'photos', 'user_photos', 'transactions');

-- 2. Ver estructura de la tabla users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users';

-- 3. Ver estructura de la tabla wallets
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'wallets';

-- 4. Ver estructura de la tabla pity_counters
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pity_counters';

-- 5. Verificar si hay errores en el trigger
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user';