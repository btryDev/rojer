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
  le test attendu. 2404 tests.
  **Trois tests décrivaient un monde disparu** — « le rendez-vous suivant d'un
  cycle soldé » — et six ont été réécrits sur le modèle neuf, jamais supprimés
  en silence. L'un d'eux nomme une conséquence qu'il faut connaître : une rangée
  d'AVANT l'ADR-034, encore gelée sur un statut réalisé avec une `datePrevue`
  future, ne pose plus que son fait — sa date future sort du calendrier jusqu'à
  la régénération, qui la ré-ancre. La perte est bornée à cet intervalle.
- **N5 — Le nettoyage** : `dateRealisee` retirée de `Verification` (elle ne sera
  plus écrite), `depassee` retiré de l'enum ou laissé mort et documenté,
  `VerificationDatee.libelleObligation` redevenu optionnel, ADR-012 annotée comme
  amendée. Et l'écran du registre **affiche la durée de conservation** que
  `D. 4711-3` impose — dette relevée au corpus, sans rapport avec le modèle,
  fermée au passage.

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
