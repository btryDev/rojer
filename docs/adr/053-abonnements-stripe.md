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
3. **Un impayé ferme la saisie, jamais la lecture ~~ni l'export~~.**
   [2026-11-06, § 15 : l'export d'un document officiel (dossier de
   contrôle, registre consolidé) demande d'avoir payé une fois ; un ancien
   abonné le garde.] Le client
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
     [2026-11-10, amendé — décision de la propriétaire, après l'audit de
     sécurité de `cc` et la lecture de la doc Stripe, Next.js, Clever Cloud
     et Prisma : **le traitement sort de la requête, par une file en
     base.** Motifs : Stripe demande de répondre « rapidement » avant toute
     logique complexe et de traiter « avec une file d'attente asynchrone »
     (docs.stripe.com/webhooks) ; un traitement dans la requête pouvait
     durer une minute (neuf appels Stripe pour une session de carte) ; un
     déploiement Clever Cloud arrête l'ancienne instance sans attendre ;
     cinq connexions SQL par instance ; plusieurs événements par changement
     relançaient chacun une relecture complète.
     - **Réception** : signature, mode, insertion de l'événement
       (`EvenementStripe`, « si absent »), 200. Ni appel Stripe ni logique.
       Doublon → 200 aussi (déjà enregistré). Les codes 409 et 500
       disparaissent : une fois l'événement en base, la relance est la nôtre.
     - **Aiguillage** (après la réponse, `after()` de Next.js, puis chaque
       minute par la crontab) : l'événement est pris sous bail
       (`traitementDebuteLe`, jeton), son objet relu chez Stripe pour
       trouver le client — et les effets propres à l'objet (carte d'une
       session de configuration, planning de baisse échu) — puis, dans
       **une seule transaction sans appel réseau**, le client est marqué « à
       synchroniser » et l'événement marqué aiguillé.
     - **Synchronisation, une par client** (`SynchronisationStripe`, une
       ligne par client Stripe) : un compteur de demandes, augmenté par
       chaque événement et chaque geste de l'utilisateur ; un bail daté
       (3 min) avec **jeton**, augmenté à chaque prise. Aucune connexion
       n'est tenue pendant les appels à Stripe. L'écriture de l'abonnement
       et la clôture de la ligne se font dans une transaction courte qui
       vérifie d'abord le jeton (`UPDATE … WHERE "bailJeton" = …`, ligne
       verrouillée jusqu'au commit) : un worker dont le bail a expiré
       n'écrit rien. La ligne n'est close que pour les demandes lues au
       début : une demande arrivée pendant la relecture la fait repasser.
       Les listes v1 de Stripe sont « immédiatement cohérentes »
       (docs.stripe.com/api-v2-overview) : une relecture qui commence après
       la précédente voit tout ce que la précédente a vu. `relueLe` reste,
       en second rempart.
     - **Relances** : sur échec, essais espacés (1 min, 5 min, 15 min, 1 h,
       3 h, 6 h, 12 h, 24 h, 24 h — trois jours, comme Stripe), puis
       **échec durable** et alerte (`ALERTES_EMAIL`). Une nouvelle demande
       relance un échec durable.
     - **Rapprochement quotidien** : la tâche du matin demande la relecture
       de chaque client dont l'abonnement n'est pas terminé. Stripe écrit
       qu'un événement peut ne jamais être créé
       (docs.stripe.com/events/manage-webhook-endpoints) : c'est le seul
       filet.
     - **Litiges et remboursements** : `v1.charge.dispute.created` et
       `v1.charge.refunded` écoutés ; alerte, et relecture du client. Les
       droits suivent l'abonnement : un remboursement se double d'une
       résiliation dans Stripe, et le réglage « Gérer les paiements
       contestés » annule l'abonnement contesté
       (`docs/lancement-abonnements.md`).
     - Une relecture tronquée par la pagination (limite atteinte) est un
       échec, jamais un état complet.
     - La crontab tourne sur chaque instance, et deux instances numérotées
       0 coexistent pendant un déploiement (doc Clever Cloud) :
       `INSTANCE_NUMBER` n'est qu'une économie ; la sûreté vient des baux
       en base. Les tâches quotidiennes s'enregistrent par jour civil
       (`TacheQuotidienne`, bail et jeton) : une seule exécution par jour,
       reprise si elle est tuée, rattrapée par la crontab de chaque minute
       si celle de 9 h a sauté.]
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
   [2026-11-07, grille du 2026-11-05 : **un essai par compte ET par
   entreprise (SIREN)**. Le SIREN n'est connu qu'à l'onboarding, après le
   début de l'essai : la règle se tient à la création de l'entreprise
   (`abonnements/essai-entreprise.ts`). Pendant un essai, le SIREN créé est
   noté (`EssaiEntreprise`, hors compte, gardé après la suppression d'un
   compte) ; une entreprise dont le SIREN a déjà servi l'essai d'un AUTRE
   compte ne se crée pas — elle se créera une fois l'abonnement payé. Refuser
   plutôt que finir l'essai (relecture du même jour) : rien n'est créé, rien
   n'est touché chez Stripe, les autres entreprises du compte gardent leur
   essai. Limites assumées : le SIREN n'est pas vérifié (public, un tiers
   peut le déclarer le premier ; le vrai dirigeant garde alors son essai et
   écrit à l'assistance, qui efface la ligne ; un SIRET inventé à la clé
   juste suffit pour un second essai, faute d'intégration SIRENE) ; un
   compte d'avant le lancement qui démarre son essai avec des entreprises
   déjà créées ne les note pas. Le SIREN posé plus tard sur une entreprise
   ancienne par la fiche établissement suit la même règle (seule autre porte
   d'un SIREN : il ne se modifie nulle part ailleurs) ; un site de plus d'une
   entreprise que le compte suit déjà n'est jamais refusé ; un compte en
   essai peut apprendre, refus après refus, qu'un SIREN a déjà eu un essai
   Rojer ailleurs — une information commerciale, pas personnelle, sans
   aucun accès au dossier.]
9. **L'essai est un abonnement Stripe créé par l'API** :
   `trial_period_days=30`, sans moyen de paiement,
   `trial_settings.end_behavior.missing_payment_method=pause`. Pendant
   l'essai, la saisie est ouverte (`trialing`) ; à la fin sans carte, l'état
   `paused` ferme la saisie, jamais la lecture ni l'export (§ 3).
10. [2026-11-06, amendé — grille du 2026-11-05 : **s'abonner se fait dans
   Rojer**. Le propriétaire choisit la formule et le rythme (mensuel,
   annuel) sur la page de l'abonnement ; la carte s'enregistre ensuite sur
   la page hébergée de Stripe (Checkout en mode « setup », sans
   prélèvement), puis la formule s'applique à l'abonnement qui court
   (`abonnements/souscription.ts`, idempotent, rejoué par le webhook
   `checkout.session.completed`). Pendant l'essai, rien n'est facturé avant
   sa fin ; `immediat` (valider un document officiel pendant l'essai) arrête
   l'essai et prélève le premier mois ; un abonnement en pause reprend et
   paie. L'essai se fait sur la plus petite formule (`PRIX_D_ESSAI`). Le
   portail sert à changer de carte, télécharger les factures et résilier :
   **il ne change plus la formule** (`subscription_update` désactivé) — il ne
   sait ni refuser une baisse ni la planifier entre produits (§ 14).
   Checkout « subscription » reste le chemin après une résiliation. Une
   carte déjà enregistrée : la formule s'applique sans repasser par Stripe.
   Rejouée (retour, webhook, rechargement), l'application ne refait rien :
   clés d'idempotence de la session, dernier choix daté sur l'abonnement
   (`rojerChoixLe`), facture d'une reprise en attente renvoyée telle quelle.
   Choisir Pro pendant l'essai ne donne rien de plus : les limites de l'essai
   valent jusqu'au premier paiement confirmé (§ 14). ~~Changer de formule une
   fois payant n'est PAS encore livré~~ [2026-11-06, livré : **changer de
   formule une fois payant** se fait sur la page de l'abonnement, abonnement
   à jour seulement (`active`). Le sens se lit sur la formule puis le rythme
   (`sensDuChangement`). **Montée** : tout de suite, différence facturée au
   prorata et prélevée (`always_invoice`), appliquée seulement si le paiement
   passe (`pending_if_incomplete`). **Baisse** : à la fin de la période
   payée, sans crédit (pratique courante), par un planning Stripe
   (`subscription schedule` : la période en cours, puis la nouvelle formule
   une période, puis rendu) ; refusée tant que le compte a plus
   d'utilisateurs que la formule visée ; ce qui dépasse d'autre passe en
   lecture seule (§ 14), annoncé avant le clic. Une montée abandonne une
   baisse planifiée ; « Garder ma formule » la rend. Tant qu'une baisse est
   planifiée, une invitation qu'elle ne permettrait pas est refusée
   (`refusInvitationBaissePrevue`) : sans cela, on inviterait après l'avoir
   planifiée et on garderait trop d'utilisateurs — ils ne sont jamais
   gelés. Stripe refuse un planning sur un abonnement réglé pour se mettre
   en pause à la fin de l'essai : ce réglage est levé d'abord.]] ~~Passer au payant, c'est ajouter une carte dans le portail Stripe~~ :
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
     le compte de l'invitation). Le plugin compte et écrit hors de toute
     transaction de Rojer, et un verrou pris dans un de ses crochets ne
     tiendrait pas jusqu'à son écriture : des invitations envoyées puis
     acceptées en parallèle peuvent dépasser le plafond d'autant de
     requêtes simultanées (en Pro ; en Essentiel la limite d'invitations
     vaut 0, étanche). Limite acceptée : il faut le vouloir (requêtes
     parallèles du propriétaire, adresses confirmées qu'il contrôle), et
     rien n'est perdu pour Rojer qu'une place.
   - [2026-11-05, A2 — règles tranchées par la session « stripe », mandatée
     par la propriétaire, selon la pratique courante (Docusign, Zapier,
     Adobe) : **« par an » repart à la date anniversaire** du premier
     abonnement payant du COMPTE (`Abonnement.debutPayantLe`, écrit une fois
     par la synchronisation à la première facture réellement payée — jamais
     sur `past_due`, et pas sur un `active` dont la facture n'est pas encore
     réglée —, jamais écrasé : résilier puis se réabonner ne remet rien à
     zéro) ; sans ancre (essai, jamais payé), les douze derniers mois. La
     première année part du début de l'essai (`essaiUtiliseLe`) : ce qui a
     été créé pendant l'essai y compte. Le journal ne change pas, seule la
     borne.] ~~**« Par an » = douze mois glissants**~~, dans un journal que rien
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
   - **Baisse de formule** [2026-11-05, même source ; Notion, Airtable,
     HubSpot, Calendly, Zapier ; remplace « refusée tant qu'on dépasse »] :
     acceptée, effective en fin de période payée, sans crédit (changement de
     formule : session « stripe »). Ce qui dépasse alors un plafond de
     stock est **gelé**, jamais supprimé : lisible et exportable, ni modifié
     ni source de création. Sont gardés les plus anciens jusqu'au plafond ;
     le gel se recalcule à chaque lecture, rien n'est stocké — retirer un
     ancien dégèle le suivant (lot A4). Exception : les **utilisateurs**, la
     baisse est refusée tant qu'ils dépassent (Atlassian, monday). Ce qui
     dépasserait se lit par `depassements(db, compteId, formule)` ; les
     plafonds annuels ne bloquent jamais une baisse.
     [2026-11-05, A4 — le gel, construit.] `gelesDuCompte` (`quotas.ts`)
     calcule, pour un compte qui a payé, les établissements et prestataires
     au-delà des plafonds (les plus récents, `createdAt` puis `id`) ;
     `requireCompte` les pose sur la portée (`Portee.geles`) — seule la
     session, jamais un accès sans session. Le client borné refuse AVANT
     d'écrire (`portee/gel.ts`, `verifierGel`) toute création, mise à jour
     ou upsert qui modifie une ligne rattachée à un élément gelé, ou en
     désigne une (clé, `connect`, écriture imbriquée portée par le parent) ;
     jamais un filtre silencieux. Refus : redirection vers
     `/compte/abonnement?saisie=gelee`. Lecture et suppression ouvertes.
     Le gel lit ce que l'écriture vise par la transaction en cours (suivie
     par le client borné) : par le client brut, il attendrait la seule
     connexion du pool (`connection_limit=1`). Une mise à jour relève ce
     qu'elle désigne au regard de la ligne en base : une clé gardée à
     l'identique ne désigne rien de neuf (modifier un permis qui nomme déjà
     un prestataire gelé reste possible), une clé changée vers un élément
     gelé est refusée (y nommer un prestataire gelé, y déplacer une ligne). Gestes ouverts
     malgré le gel, liste fermée (`ouvrirAuGel`, juste après la garde) :
     supprimer (c'est aussi ce qui dégèle), retirer un accès, une page
     publique, une déclaration ou une photo, demander de l'aide. L'entreprise
     (raison sociale, effectif) n'est pas gelée : elle n'appartient à aucun
     site.
     Le SQL brut d'une saisie appelle `refuserSiGele` (registre de sécurité,
     réponses fermées du DUERP). Hors gel, liste fermée
     (`quotas-gel-garde.test.ts`) : la régénération du calendrier (client
     brut) et les accès sans session (signature d'un tiers, dépôt d'un
     rapport par jeton). Un bandeau le dit en tête des pages d'un site gelé
     et sur la fiche d'un prestataire gelé ; les boutons désactivés dès
     l'ouverture viennent avec le lot D (même mécanisme que la saisie
     fermée).
   - **Limites de l'essai** [2026-11-05, A3 ; grille arrêtée le même jour] :
     pendant l'essai (`statut = trialing`), `LIMITES_ESSAI` (`formules.ts`)
     prime sur la formule essayée — 1 établissement, 1 utilisateur, 3 unités
     de travail (hors « Risques transverses », comme l'ADR-033), 1 zone (la
     zone principale, née avec l'établissement), 5 équipements, 1
     prescription particulière ; le reste suit les volumes de la formule.
     Ces quatre derniers sont sans limite dans les formules payantes.
     « Pendant l'essai » se lit : tant que le compte n'a jamais payé
     (`statut = trialing` ou `debutPayantLe` vide, `essaiDe`) — un premier
     paiement en échec à la fin de l'essai (`past_due`) n'ouvre pas les
     volumes de la formule, et le refus le dit (« tant que votre premier
     paiement n'est pas confirmé »). D'où une **condition de lancement** :
     la synchronisation écrit `debutPayantLe` à la première facture payée ;
     sans elle, un compte payant resterait aux limites de l'essai. Le verrou
     du compte n'est pris que s'il y a un plafond : un compte sans limite
     pour une clé ne bloque pas ses autres créations.
     Les limites de l'essai bloquent la **création**, elles ne gèlent rien
     [2026-11-05, session « stripe »] : un compte existant au lancement qui
     démarre l'essai avec plus que ses limites (trois sites, vingt
     équipements) garde ce qu'il a et travaille dessus, sans rien ajouter
     au-delà ; il s'abonne pour en ajouter. Pas d'exception codée. Le gel ne
     vise qu'un compte qui a déjà payé et dépasse sa formule.
     Équipements et prescriptions se comptent retirés compris (retirer puis
     recréer ne contourne rien). Un lot (pré-remplissage d'équipements,
     import d'un DUERP) est créé en entier ou refusé ; les unités suggérées
     par le secteur s'arrêtent à la limite sans refuser
     (`placesSousLePlafond`), comme à l'ADR-033. Le calendrier dit, pendant
     l'essai, qu'il ne suit que 5 équipements.
   - **Liens, signatures, imports** [2026-11-05, lot C] : les **liens
     d'accès actifs** se comptent sur ce qui sert encore — ni révoqué, ni
     expiré, ni consommé s'il est à usage unique (`verifierAccessToken`) : un lien
     expiré libère sa place. Les **signatures** se comptent à la DEMANDE
     (émission du lien, `emettreAccessToken`) et quand le titulaire signe
     lui-même, comme les enveloppes d'un service de signature : la signature
     posée ensuite par le tiers ne recompte pas, et n'est jamais refusée au
     tiers. Un e-mail qui n'est pas parti rend la signature prise,
     si le lien est bien révoqué (`rendreQuota`, seule ligne du journal
     effacée ; non révoqué, le lien a pu partir) ; une demande révoquée
     ensuite (document modifié, code épuisé, lien expiré) ne la rend pas :
     redemander coûte une signature, comme une enveloppe renvoyée. Les
     **imports de DUERP** se comptent par an, comme les
     signatures (journal, date anniversaire) : un fichier corrigé puis
     redéposé l'année suivante repasse ; leur verrou se prend en fin de
     transaction. La migration reprend les signatures des douze derniers
     mois (signatures du titulaire, demandes envoyées) ; les imports passés
     ne laissent pas de trace distincte en base, ils ne sont pas repris. Le
     stockage (Go) attend la taille des fichiers : lot à part.
   - **Stockage** [2026-11-06, lot C2] (2 / 6 Go) : la somme des tailles
     des fichiers que le compte RÉFÉRENCE encore (`FichierStocke` : clé,
     compte, octets), plus ses réservations des 15 dernières minutes — un
     fichier retiré cesse de compter sans rien effacer. Tout dépôt passe par
     `deposerFichier(db, compteId, …)` (`abonnements/stockage.ts`) : sous le
     verrou du compte, refus au plafond ou réservation de la taille ; puis le
     dépôt, qui rend sa réservation s'il échoue — deux dépôts simultanés, ou
     plusieurs pièces d'un même envoi, se comptent l'un l'autre. La somme se
     fait en SQL, en entier long (au-delà de 2 Go). Les colonnes de fichier
     sont celles de `CLES_STOCKEES` (`suppression/fichiers.ts`, gardées
     contre le schéma). Le stockage plein s'annonce dès l'ouverture des
     formulaires qui déposent les plus lourds (rapport, prestataire). Les
     fichiers existants se reprennent par `scripts/reprendre-tailles-fichiers.ts`
     (dry-run, puis `--appliquer` ; tailles déjà en base reprises), avant le
     lancement et de nouveau au lancement ; un fichier sans taille connue ne
     compte pas, au bénéfice du client. Remplacer une pièce au plafond est
     refusé même si le solde serait nul (l'ancienne compte jusqu'au
     remplacement) : limite acceptée.
   - **Annoncé dès l'ouverture** [2026-11-05, lot D] : un formulaire qui
     écrit ne part plus pour être refusé après coup — React efface la
     saisie au retour, même en refus. `FermerLaSaisie` (client), dans sa
     zone (`data-zone-saisie`), désactive dès l'ouverture les boutons
     d'envoi des formulaires de server action (`aria-disabled`, le motif en
     description pour un lecteur d'écran, grisés), arrête leur envoi, et
     dit au clic, près du bouton, pourquoi rien n'est parti ; la lecture (filtres) et les
     formulaires marqués `data-saisie-ouverte` (demander de l'aide)
     restent ouverts (se déconnecter compris). Pages d'un site et du
     DUERP, et modification de l'entreprise : lecture seule, abonnement
     fermé ou site gelé (`VerrouDeLaPage` dans la mise en page, panneaux
     en portail compris par `data-portail-saisie` ; le gel y porte son
     bandeau). Pages de création : le plafond atteint
     (`PlafondDeCreation` : prestataire, équipement, permis, plan, unité,
     import, établissement ; utilisateurs sur la page Membres) ; fiche et
     page Modifier d'un prestataire gelé (`GelDuPrestataire`). Non
     couverts : les boutons qui appellent une action sans formulaire, et
     les formulaires sans server action déclarée (le refus du serveur
     reste) ; la création d'une zone ou d'une prescription au plafond de
     l'essai, dont le formulaire partage sa page avec d'autres. Le motif
     n'est relu qu'au rendu : un dégel ou un paiement fait ailleurs
     s'applique au prochain affichage.
   - **Condition de lancement** : « Sur mesure » doit avoir sa propre entrée
     dans `FORMULES` (ses plafonds) et sa clé (`lookup_key` ou
     `metadata.formule` du prix) avant toute vente — sans quoi le refus par
     défaut lui applique les plafonds de la plus petite formule.

15. **Valider = s'abonner (2026-11-06)** — grille du 2026-11-05 (session
   « pricing »), décisions transmises par la session « stripe », mandatée
   par la propriétaire. Pendant l'essai et sans abonnement, tout s'utilise
   SAUF les gestes qui produisent un document officiel ou engagent un tiers :
   valider une version du DUERP (`creerVersion`) ; exporter le dossier de
   contrôle et le registre consolidé (`controle-zip`, `registre/pdf`) ;
   publier le registre d'accessibilité (`publierRegistre` — l'affiche QR ne
   sert que d'un registre publié) ; signer (`signerEnCompteConnecte`) ou
   envoyer un lien (`demanderSignature`) — une seule signature de test par
   compte (`LIMITES_ESSAI.signaturesParAn = 1`, tenue par la porte sous le
   verrou ; `signatureDEssaiDisponible` n'en est que le pré-contrôle), et le
   lien seulement à soi-même. Ils demandent un premier
   paiement **confirmé** (`debutPayantLe`, la première facture payée), pas
   un `active` : `aDejaPaye`, `exigerUnPaiement`
   (`abonnements/validation.ts`). Refusé : `/compte/abonnement?immediat=1`
   (la page « S'abonner », session « stripe »). Un ancien abonné garde ses
   exports (il a payé) ; leur délai de 12 mois après la fin de l'abonnement
   (notes § 10, 2026-11-06) reste à coder. **Condition de lancement** : la
   synchronisation écrit `debutPayantLe` à la première facture payée
   (session « stripe ») ; sans elle, tous les gestes de ce paragraphe sont
   refusés à tous, abonnés compris. Ce qui existait avant le lancement ne se
   perd pas : une version de DUERP déjà figée reste téléchargeable, un
   registre d'accessibilité déjà publié le reste (le republier après l'avoir
   retiré demande l'abonnement). Le plan d'actions et les points à corriger
   en PDF sont des documents de travail : ni bloqués ni marqués. La
   signature de test se compte depuis le début de l'essai (ce qui a été signé
   avant ne l'entame pas), par la porte comme par le pré-contrôle. Non fait :
   l'annonce avant le clic (le bouton ne dit rien ; on l'apprend à la
   redirection). Les aperçus sont marqués « Projet –
   non validé » (`MentionProjet` : aperçu du DUERP, toujours ; dossier de
   conformité, pour un compte qui n'a jamais payé). Les brouillons de permis
   de feu et de plans de prévention restent imprimables. Pas de « compte en
   veille » (notes § 10, 2026-11-06). Rien ne change avant le lancement de
   l'offre.

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
- `EssaiEntreprise` (§ 8) : hors compte (ADR-051), `siren` en clé
  primaire, `compteId` (sans clé étrangère : la ligne survit au compte),
  `noteLe` ; écrite une fois, jamais modifiée (l'assistance peut l'effacer).
- `EvenementStripe` : hors compte (ADR-051), écrit avant toute identité :
  `id` (l'identifiant Stripe `evt_…`), `type`, `recuLe` (indexé, pour le
  ménage), `traitementDebuteLe`, `traiteLe`, `derniereErreur` (un motif,
  jamais la charge utile). [2026-11-10 : et `tentatives`,
  `prochainEssaiLe`, `echecDurableLe`, `clientStripe` (le client trouvé à
  l'aiguillage), `dureeMs` (temps d'aiguillage).]
- `SynchronisationStripe` (2026-11-10) : hors compte ; `customerId` en clé
  primaire ; `demandes`, `traitees` (compteurs : due tant que `demandes >
  traitees`) ; `bailJeton`, `bailJusquAu` ; `tentatives`,
  `prochainEssaiLe`, `derniereErreur`, `echecDurableLe` ;
  `abonnementId` (le dernier abonnement vu à l'aiguillage : relu par son
  identifiant si le client a été supprimé) ; `synchroniseLe`.
- `TacheQuotidienne` (2026-11-10) : hors compte ; `jour` (clé civile de
  Paris) en clé primaire ; `bailJeton`, `bailJusquAu`, `termineeLe`,
  `bilan`.

## Ce que cette décision ne règle pas

- Le contenu des formules et ce qui les distingue (volume ou modules) ; les
  `Entitlements` de Stripe seront à considérer si ce sont des modules.
- L'essai avec ou sans carte.
- ~~La TVA,~~ les mentions obligatoires des factures et la facturation
  électronique (émission obligatoire pour les PME au 1er septembre 2027) :
  hors code, à voir avec l'expert-comptable (notes, § 6). [2026-11-09 : la
  TVA est un taux fixe de 20 % posé sur chaque abonnement, sans lequel
  aucun abonnement ne se crée (notes, § 12).]
- La suppression de compte, qui n'existe pas encore.
