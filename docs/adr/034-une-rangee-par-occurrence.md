# ADR-034 — Une ligne de suivi ne porte que l'échéance ouverte ; l'historique, ce sont les rapports

- **Statut** : **acceptée le 2026-09-10**, dans sa variante « une ligne ouverte »
  (option 2 ci-dessous), après débat entre deux sessions et deux lectures de
  sources. Proposée le même jour dans une variante plus large (une rangée par
  occurrence), **écartée pour l'instant** — elle est conservée au § 5 avec ce qui
  la justifierait. Le nom du fichier date de la proposition ; il n'est pas
  renommé pour ne pas casser les renvois du § 11 et du `CLAUDE.md`.
- **Portée** : `prisma/schema.prisma` (`Verification.archiveLe`,
  `RapportVerification.echeanceHonoree`), `src/lib/rapports/actions.ts` (le dépôt
  fait rouler la ligne), `src/lib/calendrier/generateur.ts` (la branche « cycle
  soldé » disparaît), `src/lib/dates/retard.ts`, `src/lib/calendrier/etats.ts`,
  `src/lib/pdf/etat-verifications.ts`, et les lecteurs recensés au § 6
- **Amende** l'ADR-012 (conservation et idempotence) : elle en garde toutes les
  promesses et retire à la ligne de suivi le rôle de porteur d'historique, que
  l'ADR-012 lui avait confié en le sachant coûteux (`:227-237`)
- **Dépend de** l'ADR-011 (prédicats de retard centralisés), l'ADR-022 (porteur),
  l'ADR-023 (salarié), l'ADR-026 (nature d'une obligation)
- **Fondée sur** : deux lectures exhaustives du code le 2026-09-10 (lecteurs et
  écrivains de `Verification`, chemin:ligne) ; une lecture en LECTURE SEULE du
  modèle d'échéances de GestBAT, l'autre produit de la propriétaire ; une revue de
  sources d'autorité (sept GMAO/EAM, RFC 5545, Google Calendar API, Fowler,
  PostgreSQL, Microsoft) ; et un débat contradictoire avec la session GestBAT, qui
  a fait tomber l'argument central de la proposition initiale. Rien n'est de
  mémoire.

## 1. Le problème

### Une rangée qui joue deux rôles

L'ADR-012 a posé, le 2026-08-10, que **la même rangée `Verification` sert de
cycle en cycle** : quand un contrôle est fait, elle garde `dateRealisee`,
avance `datePrevue` au rendez-vous suivant, et les rapports s'y accumulent.
C'était la réponse à un vrai désastre — la régénération faisait
`delete` + `create` et emportait les rapports par cascade —, et la réponse a
tenu. L'ADR le dit lui-même (`docs/adr/012-conservation-et-idempotence.md:112-114`) :

> Depuis la contrainte `@@unique`, une `Verification` n'est plus « une
> occurrence » mais **la ligne de suivi** durable d'une obligation sur un
> équipement.

Et il en avait vu le prix (`:227-237`) : `dateRealisee` « change de sens », le
compteur « réalisées sur 12 mois » « sous-compte », « le comptage juste se fait
sur `RapportVerification.dateRapport` », « le basculement de cycle a lieu à la
régénération, pas à la seconde près ».

Un mois plus tard, ce prix a été payé sur toutes les surfaces. La même rangée
dit deux choses — « fait le 15 mars 2025 » et « dû le 15 mars 2026 » — et
chaque lecteur choisit laquelle il lit :

- **les compteurs lisent le fait** : les trois prédicats de `retard.ts`
  s'arrêtent sur `dateRealisee !== null`. Une ligne réalisée dont le rendez-vous
  suivant est passé n'est ni en retard ni à venir, et si sa réalisation a plus de
  douze mois elle n'est **nulle part** — `total = 0`, hors du dénominateur du
  score, qui monte. Mesuré deux fois ;
- **la grille lit le rendez-vous** : `lecturesCalendrier` déplie la rangée en
  deux événements et peint le second en rouge. Deux réponses sur un écran ;
- **la fiche lisait les deux et se trompait** : tuile verte « faite » sur une
  échéance à venir, corrigée par une **troisième** fonction de classement ;
- **le statut ne sait pas dire « archivée »**, faute de valeur dans l'enum : il
  reste gelé, et le marqueur vit dans le libellé — que huit surfaces ne lisaient
  pas ;
- **rien ne relance un dossier immobile** : l'occurrence suivante n'est pas une
  rangée, c'est une date avancée *si* une passe de réconciliation a lieu.

Tous les constats du lot 3 du § 11, une part du lot 2 et la moitié du lot 5 en
descendent. Les corriger un par un, c'est ce qu'on a fait le 2026-09-10 pour un
tiers du lot 3 — et c'est en le faisant qu'on a vu qu'on posait une couche de
compensation sur un modèle connu faux.

### Ce que la réglementation tranche, et ce qu'elle ne tranche pas

**Elle tranche le fond.** Arrêté du 8 octobre 1987, art. 3.2 : « **au minimum
une fois par an** ». L'obligation est l'intervalle, pas le souvenir : une ligne
dont l'échéance suivante est passée **est en retard**, quelle que soit la
solidité du contrôle précédent.

**Elle tranche aussi ce qui doit être conservé, et c'est décisif pour ce qui
suit.** `D. 4711-3` : l'employeur conserve « les documents concernant […] les
vérifications et contrôles […] des cinq dernières années et, en tout état de
cause, ceux des deux derniers contrôles ». `R. 4323-25` fait consigner le
résultat ; `R. 4323-26` fait annexer les rapports au registre, ou y porter la
date du contrôle et la date de remise ; `R. 4323-27` autorise tout support.
**Ce que la loi fait tenir, c'est la série des rapports datés avec leur
résultat.** Aucun texte ne demande d'enregistrer la date à laquelle un contrôle
*aurait dû* avoir lieu.

**Elle ne tranche pas le modèle.** Rien sur un score, un compteur, ni sur la
façon de ranger les échéances à venir.

## 2. Les quatre modélisations, et ce que les sources en disent

| | Modèle | Qui le fait | Verdict |
|---|---|---|---|
| **1** | Rangée réutilisée + statut stocké rafraîchi par un cron | Personne parmi les sources d'autorité | **Écarté.** PostgreSQL interdit une colonne calculée dépendant de `now()` ; Fowler nomme la « fenêtre d'incohérence » ; trois anomalies officielles IBM Maximo (IV73784, IV79823, IV85583) documentent des valeurs dérivées stockées qui ont dérivé. Rojer n'a aucune infrastructure de tâche planifiée : ce serait une pièce neuve avec son mode de panne. Et un cron ne règle pas « à venir » : une ligne en cycle valide reste exclue des trois prédicats |
| **2** | **La rangée représente toujours l'occurrence OUVERTE ; au dépôt elle roule ; l'historique = les rapports** | GestBAT (avec la prochaine date matérialisée au dépôt) ; c'est la règle Infor « un seul ordre de travail ouvert par plan à la fois », vue du côté ouvert | **Retenu** — voir § 3 |
| **3** | Une définition (`SuiviVerification`) + une rangée par occurrence, ouverte ou close | **Toutes** les GMAO/EAM consultées : IBM Maximo, SAP PM, Infor/HxGN, Oracle Fusion, Fiix, UpKeep, Limble, MaintainX | **La pratique dominante, écartée ici** — voir § 5 pour ce qui la justifierait |
| **4** | Rien de stocké, tout dérivé à la lecture | Les calendriers (RFC 5545, Google), pour les instances non modifiées ; Oracle pour l'horizon lointain, en prévision régénérable | **Écarté.** RFC 5545 matérialise une instance dès qu'elle est touchée (`RECURRENCE-ID`) ; Oracle matérialise les ordres dès qu'ils entrent dans la fenêtre de travail. Le critère est explicite chez les deux : une occurrence se dérive tant qu'elle n'a pas de vécu propre, se stocke dès qu'elle en a. Un contrôle réglementaire a toujours un vécu propre — date réelle, réalisateur, rapport, résultat |

