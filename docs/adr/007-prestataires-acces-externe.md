# ADR-007 — Prestataires & accès externe par token

- **Date** : 2026-04-23
- **Statut** : Acceptée
- **Auteur** : Claude Code (sur brief Paloma)
- **Relatif à** : ADR-005 (Auth Supabase), ADR-006 (Signature)

## Contexte

Plusieurs obligations réglementaires impliquent un **tiers qui intervient dans l'établissement** :

- **Vérifications périodiques** (art. R4226-16 CT, R4323-22 et s., règlement ERP) : un **organisme agréé** (Apave, Bureau Veritas…) ou une entreprise spécialisée (installateur extincteurs) produit un rapport.
- **Travaux par des entreprises extérieures** (art. R4511-5 et s. CT, décret 92-158) : le donneur d'ordre établit un **plan de prévention** avec le chef de l'entreprise extérieure. Les deux signent.
- **Permis de feu** : co-signé par le donneur d'ordre et l'entreprise exécutant les travaux par point chaud.
- **Interventions curatives** (dépannages, maintenance) : besoin de tracer qui est venu, quand, pour quelle intervention.

Ces tiers ne sont **pas des utilisateurs** de la plateforme. Ils n'ont aucun intérêt à créer un compte Supabase pour une intervention ponctuelle. Imposer la création de compte = friction qui casse l'adoption, et expose la plateforme à des bases mortes de milliers de comptes jamais réutilisés.

### Cadre légal sur le donneur d'ordre

- **Art. L8222-1 et L8222-5 CT** : obligation de vigilance. Pour tout contrat d'au moins 5 000 € HT, le donneur d'ordre vérifie que son cocontractant est à jour de ses déclarations sociales (**attestation de vigilance URSSAF**, renouvelée tous les 6 mois).
- **Art. D8222-5 CT** : liste des pièces à vérifier (attestation URSSAF, immatriculation RCS / Répertoire des métiers, liste nominative des salariés étrangers le cas échéant).
- **Art. R4511-7 CT** : lors d'une intervention d'entreprise extérieure, information réciproque sur les risques.
- **Responsabilité civile professionnelle** : exigence contractuelle quasi-systématique (assurance RC Pro en cours de validité).

Le produit doit donc servir **à la fois** :

