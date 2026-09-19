# Rapport — contrôle visuel PR #10

Exécuté le **31 août 2026** depuis une seconde machine, sur la branche
`integration/2026-08-28` (`8de0902` au moment du contrôle), base locale restaurée
depuis le dump de la machine principale (`sha256 6169ba50…`, 105 129 octets).

Écrans ouverts dans un navigateur réel (Chromium piloté), pas lus dans le code.
Captures dans `captures-pr10/`.

**Compte utilisé** — à supprimer à la fin du contrôle, il existe sur le projet
Supabase qui sert le produit en ligne : le compte créé par la propriétaire depuis
le dashboard Supabase le 31 août 2026 (« Auto Confirm User »), UUID
(uuid gardé hors du dépôt public). **Aucun compte n'a été créé pendant la
fenêtre où « Confirm email » était désactivé** : le point 3 de
`reglage-temporaire-confirm-email.md` est sans objet. Si un compte apparaît sur
ce créneau, il n'est pas celui du contrôle.

`Entreprise.userId` du dossier « Le Bistrot du Marché » a été repointé sur cet
UUID (`UPDATE 1`). Le second dossier, `e9492ba5-…`, est resté intact et ignoré.

---

## Tableau de synthèse

| # | Point | Verdict |
|---|---|---|
| 1 | Filtre par bâtiment sous « en retard seulement » | **conforme** |
| 2 | Pilule « Titres du personnel » | **conforme** — réserve levée par `d3e51e7`, cf. §a-bis |
| 3 | Pastilles réglementaires cliquables | **conforme** (deux nuances) |
| 4 | Aucun référentiel privé présenté comme du droit | **conforme** |
| 5 | Carnet sanitaire et sa citation | **conforme** |
| 6 | Carte de couverture disparue du tableau de bord | **conforme** |
| 7 | Bandeau de couverture du calendrier | **conforme** |
| 8 | Deux nouvelles recommandations | **défaut** — la seconde est inatteignable |
| 9 | Écrans Équipe | **conforme** |
| 10 | Nom de l'opérateur sur le carnet sanitaire | **conforme** |
| 11 | Onboarding hors des trois secteurs | **partiellement vérifié** |

---

## 1. Le filtre par bâtiment sous « en retard seulement » — conforme

Établissement « Le Bistrot du Marché », deux bâtiments.

| Filtre | En-tête (année) | En-tête (mois) | Lignes listées |
|---|---|---|---|
| Bâtiment principal, sans urgence | 24 échéances | 21 ce mois-ci · 21 en retard | 19 principal + 2 « Tout l'établissement » = **21** |
| Bâtiment principal **+ en retard seulement** | 21 échéances | 21 ce mois-ci · 21 en retard | 19 principal + 2 « Tout l'établissement » = **21** |
| Annexe **+ en retard seulement** | 7 échéances | 7 ce mois-ci · 7 en retard | 5 annexe + 2 « Tout l'établissement » = **7** |

