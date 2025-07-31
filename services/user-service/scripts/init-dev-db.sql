// scripts/init-dev-db.sql
-- Script d'initialisation pour le développement

-- Créer des extensions utiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insérer des données de test après les migrations
DO $$
BEGIN
  -- Attendre que les tables soient créées
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    -- Insérer un profil admin par défaut
    INSERT INTO user_profiles (
      user_id, email, first_name, last_name, 
      department, job_title, preferences
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      'dev-admin@localhost',
      'Dev',
      'Admin',
      'Development',
      'Developer',
      '{"language": "fr", "theme": "dark"}'::jsonb
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Development user created: dev-admin@localhost';
  END IF;
END $$;