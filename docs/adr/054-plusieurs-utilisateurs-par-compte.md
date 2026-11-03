# ADR-054 — Plusieurs personnes travaillent sur le même compte

- **Statut** : **acceptée**, 2026-11-03 (« on peut faire ça », propriétaire,
  après la correction du § 10). ~~Proposée~~ le même jour. Questions Q1 à Q3
  tranchées comme recommandé.
- **Origine** : demande de la session de coordination (2026-11-03). Deemply
  vend des utilisateurs illimités avec droits dès 490 € HT par an. Rojer n'a
  qu'un utilisateur par compte.
- **Amende** l'ADR-051 (la racine de l'isolation passe de l'utilisateur au
  compte), l'ADR-053 (l'abonnement est porté par le compte, plus par
  l'utilisateur) et l'ADR-028 (un utilisateur peut suivre plusieurs comptes).
  **S'appuie sur** l'ADR-052 (Better Auth). Ne touche ni l'ADR-007 (accès des
  prestataires par lien), ni l'accès MCP par clé.
- **Branche** : `cc`. ~~Le code vient après la bascule (§ 10).~~ [2026-11-03 : le code commence tout de suite ; la fusion dans `cc` se fait dès que les lots sont prêts, § 10.]
- **Sort du hors-périmètre** du CLAUDE.md la ligne « Multi-utilisateurs
  internes par entreprise » (rayée le 2026-11-03).

## Contexte

Aujourd'hui, « le compte » et « l'utilisateur » sont la même chose. Toute
l'isolation remonte à `Entreprise.userId` (ADR-051) : le client borné reçoit
`{ type: "compte", userId }`, et environ 75 lignes de code, hors tests, répètent
`entreprise: { userId }`. L'abonnement suit la même règle
(`Abonnement.userId`, ADR-053 § 1).

Le besoin : le dirigeant invite son responsable, son associé ou son
assistante. Ces personnes travaillent sur les mêmes dossiers, avec des droits
simples. Les prestataires gardent leur accès sans compte (ADR-007) : ce ne
sont pas des membres.

Better Auth propose un plugin `organization` (version 1.7.14, lu dans la doc
et dans le code du paquet le 2026-11-03). Il fournit les organisations, les
membres, les invitations, les rôles, une organisation active par session, des
crochets `before`/`after` et une limite de membres sous forme de fonction.
Tout est appelable par `auth.api.*`, sans route HTTP : c'est déjà ainsi que
`cc` utilise Better Auth.

## Décision

### 1. Le compte devient une table, celle du plugin

On utilise le plugin `organization`, sans écrire de modèle à nous. Les tables
sont renommées par `modelName`, comme `AuthVerification` (ADR-052 § 2) :

| Plugin | Rojer | Contenu |
|---|---|---|
| `organization` | `Compte` | nom, date de création |
| `member` | `Membre` | `compteId`, `userId`, `role`, date ; unique `[compteId, userId]` |
| `invitation` | `InvitationCompte` | e-mail, rôle, statut, expiration, auteur |
| `session.activeOrganizationId` | `Session.compteActifId` | le compte choisi |

Équipes, rôles dynamiques et contrôle d'accès en base : **non activés**.

**La racine de l'isolation devient `compteId`** :
- `Entreprise.userId` → `Entreprise.compteId` (unique `[compteId, siren]`) ;
- `Abonnement.userId` → `Abonnement.compteId` (unique) ;
- `DemandeAssistance` prend `compteId` comme racine et garde `userId` comme
  auteur.

Les autres colonnes `userId` restent des **auteurs** : `Signature.userId`,
`AccessToken.createdByUserId`. Elles désignent la personne qui a agi, pas le
compte.

### 2. Les rôles : trois, et pas de droits par établissement

| Rôle | Peut |
|---|---|
| **Propriétaire** | tout, plus : inviter, retirer, changer un rôle, l'abonnement (Checkout et portail Stripe), et plus tard la suppression du compte |
| **Membre** | tout le travail sur tous les établissements du compte : saisir, déposer, signer, valider un DUERP, ajouter un établissement |
| **Lecture seule** | lire et exporter (DUERP, registre, dossier de contrôle) ; aucune écriture |

- Le compte a **au moins un propriétaire**. Il peut en avoir plusieurs, par
  exemple deux associés. Le dernier propriétaire ne peut ni partir ni être
  retiré : le plugin le refuse déjà au départ
  (`YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER`), et notre crochet
  `beforeRemoveMember` le refuse aussi au retrait et au changement de rôle.