L'en-tête et la liste disent le même nombre dans les deux sens. **Aucune ligne du
bâtiment B n'apparaît sous le filtre A**, ni l'inverse. Et le piège se referme
bien : les échéances sans lieu (« Tout l'établissement ») **restent visibles sous
les deux bâtiments** — elles ne sont pas avalées par le filtre.

Captures : `p1-01-haut.png`, `p1-04-batA-retard.png`, `p1-06-annexe-retard.png`.

## 2. La pilule « Titres du personnel » — conforme, avec une réserve

La pilule est présente dans la rangée de filtres, sous « TYPE D'ÉCHÉANCE ».

**L'icône est la bonne.** Vérifiée dans le DOM, pas à l'œil :
`class="lucide lucide-id-card flex-none size-4"`, avec les tracés d'une carte
(rect + circle + deux lignes). Ce n'est pas `Users`. La même `IdCard` sert aux
chips « 1 titre » des écrans Équipe.

**Elle filtre.** Sur 2024, le filtre isole une seule ligne — l'attestation
médicale dépassée de Léa Fontaine — comptée « 1 en retard »
(`p2-02-titres-2024.png`).

**Les lignes de titre ne sont plus comptées dans « Vérifications ».** Deux
preuves : « Attestation médicale » est absent de la liste sous
« Vérifications périodiques » ; et sous ce filtre la flèche de recul d'année est
**désactivée** à 2026, alors qu'elle mène jusqu'à 2024 sous « Titres du
personnel ». Les bornes de navigation se calculent sur l'ensemble filtré : le
titre de 2024 n'est donc pas dans l'ensemble des vérifications.

**Réserve.** Sur l'année en cours (2026), le filtre « Titres du personnel »
affiche **0 échéance** — « De août à décembre, aucune échéance ». C'est
arithmétiquement exact (les trois titres sont datés 2024, 2029 et 2030), mais le
tableau de bord annonce au même moment « 1 titre de salarié » et « 27 dépassées »
là où le calendrier 2026 en compte 26. Voir le défaut décrit plus bas : un
dirigeant qui ouvre le filtre « Titres du personnel » y lit qu'il n'a rien en
retard, alors qu'un titre l'est depuis novembre 2024.

## 3. Les pastilles réglementaires — conforme

**14 pastilles ouvertes une par une**, sur les huit écrans demandés. Toutes
s'ouvrent, toutes montrent quelque chose.

| Écran | Pastilles | Résultat |
|---|---|---|
| Contrôle | 4 (R. 4121-1, R. 4323-25, R. 164-6 CCH, L. 8222-1) | extrait + lien Légifrance |
| Permis de feu (liste) | 3 (INRS ED 6030, R. 4224-17, GN 13) | extrait + lien |
| Permis de feu (fiche) | 1 (R. 4224-17 · ED 6030) | extrait + lien |
| Plan de prévention (liste) | 2 (R4512-6 à R4512-12, arrêté 19 mars 1993) | cf. nuance |
| Plan de prévention (fiche) | 1 (R. 4512-6 à R. 4512-12) | extrait + lien |
| Registre | **0** | cf. nuance |
| Carnet sanitaire | 2 (arrêté 1er févr. 2010 art. 3, R. 1321-23 CSP) | cf. nuance |
| Accessibilité | 1 (R. 164-6 CCH) | extrait + lien |
| Prestataires | 1 (L. 8222-1 CT) | extrait + lien |

Deux nuances, ni l'une ni l'autre n'étant un défaut au sens de la fiche :

- **Deux pastilles s'ouvrent sur un lien seul**, sans extrait ni explication :
  `§ ART. R. 1321-23 CSP` (carnet sanitaire) et `§ ART. R4512-6 À R4512-12 CT`
  (plan de prévention, liste). Contenu déplié complet, vérifié dans le DOM :
  `"§ / ART. R. 1321-23 CSP / ▾ / LIRE LA SOURCE OFFICIELLE →"`. La fiche accepte
  « un extrait, un lien Légifrance, **ou les deux** » : c'est donc conforme. Mais
  ces deux-là sont visiblement plus pauvres que leurs voisines, et sur le même
  écran que des pastilles qui, elles, citent le texte.
- **La page Registre ne porte aucune pastille.** Rien ne s'y ouvre sur du vide —
  il n'y a rien. À confirmer côté conception : la fiche liste « Registre » parmi
  les écrans à ouvrir, ce qui laisse penser qu'une pastille y était attendue.

Sur les deux fiches (permis de feu, plan de prévention), la pastille est
**dépliée par défaut** (`aria-expanded="true"` au chargement) : le premier clic
la referme. Comportement cohérent, signalé pour qui relira les chiffres.

Captures : `p3-controle.png`, `p3-permis-feu-fiche-ouvert.png`.

## 4. Aucun référentiel privé présenté comme du droit — conforme

Balayage de onze écrans, toutes pastilles dépliées. `APSAD` apparaît **2 fois**
(contre six auparavant), et les deux fois il est **explicitement qualifié** :

> « Votre assureur l'exigera probablement au titre de la règle APSAD R43. C'est un
> référentiel de la profession de l'assurance, opposable par votre contrat — pas
> par le droit. » *(permis de feu, liste)*

> « …au titre de la règle APSAD R43 — un référentiel de la profession de
> l'assurance, opposable par le contrat et non par le droit. » *(permis de feu,
> fiche)*

La seconde occurrence est **à l'intérieur d'une pastille réglementaire**. La
fiche demandait d'abord qu'APSAD n'y apparaisse plus ; elle accepte à défaut
qu'il soit qualifié sans ambiguïté. C'est le cas, et la qualification est dans la
même phrase, pas en note de bas de page.

## 5. Le carnet sanitaire et sa citation — conforme

La citation se termine bien par la bonne formule :

> « …dans un fichier sanitaire des installations, **qui est tenu à disposition du
> directeur général de l'agence régionale de santé**. »

