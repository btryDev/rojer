# Inventaire de couverture — Code de la construction et de l'habitation, et règlements de sécurité pris pour lui

**Document de constat. Il ne recommande rien et ne modifie aucun référentiel.**
Établi le 2026-11-03, sur `origin/main` 1fef953a (référentiel `2026-10-18.1`).

Il fait pour le CCH ce que `inventaire-partie4-livres1-2.md`, `-livres3-4.md` et
`-livres5-8.md` ont fait le 2026-09-02 pour le Code du travail : le plan du texte,
chapitre par chapitre, et pour chacun ce que le dépôt en a lu. Il ajoute une colonne que
ces inventaires n'avaient pas, parce que la question a changé (décision de la
propriétaire du 2026-11-03) : **à qui le chapitre s'adresse** — à l'exploitant, au
propriétaire ou à l'occupant d'un bâtiment existant, ou à quelqu'un d'autre.

**En bref.**
- Le CCH au corpus : 22 articles, tous de la partie réglementaire.
- Le livre Ier compte 83 chapitres qui portent des articles : 7 couverts (tous en partie), 74 jamais ouverts. Les livres II à VIII ne parlent que de vente, de bail, de financement et de copropriété.
- Ce qui s'adresse à l'existant et n'est pas lu tient dans la liste du § 9.1 : 317 articles du CCH au plus.
- Le volume à lire pour la suite est au § 9.2, environ 900 articles. S'y ajoutent les arrêtés de sécurité que le dépôt ignore (§ 6.6), non mesurés.
- Les rythmes vagues sont au § 7. Les articles écartés par une décision antérieure sont au § 8. Les limites de la lecture sont au § 10.

---

## 1. D'où vient le plan

### 1.1 La source

**Le jeu de données LEGI de la DILA**, c'est-à-dire la base que l'API Légifrance (PISTE)
sert et dont le site est le rendu :

