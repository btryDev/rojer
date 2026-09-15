# Inventaire de couverture — Code du travail, quatrième partie, livres V à VIII

**Date du relevé : 2026-09-02.** Document de constat. Aucun fichier de
référentiel n'a été modifié, aucun chantier n'est proposé.

## Comment le plan a été établi

Le plan n'a pas été récité : il a été relevé sur Légifrance, section par
section, le 2026-09-02.

Les pages « livre » (`section_lc` sur un `LEGISCTA` de niveau Livre) rendent
leur plan **tronqué** : la page du livre V réglementaire s'arrête au titre II,
celle du livre VI au chapitre II du titre II, celle du livre VII au chapitre IV
du titre II. Le plan a donc été reconstitué **titre par titre**, et les
identifiants manquants ont été retrouvés par les fils d'Ariane des pages
d'article, qui portent le `LEGISCTA` de chaque niveau. Les identifiants
utilisés sont notés dans le tableau quand ils ont servi à trancher.

Points d'ancrage vérifiés :

| Niveau | Partie législative | Partie réglementaire |
|---|---|---|
| Quatrième partie | `LEGISCTA000006132338` | `LEGISCTA000018488235` (R4121-1 à R4823-6) |
| Livre V | `LEGISCTA000006145411` (L4511-1 à L4541-1) | `LEGISCTA000018491518` |
| Livre VI | `LEGISCTA000006145412` | `LEGISCTA000018492535` (R4621-1 à D4644-11) |
| Livre VII | `LEGISCTA000006145413` (L4711-1 à L4755-4) | `LEGISCTA000018493736` (D4711-1 à R4755-3) |
| Livre VIII | `LEGISCTA000006145414` (L4811-1 à L4831-1) | `LEGISCTA000018494036` |

Un chapitre est **couvert** quand au moins un de ses articles est une entrée de
`src/lib/referentiels/corpus/*.ts`. Il est **écarté** quand un motif écrit
existe dans le dépôt (CLAUDE.md, une exclusion de `perimetre.ts`, un ADR, une
`reserve` de corpus) ; le motif est cité. Sinon il est **jamais ouvert**, même
si le sujet est nommé ailleurs dans le produit.

---

## LIVRE V — Prévention des risques liés à certaines activités ou opérations

### Titre Ier — Travaux réalisés dans un établissement par une entreprise extérieure

Législatif : chapitre unique `L. 4511-1`. Réglementaire : `R. 4511-1` à
`R. 4515-11` (`LEGISCTA000018491520`).

| Chapitre | Articles | Statut | Constat |
|---|---|---|---|
| Ier — Dispositions générales | `L. 4511-1` ; `R. 4511-1` à `R. 4511-12` | **jamais ouvert** | Aucune entrée de corpus. `R. 4511-5` : « Le chef de l'entreprise utilisatrice assure la coordination générale des mesures de prévention ». `R. 4511-8` : alerter l'entreprise extérieure d'un danger grave, et lui communiquer les dossiers techniques amiante. `R. 4511-10` : recueillir de l'entreprise extérieure dates, durée, effectifs, responsable, sous-traitants. État permanent, aucune périodicité écrite. `L. 4511-1` non ouvert par moi. |
| II — Mesures préalables à l'exécution d'une opération | `R. 4512-1` à `R. 4512-16` | **jamais ouvert** | Aucune entrée de corpus, alors que le module `PlanPrevention` du produit cite `R. 4512-2`, `R. 4512-6` à `R. 4512-12` **en prose d'écran** (`src/app/etablissements/[id]/plan-prevention/`, `src/components/plan-prevention/`). `R. 4512-2` : inspection commune préalable. `R. 4512-7` : plan de prévention écrit dès « un nombre total d'heures de travail prévisible égal au moins à 400 heures sur une période inférieure ou égale à douze mois », ou pour les travaux dangereux énumérés par arrêté. `R. 4512-12` : plan tenu à disposition de l'inspection du travail, informée par écrit à l'ouverture des travaux. Événementiel, pas périodique. |
| III — Mesures pendant l'exécution des opérations | `R. 4513-1` à `R. 4513-13` | **jamais ouvert** | `R. 4513-1` : s'assurer de l'exécution des mesures du plan. `R. 4513-2` et `R. 4513-3` : inspections et réunions périodiques de coordination. `R. 4513-5` : réunions « au moins tous les trois mois » au-delà de 90 000 heures prévisibles sur douze mois — seuil hors de la cible TPE. `R. 4513-8` : installations sanitaires, vestiaires et locaux de restauration mis à disposition des travailleurs de l'entreprise extérieure. `R. 4513-9` à `R. 4513-13` : suivi individuel de l'état de santé. |
| IV — Rôle des institutions représentatives du personnel | `R. 4514-1` à `R. 4514-10` | **jamais ouvert** | Section 3 lue (`R. 4514-8` à `R. 4514-10`) : désignation de représentants du personnel pour participer aux inspections et réunions de coordination. Suppose un CSE constitué. Aucune périodicité écrite. |
| V — Opérations de chargement et de déchargement | `R. 4515-1` à `R. 4515-11` | **couvert, partiel** | `code-travail-co-activite.ts`, `etendue: articles_cites`, 9 entrées. `R. 4515-8` y porte `non_depouille`. **Le chapitre compte onze articles en vigueur, pas neuf** : `R. 4515-2` et `R. 4515-3` (version du 2008-05-01, en vigueur, vérifiés le 2026-09-02) ne sont pas au corpus et le commentaire de tête du fichier annonce « huit des neuf articles du chapitre V ». `R. 4515-3` définit les « opérations à caractère répétitif », notion sur laquelle repose `R. 4515-9`, qui est retenu. |