« des autorités sanitaires » est **absent de la page** (vérifié par recherche sur
le texte rendu). Le lien pointe
`https://www.legifrance.gouv.fr/loda/id/JORFTEXT000021795143/`, l'arrêté du
1er février 2010.

Un paragraphe suit la citation et distingue le vocabulaire du texte de celui du
produit : « Le texte dit "fichier sanitaire des installations". "Carnet
sanitaire" est le nom que cet outil donne à son module, pas celui de l'arrêté ».

Capture : `p5-carnet.png`.

## 6. La carte de couverture a disparu du tableau de bord — conforme

Aucune occurrence de « couverture », « ce que Rojer couvre », « ne couvre pas »
ni « hors périmètre » sur le tableau de bord.

**Et rien ne reste à sa place.** Le board s'enchaîne proprement : bandeau brief
(« 27 échéances à traiter cette semaine », trois compteurs), carte établissement
à deux bâtiments, rangée de filtres par bâtiment, guide de mise en place, widget
calendrier, widget équipements. Pas de trou, pas de colonne vide, pas de grille
désalignée.

Capture : `p6-tdb.png`.

## 7. Le bandeau de couverture du calendrier — conforme

**Première lecture — rien ne se rend**, et c'était le résultat juste : cet
établissement ne déclenche aucun des quatre axes.

| Axe | Valeur | Déclenche ? |
|---|---|---|
| IGH | `estIGH = false` | non |
| Catégorie d'ERP | type N, catégorie 5 | non |
| Secteur du DUERP | NAF `56.10A` — restauration, secteur couvert | non |
| Domaine d'équipement | 9 catégories, toutes dans les 10 domaines livrés | non |

**Seconde lecture — l'axe forcé.** Pour voir le bandeau rendu, `estIGH` a été
passé à `true` (classe `GHW`) **sur la copie locale uniquement**, le temps d'une
capture, puis remis à `false` / `null`. Le bandeau apparaît, et il est bon :

> ⚠ **Cet établissement est déclaré immeuble de grande hauteur (IGH).**
> Le règlement de sécurité des IGH impose un service de sécurité permanent et des
> vérifications que cet outil ne connaît pas. Ce que vous lisez ici ne couvre pas
> votre régime.
> → *Vérifier le régime de l'établissement*

Carte à liseré rouge, en tête de page, avant les filtres. Texte lisible, sans
jargon, qui dit ce qui n'est pas couvert sans prétendre couvrir autre chose, et
qui offre une sortie — le lien vers la fiche établissement, au cas où le régime
aurait été mal déclaré. Il n'annonce aucun manque qui n'existe pas.

Capture : `p7-bandeau-igh.png`.

## 8. Les deux nouvelles recommandations — défaut sur la seconde

**La première est juste dans son absence.** « Suppose un titre nominatif — aucun
n'est déclaré » ne se déclenche pas ici : les trois salariés ont chacun un titre
déclaré, la condition n'est pas réunie.

**La seconde ne peut pas s'afficher sur ce dossier, ni sur aucun dossier réel.**

La condition est réunie : les deux prestataires de l'annuaire couvrent
`incendie`, `entretien_general`, `electricite` et `bureau_controle`, tandis que
les équipements déclarés relèvent en plus de l'aération/ventilation, de la
cuisson, des portes et portails automatiques et du froid — **quatre domaines
d'obligation sans prestataire correspondant**. La règle existe et sait les
nommer (`recommandations.ts:323`, `kind: "transmission_prestataire"`,
« Aucun prestataire déclaré en … »).

Le message n'apparaît nulle part. J'ai d'abord soupçonné un problème de layout,
puis je l'ai écarté à l'écran : passage en mode personnalisation, ajout du widget
**« Par où commencer »** depuis le tiroir — celui qui rend la file du moteur.
Le widget s'affiche, annonce **« PAR OÙ COMMENCER — 2 SUR 27 »**, et liste deux
urgences. Aucune transmission. Le seul endroit où le mot « prestataire » figure
sur le tableau de bord est la matrice des modules.

La cause est dans les deux widgets qui rendent la file
(`impl/board.tsx:563` et `:1245`), qui portent la même ligne :

```js
const reelles = recommandations.filter((r) => r.priorite <= 5);
const file = (reelles.length > 0 ? reelles : recommandations).slice(0, 2);
```

Les transmissions sont en **priorité 9 et 10**. Dès qu'il existe **une seule**
recommandation de priorité ≤ 5, elles ne sont pas reléguées en fin de file :
elles sont **retirées de la file**. Ce dossier en a 27.

