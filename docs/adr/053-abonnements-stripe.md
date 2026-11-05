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
   [2026-11-03, lot 3 — la garde.] La règle vit dans `abonnements/droits.ts`
   (`droitsDe`, fonction pure) ; la garde est `verifierSaisie()`, en tête de
   chaque server action qui écrit pour le titulaire, et une garde de code
   l'exige de toutes (`abonnements/saisie-gardee.test.ts`, sur le balayage
   `ecrituresExposees`). Refusée : redirection vers `/compte/abonnement`.
   Restent ouvertes, liste fermée et motivée dans ce test : le compte et sa
   sécurité, la demande d'assistance, le retrait d'un accès prestataire ou
   d'une page publique, la signature d'un tiers par lien, la suppression
   d'une entreprise ou d'un établissement (règle 9). Les accès sans session
   (jeton, signature, MCP) ne passent pas par `requireCompte` : non gardés.
   **Tant que l'offre n'est pas lancée, rien ne se ferme** :
   `ABONNEMENT_EXIGE=oui` le décide, et il n'a d'effet qu'avec Stripe actif.
   Sans lui, la garde ne lit rien (ni session ni abonnement) et aucun bandeau
   ne s'affiche. Ce qui arrive aux comptes existants le jour où il passe à
   `oui` (essai offert, délai) se décide avec l'offre et le lot 5.
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

## Parcours (lots 4 et 5, décisions de la propriétaire du 2026-11-03)

8. **Essai gratuit de 30 jours, sans carte**, de la formule que le client
   choisit, démarré sur un écran dédié entre la confirmation de l'adresse et
   l'onboarding (l'onboarding se fait pendant l'essai), une fois par compte
   (`essaiUtiliseLe`). Une case non cochée d'avance fait accepter les
   conditions générales ; Rojer garde la preuve (personne, version, empreinte,
   date, contexte). Texte provisoire tant qu'un juriste ne l'a pas relu.
9. **L'essai est un abonnement Stripe créé par l'API** :
   `trial_period_days=30`, sans moyen de paiement,
   `trial_settings.end_behavior.missing_payment_method=pause`. Pendant
   l'essai, la saisie est ouverte (`trialing`) ; à la fin sans carte, l'état
   `paused` ferme la saisie, jamais la lecture ni l'export (§ 3).
