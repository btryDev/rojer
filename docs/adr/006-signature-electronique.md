# ADR-006 — Signature électronique horodatée

- **Date** : 2026-04-23
- **Statut** : Acceptée
- **Auteur** : Claude Code (sur brief Paloma)
- **Relatif à** : ADR-002 (Action unifiée), ADR-007 (Prestataires & accès externe)

## Contexte

À partir de la V2, plusieurs modules vont matérialiser un acte juridique de type signature :

- **Registre de sécurité** : le prestataire (installateur extincteurs, bureau de contrôle électrique, etc.) signe son rapport de vérification pour en attester la véracité, puis le donneur d'ordre contresigne pour acter la réception.
- **Permis de feu** (à venir) : signature croisée donneur d'ordre / prestataire avant travaux par point chaud.
- **Plan de prévention** (à venir) : signature du chef de l'entreprise utilisatrice et du chef de l'entreprise extérieure (art. R. 4512-6 CT — les employeurs « arrêtent d'un commun accord, avant le début des travaux, un plan de prévention » ; aucun article du chapitre n'exige de signature, c'est l'accord commun qui est écrit. La citation portait `R. 4512-8`, qui est le contenu minimal du plan et ne dit rien des signataires — corrigé le 2026-09-07 sur le verbatim du corpus).
- **Registre d'accessibilité** (à venir) : attestation de conformité du responsable d'ERP.
- **DUERP** (éventuellement) : validation par le dirigeant à la création d'une version.

Le produit s'adresse à des dirigeants de TPE/PME. Le support papier disparaît ; la signature électronique doit donc :

1. Avoir une **valeur probatoire suffisante** en cas de contrôle (inspection du travail, commission de sécurité, assurance, bailleur).
2. Être **utilisable par un prestataire externe sans compte** (cf. ADR-007).
3. Rester **simple techniquement** (pas d'AC qualifiée, pas de carte à puce, pas d'intégration DocuSign).

### Cadre légal applicable

- **Article 1366 Code civil** : « L'écrit électronique a la même force probante que l'écrit sur support papier, sous réserve que puisse être dûment identifiée la personne dont il émane et qu'il soit établi et conservé dans des conditions de nature à en garantir l'intégrité. »
- **Article 1367 Code civil** : la signature électronique nécessite « l'usage d'un procédé fiable d'identification garantissant son lien avec l'acte auquel elle s'attache ».
- **Règlement eIDAS (UE) n° 910/2014** définit trois niveaux :
  - **Simple** : procédé fiable, présumé non-qualifié. Niveau suffisant pour tout ce qui n'est pas contrat engageant un patrimoine immobilier ou acte authentique.
  - **Avancée** : identification forte (ex. certificat sur support dédié).
  - **Qualifiée** : équivalente à la signature manuscrite, délivrée par un prestataire de services de confiance qualifié.

Aucun des actes visés par nos modules (rapport de vérification, permis de feu, plan de prévention) n'exige légalement le niveau avancé ou qualifié. La jurisprudence constante (Cass. com. notamment) admet la signature simple dès lors que son intégrité et son imputabilité peuvent être démontrées.

## Décision

On implémente une **signature électronique de niveau eIDAS « simple »** portée par une table `Signature` générique et réutilisable par tous les modules.

### Exigences fonctionnelles tenues

| Exigence art. 1366-1367 | Moyen technique |
|---|---|
| Identification du signataire | Compte Supabase authentifié **ou** email vérifié par OTP à usage unique (6 chiffres, durée de vie 10 min, 3 essais max) |
| Intégrité du document signé | Hash **SHA-256** du PDF/fichier calculé au moment de la signature, stocké en base avec la signature. Vérification rejouable à la demande. |
| Horodatage | `horodatageIso` côté serveur (timezone UTC). Pour l'horodatage qualifié (RFC 3161), on prévoit un champ `horodatageQualifieToken` qui reste `null` au MVP — extension future sans rupture. |
| Lien avec l'acte | Champs `objetType` + `objetId` pointent vers l'entité signée (rapport, permis, plan…). Piste d'audit consultable depuis le PDF. |
| Non-répudiation | IP (masquée en /24 pour IPv4 après 30 jours, conforme CNIL), `userAgent`, méthode d'authentification, historique immuable. |