### Titre II — Installations nucléaires de base et installations susceptibles de donner lieu à des servitudes d'utilité publique

Législatif : `L. 4521-1` à `L. 4526-1`. Réglementaire : `R. 4523-1` à
`R. 4524-10` (les chapitres Ier et II ne comportent pas de dispositions
réglementaires).

| Chapitre | Articles | Statut | Motif |
|---|---|---|---|
| Ier — Champ d'application | `L. 4521-1` | **écarté** | `EXCLUSIONS.risque_specialise` (`src/lib/referentiels/corpus/perimetre.ts`) : « ICPE soumises à autorisation… risques dont le traitement demande une expertise que le produit ne prétend pas porter ». Et CLAUDE.md § Hors périmètre : « ICPE — les seuils ne sont pratiquement jamais atteints dans les 3 secteurs cibles ». |
| II — Coordination de la prévention | `L. 4522-1`, `L. 4522-2` | **écarté** | idem |
| III — Comité social et économique | `L. 4523-1` à `L. 4523-17` ; `R. 4523-1` à `R. 4523-17` | **écarté** | idem |
| IV — Comité interentreprises | `L. 4524-1` ; `R. 4524-1` à `R. 4524-10` | **écarté** | idem |
| V — Dispositions relatives à l'incendie et aux secours | `L. 4525-1` | **écarté** | idem |
| VI — Danger grave et imminent | `L. 4526-1` | **écarté** | idem |

Réserve sur ce motif : l'exclusion `risque_specialise` nomme les « ICPE soumises
à autorisation » ; le titre vise, lui, les installations nucléaires de base et
les installations à servitudes d'utilité publique. Le recouvrement est réel mais
la rédaction de l'exclusion ne le dit pas en toutes lettres.

### Titre III — Bâtiment et génie civil

Législatif : `L. 4531-1` à `L. 4535-1` (`LEGISCTA000006145411` › titre III).
Réglementaire : `R. 4531-1` à `R. 4535-14` (`LEGISCTA000018491748`).

| Chapitre | Articles | Statut | Motif |
|---|---|---|---|
| Ier — Principes de prévention | `L. 4531-1` à `L. 4531-3` ; `R. 4531-*` | **écarté** | CLAUDE.md § Périmètre, « Secteurs couverts » : restauration (56.xx), commerce de détail (47.xx), bureau/tertiaire. Ces chapitres s'adressent au maître d'ouvrage, au coordonnateur SPS et aux entreprises d'une opération de bâtiment ou de génie civil. |
| II — Coordination lors des opérations de bâtiment et de génie civil | `L. 4532-1` à `L. 4532-18` ; `R. 4532-1` à `R. 4532-98` | **écarté** | idem |
| III — Prescriptions techniques applicables avant l'exécution des travaux | pas de dispositions législatives ; `R. 4533-*` | **écarté** | idem |
| IV — Prescriptions techniques de protection durant l'exécution des travaux | pas de dispositions législatives ; `R. 4534-*` | **écarté** | idem |
| V — Dispositions applicables aux travailleurs indépendants | `L. 4535-1` ; `R. 4535-1` à `R. 4535-14` | **écarté** | idem |

Deux constats à porter avec ce motif.