1. Un **annuaire des prestataires** utilisé en interne par le dirigeant (sélection rapide, pièces justificatives archivées, alertes d'expiration).
2. Un **accès externe ponctuel** pour permettre à un prestataire donné de déposer un rapport, co-signer un document, ou consulter une intervention qui le concerne.

## Décision

Deux tables complémentaires :

### 1. `Prestataire` — annuaire interne

```prisma
enum DomainePrestataire {
  electricite
  incendie            // extincteurs, BAES, alarme, désenfumage
  ascenseur
  porte_automatique
  ventilation_vmc
  cuisson_hotte
  equipement_pression
  levage
  stockage_dangereux
  carnet_sanitaire    // légionelles, analyses eau
  bureau_controle     // organismes agréés généralistes (Apave, BV, Dekra, Socotec…)
  entretien_general
  travaux_btp
  nettoyage
  autre
}

model Prestataire {
  id                          String               @id @default(cuid())
  etablissementId             String
  etablissement               Etablissement        @relation(fields: [etablissementId], references: [id], onDelete: Cascade)

  // Identité
  raisonSociale               String
  siret                       String?              // 14 chiffres, facultatif
  estOrganismeAgree           Boolean              @default(false)  // Apave, BV, Dekra, Socotec…
  domaines                    DomainePrestataire[] // multi-select

  // Contact principal
  contactNom                  String
  contactEmail                String
  contactTelephone            String?

  // Vigilance L8222-1
  attestationUrssafCle        String?              // FileStorage key
  attestationUrssafNom        String?              // nom original
  attestationUrssafValableJusquA DateTime?         // obligation de renouvellement tous les 6 mois

  assuranceRcProCle           String?
  assuranceRcProNom           String?
  assuranceRcProValableJusquA DateTime?

  kbisCle                     String?
  kbisNom                     String?
  kbisDateEmission            DateTime?

  // Notes libres
  notesInternes               String?              @db.Text

  createdAt                   DateTime             @default(now())
  updatedAt                   DateTime             @updatedAt

  @@index([etablissementId])
  @@index([etablissementId, raisonSociale])
}
```

### 2. `AccessToken` — accès externe ponctuel

```prisma
enum ScopeAccessToken {
  signature              // Signer un objet (cf. ADR-006)
  depot_rapport          // Déposer un rapport de vérification
  copreparation_plan     // Remplir sa partie du plan de prévention
  consultation           // Lecture seule (ex. intervention à venir)
}

model AccessToken {
  id              String            @id @default(cuid())
  tokenHash       String            @unique                 // SHA-256 du token clair (le clair n'est jamais en base)

  etablissementId String
  etablissement   Etablissement     @relation(fields: [etablissementId], references: [id], onDelete: Cascade)

  // Cible du token
  scope           ScopeAccessToken
  objetType       String            // ex. "rapport_verification", "permis_feu", "plan_prevention", "signature"
  objetId         String            // ID de l'objet ciblé
  prestataireId   String?           // si connu d'avance (optionnel — accès externe peut être envoyé à un invité ad-hoc)

  // Destinataire & usage
  emailDestinataire String
  nomDestinataire String?

  // OTP (pour signature / actes avec preuve)
  otpHash         String?           // SHA-256 de l'OTP clair, NULL si scope = consultation
  otpEssaisRestants Int             @default(3)

  // Cycle de vie
  expireLe        DateTime
  utiliseLe       DateTime?
  revoqueLe       DateTime?
  revoqueMotif    String?

  // Traçabilité
  createdByUserId String             // UUID Supabase du donneur d'ordre qui a émis le token
  createdAt       DateTime           @default(now())
  derniereUtilisationIp String?
  derniereUtilisationUserAgent String?

  @@index([etablissementId])
  @@index([objetType, objetId])
  @@index([tokenHash])
}
```

### Règles applicatives

#### Émission du token

- Seul un utilisateur authentifié (`requireUser()`) peut émettre un token.
- Le **token clair** est une ULID (26 car. Crockford, 128 bits, collision quasi-impossible) **envoyée uniquement par email**. Seul son hash SHA-256 est stocké.
- Expiration par défaut : **7 jours** (configurable par scope : `consultation` 30 j, `signature` 72 h).
- URL publique : `https://app.../acces/[token]` (route unique qui route vers la vue adaptée selon scope).

#### Usage du token

- Sur accès à l'URL, serveur hash le token reçu → lookup en base → vérifie (non expiré, non révoqué, non utilisé pour scopes à usage unique).
- Pour `signature` et `depot_rapport` : OTP 6 chiffres envoyé à `emailDestinataire` au premier accès. 3 essais max, puis révocation auto.
- Pour `consultation` : pas d'OTP, le lien suffit (risque acceptable pour lecture seule).
- Après utilisation validante : `utiliseLe = now()`, le token ne peut plus servir.

#### Révocation

- L'émetteur peut révoquer à tout moment depuis l'interface (bouton « Annuler l'accès »).
- Révocation auto si `otpEssaisRestants = 0`.
- ~~Les tokens expirés sont purgés automatiquement par un cron (soft delete 90 j, puis hard delete) pour garder la table légère et conserver une piste d'audit courte.~~ [2026-10-15, ménage des ADR : **JAMAIS CONSTRUIT** — ni `cron.ts`, ni purge, ni cron dans `vercel.json`. Un jeton expiré est refusé à l'usage (`verify.ts`) mais reste en base avec le nom, l'adresse, l'IP et l'agent du tiers ; `docs/rgpd.md` § 4 ne fixe aucune durée pour `AccessToken`. Dette RGPD, en décision attendue dans `docs/chantiers-ouverts.md` § 0. Aucun jeton ne peut être émis en production depuis le 2026-09-26 (C38 : l'envoi hors service refuse avant toute écriture) ; ceux qu'une demande y laissait orphelins avant cette date peuvent y être encore — à compter en lecture seule.]

#### Scoping

- **Aucune** query côté token-porteur ne doit by-passer les invariants de propriété de l'établissement. L'accès externe ne voit que `objetType + objetId` de **son** token, rien d'autre.
- Middleware Next.js distingue les routes `/acces/*` et `/signer/*` du reste (pas de session Supabase requise, mais rate limit et logging renforcés).

### Relation Prestataire ↔ AccessToken ↔ autres entités

- `PermisFeu` et `PlanPrevention` portent un `prestataireId` **relié** à l'annuaire : FK optionnelle, `ON DELETE SET NULL`, avec la relation inverse déclarée sur `Prestataire`. Cela connecte l'annuaire à l'historique sans imposer la création préalable d'une fiche prestataire (le dirigeant peut aussi saisir un prestataire inconnu à la volée). `AccessToken` porte la même FK (cf. ci-dessous).
- **`Verification` n'en porte pas** — et n'en a jamais porté. La rédaction d'origine la citait en tête de liste ; c'était faux dès l'écriture de cet ADR. Le réalisateur d'une occurrence de vérification se lit donc ailleurs — `RapportVerification.organismeVerif`, en texte libre — et rien ne relie aujourd'hui une occurrence à une fiche de l'annuaire.
- **`Intervention` porte la colonne mais aucune clé étrangère** : `prestataireId String?` seul, sans `@relation`, sans inverse sur `Prestataire`, et la migration `20260423210000_interventions` ne pose que deux `FOREIGN KEY` (`etablissementId`, `interventionId`). Rien ne garantit donc que la valeur désigne un prestataire existant, et rien ne la nettoie à la suppression d'une fiche. Sans conséquence pratique : le module Interventions est **retiré** (ADR-018), la colonne est un vestige.
- Un `AccessToken` peut référencer un `prestataireId` si connu, mais ce n'est pas obligatoire (un artisan ponctuel peut recevoir un lien sans qu'on crée sa fiche).