| Pièce | Ce que c'est |
|---|---|
| `Freemium_legi_global_20250713-140000.tar.gz` | export global du 2025-07-13 (1 171 027 316 octets, intégrité gzip vérifiée) |
| `LEGI_20250713-205013` … `LEGI_20261102-213929` | les **484** mises à jour quotidiennes suivantes, appliquées dans l'ordre, listes de suppression comprises. Le fichier d'avancement `.faits` en liste 485 (l'export et les 484) ; le journal `application-mises-a-jour.log` n'en imprime que 482, celles qui ont changé quelque chose aux textes extraits |

Servies par `https://echanges.dila.gouv.fr/OPENDATA/LEGI/`. Le texte est donc **à jour
de la livraison du 2026-11-02**, et les comptes sont pris **en vigueur au 2026-11-03** :
un article ou une section compte si le lien qui le rattache à son parent porte
`debut <= 2026-11-03 < fin` — la règle de `denominateur-livre-2-erp.md` § 2.2.

Les mises à jour ont bien été appliquées, et ça se voit : sur l'export global seul, la
partie réglementaire du CCH comptait 2 664 articles, et elle en compte **2 700** après
elles ; le livre Ier réglementaire passe de 600 à 631, le législatif de 279 à 276.

**Ce qui n'a pas servi.** L'API PISTE : aucun identifiant n'est présent sur la machine
(le `.env.local` qui les portait n'existe plus), et aucun MCP Légifrance n'est chargé.
WebFetch : jamais, pour aucun intitulé ni aucune plage d'articles.

**Ce que la source ne garantit pas.** L'égalité de ce jeu avec le rendu public du site
n'est pas vérifiée ici. C'est la même donnée, mais aucune page de Légifrance n'a été
ouverte pour recouper un intitulé ou un compte.

### 1.2 Les moyens de lecture, tels que les lignes les nomment

- **plan LEGI** — l'intitulé et le compte viennent des fichiers de section du jeu
  (`TITRE_TA`, liens `LIEN_ART` en vigueur). Aucun intitulé n'est recopié d'ailleurs.
- **article LEGI, en entier** — le texte de l'article, ouvert dans le jeu et lu jusqu'au
  bout.
- **article LEGI, par filtre** — l'article a été ouvert dans le jeu, mais je n'en ai lu
  que les phrases qui nomment un destinataire (propriétaire, exploitant, occupant,
  locataire, employeur, syndicat, gestionnaire) ou un rythme. **Ce n'est pas une lecture
  intégrale**, et un article ainsi lu peut contenir ce que le filtre a manqué.
- **non ouvert par moi** — dit tel quel.

Dans les tableaux, les intitulés de chapitre sont **abrégés** quand ils sont longs
(« Structures de conseil et de recherche » pour « … pour le secteur de la
construction ») ; l'intitulé exact est celui du plan LEGI, que la commande `plan` rend.

### 1.3 Pour relire

Le jeu reconstitué est hors du dépôt, sur la machine de la propriétaire, lisible par les
autres sessions : `/Users/palomasanchezc/Documents/rojer-mission-alignement/legi-2026-11-02/`.
Ailleurs, il se reconstruit avec `extraire.py` (même dossier), à partir des archives de
la DILA citées au § 1.1. Il porte
le CCH, l'arrêté du 25 juin 1980, le règlement IGH, l'arrêté habitation de 1986, l'arrêté
gaz de 2018, l'arrêté du registre d'accessibilité de 2017, l'arrêté EF de 1990, et l'en-tête de
chaque texte non codifié. Les deux scripts sont dans le même dossier ; les commandes se
lancent depuis `/Users/palomasanchezc/Documents/rojer-mission-alignement` :

    python3 -I legi-2026-11-02/legi.py plan    legi-2026-11-02 LEGITEXT000006074096 2026-11-03
    python3 -I legi-2026-11-02/legi.py num     legi-2026-11-02 JORFTEXT000000290033 "R 33" 2026-11-03
    python3 -I legi-2026-11-02/legi.py article legi-2026-11-02 LEGIARTI000025134178

---

## 2. Ce qui a été lu dans le dépôt, et comment

Les statuts ne sont pas comptés au grep. Ils viennent de l'**exécution** de
`src/lib/referentiels/corpus/index.ts` (`CORPUS` : 76 corpus, 1 445 articles) et de
`src/lib/referentiels/conformite` (`obligationsConformite` : 204 obligations, 448
`referencesLegales`), sur `origin/main` 1fef953a.

**Le CCH au corpus : 22 articles**, répartis dans cinq corpus — `cch-ascenseurs` (6),
`cch-registre-securite` (6), `cch-classement-erp-igh` (5), `cch-defibrillateur` (4 du
CCH, plus 5 entrées d'autres textes) et `cch-registre-accessibilite` (1). Tous sont en
`etendue: "articles_cites"`. **Le référentiel cite 14 articles du CCH** : R. 134-1, -2,
-6, -7, -10, -11 ; R. 141-10, -11 ; R. 143-41, -44 ; R. 146-35 ; R. 157-1, -2, -4.
**Aucun article de la partie législative n'est au corpus.**

Le grep n'a servi qu'à chercher **hors corpus**, et il trompe sur ce code plus que sur
tout autre : **le CCH a été recodifié au 2021-07-01**, et ses anciens numéros sont
toujours dans le dépôt et dans les arrêtés. Un « R. 122-29 » dans `incendie.ts` est
l'ancien article IGH, pas l'actuel R. 122-29 (procédures administratives) ; « R. 123-51 »
est l'ancien registre de sécurité ERP, devenu R. 143-44 ; « R. 125-2-x » l'ancien régime
des ascenseurs ; « R. 111-19-x » l'ancienne accessibilité. Une mention par numéro n'est
donc pas une lecture. Les arrêtés eux-mêmes renvoient encore à l'ancienne numérotation :
`GN 4` cite R. 123-13, `GH 57` à `GH 62` citent R. 122-4, -14, -16, -17 et -18
(article LEGI, par filtre).

### Vocabulaire

Les statuts sont ceux des inventaires du Code du travail :

- **couvert** — au moins un article du chapitre est au corpus. Précisé *n sur N*.
- **lu hors corpus** — un article du chapitre est cité avec sa lecture (verbatim, version
  constatée, ou « relu sur Légifrance » écrit en clair) dans un fichier de `src/`, sans
  entrée de corpus.
- **écarté** — un motif écrit existe : CLAUDE.md § « Hors périmètre », `hors_perimetre`
  au corpus, ou un ADR.
- **jamais ouvert** — aucun article du chapitre n'est lu nulle part.

S'y ajoute la colonne **destinataire**, qui est ma lecture du chapitre :

- **E** — l'exploitant, le propriétaire ou l'occupant d'un bâtiment **existant** : un
  acte d'entretien, de vérification, de registre, d'affichage, de déclaration, ou un état
  à maintenir.
- **C** — le constructeur ou le maître d'ouvrage, pour construire ou transformer.
- **A** — une autorité ou un organisme : maire, préfet, commission, organisme agréé,
  procédure, sanction.
- **T** — un rapport de droit privé sur l'immeuble : vente, location, statut des sociétés,
  aides, logement social, copropriété.

Un chapitre peut être E pour une section et C pour les autres ; la ligne le dit.

---

## 3. CCH, partie législative, livre Ier — 276 articles en vigueur

Plan LEGI. Destinataire : article LEGI, par filtre, sauf mention « en entier ».

| Titre / chapitre | Articles | Statut | Destinataire | Ce qui pèse sur l'existant, et le rythme |
|---|---|---|---|---|
| **I** ch. I — Définitions | 1 (L. 111-1) | jamais ouvert | — | — |
| I ch. II — Principes généraux de respect des règles de construction | 13 (L. 112-1 à -13) | jamais ouvert | C | Rien. `L. 112-9` et `-10` ne sont cités que par le texte de R. 141-11 (attestations) |
| I ch. III — Autres règles applicables aux bâtiments | 20 (L. 113-1 à -20) | jamais ouvert | C, E | E : `L. 113-16` et `-17`, recharge des véhicules électriques à la demande du locataire ou de l'occupant. Rien qui touche la sécurité |
| **II** ch. I — Structures de conseil et de recherche | 7 | jamais ouvert | A | — |
| II ch. II — Procédures administratives | 14 (L. 122-2 à -14) | jamais ouvert | C, A | — |
| II ch. III — Responsabilités et assurances | 7 | jamais ouvert | C | — |
| II ch. IV — Contrats et marchés | 4 | jamais ouvert | C | — |
| II ch. V — Contrôle technique | 6 (L. 125-1 à -6) | jamais ouvert | C | `L. 125-1` est cité dans `ascenseurs.ts` sans lecture |
| II ch. VI — Exploitation des bâtiments | 51 (L. 126-1 à -38) | jamais ouvert | **E**, T, A | Ravalement des façades « au moins une fois tous les dix ans », sur injonction municipale, dans les communes listées (`L. 126-2`) ; déclaration en mairie de termites (`L. 126-4`) et de mérule (`L. 126-5`) par l'occupant, sinon le propriétaire ; affichage du DPE au public dans certaines catégories de bâtiments (`L. 126-30`) ; DPE « renouvelé ou mis à jour tous les dix ans » dans les cas de `L. 126-31`. Le reste : diagnostics de vente et de location, carnet d'information du logement, diagnostic structurel des immeubles d'habitation, divisions |
| **III** ch. I — Stabilité et solidité | 3 | jamais ouvert | C | — |
| III ch. II — Prévention des risques naturels | 9 | jamais ouvert | C | — |
| III ch. III — Risques technologiques et miniers | 2 | jamais ouvert | aucun destinataire nommé | — |
| III ch. IV — Sécurité d'usage des bâtiments | 13 (L. 134-1 à -13) | **lu hors corpus** (`L. 134-1`, `-3`, `-4`, cités « relus sur Légifrance » en tête de `ascenseurs.ts`) | **E**, C | Ascenseurs : entretien à la charge du propriétaire (`L. 134-3`), contrôle technique périodique (`L. 134-4`). Portes et portails automatiques de garage « maintenus en bon état de fonctionnement » (`L. 134-11`, en entier) — **rythme vague** (§ 7). Le reste est C : électricité et gaz (état exigé à la vente et à la location, `L. 134-7`, `-9`), piscines (`L. 134-10`), chutes (`L. 134-12`), bâtiments à usage professionnel conçus pour la sécurité des travailleurs qui les entretiennent (`L. 134-13`) — tous en entier |
| **IV** ch. I — Objectifs généraux de sécurité contre l'incendie | 4 (L. 141-1 à -4) | jamais ouvert | C | `L. 141-4` fonde le registre de sécurité incendie (cité par R. 141-10) |
| IV ch. II — Bâtiments d'habitation | 4 (L. 142-1 à -4) | jamais ouvert | **E** | Mesures de sécurité incendie dans les parties communes, à la charge des propriétaires (`L. 142-2`, en entier) ; entrepôt de matières explosives ou inflammables (`L. 142-3`) |
| IV ch. III — Établissements recevant du public | 3 (L. 143-1 à -3) | jamais ouvert | **E**, A | Mesures complémentaires imposables par décret « aux propriétaires, aux constructeurs et aux exploitants » (`L. 143-2`, en entier) ; fermeture et astreinte (`L. 143-3`) |
| IV ch. IV — Bâtiments à usage professionnel | **0** | — | — | Chapitre vide au 2026-11-03 |
| IV ch. V — Immeubles de moyenne hauteur | 1 | jamais ouvert | C | — |
| IV ch. VI — Immeubles de grande hauteur | 1 (L. 146-1) | jamais ouvert | C, A | Autorisation de travaux |
| **V** ch. I à VI — Qualité sanitaire (objectifs, réseaux d'eau, air intérieur, acoustique, ouvertures, dimensions) | 17 | jamais ouvert | C | `L. 153-2` et `-3` (renouvellement d'air) : C, en entier |
| V ch. VII — Autres équipements | 2 (L. 157-1, -2) | jamais ouvert (sa partie réglementaire est au corpus) | **E** | `L. 157-2` (en entier) : défibrillateur des ERP, « les propriétaires des établissements s'assurent de la maintenance » dans les conditions de `L. 5212-1` du CSP. C'est le fondement législatif de ce que `cch-defibrillateur` sert |
| **VI** ch. I — Objectifs généraux d'accessibilité | 3 | jamais ouvert | C, A | `L. 161-1` cité dans `accessibilite/schema.ts` sans lecture |
| VI ch. II — Construction de bâtiments | 1 | jamais ouvert | C | — |
| VI ch. III — Modification de bâtiments existants | 2 | jamais ouvert | C | — |
| VI ch. IV — ERP existants | 3 (L. 164-1 à -3) | jamais ouvert | **E** | Mise en accessibilité (`L. 164-1`, `-2`) ; transmission à l'autorité par le propriétaire ou l'exploitant d'un ERP existant au 2014-12-31 (`L. 164-2`, en entier). `L. 164-1` fonde le registre public d'accessibilité, que le produit sert depuis R. 164-6 |
| VI ch. V — Agendas d'accessibilité programmée | 7 | jamais ouvert | **E**, A | Dépôt et suivi de l'agenda par le propriétaire ou l'exploitant |
| **VII** ch. I à III — Performance énergétique (objectifs, construction, existants) | 8 | jamais ouvert | C, A | — |
| VII ch. IV — Suivi de l'efficacité énergétique | 3 (L. 174-1 à -3) | **écarté** (CLAUDE.md : « décret tertiaire / OPERAT ») | E | Réduction de la consommation des bâtiments tertiaires (`L. 174-1`) |
| VII ch. V — Entretien et renouvellement des systèmes techniques | 2 | jamais ouvert | E, C | Régulation de température lors du remplacement d'un générateur (`L. 175-2`, en entier) ; `L. 175-1` renvoie au code de l'énergie |
| **VIII** (article de titre) | 1 (L. 180-1) | jamais ouvert | A | — |
| VIII ch. I — Contrôles et sanctions administratives | 15 | jamais ouvert | A | — |
| VIII ch. II — Solutions d'effet équivalent | **0** | — | — | Chapitre vide |
| VIII ch. III — Infractions et sanctions pénales | 18 | jamais ouvert | A | — |
| VIII ch. IV — Règles de sécurité | 9 (L. 184-1 à -9) | jamais ouvert | A | Prescriptions du maire à l'exploitant d'un ERP à usage d'hébergement, astreinte solidaire du propriétaire et de l'exploitant (`L. 184-1` à `-3`) |
| VIII ch. V — Règles en matière énergétique | 6 | jamais ouvert | A | — |
| VIII ch. VI — Sécurité des ascenseurs | 8 | jamais ouvert | A | — |
| **IX** — Outre-mer (2 chapitres) | 8 | jamais ouvert | C | — |

---

## 4. CCH, partie réglementaire, livre Ier — 631 articles en vigueur (et 1 annexe)

Plan LEGI. Destinataire : article LEGI, par filtre, sauf mention « en entier ».

| Titre / chapitre | Articles | Statut | Destinataire | Ce qui pèse sur l'existant, et le rythme |
|---|---|---|---|---|
| **I** ch. I — Définitions | 2 | jamais ouvert | — | `R. 111-1` cité dans `aides-regimes.ts` sans lecture |
| I ch. II — Principes généraux de respect des règles de construction | 19 | jamais ouvert | C, A | — |
| I ch. III — Autres règles applicables aux bâtiments | 24 (R. 113-1 à -24) | jamais ouvert | C, E | E, hors sécurité : recharge des véhicules à la demande de l'occupant (`R. 113-7` à `-9`) ; stationnement sécurisé des vélos, dû par le propriétaire d'un bâtiment dont le parc compte au moins 10 places destinées aux travailleurs (`R. 113-14`) |
| I ch. IV — Mise sur le marché des produits de construction | 5 | jamais ouvert | A | — |
| **II** ch. I — Structures de conseil et de recherche | 22 | jamais ouvert | A | — |
| II ch. II — Procédures administratives | 37 (R. 122-1 à -38) | **couvert — 1 sur 37** (`R. 122-5`, `sans_objet`, `cch-classement-erp-igh`) | C, A | Les mentions `R. 122-1`, `-4`, `-16`, `-17`, `-28` à `-30` du dépôt sont, pour celles que j'ai pu situer, l'ancienne numérotation IGH |
| II ch. III — Responsabilités et assurances | 1 | jamais ouvert | C | — |
| II ch. IV — Contrats et marchés | **0** | — | — | Chapitre vide |
| II ch. V — Contrôleurs techniques et bureaux d'étude agréés | 32 | jamais ouvert | A | — |
| II ch. V bis — Organismes de qualification | 9 | jamais ouvert | A | — |
| II ch. VI — Exploitation des bâtiments | 62 (R. 126-1-A à -47) | jamais ouvert | **E**, T | Termites : état du bâtiment et attestation de travaux adressés au maire par le propriétaire (`R. 126-3`) ; **affichage du DPE** au public par le propriétaire, le gestionnaire ou l'exploitant, dans les bâtiments de plus de 250 m² occupés par une collectivité publique et accueillant un ERP des catégories 1 à 4, et dans ceux de plus de 500 m² accueillant un ERP des catégories 1 à 4 dont le DPE a été fait à la construction, la vente ou la location (`R. 126-18`, en entier). Le reste : diagnostics (déchets de démolition, DPE, audit, électricité, gaz, termites, structure), carnet d'information, accès des huissiers et des opérateurs |
| **III** ch. I — Stabilité et solidité | 7 (R. 131-1 à -7) | jamais ouvert | **E**, A | **Structures provisoires et démontables** : leurs propriétaires et les organisateurs d'évènements « font procéder aux contrôles, vérifications et inspections nécessaires » (`R. 131-7`, en entier, version du 2025-02-01) — **rythme vague** (§ 7). Termites (`R. 131-1` à `-4`) : aucun destinataire de terrain nommé |
| III ch. II — Risques naturels | 26 | jamais ouvert | C, A | — |
| III ch. III — Risques technologiques | **0** | — | — | Chapitre vide |
| III ch. IV — Sécurité d'usage des bâtiments | 70 (R. 134-1 à -62) | **couvert — 6 sur 70** (`R. 134-1`, `-2`, `-6`, `-7`, `-10`, `-11`, tous `retenu`, `cch-ascenseurs`) ; `R. 134-5`, `-8`, `-12`, `-13` cités dans `ascenseurs.ts` ; section 4 **écartée** (CLAUDE.md : « piscines ») | **E**, C | Section 1, ascenseurs : 56 articles (R. 134-1 à R. 134-48-8), 6 au corpus. Section 5, **portes automatiques de garage** des bâtiments d'habitation : les propriétaires « sont tenus de les faire entretenir et vérifier périodiquement aux termes de contrats écrits », interventions consignées dans un livret d'entretien (`R. 134-58`, en entier) — **rythme vague** (§ 7). `R. 134-55` à `-57` : prescriptions techniques des portes (C, et mise en conformité des portes antérieures au 1992-01-07). Section 2 (électricité, 2 articles) : état exigé à la vente, C/T. Section 4 (piscines, 4 articles, D. 134-51 à -54) : dispositif anti-noyade des piscines privatives, à la charge du maître d'ouvrage et du propriétaire. Sections 6 et 7 (4 articles) : C |
| **IV** ch. I — Règles générales | 17 (R. 141-1 à -17) | **couvert — 2 sur 17** (`R. 141-10`, `-11`, `retenu`, `cch-registre-securite`) | C, E | Le registre de sécurité incendie (section 3) est le seul acte d'exploitant du chapitre. `R. 141-7`, `-15`, `-17` cités dans `incendie.ts` sans lecture |
| IV ch. II — Bâtiments d'habitation | 5 (R. 142-1 à -5) | jamais ouvert | **E** | Les installations de protection des habitants « doivent être entretenus et vérifiés » jusqu'à la destruction de l'immeuble, les propriétaires en justifient par un registre (`R. 142-1`, en entier, version du 2025-11-21) — **aucun rythme écrit**, renvoi à un arrêté (celui du 31 janvier 1986, § 6.3). Détecteur de fumée : installation par le propriétaire, entretien et renouvellement par l'occupant (`R. 142-2`, `-3`). Mesures de sécurité dans les parties communes, dont les consignes (`R. 142-4`, en entier) |
| IV ch. III — Établissements recevant du public | 45 (R. 143-1 à -47) | **couvert — 5 sur 45** (`R. 143-19`, `-38`, `-42` `sans_objet` ; `R. 143-41`, `-44` `retenu`) | **E**, A, C | Non lus au corpus et adressés à l'exploitant : `R. 143-3` (constructeurs, propriétaires et exploitants « tenus, tant au moment de la construction qu'au cours de l'exploitation, de respecter les mesures de prévention et de sauvegarde », en entier) ; `R. 143-5` (s'assurer des essais des matériaux) ; **`R. 143-34`** (en entier, version du 2025-11-21) : les exploitants font procéder « périodiquement en cours d'exploitation aux vérifications nécessaires » par des organismes ou personnes agréés — **rythme vague** (§ 7) ; `R. 143-21` (groupement d'exploitations sous une direction unique, déclaration de tout changement de direction, en entier) ; `R. 143-27` (recours de l'exploitant) ; `R. 143-39` (fermeture notifiée à l'exploitant). Le reste : commissions, classement, procédure |
| IV ch. IV — Bâtiments à usage professionnel | 1 (R. 144-1) | jamais ouvert | renvoi | En entier : renvoie au chapitre VI du titre Ier du livre II de la quatrième partie du Code du travail (R. 4216-1 et s., maître d'ouvrage). Rien à l'exploitant ici |
| IV ch. V — Immeubles de moyenne hauteur | 6 | jamais ouvert | C | `R. 145-1` (en entier) : chapitre applicable aux immeubles à construire et aux transformations |
| IV ch. VI — Immeubles de grande hauteur | 33 (R. 146-1 à -35) | **couvert — 3 sur 33** (`R. 146-3`, `-4` `sans_objet` ; `R. 146-35` `retenu`) | **E**, A, C | Section 4, « Obligations relatives à l'occupation des locaux » (5 articles, aucun au corpus) : maintien et vérification des installations par le propriétaire (`R. 146-20`, en entier) ; service de sécurité unique et « exercices périodiques d'évacuation » (`R. 146-23`, en entier — **rythme vague** (§ 7)) ; **les propriétaires, les locataires et les occupants** ne peuvent modifier les lieux contre le règlement « et doivent s'assurer que le potentiel calorifique des éléments mobiliers introduits dans l'immeuble n'excède pas les limites » du règlement (`R. 146-24`, en entier) — c'est le fondement au CCH de GH 61. Section 5 : présence du propriétaire aux visites (`R. 146-29`, `-34`) |
| **V** ch. I — Objectifs généraux de qualité sanitaire | 2 | jamais ouvert | C | — |
| V ch. II — Réseaux d'eau | 2 | jamais ouvert | C | Comptage de l'eau froide en habitation neuve (`D. 152-1`, en entier) |
| V ch. III — Qualité d'air intérieur | 8 (R. 153-1 à -8) | jamais ouvert | **E**, C | Prévention du monoxyde de carbone dans les locaux d'**habitation** : dans l'existant, entrée d'air et évacuation à la charge du propriétaire (`R. 153-5`, en entier) ; l'occupant n'entrave pas leur fonctionnement (`R. 153-6`) |
| V ch. IV à VI — Acoustique, ouvertures, dimensions | 9 | jamais ouvert | C | — |
| V ch. VII — Autres équipements | 6 (R. 157-1 à -6) | **couvert — 4 sur 6** (`R. 157-1`, `-2`, `-4` `retenu` ; `R. 157-3` `sans_objet`) | E, C | `R. 157-5` (conduits de fumée, vide-ordures) et `R. 157-6` (local à ordures des immeubles collectifs) : C, en entier |
| **VI** ch. I — Règles générales d'accessibilité | 3 | jamais ouvert | A | Bâtiments du ministère de la défense |
| VI ch. II — Bâtiments neufs | 15 | jamais ouvert | C | — |
| VI ch. III — Modification de bâtiments d'habitation et à usage professionnel existants | 8 | jamais ouvert | C | — |
| VI ch. IV — ERP existants | 6 (R. 164-1 à -6) | **couvert — 1 sur 6** (`R. 164-6`, `sans_objet`, `cch-registre-accessibilite`, aussi lu dans `documents-obligatoires.ts` avec version constatée) | **E**, A | `R. 164-1` (en entier) renvoie à un arrêté les obligations d'accessibilité des ERP existants (§ 6.6) ; `R. 164-2` à `-5` : dérogations et délais |
| VI ch. V — Agendas d'accessibilité programmée | 21 | jamais ouvert | **E**, A | Attestation d'accessibilité, dépôt, suivi et achèvement de l'agenda par le propriétaire ou l'exploitant |
| **VII** ch. I à III — Performance énergétique (règles générales, construction, existants) | 67 | jamais ouvert | C, A, T | Ch. III, section 4 : travaux d'économies d'énergie votés en copropriété (T) |
| VII ch. IV — Suivi de l'efficacité énergétique | 32 (R. 174-1 à -32) | sections 2 et 3 **écartées** (CLAUDE.md : « décret tertiaire / OPERAT ») ; section 1 jamais ouverte | E | Section 1 (18 articles) : équipements de comptage et répartition des frais de chauffage des immeubles collectifs. Sections 2 et 3 (14 articles) : bâtiments tertiaires, propriétaires et preneurs à bail (`R. 174-22`) |
| VII ch. V — Systèmes techniques des bâtiments | 10 (R. 175-1 à -9) | jamais ouvert | **E** | Hors sécurité : systèmes d'automatisation et de contrôle des bâtiments tertiaires, « soumis à inspection périodique » à l'initiative du propriétaire, rapport conservé dix ans (`R. 175-5-1`, en entier) — **rythme vague** (§ 7) ; fermeture des ouvertures des locaux tertiaires chauffés ou climatisés, mise en demeure de l'exploitant (`R. 175-7`, `-9`) |
| **VIII** ch. I à III | **0** | — | — | Trois chapitres vides |
| VIII ch. IV — Règles de sécurité | 8 (R. 184-1 à -8) | jamais ouvert | A | Contraventions : propriétaire d'IGH absent aux visites (`R. 184-2`), constructeur, propriétaire ou exploitant d'ERP (`R. 184-4`, `-5`), monoxyde de carbone (`R. 184-6`), termites (`R. 184-7`) |
| VIII ch. V — Règles en matière énergétique | 2 | jamais ouvert | A | — |
| VIII ch. VI — Sécurité des ascenseurs | 1 (R. 186-1) | jamais ouvert | A | Contraventions du propriétaire d'ascenseur |
| **IX** — Outre-mer (2 chapitres) | 8 | jamais ouvert | C | — |
| Annexe à l'article R. 172-4 | 1 | jamais ouvert | C | — |

---

## 5. CCH, livres II à VIII — 1 093 articles législatifs, 2 069 réglementaires, 56 annexes

Plan LEGI, au niveau du titre. Les intitulés suffisent à dire le destinataire. Ils ne
disent pas qu'aucun article ne touche un exploitant : ces livres n'ont pas été lus article
par article, sauf les cinq articles cités au tableau (`L. 511-1`, `-2`, `-4` et
`R. 511-1` au livre V, `L. 731-1` au livre VII).

| Livre | Articles L / R | Statut | Destinataire | Constat |
|---|--:|---|---|---|
| II — Statut des constructeurs | 259 / 205 | jamais ouvert | T, C | Sociétés de construction, promotion, maison individuelle, baux, ventes, protection de l'acquéreur |
| III — Aides à la construction et à l'amélioration de l'habitat, APL | 238 / 962 | jamais ouvert | T, A | Financement |
| IV — Habitations à loyer modéré | 291 / 519 | jamais ouvert | T, A | Organismes HLM et leurs locataires |
| V — Lutte contre l'habitat indigne | 49 / 32 | jamais ouvert | A | Police de la sécurité et de la salubrité, exercée par le maire ou le préfet (`L. 511-1`, `-2`, `-4`, en entier). Le propriétaire n'y est débiteur qu'**après un arrêté** ; `R. 511-1` (en entier) énumère les équipements communs des immeubles d'habitation (désenfumage, VMC, éclairage de sécurité, eau chaude…) dont le défaut d'entretien ouvre la procédure |
| VI — Difficultés exceptionnelles de logement | 135 / 103 | jamais ouvert | T, A | Répartition des logements, changement d'usage, réquisition |
| VII — Copropriété | 22 / 26 | jamais ouvert | T | Immatriculation, information des acquéreurs, diagnostic technique global voté par l'assemblée générale (`L. 731-1`, en entier) |
| VIII — Aides personnelles au logement | 99 / 222 | jamais ouvert | T, A | — |
| Annexes des livres II à IV | 56 | jamais ouvert | T | Clauses types, conventions types, statuts types |

---

## 6. Les arrêtés pris pour le CCH que le dépôt connaît mal

### 6.1 Arrêté du 25 juin 1980 (règlement de sécurité ERP) — 1 167 entrées en vigueur

Plan LEGI : 3 articles liminaires, livre Ier 15, livre II 799, livre III 58, livre IV
292. Les comptes des livres II à IV sont ceux de `denominateur-livre-2-erp.md`
(2026-09-03), retrouvés à l'unité sur le jeu du 2026-11-02.

**Livre Ier, GN — 15 articles, chapitre unique.** Au corpus : 3 (`GN 1` et `GN 10`
`sans_objet`, `GN 13` `non_couvert`). Les douze autres sont **jamais ouverts**. Ouverts
par filtre, cinq articles nomment l'exploitant ou le propriétaire : `GN 1`, `GN 6`
(utilisations exceptionnelles des locaux, version du 2023-11-04), `GN 8` (principes
d'exploitation pour l'évacuation, version du 2010-01-23), `GN 12` (justification du
classement au feu des matériaux par les « constructeurs, propriétaires, installateurs ou
exploitants ») et `GN 13`. `GN 15` (structures provisoires et démontables dans les ERP,
version du 2023-11-04) ne nomme personne au filtre et renvoie à la même matière que
R. 131-7. Aucun rythme écrit dans le livre.

**Livres II et III.** Corpus `integral` : pour le livre II, 348 entrées au titre Ier
(`arrete-1980-livre-2`, 313 au plan) et 510 au titre II (`arrete-1980-livre-2-titre-2`,
486 au plan) ; 59 pour le livre III (58 au plan). Le corpus compte plus d'entrées que
d'articles parce qu'il découpe certains articles par paragraphe ou par acte — « MS 69 —
stock permanent de fournitures de rechange », « M 40 § 3 e) — contrat d'entretien… »
en sont deux, relevées au § 8 (voir § 10.5). Hors de cet inventaire.

**Livre IV, établissements spéciaux — 292 articles, 1 au corpus (`PS 32`).**

| Chapitre | Articles | Au corpus | Nomment l'exploitant, l'organisateur ou le propriétaire (filtre) | Portent un mot de rythme (filtre) |
|---|--:|---|--:|---|
| I — PA, établissements de plein air | 13 | 0 | 0 | — |
| II — CTS, chapiteaux, tentes et structures itinérantes | 87 | 0 | 22 | CTS 15, 33, 34, 35, 44, 45, 50, 74, 76, 79, annexe I |
| III — SG, structures gonflables | 26 | 0 | 5 | SG 23, annexe 1 |
| IV — OA, hôtels-restaurants d'altitude | 30 | 0 | 1 | OA 1, OA 3 |
| V — REF, refuges de montagne | 44 | 0 | 6 | REF 5, REF 7 |
| VI — PS, parcs de stationnement couverts | 43 | 1 (`PS 32`, `retenu`) | 6 | PS 32, PS 33 |
| VII — GA, gares | 49 | 0 | 15 | GA 10, 36, 39, 43, 44 |

Un « mot de rythme » au filtre n'est pas un rythme : le mot peut porter sur autre chose
qu'un acte de l'exploitant. Ces articles **n'ont pas été lus par moi** au-delà du filtre.

### 6.2 Arrêté du 30 décembre 2011 (règlement IGH) — 137 entrées en vigueur

Plan LEGI : articles liminaires et pièces jointes (6 entrées), titre Ier 64, titre II 9,
titre III 58. Au corpus : 6 (`GH 4` `hors_perimetre` ; `GH 5`, `GH 61`, `GH W 5`
`non_couvert` ; `GH 66`, `GH U 16` `sans_objet`).

| Chapitre | Articles | Au corpus | Nomment l'occupant, le locataire ou l'exploitant (filtre) |
|---|--:|---|---|
| Titre Ier, ch. I — Dispositions générales | 5 | GH 4, GH 5 | GH 3, GH 5 |
| Titre Ier, ch. II — Construction | 50 | 0 | GH 27, GH 28, GH 49 |
| **Titre Ier, ch. III — Obligations des propriétaires et des occupants** | **9** (GH 57 à 65) | GH 61 | GH 60, 61, 63, 64 |
| Titre II, ch. I à III — Classement, indépendance des volumes, ERP et locaux non indépendants | 9 | GH 66 | GH 71, GH 74 |
| Titre III — Neuf chapitres par classe (A, O, R, S, U, W, Z, TC, ITGH) | 58 | GH U 16, GH W 5 | GH R 8, GH R 9, GH U 6, GH U 15, GH W 5 |

Le chapitre III du titre Ier est le cœur de la question « obligations de l'occupant ».
Ouverts par filtre : `GH 57` et `GH 58` (mandataire de sécurité) ; `GH 59` (entretien
des installations par le propriétaire) ; **`GH 60`** — le propriétaire « organise au
moins une fois chaque année » un exercice d'évacuation de chaque compartiment dans les
immeubles qu'il vise (version du 2012-04-01 ; **rythme écrit**, lu sur le texte du jeu) ;
`GH 61` (charge calorifique, au corpus) ; `GH 62` (service de sécurité) ; `GH 63` (les
occupants réalisent l'évacuation de première phase) ; `GH 64` (interdictions faites
« aux propriétaires, aux occupants et aux exploitants ») ; `GH 65` (précautions pendant
les travaux). **Huit de ces neuf articles ne sont pas au corpus.**

Les trois obligations IGH retirées le 2026-10-07 sont au § 8.

### 6.3 Arrêté du 31 janvier 1986 (habitation) — 112 entrées en vigueur

Plan LEGI : 107 articles numérotés (de 1 à 109, avec des bis et des absents) et 5 annexes.
Au corpus : 12 (`1`, `3`, `60`, `78-1`, `97` à `104`). Le titre VIII, « Obligations
des propriétaires » (articles 100 à 104), y est entier.

Les **100** autres sont **jamais ouverts** au dépôt. Leurs titres — structures,
enveloppe, dégagements, conduits et gaines, logements-foyers, parcs de stationnement —
sont des règles de construction, et le filtre n'y trouve que deux candidats à un acte
d'exploitation, **non lus par moi en entier** : l'article 69 (téléphone permanent dans
les logements-foyers, chapitre II du titre V) et l'annexe 5 (modèle d'attestation de
respect des dispositions relatives au stockage, liée à l'article 78-1). L'article 78-1
lui-même est au corpus (`non_couvert`), et sa présence suffit à démentir que les titres
II à VII seraient purement constructifs.

### 6.4 Arrêté du 9 janvier 1990 (établissements flottants, type EF) — 29 entrées en vigueur

`LEGITEXT000006075247`, dossier `JORFTEXT000000707448`. **Aucun article au corpus.**
Plan LEGI : 10 articles liminaires, 18 articles EF en quatre titres, 1 annexe (le
contenu du registre de sécurité, version du 2009-03-13).

| Partie | Articles | Ce qui pèse sur l'exploitant |
|---|--:|---|
| Articles 1 à 10 | 10 | **Article 6** (en entier, version du 1990-04-13) : l'attestation de conformité est validée lors de visites de contrôle périodiques des commissions de sécurité, « chaque année pour les établissements de 1re catégorie, tous les deux ans pour les établissements de 2e, 3e et 4e catégorie » — **rythme écrit**, visite de l'autorité. Le reste : champ, procédure, effectifs, exécution |
| Titre Ier — Domaine d'application (EF 1 à 3) | 3 | Champ ; renvoi au règlement ERP pour tout ce que l'arrêté ne règle pas (EF 3) |
| Titre II — Construction et aménagements (EF 4 à 14) | 11 | C. `EF 11` et `EF 12` (gaz) sont en version du 2026-01-01 |
| Titre III — Moyens de secours (EF 15 à 17) | 3 | Extincteurs, alarme, alerte : dotations |
| Titre IV — Obligations de l'exploitant (EF 18) | 1 | **En entier** : registre de sécurité tenu à jour par l'exploitant, consignes d'incendie établies et affichées, exploitants et personnel qui les connaissent et savent mettre en œuvre les moyens de secours |
| Annexe | 1 | Contenu du registre |

### 6.5 Arrêtés gaz habitation (2018) et registre d'accessibilité (2017)

| Texte | Entrées en vigueur (plan LEGI) | Au corpus |
|---|--:|--:|
| Arrêté du 23 février 2018, gaz combustible des bâtiments d'habitation | 38 | 4 entrées (art. 26 en trois découpes, art. 32) |
| Arrêté du 19 avril 2017, registre public d'accessibilité | 5 | 4 (art. 1er à 4) |

Ni l'un ni l'autre n'a été lu par moi au-delà de ce compte.

### 6.6 D'autres arrêtés de sécurité des bâtiments, croisés en lisant le CCH

Trouvés par leur titre dans les en-têtes du jeu (`texte/version`), tous **en vigueur**
selon le jeu. **Aucun n'a été ouvert par moi** : le titre dit l'objet, pas le contenu.

| Texte | Identifiant | Article du CCH qui y renvoie | Le dépôt le cite |
|---|---|---|---|
| Arrêté du 12 novembre 1990 relatif à l'entretien des portes automatiques de garage des bâtiments d'habitation | `JORFTEXT000000534115` | R. 134-58 | non |
| Arrêté du 1er février 1991 relatif à la mise en conformité des portes automatiques de garage des bâtiments d'habitation | `JORFTEXT000000535851` | R. 134-57 | non |
| Arrêté du 25 juillet 2022 fixant les règles de sécurité et les dispositions techniques applicables aux structures provisoires et démontables | `JORFTEXT000046143966` | R. 131-7 | cité au corpus du livre II de 1980 et dans `incendie.ts`, sans entrée propre |
| Arrêté du 30 septembre 2022 relatif aux règles de sécurité et dispositions techniques applicables aux structures provisoires et démontables installées à l'intérieur (titre tronqué au relevé) | `JORFTEXT000046421923` | R. 131-7 | non |
| Arrêté du 8 décembre 2014 pris pour l'application des articles R. 111-19-7 à R. 111-19-11 du CCH (numérotation antérieure à 2021 : accessibilité des ERP existants) | `JORFTEXT000029893131` | R. 164-1 | non |
| Arrêté du 23 février 2009, prévention des intoxications par le monoxyde de carbone (habitation) | `JORFTEXT000020314838` | R. 153-2 à -5 | non |
| Arrêté du 7 avril 2023 relatif aux systèmes d'automatisation et de contrôle des bâtiments tertiaires | `JORFTEXT000047422562` | R. 175-5-1 | non |
| Arrêté du 2 mai 2005, missions, emploi et qualification du personnel permanent des services de sécurité incendie des ERP et des IGH | `JORFTEXT000000448223` | — | une mention dans `src/`, une dans `docs/` |
| Arrêté du 11 décembre 2007, conditions d'agrément pour les vérifications réglementaires dans les ERP et les IGH | `JORFTEXT000018197540` | R. 143-34, R. 146-20 | non (destinataire : les organismes) |
| Arrêté du 4 juin 1982 portant approbation des dispositions complétant le règlement de sécurité ERP (types R et suivants, titre tronqué au relevé) | `JORFTEXT000000865121` | — | non |
| Arrêté du 18 novembre 2004 relatif aux travaux de sécurité à réaliser dans les installations d'ascenseurs | `JORFTEXT000000810522` | R. 134-1 et s. | le dépôt cite l'arrêté homonyme sur l'**entretien** (`JORFTEXT000000254219`) ; celui-ci, non vérifié |

Le jeu porte aussi une vingtaine d'arrêtés de sécurité incendie propres aux ERP de
l'État, ministère par ministère (éducation, défense, justice, culture, intérieur…), et
les arrêtés d'habilitation des bureaux de vérification CTS. Ils s'adressent à des
administrations et à des organismes, pas à l'exploitant d'une TPE. Je les signale sans
les compter.

---

## 7. Les rythmes vagues relevés au passage

Pour chacun, la citation est prise au texte du jeu (article lu en entier). La dernière
colonne dit où le rythme est chiffré, s'il l'est quelque part, et si je l'ai lu.

| Article | Ce qu'il dit | Rythme chiffré ailleurs ? |
|---|---|---|
| CCH `R. 143-34` | les exploitants font procéder « périodiquement en cours d'exploitation aux vérifications nécessaires » | Oui, dans le règlement de sécurité (GE et chapitres techniques), déjà au corpus |
| CCH `R. 142-1` | les installations de protection des habitants « doivent être entretenus et vérifiés de telle manière que le maintien de leurs caractéristiques et leur parfait fonctionnement soient assurés » | Renvoi à un arrêté ; l'arrêté de 1986 (titre VIII) est au corpus |
| CCH `R. 134-58` | les propriétaires font « entretenir et vérifier périodiquement » les portes automatiques de garage | Renvoi à l'arrêté du 12 novembre 1990, **non ouvert par moi** |
| CCH `L. 134-11` | portes et portails automatiques de garage « maintenus en bon état de fonctionnement » | Même renvoi |
| CCH `R. 131-7` | propriétaires de structures provisoires et organisateurs d'évènements « font procéder aux contrôles, vérifications et inspections nécessaires » | Renvoi aux arrêtés du 25 juillet et du 30 septembre 2022, **non ouverts par moi** |
| CCH `R. 146-23` | le propriétaire d'un IGH fait procéder « à des exercices périodiques d'évacuation » | Oui : `GH 60` 2. écrit « au moins une fois chaque année » |
| CCH `R. 146-20` | vérifications « imposées par le règlement de sécurité avant et pendant l'occupation » | Dans le règlement IGH, non relevé ici |
| CCH `R. 175-5-1` | les systèmes d'automatisation et de contrôle sont « soumis à inspection périodique » | Renvoi à l'arrêté du 7 avril 2023, **non ouvert par moi** |

Rythmes **écrits** rencontrés, et qu'aucune obligation du référentiel ne porte :
`L. 126-2` (façades, « au moins une fois tous les dix ans », sur injonction municipale) ;
`L. 126-31` (DPE « renouvelé ou mis à jour tous les dix ans ») ; `GH 60` 2. (exercice
annuel) ; arrêté EF, article 6 (visite de la commission annuelle en 1re catégorie,
biennale en 2e à 4e).

---

## 8. Articles du corpus marqués « hors cadre » ou écartés par une décision antérieure au 2026-11-03

Liste demandée par la coordination : la règle du 2026-11-03 (servir tout ce qui
s'adresse à l'exploitant) rouvre la question de ces décisions, et ce document ne la
tranche pas. Relevé en exécutant le corpus :
les articles en `non_couvert`, `hors_perimetre` ou `obligation_manquante` dont le motif
porte « hors cadre » ou « décision de la propriétaire ». **87 articles, dont 36 dans les
textes du CCH** :

| Texte | Articles |
|---|---|
| Arrêté de 1980, livre III (11) | PO 2 à PO 6, PO 9, PO 10, PO 11, annexe à l'article PO 11 (`non_couvert`) ; PU 5, PU 6 (`obligation_manquante`) |
| Arrêté de 1980, livre II, titre Ier (6) | GZ 13, GZ 14, AS 10, CH 23, CH 24 (`non_couvert`) ; MS 69 — stock de rechange (`obligation_manquante`, « hors cadre ») |
| Arrêté de 1980, livre II, titre II (14) | M 40 (`hors_perimetre`, `risque_specialise`) ; M 40 § 3 e), U 41, U 43, U 47, U 48, U 62, U 64, X annexe, X 1 § 2, J 33, J 35, J 39, J 40 (`obligation_manquante`) |
| Règlement IGH (2) | GH 5, GH 61 (`non_couvert`, décision du 2026-10-07) |
| Arrêté gaz 2018 (1) | art. 26 § 3 (`non_couvert`) |
| Arrêté habitation 1986 (2) | art. 78-1, art. 102 (`non_couvert`, « hors cadre ») |