1. **Aucune des quatre exclusions du catalogue fermé de `perimetre.ts` ne dit
   « opération de bâtiment ou de génie civil ».** `construction` dit « règle de
   construction, pas d'exploitation », ce qui n'est pas la même chose : le titre
   III ne règle pas la construction du bâtiment de l'exploitant, il règle les
   obligations des intervenants d'un chantier. Le motif employé ici est donc le
   périmètre sectoriel de CLAUDE.md, pas une exclusion codée — et l'ADR-031
   pose que « tout le reste se déclare et ne se refuse pas ».
2. `R. 4535-14`, « Risques liés à l'exposition aux épisodes de chaleur
   intense », est en vigueur depuis le 2025-06-02 (`LEGISCTA000051676949`). Il
   est **dans le chapitre des travailleurs indépendants du bâtiment**, pas dans
   le socle général. Le relever ici évite qu'il soit confondu avec le volet
   chaleur du décret n° 2025-482, qui ne relève pas de ce livre.

### Titre IV — Autres activités et opérations

Législatif : chapitre unique `L. 4541-1`. Réglementaire : `R. 4541-1` à
`R. 4544-33` (`LEGISCTA000018492445`).

`L. 4541-1`, lu le 2026-09-02 : « Les règles de prévention des risques pour la
santé et la sécurité des travailleurs résultant de la manutention des charges
sont déterminées par décret en Conseil d'État pris en application de l'article
L. 4111-6. » Article d'habilitation, aucune obligation directe.

| Chapitre | Articles | Statut | Constat |
|---|---|---|---|
| Ier — Manutention des charges | `R. 4541-1` à `R. 4541-10` | **couvert, partiel** | `code-travail-manutention-ecran.ts` : **un** article sur dix, `R. 4541-8` (information et formation). Non au corpus : `R. 4541-3` (éviter le recours à la manutention manuelle par des moyens mécaniques), `R. 4541-4`, `R. 4541-5` (évaluer et organiser les postes, mettre à disposition aides mécaniques ou accessoires de préhension), `R. 4541-6` (facteurs individuels de risque, définis par arrêté — l'arrêté est déjà nommé comme non recherché dans la `reserve` de `R. 4541-8`), `R. 4541-7` (informer sur le poids de la charge), `R. 4541-9` (55 kg / 105 kg pour les hommes après avis du médecin du travail ; 25 kg / 40 kg brouette comprise pour les femmes), `R. 4541-10` (marquage du poids par l'expéditeur au-delà de 1 000 kg). Tous états permanents, aucune périodicité. |
| II — Utilisation d'écrans de visualisation | `R. 4542-1` à `R. 4542-19` | **couvert, partiel** | Un article sur dix-neuf, `R. 4542-16`. Non au corpus : `R. 4542-3` (mesures après analyse des conditions de travail et évaluation des risques), `R. 4542-4` (temps quotidien sur écran « périodiquement interrompu par des pauses ou changements d'activité »), `R. 4542-5` à `R. 4542-10` (écran, clavier, table, siège, espace, repose-pieds sur demande), `R. 4542-12` à `R. 4542-15` (chaleur, radiations, humidité, bruit), `R. 4542-17` (examen approprié des yeux et de la vue avant affectation), `R. 4542-18` (faire examiner par le médecin du travail le travailleur qui se plaint de troubles), `R. 4542-19` (dispositifs de correction spéciaux sans charge financière pour le travailleur). C'est le chapitre le plus directement applicable au secteur bureau/tertiaire. |
| III — Interventions sur les équipements élévateurs et installés à demeure | `R. 4543-1` à `R. 4543-28` | **écarté** | Motif écrit, mais **motif de non-couverture assumée, pas de hors-périmètre**, et il vit dans une `reserve` et non dans un `statut` : `cch-ascenseurs.ts`, entrée `CCH R. 134-10`, qui relève `R. 4543-1`, `R. 4543-22`, `R. 4543-23`, `R. 4543-24` à la source le 2026-09-01 et conclut « Il manque le fait, pas le texte : rien dans le modèle ne dit qu'un ascenseur est entretenu en régie » (ADR-023). Ce que la réserve ne relève pas : le chapitre impose aussi une **étude de sécurité spécifique dans les six semaines suivant la prise en charge de l'équipement**, mise à jour sur événement. |
| IV — Opérations sur les installations électriques ou dans leur voisinage | `R. 4544-1` à `R. 4544-11-2` | **couvert, partiel** | `code-travail-electricite.ts` : `R. 4544-9`, `R. 4544-10`, `R. 4544-11` (`obligation_manquante`), `R. 4544-11-1`. Non au corpus : les sections 1 à 3, `R. 4544-1` à `R. 4544-8` — dont `R. 4544-3`, l'article qui renvoie aux normes et sur lequel repose tout le débat du « triennal NF C 18-510 » — et `R. 4544-11-2`. |
| IV bis — Travaux d'ordre non électrique en environnement électrique | `R. 4544-12` à `R. 4544-33` | **jamais ouvert** | Lu le 2026-09-02 : le chapitre régit les travaux d'ordre non électrique au voisinage de conducteurs nus ou isolés, lignes aériennes ou souterraines, et met à la charge de l'employeur l'évaluation des risques de proximité, la formation, l'équipement et l'information des travailleurs. Le déclencheur est la proximité d'ouvrages électriques sur le lieu des travaux : il ne se rencontre pas dans l'exploitation ordinaire d'un restaurant, d'un commerce ou d'un bureau. |