L'intention écrite dans le moteur est pourtant explicite —
« Priorités 9 et 10, donc DERRIÈRE les amorçages » — et la fiche de contrôle
demandait qu'elles passent « après les messages d'amorçage, pas avant ».
« Après » a été rendu par « seulement si rien d'autre ». Conséquence : la famille
de recommandations qui vient d'être ajoutée n'est visible que sur un dossier sans
aucune urgence — c'est-à-dire à peu près jamais.

Je ne propose pas de correction, ce n'est pas mon rôle ici. Je signale seulement
que le partitionnement et le `slice` se cumulent, et que corriger l'un sans
l'autre ne suffira pas.

Capture : `p8-02-par-ou-commencer.png`.

## 9. Les écrans Équipe — conforme

**Liste Équipe** : trois cartes de personnes à la grammaire du board — mêmes
rayons, mêmes teintes, chip `1 titre` avec l'icône `IdCard`, pastille de retard
rose sur Léa Fontaine, bouton `1 TITRE À RENOUVELER`. Bloc pédagogique « Un seul
titre au catalogue, pour l'instant » avec pastille `§ ART. R. 4544-10 CT`.

**Fiche d'un salarié** (Camille Roussel) : mêmes cartes arrondies, même
typographie, pastille `§ R. 4544-11-1`, badge « Sans terme écrit », mention
« Rojer n'enregistre que l'existence de cette attestation et ses dates. Le
document reste chez vous. »

Aucun des deux n'a l'air d'appartenir à une autre application.

Captures : `p9-01-equipe.png`, `p9-02-fiche-salarie.png`.

## 10. Le nom de l'opérateur sur le carnet sanitaire — conforme

Le dump ne portait aucun point de relevé (`select count(*) from "PointReleve"`
→ `0`). Le parcours a donc été fait par l'interface, comme un utilisateur :
création d'un point (« Douche vestiaire — point le plus éloigné », ECS, seuil
50 °C, bâtiment principal), puis saisie d'un relevé du 28 août 2026 à 54 °C,
opérateur « Samir [démo] Benali ».

Le champ de saisie est libellé **« Opérateur (facultatif) »**. Après
enregistrement, la fiche du point affiche :

> **Dernier relevé le 28 août 2026 · par Samir [démo] Benali**

Le « par » fait le travail : le nom est rattaché à ce qu'il désigne — qui a
relevé — et non posé comme une étiquette technique. La valeur « Dans la plage »
et la courbe d'évolution s'affichent à côté.

*Données locales seulement : ce point de relevé et ce relevé n'existent que sur
la copie restaurée, ils ne sont dans aucun dump.*

Capture : `p10-02-releve.png`.

## 11. L'onboarding s'ouvre hors des trois secteurs — partiellement vérifié

**Ce qui est vérifié, et qui est le cœur du point : il n'y a pas de refus.**

Le champ « Code NAF » est un `<input type="text">` libre, pas une liste fermée :
les quatre codes proposés (56.10A, 47.11B, 70.22Z, 71.12B) sont des raccourcis,
pas des contraintes. La saisie de `45.20A` (garage) est acceptée et déclenche un
message d'information, pas un blocage :

> **Pas de référentiel de risques types pour ce secteur.** Aucun référentiel de
> risques types n'est encore instruit pour ce code d'activité. Vous pouvez créer
> votre dossier : le suivi des obligations, le calendrier des vérifications et le
> registre de sécurité ne dépendent pas de votre code d'activité — ils se
> déclenchent sur vos équipements et sur votre typologie d'établissement. Seul le
> document unique démarrera sans unités de travail ni risques pré-remplis : vous
> choisirez le secteur le plus proche, ou vous les saisirez vous-même. Votre
> dossier indiquera en permanence que ce point n'est pas couvert.

Le message dit ce qui sera couvert et ce qui ne le sera pas, sans promettre une
couverture DUERP que le produit ne tient pas. L'étape 1 se valide avec ce NAF.

**Ce qui n'est pas vérifié : le parcours mené jusqu'à la création du dossier.**
Deux tentatives se sont arrêtées après l'étape 2, en retombant sur le tableau de
bord existant sans créer d'entreprise (`select "raisonSociale" from "Entreprise"`
→ toujours deux lignes, aucune « Garage »). L'explication la plus probable est
structurelle et non un défaut de l'onboarding : `Entreprise.userId` est
`@unique` (`prisma/schema.prisma:32`), donc **un compte ne peut posséder qu'une
entreprise**, et celui du contrôle en possède déjà une.

