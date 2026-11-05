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
- **Préversion et développement** : utiliser deux environnements de test
  Stripe distincts (bacs à sable), sinon la destination de préversion reçoit
  les événements créés depuis un poste (revue de sécurité du lot 2).
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

**Revues du lot 2 (2026-11-03)** — code (medium), sécurité, simplification ;
corrigé dans le lot : abonnement retenu par rang (celui qui paie avant celui
qui attend son paiement), essai lu sur tous les abonnements du client,
compte disparu ou client déjà lié à un autre compte traités sans effet et
signalés (au lieu d'un 500 relancé 3 jours ou d'une perte muette), client
Stripe supprimé (compte lu sur l'abonnement), jeton de prise sur
`marquerTraite`/`marquerEchec`, corps lu avec une borne en octets, ménage au
plus une fois par heure et hors du traitement, `OPTIONS_WEBHOOK` dans
`client.ts`, `clientStripe(config)` non nullable, erreurs Stripe par
`instanceof`, `switch` typé sur les événements écoutés. Ce qui revient aux
lots suivants :

**Seconde passe des revues du lot 2 (2026-11-03)** — sécurité : rien
d'exploitable ; corrigé : client Stripe supprimé (l'abonnement relu depuis la
notification suffit si la liste est refusée), toutes les pages
d'abonnements, client et liste relus ensemble, ménage après la réponse et
rattrapé, `creerLigne`/`mettreAJour` à la place de deux `try` imbriqués, un
test par événement écouté. Limites connues, écrites dans le code :
- deux relectures croisées dont la plus récente reviendrait avec l'état le
  plus ancien laissent cet état jusqu'à l'événement suivant (Stripe en
  envoie plusieurs par changement) ;
- un traitement bloqué plus de 2 minutes peut être refait par une autre
  livraison : les écritures le supportent ; **le lot 5 (rappels d'essai,
  e-mails) devra rendre ses effets idempotents par identifiant d'événement**.

**Lot 4 (parcours), en plus** : créer le client Stripe AVEC son
`metadata.userId` dans le même appel (un événement reçu avant serait traité
sans effet, pour de bon) ; poser aussi `subscription_data.metadata.userId`
dans la session Checkout (seule trace du compte si le client Stripe est un
jour supprimé) ; seul le propriétaire du compte ouvre Checkout et le portail
(proposition du chantier multi-utilisateurs, 2026-11-03).

~~**Lot 3 (droits)** : décider explicitement le comportement de
`droitsDuCompte` quand la configuration est inactive en production.~~
[2026-11-03, lot 3 : tranché — Stripe inactif, la saisie reste ouverte à
tous et le démarrage prévient si `ABONNEMENT_EXIGE=oui` ; ADR-053 § 3.]

