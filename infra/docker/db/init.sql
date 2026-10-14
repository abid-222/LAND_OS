-- Enable extensions required for Bangladesh LandOS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Verification notice
DO $$
BEGIN
    RAISE NOTICE 'LandOS extensions initialized: postgis, pg_trgm, vector, uuid-ossp';
END $$;