---

## LIVRE VI — Institutions et organismes de prévention

### Titre Ier — Comité d'hygiène, de sécurité et des conditions de travail — ABROGÉ

`L. 4611-1` à `L. 4616-6` et `R. 4611-1` à `R. 4615-*`, abrogés (décret
n° 2017-1819 du 29 décembre 2017, effet au 1er janvier 2018). Six chapitres,
**hors décompte** : ils n'ont pas à être couverts.

### Titre II — Services de prévention et de santé au travail

Législatif : `L. 4621-1` à `L. 4625-3` (`LEGISCTA000006160792`).
Réglementaire : `R. 4621-1` à `R. 4626-35` (`LEGISCTA000018492751`).

| Chapitre | Articles | Statut | Constat |
|---|---|---|---|
| Ier — Champ d'application | `L. 4621-1` à `L. 4621-4` ; `R. 4621-1` | **jamais ouvert** | Lu le 2026-09-02 : `L. 4621-1` pose le champ (employeurs de droit privé et leurs travailleurs) ; `R. 4621-1` en écarte les entreprises et établissements agricoles, qui relèvent du livre VII du code rural et de la pêche maritime. Aucun acte, aucune échéance. |
| II — Missions et organisation | `L. 4622-1` à `L. 4622-17` ; `D. 4622-1` à `D. 4622-58` | **couvert, partiel** | `code-travail-service-prevention-sante.ts` : `L. 4622-1`, `L. 4622-7` (`sans_objet`), `D. 4622-1`, `D. 4622-2`. Soit 2 articles L. sur 17 et 2 articles D. sur 58. Non lu et non consigné : `L. 4622-6` (« Les dépenses afférentes aux services de prévention et de santé au travail sont à la charge des employeurs »), `L. 4622-6-1` (agrément quinquennal du service), `L. 4622-2` à `L. 4622-5`, `L. 4622-8` à `L. 4622-17`. La `portee` du corpus annonce déjà que le reste du titre « règle la vie du service et non les obligations de l'employeur » ; `L. 4622-6` est une exception à cette phrase. |
| III — Personnels concourant aux services de santé au travail | `R. 4623-1` à `R. 4623-45` | **jamais ouvert** | `R. 4623-1` lu le 2026-09-02 : « Le médecin du travail est le conseiller de l'employeur, des travailleurs, des représentants du personnel et des services sociaux. » Le chapitre règle le statut, les missions et les moyens des personnels du service ; il ne met pas d'acte à la charge de l'employeur adhérent. |
| IV — Actions et moyens des membres de l'équipe pluridisciplinaire de santé au travail | `L. 4624-1` à `L. 4624-10` ; `R. 4624-1` à `R. 4624-58` | **couvert, partiel** | `code-travail-sante-travail.ts` : 14 entrées, toutes réglementaires (`R. 4624-10`, `-16`, `-17`, `-18`, `-22`, `-23`, `-24`, `-27`, `-28`, `-28-1`, `-28-2`, `-28-3` en `non_depouille`, `-46`, `-47`), soit 14 sur 58. **Aucun article `L. 4624-*` n'est au corpus.** Lus le 2026-09-02 sur la page du chapitre, sans relevé verbatim article par article : `L. 4624-2-2`, visite de mi-carrière « organisée durant l'année civile du quarante-cinquième anniversaire » du travailleur, ou à l'échéance fixée par accord de branche ; `L. 4624-2-1` (traçabilité post-exposition), `L. 4624-2-3` (visite de reprise), `L. 4624-2-4` (examen de pré-reprise) ; `L. 4624-3` et `L. 4624-6` (l'employeur est tenu de prendre en considération l'avis du médecin du travail et de motiver son refus par écrit). |
| V — Suivi de l'état de santé de catégories particulières de travailleurs | `L. 4625-1` à `L. 4625-3` ; `R. 4625-1` à `D. 4625-34` | **jamais ouvert** | `R. 4625-1`, verbatim relevé le 2026-09-02 : « Les dispositions des chapitres Ier à IV sont applicables aux travailleurs titulaires de contrats à durée déterminée. Ces travailleurs bénéficient d'un suivi individuel de leur état de santé d'une périodicité équivalente à celui des salariés en contrat à durée indéterminée, notamment des dispositions prévues aux articles R. 4624-15 et R. 4624-27. » Le chapitre comporte d'autres sections (travailleurs temporaires, saisonniers, salariés de particuliers employeurs) que je n'ai pas ouvertes. |
| VI | `R. 4626-1` à `R. 4626-35` | **jamais ouvert** | Intitulé non établi par moi ; chapitre non ouvert par moi. |