- Céder le compte, c'est nommer un autre propriétaire, puis partir.
- **Pas de rôle « admin »** du plugin, et pas de droits fins.
- **Pas de restriction à certains établissements** : un membre voit tous les
  établissements du compte. L'ADR-051 a retiré la portée « établissement »
  parce que `include` et `select` ne se bornent pas. La réintroduire demande
  de borner chaque lecture imbriquée. La cible a presque toujours un seul
  site. À rouvrir si un client multi-site le demande (question Q2).

### 3. L'identité dans l'application : l'appartenance relue à chaque requête

`requireCompte()` reste le seul point d'entrée. Il rend
`{ user, compte, role, db }` :

1. la session, comme aujourd'hui (`requireUser`) ;
2. le compte choisi : `Session.compteActifId`, ou le seul compte de
   l'utilisateur s'il n'en a qu'un ;
3. **la ligne `Membre (compteId, userId)` relue en base, à chaque appel**. Sans
   cette ligne, on renvoie vers le choix du compte, ou vers « Vous n'avez accès
   à aucun compte ». On ne crée jamais un accès à partir de `compteActifId`
   seul.

Le point 3 est la condition du retrait immédiat. Le plugin ne remet à zéro
l'organisation active que dans la session de **la personne qui fait le
retrait**, et seulement si elle se retire elle-même (`crud-members.mjs`,
1.7.14). Les sessions d'un membre retiré gardent donc son `compteActifId`.
Le coût est une requête indexée par appel, sur la clé unique.

La portée du client borné devient
`{ type: "compte", compteId, userId, role }` :
- la borne se pose sur `compteId`, avec la même mécanique que l'ADR-051 ;
- une relation vers `User` (les auteurs) ne peut désigner que
  `portee.userId`, la personne qui agit. C'est la règle actuelle, inchangée ;
- `Compte`, `Membre` et `InvitationCompte` sont **hors compte** : ils sont lus
  et écrits par l'adaptateur de Better Auth et par un seul module nommé,
  `src/lib/auth/membres.ts`, qui ajoute la relecture du point 3 et la liste
  des membres pour l'écran. La garde d'import de `portee/imports.test.ts` les
  liste.

### 4. La lecture seule se ferme dans le client, pas dans chaque action

Quand la portée vaut `role: "lecture"`, **le client borné refuse toute
écriture** : `create`, `update`, `upsert`, `delete`, les opérations `*Many` et
le SQL brut d'écriture. Il échoue fermé, au même endroit que la borne. Une
action oubliée ne peut donc pas écrire.

- Les actions appellent `requireCompte({ ecrire: true })`. Pour un rôle
  lecture seule, la réponse est un refus lisible (« Votre accès est en
  lecture seule »), avant toute requête. Le client reste le filet de
  sécurité.
- Les écrans masquent les boutons de saisie. C'est de l'ergonomie, pas une
  protection.
- **Une exception, nommée** : la régénération du calendrier pendant le rendu
  (`regenererSansInvalider`, `calendrier/actions.ts`). Elle ne traduit aucune
  saisie : elle recalcule ce que les faits rendent dû, et elle s'exécute à
  l'ouverture d'un dossier. Elle reçoit un client borné au **même compte**,
  sans le verrou de lecture seule. Ce client est construit dans ce seul
  module, et un test vérifie qu'aucun autre module ne l'appelle.

### 5. L'invitation par e-mail

- Seul un propriétaire invite. Il saisit une adresse et un rôle.
- `auth.api.createInvitation`, puis `sendInvitationEmail` → `sendMail`
  (Mailpace). L'envoi n'est pas attendu et son échec est journalisé, comme
  les autres e-mails de compte (ADR-052 § 5).
- Le lien est valable **7 jours** (`invitationExpiresIn`). Le défaut du
  plugin est de 48 heures, trop court pour une TPE. Une nouvelle invitation à
  la même adresse annule la précédente (`cancelPendingInvitationsOnReInvite`).
  Le propriétaire voit les invitations en attente et peut les annuler.
- Le lien mène à `/invitation/[id]` :
  - déjà connecté avec la même adresse → accepter ou refuser ;
  - pas de compte Rojer → inscription avec l'adresse remplie et verrouillée.
    La vérification de l'adresse reste obligatoire (ADR-052 § 4) ;
  - connecté avec une autre adresse → refus. Le plugin compare l'adresse de
    la session à celle de l'invitation.