*Corrigé le 2026-08-28, en deux fois.* La rédaction d'origine plaçait `Verification` en tête de cette liste. La première correction a retiré `Verification` mais qualifié les trois restants de « FK optionnelle `ON DELETE SET NULL` » — vrai pour deux d'entre eux, faux pour `Intervention`, soit le défaut corrigé rejoué dans sa correction. Relevé au schéma et aux migrations, modèle par modèle : quatre modèles portent la **colonne** (`AccessToken`, `PermisFeu`, `PlanPrevention`, `Intervention`), trois seulement portent la **clé étrangère**.

## Conséquences

### Positives
- **Onboarding externe zéro friction** : un prestataire reçoit un lien par email, clique, dépose son rapport, signe, c'est fini. Aucun compte. C'est l'expérience Deemply et mieux.
- **Vigilance L8222-1 matérialisée** : alertes d'expiration visibles, document uploadable, pas juste un carnet d'adresses. Argument commercial **fort** vs concurrents (aucun ne documente cette obligation explicitement).
- **Un seul mécanisme de token** sert tous les cas (signature, dépôt, consultation, co-préparation). Sécurité concentrée, facile à auditer.
- **Traçabilité complète** : qui a émis quel token, pour qui, quand utilisé, IP, UA. Piste d'audit présentable en cas de contestation.

