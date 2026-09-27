# Stockage des fichiers — mise en service sur Vercel

*Écrit le 2026-09-27 (`lot/stockage-supabase`, journal C46).*

## Pourquoi

Rojer stocke des fichiers déposés : rapports de vérification, pièces des
prestataires (URSSAF, RC Pro, Kbis), rapports de laboratoire du carnet
sanitaire. Jusqu'ici, le seul pilote écrivait sur le disque du serveur
(`./storage`). Sur Vercel, ce disque est en lecture seule et éphémère : aucun
dépôt ne peut y survivre.

Désormais :

- en **production**, le disque local est **refusé** : sans configuration, un
  dépôt affiche « Le dépôt de fichiers n'est pas encore configuré sur ce
  serveur. », et la lecture d'un fichier répond 503 avec le même message ;
- le pilote **`supabase`** écrit dans un **bucket privé** de Supabase Storage,
  côté serveur seulement, avec la clé `service_role`. Aucune URL signée ni
  publique n'est émise : l'application lit le fichier et le transmet après
  son propre contrôle d'accès.

Relevé des variables de production du projet Vercel, le 2026-09-27 (noms
seulement) : `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `MCP_CLE`, `MCP_ETABLISSEMENT_ID`.
Aucune variable de stockage. En Preview : les deux `NEXT_PUBLIC_SUPABASE_*`
seulement.

## Les variables

| Nom | Où | Rôle |
|---|---|---|
| `STORAGE_DRIVER` | serveur | `supabase` en production. `local` (défaut) n'est accepté qu'en développement. |
| `STORAGE_BUCKET` | serveur | Le nom du bucket **privé** créé dans le projet Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | serveur, **secrète** | La clé `service_role` du projet (Settings → API Keys). **Jamais** préfixée `NEXT_PUBLIC_` : elle contourne les règles d'accès, et Next l'enverrait au navigateur. |
| `NEXT_PUBLIC_SUPABASE_URL` | déjà posée | L'URL du projet, déjà utilisée par l'authentification. Rien à faire. |

## Les gestes, côté propriétaire

Rojer n'écrit rien lui-même dans le projet Supabase ni sur Vercel.

1. **Supabase** → le projet de production → **Storage** → **New bucket** :
   un nom (par exemple `rojer-fichiers`), **Public bucket : désactivé**. Aucune
   policy à ajouter : la clé `service_role` n'en a pas besoin, et sans policy
   personne d'autre ne lit le bucket.
2. **Supabase** → **Settings** → **API Keys** → onglet **Legacy API keys** :
   copier la clé **`service_role`** — un JWT qui commence par `eyJ`, en trois
   parties séparées par des points. **Pas** la clé `sb_secret_…` du nouvel
   onglet : supabase-js la pose sur `Authorization: Bearer`, où la
   documentation de Supabase dit de ne pas la mettre, et Storage répond
   « Invalid Compact JWS ». **Pas** non plus le « JWT secret » du projet.
   *(Précisé le 2026-09-27, après le premier dépôt en production, journal C47.)*
   Coller la valeur seule : blancs et guillemets aux bords sont retirés, mais
   une coupure au milieu ne l'est pas. Au déploiement suivant, le journal du
   serveur (Vercel → Logs) écrit la forme reconnue — par exemple « JWT à trois
   segments, rôle « service_role », 219 caractères » —, jamais la valeur.
3. **Vercel** → le projet → **Settings** → **Environment Variables**, pour
   l'environnement **Production** (et **Preview** si l'on veut déposer depuis
   une préversion — elle écrirait alors dans le même bucket) :
   - `STORAGE_DRIVER` = `supabase`
   - `STORAGE_BUCKET` = le nom du bucket de l'étape 1
   - `SUPABASE_SERVICE_ROLE_KEY` = la clé de l'étape 2, en variable
     **sensible**
4. **Vercel** → **Deployments** → le dernier déploiement de production →
   **Redeploy** : les variables ne sont lues qu'au déploiement.
5. Vérifier : déposer un rapport sur une vérification, puis l'ouvrir depuis sa
   fiche.

S'il manque une variable, le dépôt est refusé avec le message ci-dessus, et
le journal du serveur (Vercel → Logs) nomme la variable absente — jamais sa
valeur.

## Ce qui se passe si une ligne pointe vers un fichier absent

- **Lecture d'un rapport** (`/api/rapports/[id]/fichier`) : 410, « Le fichier
  n'est pas disponible : il n'a pas été retrouvé dans le stockage. » Pas
  d'erreur 500.
- **Export contrôle (ZIP)** : la pièce manquante est comptée, et le README de
  l'archive le dit ; l'archive se construit quand même, y compris sans
  stockage configuré.
- **Signature d'un rapport** : « fichier introuvable », l'empreinte n'est pas
  calculée.
- **Suppression** (rapport, prestataire, établissement, entreprise, salarié) :
  la base est effacée ; un fichier qui ne se libère pas est journalisé côté
  serveur, sans faire échouer la suppression.

Il ne devrait exister aucune ligne de ce genre en production : le dépôt ne
pouvait pas y aboutir.

## Plus tard : Clever Cloud (S3)

Le pilote implémente `FileStorage` (`src/lib/storage/types.ts`). Un pilote S3
s'ajoutera à côté de `supabase.ts` et se branchera dans `getStorage()`
(`STORAGE_DRIVER=s3`) sans toucher aux appelants. Les fichiers déjà déposés
seront à recopier d'un stockage à l'autre, clé par clé.