S'y ajoutent **trois obligations retirées** (`OBLIGATIONS_RETIREES`) le 2026-10-07,
toutes du règlement IGH : `elec-igh-annuelle`, `incendie-igh-moyens-secours-annuelle`
et `incendie-igh-charge-calorifique-quinquennale`.

Les **51** autres articles relèvent d'autres textes, comptés par corpus pour mémoire :
`arrete-2021-09-10-retours-eau` 5, `code-sport-etablissements-aps` 6, `esp-suivi-en-service` 4,
`icpe-stockage` 4, `code-travail-matieres-inflammables` 4, `arrete-1957-09-30-chambres-froides` 3,
`code-travail-plan-prevention` 3, `code-travail-vigilance` 3, `arrete-2025-05-20-signal-sports` 2,
`code-travail-risque-chimique` 2, `code-travail-duerp-principes` 2, `code-travail-vigilance-modalites` 2,
et 1 chacun dans onze autres corpus. La liste ligne à ligne vient de la même exécution.

---

## 9. Le compte

Le chapitre est compté une fois par partie. Les chapitres vides au 2026-11-03 sont
comptés à part.

| CCH, livre Ier | Partie législative | Partie réglementaire | **Total** |
|---|--:|--:|--:|
| Chapitres au plan | 44 | 46 | **90** |
| — dont vides | 2 | 5 | **7** |
| Chapitres qui portent des articles | 42 | 41 | **83** |
| **couverts** (au moins un article au corpus) | 0 | 7 | **7** |
| **lus hors corpus** | 1 (L. 134) | 0 | **1** |
| **écartés avec motif écrit**, en entier | 1 (L. 174, décret tertiaire) | 0 | **1** |
| **jamais ouverts** | 40 | 34 | **74** |

