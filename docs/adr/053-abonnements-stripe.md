# ADR-053 — L'abonnement est porté par le compte, Stripe en garde la vérité, Rojer une copie relue

- **Statut** : **acceptée**, 2026-11-02, pour les quatre choix du § Décision
  1 à 4 (« vas-y », propriétaire, après les notes
  `docs/notes-chantier-abonnements-stripe.md`). Le contenu des formules, leurs
  prix et l'essai (durée, avec ou sans carte) restent ouverts : ils ne
  changent rien à ce qui est décidé ici.
- **Origine** : ouverture du paiement par la propriétaire (2026-11-02) ;
  « Paiement / abonnement / gestion commerciale » était au hors-périmètre du
  CLAUDE.md, il en sort par cette ADR.
- **Branche** : vit sur `cc` (comptes Better Auth, ADR-052) ; rien n'est
  fusionné dans `cc` avant la bascule.

## Contexte

Rojer aura plusieurs formules et un essai gratuit. Stripe Billing tient les
clients, abonnements, factures, relances et e-mails ; Rojer doit savoir, à
chaque écriture, si le compte y a droit — sans appeler Stripe à chaque page,
et sans croire une information qui ne vient pas de Stripe.

## Décision

1. **Le porteur est le compte** (`User`), pas l'entreprise. Une formule peut
   limiter le nombre d'entreprises ou d'établissements ; changer de porteur
   plus tard serait une migration.
2. **La carte se saisit sur la page hébergée par Stripe** (Checkout en
   redirection), et le client gère son abonnement dans le portail hébergé.
   Rojer ne charge aucun script Stripe : la CSP ne s'ouvre pas, et un script
   injecté dans Rojer ne peut pas imiter le formulaire de carte.
3. **Un impayé ferme la saisie, jamais la lecture ni l'export.** Le client
   garde la main sur ce qu'il est tenu de conserver (DUERP : 40 ans).
   Correspondance des états Stripe, seule lecture : `droitsDuCompte` (lot 3).
   `trialing`, `active`, `past_due` → saisie ouverte (`past_due` avec un
   bandeau) ; `unpaid`, `canceled`, `paused`, `incomplete`,
   `incomplete_expired`, et tout état inconnu → saisie fermée. Un état que
   Stripe ajouterait demain ferme la saisie plutôt que de l'ouvrir.
4. **Le SDK Stripe direct**, pas le module Stripe de Better Auth : celui-ci
   exige sa route HTTP (`/api/auth/stripe/webhook`), et `cc` n'en monte
   aucune, par choix (`auth/better-auth.ts`).
5. **Stripe est la source de vérité ; Rojer en garde une copie, relue.**
   - La copie ne s'écrit que depuis un **webhook signé** (corps brut,
     tolérance par défaut de 5 minutes), jamais depuis le retour du client
     sur `success_url`.
   - Sur un événement d'abonnement, l'abonnement est **relu par l'API** et
     son état courant enregistré : l'ordre d'arrivée des événements, que
     Stripe ne garantit pas, cesse de compter.
   - Chaque événement est enregistré par son identifiant
     (`EvenementStripe`) : un doublon est ignoré, un traitement échoué est
     rejoué à la relance suivante de Stripe (jusqu'à 3 jours en production),
     et deux livraisons simultanées ne le traitent pas deux fois (prise en
     charge, `traitementDebuteLe`).
   - Une ligne ne s'écrit que pour l'abonnement courant du client Stripe de
     la ligne, et jamais avec une relecture plus ancienne que la dernière
     écrite (`relueLe`) : un événement en retard d'un ancien abonnement ne
     ferme pas la saisie d'un client qui paie.
   - Le compte se déduit de l'objet Stripe relu (`metadata.userId`, posé par
     Rojer à la création du client Stripe), jamais d'un identifiant de la
     charge utile pris tel quel — même règle que les accès sans session
     (`auth/compte-hors-session.ts`). [2026-11-03, revues du lot 2 : ou, à
     défaut, sur l'abonnement (`subscription_data.metadata.userId`, seul
     encore lisible d'un client supprimé) ; une seule fonction,
     `compteDuClientStripe`, où le multi-utilisateurs lira `compteId`.]
   - **Réception (lot 2, 2026-11-03)** : route `/api/stripe/webhook`,
     événements au format **léger** (thin), que la doc Stripe recommande pour
     une intégration neuve : la notification ne porte que le type et
     l'identifiant de l'objet, non versionnés ; tout se relit par l'API, ce
     qui est déjà la règle ci-dessus. Un événement « instantané » est refusé
     (400). Liste des événements à abonner : `EVENEMENTS_ECOUTES`
     (`stripe/webhook.ts`). Quel que soit l'événement, une seule voie :
     relire le client Stripe et tous ses abonnements, retenir le plus récent
     non terminé (`synchronisation.ts`) [2026-11-03 : celui qui paie
     (`active`, `trialing`, `past_due`) d'abord, puis l'impayé ou suspendu,
     puis celui qui attend son premier paiement — un abonnement neuf en
     attente ne remplace pas celui qui paie]. Un conflit (client Stripe déjà
     lié à un autre compte, compte disparu) ne s'écrit pas : traité sans
     effet et signalé en erreur au journal. Réponses : signature ou format
     refusés, ou mode de l'événement différent de celui de la clé → 400 ;
     doublon → 200 sans rien refaire ; livraison déjà en cours → 409 ; échec
     → 500 (Stripe relance) ; abonnements désactivés → 503. Le traitement se
     fait dans la requête (trois appels Stripe au plus, 3 s chacun, sans
     relance du SDK : la relance est celle de Stripe) ; pas de file
     d'attente au volume de Rojer.