### Modèle Prisma

```prisma
enum MethodeSignature {
  compte_connecte      // Utilisateur authentifié Supabase
  otp_email            // Lien magique + OTP 6 chiffres envoyé par email
}

enum ObjetSignable {
  rapport_verification
  permis_feu
  plan_prevention
  registre_accessibilite
  duerp_version
}

model Signature {
  id                String            @id @default(cuid())
  etablissementId   String
  etablissement     Etablissement     @relation(fields: [etablissementId], references: [id], onDelete: Cascade)

  objetType         ObjetSignable
  objetId           String            // ID de l'entité signée (RapportVerification.id, PermisFeu.id, etc.)

  // Identité du signataire
  signataireNom     String
  signataireEmail   String
  signataireRole    String            // libellé libre : "Gérant", "Technicien APAVE", "Chef d'entreprise extérieure"
  userId            String?           // Si signataire connecté (UUID Supabase). NULL si signature externe OTP.

  // Preuve d'intégrité
  hashDocument      String            // SHA-256 hex du fichier au moment de la signature
  nomDocument       String            // ex. "rapport-verification-electrique-2026-03-12.pdf"

  // Preuve d'imputabilité
  methode           MethodeSignature
  ipAddress         String?           // IPv4 tronquée /24 ou IPv6 tronquée /64 après rétention courte
  userAgent         String?           // borné à 500 caractères

  // Horodatage
  horodatageIso     DateTime          @default(now())
  horodatageQualifieToken String?     // réservé extension RFC 3161 (future)

  createdAt         DateTime          @default(now())

  @@index([etablissementId, objetType, objetId])
  @@index([userId])
}
```

### Scellage PDF

Quand le signataire valide, on ne modifie **pas** le PDF source. On annexe au rendu final (export « dossier de conformité » ou « registre ») un **bloc signature** visuel :

```
┌──────────────────────────────────────────────────────┐
│  ✓ Signé électroniquement                            │
│                                                      │
│  Jean DUPOND — Technicien APAVE                      │
│  jean.dupond@apave.fr                                │
│  Le 23/04/2026 à 14h32 (UTC, horodatage serveur)     │
│                                                      │
│  Méthode : OTP email                                 │
│  Empreinte SHA-256 du document :                     │
│  a3f4b2c1...ef89 (64 car.)                           │
│                                                      │
│  [Vérifier l'intégrité]   ID : sig_abc123...         │
└──────────────────────────────────────────────────────┘
```

Cliquer « Vérifier l'intégrité » ouvre une page publique `/verifier/[signatureId]` qui recalcule le hash du document courant et compare à `hashDocument`. Si un octet a changé, la signature est invalidée.

### Flux OTP email (signataire externe, pas de compte)

1. Serveur génère `token` (ULID) + `otp` (6 chiffres) + expiration `+10min`.
2. Stockage dans table `AccessToken` (cf. ADR-007) avec scope `signature:{signatureId}`.
3. Email envoyé avec lien `https://app.../signer/[token]`.
4. Page publique affiche le document à signer + champ OTP.
5. Saisie OTP → vérification serveur → création de la `Signature` + invalidation du token (usage unique).
6. Le lien reste valide pour re-téléchargement du document signé pendant 30 jours (lecture seule).

### Flux signataire connecté

1. Bouton « Signer » sur la page de l'objet.
2. Modal de confirmation → saisie OTP reçu sur l'email du compte (double facteur léger).
3. Création de la `Signature` immédiate.

### Anti-abus

- Rate limit : max 5 envois d'OTP / heure / email.
- Max 3 saisies incorrectes d'OTP → le token est révoqué, nouvel OTP requis.
- Logs de tentatives stockés 90 jours.

## Conséquences