Pour clore ce point il faut un second compte, vierge de tout dossier. Je ne l'ai
pas demandé : la fenêtre « Confirm email » a été refermée, et rouvrir un réglage
d'authentification du produit en ligne pour finir une vérification ne le vaut
pas.

Capture : `p11-02-rempli.png`.

---

## Ce qui m'a paru faux sans être dans la liste

### a. « En retard » se juge par rapport à aujourd'hui, sauf dans le calendrier

**C'est le constat le plus sérieux du rapport.** Trois écrans disent trois choses
différentes du même fait.

Léa Fontaine a une attestation médicale dépassée depuis le **20 novembre 2024**.

| Où | Ce qui est affiché |
|---|---|
| Tableau de bord, bandeau brief | « **27 échéances** à traiter cette semaine », « 27 dépassées » |
| Tableau de bord, widget « Par où commencer » | **n° 1 sur 27** : « Attestation médicale … — Léa Fontaine — **échéance dépassée depuis 649 j** » |
| Tableau de bord, widget calendrier | « 25 vérifications · 1 opération · **1 titre de salarié** » · « 27 en retard » |
| Calendrier, 2026, sans filtre | « 29 échéances », « **26 en retard** » |
| Calendrier, 2026, filtre « Titres du personnel » | « **De août à décembre — aucune échéance** » |
| Calendrier, **2024**, filtre « Titres du personnel » | « 1 échéance », barre rouge en novembre, « 1 en retard » |

Vérité SQL pour 2026 : **25 vérifications, 0 titre**. Les trois titres sont datés
2024, 2029 et 2030.

**La ligne n'est donc pas perdue** — elle est rangée sur l'onglet de son année, et
le calendrier 2024 l'affiche correctement. Le défaut est plus précis que
« elle disparaît » : **« en retard » est un état relatif à aujourd'hui, pas à
l'année consultée**, et la vue par défaut du calendrier — l'année en cours — ne
le montre pas, pendant que le tableau de bord le compte et le place en tête de
ce qu'il faut traiter.

Le résultat pour le dirigeant : le tableau de bord lui désigne cette attestation
comme **la première chose à faire**, dépassée depuis 649 jours ; le filtre
« Titres du personnel » du calendrier — celui fait exactement pour ça — lui
répond « aucune échéance ». Pour la voir, il faut reculer de deux années à la
main, sans qu'aucun élément d'écran ne l'y invite. Deux compteurs voisins qui se
contredisent, ce que l'ADR-015 existe pour empêcher.

Reproduction : `/etablissements/<id>` (widget « Par où commencer »), puis
`/etablissements/<id>/calendrier`, filtre « Titres du personnel », année 2026.

### a-bis. Vérification du correctif (`d3e51e7`) — réglé, avec un pli de trop

Le correctif pose une **seconde couture** en tête de l'année en cours, au-dessus
de celle des mois passés. La ligne n'a pas été déplacée : sa date reste sa date.

| Contrôle | Attendu | Observé |
|---|---|---|
| Couture visible **sans rien ouvrir**, filtre « Titres du personnel », 2026 | oui, avec le compte | « Voir les retards des années précédentes · **1 en retard** » ✔ |
| Même chose **sans filtre** | oui, en tête de 2026 | présente, avant « Août 2026 » ✔ |
| Ouverture | carte novembre 2024, ligne à sa date réelle | « Novembre 2024 · 1 ce mois-ci · 1 en retard » ✔ |
| Libellé après ouverture | « Replier les années précédentes » | ✔ |
| Contre-épreuve : année **2024** | pas de couture | absente ✔ |
| Contre-épreuve : échéances **futures** (2029, 2030) | jamais remontées | aucune ✔ |

Une fois les deux plis ouverts, la ligne s'affiche bien à sa date :

> **20 NOV.** — Attestation médicale d'absence de contre-indication au travail
> sous tension — *Titre salarié · Léa [démo] Fontaine · tous les 5 ans ·
> Électricité* — **En retard**

**Les comptes concordent désormais** — c'était la contradiction d'origine :

| | |
|---|---|
| Calendrier 2026, compteur d'année | 26 en retard |
| Couture « années précédentes » | 1 en retard |
| **Total** | **27** |
| Tableau de bord, brief | 27 échéances à traiter · **27 dépassées** |
| Tableau de bord, widget calendrier | **27 en retard** |

27 = 26 + 1. L'écart 27/26 est levé, et il l'est par addition visible à l'écran,
pas par un recalage silencieux d'un des deux compteurs.

