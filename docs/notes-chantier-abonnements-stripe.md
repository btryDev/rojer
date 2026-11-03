# Chantier abonnements (Stripe) — notes pour le plan

2026-11-02. Notes de lecture et de cadrage, **pas un plan validé** : elles
préparent l'ADR-053 et le découpage en lots. Branche `lot/abonnements-stripe`,
partie de `cc` à `a4058ce2` — le chantier vit sur `cc`, pas sur `main`
(l'abonnement s'accroche au compte, et seul `cc` a des comptes dans notre base,
ADR-052). **Rien n'est fusionné dans `cc` avant la bascule** : `cc` vient d'être
validée sur base neuve, le paiement élargirait ce qu'il faut revalider.

Le paiement est écrit « hors périmètre » au CLAUDE.md (§ Hors périmètre) :
l'ouvrir est la décision de la propriétaire, actée par l'ADR-053.

## 1. Décidé, proposé, ouvert

**Décidé (propriétaire, 2026-11-02)**
- Plusieurs formules d'abonnement, et un essai gratuit.
- L'offre (contenu et prix des formules) n'est pas encore arrêtée : on
  construit ce qui n'en dépend pas.

**Proposé, à confirmer dans l'ADR-053**
- L'abonnement est porté par le **compte** (`User`), pas par l'entreprise.
  Une TPE, c'est presque toujours un compte et une entreprise ; une formule
  peut toujours limiter le nombre d'entreprises ou d'établissements. Passer
  plus tard à un abonnement par entreprise demanderait une migration.
- La carte se saisit sur la **page hébergée par Stripe** (Checkout, redirection)
  plutôt que dans un formulaire intégré : un script injecté dans Rojer ne
  peut au pire que changer le lien, pas imiter le formulaire ; aucun script
  Stripe à autoriser dans notre CSP. Même tarif que le formulaire intégré.
- Un impayé **bloque la saisie, jamais la lecture ni l'export** : le client
  doit garder la main sur ce qu'il est tenu de conserver (DUERP : 40 ans).
- Stripe par **son SDK direct**, pas par le module Stripe de Better Auth
  (raisons au § 3).