### Positives
- Valeur probatoire **suffisante pour tous les actes du périmètre V2** (rapport de vérif, permis de feu, plan de prévention, accessibilité). Conforme aux art. 1366-1367 Code civil et eIDAS simple.
- Un seul modèle `Signature` sert 5 objets signables, évite la duplication.
- Prestataire externe peut signer sans créer de compte (essentiel pour l'adoption).
- L'intégrité du document est vérifiable à tout moment par n'importe qui (page publique).

### Négatives / coûts
- Si un jour un acte visé exige le niveau **qualifié** (hypothèse : signature électronique engageant plus de 15 000 € selon jurisprudence Cour de cassation, ou acte authentique), il faudra intégrer un prestataire qualifié (ex. Yousign, Universign, DocuSign EU). La migration est possible (champ `horodatageQualifieToken` + extension des méthodes), mais non faite au MVP.
- Dépendance à un fournisseur d'email transactionnel fiable (Resend, Postmark, Supabase SMTP). Un email non délivré = signature impossible. Monitoring nécessaire.
- L'horodatage serveur n'est **pas qualifié** (RFC 3161). En cas de contestation d'une date précise, on prouve par les logs NTP du serveur et la piste d'audit. Largement suffisant en pratique pour un contrôle administratif ; insuffisant pour un contentieux lourd.

### Neutres
- Pas d'impact RGPD au-delà du standard : IP masquée après rétention courte, emails considérés comme données d'identification légitimes (base légale = obligation légale de signature + intérêt légitime).

## Alternatives rejetées

### Alternative A — Intégration directe d'un prestataire qualifié (Yousign API)
Rejetée au MVP : coût par signature (~1-2 €), dépendance externe forte, onboarding plus lourd pour le prestataire externe, latence, et surtout **non nécessaire** pour nos actes. À réévaluer si un client enterprise l'exige.

### Alternative B — Signature manuscrite numérisée (canvas tactile)
Rejetée : sur le plan juridique, une signature manuscrite scannée apporte **moins de garanties** qu'un OTP email + hash SHA-256 (le tracé peut être copié, aucune imputabilité cryptographique, aucune intégrité). Le dessin tactile peut rester une option UX **complémentaire** (visuel rassurant) mais ne porte pas la valeur probatoire — la `Signature` reste l'élément juridique.

### Alternative C — Simple case à cocher « Je signe »
Rejetée : art. 1367 exige un « procédé fiable d'identification ». Une case à cocher seule, sans OTP ni vérification email, ne qualifie pas.

### Alternative D — Utiliser la signature d'Adobe / FranceConnect+
Rejetée : FranceConnect+ n'est pas ouvert aux acteurs privés non partenaires. Adobe Sign serait l'équivalent de Yousign (voir A).

## Checklist de mise en œuvre

1. Ajouter enums `MethodeSignature` et `ObjetSignable` dans `schema.prisma`.
2. Créer table `Signature` + migration SQL.
3. Créer `src/lib/signatures/` : `actions.ts` (créer/vérifier), `queries.ts` (lister pour un objet), `hash.ts` (calcul SHA-256 serveur), `otp.ts` (génération/envoi/vérification).
4. Dépendance email : Resend ou Supabase SMTP. Variable `SIGNATURE_MAIL_FROM`.
5. Page publique `/signer/[token]` (Server Component + Server Action).
6. Page publique `/verifier/[signatureId]` (vérification d'intégrité).
7. Composant partagé `<SignatureBlock />` (affichage scellé) et `<SignatureRequestButton />` (déclenchement flux).
8. Tests unitaires : hash, OTP (génération, expiration, anti-bruteforce), sérialisation du bloc.

## Notes de conformité

- **RGPD** : `ipAddress` et `userAgent` = données techniques liées à la preuve. Base légale : **obligation légale** (art. 1366 C. civ.) + intérêt légitime. Durée de conservation : alignée sur la durée de conservation du document signé (ex. DUERP 40 ans, rapport de vérif 5 ans — cf. politique de rétention globale du produit).
- **CNIL** : pas de traitement de catégorie sensible. Pas de TIA nécessaire.
- **Hébergement** : Supabase EU (Frankfurt) — conforme.
