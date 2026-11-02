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
     rejoué à la relance suivante de Stripe (jusqu'à 3 jours en production).
   - Le compte se déduit de l'objet Stripe relu (`metadata.userId`, posé par
     Rojer à la création du client Stripe), jamais d'un identifiant de la
     charge utile pris tel quel — même règle que les accès sans session
     (`auth/compte-hors-session.ts`).
6. **Une ligne par compte** (`Abonnement`, `userId` unique) : l'état courant,
   l'historique restant chez Stripe (factures, abonnements passés).
   L'état est une **chaîne**, pas une énumération en base : un état inconnu
   s'enregistre (et ferme la saisie, § 3) au lieu de faire échouer le
   webhook en boucle.
7. **La clé et l'environnement vont ensemble** : une clé `live` n'est admise
   qu'en production déclarée (`environnementApp() === "production"`), une
   clé de test jamais en production. Sans clé, les abonnements sont
   désactivés et l'app sert tout le reste (même règle que les variables
   optionnelles de `env.ts`). En production, la clé doit être **restreinte**
   (`rk_live_…`) : une clé fuitée ne fait que ce que ses permissions
   autorisent. Une clé refusée ferme les abonnements, pas le serveur, et le
   démarrage le signale (`avertissementsEnvironnement`).

## Données

- `Abonnement` : racine de compte (`userId`, ADR-051) ; `stripeCustomerId`
  unique ; `stripeSubscriptionId` unique, nul avant le premier abonnement ;
  `statut` (texte, nul avant le premier abonnement) ; `formule` (la
  `lookup_key` du prix Stripe) ; `finPeriode`, `finEssai`,
  `resilieEnFinDePeriode` ; `essaiUtiliseLe` (un essai par compte) ;
  `relueLe` (dernière relecture chez Stripe). Clé étrangère vers `User` en
  `RESTRICT` : supprimer un compte (qui n'existe pas encore) devra d'abord
  résilier chez Stripe.
- `EvenementStripe` : hors compte (ADR-051), compteur technique écrit avant
  toute identité : `id` (l'identifiant Stripe `evt_…`), `type`, `recuLe`,
  `traiteLe`.

## Ce que cette décision ne règle pas

- Le contenu des formules et ce qui les distingue (volume ou modules) ; les
  `Entitlements` de Stripe seront à considérer si ce sont des modules.
- L'essai avec ou sans carte.
- La TVA, les mentions obligatoires des factures et la facturation
  électronique (émission obligatoire pour les PME au 1er septembre 2027) :
  hors code, à voir avec l'expert-comptable (notes, § 6).
- La suppression de compte, qui n'existe pas encore.