10. **Passer au payant, c'est ajouter une carte dans le portail Stripe** :
   l'abonnement devient payant à la fin de l'essai, sans prélèvement anticipé ;
   un abonnement en pause se reprend du même portail. Le portail sert aussi à
   résilier, à télécharger les factures (émises par Stripe) et à changer de
   formule — réglé pour garder l'essai (`subscription_update.
   trial_update_behavior = continue_trial` ; par défaut, le portail y met
   fin). **Checkout** ne sert qu'à souscrire de nouveau après une
   résiliation ; Rojer le refuse tant qu'un abonnement n'est pas terminé.
11. **Les formules vivent en TypeScript** (`abonnements/formules.ts`, comme
   les référentiels, ADR-003) : la `lookup_key` du prix Stripe → formule,
   périodicité, quotas. Les **prix** restent chez Stripe, qui les facture.
   Toutes les formules donnent accès à tout Rojer ; elles ne diffèrent que
   par des quotas sur ce qui s'utilise à volonté, et l'expert. Au quota, seule
   la création d'un nouvel élément est refusée. Catalogue repris de la
   proposition `docs/offres-abonnement` (2026-11-03), provisoire.
12. **Propriétaire seul** : démarrer l'essai, ouvrir le portail ou Checkout
   (ADR-054, rôle `owner`) ; un membre voit l'état sans les boutons.

13. **Le parcours, branché (PR B, 2026-11-05)** : `/essai` (écran d'essai),
   atteint par l'onboarding (`aiguillageEssai`, après `aiguillageSansCompte`)
   quand l'offre est lancée et que le compte — s'il existe, et pour son
   propriétaire — n'a jamais eu d'abonnement. Le démarrage
   (`abonnements/essai.ts`) : compte par `requireCompteDOnboarding`,
   propriétaire seul, client Stripe puis ligne `Abonnement` RÉSERVÉE avant
   l'essai, preuve d'acceptation (`AcceptationConditions`), essai, relecture
   immédiate (la saisie s'ouvre sans attendre le webhook). La page
   `/compte/abonnement` porte le geste : l'essai s'il est disponible, le
   portail tant qu'un abonnement court (le nom de l'entreprise passe sur le
   client Stripe juste avant, pour la facture), Checkout après sa fin. Les
   trois actions restent ouvertes à un impayé et sont réservées au
   propriétaire. Plafond d'établissements à l'onboarding
   (`abonnements/quotas.ts`). L'acceptation au paiement (Checkout) est gardée
   par Stripe sur la session, pas recopiée. Les comptes existants au
   lancement verront l'écran d'essai à leur prochain onboarding — à confirmer
   au lancement.

14. **Les plafonds, une seule porte (lot A du chantier « quotas »,
   2026-11-05)** — décisions de la propriétaire du 2026-11-05 ; le reste,
   tranché par la session « stripe », est contestable.
   - **Comptés par compte**, toutes entreprises et tous établissements
     confondus ; plafonds de la formule de l'abonnement (`formules.ts`).
   - **Une seule porte** : `prendreQuota` (`abonnements/quotas.ts`), appelée
     DANS la transaction qui crée l'élément. Elle verrouille la ligne du
     compte (`FOR NO KEY UPDATE` : deux créations du même compte passent
     l'une après l'autre, et l'insertion d'une ligne qui référence le compte
     n'est pas bloquée), compte, refuse au plafond (`RefusQuota`, qui annule
     la transaction). Un pré-contrôle sans verrou (`refusQuota`) peut
     précéder, pour refuser avant de déposer des fichiers ; il ne remplace
     jamais la porte. Une garde relit le code (`quotas-garde.test.ts`) :
     toute création d'un modèle plafonné passe par elle.
   - **Refus par défaut** : une formule absente ou inconnue reçoit les
     plafonds de la plus petite formule, et le journal le signale. (Était :
     pas de plafond.)
   - **Établissements, prestataires** : comptés sur ce qui existe.
   - **Utilisateurs** (1 en Essentiel, 5 en Pro) : membres + invitations en
     attente non expirées, vérifié à l'invitation (`invitationLimit` du
     plugin, = plafond − membres) et à l'acceptation (`membershipLimit`, sur
     le compte de l'invitation). Le plugin compte hors de toute transaction
     de Rojer : deux acceptations simultanées peuvent dépasser d'un. Limite
     acceptée — les invitations sont rares et émises par le propriétaire.
   - **« Par an » = douze mois glissants**, dans un journal que rien
     n'efface (`ConsommationQuota` : compte, plafond, date ; aucun lien vers
     l'élément) : supprimer un brouillon ou un établissement ne rend pas le
     crédit, une résiliation suivie d'une souscription non plus. Le journal
     s'écrit dès aujourd'hui, offre lancée ou non, et la migration y reprend
     les permis de feu et plans de prévention existants : au lancement, les
     douze derniers mois sont déjà comptés. Le verrou et le refus, eux,
     n'agissent qu'une fois l'offre lancée. Concernés : permis de feu,
     plans de prévention (Essentiel : 10 et 5).
   - Au plafond, seule la création est refusée, et le message nomme la
     formule qui le lève (« Sur mesure » sur devis au-delà de Pro).

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
- `AcceptationConditions` (PR B) : racine `compteId`, auteur `userId`,
  `version`, `empreinte`, `contexte` (`essai`), `accepteeLe` ; écrite une
  fois, jamais modifiée.
- `ConsommationQuota` (§ 14) : racine `compteId` (suppression en cascade
  avec le compte), `quota` (la clé de `Quotas`), `consommeLe` ; une ligne
  par élément « par an » créé, jamais modifiée ni effacée par Rojer.
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