**Ouvert (n'empêche pas de construire le socle)**
- Contenu des formules, prix, mensuel et/ou annuel.
- Ce qui distingue les formules : un volume (nombre d'établissements,
  d'entreprises) ou des modules ouverts/fermés. À trancher avant le lot 3.
- Durée de l'essai ; essai **avec ou sans carte** (§ 2.4).
- TVA : taux fixe ou Stripe Tax (§ 6).
- Facturation électronique (§ 6).

## 2. Ce que dit la doc Stripe (lue le 2026-11-02)

### 2.1 Cycle de vie d'un abonnement

Huit états ([overview](https://docs.stripe.com/billing/subscriptions/overview.md)) :

| État | Sens | Pour Rojer (proposé) |
|---|---|---|
| `trialing` | essai en cours | accès complet |
| `active` | en règle | accès complet |
| `incomplete` | premier paiement en attente, **23 heures** pour payer (ou 3D Secure à faire) | pas encore abonné |
| `incomplete_expired` | premier paiement jamais fait ; définitif | pas abonné |
| `past_due` | un renouvellement a échoué, Stripe relance | accès complet + bandeau « mettez à jour votre carte » |
| `unpaid` | relances épuisées (si réglé ainsi) | **saisie bloquée**, lecture et export ouverts |
| `canceled` | résilié ; définitif, un réabonnement crée un nouvel abonnement | saisie bloquée, lecture et export ouverts |
| `paused` | essai fini sans carte, si `missing_payment_method=pause` | saisie bloquée, lecture et export ouverts |

Stripe dit de **révoquer l'accès à `canceled` et `unpaid`**. Ce qui suit
`past_due` après la dernière relance se règle dans le tableau de bord Stripe
(`canceled`, `unpaid` ou rester `past_due`) : **proposer `unpaid`**, qui garde
l'abonnement et permet de régulariser sans tout recréer. Garder la résolution
d'état par défaut (« dernière facture »).

Paiements à confirmation différée (prélèvement SEPA) : un abonnement peut être
`active` alors que le paiement n'a pas encore abouti, et le rester si le
paiement échoue ensuite (la facture est annulée). À garder en tête si on ouvre
le SEPA.

### 2.2 Donner l'accès : jamais sur la redirection

- L'accès se donne sur **réception d'un webhook**, jamais sur le retour du
  client vers `success_url` (une adresse se tape à la main).
- Sur `invoice.paid`, Stripe dit de **relire l'abonnement et vérifier qu'il est
  `active`** avant de prolonger l'accès
  ([webhooks d'abonnement](https://docs.stripe.com/billing/subscriptions/webhooks.md), § « Suivre les abonnements actifs »).

### 2.3 Webhooks — règles ([webhooks](https://docs.stripe.com/webhooks.md))

- **Signature** vérifiée sur le **corps brut** (en-tête `Stripe-Signature`,
  secret `whsec_…`), par la bibliothèque officielle. Tolérance d'horodatage par
  défaut **5 minutes** — ne jamais la mettre à 0 (ça désactive l'anti-rejeu).
- **Répondre 2xx vite**, avant toute logique longue.
- **Doublons** : un même événement peut arriver plusieurs fois → enregistrer
  l'`id` des événements traités et ignorer les déjà vus. Stripe signale aussi
  des cas de **deux événements distincts** pour un même changement : dédoublonner
  aussi par `data.object.id` + `type`.
- **Aucun ordre garanti**, et `created` est en secondes : ne pas s'en servir
  pour ordonner. Conséquence pour nous : sur un événement d'abonnement,
  **relire l'abonnement par l'API** et enregistrer son état courant, plutôt que
  d'appliquer la charge utile — l'ordre d'arrivée cesse alors de compter.
- **Relances** : jusqu'à **3 jours** (recul exponentiel) en production ; en
  test, 3 tentatives en quelques heures.
- N'écouter **que les types d'événements traités**. Attention à
  `invoice.created` : s'il est écouté et reste sans réponse 2xx, Stripe retarde
  la finalisation des factures jusqu'à 72 heures → ne pas l'écouter tant qu'on
  n'en fait rien.
- HTTPS obligatoire en production (TLS 1.2 ou 1.3). Rotation régulière du
  secret, avec chevauchement possible de 24 heures.
- Format « léger » (thin) recommandé par Stripe pour les nouveaux endpoints
  (l'événement ne porte que l'identifiant ; on relit l'objet). Il est cohérent
  avec la relecture systématique ci-dessus. ~~À choisir dans l'ADR ; le format
  « instantané » (snapshot) reste celui de la plupart des exemples.~~
  [2026-11-03 : choisi, ADR-053 § 5 « Réception » ; le SDK 23.1.0 type les
  événements `v1.customer.subscription.*`, `v1.checkout.session.*` et
  `v1.invoice.*` au format léger.]
- Événements de risque à écouter dès qu'on encaisse : `charge.dispute.created`,
  `charge.refunded`, `radar.early_fraud_warning.created` (au minimum une trace
  et une alerte).

**Événements proposés pour le socle** : `checkout.session.completed`,
`customer.subscription.created`, `.updated`, `.deleted`, `.paused`,
`.resumed`, `.trial_will_end` (**3 jours** avant la fin de l'essai),
`invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`,
et les trois de risque.

### 2.4 Essai gratuit

- Stripe recommande désormais les **« offres d'essai »** pour une nouvelle
  intégration, **mais** Checkout ne les prend en charge qu'en bêta privée, et
  le portail client ne permet pas de modifier un abonnement sous offre d'essai
  ([comparaison](https://docs.stripe.com/billing/subscriptions/trials/compare.md)).
  → Pour nous : la **période d'essai gratuite classique**
  (`subscription_data.trial_period_days` dans Checkout).
- **Sans carte** : `payment_method_collection: "if_required"` +
  `trial_settings.end_behavior.missing_payment_method` = `cancel`, `pause`
  ou `create_invoice` ([essais](https://docs.stripe.com/billing/subscriptions/trials/free-trials.md)).
  Stripe met en garde : sans carte, les robots créent de faux essais —
  l'inscription de Rojer exige déjà une adresse vérifiée, c'est un frein.
- **Règles des réseaux de cartes** ([conformité](https://docs.stripe.com/billing/subscriptions/trials/manage-trial-compliance.md)) :
  e-mail de rappel avant la fin de l'essai (Stripe l'envoie **7 jours** avant si
  on l'active ; jamais en environnement de test), lien d'annulation, libellé
  de relevé bancaire : 22 caractères au plus, et au-delà du 10ᵉ, Stripe
  remplace la fin par `* TRIAL OVER` → **libellé court**.
- Un client peut-il refaire un essai ? À nous de l'empêcher (Better Auth le
  fait seul, une fois par compte ; en SDK direct, c'est une colonne).

### 2.5 Portail client ([portail](https://docs.stripe.com/customer-management.md))

- Hébergé par Stripe, **ne s'affiche pas dans une iframe** : redirection.
- Le client y change de carte, voit et télécharge ses factures, change de
  formule (**10 produits au plus** proposés), résilie (tout de suite ou en fin
  de période) ; on peut recueillir le motif de résiliation.
- Session courte : expire au bout de **5 minutes** si elle n'est pas ouverte,
  puis une heure après la dernière activité.
- Modifier un abonnement en essai depuis le portail **termine l'essai** et
  facture tout de suite, sauf `features.subscription_update.trial_update_behavior = continue_trial`.
- **Un seul prix par produit et par intervalle** : un tarif « réduit » se fait
  par un produit distinct.

### 2.6 Droits par formule (Entitlements) ([doc](https://docs.stripe.com/billing/entitlements.md))

- On déclare des **fonctionnalités** (`lookup_key`) et on les rattache aux
  produits ; Stripe tient la liste des droits actifs de chaque client et
  envoie `entitlements.active_entitlement_summary.updated` à chaque changement
  (10 droits au plus dans la charge utile, au-delà suivre `entitlements.url`).
- Stripe recommande d'en **garder une copie chez nous**.
- Ce sont des **présences** (oui/non), pas des quotas : utile si les formules
  ouvrent ou ferment des modules ; un plafond d'établissements reste à nous.
- Intérêt : changer le contenu d'une formule dans le tableau de bord Stripe
  sans redéployer. À trancher quand l'offre sera connue.

### 2.7 Clés ([bonnes pratiques](https://docs.stripe.com/keys-best-practices.md))

- Jamais dans le code ; variables d'environnement (Clever Cloud) faute de
  coffre-fort.
- **Clé restreinte** (`rk_…`) aux seules permissions utiles, plutôt que la clé
  secrète complète.
- Rotation régulière ; restriction par IP possible si les sorties de Clever
  Cloud sont stables (à demander au support).
- Ne jamais afficher les variables d'environnement (pages d'erreur, mode
  diagnostic).

### 2.8 Tests ([tests Billing](https://docs.stripe.com/billing/testing.md))

- **Environnements de test (sandboxes) distincts** pour le local et pour la CI.
- **Horloges de simulation** (test clocks) : avancer le temps pour voir la fin
  d'essai, un renouvellement, un échec — au plus deux périodes d'un coup.
- Cartes : `4242 4242 4242 4242` (succès), `4000 0000 0000 0341` (s'attache,
  échoue au prélèvement suivant — avec un essai de quelques minutes),
  `4000 0027 6000 3184` (3D Secure).
- `stripe listen --forward-to localhost:3000/<route>` relaie les webhooks en
  local et donne un `whsec_` de test ; `stripe trigger` déclenche des
  événements (charge utile factice : préférer de vrais abonnements de test).
- `stripe-mock` pour les tests automatisés.

### 2.9 Divers

- Stripe pousse un nouveau modèle de client (« Accounts v2 »), **en aperçu
  public** hors Connect : rester sur l'objet `Customer` classique.
- Tarifs France ([stripe.com/fr/pricing](https://stripe.com/fr/pricing), lus le
  2026-11-02) : cartes standard de l'EEE 1,5 % + 0,25 € ; cartes premium de
  l'EEE 2,8 % + 0,25 € ; cartes britanniques 2,5 % + 0,25 € ; internationales
  3,15 % + 0,25 € (+ 2 % si conversion) ; prélèvement SEPA 0,35 € ; Billing
  0,7 % du volume ; Stripe Tax 0,5 % (sans code) ou 0,45 € par transaction (API) ;
  Invoicing Starter 0,4 % par facture payée. Checkout hébergé ou intégré : pas
  de surcoût.

## 3. Module Stripe de Better Auth : lu, écarté (proposé)

Ce qu'il fait ([doc](https://www.better-auth.com/docs/plugins/stripe)) :
`@better-auth/stripe`, SDK `stripe@^23` ; table `subscription`
(`referenceId`, `plan`, `status`, `stripeSubscriptionId`, `trialStart`,
`trialEnd`, `cancelAtPeriodEnd`…) et `stripeCustomerId` sur `user` ; formules
en config (`name`, `priceId`/`lookupKey`, `limits`, `freeTrial.days`) ; un
seul essai par compte, automatique ; un seul abonnement actif par référence ;
webhook sur **`/api/auth/stripe/webhook`**, quatre événements traités
(`checkout.session.completed`, `customer.subscription.created/updated/deleted`),
le reste par `onEvent`.

Pourquoi le SDK direct (à confirmer dans l'ADR-053) :
1. **Sur `cc`, aucune route HTTP de Better Auth n'est montée, par choix**
   (`src/lib/auth/better-auth.ts` : tout passe par `auth.api.*` depuis nos
   actions, avec notre limitation de débit). Le module exige sa route webhook :
   il faudrait rouvrir une surface fermée exprès.
2. Le dédoublonnage des événements, la relecture de l'abonnement et la
   correspondance état → droits (§ 2.1) sont à écrire de toute façon ; la doc
   du module ne dit pas qu'il dédoublonne.
3. Sa table porte `referenceId` en texte libre, sans clé étrangère, écrite par
   le client Prisma brut : à faire entrer dans la RLS et dans les gardes
   d'isolation (ADR-051) comme une table à nous, sans en tenir le code.
4. Il impose une version du SDK Stripe et suit son propre rythme de version.

Ce qu'on perd : quelques centaines de lignes à écrire (session Checkout,
portail, webhook). Ce qu'on garde : la logique d'un essai par compte se
reproduit par une colonne.

## 4. Où ça se branche dans `cc` (a4058ce2)

- **Compte** : `User` (uuid, Better Auth), `requireCompte()` → `{ user, db }`,
  client borné au compte (ADR-051, `src/lib/auth/portee/`).
- **Tables neuves** (`Abonnement`, `EvenementStripe` pour le dédoublonnage) :
  RLS comme les 39 autres (`migrations-rls.test.ts`), lectures par le client
  borné (`tenancy-lectures`).
- **Route webhook** (`/api/stripe/webhook`) : accès **sans session**. Même
  règle que `compte-hors-session.ts` : le compte se déduit de l'objet Stripe
  **relu par l'API** (client Stripe → `metadata.userId` posé par nous à la
  création), jamais d'un identifiant de la charge utile pris tel quel. À
  inscrire là où les accès sans session sont listés et éprouvés
  (`tenancy-routes`). Hors limitation de débit par IP (Stripe relance), mais
  signature vérifiée avant toute lecture en base.
- **`src/env.ts`** : `STRIPE_SECRET_KEY` (clé restreinte), `STRIPE_WEBHOOK_SECRET`.
  Refuser au démarrage une clé `live` hors production et une clé `test` en
  production, comme `STORAGE_DRIVER=local` y est refusé.
- **CSP** (`src/lib/securite/entetes.ts`) : avec Checkout hébergé, ni
  `script-src` ni `connect-src` ne bougent (pas de Stripe.js). Mais
  `form-action 'self'` : un formulaire envoyé sans JavaScript, redirigé vers
  `checkout.stripe.com`, peut être bloqué par certains navigateurs. Soit un
  lien vers une route GET qui redirige, soit `checkout.stripe.com` et
  `billing.stripe.com` en `form-action` — à éprouver.
- **Clever Cloud** : processus Node durable ; le webhook peut enregistrer
  l'événement, le traiter dans la même requête (volume minuscule) et répondre
  500 en cas d'échec pour que Stripe relance. Pas de file d'attente au début.
- **Suppression de compte** : n'existe pas (ni sur `main` ni sur `cc`). Le jour
  où elle arrive, elle doit résilier l'abonnement Stripe ; les factures, elles,
  ont leur propre durée légale de conservation (à vérifier avec
  l'expert-comptable).
- **RGPD** : ajouter Stripe à `docs/rgpd.md` (rôle, données transmises, lieu de
  traitement) — à vérifier sur la doc légale de Stripe.

## 5. Ce qui peut se construire sans l'offre — lots proposés

0. **ADR-053** : porteur (compte), état → droits, SDK direct, webhooks
   (relecture, dédoublonnage), Checkout hébergé, lecture et export toujours
   ouverts.
1. **Socle** : dépendance `stripe` avec `apiVersion` épinglée, client
   `server-only`, variables d'environnement, tables `Abonnement` et
   `EvenementStripe` + RLS, migration.
2. **Webhook** : signature, dédoublonnage, relecture de l'abonnement,
   enregistrement de l'état ; événements du § 2.3 ; tests sur des charges
   utiles enregistrées en sandbox.
3. **Droits** : une seule fonction (`droitsDuCompte`) qui lit notre table ;
   garde sur les écritures, jamais sur la lecture ni l'export ; bandeaux
   (essai qui finit, carte refusée, abonnement arrêté). Les formules vivent en
   TypeScript (`lookup_key` Stripe → limites), comme les référentiels
   (ADR-003) : le contenu arrive avec l'offre.
4. **Parcours** : page « Abonnement » sous Paramètres ; « S'abonner » →
   session Checkout (`mode: subscription`, `client_reference_id`, client Stripe
   créé avant avec `metadata.userId`, clé d'idempotence) ; page de retour
   « confirmation en cours » qui attend notre table ; « Gérer mon abonnement »
   → portail.
5. **Essai** : selon la décision avec/sans carte ; rappels.
6. **Recette en sandbox** : horloges de simulation (fin d'essai, renouvellement,
   échec, 3D Secure, résiliation), `stripe listen` documenté pour le local.

**Ce qui attend l'offre** : les produits et prix dans Stripe, le contenu des
formules (limites, modules), une page de tarifs publique, la TVA.

## 6. À vérifier hors code

- **Facturation électronique** : réception obligatoire pour toutes les
  entreprises au 1er septembre 2026, **émission obligatoire pour les PME et TPE
  au 1er septembre 2027**, par une plateforme agréée
  ([service-public](https://entreprendre.service-public.gouv.fr/actualites/A15683)).
  Stripe n'est pas plateforme agréée et ses factures ne sont pas au format
  structuré, selon un article de septembre 2026 à caractère promotionnel
  ([ecommerce-nation](https://www.ecommerce-nation.fr/factures-stripe-facturation-electronique/)) :
  **à confirmer auprès de Stripe et de l'expert-comptable**. Ne bloque pas le
  code de l'abonnement ; prévoir comment les factures rejoindront une
  plateforme agréée d'ici 2027.
- **TVA** : clients B2B en France → taux fixe possible ; Stripe Tax si on vend
  hors de France. Collecte du numéro de TVA intracommunautaire dans Checkout.
- **Mentions obligatoires** des factures françaises dans les réglages de
  facturation Stripe (SIREN, TVA, adresse) — avec l'expert-comptable.
- **Conditions générales** d'abonnement (durée, résiliation, impayé, sort des
  données) — à rédiger par la propriétaire, à lier dans Checkout.
- **Réglages du tableau de bord Stripe** : relances (Smart Retries), état
  après la dernière relance (`unpaid`), e-mails client (reçus, rappels
  d'essai, carte expirée), libellé de relevé court, portail.

## 7. Revues du socle (2026-11-02) — ce qui revient aux lots suivants

Deux revues indépendantes du lot 1 (sécurité ; maintenabilité et
performance). Corrigé dans le socle : une clé entourée d'espaces ne ferme
plus le serveur ; une clé `live` exige aussi `NODE_ENV=production` ;
`config.ts` est `server-only` et `etatStripe` rend la décision sans secret ;
colonnes `stripePriceId`, `finPrevueLe` (`cancel_at`), `traitementDebuteLe`,
`derniereErreur`, index sur `recuLe` ; version d'API vérifiée par
`satisfies` ; test d'isolation indépendant de l'ordre.

**Lot 2 (webhook)**
- ~~**Plusieurs abonnements chez Stripe, une ligne chez nous.** Un `customer.subscription.deleted` en retard d'un ANCIEN abonnement, relu, dit `canceled` et fermerait la saisie d'un client qui paie. N'écrire que si le client Stripe de l'événement est celui de la ligne ; relister les abonnements du client et retenir celui qui n'est pas terminé ; alerte si deux le sont.~~ [2026-11-03, lot 2 : fait — `synchronisation.ts`, `abonnementCourant`]
- ~~**Relectures concurrentes** : écriture conditionnelle sur `relueLe` (`updateMany where relueLe < t`), pour qu'une relecture ancienne n'écrase pas une plus récente.~~ [2026-11-03, lot 2 : fait — `synchronisation.ts`, `updateMany` sur `relueLe`]
- ~~**Prise en charge d'un événement** : `traitementDebuteLe` posé par une mise à jour conditionnelle (nul, ou ancien de plus de quelques minutes) ; une livraison qui ne la prend pas répond 2xx sans traiter… ou 409 pour que Stripe relance — à trancher.~~ [2026-11-03, lot 2 : fait — `evenements.ts` ; tranché : 409, Stripe relance]
- ~~**Délais** : options par requête plus courtes dans la route (`timeout`, `maxNetworkRetries`) — le client par défaut peut tenir 35 à 40 s.~~ [2026-11-03, lot 2 : fait — `OPTIONS_WEBHOOK` : 3 s, sans relance du SDK]
- ~~`finPeriode` se lit sur `items.data[].current_period_end` ; `resilieEnFinDePeriode` ← `cancel_at_period_end`, `finPrevueLe` ← `cancel_at`.~~ [2026-11-03, lot 2 : fait — `colonnesDe`]
- ~~Vérifier `event.livemode === (mode === "live")` : un `whsec_` ne dit pas son mode.~~ [2026-11-03, lot 2 : fait — `traiterNotificationStripe`]
- ~~**Configuration inactive en production** : la route répond 503 (Stripe relance 3 jours) et lève une alerte, au lieu d'ignorer les événements — sinon les résiliations ne s'enregistrent plus.~~ [2026-11-03, lot 2 : fait — la route]
- ~~Ne jamais journaliser l'objet d'une erreur de signature (il porte la charge utile, donc des données personnelles) ; `derniereErreur` ne garde qu'un motif.~~ [2026-11-03, lot 2 : fait — `verifierNotificationStripe`, `motifDErreur`]
- ~~Ménage de `EvenementStripe` (au-delà de quelques semaines).~~ [2026-11-03, lot 2 : fait — `oublierLesAnciens`, 45 jours]
- Reste du lot 2, reporté au lot 6 (recette) : abonner la destination aux
  événements de risque (`v1.charge.dispute.created`, `v1.charge.refunded`,
  `v1.radar.early_fraud_warning.created`) avec au moins une trace et une
  alerte — rien ne s'encaisse avant.

**Lot 3 (droits)** : décider explicitement le comportement de
`droitsDuCompte` quand la configuration est inactive en production.

**Lot 4 (parcours)** : refuser une nouvelle session Checkout tant qu'un
abonnement non terminé existe (deux onglets → deux abonnements) ; créer le
client Stripe une seule fois par compte (ligne réservée d'abord, clé
d'idempotence dérivée du `userId`). Ne passer à un composant que
`etatStripe`, jamais `configurationStripe`.

## Sources lues

- Stripe : [webhooks](https://docs.stripe.com/webhooks.md) ·
  [cycle de vie](https://docs.stripe.com/billing/subscriptions/overview.md) ·
  [webhooks d'abonnement](https://docs.stripe.com/billing/subscriptions/webhooks.md) ·
  [essais gratuits](https://docs.stripe.com/billing/subscriptions/trials/free-trials.md) ·
  [offres d'essai vs essais](https://docs.stripe.com/billing/subscriptions/trials/compare.md) ·
  [conformité des essais](https://docs.stripe.com/billing/subscriptions/trials/manage-trial-compliance.md) ·
  [portail client](https://docs.stripe.com/customer-management.md) ·
  [entitlements](https://docs.stripe.com/billing/entitlements.md?dashboard-or-api=api) ·
  [clés](https://docs.stripe.com/keys-best-practices.md) ·
  [tests Billing](https://docs.stripe.com/billing/testing.md) ·
  [tarifs](https://stripe.com/fr/pricing)
- Better Auth : [module Stripe](https://www.better-auth.com/docs/plugins/stripe)
- Facturation électronique : [service-public](https://entreprendre.service-public.gouv.fr/actualites/A15683) ·
  [ecommerce-nation](https://www.ecommerce-nation.fr/factures-stripe-facturation-electronique/) (source non officielle)
