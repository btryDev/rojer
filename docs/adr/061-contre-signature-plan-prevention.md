# ADR-061 — Contre-signature du plan de prévention : proposer, corriger, re-signer

- **Statut** : acceptée, 2026-11-19 (décision de la propriétaire).
- **Portée** : `Signature` (révocation datée), nouveau modèle
  `PropositionModificationPlan`, `src/lib/plan-prevention/`,
  `src/lib/signatures/` (lectures des signatures actives), page
  `/acces/[token]`, fiche du plan, `/verifier/[signatureId]`.
- **Amende** l'ADR-006 (une signature peut être révoquée, jamais effacée) et
  l'ADR-008 (l'empreinte d'une signature révoquée reste vérifiable).
- **Clôt** `docs/chantiers-ouverts.md` § 10, décidé le 2026-09-07.

## Contexte

Le plan de prévention est arrêté « d'un commun accord » par l'entreprise
utilisatrice et l'entreprise extérieure (art. R. 4512-7 CT). Dans Rojer,
l'entreprise extérieure ne peut que signer : si un point ne lui convient pas,
il lui reste le téléphone. Et un plan signé ne se corrige plus du tout
(`verrou-contenu.ts`) : le dirigeant qui découvre une erreur doit en créer un
autre.

Le § 10 de `chantiers-ouverts.md` a décidé le chantier le 2026-09-07, avec
RiskBoard comme référence « à lire, jamais à copier ». Sa session a décrit son
parcours depuis son code le 2026-11-19 ; ce qui suit en garde les garanties et
écarte deux défauts relevés chez lui (essais remis à zéro à chaque renvoi de
code, parties non prévenues quand le plan est remis en brouillon).

Le code en deux temps et l'avis de fin aux signataires sont déjà faits (lot A,
ADR-006 amendée le 2026-11-19).

## Décision

### 1. Une signature peut être révoquée, jamais effacée

`Signature` reçoit `revoqueLe` et `revoqueMotif`. Une signature révoquée garde
tout : nom, adresse, date, IP, navigateur, empreinte. L'unicité d'une partie
par acte ne vaut que pour les signatures actives : `active` vaut `true` ou
NULL (CHECK), et l'unicité porte sur `[objetType, objetId, partie, active]`
— PostgreSQL ne compare pas les NULL. Écrite dans le schéma, à la
différence d'un index partiel (même montage que `PieceEtatPermanent`).

Partout où une signature compte — statut de l'acte, verrou du contenu, fiche,
registre, ZIP de contrôle —, seules les signatures **actives** comptent. Un
test relit le code pour qu'aucune lecture ne l'oublie. `/verifier/[id]`
affiche une signature révoquée comme telle (« révoquée le …, motif »), sans
la cacher.

### 2. Une seule opération : remettre le plan en brouillon

Dans une transaction, sous le verrou de l'objet (`verrouillerObjetSigne`) :
toutes ses signatures actives sont révoquées avec le même motif daté, tous
ses liens en cours sont révoqués (`revoquerLiensEnVol`), et un plan
« valide » repasse « en attente de signatures ». Sans signature active, le
plan redevient modifiable (`compterSignatures`) — c'est le sens de « remettre
en brouillon » ici ; aucun statut nouveau n'est créé.
(`plan-prevention/contre-signature.ts`.)

Tant qu'une proposition attend une décision, le plan ne se signe pas
(`objetEstSignable`), ni par lien ni depuis le compte.

Une signature révoquée se vérifie toujours à `/verifier` : la page la dit
« révoquée », avec sa date et son motif, sans recalculer l'empreinte — la
comparer au plan corrigé rendrait « document modifié », vrai du document,
faux comme accusation. L'écriture est conditionnelle sur le statut : une
signature qui se termine au même instant et la remise en brouillon ne peuvent
pas réussir toutes les deux.

Deux portes y mènent :