6. **Une ligne par compte** (`Abonnement`, `userId` unique) : l'état courant,
   l'historique restant chez Stripe (factures, abonnements passés).
   L'état est une **chaîne**, pas une énumération en base : un état inconnu
   s'enregistre (et ferme la saisie, § 3) au lieu de faire échouer le
   webhook en boucle.
7. **La clé et l'environnement vont ensemble** : une clé `live` n'est admise
   qu'en production déclarée (`environnementApp() === "production"`) sur un
   serveur de production (`NODE_ENV=production`) ; une clé de test
   seulement en préversion ou en développement déclarés — jamais en
   production, ni sur un serveur de production qui ne déclare pas son
   environnement (revue de code du socle). La clé et le secret ne sortent pas du serveur : un écran ne
   reçoit que `etatStripe` (la décision, sans secret). Sans clé, les abonnements sont
   désactivés et l'app sert tout le reste (même règle que les variables
   optionnelles de `env.ts`). En production, la clé doit être **restreinte**
   (`rk_live_…`) : une clé fuitée ne fait que ce que ses permissions
   autorisent. Une clé refusée ferme les abonnements, pas le serveur, et le
   démarrage le signale (`avertissementsEnvironnement`).

## Données

- `Abonnement` : racine de compte (`userId`, ADR-051) ; `stripeCustomerId`
  unique ; `stripeSubscriptionId` unique, nul avant le premier abonnement ;
  `statut` (texte, nul avant le premier abonnement) ; `formule` (la
  `lookup_key` du prix Stripe) et `stripePriceId` ; `finPeriode`, `finEssai`,
  `resilieEnFinDePeriode` (`cancel_at_period_end`), `finPrevueLe`
  (`cancel_at`) ; `essaiUtiliseLe` (un essai par compte) ;
  `relueLe` (dernière relecture chez Stripe). Clé étrangère vers `User` en
  `RESTRICT` : supprimer un compte (qui n'existe pas encore) devra d'abord
  résilier chez Stripe.
- `EvenementStripe` : hors compte (ADR-051), écrit avant toute identité :
  `id` (l'identifiant Stripe `evt_…`), `type`, `recuLe` (indexé, pour le
  ménage), `traitementDebuteLe`, `traiteLe`, `derniereErreur` (un motif,
  jamais la charge utile).

## Ce que cette décision ne règle pas

- Le contenu des formules et ce qui les distingue (volume ou modules) ; les
  `Entitlements` de Stripe seront à considérer si ce sont des modules.
- L'essai avec ou sans carte.
- La TVA, les mentions obligatoires des factures et la facturation
  électronique (émission obligatoire pour les PME au 1er septembre 2027) :
  hors code, à voir avec l'expert-comptable (notes, § 6).
- La suppression de compte, qui n'existe pas encore.