### Négatives / coûts
- Dépendance email transactionnel (déjà requise pour ADR-006). Surveiller la délivrabilité.
- Un cron de nettoyage des tokens est nécessaire (simple, mais à ne pas oublier). À défaut, la table grossit indéfiniment. [2026-10-15 : oublié — voir l'annotation des conséquences positives ci-dessus.]
- L'accès externe sans compte **n'a pas d'historique unifié** pour le prestataire (il reçoit N liens, un par mission). Ce n'est pas un problème au MVP : la plupart des prestataires ne veulent pas se connecter. Si besoin, on ajoute plus tard une route « Mes interventions » accessible avec email + OTP persistant (hors périmètre).

### Neutres
- Le champ `notesInternes` n'est jamais exposé au prestataire (restriction côté query).
- La fiche prestataire est facultative : on ne force pas la création avant émission d'un token (flux « invité » supporté).

## Alternatives rejetées

### Alternative A — Forcer la création d'un compte Supabase pour chaque prestataire
Rejetée : friction catastrophique pour un prestataire intervenant 1 fois par an. Base mortes, comptes oubliés, mauvaise UX.

### Alternative B — Magic link seul sans OTP
Rejetée pour `signature` et `depot_rapport` : si le prestataire fait suivre son email (ou son email est compromis), l'OTP ajoute une barrière. Coût UX minime (6 chiffres), bénéfice sécurité sensible.

### Alternative C — Table `Signature` qui inclut elle-même le token
Rejetée : couple trop fort. Un token peut servir à autre chose qu'une signature (dépôt de rapport, consultation). On garde deux entités avec responsabilités claires.

### Alternative D — JWT signé sans stockage en base
Rejetée : impossible de révoquer avant expiration sans blacklist. Un stockage léger avec hash est plus flexible.

### Alternative E — Fusionner `Prestataire` et `Utilisateur externe`
Rejetée : un prestataire (au sens fiche annuaire) n'est pas systématiquement destinataire d'un token, et un token peut aller à un contact ad-hoc qui n'est pas encore dans l'annuaire. Les deux notions sont volontairement découplées.

## Checklist de mise en œuvre

### Phase 0.1 — Annuaire
1. Ajouter enum `DomainePrestataire` + table `Prestataire` dans `schema.prisma`.
2. Migration Prisma.
3. Créer `src/lib/prestataires/` : `actions.ts` (CRUD), `queries.ts`, `schema.ts` (Zod), `vigilance.ts` (calcul d'expiration + alertes).
4. Routes `/etablissements/[id]/prestataires/` (liste, nouveau, [prestataireId]/modifier).
5. Composants : `PrestataireCard`, `AjoutPrestataireWizard` (3 étapes), `UploadAttestationForm`.
6. Widgets dashboard : alertes URSSAF et RC Pro expirant < 30 j.
7. Tests : Zod SIRET, calcul d'expiration, alertes.

### Phase 0.3 — Access token
8. Ajouter enum `ScopeAccessToken` + table `AccessToken`.
9. Migration.
10. Créer `src/lib/access-tokens/` : `generate.ts` (émission), `verify.ts` (consommation), `revoke.ts`, ~~`cron.ts` (purge)~~ [2026-10-15 : jamais créé].
11. Route publique `/acces/[token]` (Next.js route handler) qui dispatch selon scope.
12. Intégration avec `src/lib/signatures/` (cf. ADR-006).
13. Tests : génération ULID, hash, expiration, tentatives OTP, révocation.

### Dépendances transverses
- Fournisseur email transactionnel configuré (Resend / Supabase SMTP).
- Variable `PUBLIC_APP_URL` utilisée dans les emails.
- Variable `ACCESS_TOKEN_DEFAULT_TTL_HOURS` (défaut 168 = 7 j).

## Notes de conformité

- **RGPD** : `emailDestinataire`, `nomDestinataire`, IP, UA sont des données personnelles d'une tierce personne. Base légale : **intérêt légitime** (permettre au donneur d'ordre de tenir son registre et d'exécuter une obligation légale). Durée de conservation : alignée sur la durée de conservation de l'objet signé / du rapport déposé, avec une ~~**purge soft** des tokens expirés à 90 j.~~ [2026-10-15 : la purge n'existe pas, et `docs/rgpd.md` § 4 ne fixe aucune durée à `AccessToken` : la conservation promise ici n'est pas tenue. Décision 14 de `docs/chantiers-ouverts.md` § 0.]
- **L8222-1 / D8222-5** : les documents uploadés (URSSAF, RC Pro, Kbis) sont chiffrés au repos (FileStorage) et seul le donneur d'ordre y a accès.
- **Information du destinataire** : le premier email contenant le token mentionne en pied la finalité, le responsable de traitement, la durée de conservation et le droit d'accès / effacement (conforme art. 13 RGPD).