- **le dirigeant accepte la proposition de l'entreprise extérieure** (§ 3 et
  4) — [2026-11-19, revue de sécurité, décision de la propriétaire : la
  proposition elle-même ne révoque rien ; proposer ne demande pas de code, et
  un porteur du lien ne doit pas pouvoir faire tomber les signatures des
  autres. Tant qu'elle attend, le plan ne se signe pas, et la page du lien le
  dit (« ce n'est pas une erreur »). Refusée, les signatures restent
  valables.] ;
- **le dirigeant clique « Révoquer les signatures pour corriger »** sur un
  plan signé ou en attente, ni clos ni annulé.

Ensuite, le dirigeant modifie s'il le faut et redemande les signatures :
nouveaux liens, **tout le monde re-signe**.

### 3. La proposition de l'entreprise extérieure

Sur la page du lien, à côté de « Signer » : « Un point ne convient pas ?
Proposer une modification ». La proposition est **structurée**, jamais du
texte libre :

- **sa fiche** : raison sociale, SIRET, nom du chef d'entreprise, effectif qui
  interviendra. **Son adresse e-mail est figée** (le serveur la réimpose) :
  sinon elle détournerait les prochains liens de signature ;
- **les lignes de risques** (`LignePlanPrevention`) : modifier, ajouter,
  supprimer — risque, mesure de l'entreprise utilisatrice, mesure de
  l'entreprise extérieure. Cinquante lignes au plus ; chaque identifiant reçu
  est vérifié comme appartenant à ce plan.

Restent au dirigeant : dates, lieux, nature des travaux, inspection commune,
rubriques de R. 4512-8, fiche de l'entreprise utilisatrice.

Proposer n'est pas un acte engageant : **pas de code demandé**. La trace tient
au lien (qui n'est valable que pour cette entreprise et ce plan), à l'IP, au
navigateur et à l'empreinte de la version visée. Une seule proposition en
attente par plan ; une limite par IP borne les envois.

La proposition est une pièce datée : `PropositionModificationPlan` (plan,
lien d'origine, empreinte de la version visée, contenu proposé, statut
`en_attente` / `acceptee` / `refusee`, qui l'a traitée et quand, IP,
navigateur). ~~Elle remet le plan en brouillon (§ 2).~~ [2026-11-19 : elle
ne révoque rien ; c'est l'acceptation qui remet le plan en correction (§ 2).]

### 4. Ce que fait le dirigeant

Sur la fiche du plan, un bandeau montre ce que la proposition change, ligne
par ligne, et trois choix :

- **Accepter** : la proposition s'applique telle quelle ;
- **Corriger** : elle s'applique, puis le dirigeant modifie le plan ;
- **Refuser** : rien ne change.

Puis « Demander les signatures », comme aujourd'hui.

[2026-11-19, relecture GestBAT : « Accepter » et « Accepter puis modifier »
refusent si le plan a changé depuis la proposition — son empreinte
(`hashVersion`, relevée à l'envoi) est relue sous le verrou ; deux formes
d'empreinte différentes ne se comparent pas. « Refuser » reste possible. Et
la proposition refusée d'office par une clôture ou une annulation prévient
son auteur, comme un refus du dirigeant (§ 5).]

### 5. Personne n'est laissé sans nouvelle

| Événement | Qui reçoit un e-mail |
|---|---|
| Proposition reçue | le dirigeant (adresse de son compte) |
| Proposition acceptée ou refusée | l'entreprise extérieure [2026-11-19 : au refus, l'avis porte un nouveau lien de signature, émis à l'adresse de l'auteur de la proposition par le chemin ordinaire (fréquence, plafonds, essai) ; s'il ne part pas, l'avis dit de demander un nouveau lien] |
| Signatures révoquées (par l'une ou l'autre porte) | chaque signataire dont la signature tombe [2026-11-19 : sauf qui a fait le geste — le dirigeant qui révoque ou accepte] |
| Plan signé par toutes les parties | chaque signataire (lot A, déjà fait) |

### 6. Le plafond de signatures de la formule

Une re-signature après une proposition ou une correction, **par la même
personne** (même adresse, même partie), **ne consomme pas** de signature de
plus dans le plafond annuel (`signaturesParAn` : 20 en
Essentiel, 60 en Pro) : le client ne paie pas deux fois le même plan, et une
correction demandée par l'entreprise extérieure ne le pénalise pas.
(Décision de la propriétaire, 2026-11-19. RiskBoard, relu le même jour, ne
compte rien : pas de précédent.) « Même personne » (relecture du même jour) :
sinon un plan vidé puis réécrit pour une autre entreprise se ferait signer
gratuitement à l'infini. Le fait se lit sur une signature révoquée, ou sur
une proposition faite depuis un lien de cette adresse — jamais sur un texte
de motif (`plan-prevention/resignature.ts`). [2026-11-19, revue de sécurité,
décision de la propriétaire : **3 re-signatures gratuites au plus** par plan
et par signataire ; au-delà, la signature compte.]

**L'écran le dit**, partout où le plafond se lit :
- la jauge des signatures (`JaugeDePlafond`) et la description des formules
  (`formules.ts`, « 20 signatures par an ») : « une re-signature après
  correction ne compte pas » ;
- le bandeau de la proposition et la confirmation de « Révoquer les
  signatures pour corriger » : « Un signataire qui signe de nouveau ce plan
  ne compte pas une seconde fois dans votre formule. »

### 7. Écarté

- **Horodatage chez un tiers (RFC 3161) et PDF scellé stocké** : le précédent
  le fait ; pour la cible de Rojer, c'est disproportionné. L'empreinte envoyée
  à chaque partie (lot A) et la page publique de vérification sortent déjà la
  preuve de l'auto-attestation.
  [2026-11-19 : un **PDF du plan** est rendu à la demande depuis ses données
  (`PlanPreventionDocument`, route `…/plan-prevention/[planId]/pdf`, ZIP de
  contrôle) et **joint au dernier e-mail** (« signé par toutes les
  parties »). Il n'est toujours ni scellé ni horodaté : il imprime, pour
  chaque signature en vigueur, l'empreinte des DONNÉES signées et son
  adresse `/verifier/{id}`, dit qu'il n'est pas l'original scellé, et porte
  « Document de travail — non signé par toutes les parties » tant qu'une
  partie manque.]
- **Commentaire libre, pièces jointes, refus sans proposition** : une
  entreprise qui n'est pas d'accord dit sur quoi, ligne par ligne.
- **Le permis de feu** : il dure le temps d'une intervention et se refait plus
  simplement qu'il ne se corrige. Hors de cet ADR.

## Conséquences

- Une migration : deux colonnes sur `Signature`, l'index unique partiel, une
  table neuve avec sa RLS et sa portée au compte (gardes `migrations-rls`,
  `tenancy-*`).
- Toutes les lectures de signatures filtrent les révoquées : c'est le point
  à ne pas manquer, d'où la garde qui relit le code.
- La page publique `/acces/[token]` reçoit un second formulaire sans code :
  surface exposée, relecture de sécurité obligatoire.