Chaque chapitre porte un seul statut, et les quatre lignes en gras font le total. Deux
chapitres ont **en outre** une section écartée par un motif écrit, sans que cela change
leur statut : R. 134 (couvert ; section 4, piscines) et R. 174 (jamais ouvert ;
sections 2 et 3, décret tertiaire).

Les sept chapitres couverts le sont tous partiellement : R. 122 (1 sur 37), R. 134 (6 sur
70), R. 141 (2 sur 17), R. 143 (5 sur 45), R. 146 (3 sur 33), R. 157 (4 sur 6), R. 164
(1 sur 6). **Aucun chapitre du CCH n'est lu en entier.**

Les livres II à VIII (§ 5) sont **jamais ouverts**, et s'adressent aux parties d'une
vente, d'un bail, d'un financement ou d'une copropriété, ou à l'autorité : 1 093 articles
L, 2 069 R, 56 annexes.

### 9.1 Ce qui s'adresse à l'exploitant, au propriétaire ou à l'occupant et n'est pas au corpus

Articles en vigueur au 2026-11-03. Les chapitres jamais ouverts comptent pour tous leurs
articles. « Dont » isole la part adressée à l'existant quand le chapitre mêle les
destinataires, et cette part n'est mesurée qu'au filtre. En fin de tableau viennent les
articles hors corpus des chapitres couverts, comptés un par un.