**Sur le statut, convergence complète des sources** : l'état d'une instance
(ouverte, close, son résultat) est un **fait stocké** ; « en retard » est une
**comparaison de dates à la lecture**. Ni les GMAO, ni Fowler, ni PostgreSQL, ni
Microsoft ne soutiennent un statut temporel stocké. Les seuls à l'envisager sont
des forums, en repli, avec la latence pour prix. C'est déjà la position de
l'ADR-011 ; elle est confirmée, et elle vaut pour les options 2 et 3 également.

## 3. La décision : l'option 2, et pourquoi la pratique dominante n'est pas la bonne réponse ici

### Ce qui est retenu

**Une ligne `Verification` par obligation et porteur, qui ne porte plus que
l'échéance ouverte.** Au dépôt d'un rapport, dans la même transaction :

1. le rapport est créé, daté, avec son résultat — c'est lui la réalisation, et
   c'est lui que `D. 4711-3` fait conserver ;
2. il reçoit **l'échéance qu'il honorait**, `echeanceHonoree` = la `datePrevue`
   de la ligne au moment du dépôt — une colonne, aucune table ;
3. la ligne **roule** : `datePrevue` = date du rapport + périodicité calendaire
   (`prochaineEcheance`), `statut` = `planifiee` ou `a_planifier` selon qu'une
   date a été arrêtée, `dateRealisee` n'est plus écrite.

Le résultat « non vérifiable » ne fait rien rouler : un rapport est déposé, la
ligne reste ouverte sur la même échéance — c'est déjà la règle
(`rapports/actions.ts:145-157`), elle devient évidente.

**`archiveLe DateTime?` sur la ligne** remplace le préfixe « Ne s'applique
plus — » dans le libellé. Une obligation qui cesse de s'appliquer marque sa
ligne ; ses rapports ne bougent pas. Les huit surfaces corrigées le 2026-09-10
lisent un champ au lieu d'un `startsWith`.

### Ce que ça rend trivial

| Question | Aujourd'hui | Après |
|---|---|---|
| Cette ligne est-elle en retard ? | trois prédicats, deux gardes, trois classifieurs qui divergent | `archiveLe === null && datePrevue < aujourd'hui` |
| Combien de contrôles faits sur 12 mois ? | `realisees12m` sur la dernière date d'une rangée réutilisée — sous-compte documenté | la dernière réalisation de chaque ligne, lue sur ses rapports (voir l'amendement du 2026-09-12) |
| Quelle est la prochaine échéance ? | `datePrevue` d'une rangée qui porte aussi un fait passé | `datePrevue`, seule date de la ligne |
| Un contrôle a-t-il honoré son échéance ? | non reconstituable | `rapport.echeanceHonoree` vs `rapport.dateRapport` |
| La ligne est-elle archivée ? | préfixe texte, statut gelé | `archiveLe` |
| Les compteurs sont-ils disjoints ? | oui, **parce que** les réalisées sont exclues — c'est le défaut | oui, et c'est l'échéance ouverte qui prime : une ligne compte une fois (amendement du 2026-09-12) |

### Amendement du 2026-09-12 : une ligne compte une fois, et une seule

La rédaction initiale disait « rapports datés dans la fenêtre ». Mesurée, elle
donnait ceci sur un dossier de dix lignes toutes contrôlées, dont trois
échéances dépassées : **treize** éléments au dénominateur et un score de 77,
contre dix éléments et 70 pour le même dossier dont les rapports dataient de
plus d'un an. **Le même retard coûtait moins cher sur un appareil contrôlé
récemment** — parce que sa ligne comptait deux fois, une pour son échéance et
une pour son rapport.

Tranché par la propriétaire : `repartirVerifications` range chaque ligne dans
**un seul** ensemble, et l'échéance ouverte prime — en retard, sans date, ou à
venir sous trente jours d'abord ; `realisees12m` recueille le reste. Compter
les RAPPORTS eux-mêmes a été écarté aussi : une obligation trimestrielle
pèserait quatre fois une annuelle dans un score qui note des obligations.

`lecturesCalendrier`, `etatDuRendezVous`, `classerVerification` dans sa forme
actuelle, la branche « cycle soldé » du réconciliateur, le marqueur dans le
libellé et le statut `depassee` **disparaissent**. Pas corrigés : sans objet.
Le score se corrige de lui-même — il était gonflé par des rendez-vous qu'il ne
voyait pas, et il baissera pour les dossiers dont une échéance est passée.

### Pourquoi pas le modèle complet, alors que sept produits le font

**Parce que l'argument qui le portait est tombé au débat, et qu'il faut le dire
plutôt que le laisser deviner.** La proposition initiale faisait de la « trace
des échéances manquées » la valeur décisive : avec une rangée par occurrence,
un contrôle annuel sauté en 2025 puis fait en 2026 laisse une occurrence 2025
« due le 15/03, réalisée le 10/04/2026 ». La session GestBAT a posé la
question : *quel besoin réel justifie cet historique ?* Réponse, après avoir
cherché :

- **juridiquement, aucun** — `D. 4711-3`, `R. 4323-25`, `R. 4323-26` font tenir
  les rapports, jamais les dates prévues ;
- **le fait est dérivable** : la règle est déterministe (dernière réalisation +
  périodicité), donc l'état à toute date passée se recalcule depuis les rapports
  ; un trou de treize mois entre deux rapports *est* l'échéance manquée ;
- **personne ne le lit** : ni le dossier de conformité PDF, ni la fiche
  d'équipement, ni le registre n'affichent d'échéance prévue passée ;
- et le seul fait non dérivable — une date **convenue à la main** avec le
  prestataire, distincte de la date calculée — tient dans `echeanceHonoree`.

**Les GMAO instancient parce que leurs occurrences portent des faits que Rojer
n'a pas** : un technicien affecté, un coût, des pièces, un temps passé, un ordre
signé. Chaque occurrence *est* un objet métier. Chez Rojer, l'occurrence n'a
qu'un fait, le rapport — et le rapport existe déjà comme objet, daté, avec son
résultat. **L'objet qui mérite une rangée par occurrence, Rojer l'a : c'est
`RapportVerification`.** GestBAT le montre autrement : ses non-conformités
(`Reserve`) sont rattachées au document, donc à l'occurrence, sans table
d'occurrence.

Le second argument de la proposition — « le prix du dérivé non centralisé »,
illustré par les quinze implémentations de « en retard » de GestBAT — est de
l'hygiène de code, pas un argument de modèle. Rojer l'a réglé par l'ADR-011.
Il est retiré de la balance.

### Ce que l'option 2 ne ferme pas, écrit pour ne pas le redécouvrir

