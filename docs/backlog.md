# Backlog — chantiers identifiés hors PLAN.md

`spec/PLAN.md` décrit la construction de la V2, dont les étapes 0 à 11 sont
livrées. Ce fichier recueille ce qui est apparu **après**, au fil du travail :
des chantiers admis mais pas encore instruits. Un chantier qui engage
l'architecture sort d'ici sous forme d'ADR avant d'être codé.

---

## Système d'alerte — à concevoir dans son ensemble

**État** : rien de livré. Seuls les e-mails transactionnels existent (OTP,
liens d'accès). `spec/PLAN.md` classe encore les notifications en « hors
roadmap V2 » : cette ligne est périmée.

Le sujet ne se traite pas alerte par alerte. Il y a aujourd'hui au moins
quatre sources d'échéance qui voudront chacune prévenir quelqu'un — les
occurrences de vérification, les actions du plan, les attestations de
prestataires qui expirent, la mise à jour annuelle du DUERP — et autant de
façons de se répéter, de doublonner ou de sonner dans le vide. Il faut donc
d'abord trancher le modèle commun : qui est prévenu, à quel horizon, à quelle
fréquence, comment on regroupe plusieurs échéances dans un seul envoi, et
comment on se tait quand il n'y a rien à dire. Un ADR est attendu.

Deux briques sont déjà identifiées.

### 1. Le lien prestataire — obtenir le rapport sans lui demander un compte

Le prestataire (vérificateur d'extincteurs, ascensoriste, bureau de contrôle)
reçoit un lien qui le mène droit au dépôt de son rapport, rattaché à
l'occurrence qu'il solde. Pas de compte, pas d'application à installer, rien
à apprendre. L'infrastructure existe déjà : `AccessToken` avec scopes
(ADR-007), lien magique + OTP.

Le point de vigilance est le dimensionnement de la relation. Chez un
donneur d'ordre à 400 sites, le prestataire est sous contrat et travaille
dans l'outil de son client ; chez un restaurant de 8 salariés, il passe une
fois par an et n'a aucune raison d'y entrer. Le lien doit donc rester
utilisable **sans adhésion préalable** du prestataire, et ne jamais devenir
un préalable à la tenue du dossier : si le prestataire ne s'en sert pas, le
dirigeant doit pouvoir déposer le rapport lui-même sans que rien ne bloque.

### 2. La relance du dirigeant — le rappel avant l'échéance

C'est **le dirigeant** qu'on prévient, pas le prestataire : c'est lui qui doit
décrocher son téléphone, et c'est lui notre utilisateur. Le rappel doit lui
donner de quoi agir sans ouvrir l'application — ce qui arrive à échéance, à
quelle date, et qui l'a fait la fois précédente.

~~⚠️ La landing annonce déjà cette promesse : « Un e-mail vous prévient avant la
date » (`src/components/landing/Etapes.tsx`, étape 3). C'est aujourd'hui la
seule promesse de la page qui ne soit pas livrée. À construire avant la mise
en ligne publique, ou à retirer de la page en attendant.~~ **Retirée le
2026-09-26** (journal C38) : l'étape 3 dit « Rojer n'envoie pas de rappel par
e-mail : c'est en l'ouvrant que vous le voyez », et la garde
`sans-qualification.test.ts` (famille « rappel promis ») refuse qu'une page
le promette de nouveau. Le rappel reste à construire ; seules les signatures
envoient un e-mail aujourd'hui (`access-tokens/mail.ts`).

---

## Navigation — qualifier les modules au lieu de les afficher à plat

**État : livré** (commit « Qualifier les registres de la sidebar au lieu de les
aligner à plat »). Conservé ici pour la trace du raisonnement et pour les
questions restées ouvertes en bas de section.

`construireSections()` (`src/components/layout/sidebar-nav.ts`) ne recevait que
l'`etablissementId` et des compteurs : les six registres s'affichaient à tout
le monde, à poids égal, quelle que soit l'activité.

Le reste du produit tenait déjà la bonne doctrine.
`src/lib/dashboard/obligations.ts` la documente pour la matrice du board : la
ligne accessibilité n'apparaît que si l'établissement est ERP, les lignes
permis de feu / plans de prévention / prestataires sont événementielles (« un
commerce sans travaux par point chaud ne doit pas voir une ligne trouée »), le
carnet sanitaire suit la création du carnet. `accessibilite/page.tsx` va
jusqu'à répondre « Non applicable — cet établissement n'est pas un ERP ».
**Seule la navigation ignorait tout de l'établissement, et c'est le premier
écran.** Au lendemain de l'onboarding, 3 à 4 des 6 portes ouvraient sur une
pièce vide — l'impression exacte que notre positionnement refuse.

### Ce qui a été retenu : ne pas filtrer, qualifier

Masquer un registre est le mauvais remède : la divulgation progressive avait
déjà été retirée pour cette raison (« un registre caché se cherchait »).
L'entrée reste donc **toujours visible et toujours cliquable**, mais porte son
état — `actif`, `non-ouvert` (étiquette « au besoin »), `non-applicable`. Ce
qui concerne l'établissement remonte en tête, le reste suit.

Le signal vient de `getEtatModules()` (`src/lib/etablissements/modules.ts`),
volontairement pauvre — trois comptages, pas de jointure : il tourne dans le
layout, donc sur chaque page. `getModulesMatrice` reste la source riche du
tableau de bord ; les deux partagent les règles d'applicabilité, pas les
requêtes.

### Reste à faire : activer un module a posteriori

L'utilisateur doit pouvoir ouvrir un module quand le besoin arrive — le
carnet sanitaire le jour où il installe un ECS collectif, les plans de
prévention à la première entreprise extérieure. L'entrée qualifiée « au
besoin » est le point d'entrée naturel de cette activation, mais le geste
lui-même n'est pas construit. À articuler avec la restitution d'onboarding
ci-dessous, qui fait la première passe.

### Question tranchée — « Préparer un contrôle » (ADR-015)

**Résolue** : l'écran reste dans « À faire », dans le sens de la
contre-proposition ci-dessous. Se tenir prêt est un entretien continu, pas un
événement subi. Conservé ici pour la trace du raisonnement.

Proposition initiale : le sortir de « À faire » (rythme hebdomadaire) pour le
mettre en bas de « Mes registres », dont il est l'export groupé.

Contre-proposition à instruire : se tenir prêt n'est pas un événement subi
mais un **entretien continu** — les écarts à lever pour être en règle sont des
actions datées, qui ont donc leur place dans le calendrier et le plan
d'actions, au même titre qu'une vérification périodique. Si on suit cette
piste, « Préparer un contrôle » reste dans « À faire » et devient la vue de
préparation d'un état entretenu toute l'année, plutôt qu'un bouton d'export
déclenché par la visite annoncée. Le vrai travail serait alors côté calendrier
et plan d'actions, pas côté navigation.

### Retouches mineures identifiées, non appliquées

- « Équipe — bientôt » : entrée inerte en permanence, pour une fonctionnalité
  hors périmètre, sur le terrain où le concurrent est fort. À reprendre avec
  l'onboarding (cf. ci-dessous) plutôt qu'à retirer sèchement.
- « Connecter » occupe une entrée de premier niveau du rail : à reconsidérer
  (place plus naturelle sous « Compte »). ⚠️ Chantier en cours par ailleurs —
  ne pas y toucher sans se coordonner.

---

## Onboarding — la restitution finale

**À instruire plus tard**, mais le besoin est identifié par le chantier
navigation ci-dessus.

Aujourd'hui l'onboarding se termine sur la génération du calendrier. Il lui
manque un **écran de restitution** : à la fin des questions, l'outil récapitule
ce qu'il a compris et ce qui en découle — « vous êtes un restaurant ERP de 5ᵉ
catégorie, 8 salariés : voici les registres qui vous concernent, voici ceux qui
ne vous concernent pas, voici ceux qui s'ouvriront le jour où… ».

C'est le moment le plus fort pour démontrer la promesse (« rien à paramétrer,
tout est déjà écrit ») : l'utilisateur voit l'outil conclure à sa place, une
fois, sur son cas. C'est aussi là que se règle proprement l'état initial des
modules de la sidebar.

Deux questions à y intégrer :

- **L'équipe** — demander qui travaille dans l'établissement pendant
  l'onboarding, plutôt que d'afficher une entrée « bientôt » vide dans la
  sidebar. À cadrer : ce qu'on en fait exactement (unités de travail du DUERP,
  effectif, futur multi-utilisateurs) reste à décider.
- **Les modules événementiels** — poser la question une fois (réseau d'eau
  chaude collectif ? entreprises extérieures qui interviennent ?) plutôt que
  de laisser six portes ouvertes sur du vide.