**Revues du lot 3 (2026-11-03)** — sécurité : rien ; corrigé : réglage
`ABONNEMENT_EXIGE` tolérant (espaces, casse) au démarrage comme dans la
garde ; la garde de code exige `await verifierSaisie()` en PREMIÈRE
instruction (analyse TypeScript, plus une mention textuelle) ; les écrans
qui attrapent l'erreur d'une action gardée relancent la redirection
(`unstable_rethrow` dans 7 composants, garde de code) ; bandeau aussi sur le
DUERP et les entreprises, sous `Suspense` ; une seule lecture de la ligne sur
la page. Limite acceptée : une fois l'offre lancée, une écriture lit la
session deux fois (`verifierSaisie`, puis la garde de portée de l'action).
Liens déjà émis : un tiers peut encore signer pour un compte fermé (voulu).

**Contrôle visuel du lot 3 (2026-11-03, `pnpm dev` sur une base locale
dédiée, `ABONNEMENT_EXIGE=oui`)** : onboarding refusé sans abonnement →
page Abonnement ; abonnement actif → création, pas de bandeau ;
`past_due`, `unpaid`, essai finissant → bandeaux justes ; écriture refusée
depuis un formulaire et depuis un écran à `try/catch` → redirection ; lecture
du calendrier ouverte. Trouvé et corrigé : le bandeau, placé dans le flux,
était recouvert par l'en-tête de page (qui remonte sous la bande) — il est
désormais en gélule dans la bande du haut. **Responsive reporté (décision de
la propriétaire)** : sur téléphone, le bandeau est en bas et la carte de
visite guidée peut le recouvrir.

**Lot 3 fait (2026-11-03)** : `droitsDe`, `verifierSaisie` dans 88 actions,
16 écritures ouvertes nommées, page `/compte/abonnement`, bandeau dans le
dossier. Reste pour les lots suivants :
- **Lot 4** : boutons « Choisir une formule » et « Gérer mon abonnement »
  sur `/compte/abonnement` ; nom lisible de la formule (la page affiche la
  `lookup_key` brute) ; désactiver les formulaires quand la saisie est
  fermée (aujourd'hui l'écriture est refusée au clic, avec redirection).
- **Lot 5 / lancement** : sans abonnement, un compte neuf ne peut même pas
  créer son premier établissement (`finaliserOnboarding` est gardé) — l'essai
  doit donc démarrer avant, ou à l'inscription ; décider du sort des comptes
  existants au passage de `ABONNEMENT_EXIGE` à `oui`.

**Lot 4 (parcours)** : refuser une nouvelle session Checkout tant qu'un
abonnement non terminé existe (deux onglets → deux abonnements) ; créer le
client Stripe une seule fois par compte (ligne réservée d'abord, clé
d'idempotence dérivée du `userId`). Ne passer à un composant que
`etatStripe`, jamais `configurationStripe`.

## 8. Lots 4 et 5 — parcours d'essai et de paiement (2026-11-03)

Décisions de la propriétaire (ADR-053 §§ 8 à 12) : essai de 30 jours sans
carte, formule choisie ; conservation d'un compte jamais payé 12 mois (à
écrire dans `docs/rgpd.md`) ; CGU provisoires à l'écran, relecture juriste à
faire ; factures émises par Stripe, lien depuis le portail.

**PR A (indépendante du compte, ce lot)** : catalogue `abonnements/formules.ts`
(provisoire, repris de `docs/offres-abonnement`), `sousLeQuota` ;
conditions générales provisoires (`abonnements/conditions.ts`, page publique
`/conditions`, version + empreinte) ; appels Stripe du parcours
(`stripe/parcours.ts`, non branchés : client, essai, changement de formule
pendant l'essai, portail, Checkout avec CGU, prix lus chez Stripe et gardés
10 minutes).

~~**PR B (attend #159 dans `cc`, multi-utilisateurs)** :~~ [2026-11-05 :
#159 est dans `cc` ; PR B faite, `lot/abonnements-stripe-parcours-b` —
ADR-053 § 13. Reportés : nom et adresse du client depuis l'entreprise
(seul le nom passe, à l'ouverture du portail ; l'adresse se saisit dans le
portail) ; la preuve d'acceptation au paiement reste chez Stripe.]
- écran « Votre essai gratuit » : commence par `aiguillageSansCompte()` (une
  personne invitée rejoint son compte, ne démarre pas d'essai), compte par
  `requireCompteDOnboarding()` sans nom, `verifierSaisie()` puis
  `verifierProprietaire()` (fournies par multi_user dans `saisie.ts`, qu'il
  garde en main) ; preuve d'acceptation (table neuve, migration datée après
  20261103180000 et 20261103120400, RLS, rattachée à la personne) ;
- redirection après inscription vers l'essai quand l'offre est lancée ;
- page « Choisir ma formule », portail, Checkout (propriétaire seul) ;
- garde de quota d'établissements dans son propre module, un appel d'une
  ligne dans `onboarding/actions.ts` (trois sessions touchent ce fichier) ;
- `metadata.compteId` sur le client et l'abonnement Stripe.

**Revues de la PR A (#164, 2026-11-03)** — sécurité : rien ; corrigé : le
changement de formule passe par le portail (réglé `continue_trial`), la
fonction maison est retirée ; clé d'idempotence de l'essai avec la formule ;
client Stripe avec nom, adresse, e-mails en français (factures B2B) ; prix
écartés si leur intervalle contredit leur clé, cache seulement complet ;
CGU : texte séparé de l'empreinte (`conditions-empreinte.ts`, réutilise
`sha256Hex`), promesses retirées, page non indexée tant qu'elle est
provisoire. **Pour la PR B** : clés d'idempotence dérivées du `compteId` et
ligne `Abonnement` réservée avant l'appel ; refuser Checkout tant qu'un
abonnement n'est pas terminé ; au webhook d'un Checkout, enregistrer la
preuve d'acceptation (version, empreinte) ; nom et adresse du client depuis
l'entreprise.

**Revues de la PR B (#190, 2026-11-05)** — sécurité : rien d'exploitable ;
corrigé : verrou de l'essai (`essaiUtiliseLe`, mise à jour conditionnelle,
rendu si Stripe échoue — deux onglets ne font plus deux essais) ; prix
vérifié avant de créer le compte ; preuve retirée si l'essai échoue ;
relecture en échec ≠ essai en échec ; nouvel inscrit sans compte : bouton
d'essai sur la page Abonnement ; nom de facturation posé seulement s'il est
encore provisoire ; formule lue aussi sur les `metadata` du prix (un prix
remplacé garde son plafond) ; `gesteAbonnement`, `essaiDisponible`,
`abonnementTermine` (droits.ts), libellés et intervalle dans `formules.ts`,
kit (`MessageFormulaire`, `CASE_A_COCHER`), marque et sortie sur téléphone.
Reporté : extraire un cadre commun à `WizardShell` et `/essai`, et une
`BasculeGelule` partagée avec `UploadRapportForm` ; annoncer le plafond
d'établissements dès l'ouverture de l'onboarding (aujourd'hui à la fin) ;
compte nommé « Mon compte » à l'essai (choix ADR-054, nom non affiché) ;
`AcceptationConditions` en RESTRICT bloque la suppression d'un compte, à
traiter avec le lot de suppression.

**Réglages du tableau de bord Stripe, avant le lancement** (complète § 6) :
URL des conditions (`/conditions`) dans les réglages publics — sans elle,
Checkout refuse `consent_collection` ; portail : changement de formule avec
`continue_trial`, modification de l'adresse et du numéro de TVA, résiliation
en fin de période ; e-mails de rappel de fin d'essai (7 jours avant) ;
produits et prix avec les `lookup_key` `rojer_<formule>_<periodicite>`.

**Rappels de fin d'essai** : ceux de Stripe (réglages Billing, e-mail 7 jours
avant, avec lien) plutôt qu'un envoi par Rojer — à activer dans le tableau
de bord (§ 6) ; le bandeau de Rojer annonce la fin dans la dernière semaine.
**Offres d'essai** : Stripe classe les essais `trial_period_days` comme
« ancienne » méthode au profit des « offres d'essai », encore en bêta privée
dans Checkout et non modifiables par le portail (§ 2.4) : on reste sur les
essais classiques.

