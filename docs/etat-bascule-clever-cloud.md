# État de la bascule vers Clever Cloud — passation du 2026-11-01

À lire avant toute session sur `main` ou sur `cc`. Ce fichier remplace la
mémoire locale des sessions, qui ne suit pas d'une machine à l'autre. Le
mettre à jour (rayer, dater) à chaque étape franchie.

> **[2026-11-13, décision de la propriétaire] `cc` est devenue `main`.** Il n'y
> a plus qu'une branche. `main` a avancé jusqu'à la tête de `cc` (elle n'avait
> aucun commit que `cc` n'eût pas), les PR ouvertes vers `cc` sont redirigées
> vers `main`, la branche `cc` est supprimée. Vercel ne déploie plus rien
> (`vercel.json`, `git.deploymentEnabled: false`, #312) ; le projet Vercel et
> le code qui ne servait que lui (`vercel.json`, `scripts/migrer-en-production.sh`,
> pilote de stockage Supabase) se retirent dans un second temps. [2026-11-17,
> PR #337 : code retiré — ces trois-là, et la lecture de `VERCEL_ENV`, des
> hôtes `VERCEL_URL` du MCP et les `maxDuration`. Reste le projet Vercel,
> côté propriétaire.] On déploie
> la préproduction par `pnpm deployer:preprod` depuis le dépôt principal. Tout
> ce qui suit et parle de « deux branches », d'un flux `main` → `cc` ou d'un
> report vers `cc` décrit l'état d'avant cette date.

## Deux branches, deux productions

| | `main` | `cc` |
|---|---|---|
| Rôle | Production actuelle (un testeur) | Future production |
| Hébergement | Vercel, déploie `main` à chaque fusion | Clever Cloud, déployé **par commande** (`scripts/deployer-cc.sh`) ; Vercel ne déploie jamais `cc` |
| Authentification | Supabase Auth (ADR-005) | Better Auth (ADR-052) : tables `User`, `Session`, `Account`, `AuthVerification`, `TwoFactor` dans notre base |
| Base | Supabase | PostgreSQL de Clever Cloud, **neuve** à la bascule (pas de reprise de données : la prod ne porte que des données factices) |

**Le flux va de `main` vers `cc`, jamais l'inverse.** Tout ce qui est fusionné
dans `main` se reporte dans `cc` par une PR de fusion (`main` → branche de
travail → PR vers `cc`). Conflits habituels au report : sur `cc`, le
connecteur MCP OAuth de Supabase n'existe plus — garder la suppression de
`src/lib/mcp/acces-oauth*.ts` et `route-oauth.test.ts`, ne pas réintroduire
`clientDuCompteVerifie` ni `ScopeMcp.userId`.

## Ce qui est sur `cc` (au 2026-11-03, df9dbff6 ; ~~au 2026-11-02, 4f4e63e4~~ ; ~~au 2026-11-01, e65ba81c~~)

- **Better Auth**, lots 1 à 3b (#133 à #139) : inscription, connexion,
  vérification d'adresse, mot de passe oublié, page « Sécurité du compte »
  (sessions, mot de passe, mots de passe divulgués refusés), double
  authentification (application TOTP + codes de secours ; pas de code par
  e-mail, décision du 2026-10-30).
- **Isolation des comptes (ADR-051)**, terminée : toutes les lectures et
  écritures passent par le client borné au compte (`requireCompte()` →
  `{ user, db }`, `src/lib/auth/portee/`) ; 9 modules nommés seulement
  touchent le client brut ; SQL brut par `requireLectureSqlProprietaire`,
  éprouvé sur base réelle (`auth/sql-proprietaire.integration.test.ts`).
- **Validation du 2026-10-31** sur une base neuve et un build de production :
  migrations rejouées depuis zéro sans écart, RLS sur les 39 tables ;
  75 routes × 2 comptes (B reçoit 404 sur tout ce qui est à A) ;
  23 écritures croisées sans effet ; réponse identique pour « à un autre
  compte » et « inexistant » ; 17 des 18 protections de la borne retirées une
  à une font tomber un test (la 18ᵉ vise une relation qui n'existe pas) ;
  13 pages au budget de requêtes, toutes sous 130 ms.

- **Abonnements Stripe, socle** (2026-11-02, PR #153, `4f4e63e4`) : ADR-053,
  tables `Abonnement` (racine de compte) et `EvenementStripe` (hors compte),
  RLS, configuration et client Stripe. **Aucune route ni aucun écran** : sans
  clé Stripe, `cc` se comporte comme avant. Fusionné avant la bascule à la
  demande de la propriétaire (le plan était d'attendre) : deux tables vides
  de plus à rejouer, rien d'autre. Suite du chantier et constats des revues :
  `docs/notes-chantier-abonnements-stripe.md` (§ 5 les lots, § 7 ce que les
  revues renvoient au webhook, aux droits et au parcours).
- **Abonnements Stripe, suite** (2026-11-03) : webhook (#156) ; droits du
  compte et garde des écritures `verifierSaisie()` — un impayé ferme la
  saisie, jamais la lecture ni l'export (#158) ; lots 4-5, partie A (#164) :
  catalogue provisoire des formules, conditions générales provisoires
  (`/conditions`), appels Stripe du parcours **non branchés**. Reste la
  partie B (écran d'essai, choix de formule, Checkout, portail, quota
  d'établissements, preuve d'acceptation des CGU) : elle attendait #159,
  fusionnée ; plan et passation dans les notes du chantier, §§ 8 et 9 (#166).
- **Plusieurs utilisateurs par compte, lot 1** (2026-11-03, ADR-054, PR #159,
  fusionnée dans `cc` en 5e4c8378 avec l'ADR, #157) :
  tables `Compte`, `Membre`, `InvitationCompte` (plugin `organization` de
  Better Auth) ; la racine de l'isolation est `compteId`, plus `userId` ;
  l'appartenance est relue à chaque requête ; + 1 requête par page. Cinq
  migrations, avec reprise (un compte par utilisateur existant) et arrêt
  avant le retrait de `userId` si une ligne y échappe. **Si la bascule a lieu
  avant la fusion de ce lot**, scinder la dernière migration (§ 10 de
  l'ADR). [2026-11-03 : sans objet, fusionné avant la bascule.] ~~Pas encore d'écran : invitation, lecture seule et membres viennent
  aux lots suivants.~~ [2026-11-03 : lots 3 et 4 sur la même PR — lecture
  seule (client borné et `verifierSaisie`), écran « Membres », invitation par
  e-mail, choix du compte. ~~Reste : masquer les boutons de saisie pour la
  lecture seule, plafond de membres par formule.~~ [2026-11-09 : le plafond
  de membres est posé (5a7ca218, lot A des plafonds) ; le masquage en lecture
  seule et le choix du compte dans la gélule sont livrés par #262.]]

- **Reports de `main`** (2026-11-03) : borne d'effectif à 49 (#161, #163) ;
  effectif de la société = somme de ses sites, apprentis, effectif hors
  Rojer (#165 sur `main`, reporté par #168 avec `verifierSaisie()` en tête de
  `modifierEffectifs`). Migration `20261103180000_effectif_par_les_sites`,
  datée après celles des comptes.
- **Report de `main`** (2026-11-04) : vérification faite en interne,
  formulaire sans fichier (#180, ADR-055). Migration additive
  `20261104120000_releve_interne`, datée après celle de l'effectif ; sur
  `cc`, `uploadRapport` garde `verifierSaisie()` et la portée `compteId`.
- **Proxy** (2026-11-05, #184) : `proxyClientMaxBodySize` aligné sur les
  25 Mo des actions serveur (le proxy coupait le corps à 10 Mo), et un POST
  d'action serveur sans cookie passe au lieu d'être redirigé — l'action
  renvoie elle-même à `/login` par `requireUser()`. Report de `main` du même
  jour : #182, #185 (la même limite, sans conflit), #186. À vérifier au
  premier déploiement : « Ce qui reste avant la bascule ».
- **Report de `main`** (2026-11-06, #203) : écrits annexés au registre et à
  l'export contrôle (#193), puis le référentiel `2026-11-06.1` (#200) et
  `2026-11-06.2` (#201, plan d'intervention à l'entrée, PE 27 § 6). Sur `cc` :
  dépôt d'une pièce par `deposerFichier` (plafond de stockage, ADR-053 § 14)
  et `verifierSaisie()` en tête ; le registre et le ZIP se lisent avec le
  compte qui les bâtit (`AccesCompte`), sans relire la session. Les cinq
  points communs aux dépôts relevés à la relecture sont traités par #212.
- **Report de `main`** (2026-11-09, #248) : ADR-057 lots B (#205, les
  présences établies d'après le parc sur la page Équipements, DAE partagé
  déclaré d'une case) et C (#214, catégories jumelles réunies, type déclaré,
  référentiel `2026-11-07.1`), et #245 (relevé provisoire `?ecran` de la page
  d'accueil, **à retirer une fois le hero réglé**, sur `main` puis ici).
  Migrations `20261107120000_categories_jumelles` et
  `20261107120100_categories_jumelles_reprise`, datées après
  `20261107100000_essai_entreprise` et éprouvées sur une copie de base `cc` :
  reprise des appareils et des prescriptions, RLS d'`Equipement` et de
  `PrescriptionParticuliere` inchangée. Ce que `cc` garde et que `main` n'a
  pas, à ne pas perdre au prochain report : le plafond de l'essai sur le
  pré-remplissage des équipements (`creerSousPlafond`) ; `basculerDaePartage`
  appelle `verifierSaisie()` et `CasePartageDae` relance la redirection ;
  `declarationsDePresence` lit par `compteId`, avec l'accès de la page
  (`declarations-de-presence.test.ts`) ; l'empreinte du moteur de la fusion
  (`bd476b63f185b7ff`). Sur un site gelé, cocher « DAE partagé » est refusé
  (`upsert`), la décocher passe (`deleteMany`, que le gel ne bloque pas) :
  retirer une déclaration reste ouvert, comme le veut l'ADR-053 § 14.

### Multi-utilisateurs : ce qui reste (2026-11-03)

- **Recette à rejouer AVANT la bascule** : [2026-11-09 : la liste est
  écrite, section « Recette « pages × comptes à plusieurs membres » »
  plus bas.]
- ~~**Décision à confirmer par la propriétaire** : supprimer une entreprise ou
  un établissement est réservé au propriétaire du compte
  (`verifierProprietaire`), choix de réalisation (ADR-054, « Ce que la
  réalisation a précisé, lots 3 et 4 »). Pour l'ouvrir aux membres :
  `verifierRole` à la place, dans `entreprises/actions.ts` et
  `etablissements/actions.ts`.~~ [2026-11-09, décision de la propriétaire :
  la suppression reste réservée au propriétaire. Rien à changer.]
- ~~**Lot à part, lecture seule** : masquer les boutons de saisie pour un
  membre en lecture seule (environ 80 écrans de formulaires). D'ici là, tout
  geste tenté aboutit à `/compte/lecture-seule`, et le client borné refuse
  l'écriture.~~ [2026-11-09 : livré par #262.]
- ~~**Plafond de membres par formule** : à poser quand la gamme est arrêtée
  (`membershipLimit` du plugin, lu depuis la formule, invitations en attente
  comprises ; ADR-054 § 8). Le plugin garde aujourd'hui son défaut de 100.~~
  [2026-11-09 : posé, 5a7ca218.]
- ~~**Choix du compte dans la gélule** : il n'existe que sur l'écran « Membres »
  (ADR-054 § 7).~~ [2026-11-09 : livré par #262.]
- ~~**Bases locales** qui ont joué `20261103120000_comptes_et_membres` avant
  son CHECK et son déclencheur : à remettre à zéro (aucune n'est en
  production).~~ [2026-11-09, vérifié sur les bases du conteneur
  `duerp-verif-db` : seules `duerp_cc_visuel` et `duerp_quota_navig` portent la
  migration, avec l'empreinte du fichier actuel (appliquée le 2026-11-05,
  après le CHECK et le déclencheur) ; les quatre autres ne l'ont pas. Rien à
  remettre à zéro.]

- **Abonnements et audit de sécurité** (2026-11-10) :
  - suppression d'un compte sans abonnement depuis douze mois, après deux
    e-mails (J-30, J-7), ADR-058 (#265) ;
  - le webhook Stripe a son propre client, aux appels courts (#274) ;
  - le webhook ne fait plus qu'enregistrer et répondre : une file en base
    traite, une relecture par client sous bail à jeton, relances sur trois
    jours puis alerte e-mail, rapprochement quotidien, litiges et
    remboursements signalés ; la crontab tourne **chaque minute**, les
    tâches du jour une fois par jour civil (ADR-053 § 5 amendé, #277) ;
  - la saisie fermée est refusée dans le client borné de la session, même
    si le compte actif change dans un autre onglet (ADR-053 § 3 amendé,
    #281).

## Recette « pages × comptes à plusieurs membres » (avant la bascule)

Ajoutée le 2026-11-09. À jouer **sur l'application déployée chez Clever
Cloud, avant d'y faire pointer le domaine**, dans un vrai navigateur. Les
tests automatiques éprouvent déjà la borne au compte et à l'établissement
contre une vraie base (matrice d'isolation, portée d'établissement,
appartenance, invitation) ; la recette vérifie le reste : l'application
réelle, son proxy, ses réglages, et les pages qu'aucun test ne parcourt.
Elle remplace la matrice « 75 routes × 2 comptes » du 2026-10-31, jouée
avant l'ADR-054 (plusieurs membres par compte).

Un écart = noter la page, la personne, ce qui s'est affiché. Toute donnée
d'un autre compte visible, ou toute écriture qui passe là où elle devrait
être refusée, **bloque la bascule**.

### 1. Préparer

Les personnes (six adresses e-mail de test, sur un domaine qui accepte
tout — jamais `btry.fr`) :

| Qui | Rôle |
|---|---|
| **P** | propriétaire du compte A |
| **M** | membre du compte A |
| **L** | membre en lecture seule du compte A |
| **D** | membre du compte A **et** propriétaire du compte B |
| **X** | propriétaire du compte B seulement |
| **R** | membre du compte A, retiré pendant la recette (étape 5) |

Les données : dans **A** comme dans **B**, une entreprise et **deux**
établissements (A1, A2 ; B1, B2), et dans A1 et B1 au moins un élément de
chaque module, pour avoir des adresses à essayer :
un équipement avec un contrôle, un rapport déposé (PDF) et un point à
corriger avec sa pièce ; un prestataire avec une pièce ; un salarié avec un
titre ; un DUERP avec une unité, un risque, une mesure et **une version
validée** ; un permis de feu ; un plan de prévention ; une action ; une
analyse du carnet sanitaire ; une pièce d'un état permanent ; la photo de
l'établissement ; une demande de signature ; un lien d'accès prestataire
(jeton). Relever dans un fichier les **adresses** de B (identifiants dans
l'URL) : elles servent à l'étape 2.

### 2. Isolation : rien de B depuis A

Connecté en **P** (puis refaire les lignes marquées ★ en **L**), coller
chaque adresse de B relevée à l'étape 1. Attendu partout : **page 404**
(ou « introuvable »), jamais une donnée de B, jamais une erreur 500.

| Famille | Adresses à essayer avec un identifiant de B |
|---|---|
| Établissement ★ | `/etablissements/[B1]` et chaque sous-page : `accessibilite`, `actions`, `batiments`, `calendrier`, `carnet-sanitaire`, `connecter`, `controle`, `documents`, `duerp`, `equipe`, `equipements`, `etats-permanents`, `guide`, `modifier`, `perimetre`, `permis-feu`, `plan-prevention`, `prescriptions`, `prestataires`, `quand-ca-arrive`, `registre` |
| Éléments ★ | `/etablissements/[A1]/equipements/[équipement de B]` (l'établissement de A, l'élément de B : le cas le plus sournois), idem pour `actions/[…]`, `permis-feu/[…]`, `plan-prevention/[…]`, `prestataires/[…]`, `equipe/[…]`, `verifications/[…]`, `registre/[section]`, `equipements/[…]/controles/[…]`, `equipements/[…]/points/[…]` |
| Entreprise ★ | `/entreprises/[entreprise de B]`, `…/effectif`, `…/modifier` |
| DUERP ★ | `/duerp/[DUERP de B]` et `activites`, `risques`, `risques/[unité]`, `risques/[unité]/[risque]`, `…/mesures`, `secteur`, `synthese`, `transverses`, `unites` |
| Fichiers et PDF ★ | `/api/etablissements/[B1]/` + `controle-zip`, `dossier-conformite/pdf`, `plan-actions/pdf`, `registre/pdf`, `photo`, `pieces/[pièce]`, `equipe/[salarié]/donnees`, `equipements/[…]/points-a-corriger/pdf` ; `/api/rapports/[rapport de B]/fichier` ; `/api/points/[point de B]/piece` ; `/api/prestataires/[…]/pieces/[…]` et `pieces-precedentes/[…]` ; `/api/analyses-legionelles/[…]/rapport` ; `/duerp/[DUERP de B]/pdf/preview` ; `/duerp/[DUERP de B]/versions/1/pdf` |
| Listes | `/entreprises`, le sélecteur d'établissement de la gélule, la recherche s'il y en a une : seuls A1 et A2 apparaissent |

Et dans l'autre sens, une fois, en **X** : trois adresses de A prises au
hasard dans le tableau → 404.

### 3. Les rôles dans le compte A

Parcourir A1 en entier (chaque entrée de la barre latérale) avec chaque
personne :

| Geste | P | M | L |
|---|---|---|---|
| Voir toutes les pages et télécharger les PDF | oui | oui | oui |
| Boutons « Ajouter », « Modifier », « Supprimer », formulaires | visibles | visibles | **masqués** ; réponses Oui / Non affichées mais inertes, au clic **et au clavier** (Tab puis Entrée) |
| Créer, modifier un élément (équipement, salarié, risque…) | oui | oui | refusé : une adresse `…/nouveau` ou `…/modifier` tapée à la main mène à `/compte/lecture-seule`, rien n'est écrit |
| Supprimer une entreprise ou un établissement | oui | **refusé** | refusé |
| `/compte/membres` : inviter, changer un rôle, retirer | oui | lecture seule de la liste | lecture seule de la liste |
| `/compte/abonnement` : changer de formule, portail de paiement | oui | non | non |
| Lien d'accès prestataire : créer, révoquer | oui | oui | non |

En **L**, un lecteur d'écran (VoiceOver : Cmd + F5) sur une question Oui /
Non du DUERP doit annoncer le bouton « indisponible ».

### 4. Changer de compte

En **D** : la gélule propose A et B. Passer de A à B : les établissements
affichés sont B1 et B2, plus rien de A. Revenir à A. Puis, **avec deux
onglets** ouverts (un sur A1, l'autre après passage sur B) : recharger le
premier — il suit le compte choisi, ou renvoie à l'accueil, sans mélanger
une page de A et des données de B.

En **X** (un seul compte) : la gélule ne propose aucun choix.

### 5. Retirer un membre

**R** ouvre A1 dans un onglet et y laisse un formulaire ouvert. **P** le
retire depuis `/compte/membres`. Puis **R** :
- clique un lien dans l'onglet resté ouvert → plus aucune donnée de A
  (renvoyé à l'onboarding ou à l'accueil) ;
- envoie le formulaire resté ouvert → refusé, rien n'est écrit (le
  vérifier en **P**) ;
- tape une adresse de A1 relevée avant → 404.

Même chose en rétrogradant **M** en lecture seule : dès la page suivante,
ses boutons disparaissent.

### 6. Invitations

- **P** invite une nouvelle adresse en « membre » : l'e-mail arrive, le lien
  ouvre l'invitation, l'acceptation donne accès à A et à rien d'autre.
- Le même lien ouvert connecté avec **une autre adresse** (X) → 404, pas
  d'acceptation possible.
- **M** et **L** n'ont pas de bouton d'invitation ; l'action tentée est
  refusée.
- Une invitation annulée ou expirée → le lien ne mène plus nulle part.

### 7. Accès sans session

- **Lien prestataire** de A1 (`/acces/[jeton]`), ouvert dans une fenêtre
  privée : il montre A1 seulement — ni A2 (même compte, autre
  établissement), ni B. Révoqué par P : il ne s'ouvre plus.
- **`/verifier/[signature]`** d'une signature de A : la vérification
  s'affiche ; un identifiant inventé → introuvable.
- **`/signe/[signature]`** : ne s'ouvre que pour la personne invitée à
  signer.
- ~~**Connecteur MCP** (`/etablissements/[A1]/connecter`) : branché depuis
  A1, il ne lit que A1.~~ [2026-11-21, ADR-062 : le connecteur s'ouvre en
  OAuth par compte, réservé au Pro. Recette : branché depuis le compte de A
  (Pro), il lit A1 et A2, jamais B ; hors Pro, chaque outil le dit et rien
  n'est lu. ~~Variables `MCP_CLE` et `MCP_ETABLISSEMENT_ID` à retirer de
  l'application Clever Cloud~~ [2026-11-21, relevé par la propriétaire :
  elles n'y ont jamais été posées, rien à retirer] — la route à clé n'existe
  plus.]

### 8. Après la recette

- `scripts/sante-base.sql`, section « D bis » (clés croisées entre
  comptes) : 0 partout.
- Supprimer les comptes et les adresses de test.
- Noter ici la date, le commit déployé et le résultat (ou les écarts).

## Comptes de test sur la préprod (2026-11-12, PR #300)

Sans pilote d'e-mail ni offre lancée, les testeurs n'entrent pas par
l'inscription : `scripts/comptes-test.ts` crée la personne, adresse confirmée,
mot de passe tiré de `COMPTE_TEST_MOT_DE_PASSE` (jamais dans le dépôt, qui est
public). Adresses `@rojer.invalid` seulement, pour que les gardes de la charge
et de la recette restent ouvertes. Sur l'instance :

    clever ssh --app app_9bbac77c-af66-4562-81a7-0257a21401ad
    # sur l'instance : charger l'environnement, `pnpm` n'est pas dans le PATH
    set -a; . ~/applicationrc; set +a; cd ~/app_9bbac77c-af66-4562-81a7-0257a21401ad
    L="sh scripts/demarrer-cc.sh lancer node_modules/.bin/tsx --import ./scripts/server-only-hors-next.mjs scripts/comptes-test.ts"
    COMPTE_TEST_MOT_DE_PASSE=… $L --email testeur@rojer.invalid --ecrire               # compte vide → onboarding
    COMPTE_TEST_MOT_DE_PASSE=… $L --email julien@rojer.invalid --situations --ecrire   # les 5 fiches du préventeur

Sans `--ecrire`, à blanc. `--annuler` retire les fiches. Relancer remet le mot
de passe. ~~Ne marche pas sans e-mail : inviter un membre, lien prestataire,
signature à distance, mot de passe oublié.~~ [2026-11-18 : Mailpace est
branché sur la préprod depuis le 2026-11-14 (`EMAIL_DRIVER=mailpace`,
expéditeur `no-reply@rojer.fr`) ; ces chemins se testent, avec une vraie
adresse — une `@rojer.invalid` ne reçoit rien. Recette ci-dessous.]

[2026-11-12 : la commande `pnpm comptes-test` écrite ici d'abord (#301) ne
marche pas sur l'instance — `pnpm` absent du PATH, environnement non chargé
dans `clever ssh`. Relevé en créant les comptes.]

Comptes posés le 2026-11-12 sur la préprod : `testeur@rojer.invalid` (vide),
`julien@rojer.invalid` (5 fiches), `paloma@rojer.invalid` (vérification de
l'ADR-057 : hôtel O + N de 5ᵉ et magasin M témoin, semé par un script
jetable, hors dépôt).

### Recette des envois d'e-mail (à faire tester, 2026-11-18)

Tous les envois passent par le même pilote (`src/lib/email/index.ts`) ; la
recette vérifie que chacun arrive et que son lien mène au bon endroit. Les
destinataires sont de **vraies adresses** (une boîte à soi, une seconde pour
jouer le prestataire ou l'entreprise extérieure).

Pour chaque e-mail : il arrive (pas en indésirables), il vient de
`no-reply@rojer.fr`, son lien ouvre la préprod (pas `localhost`), le code
reçu marche une fois et pas deux.

- **Plan de prévention** : demander la signature à l'entreprise extérieure →
  e-mail avec le lien, code à l'ouverture, signature, puis
  `/verifier/[signature]` l'affiche.
- **Lien prestataire** (dépôt d'un rapport) : e-mail avec le lien et le code ;
  le rapport déposé arrive sur la bonne ligne ; révoqué, le lien ne s'ouvre
  plus.
- **Autre signature à distance** (permis de feu, rapport de vérification) :
  même parcours que
  le plan de prévention.
- **Invitation d'un membre** : e-mail, lien, acceptation (recette § 6).
- **Inscription** : e-mail de confirmation, activation.
- **Mot de passe oublié** : e-mail, lien, nouveau mot de passe accepté.

Noter ici la date et ce qui n'est pas arrivé. La mise en page des e-mails
n'est pas faite (texte brut) : ce n'est pas un défaut de la recette.

### À faire, une fois les tests finis (pas avant : les comptes servent)

- Retirer `scripts/comptes-test.ts`, `scripts/situations-test/` et la commande
  `comptes-test` de `package.json` (décision de la propriétaire, 2026-11-12).
  `src/lib/onboarding/creation.ts` reste : c'est l'écriture de l'onboarding.
- Retirer deux dépendances de développement mortes, relevées le même jour :
  `@testing-library/jest-dom` (aucun matcher, absent de `vitest.setup.ts`) et
  `@vitejs/plugin-react` (absent de `vitest.config.ts`) ; passer
  `@types/qrcode` des `dependencies` aux `devDependencies`.

### Au branchement du nom de domaine définitif sur Clever Cloud — e-mails (2026-11-21)

Constats de l'audit de sécurité du 2026-11-21 (dig sur le DNS public de
`rojer.fr`) :

1. **DMARC absent** sur `rojer.fr` : publier
   `_dmarc.rojer.fr TXT "v=DMARC1; p=none; rua=mailto:<adresse de suivi>"`,
   puis passer à `p=quarantine` après quelques semaines sans rejet légitime.
2. **SPF** actuel : `v=spf1 include:mx.ovh.com -all`. Vérifier dans Mailpace
   s'il faut y ajouter leur `include:` (selon l'expéditeur d'enveloppe).
3. **DKIM** : relever dans Mailpace le sélecteur et l'enregistrement, le
   publier chez OVH, attendre l'état « vérifié » du domaine.
4. **Tableau de bord Mailpace** : durée de conservation des messages au
   minimum (les liens de signature y passent en clair), suivi des clics et
   des ouvertures désactivé.
5. Vérifier que la boîte `no-reply@` existe, ou que les réponses ne
   rebondissent pas mal.
6. Variables à poser : `MAILPACE_API_KEY`, `EMAIL_DRIVER=mailpace`, et la
   clé des codes de signature `SIGNATURE_CODE_SECRET`.

### À faire après la bascule : ce que les conditions générales promettent (2026-11-19)

Relevé par l'inspection juridique et la comparaison aux usages des textes
légaux (branche `lot/textes-legaux`) ; décision de la propriétaire du
2026-11-19 : « on va le faire ».

- **Export complet structuré** de toutes les données d'un compte (JSON ou
  CSV), et une page publique qui liste les données exportables et leurs
  formats — règlement (UE) 2023/2854 « Data Act », art. 25 et 26 ; RGPD,
  art. 28.3 g (restitution). D'ici là, les conditions (art. 17) promettent
  une restitution sans frais **sur demande écrite**, faite à la main.
- **Page des tarifs** : écrire que l'abonnement annuel est payé d'avance et
  n'est pas remboursé en cas de résiliation par le client — Data Act,
  art. 29.4 (à annoncer avant la souscription).
- **Expert de l'offre Pro** : les demandes d'assistance doivent partir vers
  l'expert (ADR-050, « rien ne part » aujourd'hui) avant de vendre Pro ; les
  conditions (art. 8) le promettent.
- **Acceptation au paiement** : enregistrer dans Rojer la version des
  conditions acceptée au clic « S'abonner » (Stripe Checkout coche la case
  sans version) — preuve du contrat, conditions art. 2.
- **Mentions légales** : téléphones de BTRY et de Clever Cloud
  (`components/landing/editeur.ts`) — LCEN, art. 1-1 ; à poser avant toute
  publication sur rojer.fr.

### À faire après l'ouverture (2026-11-26)

Relevés le jour de l'ouverture ; décision de la propriétaire : à faire plus
tard, après le lancement.

- **Témoin des tâches** (`TEMOIN_TACHES_URL`, propriétaire) : créer un témoin
  par battement (healthchecks.io ou équivalent, période 1 jour, grâce 2 h) et
  poser son adresse sur l'application de production. La tâche du jour l'appelle
  une fois finie ; sans lui, une crontab arrêtée (file Stripe, rappels,
  suppressions, synchro de l'agenda) ne se signale nulle part — les alertes de
  Rojer partent de cette même crontab. Le démarrage le rappelle à chaque
  déploiement (`avertissement_environnement`).
- **Doublon de compte au premier onboarding** (Claude) : `compteDOnboarding`
  (`src/lib/auth/membres.ts`) crée un compte, relit le plus ancien de la
  personne et supprime le sien s'il n'est pas retenu. Deux validations dans la
  même milliseconde (deux onglets) donnent le même `createdAt` : rien ne les
  départage, et chaque onglet peut garder le sien — deux comptes vides, sans
  fuite ni facturation. Correction : départager par l'identifiant quand les
  dates sont égales. C'est ce que révèle le test d'intégration « deux premiers
  onboardings simultanés… » (`creer-compte.integration.test.ts`), en échec trois
  fois le 2026-11-26 sur la CI de `main` — un vrai défaut, pas un test
  instable.

### Reporté à plus tard, jamais écrit ailleurs (relevé du 2026-11-27)

Ce qui a été dit « plus tard » en séance et ne figurait dans aucun document.
Une partie vient de la liste « Ce qui reste avant la bascule », retirée le
2026-11-27 parce que la production tourne : seuls les points encore ouverts
sont repris ici.

Claude (code, chacun en PR séparée, plan d'abord) :
- **Purge des passages de l'agenda** (2026-11-26, « on verra ça après ») :
  la synchro tourne chaque minute (#389) et garde chaque passage, soit
  1 440 lignes par jour. Garder les passages vides 7 jours, les autres un an.
  Le patch est prêt, tests verts en local, hors dépôt :
  `~/.config/rojer/patchs/agenda-purge-passages-vides-2026-11-26.patch`
  (ADR-064, `agenda-preventeur/base.ts`).
- **Plafond d'établissements atteint, onboarding quand même ouvert**
  (2026-11-26, « c'est mal fait, faudra corriger plus tard ») : avec
  l'essai ou Essentiel (1 établissement), « Ajouter un établissement » mène
  au parcours. La fenêtre d'accueil (`AccueilParcours`, `WizardShell.tsx`)
  recouvre le bandeau du plafond (`motifDuPlafond`,
  `app/onboarding/page.tsx`). Vérifier d'abord où le refus tombe ; piste :
  dire le plafond dès le bouton et ne pas ouvrir le parcours.
- **Faire taire l'erreur de build Better Auth « could not seed resources »**
  (sans effet, relevée le 2026-11-26).
- **Tables `Intervention` et `CommentaireIntervention`** (ADR-018, sans
  code) : migration de suppression.
- **`build-cc` obligatoire sur `main`** : la condition `if:` du job couvre
  déjà `main`, mais la protection de `main` n'exige encore que `vitest` et
  `derive` (relevé le 2026-11-27).
- **Trier les alertes Dependabot** (104 ouvertes au 2026-11-10) : mettre à
  jour ce qui est exploitable en production, écrire le motif pour le reste.
- **Vérification ASVS V6/V7 sur Better Auth**, arrêtée le 2026-11-11 pour
  économiser (`docs/verification-asvs-L2-2026-10.md` décrit encore Supabase
  Auth). À y écrire : l'écart V11.4.2 (scrypt de Better Auth, N=2^14, gardé
  par décision : pas de hachage fait main) et V6.3.3 (double
  authentification proposée, non imposée : décision produit, la proposer ou
  l'imposer aux propriétaires).
- En queue de liste (décisions du 2026-11-17 et du 2026-11-23) : alerter
  sur une rafale de signatures refusées au webhook Stripe ; 25 Mo admis par
  toutes les actions serveur (déposer les fichiers par URL pré-signée, puis
  abaisser `bodySizeLimit`) ; une ligne de journal par appel du connecteur
  MCP ; limite de débit MCP par adresse IP (ne compter que les refus,
  limiter par personne et par compte ; même défaut au guichet des jetons).

Propriétaire :
- **Double authentification de `contact@btry.fr`** (Google Workspace,
  administratrice des règles depuis le 2026-11-26) : ses validations
  arrivent sur le téléphone d'un collègue.
- **Utilisateur de base en lecture seule** sur l'add-on de production, pour
  lire la prod sans pouvoir écrire (accord requis) ; et ne plus laisser
  `scripts/` (hors `demarrer-cc.sh`) ni `.claude/` sur l'instance.
- **À confirmer, sinon à faire** : questions au support Clever Cloud
  (chiffrement au repos, restauration à un instant donné, conservation des
  sauvegardes) ; organisation Clever Cloud propre à Rojer ; date de départ
  des douze mois pour les comptes créés avant l'offre (ADR-058).

## Règles de travail qui valent ici

- Ce fichier est **le même sur `main` et sur `cc`** : le modifier sur `main`
  puis le reporter, pour que les sessions des deux branches lisent la même
  passation (2026-11-03 : il n'était à jour que sur `cc`).
- Previews Vercel : `vercel.json` les coupe par préfixe de branche
  (`git.deploymentEnabled`). `report/*` et `docs/*` y manquaient jusqu'au
  2026-11-03, et neuf previews ont été construites ce jour-là, dont plusieurs
  du code de `cc`. Un préfixe de branche neuf s'y ajoute. Vérifier dans le
  tableau de bord Vercel que l'environnement « Preview » ne porte aucune
  variable de la base de production.

- Fusion : revue de code, simplification et sécurité faites et corrigées,
  **puis** CI verte. Jamais avant.
- Prouver une garantie en la cassant (mutation) avant de la dire tenue.
- Tests locaux ciblés ; la suite complète tourne en CI.
- Arrêtée par une limite d'usage, une session s'arrête et ne reprend pas
  d'elle-même : la propriétaire relance.

## Local

- Pile `cc` : `docker-compose.cc.yml`, `.env.cc-local.example`,
  `scripts/demarrer-cc.sh`.
- Tests d'intégration : `ISOLATION_INTEGRATION_URL` vers une base **locale**
  migrée, qu'ils vident (voir `.github/workflows/integration.yml`).
- Un `vitest` qui se fige en worktree : `perl -e 'alarm 300; exec @ARGV' pnpm exec vitest run … < /dev/null`, et rejouer (sortie 142).