- `requireEmailVerificationOnInvitation: true`, posé explicitement.
- **Quelqu'un qui s'inscrit par une invitation n'a pas de compte à lui.** Un
  `Compte` ne naît qu'à l'onboarding d'un premier établissement, par une
  personne qui n'appartient encore à aucun compte, ou qui choisit « Créer un
  autre compte ». `allowUserToCreateOrganization` vaut `false` : le plugin
  refuse alors toute création portée par une session. L'onboarding crée le
  compte par un appel serveur sans en-têtes, avec le `userId` fourni (le
  plugin appelle cela une « action système », `crud-org.mjs`). Le `slug`,
  que le plugin exige unique, est un identifiant tiré au hasard, jamais
  affiché.
- La réponse au propriétaire est la même, que l'adresse ait déjà un compte
  Rojer ou non : l'écran ne permet pas de savoir qui est inscrit.

### 6. Retirer un membre, changer un rôle, partir

- **Retrait** (par un propriétaire) : la ligne `Membre` est supprimée. Dès la
  requête suivante, `requireCompte` ne trouve plus d'appartenance : chaque
  page, action et route du compte répond comme pour un compte étranger (404,
  ou renvoi vers le choix du compte). Un crochet `afterRemoveMember` remet
  aussi à zéro le `compteActifId` de ses sessions. C'est du ménage : la
  sécurité ne repose pas dessus.
- **Ce qui reste au compte** : tout ce que la personne a saisi. Les données
  appartiennent au compte, pas à leur auteur. Ses signatures restent des
  preuves : `Signature.userId` garde l'auteur, et le compte `User` n'est pas
  supprimé.
- **Ce qui ne bouge pas** : les liens prestataires que la personne a créés
  (ADR-007). Ils appartiennent à l'établissement, et chacun exige le code
  envoyé à l'adresse du prestataire. La clé MCP est une variable
  d'environnement de l'opérateur : aucun membre ne la détient.
- **Changer un rôle** (propriétaire) : l'effet est immédiat, puisque le rôle
  est relu à chaque requête.
- **Partir** (`leaveOrganization`) : mêmes effets qu'un retrait.
- **Limite écrite** : une requête qui a déjà passé `requireCompte` au moment
  du retrait va jusqu'à son terme.

### 7. Plusieurs comptes pour une personne

Une personne peut appartenir à plusieurs comptes : une assistante qui sert
deux structures, ou un préventeur qui suit plusieurs clients. Le compte actif
est `Session.compteActifId`. La gélule ne propose de choisir un compte que si
la personne en a plusieurs. Le sélecteur d'établissement (ADR-028) liste les
établissements du compte actif. Le cookie `etablissement-actif` reste
revalidé par la borne : un établissement d'un autre compte ne sort pas.

### 8. L'abonnement et le nombre d'utilisateurs

Accord avec les sessions « stripe » et « pricing », 2026-11-03.

- `Abonnement.compteId`. **Seul un propriétaire** ouvre Checkout et le
  portail Stripe. Un membre voit l'état de l'abonnement, sans le changer.
  `droitsDuCompte` lit l'abonnement du compte : seule sa clé change.
- Le compte se déduit du client Stripe relu par une seule fonction,
  `compteDuClientStripe` (`stripe/synchronisation.ts`, PR #156). Elle lira
  `metadata.compteId`. Pour les clients créés avant ce chantier, elle se
  rabat sur `metadata.userId`, converti en « le compte dont cette personne
  est propriétaire ». Le parcours de paiement (lot 4 des abonnements) écrira
  `compteId` dès que la table `Compte` existe.
- **Nombre d'utilisateurs par formule** (brouillon de la session « pricing »,
  pas encore arrêté) : Essentiel 1 (le propriétaire seul), Pro 5, Sur mesure
  sans limite. Tous les membres comptent, propriétaire et lecture seule
  compris, **et les invitations en attente aussi**. Sinon, dix invitations
  envoyées à la fois dépasseraient le plafond une fois acceptées. Les
  prestataires invités par lien ne comptent pas. La limite se pose par
  `membershipLimit` (une fonction qui lit la formule), et elle est vérifiée
  aussi à la création d'une invitation (`beforeCreateInvitation`).
- **Les chiffres ne s'écrivent pas dans le code.** La gamme n'est pas arrêtée
  par la propriétaire. Le plafond se lit depuis la formule de l'abonnement,
  au même endroit que ses autres droits (`droitsDuCompte`). Changer 1 ou 5 ne
  touche ni la logique de membres ni ses tests.