## 9. Passation (2026-11-03) — ce qui n'était écrit que dans la conversation

**État sur `cc`** : socle (#153), webhook (#156), droits et garde des
écritures (#158), PR A des lots 4-5 (#164) fusionnés. La PR B attend #159
(multi-utilisateurs, ADR-054) ; `coordination_amelioration` préviendra quand
elle entre dans `cc`. Branche de référence de la résolution #158 × #159 :
`lot/abonnements-stripe-droits-sur-159` (7354298e) — multi_user la reprend
en fusionnant `cc`.

**Décisions de la propriétaire (2026-11-03)** :
- pleine page Stripe en **redirection** (pas de formulaire intégré) ;
- essai de **30 jours, sans carte**, dans la formule choisie ; toutes les
  formules donnent accès à tout Rojer, bridées en volume et en temps
  d'expert ;
- les gens remplissent l'onboarding **pendant** l'essai ;
- compte jamais payé conservé **12 mois** (à écrire dans `docs/rgpd.md`) ;
- CGU : texte provisoire à l'écran, relecture juriste plus tard ;
  factures : celles de Stripe (portail), validation expert-comptable ;
- **responsive des bandeaux reporté** : on se concentre sur le
  fonctionnement.

**Parcours retenu après la recherche UX** (sources : rapport de recherche du
2026-11-03, résumé ici) : écran « Votre essai gratuit » entre la
confirmation de l'adresse et l'onboarding — date de fin en clair, « aucune
carte demandée », ce qui se passe à la fin (lecture et export restent),
case CGU non cochée d'avance, bouton « Démarrer mon essai ». Preuve
d'acceptation : personne, version, empreinte, date, contexte (essai ou
paiement). Mention discrète de l'essai en permanence, bandeau dans les 7
derniers jours (déjà fait : `droitsDe`). Jamais de prélèvement sans geste du
client. Fin d'essai = même traitement qu'un impayé. À changer au lancement :
la page d'inscription annonce « Aucun paiement pendant la phase bêta ».

**Quotas** : seul le nombre d'établissements est prévu dans la PR B. Les
autres quotas du catalogue (permis de feu, plans de prévention,
prestataires, liens, signatures, stockage, imports, assistant, expert)
attendent leur propre lot, chacun avec sa garde de création. [2026-11-05 : audit fait, décisions et plan au § 10.]

**Pièges rencontrés** :
- **L'en-tête de page remonte sous la bande du haut** (`.sous-la-gelule`) :
  tout ce qu'un layout pose entre la gélule et la page est recouvert. Le
  bandeau d'abonnement vit en gélule dans la bande, à gauche de celle du
  compte.
- **Une redirection depuis une action** fait échouer l'appel côté client ; un
  `catch` qui l'avale affiche « échec » un instant (Next 16.4 navigue quand
  même, d'après la dernière revue). Relancer par `unstable_rethrow(e)` ; une
  garde le vérifie (`saisie-gardee.test.ts`).
- **Avec #159, `requireCompte` renvoie vers /onboarding** quand la personne
  n'a pas de compte : une garde posée en tête de `finaliserOnboarding` doit
  passer par `getOptionalCompte`, sinon boucle.
- **Sous la borne de compte, un compte disparu donne P2025**, pas P2003 : la
  borne transforme la clé en liaison.
- **Gardes transversales** que `--changed` ne lance pas et qui ont fait
  tomber la CI : `dates/garde-fuseau` (`=> new Date()` lu comme une
  comparaison), `rendu/sans-qualification` (« rappelle » lu comme la promesse
  d'un envoi), `app/robots` (toute racine de `src/app` rangée),
  `auth/tenancy-routes` (toute route a un contrôle d'accès).
- **Outils** : vitest se fige parfois dans le worktree — le lancer sous
  `perl -e 'alarm 300; exec @ARGV' … < /dev/null` ; `timeout` n'existe pas
  sur ce Mac ; `psql` non plus (Prisma `migrate deploy` crée la base) ; la
  pile Docker `cc` tourne en production, sans e-mail : inutilisable pour
  s'inscrire.

**Contrôle visuel en local** : worktree `duerp-stripe`, `.env.local` (ignoré
par git) avec une base dédiée (`duerp_cc_visuel` sur le conteneur
`duerp-verif-db`, port 5435), `APP_ENV=development`, `EMAIL_DRIVER=console`,
`STORAGE_DRIVER=local`, une fausse clé `sk_test_…` et un faux `whsec_…`,
`ABONNEMENT_EXIGE=oui` ; `pnpm exec next dev -p 3007` ; le lien de
confirmation d'inscription s'affiche dans la sortie du serveur. L'état
d'abonnement d'un compte de test se pose par un script Prisma (statut,
fin d'essai) — aucune requête vers Stripe pendant ce contrôle.

**Préparer un compte Stripe de test** (pour essayer le parcours de bout en
bout, au lieu de poser l'état par Prisma) : créer le compte Stripe et rester
en mode test ; coller la clé de test (`sk_test_…`, ou `rk_test_…` qui écrit
produits, prix et portail) dans `.env.local` du worktree — jamais dans la
conversation ; lancer `pnpm exec tsx scripts/stripe-installer-test.ts`
(produits, prix aux `lookup_key` `rojer_<formule>_<periodicite>`, montants
provisoires, portail réglé `continue_trial` ; idempotent, refuse toute clé
live sans rien appeler ; il imprime ce qui reste à régler à la main :
conditions dans les réglages publics, rappel de fin d'essai, et la
configuration par défaut du portail si le compte n'en a pas). Installer la
CLI Stripe, puis `stripe listen --forward-thin-to
localhost:3007/api/stripe/webhook --thin-events
"v1.checkout.session.completed,v1.customer.subscription.created,v1.customer.subscription.updated,v1.customer.subscription.deleted,v1.customer.subscription.paused,v1.customer.subscription.resumed,v1.customer.subscription.trial_will_end,v1.invoice.paid,v1.invoice.payment_failed,v1.invoice.payment_action_required"`
(la liste est `EVENEMENTS_ECOUTES` de `src/lib/stripe/webhook.ts`) et
coller le `whsec_…` affiché dans `.env.local`. Cartes de test : `4242 4242
4242 4242` acceptée ; `4000 0000 0000 0341` s'enregistre puis est refusée au
prélèvement (impayé). Fin d'essai : une horloge de simulation (Billing >
Horloges de simulation) avec un client et son abonnement, avancée au-delà
des 30 jours.

## 10. Second tour de revue de la PR B, et cloisonnement par formule (2026-11-05)

**Second tour (correction, simplification, sécurité) — corrigé** :
- **Stripe fait foi en cas de doute.** Le verrou de l'essai ne se rend que sur
  un refus net de Stripe (`StripeInvalidRequestError`, `StripeCardError`, hors
  409) ; une réponse perdue relit les abonnements du client : s'il y en a un,
  on le relit et on continue ; sinon le verrou reste, expire au bout de cinq
  minutes, et sa reprise relit Stripe avant tout nouvel essai. Rendu, il
  retrouve sa valeur d'avant (jamais vide si un essai avait été constaté).
- **La preuve d'acceptation est un journal** : jamais effacée.
- **Réabonnement** : refusé si Stripe a un abonnement en cours, même quand
  notre copie retarde — la copie est alors relue et la page le dit
  (`?abonnement=en-cours`) ; les sessions Checkout encore ouvertes du client
  sont expirées avant d'en ouvrir une neuve.
- **Accepté, non corrigé** : un client Stripe **supprimé à la main** dans le
  tableau de bord laisse le compte sans essai possible ni paiement (le même
  identifiant est réutilisé). Règle d'exploitation : ne jamais supprimer un
  client Stripe ; si c'est fait, remettre la ligne `Abonnement` à la main.
- Sécurité : aucun constat exploitable.

**Audit du cloisonnement (2026-11-05)** — seul le plafond d'établissements
est appliqué ; huit autres sont affichés sans l'être. Trous principaux :
- **monter en Pro puis redescendre** dans le portail : les deux proratas
  s'annulent, le compte garde la capacité de Pro au prix d'Essentiel. Le
  portail ne planifie une baisse en fin de période qu'entre prix d'un même
  produit, et ne sait pas la refuser (doc lue : `configure-portal`,
  `customer_portal/configurations/create`) ;
- utilisateurs non plafonnés (`inviterMembre`, `accepterInvitation`) ;
- formule inconnue = illimité (`quotas.ts`) ;
- compteurs annuels remis à zéro par suppression d'un brouillon ou d'un
  établissement (cascade) ; pas de date de début d'abonnement ;
- comptage hors verrou (deux onglets dépassent d'un) ;
- la garde de saisie ne voit que les écritures Prisma reconnues par sa sonde
  (un dépôt de fichier sans écriture Prisma passerait).

**Décisions de la propriétaire (2026-11-05)** :
- **baisse de formule refusée** tant que le compte dépasse les plafonds de la
  formule visée, **et expliquée** : l'écran dit quoi retirer. Le changement
  de formule se fait donc dans Rojer, plus dans le portail (qui garde carte,
  factures, résiliation) ; une montée prend effet tout de suite, une baisse
  en fin de période payée ;
- **utilisateurs plafonnés : 1 en Essentiel, 5 en Pro**, invitations en
  attente comprises, vérifié à l'invitation et à l'acceptation ;
- **permis de feu et plans de prévention plafonnés comme prévu** (10 et 5
  par an en Essentiel, sans limite en Pro) ;
- **un essai par compte ET par SIREN**.

**Tranché sans elle (à contester si besoin)** : formule inconnue = plafonds
d'Essentiel, avec alerte ; plafonds comptés par compte ; compteurs annuels
tenus dans un journal que rien n'efface ; « Connecter un assistant » retiré
de l'offre tant que l'accès OAuth (ADR-013) n'existe pas.

**Plan du lot « quotas »** (avant le lancement de l'offre) :
0. garde de saisie exigée en tête de **toute** action exportée d'un module
   `"use server"` (listes fermées des exceptions), `.tsx` compris ;
1. changement de formule dans Rojer (contrôle des plafonds, montée
   immédiate facturée, baisse planifiée) ; portail sans changement de
   formule ; formule inconnue fermée ; date de début d'abonnement recopiée ;
2. une seule fonction `verifierQuota`, sous verrou de compte, journal
   `ConsommationQuota`, et une garde qui relit le code : chaque création
   d'un modèle plafonné (et chaque dépôt de fichier) passe par elle ;
3. plafonds à la création : utilisateurs, prestataires, permis de feu, plans
   de prévention, signatures, liens, import ;
4. stockage (taille des fichiers à enregistrer, reprise de l'existant) ;
5. essai par SIREN ; conditions générales complétées (baisse, plafonds,
   date anniversaire).

## 11. Essai de bout en bout avec un compte Stripe de test (2026-11-05)

Bac à sable Stripe « environnement de test rojer », CLI Stripe 1.55.8 (binaire
officiel, empreinte vérifiée ; Homebrew refusait faute d'outils Xcode à jour),
relais `stripe listen --api-key … --forward-thin-to` (la clé de `.env.local`,
sans `stripe login`), Rojer local sur la branche `lot/quotas-formules`.

**Passé** : écran d'essai avec les prix lus chez Stripe ; essai Essentiel sans
carte (`trialing`, preuve d'acceptation écrite) ; onboarding pendant l'essai ;
carte ajoutée au portail (l'essai continue, nom de facturation remplacé par la
raison sociale) ; fin d'essai (`trial_end=now`) : facture de 29 € payée,
`active` ; carte refusée (`pm_card_chargeCustomerFail`) : `past_due`, message
« paiement en échec », saisie ouverte ; résiliation : `canceled`, saisie
fermée, lecture gardée, bouton de réabonnement ; réabonnement par Checkout :
nouvel abonnement `active`, l'ancien reste `canceled`. Les 14 notifications
reçues ont toutes été traitées (200).

**Non passé, et pourquoi** : `unpaid` après épuisement des relances (des jours
chez Stripe ; couvert par les tests) ; Checkout AVEC la case des conditions —
Stripe exige l'URL des conditions dans les informations publiques du compte,
réglables seulement sur un compte activé : le test a été fait par une session
identique sans `consent_collection`.

**Corrigé en cours de route** : entrée « Abonnement » dans le menu du compte
(la page n'était atteinte que par le bandeau) ; messages d'erreur qui
nommaient Stripe ; « période en cours » affichée pour un abonnement résilié.

**Réglages de lancement ajoutés** (compte Stripe de production activé) : URL
des conditions dans les informations publiques ; TVA — la facture de test est
à 29 € sans taxe : Stripe Tax ou taux de TVA à régler avec l'expert-comptable
(§ 6).

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