### Titre III — Service social du travail

| Chapitre | Articles | Statut | Constat |
|---|---|---|---|
| Ier | `L. 4631-*` ; `D. 4631-*` | **jamais ouvert** | Non ouvert par moi. |
| II — Organisation et fonctionnement | `D. 4632-1` à `D. 4632-11` (`LEGISCTA000018493426`) | **jamais ouvert** | Lu le 2026-09-02 : le service social dispose d'un bureau au moins, et le conseiller du travail, titulaire d'un diplôme spécial, y consacre un temps minimal fonction de l'effectif. Le seuil d'effectif qui rend le service obligatoire n'a pas été ouvert par moi ; sans lui, je ne peux pas dire si le titre atteint une TPE. |

### Titre IV — Institutions et personnes concourant à l'organisation de la prévention

Législatif : `L. 4641-1` à `L. 4644-1` (`LEGISCTA000006160794`).
Réglementaire : `R. 4641-1` à `D. 4644-11` (`LEGISCTA000018493450`).

| Chapitre | Articles | Statut | Constat |
|---|---|---|---|
| Ier — Conseil d'orientation des conditions de travail et comités régionaux d'orientation des conditions de travail | `L. 4641-1` à `L. 4641-6` ; `R. 4641-1` à `R. 4641-22` | **jamais ouvert** | Instances consultatives de l'État. Aucun acte d'employeur. Ouvert au niveau du plan seulement : je n'ai pas lu les articles. |
| II — Agence nationale pour l'amélioration des conditions de travail | `L. 4642-1` à `L. 4642-3` ; `R. 4642-*` | **jamais ouvert** | Statut d'un établissement public. Ouvert au niveau du plan seulement. |
| III — Organismes et commissions de santé et de sécurité | `L. 4643-1` à `L. 4643-4` ; `R. 4643-*` | **jamais ouvert** | `L. 4643-1` apparaît dans le dépôt, mais **à l'intérieur d'un verbatim cité** — celui de `R. 4141-*` dans `code-travail-formation-securite.ts` (« avec le concours, le cas échéant, de l'organisme professionnel de santé, de sécurité et des conditions de travail prévu à l'article L. 4643-1 »). Aucun article `L. 4643-*` n'est une entrée de corpus. |
| IV — Aide à l'employeur pour la gestion de la santé et de la sécurité au travail | `L. 4644-1` ; `R. 4644-1` ; `D. 4644-1` à `D. 4644-11` | **couvert, partiel** | `code-travail-organisation-prevention.ts` porte `L. 4644-1` et `R. 4644-1`. `D. 4644-1` à `D. 4644-11` (régime des intervenants en prévention des risques professionnels, auxquels renvoient les alinéas 3 à 5 de `L. 4644-1`) ne sont ni au corpus ni ouverts par moi. |

---

## LIVRE VII — Contrôle

### Titre Ier — Documents et affichages obligatoires (chapitre unique)

`L. 4711-1` à `L. 4711-5` (`LEGISCTA000006178110`) ; `D. 4711-1` à `D. 4711-3`
(`LEGISCTA000018493740`).

| Chapitre | Articles | Statut | Constat |
|---|---|---|---|
| unique | `L. 4711-1` à `L. 4711-5` ; `D. 4711-1` à `D. 4711-3` | **couvert, presque intégral** | Six articles sur huit. Au corpus : `L. 4711-1`, `L. 4711-2`, `D. 4711-2`, `D. 4711-3` (`code-travail-incendie.ts`) ; `L. 4711-5` (deux entrées, `code-travail-incendie.ts` et `code-travail-electricite.ts`, doublon connu et testé) ; `D. 4711-1` (`code-travail-information-travailleurs.ts`). **Manquent `L. 4711-3` et `L. 4711-4`**, lus le 2026-09-02 : le premier ouvre l'accès des agents de contrôle et des agents des services de prévention des organismes de sécurité sociale aux documents de `L. 4711-1` et `L. 4711-2` ; le second impose la communication de ces mêmes documents au comité social et économique, au médecin du travail et aux organismes professionnels, dans des conditions fixées par voie réglementaire. `L. 4711-4` est un acte de l'employeur, sans échéance. |

