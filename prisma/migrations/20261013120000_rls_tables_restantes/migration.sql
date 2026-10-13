-- RLS sur les tables restantes, et retrait des droits de l'API Data (2026-10-13).
--
-- Pourquoi : chez Supabase, l'API Data (PostgREST) expose le schéma `public`
-- aux rôles `anon` et `authenticated`, et la clé qui les porte (publishable)
-- est publique par construction. Une table de `public` sans RLS y est lisible
-- et modifiable par quiconque lit cette clé dans le navigateur. Les migrations
-- d'avril activaient la RLS table par table ; les tables créées ensuite l'ont
-- oubliée. Voir docs/revues/audit-owasp-2026-10-13.md (S1).
--
-- L'app n'est pas concernée : elle passe par Prisma avec le rôle propriétaire
-- des tables, qui contourne la RLS (les 18 tables déjà protégées le prouvent).
-- Aucun composant n'interroge `public` par supabase-js : les clients Supabase
-- du code n'appellent que `auth.*` (GoTrue) et `storage.*` (clé service_role,
-- schéma `storage`).
--
-- 1) RLS sans politique = refus par défaut, comme pour les 18 autres tables.
--    `PhaseDangereuse` est créée par `CREATE TABLE IF NOT EXISTS` : elle
--    échappait à un relevé fait sur `CREATE TABLE "`.

ALTER TABLE "Batiment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeclarationEtatPermanent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Duerp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DuerpVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Entreprise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FicheRegistre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PhaseDangereuse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PiecePrestataire" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescriptionParticuliere" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Risque" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Salarie" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TitreSalarie" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UniteTravail" ENABLE ROW LEVEL SECURITY;

-- 2) Seconde ceinture : retirer à `anon` et `authenticated` tout droit sur
--    `public`, existant et à venir. La RLS ne protège que les tables où l'on
--    pense à l'activer ; la révocation couvre aussi celles qu'on oubliera,
--    `_prisma_migrations` comprise, ainsi que séquences et fonctions.
--
--    Gardée par `pg_roles` : ces rôles n'existent que chez Supabase. Ni la base
--    locale (Docker), ni la CI, ni Clever Cloud (bascule prévue) ne les ont ;
--    un REVOKE nu y échouerait (« role "anon" does not exist ») et bloquerait
--    la migration partout ailleurs.
--
--    ALTER DEFAULT PRIVILEGES ne vaut que pour les objets que créera le rôle
--    courant, celui qui applique les migrations. Les privilèges par défaut
--    posés par d'autres rôles (supabase_admin) ne sont pas touchés.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
  END IF;
END
$$;