**Une réserve, mineure et non bloquante : il faut deux clics, pas un.** La
couture s'ouvre sur une carte « Novembre 2024 » qui arrive elle-même **repliée** —
elle annonce « 1 ce mois-ci · 1 en retard » sans montrer de ligne. Il faut
cliquer son chevron pour voir *quoi* est en retard. Le compte fermé sur la
couture fait son travail : la dette n'est plus enterrée. Mais entre « il y a
1 retard » et « c'est l'attestation médicale de Léa Fontaine », il reste un pli
que rien n'annonce.

Détail d'usage rencontré au passage : le panneau « Filtres », qui est `sticky`,
recouvre la couture et intercepte le clic tant qu'il est ouvert. Il faut le
refermer d'abord.

Captures : `p12-02-repliee.png`, `p12-03-ouverte.png`, `p12-04-depliee.png`.

### a-ter. Vérification du correctif du point 8 (`62086bf`) — il produit bien quelque chose

Le correctif retire le partitionnement `priorite <= 5` des deux widgets. Vérifié
des deux côtés, parce qu'aucun des deux ne suffit seul.

**Sur le dossier chargé — aucune régression.** La carte « Par où commencer »
affiche toujours **« PAR OÙ COMMENCER — 2 SUR 27 »**, les deux mêmes urgences
dans le même ordre (l'attestation de Léa Fontaine en 1, la vérification
électrique annuelle en 2), et le même pied « 2 autres échéances sous 30 jours ».
L'eyebrow, qui dépend de `extrait`, est intact. Aucune transmission — attendu :
le `slice(0, 2)` demeure.

**Sur le dossier sans vérification (`e9492ba5-…`) — les transmissions
apparaissent.** C'est le seul contexte où le correctif est observable, et il
donne le résultat visé. Le widget « À faire » (*« Les cinq plus urgentes —
vérifications et actions mêlées »*) liste, **dans cet ordre** :

1. « Ouvrez votre DUERP » — *L'évaluation des risques, guidée unité par unité*
2. « **Aucun prestataire déclaré en aération / ventilation** »
3. « **Aucun prestataire déclaré en cuisson et hotte** »
4. « **Aucun prestataire déclaré en froid / fluides frigorigènes** »
5. « **Aucun prestataire déclaré en portes et portails** »

Chacune sous-titrée : *« Une de vos obligations suppose l'intervention d'un tiers
qualifié »*. L'amorce passe devant, les transmissions suivent — c'est l'ordre
annoncé. Et les quatre domaines nommés sont exactement ceux que le SQL désignait
sur l'autre dossier : la règle voit juste.

La formule tient le registre voulu : elle nomme un écart, elle ne juge pas. Ni
« vous êtes en faute », ni « vous devez signer avec quelqu'un ».

*Manipulation : `Entreprise.userId` a été basculé sur le second dossier le temps
de la lecture (la contrainte `@unique` interdit de posséder les deux), puis les
deux valeurs ont été remises à l'identique — vérifié en base.*

**Reste l'arbitrage, qui n'est pas un défaut** : sur un dossier à 27 retards, une
transmission est désormais *dans* la file, à sa place, et reste invisible parce
que la carte n'en montre que deux. Ordonner ne rend pas visible. Faut-il réserver
une place à une transmission quand il en existe une, au prix d'une urgence
affichée sur deux ? C'est une question de produit.

Captures : `p13-parou.png`, `p14-01-vide-tdb.png`.

### a-quater. Un avertissement React sur le calendrier — non résolu

Console, sur `/etablissements/<id>/calendrier` :

> `Each child in a list should have a unique "key" prop.`
> `Check the render method of` **`BarreAnnee`**`. It was passed a child from` **`CalendrierPage`**`.`

**Correction d'une affirmation antérieure de ce rapport.** Je l'avais d'abord
donné comme propre au dossier sans vérification, en écrivant qu'il était
« absent du calendrier du dossier chargé ». **C'est faux.** En le reprenant sur
quatre chargements neufs du dossier chargé, il apparaît à chaque fois :

| Écran | Total affiché | Avertissement |
|---|---|---|
| Calendrier, sans filtre | 29 échéances | oui |
| Calendrier, `?famille=personnel` | 1 échéance | oui |
| Calendrier, `?famille=verification` | 29 échéances | oui |
| Calendrier, `?urgent=1` | 26 échéances | oui |