| Chapitre | Articles | Dont, adressés à l'existant |
|---|--:|---|
| L. 126 — Exploitation des bâtiments | 51 | façades, termites, mérule, affichage du DPE, DPE décennal |
| L. 142 — Incendie, bâtiments d'habitation | 4 | L. 142-2, L. 142-3 |
| L. 143 — Incendie, ERP | 3 | L. 143-2, L. 143-3 |
| L. 157 — Autres équipements | 2 | L. 157-2 (défibrillateur) |
| L. 164 — Accessibilité, ERP existants | 3 | les trois |
| L. 165 — Agendas d'accessibilité | 7 | les sept |
| L. 175 — Systèmes techniques | 2 | L. 175-2 |
| R. 126 — Exploitation des bâtiments | 62 | R. 126-3 (termites), R. 126-18 (affichage du DPE) ; le reste : diagnostics de transaction |
| R. 131 — Stabilité et solidité | 7 | R. 131-5 à -7 (structures provisoires) |
| R. 142 — Incendie, bâtiments d'habitation | 5 | les cinq |
| R. 153 — Qualité d'air intérieur | 8 | R. 153-5, R. 153-6 |
| R. 165 — Agendas d'accessibilité | 21 | la plupart |
| R. 174 § 1 — Comptage et répartition des frais de chauffage | 18 | les dix-huit |
| R. 175 — Systèmes techniques | 10 | R. 175-5-1, R. 175-7 |
| Chapitres hors sécurité au sens strict (L. 113, R. 113 : recharge, vélos) | 44 | L. 113-16, -17 ; R. 113-7 à -9, -13, -14 |
| *Couvert* — R. 134, ascenseurs, hors des 6 retenus | 50 | section 1 |
| *Couvert* — R. 134, portes automatiques de garage | 4 | R. 134-55 à -58 |
| *Couvert* — R. 143, ERP | 6 | R. 143-3, -5, -21, -27, -34, -39 |
| *Couvert* — R. 146, IGH | 5 | R. 146-20, -23, -24, -29, -34 |
| *Couvert* — R. 164, ERP existants (accessibilité) | 5 | R. 164-1 à -5 |