- **Passage à une formule inférieure** : aucun membre n'est retiré
  automatiquement. Seules les nouvelles invitations sont bloquées, et tout ce
  qui existe reste lisible. C'est la règle des autres quotas de la gamme.
- Sans abonnement configuré (pas de clé Stripe), la limite ne s'applique pas,
  comme aujourd'hui pour les autres droits.

### 9. Isolation, RLS et gardes

- **Le mécanisme de l'ADR-051 ne change pas**, seule sa racine change. Dans
  `portee/correspondance.ts`, trois racines passent de `userId` à
  `compteId`. Les quelque 75 prédicats `entreprise: { userId }` (relevé du 2026-11-03, hors tests) deviennent
  `entreprise: { compteId }`. Les gardes `tenancy-lectures`, `-ecritures`,
  `-enfants`, `-oracle` et `-routes` cherchent la nouvelle racine.
- **RLS** : sur `cc`, elle est activée **sans aucune politique** sur toutes
  les tables (aucun `CREATE POLICY` dans les migrations). Elle ferme la base à
  tout rôle autre que le propriétaire. Il n'y a donc **aucune politique à
  réécrire**. Les trois tables nouvelles l'activent dans leur migration, et
  `migrations-rls` le vérifie.
- **Preuve par la casse**, à rejouer avant la fusion :
  - la matrice des 75 routes, avec un compte A à **deux membres** (un membre,
    un lecture seule) et un compte B. Tout membre de A reçoit 404 sur tout ce
    qui est à B, et la réponse est la même pour « à un autre compte » et
    « inexistant » ;
  - un membre retiré, puis la même route rejouée : refus, sans
    déconnexion ;
  - un rôle lecture seule sur chaque action d'écriture : refus, et rien
    d'écrit en base ;
  - des mutations, chacune doit faire tomber un test : retirer la relecture
    de `Membre` ; faire confiance à `compteActifId` seul ; retirer le verrou
    de lecture seule ; ouvrir l'exception du calendrier à un autre module ;
    accepter une invitation avec une autre adresse ; retirer le dernier
    propriétaire.
- Les gardes transversales se lancent à la main. `--changed` ne les
  déclenche pas (règle 12).

### 10. Quand coder : tout de suite, et fusionner dès que c'est prêt

~~**Recommandé : valider l'ADR maintenant, coder après la bascule.**~~
[2026-11-03 : recommandation retirée, sur une question de la propriétaire
(« pourquoi attendre la bascule ? »). Ses deux arguments ne tenaient pas :
personne n'utilise `cc`, et la vérification de l'isolation est à rejouer de
toute façon pour ce chantier.]

- **Le code commence maintenant**, sur des branches parties de `cc`.
- **Chaque lot se fusionne dans `cc` dès qu'il est prêt** : revues faites et
  corrigées, CI verte. La vérification complète de l'isolation (§ 9) se
  rejoue une fois, avant la bascule si le chantier est fini avant elle.
- **Le chantier ne retarde pas la bascule.** Si la bascule est prête avant les
  lots, elle part sans eux, et la migration reprend les données existantes.
- **La migration du lot 1 vaut dans les deux cas.** Sur une base vide, elle
  ne reprend rien. Sur une base peuplée, elle crée un `Compte` et un `Membre`
  propriétaire pour chaque utilisateur qui a une entreprise, un abonnement ou
  une demande d'assistance, puis remplit `compteId`. Chaque utilisateur a
  exactement un compte aujourd'hui, donc la reprise est mécanique. Les
  colonnes `userId` devenues inutiles se retirent dans un second déploiement
  (même règle que pour `Entreprise.siret`, ADR-028).
- Le webhook Stripe déduit déjà le compte en un seul endroit (§ 8).

## Lots

1. **Schéma** : plugin `organization` (`modelName`), `Compte`, `Membre`,
   `InvitationCompte`, `Session.compteActifId` ; `compteId` sur `Entreprise`,
   `Abonnement` et `DemandeAssistance` ; RLS ; reprise des données ;
   correspondance.
2. **Portée** : `requireCompte` relit `Membre` ; nouvelle portée ;
   prédicats ; gardes ; matrice A/B.
3. **Lecture seule** : verrou dans le client, exception du calendrier,
   `requireCompte({ ecrire: true })`, boutons masqués.
4. **Membres** : écran « Membres » sous Paramètres, invitation, page
   `/invitation/[id]`, retrait, changement de rôle, départ, e-mail, limite
   par formule.