La première observation portait sur une seule paire de chargements dans une
session de navigation déjà chargée ; React déduplique ces avertissements, et j'en
ai tiré une conclusion que l'échantillon ne portait pas. L'avertissement est
**général au calendrier**, indépendant du dossier, du filtre et du volume.

**Ce que j'ai pu établir, et où je m'arrête.** La pile JavaScript ne contient que
des trames internes de React — la réconciliation se produit hors de l'appel de
rendu, il n'y a donc aucune trame applicative à lire. Le message désigne
`BarreAnnee` comme le composant qui rend une liste, et `CalendrierPage` comme
celui qui a créé les enfants. Le seul enfant que le second passe au premier est
`commandes` (`calendrier/page.tsx:1007`), et c'est bien **un `<div>` unique**,
pas un tableau — la lecture de la session principale est exacte sur ce point.
`BarreAnnee` (`AnneeCalendrier.tsx:363`) ne rend par ailleurs que des frères
statiques : un `<h2>`, un bloc conditionnel, `{commandes}`.

Je n'ai donc pas trouvé la ligne fautive, et je ne la devine pas. Ce qui est
acquis : **la condition de reproduction est bien plus large qu'annoncé au
premier passage**, ce qui écarte toute piste liée aux données. Sans effet visible
aujourd'hui — c'est un avertissement de développement — mais c'est le genre qui
devient un bug de réconciliation le jour où la liste concernée devient dynamique.

**Non résolu, et ne bloque pas la PR.**

### b. Le message de validation d'e-mail de Supabase remonte brut, en anglais

Sur `/signup`, une adresse refusée par Supabase affiche le message du fournisseur
tel quel, au milieu d'une page entièrement en français :

> `Email address "controle.pr10.…@rojer-test.fr" is invalid`

C'est ce que voit un dirigeant qui se trompe de domaine à l'inscription.

### c. La landing annonçait « 64 obligations · 9 domaines » — corrigé depuis

Sur la page d'accueil publique, la carte « Le calendrier des vérifications »
affichait « 64 obligations · 9 domaines » quand le référentiel en porte **85 sur
10**. `/` étant une route publique, le chiffre était montré à des prospects et
sous-vendait le produit de vingt et une obligations.

Corrigé en `ee7c204` après signalement, avec un test qui lit le texte rendu et le
confronte au référentiel — le commentaire qui promettait de recompter n'avait
jamais recompté.

### d. Changer de filtre de type ramène le calendrier à l'année en cours

En 2024 sous « Titres du personnel », basculer sur « Vérifications périodiques »
ramène l'écran à 2026 sans le dire. L'année choisie est perdue au changement de
famille.

### e. « Préparer un contrôle » : trois signaux sans légende — corrigé (`8aee065`)

Sur l'écran qu'on ouvre devant un inspecteur, chaque pièce portait **trois
indications qui ne disent pas la même chose**, dont une sans aucune explication :

| # | Pièce | Badge | Colonne de droite |
|---|---|---|---|
| 01 | Dossier de conformité consolidé | `À jour` (vert) | **✓** |
| 02 | DUERP versionné — « Aucune version figée » | `À planifier` | **○** |
| 03 | Registre de sécurité — « **0 rapport de vérification archivé** » | `En retard` (rouge) | **✓** |
| 06 | Attestations prestataires — « 2 attestations expirées » | `En retard` (rouge) | **✓** |

L'anneau annonçait par ailleurs **33 % prêt** — les deux seules pièces « À jour »
sur six. La colonne comptait donc un troisième axe, sans en-tête, sans légende et
sans `aria-label` : à l'œil, un ✓ à droite d'un badge rouge « En retard ».

**Vérifié après correction, sur le dossier chargé :**

- une ligne de légende s'est posée sous la description de la section :
  `PASTILLE = ÉTAT DE VOS DONNÉES · ✓ À DROITE = PIÈCE INCLUSE DANS LE ZIP` ;
- elle n'écrase pas la hiérarchie — sur-titre, titre, description, légende se
  lisent dans cet ordre, la légende en petites capitales grises ;
- la coche garde son alignement à droite, identique sur les six lignes malgré
  l'imbrication de `span` ajoutée ;
- le sens est désormais porté en toutes lettres pour les lecteurs d'écran —
  « Incluse dans le ZIP » / « Absente du ZIP » — là où la coche était
  `aria-hidden` et ne laissait rien de la colonne.

Capture : `x2-controle.png` (après correction), `x-controle-haut.png` (avant).

### f. Les autres écrans non listés : rien à signaler