### 9.2 Le volume à lire pour le lot suivant

| Bloc | Articles en vigueur | Dont déjà au corpus |
|---|--:|--:|
| CCH, livre Ier : le tableau du § 9.1 | 317 | 0 |
| Arrêté de 1980, livre Ier (GN) | 15 | 3 |
| Arrêté de 1980, livre IV | 292 | 1 |
| Arrêté EF du 9 janvier 1990 | 29 | 0 |
| Règlement IGH, en entier | 137 | 6 |
| Arrêté habitation de 1986, en entier | 112 | 12 |
| Arrêtés du § 6.6 adressés à l'existant (portes de garage, structures provisoires, ERP existants, monoxyde de carbone, SSIAP) | non mesuré | 0 |

**De l'ordre de 900 articles** à ouvrir, hors arrêtés du § 6.6. Le chiffre du CCH (317) additionne
les chapitres entiers du § 9.1 — 72 articles L, 131 R, 44 des chapitres 113 — et les 70
articles hors corpus des chapitres couverts. Il majore, puisque ces chapitres mêlent
les destinataires. Le volume réellement adressé à l'exploitant se mesurera à la lecture.

---

## 10. Ce que je n'ai pas fait

1. **Aucune page de Légifrance n'a été ouverte** (§ 1.1).
2. **La plupart des articles n'ont été lus que par filtre** (§ 1.2). Un article lu par
   filtre peut contenir un acte d'exploitant que le filtre n'a pas vu, notamment quand le
   texte dit « il » ou « l'intéressé ».
3. **Les livres II à VIII du CCH ont été classés par leurs titres**, sauf les cinq
   articles des livres V et VII cités au § 5.
4. **Les arrêtés du § 6.6 n'ont pas été ouverts.** Leur titre est tiré de l'en-tête du
   jeu, et deux titres sont tronqués au relevé.
5. **Les écarts entre le plan des livres II et III de 1980 et leurs corpus** (§ 6.1) ne
   sont pas instruits au-delà des deux découpes citées.
6. **Je n'ai pas vérifié qu'aucune mention du dépôt ne soit une lecture** pour les numéros
   CCH que je n'ai pas situés : seules les mentions de `ascenseurs.ts`,
   `documents-obligatoires.ts` et `incendie.ts` ont été ouvertes. Le classement « jamais
   ouvert » d'un chapitre peut donc, en un cas, se révéler « lu hors corpus ».