5. **Recette** : § 9, revue de code, simplification et revue de sécurité,
   CI verte.

## Ce que la réalisation a précisé (lot 1, 2026-11-03, PR #159)

Les lots 1 et 2 ne font qu'un : renommer la racine casse toutes les
requêtes qui la lisent, ils ne se fusionnent pas l'un sans l'autre.

- **Sans session, personne n'agit.** Les accès par jeton, MCP et webhook
  reçoivent la portée `{ compteId, userId: null }` : une relation vers `User`
  n'y désigne personne. Avant, ils agissaient au nom du propriétaire.
- **`Session.compteActifId` n'a pas de clé étrangère** : un compte disparu
  laisse une valeur que la relecture de `Membre` écarte.
- **Pas de création de compte à l'inscription.** Le compte naît au premier
  onboarding (`requireCompteDOnboarding`), avant la transaction : si elle
  échoue, le parcours suivant le reprend. Une personne sans compte est
  renvoyée à l'onboarding par `requireCompte`, comme un membre retiré, en
  attendant l'écran « Vous n'avez accès à aucun compte » (lot 4).
- **Migration en un seul déploiement**, ancienne racine retirée dans la
  dernière des cinq migrations : `cc` n'a pas servi de production (§ 10).
- **Webhook Stripe** : `compteDuClientStripe` lit `metadata.compteId` ; un
  client d'avant ce lot (`metadata.userId`) se rattache au compte dont la
  personne est l'**unique** propriétaire, sinon rien n'est écrit (alerte).
- **Budget de requêtes : + 1 par page**, mesuré en CI sur les treize pages —
  la relecture de `Membre`, une fois par rendu (`cache()`).
- **Tests.** Les tests de module simulent l'appartenance avec
  `compteId === userId` (`vitest.setup.ts`), pour garder leurs données. Les
  tests sur base réelle, eux, tirent des identifiants distincts pour le compte
  et la personne : `portee/client.integration` (un second membre voit les
  mêmes lignes ; l'identifiant d'une personne pris pour un compte ne voit
  rien), `membres.integration` (compte actif ignoré sans appartenance ;
  membre retiré refusé à l'appel suivant, sa session inchangée ; deux
  mutations font tomber 5 et 1 cas), `creer-compte.integration` (le plugin
  crée `Compte` et `Membre` sous nos noms).
- **Le refus d'une création de compte depuis une session réelle**
  (`allowUserToCreateOrganization: false`) est lu dans le code du plugin, pas
  éprouvé : il faudrait un cookie de session signé.

## Ce que cette décision ne règle pas

- Les droits par établissement et les droits fins (Q2 ; formule « Sur
  mesure »).
- Un journal de qui a fait quoi. Les auteurs déjà enregistrés (signatures,
  liens) restent les seuls.
- La suppression du compte, qui n'existe toujours pas (ADR-053).

## Questions à la propriétaire

- ~~**Q1** — Valider maintenant et coder après la bascule (§ 10) ?
  Recommandé : oui.~~ [2026-11-03 : coder maintenant, fusionner dès que
  c'est prêt, § 10.]
- **Q2** — Pas de restriction par établissement pour l'instant : un
  responsable de site voit tous les sites du compte. Recommandé : oui. La
  cible a presque toujours un seul site, et la restriction coûte le
  bornage de chaque lecture imbriquée. [2026-11-03 : retenu.]
- **Q3** — Le rôle lecture seule dès le premier lot, ou seulement
  propriétaire et membre ? Recommandé : dès le premier lot. Il se ferme en
  un seul point, et il sert aux formules (un associé qui consulte).
  [2026-11-03 : retenu.]

## Sources lues le 2026-11-03

- Better Auth, plugin Organization — https://www.better-auth.com/docs/plugins/organization
  (rôles `owner`, `admin`, `member` ; `membershipLimit` et
  `allowUserToCreateOrganization` en fonctions ; `invitationExpiresIn`
  48 h par défaut ; `organizationHooks` ; `auth.api.*`).
- Paquet `better-auth` 1.7.14, `dist/plugins/organization/` :
  `routes/crud-members.mjs` (la remise à zéro de l'organisation active ne
  touche que la session de celui qui se retire lui-même),
  `routes/crud-invites.mjs` (adresse de la session comparée à celle de
  l'invitation ; vérification de l'adresse), `routes/crud-org.mjs`
  (`allowUserToCreateOrganization` contourné seulement par l'appel serveur
  sans session), `error-codes.mjs` (dernier propriétaire).