- **Une obligation événementielle** (une occurrence par événement : accident,
  modification d'un circuit) n'a pas de place naturelle — mais le produit
  n'observe aucun de ces faits (ADR-026), et le § 5 dit comment y aller.
- **Un rapport antidaté** — plus ancien que le dernier déposé — ne doit pas faire
  reculer la ligne. GestBAT le règle en marquant le document inactif sans toucher
  l'échéance ; Rojer fera pareil : le rapport est conservé et daté, la ligne ne
  bouge que si le rapport est le plus récent.
- **Le ré-ancrage d'une périodicité qui change** sur un cycle ouvert reste le
  constat B de l'audit (`datePrevue` stockée sans son origine) ; il n'est ni
  aggravé ni réglé ici, et `echeanceHonoree` en fournira la trace.

## 4. Ce que deviennent les lots du § 11

| Lot | Après cette décision |
|---|---|
| 0 harnais | indispensable, inchangé |
| 1 écriture conditionnée | **conservé** : la ligne ouverte peut être roulée par un dépôt concurrent ; le `deleteMany` garde ses trois clauses ; la garde du `updateMany` se réduit à `datePrevue` et `statut` lus |
| 2 grain de la clé, adoption, héritage | **conservé** : tout porte déjà sur la ligne unique. L'héritage N→1 date la ligne absorbante depuis le rapport le plus ancien des absorbées — même règle |
| 3 marqueur d'archivage | **supplanté** par `archiveLe` ; le champ requis `libelleObligation` sur `VerificationDatee` perd sa raison d'être |
| 3 bis cycle soldé | **dissous** : il n'y a plus de cycle soldé sur la ligne |
| 4 arithmétique des dates | fait, inchangé — `prochaineEcheance` est ce que le roulement appelle |
| 5 jamais relancé | **dissous** pour le passage du temps : « en retard » est une fonction de la date. Reste le référentiel qui change, déjà couvert par la version |

## 5. Ce qui justifierait le modèle complet, et comment y aller sans perte

Le jour où l'un de ces besoins existe **avec un écran qui le lit**, l'option 3
redevient la bonne : une obligation événementielle observée par le produit ; des
faits propres à l'occurrence autres que le rapport (un prestataire affecté à
l'avance, un coût, un devis) ; une exigence contractuelle ou d'assureur de
montrer les échéances manquées et non seulement les contrôles faits.

**Le passage sera mécanique, pas une migration à risque**, et c'est
`echeanceHonoree` qui le garantit : chaque rapport connaît l'échéance qu'il
honorait, donc les occurrences closes se **reconstruisent par script** depuis
les rapports, et la ligne actuelle devient l'occurrence ouverte. Rien de ce que
l'option 2 écrit n'est à défaire. C'est le point que le débat a établi en
dernier, et il retire le seul coût caché que la proposition initiale prêtait au
« plus tard ».

## 6. Les lecteurs, d'après la lecture exhaustive du 2026-09-10

**Aucun lecteur n'interroge la clé composite** ; la clé, la réconciliation et
`cleDeLigne` ne bougent pas — c'est ce qui rend l'option 2 bon marché.

**Simplifiés** (ils dépliaient à la main les deux vies d'une rangée) :
`calendrier/etats.ts:381` et `:308` (supprimés), `calendrier/page.tsx:413`,
`:567`, `:600`, `:612`, `dashboard/queries.ts:205`, `:299`, `:389`,
`equipements/etat-verifications.ts:138`, `equipements/fiche.ts:145`,
`verifications/[verificationId]/page.tsx:135-153`, `mcp/queries.ts:340-347`,
`:527-533`, `registre/contenu-ailleurs.ts:174-180`, `pdf/builders.ts:29`,
`app/etablissements/[id]/page.tsx:108`.

**À reprendre** (ils lisent `dateRealisee` sur la ligne ; ils liront les
rapports) : `pdf/etat-verifications.ts:84-96` `realisees12m`,
`dashboard/queries.ts:318-326` `derniereRealisee`,
`equipements/etat-verifications.ts:139-144` `derniere`,
`equipements/fiche.ts:253-255` (repli sans rapport — devient inutile, un seul
chemin écrit une réalisation), `verifications/[verificationId]/page.tsx:220`
« Dernière : … », `mcp/queries.ts:340` `etatDe` « realisee »,
`dashboard/queries.ts:637-641` (la borne SQL des 12 mois passe sur
`RapportVerification`). Et les huit lecteurs du marqueur, vers `archiveLe`.

**Indifférents** : `auth/scope.ts`, `signatures/appartenance.ts`,
`acces/[token]/page.tsx`, `actions/queries.ts`, `rapports/queries.ts`,
`calendrier/echeances.ts:529`, `registre/page.tsx`, `batiments/queries.ts`,
`calendrier/retards.ts`, et les compteurs de rangées (`nbVerifs`, MCP, pilules)
— la rangée reste « une par obligation × porteur », leur sens ne change pas.

## 7. Le plan, en lots

Chacun rayé et daté au commit qui le ferme, dans le § 11.

- ~~**N1 — Le schéma**~~ — **fait le 2026-09-11**, branche
  `adr034-ligne-ouverte` : `Verification.archiveLe DateTime?`,
  `RapportVerification.echeanceHonoree DateTime?`. Migration SQL écrite à la
  main (`20260911120000_ligne_ouverte_archive_echeance_honoree`), jouée sur le
  Postgres Docker local, jamais sur Supabase. Rétro-remplissage
  : `archiveLe = updatedAt` pour les lignes dont le libellé porte le marqueur —
  vérifié en jouant la migration sur un jeu de lignes inséré dans la base
  locale (vide par ailleurs) : une ligne au préfixe exact remplie, une ligne
  ouverte et une ligne au tiret simple laissées nulles ; la relecture l'a
  rejouée deux fois — la seconde passe ne touche rien. `echeanceHonoree`
  laissée nulle pour l'existant. **Un écart au plan, et il est voulu** : la
  réconciliation écrit déjà `archiveLe` avec le préfixe, et le remet à `null`
  quand une ligne redevient attendue. Sans cela, entre N1 et N3, toute ligne
  archivée entre-temps aurait le préfixe sans la date, et le N3 hériterait d'une
  divergence à rattraper.
- ~~**N2 — Le dépôt fait rouler**~~ — **fait le 2026-09-11**. `rapports/actions.ts`
  écrit `echeanceHonoree` (= la `datePrevue` lue) et roule la ligne dans la
  transaction : `datePrevue` = date du rapport + périodicité, statut
  `planifiee` — le résultat vit sur le rapport. L'écriture sur la ligne est
  conditionnée sur `datePrevue` et `statut` lus (lot 1) ; un dépôt concurrent
  fait annuler la transaction et rend une erreur à recommencer. Le rapport
  antidaté — plus ancien **ou du même jour** qu'un rapport réalisé déjà déposé —
  entre au registre sans `echeanceHonoree` et ne roule pas. La suppression du
  rapport réalisé le plus récent recule la ligne à son `echeanceHonoree` ; à
  défaut (rapport d'avant N2) à l'échéance qu'engendre le rapport réalisé
  précédent ; à défaut elle garde sa date et rouvre son cycle. Retirer un
  rapport antidaté ou non vérifiable ne touche pas la ligne. Le réconciliateur
  a perdu sa branche « cycle soldé » ; sept mutations jouées, chacune rouge.
  **Trois écarts au plan, écrits :**
  1. ~~`dateRealisee` reste écrite jusqu'à N4~~ — **retiré le même jour, sur
     décision de la propriétaire** : une double vérité pendant deux lots ne
     valait pas le confort. `dateRealisee` n'est plus écrite ; la dernière
     réalisation se lit sur le dernier rapport réalisé
     (`lib/rapports/derniere-realisation.ts`, pur, et
     `joindre-realisations.ts` pour la jointure en une requête). Les
     lecteurs « à reprendre » du § 6 sont passés dessus dans le même
     mouvement : `lecturesCalendrier` et `repartirVerifications` exigent le
     champ `derniereRealisation` — l'oubli ne compile pas —, et la fiche de
     vérification, le tableau de bord (pastilles, barres, fenêtre des 12
     mois), le registre et le serveur MCP le lisent. La colonne n'est plus
     qu'un **repli** pour une ligne d'avant sans rapport ; la réconciliation
     l'éteint en l'écrivant à `null`, et la suppression du dernier rapport
     aussi. **Ce que ça change à l'écran, et c'est le but** : une échéance
     passée sur un appareil déjà contrôlé se lit en retard — le lot 3 bis —,
     donc le score bouge. La mesure demandée plus bas reste à produire avant
     de fusionner.
  2. Le réconciliateur garde **deux branches** sur une ligne réalisée. Le
     **rattrapage** d'une ligne d'avant N2 — cyclique au statut réalisé, ce
     qu'aucune ligne roulée par N2 ne porte plus — la met au modèle en une
     passe. Et le **ré-ancrage sur changement de périodicité** : sans lui, la
     ligne du centre de formation de GE 4 § 1 ne reculait plus de 2028 à 2030
     (`continuite-identite` rouge), et une prescription d'assureur n'aurait eu
     d'effet qu'au dépôt suivant. La branche ne s'ouvre que si le pas a changé
     et qu'une réalisation est connue ; N5 lira cette réalisation sur le
     dernier rapport réalisé.
  3. Une obligation **sans rendez-vous suivant** garde, seule, un statut réalisé
     sur sa ligne : il n'y a pas d'échéance suivante à ouvrir. N3 devra en tenir
     compte dans « en retard » — `datePrevue` passée et statut réalisé n'est pas
     un retard.
- **Corrections du 2026-09-12**, après relecture à trois : la suppression d'un
  rapport qui n'est pas le dernier **transmet son échéance honorée** au suivant
  (sans quoi supprimer deux rapports du plus ancien au plus récent laissait la
  ligne sur une échéance future, sans pièce — le retard blanchi) ; un rapport
  **daté dans le futur** est refusé ; la branche du placeholder ne s'ouvre que
  si rien n'a été contrôlé ; une périodicité devenue **ponctuelle** solde une
  ligne roulée au lieu de la laisser courir ; le repli sur la colonne gelée est
  borné aux lignes **sans rapport** ; un statut réalisé compte comme trace,
  côté plan comme dans la clause SQL du `deleteMany` ; le serveur MCP, la fiche
  et le registre lisent le **statut** et non la colonne éteinte ; la tuile
  « fait le » porte le résultat de son rapport.
  ~~**Reste ouvert APRÈS le N3**~~ — **fermé le 2026-09-12** par les
  corrections de la relecture, ci-dessous : une obligation qui passe en
  `periodicite: "autre"` cesse d'être générée, donc sa ligne ne repasse jamais
  par `aMettreAJour`. Elle a désormais son chemin à elle, `plan.aDesarchiver`.
  Ce qui reste vrai, et qui n'est pas un défaut : une telle ligne garde
  l'échéance ouverte que son dernier dépôt a posée. Elle n'a plus de rythme,
  donc plus rien ne la fera rouler ; c'est l'écran « Ce qui doit être en
  place » qui la porte (ADR-027), pas le calendrier.
- **Corrections du 2026-09-12, second tour** — la relecture de contrôle a
  rouvert le défaut bloquant : la transmission au seul successeur, et la règle
  « la plus tardive des deux dates » au moment de rouvrir, PERDAIENT l'échéance
  d'origine dès qu'un rapport antidaté traînait dans la chaîne. Trois rapports,
  six ordres de suppression : deux finissaient sur une échéance de 2027 sans
  aucune pièce. Désormais l'échéance d'origine **redescend vers le rapport le
  plus ancien** — celui qui restera le dernier — et la réouverture prend
  l'échéance qu'engendre le dernier contrôle encore prouvé, à défaut celle que
  le retiré honorait. L'invariant est éprouvé sur les six ordres.
  Deux autres corrections : la branche « ponctuelle » d'une ligne d'avant
  l'ADR-034 **garde sa colonne** — seule trace du fait, faute de rapport — et
  reprend son propre statut, sinon la régénération écrivait deux fois avant de
  se stabiliser (mesuré sur la base locale) ; et les cartes **« Rapports 12 m »**
  comptent désormais de vrais rapports (`compteurs.rapports12m`), le compte de
  LIGNES qu'elles affichaient tombant à zéro sur un dossier tenu à jour dont
  toutes les échéances sont proches.
- ~~**N3 — Les prédicats**~~ — **fait le 2026-09-12**, à quatre (trois agents
  sur des périmètres disjoints, plus le cœur). `VerificationDatee` exige
  `archiveLe`, `estVerificationArchivee` le lit, et les trois prédicats
  cessent de lire `dateRealisee` — seul un statut réalisé purge une échéance,
  et il n'en reste que sur une obligation sans rendez-vous suivant. `estRealisee`
  suit. La migration `20260912090000_archivage_par_champ` retire le préfixe des
  libellés, la date d'abord, le texte ensuite ; vérifiée sur la base locale, y
  compris rejouée. `marqueur.ts` n'est plus qu'une constante, citée par les deux
  migrations et leur garde. **Quatre trouvailles à garder en tête :**
  1. **`undefined !== null` est un piège muet** : un `select` qui oublie
     `archiveLe` faisait lire TOUTE ligne comme archivée — les trois compteurs
     à zéro, l'écran vide, sans un mot. Deux relectures s'y sont prises le même
     jour. `estVerificationArchivee` compare donc en `!=` : l'absence se lit
     « ligne ouverte », un état visible plutôt qu'un silence.
  2. **Un défaut réel, masqué par le préfixe** : `identique` ne comparait pas
     l'archivage, et le préfixe vivait dans un champ qu'elle lit. Une ligne
     redevenue applicable, alignée par ailleurs, repartait « inchangée » et
     restait barrée à perpétuité. `identique` compare `archiveLe`.
  3. **Le filtre d'archivage du PDF est parti** : depuis que les prédicats
     lisent le champ, il redisait la même chose, et aucun test ne pouvait le
     tenir seul.
  4. **Trois tests changeaient de réponse** — « une occurrence réalisée n'est
     jamais en retard » n'est plus vrai d'une ligne roulée. Réécrits sur la
     règle neuve, commentaire à l'appui, jamais supprimés en silence. Un
     `describe` entier a disparu : il éprouvait les fonctions du marqueur, qui
     n'existent plus.
- **Corrections de la relecture de N3, le 2026-09-12.** Un bloquant et deux
  manques, tous trois tenus par des tests neufs (sept mutations, chacune rouge) :
  1. **Le registre de sécurité était une neuvième surface**, et le lot lui avait
     retiré son seul signal. Ses 49 fiches — écran et PDF — recevaient le statut
     GELÉ d'une ligne éteinte, donc « En retard » en rose sur un document remis
     à une commission. Le préfixe le disait avant la migration ; plus rien ne le
     disait après. `VerificationTenue` porte `archiveLe`, la fiche annonce
     « ne s'applique plus depuis le … », ne promet aucune prochaine échéance et
     ne peint plus de pastille — la preuve du contrôle, elle, reste affichée.
  2. **Le désarchivage n'avait qu'un chemin.** Une obligation qui n'engendre
     plus de rendez-vous n'arrive jamais par `aMettreAJour` : sa ligne restait
     barrée à perpétuité, et le plan la comptait « inchangée ». Elle a désormais
     `plan.aDesarchiver`, appliqué dans la même transaction.
  3. **La clause d'archivage de la page d'établissement n'était tenue par aucun
     test** — une page serveur n'en a pas, et son retrait laissait la suite
     verte. Elle vit dans `portee.ts` sous le nom `echeancesAnnoncables`, avec
     deux tests.
- **N3, la version d'origine** : `retard.ts` cesse de lire `dateRealisee` ;
  `estVerificationArchivee` lit `archiveLe` ; `classerVerification` et le
  vocabulaire perdent `archivee`-par-préfixe. Le préfixe est retiré des libellés
  par la migration. **Et la réconciliation doit lire `archiveLe`** (relecture
  de N1) : `generateur.ts` ne détecte aujourd'hui une ligne archivée que par
  son libellé préfixé — dans le `select` de `calendrier/actions.ts` et dans le
  test `identique` du plan. Le préfixe retiré, une ligne archivée dont
  l'obligation redevient applicable à champs identiques serait comptée
  « inchangée » et resterait archivée pour toujours. Ajouter `archiveLe` au
  `select` et `ex.archiveLe === null` à `identique`, avec le test qui rougit
  sans.
- ~~**N4 — Les lecteurs**~~ — **fait le 2026-09-13**. La moitié « à reprendre »
  l'était depuis N2 (écart 1) ; c'est la moitié « simplifiés » qui est faite
  ici. `etatDuRendezVous` est **supprimée** — pas allégée : sa branche utile
  exigeait « classée faite » ET « cyclique », et depuis le N3 une ligne n'est
  classée faite que sur un STATUT réalisé, qui ne subsiste que sur une
  obligation SANS rendez-vous suivant. Les deux conditions ne peuvent plus être
  vraies ensemble ; la fonction rendait exactement `classerVerification`.
  `lecturesCalendrier`, elle, **survit et change de forme** : la lecture
  `prochaine` disparaît du type, et il ne reste que `realisation` (le contrôle
  fait, lu sur le dernier rapport) et `courante` (l'échéance ouverte, classée
  comme n'importe quelle date). Les appelants qui dépliaient à la main classent
  désormais la ligne : la fiche d'équipement, les statistiques par appareil du
  tableau de bord, la page de vérification.
  **Deux garanties que rien ne tenait, trouvées par mutation et non par
  lecture**, toutes deux sur le tableau de bord — la seule des neuf surfaces
  dont l'exclusion des lignes éteintes ne rougissait aucun test :
  1. une ligne **archivée** pesait sur les pastilles de la carte d'un appareil.
     Son statut est gelé sur « dépassée », donc la carte comptait un retard à
     perpétuité sur une obligation qui ne s'applique plus — le défaut que le
     registre de sécurité imprimait (`e450ea4`), sur un autre écran ;
  2. une ligne **sans date arrêtée et future** pouvait être annoncée comme
     « prochaine échéance ». Le cas passé était couvert par la garde du retard ;
     le cas futur ne tenait qu'à la lecture du statut, et rien ne la tenait.
  Six mutations jouées, puis deux de plus après correction : chacune rouge sur
  le test attendu. ~~2404 tests~~ — **2598** : le chiffre était celui du seul
  sous-ensemble `src/lib`, publié comme total (relecture).
  **Trois tests décrivaient un monde disparu** — « le rendez-vous suivant d'un
  cycle soldé » — et six ont été réécrits sur le modèle neuf, jamais supprimés
  en silence. ~~L'un d'eux nomme une conséquence qu'il faut connaître : une
  rangée d'AVANT l'ADR-034, encore gelée sur un statut réalisé avec une
  `datePrevue` future, ne pose plus que son fait — sa date future sort du
  calendrier jusqu'à la régénération, qui la ré-ancre. La perte est bornée à
  cet intervalle.~~ **FAUX, et retiré par les corrections ci-dessous** : la
  perte n'était bornée par rien — seule la page calendrier régénère —, elle
  touchait quatre surfaces et non une, et le cas à date PASSÉE, non écrit,
  rendait « faite » une échéance en retard de six mois. La justification de la
  suppression d'`etatDuRendezVous` (« elle rendait exactement
  `classerVerification` ») était fausse sur toute ligne écrite avant N2.
- **Corrections de la relecture du N4, le 2026-09-13** — deux sessions
  neutres, angle code et angle tests ; deux bloquants, cinq gardes non tenues,
  zéro faux positif. Solution choisie par la propriétaire après lecture, en
  lecture seule, du modèle de GestBAT — qui n'a AUCUN statut stocké : le
  retard y est `nextDeadline < now`, et rien ne peut l'éteindre.
  1. **La règle, écrite une fois** (`lib/dates/retard.ts`,
     `estVerificationRealisee`) : *un statut réalisé ne purge une échéance que
     sur une obligation SANS rendez-vous suivant*. Sur une obligation
     périodique, la date décide — « réalisé » y dit qu'un contrôle a eu lieu,
     jamais que le suivant n'est pas dû. La rangée d'avant l'ADR-034 (statut du
     contrôle passé, rendez-vous suivant dans `datePrevue`) se lit donc comme
     une ligne roulée, par sa date, sans attendre qu'une migration la remette
     au modèle ; et la suppression d'`etatDuRendezVous` devient juste PAR
     CONSTRUCTION. `periodicite` est requis sur `VerificationDatee` : le
     compilateur a énuméré les cinquante-neuf lecteurs à mettre à jour, c'est
     lui la propagation. Deux notions, deux fonctions : `estStatutRealise`
     (le FAIT — historique, « faite le ») et `estVerificationRealisee` (l'état).
     Le pendant SQL, `echeanceAttendue()` (`portee.ts`), remplace trois listes
     locales de statuts (préfiltre du tableau de bord, `urgenceSeule`,
     `echeancesAnnoncables`), et un test mesure son accord avec le prédicat
     sur chaque statut × chaque rythme.
     **Deux trouvailles de la suite, pas de la lecture** : les prédicats ne
     comparaient la date que sous `planifiee`/`a_planifier` — une rangée
     gelée y rendait `false` ; `statutLu` la lit « planifiée ». Et le piège
     `undefined` de N3, sur ce champ : `estCyclique(undefined)` tient
     l'inconnu pour ponctuel — prudent pour DATER, fatal pour PURGER, un
     magasin simulé sans `periodicite` faisait purger chaque statut réalisé.
     Seuls les deux rythmes sans suite, nommément, purgent.
  2. **Bloquant 1** — `aDesarchiver` rouvrait la ligne archivée d'un appareil
     dès qu'un AUTRE appareil déclenchait la même obligation :
     `obligationsEncoreApplicables` était un ensemble d'identifiants valable
     pour tout l'établissement. Il est fait de clés obligation × porteur
     (`cleApplicabilite`, via `equipementsConcernes`) ; le jumeau — ligne
     jamais archivée quand l'autre appareil existait déjà — tombe avec.
     La réouverture est conditionnée sur « encore archivée », et `updated`
     la compte, comme son commentaire l'affirmait à tort.
  3. **Dixième surface** : la fiche de vérification ne lisait pas `archiveLe`
     — « À planifier », pastille gelée et formulaire de dépôt sur la page où
     mène le lien « ne s'applique plus depuis le … » du registre. Elle dit
     l'extinction. La pastille du registre lit l'état du jour, plus le statut
     stocké ; « faite le X · faite le X » sur une ligne d'avant est corrigé.
  4. **Tests** : cinq gardes que la mutation ne faisait pas rougir en ont une
     ; les fixtures d'origine « rangée soldée » reviennent (fiche, parc,
     calendrier) et passent par la règle ; chaque fixture « réalisée » dit
     désormais son rythme, et celles qui voulaient dire « consommée » le
     disent. Deux pages serveur sont tenues par un test qui lit leur source.
     **2618 tests**, suite complète. Banc de dix-huit mutations : trois
     survivaient, quatre tests écrits, toutes rouges ; le faux Prisma du
     tableau de bord ignorait `notIn` et refuse désormais tout opérateur non
     interprété.
  5. **Relecture externe des corrections** (sous-agent neutre, même jour) :
     trois bloquants, trois majeurs, zéro faux positif après vérification.
     - **« Conforme » peint à côté d'un retard** sur trois surfaces (registre
       PDF, ligne du calendrier, fiche de vérification) : elles peignaient le
       statut STOCKÉ. Une table, `statutDuRegistre` (`etats.ts`) : l'état du
       jour donne le statut à peindre — `statutAffiche` pour une ligne,
       `statutDeLaLecture` pour une lecture.
     - **La rangée gelée JAMAIS ROULÉE** : avant N2, le dépôt n'avançait pas
       `datePrevue`, la régénération le faisait ; si elle a échoué, la ligne
       garde l'échéance honorée, et la règle neuve la lisait en retard sur un
       contrôle fait. Tranché par la propriétaire : son échéance ouverte se
       CALCULE — `echeanceOuverte` (`retard.ts`), `dateRealisee` + le rythme,
       exactement ce que la régénération aurait écrit. Lue par les prédicats,
       le classement, les lectures du calendrier, et par chaque surface qui
       affiche la date (fiche, parc, widgets, registre, PDF, MCP,
       recommandations). Le SQL ne sait pas la dire : `urgenceSeule` est un
       sur-ensemble, que `listerVerifications` repasse au prédicat.
     - **Dépôt proposé sur une ligne éteinte**, et accepté par le serveur, qui
       faisait rouler une ligne archivée : refusé dans `uploadRapport`, masqué
       sur la fiche. Le test qui lisait le source cherchait des sous-chaînes
       présentes dans un commentaire ; il lit le code, commentaires retirés.
     - `urgenceSeule` COMPOSE `echeanceAttendue` au lieu de la recopier, et un
       test mesure son accord avec le prédicat sur 96 cas ; la construction
       des clés d'applicabilité est une fonction pure, testée.
     - L'assistant MCP reçoit la réalisation ET l'échéance.
     Neuf mutations, chacune rouge sur son test, jouées fichier par fichier sur
     un worker. **2632 tests.**
     **Seconde relecture externe, sur ces corrections** — un bloquant, quatre
     points moyens, zéro faux positif :
     - `echeanceOuverte` ne calculait que si `datePrevue ≤ dateRealisee`, et
       laissait en retard le contrôle fait EN AVANCE et la ligne déclarée puis
       contrôlée. Elle calcule désormais réalisation + rythme sur TOUTE rangée
       réalisée d'une obligation périodique — exactement la branche de
       rattrapage du réconciliateur, si bien que rien ne change d'état à
       l'ouverture du calendrier ;
     - les cinq « Prochaines échéances » se choisissent sur l'échéance ouverte
       (`cinqProchaines`, plus de `take` sur la colonne) ; les barres par mois
       ne perdent plus l'échéance calculée d'une colonne d'une autre année ;
       le registre PDF et la liste MCP sont triés sur l'échéance imprimée ;
     - le dépôt est conditionné sur `archiveLe: null` à l'écriture (un
       archivage concurrent passait), et l'échéance honorée enregistrée est
       l'échéance ouverte, plus la colonne ;
     - six garanties que la mutation ne faisait pas rougir (dates du
       calendrier, du MCP, du parc, des cartes, de la fiche, top 5) en ont un.
     Onze mutations, rouges. **2643 tests.**
     **Laissé ouvert, écrit** : les lignes restées ancrées sur un appareil
     alors que leur obligation est passée à l'établissement (registre de
     sécurité, consigne, exercices) seront archivées « ne s'applique plus » à
     la prochaine régénération — vrai pour l'appareil, et leurs rapports
     restent visibles, mais la nouvelle ligne d'établissement n'en hérite pas
     faute de succession par changement de porteur. À instruire avec le lot 2
     du § 11.
  6. **Reste ouvert, écrit** : une ligne rouverte par `aDesarchiver` garde sa
     périodicité, sa date et son statut gelés (relecture, NB4) — réaligner
     ces lignes dans le réconciliateur plutôt que filtrer chez les lecteurs,
     ce qui suppose que l'ensemble d'applicabilité porte l'obligation et non
     sa clé. Cas hypothétique sur ce référentiel, à traiter avec N5. Et la
     migration de remise au modèle des rangées gelées devient un NETTOYAGE,
     non une condition : c'est la première étape de N5, avec les exclusions
     relevées (lignes `datePrevue ≤ dateRealisee` laissées au réconciliateur,
     non cycliques, archivées, titres salariés, borne au jour civil Paris).
