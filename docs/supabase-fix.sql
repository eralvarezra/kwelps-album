-- =============================================
-- SUPABASE FIX - Ejecutar en SQL Editor
-- =============================================

-- 1. Eliminar trigger y función existentes (si existen)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 2. Crear función corregida
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en users con todos los campos requeridos
  INSERT INTO users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW());

  -- Insertar en wallets con balance default
  INSERT INTO wallets (id, user_id, balance, created_at)
  VALUES (gen_random_uuid(), NEW.id, 0, NOW());

  -- Insertar en pity_counters con valores default
  INSERT INTO pity_counters (id, user_id, legendary_counter, last_pull_at)
  VALUES (gen_random_uuid(), NEW.id, 0, NULL);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Verificar que la función se creó correctamente
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user';