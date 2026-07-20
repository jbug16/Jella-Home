-- Local/default ACLs on public tables created by role `postgres` only grant
-- TRUNCATE/REFERENCES/TRIGGER/MAINTAIN to service_role. Product migrations then
-- GRANT DML to anon/authenticated but omit service_role, so admin clients
-- (seed helpers, prepare-dashboard-demo, repositories using the secret key)
-- get "permission denied for table …".
--
-- Restore full DML for service_role and align default privileges for future
-- tables created by postgres in public.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