- **N5 — Le nettoyage.** Le plan d'origine disait : « `dateRealisee` retirée
  (elle ne sera plus écrite), `depassee` retiré de l'enum ou laissé mort et
  documenté, `VerificationDatee.libelleObligation` redevenu optionnel, ADR-012
  annotée, durée de `D. 4711-3` affichée au registre ». **Deux de ses prémisses
  étaient fausses**, établies en lisant le code le 2026-09-13 :
  1. **`depassee` n'est pas mort.** Il est écrit à la génération
     (`generateur.ts`, trois sites), au dépôt « non vérifiable » et à la
     suppression d'un rapport, et lu par `estVerificationEnRetard`. Il reste,
     vivant. Le retirer supposerait que le retard ne se lise plus que sur les
     dates — une autre décision. **Prise par la propriétaire le 2026-09-14,
     alignée sur GestBAT (aucun statut stocké), et menée en deux
     déploiements** — un retrait en base ne passe jamais avant le code qui
     cesse de lire, le build Vercel migrant avant de compiler :
     - ~~**phase A**~~ (`lot/retrait-depassee`) : plus aucune écriture ; le
       retard est la date, et elle seule ; une ligne encore tamponnée se lit
       « à planifier » (`statutLu`) et la régénération la réécrit ainsi, une
       fois. Deux lectures recopiées sont tombées en chemin : la clause SQL
       d'urgence (`statut depassee OR date passée` → date passée) et
       `classerVerification`, qui relisait le statut brut. **Une garde
       neuve**, trouvée par un test existant : la branche « placeholder » du
       réconciliateur remplaçait la date de tout « à planifier » sans
       réalisation ; le tampon du lendemain l'en faisait sortir, sans lui un
       rendez-vous MANQUÉ aurait reçu une date future — le retard effacé. Elle
       exige désormais une date non passée. Le reliquat « mise en service,
       passage 1 ≠ passage 2 » tombe avec : plus rien à retamponner. Trois
       mutations rouges. 2630 tests, `next build` vert.
       **Relecture neutre de la phase A** — une confusion de sens, trouvée par
       scénario : sans le tampon, `a_planifier` en portait deux, « aucune
       échéance connue » et « vraie échéance, passée », et trois affichages
       (carte « aucune vérification enregistrée », date masquée au calendrier,
       widget des échéances) lisent le premier. **Règle posée : le statut dit
       si la date est une VRAIE échéance** — `a_planifier` : aucune, la date
       est celle de la génération ; `planifiee` : une échéance connue, passée
       ou non. Le générateur la suivait déjà ; trois écritures la violaient et
       sont corrigées — un tampon recouvrant un contrôle réel se relit
       « planifiée » ; un dépôt « non vérifiable » ne touche plus le statut
       (un tampon s'y relit comme à la régénération, sur le contrôle réel).
       Les tests de concurrence ont regagné leur assertion de statut.
       **Relecture de contrôle** : une suppression qui rendait l'échéance
       honorée l'écrivait « planifiée » — or `echeanceHonoree` ne dit pas si
       cette date était réelle ou la date de génération d'un « à planifier »
       roulé, et la carte annonçait alors « échéance dépassée » sur l'âge du
       dossier. **Quand plus aucun rapport ne reste, la ligne revient « à
       planifier »**, en retard par sa date : compteurs, score et filtres la
       comptent, seul l'affichage de la date s'efface ; la garde placeholder
       l'empêche ensuite de recevoir une date plus tardive. Cinq mutations
       rouges sur le lot. 2634 tests. **Limite écrite** : un « à planifier »
       dont la date de génération est passée ne reçoit plus la première
       échéance calculée d'une mise en service déclarée après coup — la garde
       ne distingue pas une date de génération d'un rendez-vous manqué, et
       préfère ne jamais effacer un retard ;
     - ~~**phase B**~~ (`lot/retrait-depassee-b`, A déployée en production le
       2026-09-14, `a7c80fd`) : migration
       `20260914120000_retrait_statut_depassee` — `depassee → planifiee` si
       la ligne porte un rapport réalisé, `a_planifier` sinon (un rapport
       « non vérifiable » seul ne compte pas), puis l'enum recréé à cinq
       valeurs, dans un bloc qui ne s'exécute que tant que la valeur existe.
       Rejouée deux fois sur le Docker local, cinq rangées fabriquées :
       trois réécrites, deux intouchées, second passage sans effet. Le code
       perd la lecture du tampon (`statutLu`, `statutCycleOuvert`, dépôt
       « non vérifiable », liste SQL d'`echeanceAttendue`). **Le type
       d'affichage est séparé du type stocké** : `StatutPeint` =
       `StatutVerification | "en_retard"` (`etats.ts`) — la pastille, le
       registre PDF, les fiches tenues ailleurs et la vue par équipement
       peignent un état du jour, et « en retard » n'a plus de valeur en base
       pour exister à l'écran. Six tests du tampon retirés — ils éprouvaient
       des lignes que la migration a fait disparaître —, les fixtures
       « dépassées » sont des échéances `planifiee` passées. 2628 tests,
       `next build` vert. Fusionnée et déployée le 2026-09-14 (`b4b2eb6`).
     - **Relecture du système entier sur le modèle GestBAT** (lecture seule de
       `~/GestBAT`), le même jour. Verdict : ALIGNÉ sur le cœur — une date
       ouverte, le retard sur la date seule, le dépôt roule, la suppression
       recule, la réalisation se lit sur les rapports, aucun statut de retard
       stocké ; Rojer dérive même la dernière réalisation que GestBAT stocke.
       **Un désalignement, corrigé dans `lot/date-de-generation`** : « la date
       est-elle une vraie échéance ? » se lisait tantôt sur le statut, tantôt
       sur le classement, et six surfaces — fiche de vérification, widget des
       échéances, fiche équipement, registre, colonne « Échéance » des deux
       PDF, assistant MCP — imprimaient la date de GÉNÉRATION d'une ligne « à
       planifier » en retard comme une échéance manquée (« en retard de 13 j »
       = l'âge du dossier). `aUnRendezVous` lit désormais le statut ; la ligne
       reste EN RETARD, sans date ni jours à montrer. Une quinzaine de
       commentaires qui décrivaient l'ancien modèle au présent sont rectifiés.
       Une mutation (prédicat relu sur le classement) fait rougir cinq tests.
       **Relecture neutre du lot C** : le premier commit annonçait « sur
       aucune surface » — c'était faux de quatre. La vue par équipement du
       calendrier (« Dépassée de 13 j »), les barres de l'année, la frise et
       la grille (le filtre lisait le ton `warn`, une « à planifier » en retard
       a le ton `alerte`) et le widget « Prochaine échéance » plaçaient encore
       la date de génération ; la fiche équipement, triée sur la seule date,
       rangeait le retard sans date APRÈS une échéance lointaine (« attendue
       dans 182 jours » à côté de « 1 en retard ») ; cinq formulations
       différentes pour la même ligne. Corrigé : chaque surface qui place ou
       décompte une date passe par `aUnRendezVous` (`sansEcheance` sur
       l'événement de fenêtre) ; la fiche range le retard en tête, sans date
       d'abord, et son délai est une fonction pure testée (`libelleDelai`) ;
       deux phrases partagées au lieu de cinq (`LIBELLE_SANS_ECHEANCE`,
       `LIBELLE_AUCUNE_VERIFICATION`) ; les PDF rangent les lignes sans
       échéance en tête. **Une règle de données en plus** : une ligne
       « à planifier » qui porte un rapport réalisé — héritée d'avant la
       phase A, où un « non vérifiable » requalifiait la ligne — a une
       échéance connue ; `statutCycleOuvert` la passe « planifiée », et la
       migration `20260914140000_a_planifier_avec_controle` remet l'existant
       au modèle (rejouée deux fois sur le Docker local, six rangées : une
       réécrite, cinq intouchées). Quatre mutations rouges. 2639 tests.
       **Relecture de contrôle** : tout fermé, aucune régression. Deux
       affirmations ci-dessus sont trop larges et restent OUVERTES, mineures :
       les widgets Semaine et Météo posent encore une ligne « à planifier » À
       VENIR sur son jour (antérieur au lot, compteurs justes), et « À
       planifier » / « à dater » subsistent pour les lignes non en retard. Trois
       autres écarts mineurs, écrits pour un prochain lot : l'en-tête du mois
       du calendrier ne compte pas une ligne en retard sans date (ni « datée »
       ni « à planifier ») ; ~~le widget « Prochaine échéance » filtre après la
       coupe à cinq et peut dire « sans échéance connue » quand cinq lignes
       sans échéance précèdent une vraie~~ — fermé le 2026-09-14 : la page choisit la prochaine échéance
       connue sur la liste entière, avant la coupe (`echeancesDuTableauDeBord`),
       et le widget la lit dans le bundle ; les cinq prochaines sont
       inchangées. **Toujours ouvert** : la vue par équipement désigne le
       retard daté, la fiche le retard sans date, pour le même appareil.
       **Relecture neutre de ce lot** : aucun compteur ni score ne bouge, mais
       l'anneau « Obligations de l'année » additionnait les contrôles faits —
       désormais un par rapport — aux échéances dans un même total en
       pourcentages : une alarme hebdomadaire à 36 rapports faisait passer le
       retard de 50 % à 5 %. L'anneau porte désormais les seules échéances,
       les contrôles faits sont comptés à part, et l'infobulle des barres dit
       « contrôles faits · échéances à venir · en retard » au lieu de
       « obligations ». Test de rendu, mutation rouge.
       **Laissé ouvert, écrit** — hors du chantier, chacun son lot :
       ~~l'échéance d'un titre de salarié vit en deux endroits
       (`TitreSalarie.echeanceLe` pour la page Équipe, `Verification.datePrevue`
       pour le calendrier et le score : une VIP de 2020 sans date de fin est
       « en retard » au calendrier et « à planifier » sur Équipe)~~ — fermé le
       2026-09-14 : une fonction pure,
       `echeanceDuTitre` (`src/lib/salaries/echeance.ts` — la date saisie, sinon
       la délivrance plus la périodicité par `prochaineEcheance`, sinon rien),
       lue par le générateur, par `classerTitre` — qui prend désormais le titre
       et son rythme, jamais une date nue — et par `compterTitresEnRetard`, dont
       le filtre SQL `echeanceLe: { not: null }` écartait les VIP du badge du
       rail ; la fiche d'une personne affiche l'échéance calculée, le dit
       (« Échéance calculée dépassée », « délivrance + quinquennale ») et le
       titre d'une personne SORTIE ne réclame plus rien (« archivée », comme
       au calendrier et au badge). Aucune migration. Seul écart restant, assumé
       et testé : un titre dont l'obligation a quitté le référentiel reste échu
       sur Équipe, sans ligne au calendrier. ~~La
       « prochaine échéance » d'un appareil se calcule deux fois (tableau de
       bord sans les retards, vue équipement avec)~~ — fermé le 2026-09-14 :
       une définition,
       `prochaineEcheanceConnue` (la plus ancienne échéance CONNUE non réalisée,
       retard daté compris ; une « à planifier » ne fournit aucune date), lue par
       les deux ; la vue équipement retenait en plus la date de génération d'une
       « à planifier » en retard ; ~~la barre « couvert » du tableau de bord ne
       lit que le dernier rapport~~ — fermée le même jour : chaque rapport
       réalisé compte au mois de sa `dateRapport` (`repartirParMois`), les
       segments « à venir » et « retard » inchangés, une seule lecture en base.
       **Décisions possibles,
       sans effet sur les données** : dériver des rapports le statut réalisé
       des ponctuelles ; marquer au dépôt si l'échéance honorée était réelle ;
       horizon « proche » à 14 ou 30 jours selon le rythme, comme GestBAT.
  2. **`dateRealisee` n'est pas une colonne morte.** Le réconciliateur la
     PRÉSERVE quand elle est la seule trace d'une obligation consommée sans
     rapport, et depuis les corrections du N4, `echeanceOuverte` en DÉPEND :
     elle calcule l'échéance des rangées gelées depuis elle. La retirer
     suppose d'abord de remettre ces rangées au modèle — ce qui perd la DATE
     des contrôles sans rapport au dossier (le fait, lui, survit dans le
     statut). **Tranché par la propriétaire le 2026-09-13** : les données de
     production sont fictives, on ne préserve rien — si le code est propre,
     on re-seed. ~~**La colonne est retirée**~~, migration
     `20260913120000_ligne_ouverte_retrait_date_realisee` : les rangées gelées
     sur un statut réalisé avec un rythme (`periodicite` hors
     `mise_en_service_uniquement` et `autre`) repassent `planifiee` — leur
     `datePrevue` porte déjà le rendez-vous suivant —, les ponctuelles
     consommées gardent leur statut, qui est leur seule preuve, puis
     `DROP COLUMN IF EXISTS`. Rejouée deux fois sur le Docker local avec huit
     rangées fabriquées : trois mises à jour, cinq intouchées, second passage
     sans effet. **Avec elle est parti tout ce qui la tolérait** :
     `echeanceOuverte` et les projections qui la recopiaient (tableau de bord,
     registre, PDF, MCP, page d'établissement — le tri en SQL et le `take` du
     top 5 reviennent à `cinqProchaines` après projection, la borne ne dépend
     plus d'un calcul), la branche « rattrapage » du réconciliateur, le repli
     sur la colonne dans la suppression d'un rapport, les fixtures et les
     tests des « rangées d'avant l'ADR-034 » — il n'y en a plus, par
     construction. `estVerificationRealisee` et `echeanceAttendue` gardent la
     règle du rythme : elle n'est pas une tolérance, c'est la définition d'une
     ligne réalisée. `scripts/mesure-score-adr034.ts` garde son propre type
     avec la colonne, il modélise l'ancien modèle pour le mesurer. 2623 tests.
     **Relu par un sous-agent neutre le même jour** (`52a3a1d` + `2d253d5`,
     accord SQL/TS vérifié cas par cas, tests supprimés confrontés à ce qui
     les remplace) : rien de bloquant, aucune régression ; trois mineurs
     corrigés — l'historique d'un appareil date une ponctuelle sans rapport de
     son ÉCHÉANCE et le dit désormais ; l'en-tête de la migration écrit qu'elle
     ne filtre pas sur `archiveLe` et ce que ça coûte (une archivée gelée sans
     rapport devient supprimable à la régénération) ; le troisième témoin de
     `portantUnePreuve` ne naît d'aucun flux du produit — retirer le dernier
     rapport d'une ponctuelle la ROUVRE —, seul un seed le fabrique, et les
     commentaires le disaient à l'envers. Vingt-cinq commentaires qui
     décrivaient encore la « rangée gelée » au présent sont réécrits, l'ADR-011
     est amendée (« la preuve prime sur l'état » est barrée).
     **Revue indépendante du 2026-09-14** (partielle : la limite de session a
     arrêté la recherche, quatre vérifications ont abouti) — trois constats
     confirmés, un réfuté :
     - deux rapports du MÊME JOUR ne se départageaient pas à la lecture :
       `dateRapport` est un jour civil, le « plus récent » était le premier
       rendu par PostgreSQL, et le statut d'une ponctuelle — lu sur ce
       résultat — pouvait changer d'une régénération à l'autre. `createdAt`
       départage désormais, comme au dépôt et à la suppression ; requis dans
       le type, testé dans les deux ordres, mutation rouge ;
     - `estStatutRealise` existait en deux exports homonymes (dont un en
       `startsWith`), la table résultat → statut en trois copies, une clause
       `where` recopiée deux fois, un export sans appelant : une seule
       définition de chacun (`lib/dates/retard.ts`, `rapports/schema.ts`) ;
     - **limite écrite, non corrigée** : un rapport déposé AVANT N2 n'a pas
       d'`echeanceHonoree` (N1 ne l'a pas inventée). Le supprimer quand il est
       le dernier réalisé laisse la ligne sur la date que l'ancien
       réconciliateur avait déjà avancée : l'échéance manquée disparaît. Aucun
       seed ne crée de rapport, et la production est re-seedée : le cas ne
       peut naître que d'un rapport de l'ancienne base encore présent ;
     - réfuté : supprimer un rapport sur une ligne archivée la réécrit sans
       garde — comportement de `main`, les prédicats lisent `archiveLe` en
       premier et la ligne ne se lit jamais en retard.
     **Revue indépendante complète, le même jour** (`main...HEAD`, 99
     fichiers) — quatre constats, tous confirmés à la lecture, zéro faux
     positif :
     - une absorbante DÉJÀ EN BASE qui reprend l'échéance d'une obligation
       retirée gardait « à planifier » (la branche relisait `ex.statut`), quand
       la même ligne créée depuis le même héritage naît « planifiée ». Elle
       passe « planifiée » dès qu'une date est calculée ; stabilité en une
       passe testée ;
     - deux suppressions de rapport CONCURRENTES sur la même ligne : la
       seconde voyait son écriture conditionnée échouer et abandonnait le
       recul en silence — la ligne gardait l'échéance future d'un rapport
       disparu, et rien ne la recalait, contrairement à ce que le commentaire
       promettait. La ligne est désormais verrouillée (`FOR UPDATE`) avant
       d'être relue, le rapport relu sous le verrou, et un conflit résiduel
       annule tout au lieu de se taire. Exécuté sur le Postgres local ;
     - `etaler-echeances-demo` avait perdu son filtre au retrait de la colonne
       et réécrivait toutes les lignes, échéances roulées et ponctuelles
       consommées comprises : il ne déplace plus que les lignes ouvertes sans
       aucune preuve, composées des clauses de `portee.ts` ;
     - `seed-salaries-demo --annuler` vérifiait la preuve sur une copie à deux
       témoins et pouvait supprimer une ligne dont le statut réalisé était la
       seule : il lit `portantUnePreuve()`.
     Trois mutations, rouges. 2626 tests.
     **Relecture neutre de ces corrections** : rien de bloquant, aucune
     régression ; entrelacements suppression/suppression et
     suppression/dépôt jugés justes sous READ COMMITTED, sans interblocage.
     Mineurs traités : le départage `createdAt` est posé sur les sept autres
     lectures « rapports du plus récent au plus ancien » (fiche d'action,
     fiche d'équipement, page d'établissement, MCP, registre) ; le commentaire
     de la levée sous verrou dit qu'elle n'a aucun chemin connu et qu'elle
     afficherait la page d'erreur générique ; celui de l'étalement nomme les
     deux familles qu'il déplace sans effet durable. Soupçon écarté par
     exécution : `NOT portantUnePreuve()` produit un `NOT EXISTS` corrélé,
     insensible aux `NULL` de `Action.verificationId`. Laissé : un dépôt
     antidaté concurrent d'une suppression sur une ponctuelle, recalé par la
     régénération qui suit (préexistant).
  **Fait le 2026-09-13, avant cette décision :**
  ~~la durée de conservation de `D. 4711-3` à l'écran du registre~~ (badge
  légal, citation et lien relus à la source le 2026-09-01) ; ~~l'annotation de
  l'ADR-012~~ ; ~~les trois gardes de suppression~~ — équipement, prescription
  et son compte — recopiaient trois témoins de preuve et ignoraient le statut
  réalisé : elles partagent `portantUnePreuve`, qui le compte, si bien que le
  retrait de la colonne ne rendra supprimable aucun équipement qui porte une
  preuve. `VerificationDatee.libelleObligation` reste requis : il ne coûte rien
  et n'est plus lu par aucun prédicat.

## Ce que le score fait, mesuré le 2026-09-12

`pnpm mesure:score` (`scripts/mesure-score-adr034.ts`) fabrique des dossiers en
mémoire et appelle les fonctions réelles du produit — la partition et le calcul
du score, celles du tableau de bord et du dossier PDF. Aucune base, donc rien à
seeder : le seed complet ne fabriquait que des lignes ouvertes, et l'enrichir
aurait mesuré le seed plutôt que la règle.

Deux « avant », parce qu'une ligne en avait deux : **immobile**, c'est-à-dire le
dossier d'un dirigeant qui ne rouvre pas son calendrier — la régénération n'a
pas tourné, la ligne garde `realisee_conforme` avec une échéance dépassée et
sort de TOUS les ensembles ; **régénéré**, où le cycle a été relancé.

| dossier de dix lignes | avant, immobile | avant, régénéré | après | écart |
|---|---|---|---|---|
| tout à jour, contrôles récents | 100 | 100 | 100 | 0 |
| 3 échéances dépassées, contrôles récents | 100 | 70 | 70 | **−30** |
| 3 dépassées, dernier contrôle > 12 mois | 100 | 70 | 70 | **−30** |
| jamais contrôlé, 10 échéances passées | 0 | 0 | 0 | 0 |
| parc partiellement retiré (4 archivées) | 100 | 50 | 50 | **−50** |

**Ce que le dirigeant verra.** Rien s'il est à jour, rien s'il était déjà à
zéro. Jusqu'à **trente points** sur un dossier ordinaire dont trois échéances
sont passées, et **cinquante** sur un parc dont une partie a été retirée — là,
les lignes archivées quittent le dénominateur, si bien que trois retards pèsent
sur six lignes au lieu de dix.

La colonne « avant, régénéré » donne déjà la note d'après : le lot ne change pas
la règle, il la rend vraie sans attendre qu'on rouvre le calendrier. C'est le
défaut du lot 3 bis, chiffré : **un dossier réellement en retard affichait 100**.