Six écrans que la fiche ne demandait pas ont été ouverts sur le dossier chargé —
**Préparer un contrôle**, **guide « Comprendre »**, **DUERP**, **plan
d'actions**, **prescriptions**, **fiche d'un équipement** — et les quatorze
écrans du dossier sans vérification. Tous répondent 200, aucun écran cassé,
aucune erreur console hormis celle du §a-quater, et les neuf pastilles
réglementaires de ces écrans s'ouvrent sur du contenu.

Deux points relevés à la lecture, tous deux **justes** :

- La pastille `§ ART. R. 4323-25 CT` cite « … consigné sur le ou les registres de
  sécurité mentionnés à l'article **L. 4711-5** ». C'est le texte réel de
  R. 4323-25, et non une reprise de la thèse écartée par le projet selon laquelle
  L. 4711-5 fonderait le registre : l'article cité y renvoie, c'est tout.
- Sous la citation de L. 8222-1, une ligne distingue ce que l'article dit de ce
  qu'il ne dit pas : « Le montant plancher — 5 000 € HT — et le rythme semestriel
  ne sont pas dans cet article : ils viennent de R. 8222-1 et D. 8222-5. »

### Et ce qui m'a paru juste

- Le **fil du point 1** tient dans les deux sens, y compris sur le piège des
  échéances sans lieu. C'est le point qui portait le défaut d'origine.
- L'**écran d'attente de confirmation d'inscription** est soigné : trois étapes
  numérotées, « Regardez dans vos spams au cas où », « J'ai déjà cliqué · Me
  connecter », « Mail absent ? Réessayer ». Il traite un moment où l'utilisateur
  est habituellement laissé seul.
- Les **pastilles réglementaires** citent le texte au lieu de le paraphraser, et
  distinguent le vocabulaire du produit de celui du droit (carnet sanitaire),
  ainsi que le référentiel d'assureur du droit (APSAD).
- La **frontière médicale** est tenue à l'écran, pas seulement dans les
  documents : « Ne déposez pas le document. Rojer enregistre qu'une attestation
  existe, sa date et son échéance — rien d'autre. »

---

## Ce que je n'ai pas pu atteindre, et ce qu'il aurait fallu

| Point | Ce qui manquait | Statut après seconde passe |
|---|---|---|
| 7 — bandeau de couverture | Un établissement déclenchant un axe | **Levé** — `estIGH` forcé localement puis remis, bandeau vu et capturé |
| 8 — recommandations | Distinguer « message absent » de « widget hors layout » | **Levé** — widget ajouté depuis le tiroir, message toujours absent : c'est un défaut, cf. §8 |
| 10 — opérateur du carnet sanitaire | `PointReleve` = 0 dans le dump | **Levé** — point et relevé créés par l'interface |
| 11 — fin du parcours d'onboarding | `Entreprise.userId` est `@unique` : le compte possède déjà un dossier | **Ouvert** — il faut un second compte Supabase vierge ; la fenêtre « Confirm email » a été refermée et ne sera pas rouverte pour ça |

**Modifications faites sur la copie locale, et sur elle seule** : `estIGH` passé à
`true` puis remis à `false` / `null` ; un `PointReleve` et un
`ReleveTemperature` créés par l'interface ; le widget « Par où commencer » ajouté
au layout (stocké en `localStorage`, propre à ce navigateur). Rien de tout cela
n'existe dans un dump ni dans le dépôt.

Trois remarques de mise en route, pour la prochaine fois :

- `docker-compose.override.yml` doit porter **`ports: !override`** ; sans le tag,
  Compose *ajoute* le port à la liste du fichier de base au lieu de la remplacer,
  et le conflit revient. Corrigé depuis dans le `.gitignore` (`8de0902`).
- Le dump a été déposé **à la racine du dépôt**. Déplacé hors du dépôt avant
  restauration ; un fichier de données à cet endroit finit par être commité.
- Les échéances portées par l'établissement ont `equipementId` **à NULL**, pas un
  équipement sans bâtiment. Une jointure interne `Verification × Equipement` les
  fait disparaître en silence — c'est le piège du point 1, transposé au SQL.

## Ce que je n'ai pas fait

Aucune correction de code, aucun `push` sur `main`. Aucune vérification n'a été
cochée sans avoir été faite : les quatre points d'abord annoncés « non vérifié »
l'étaient réellement, et trois ont été levés dans une seconde passe décrite
ci-dessus. Playwright a été installé **hors du dépôt**
(`/tmp/controle-pr10`) : ni `package.json` ni le lockfile n'ont été touchés.