### Titre II — Mises en demeure et demandes de vérifications

Législatif : `L. 4721-1` à `L. 4723-1`. Réglementaire : `R. 4721-1` à
`R. 4724-19`.

| Chapitre | Articles | Statut | Constat |
|---|---|---|---|
| Ier — Mises en demeure | `L. 4721-1` à `L. 4721-8` ; `R. 4721-1` à `R. 4721-12` | **jamais ouvert** | Le chapitre s'adresse pour l'essentiel à l'administration. **Sa sous-section 3, `R. 4721-11` et `R. 4721-12`, porte la mise en demeure de réduction de l'intervalle entre deux vérifications périodiques**, pour usure prématurée ou contraintes d'environnement — voir la section « mécanisme analogue » ci-dessous. Nommé une fois dans le dépôt, en note (`docs/adr/035-prescriptions-particulieres.md`, qui parle d'« une mise en demeure qui fixe un délai ») ; aucune entrée de corpus. |
| II — Demandes de vérifications, analyses et mesures | `L. 4722-1`, `L. 4722-2` ; `R. 4722-1` à `R. 4722-33` | **jamais ouvert** | Obligation réelle de l'employeur, événementielle. Verbatim de `R. 4722-1` relevé le 2026-09-02 : « L'agent de contrôle peut demander à l'employeur de faire procéder par un organisme accrédité aux contrôles et mesures permettant de vérifier la conformité de l'aération et de l'assainissement des locaux de travail. Il fixe le délai dans lequel cet organisme doit être saisi. » Même schéma pour l'éclairage (`R. 4722-3`), les équipements de travail (`R. 4722-5`) et les installations électriques fixes ou temporaires (`R. 4722-26`) — quatre domaines que le référentiel couvre déjà par ailleurs. |
| III — Recours | `L. 4723-1` ; `R. 4723-1` à `R. 4723-6` | **jamais ouvert** | Voie de recours ouverte à l'employeur contre une mise en demeure ou une demande de vérification. Une faculté, pas un acte dû. Ouvert au niveau du plan seulement. |
| IV — Organismes de mesures et de vérifications | `R. 4724-1` à `R. 4724-19` | **jamais ouvert** | Régit l'accréditation des organismes qui réalisent les vérifications, non l'employeur qui les commande. `R. 4724-14`, `R. 4724-14-1` et `R. 4724-14-2` sont nommés en commentaire dans `code-travail-sante-travail.ts` (mesurages d'empoussièrement amiante) et dans `docs/dette-chantier-porteur-echeance.md` ; aucune entrée de corpus. |

### Titre III — Mesures et procédures d'urgence

| Chapitre | Articles | Statut | Constat |
|---|---|---|---|
| Ier — Arrêts temporaires de travaux ou d'activité | `L. 4731-1` à `L. 4731-6` ; `R. 4731-*` | **jamais ouvert** | Pouvoir de l'agent de contrôle. `L. 4731-3` met à la charge de l'employeur l'information de l'agent et la reprise après vérification. Aucune échéance. |
| II — Référé judiciaire | `L. 4732-1` à `L. 4732-4` | **jamais ouvert** | S'adresse au juge judiciaire. |
| III — Procédures d'urgence et mesures concernant les jeunes travailleurs | `L. 4733-1` à `L. 4733-12` | **jamais ouvert** | `L. 4733-4` et `L. 4733-5` : retrait du jeune de l'affectation, puis reprise. Le déclencheur est une décision de l'agent de contrôle, pas un fait d'exploitation. Un restaurant qui emploie des apprentis mineurs peut le subir ; il ne peut pas l'inscrire à un calendrier. |

### Titre IV — Dispositions pénales

| Chapitre | Articles | Statut | Constat |
|---|---|---|---|
| Ier — Infractions aux règles de santé et de sécurité | `L. 4741-1` à `L. 4741-14` ; `R. 4741-*` | **jamais ouvert** | Sanctions. Aucun acte dû, aucune échéance. Ouvert au niveau du plan seulement. |
| II — Infractions aux règles de représentation | `L. 4742-1` | **jamais ouvert** | idem |
| III — Infractions concernant le travail des jeunes et des femmes enceintes | `L. 4743-1` à `L. 4743-3` | **jamais ouvert** | idem |
| IV — Opérations de bâtiment et de génie civil | `L. 4744-1` à `L. 4744-7` | **jamais ouvert** | idem |

### Titre V — Amendes administratives

`L. 4751-1` à `L. 4755-4` (`LEGISCTA000032376351`) ; `R. 4751-*` à `R. 4755-3`.

| Chapitre | Articles | Statut | Constat |
|---|---|---|---|
| Ier | `L. 4751-*` | **jamais ouvert** | Intitulé non établi par moi. |
| II | `L. 4752-*` | **jamais ouvert** | Intitulé non établi par moi. |
| III | `L. 4753-*` | **jamais ouvert** | Intitulé non établi par moi. |
| IV — Manquements aux règles concernant les repérages avant travaux | `L. 4754-1` (`LEGISCTA000033013779`) | **jamais ouvert** | `L. 4754-1`, en vigueur depuis le 2016-08-10 : amende administrative d'un montant maximal de 9 000 € au **donneur d'ordre, au maître d'ouvrage ou au propriétaire** qui méconnaît `L. 4412-2` (repérage avant travaux). Le sujet visé n'est pas ici l'employeur mais celui qui commande des travaux — donc l'exploitant qui fait réaliser des travaux dans son local. Le repérage lui-même relève de l'amiante, que CLAUDE.md § Hors périmètre déclare « non couvert, mais déclaré ». |
| V | `L. 4755-*` | **jamais ouvert** | Intitulé non établi par moi. |

---

## LIVRE VIII — Dispositions relatives à l'outre-mer

Législatif : `L. 4811-1` à `L. 4831-1` (`LEGISCTA000006145414`).
Réglementaire : `LEGISCTA000018494036`, jusqu'à `R. 4823-6`.

| Titre / Chapitre | Articles | Statut | Motif / constat |
|---|---|---|---|
| T. Ier — Dispositions générales, chapitre unique | `L. 4811-1` | **écarté** | Motif écrit unique : `docs/adr/011-dates-civiles-et-fuseau.md` — « Rojer s'adresse à des TPE/PME françaises métropolitaines. » |
| T. II ch. Ier — Dispositions générales | `L. 4821-1` | **écarté** | idem |
| T. II ch. II — Services de prévention et de santé au travail | `L. 4822-1`, `L. 4822-2` | **écarté** | idem. Lus le 2026-09-02 : les deux s'adressent à l'autorité administrative et au pouvoir réglementaire, pas à l'employeur. |
| T. II ch. III — Sensibilisation aux risques naturels majeurs | `L. 4823-1`, `L. 4823-2` ; `R. 4823-1` à `R. 4823-6` (`LEGISCTA000047522095`) | **écarté** | idem, **et c'est le seul endroit de tout ce périmètre où l'exclusion coûte une échéance périodique.** `L. 4823-2` : l'employeur « veille à ce que chaque travailleur reçoive régulièrement une information appropriée sur les risques naturels majeurs ». `R. 4823-1` (décret n° 2023-333 du 3 mai 2023, en vigueur au 2024-01-01) : le salarié compétent de `L. 4644-1` reçoit une formation à la prévention des risques naturels, intégrée à celle de ce même article. `R. 4823-4` : désigner le personnel compétent ou faire appel à un organisme extérieur pour délivrer l'information. `R. 4823-6` : l'information est « renouvelée et complétée aussi souvent que nécessaire » et **« au moins annuellement »**. Ce chapitre se greffe sur `L. 4644-1` et `R. 4644-1`, que le référentiel porte déjà. |
| T. III — Mesures de coordination avec les autres collectivités ultramarines, chapitre unique | `L. 4831-1` | **écarté** | idem |

Le motif est écrit, mais il l'est dans un ADR consacré aux **dates civiles et
au fuseau horaire**. Le périmètre de CLAUDE.md § Hors périmètre ne mentionne
l'outre-mer nulle part, et le catalogue de `perimetre.ts` non plus.

---

## Le mécanisme analogue demandé

Il m'était demandé de signaler, sans traiter l'article 4 de l'arrêté du
20 novembre 2017, tout mécanisme du Code qui jouerait sur les délais de la même
famille. Constat :

- **Je n'ai trouvé, dans les livres V à VIII, aucun mécanisme de suspension
  d'un délai** — rien qui dise qu'une période ne compte pas dans le calcul
  d'une échéance.
- **J'ai trouvé un mécanisme de modification d'intervalle par acte
  extérieur** : `R. 4721-11` et `R. 4721-12`, sous-section 3 « Mise en demeure
  de réduction d'intervalle » du chapitre Ier du titre II du livre VII. Un
  agent de contrôle peut imposer à l'employeur de **réduire l'intervalle entre
  deux vérifications périodiques** d'un équipement de travail ou d'un
  équipement de protection individuelle, en raison d'une usure prématurée ou de
  contraintes d'environnement. La périodicité d'une vérification n'est donc pas
  seulement celle du texte : elle peut être raccourcie par décision
  administrative, et le référentiel n'a aucun champ qui le porte.
- **Un troisième cas, déjà consigné au corpus** : `R. 4515-9` fait durer le
  protocole de sécurité « aussi longtemps que les employeurs intéressés
  considèrent que les conditions de déroulement des opérations n'ont subi
  aucune modification significative ». Condition de péremption appréciée par
  les parties, pas durée. Le corpus le dit déjà en toutes lettres.

---

## Ce que je n'ai pas pu établir

1. **Les intitulés exacts des chapitres III et IV du titre III du livre V,
   partie réglementaire** (`R. 4533-*`, `R. 4534-*`). La page du titre
   (`LEGISCTA000018491748`) rend son plan tronqué après le chapitre II, qui
   compte 98 articles. Les intitulés portés au tableau sont ceux des chapitres
   correspondants de la partie législative, où ils sont donnés sans dispositions.
2. **Les intitulés des chapitres Ier, II, III et V du titre V du livre VII**
   (amendes administratives). Seul le chapitre IV a été établi, par le fil
   d'Ariane de `L. 4754-1`. Les quatre autres sont comptés comme chapitres
   d'après la numérotation des articles (`L. 4751-*` à `L. 4755-*`), sans que
   leur intitulé soit vérifié.
3. **Les chapitres du titre IV du livre VII au-delà du chapitre IV.** Le titre
   court jusqu'à `L. 4746-1` ; je n'ai établi que quatre chapitres.
4. **L'intitulé et le contenu du chapitre VI du titre II du livre VI**
   (`R. 4626-1` à `R. 4626-35`).
5. **Le contenu de `D. 4644-1` à `D. 4644-11`** (intervenants en prévention des
   risques professionnels).
6. **La structure réglementaire du livre VIII** hors le chapitre III de son
   titre II : je n'ai ouvert que `LEGISCTA000047522095` et sa section 2.
7. **Le seuil d'effectif qui rend obligatoire le service social du travail**
   (titre III du livre VI). Sans lui, je ne peux pas dire si ce titre atteint
   une entreprise de moins de cinquante salariés.
8. **Articles nommés mais non ouverts par moi** : `L. 4511-1`, `L. 4521-1` à
   `L. 4526-1`, `L. 4531-1` à `L. 4535-1`, `R. 4531-*` à `R. 4534-*`,
   `L. 4641-*`, `L. 4642-*`, `L. 4643-*`, `L. 4741-*` à `L. 4746-1`,
   `R. 4723-*`, `R. 4731-*`, `R. 4741-*`.
9. **Le relevé de `L. 4624-1` à `L. 4624-10` a été fait sur la page du
   chapitre, pas article par article.** J'en rapporte la substance et une seule
   citation datée (`L. 4624-2-2`, « durant l'année civile du quarante-cinquième
   anniversaire ») ; ce n'est pas un dépouillement.

---

## Le compte

Sur **55 chapitres** relevés dans les livres V à VIII de la quatrième partie
— hors les 6 chapitres du titre Ier du livre VI, abrogés depuis le
1er janvier 2018 :

| Statut | Nombre |
|---|---|
| **couverts** (au moins un article au corpus) | **8** — tous partiels, aucun intégral |
| **écartés** avec un motif écrit | **17** |
| **jamais ouverts** | **30** |

Les 8 couverts : `R. 4515` (9 entrées sur 11 articles), `R. 4541` (1 sur 10),
`R. 4542` (1 sur 19), `R. 4544` (4 entrées), `L./D. 4622` (4 entrées),
`R. 4624` (14 sur 58, aucun `L. 4624-*`), `L./R. 4644` (2 entrées, sans les
`D. 4644-*`), `L./D. 4711` (6 articles sur 8).

Les 17 écartés : les 6 chapitres du titre II du livre V (nucléaire et
installations à servitudes), les 5 chapitres du titre III du livre V (bâtiment
et génie civil), `R. 4543` (équipements élévateurs), et les 5 chapitres du
livre VIII (outre-mer).

Aucun chapitre de ce périmètre n'est couvert intégralement, et aucun corpus qui
le touche ne porte `etendue: "integral"`.
