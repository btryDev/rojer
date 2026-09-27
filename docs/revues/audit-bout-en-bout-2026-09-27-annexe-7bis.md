# Audit de bout en bout — annexe : table du 7 bis (2026-09-27)

Annexe de `docs/revues/audit-bout-en-bout-2026-09-27.md`. Trois tables article ×
prescription × état, une par groupe de corpus, et l'état de chaque ligne du guide
Qualiconsult qui touche la cible. Relevées le 2026-09-27 par trois sous-agents et
un quatrième pour le guide, chaque article lu en entier par l'API Légifrance.

**Ce que ces tables sont.** L'état AU RELEVÉ, sur `lot/audit-bout-en-bout` avant
ses corrections. Les fichiers de travail qu'elles citent (`zz-*.json`,
`zz-*.txt`, `guide.txt`, `corpus-dump.txt`) sont des extractions de session,
hors dépôt : ils se refont par l'API et `pdftotext -layout`. Les suites données à
chaque manque sont au § 0, qui fait foi sur les tables.

## 0. Suites données aux manques relevés

| Groupe | Ligne de la table | Suite | Où |
|---|---|---|---|
| G1 | GE 6 lu par l'identifiant de son article (url) | corrigé | `3615cb33` |
| G1 | n° 62 PE 27 § 2 ; encodages proposés 1 à 3 (alarme, dotation, dégagements N5) | décision — la réserve GN 10 de PE 27 interdit d'en ajouter | D21 (après D13) |
| G1 | n° 103 R. 134-6 2° d) ; proposés 4 à 9 (PE 18, PE 24, PE 15/19/21, GZ 13, PE 4 § 3, GH 5 § 4, `prescrit` de l'arrêté 2025-12-01) | décision ; le remplacement est dit dans la description (`1f4dee9c`, `205199d3`), son échéance reste à décider | D23 |
| G1 | proposé 8 : PE 27 § 2 c) | décision | D21 |
| G1 | n° 59 PE 4 § 3 (mise en demeure) | décision (réserve ADR-035) | D23 |
| G1 | n° 104, 106, 114, 115 (ascenseur : pièces usées hors contrat, état initial et plan d'entretien, état des lieux au changement de prestataire, documents au contrôleur) | corrigés : dits dans les obligations d'ascenseur qui les portent, comme M4 | `1f4dee9c`, relus contre le texte `205199d3` |
| G1 | les 20 autres SANS ÉTAT | classés : livre II, hôtels, IGH, habitation (PE 1 § 1) | § D « Classés » de G1 |
| G2 | M1 dotation en extincteurs (R. 4227-29) | encodé comme obligation NOUVELLE d'établissement, `incendie-travail-moyens-lutte` inchangée (sa note la garde portée par l'équipement) | branche `lot/audit-obligations-nouvelles` |
| G2 | M2 éclairage de sécurité installé | décision (dispense de l'art. 5 hors corpus) | D22 |
| G2 | M3 R. 543-79, M4 notice BAES, M5 R. 4227-38 8°, M6 R. 4544-10 al. 2, M8 R. 4227-40, (ii) arr. 1993 art. 14 | corrigés | `f67f56d5` |
| G2 | M7 arr. 2017 art. 6 III (liste des ESP soumis) | corrigé | `1f4dee9c`, `205199d3` |
| G2 | N1 à N5 (art. 5 de 1993, R. 4323-97, -95, -101/-102, -104 3°-4°) | décision | D23 |
| G2 | (i) champ de la question des matières | décision : garder la question | D24 |
| G3 | L. 4141-1 al. 2 | corrigé | `974b7916` |
| G3 | R. 4228-19 | décision (sens nouveau) | D16 |
| G3 | L. 4121-3 al. 2 1° | décision | D17 |
| G3 | R. 4512-3, R. 4512-4 | décision | D18 |
| G3 | R. 4323-81 à -88 | décision | D19 |
| G3 | D. 4622-2 al. 2 (hors cible) ; R. 4451-57 (motif à confirmer ou reclasser) | décision | D20 |
| Guide | n° 2 vérification annuelle des ascenseurs par l'employeur (arrêté du 29-12-2010) | décision (obligation nouvelle de rythme) | D10 |
| Guide | CO₂ > 30 bar | décision | D11 |
| Guide | écarts écrits dans une revue seulement : « sur demande » (GE 8 § 3, PE 4 § 3, R. 4722-26), évaluation chimique (R. 4412-5 à -8, -10), eaux sanitaires | classés au corpus ou sans objet | `e193cd31` |
| Guide | CEM, VLEP, amiante, aires de jeux, > 70 kW, radon, R. 4412-9, rythme RPS | décision (un `toucheLaCible` change la liste du § 7) | D12 |

## 1. G1 — ERP, CCH, IGH, habitation, accessibilité
Relevé du 2026-09-27, agent G1 (préfixe zz-g1). Worktree `wt-cov`, branche `lot/audit-bout-en-bout`.

### Méthode et preuves

- Textes : API Légifrance (PISTE, production) via `src/lib/legifrance/client.ts`, `resoudreCible` + `lireArticle` de `src/lib/legifrance/verification.ts` (version EN VIGUEUR suivie quand le corpus pointe une version morte). 136 articles des 15 corpus lus ; 159 appels ; dump intégral : `zz-g1-textes.json` (texte + nota de chaque article).
- Trois articles que le résolveur standard ne lit pas, relus autrement :
  - `GE 6` : `getArticleWithIdAndNum` → null (version en vigueur `ABROGE_DIFF`, terme 2027-06-01). Relu par `/search` (fond LODA_ETAT) puis `getArticle(LEGIARTI000020380169)` : « § 1. Les vérifications techniques prévues par l'article R. 123-43 [...] doivent être effectuées soit par des organismes agréés par le ministre de l'intérieur, soit par des techniciens compétents. § 2. Les vérifications techniques doivent être effectuées par des organismes agréés lorsque la suite du présent règlement le prévoit. § 3. [renvoi] ». Version future `LEGIARTI000053564568` (VIGUEUR_DIFF) : renvoi corrigé vers R. 143-34. Le corpus n'a pas d'URL LEGIARTI pour GE 6 : `pnpm legifrance:verifier` ne peut pas le lire (défaut d'outillage, pas de droit).
  - `Arrêté 2025-12-01` et `Arrêté 2004-11-18` (cités entiers) : `/consult/jorf` (textes JORF, 14 et 16 articles), `zz-g1-textes2.json`.
- Obligations : `obligationsConformite` (172) exportées dans `zz-g1-obligations.json`.
- Moteur appelé (`determineObligationsApplicables`) sur trois établissements cibles (sortie collée au § « Preuve moteur »).
- « Cible » = restauration, commerce, bureau ; ERP de 5ᵉ catégorie ; ≤ 50 salariés. Le livre II ne s'applique pas en 5ᵉ sauf renvoi exprès : PE 1 § 1 (API) « Les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre. »

États : **PORTÉE** (id) · **ANNONCÉE** (où) · **ÉCARTÉE** (motif écrit, où) · **SANS ÉTAT** (manque). Colonne « Cible » : ce que dit le texte, pas une impression.

---

### A. Articles `retenu` (48) — prescriptions

| # | Article | § | Prescription (débiteur) | État | Où / preuve | Cible (texte) |
|---|---|---|---|---|---|---|
| 1 | CH 57 | al. 1 | Entretenir régulièrement, maintenir en bon état (exploitant) | SANS ÉTAT | aucune ligne, aucune réserve | non — livre II (PE 1 § 1) |
| 2 | CH 57 | al. 2 | Ramoner et nettoyer une fois par an conduits, cheminées, appareils | ANNONCÉE | réserve CH 57 (« DEUX ACTES DISTINCTS… ») + note de la référence CH 57 de `aeration-erp-chauffage-ventilation-annuelle` | non — livre II |
| 3 | CH 58 | § 1-2 | Vérification annuelle des installations (sections II, III, V-VIII) | PORTÉE | `aeration-erp-chauffage-ventilation-annuelle` | non — livre II (servie aux N5 par sur-application assumée) |
| 4 | CH 58 | § 2 | Contrôle d'étanchéité des systèmes thermodynamiques | ANNONCÉE | corpus livre 2, CH 58 (l. 74 : « Le référentiel ne porte que l'annuelle ») | non — livre II |
| 5 | CH 58 | § 2 | Dispositifs de sécurité CH 35 § 3 vérifiés en totalité tous les 3 ans | ANNONCÉE | idem | non — livre II |
| 6 | GC 8 | al. 1 | Doter grandes cuisines, offices, îlots de moyens d'extinction adaptés | SANS ÉTAT | ni ligne ni réserve | non — livre II |
| 7 | GC 8 | al. 2 | Installer une extinction automatique à l'aplomb des friteuses ouvertes (grandes cuisines ouvertes, îlots) | SANS ÉTAT | `cuisson-erp-extinction-automatique-annuelle` ne vérifie qu'un dispositif déclaré ; l'obligation d'INSTALLER n'a pas d'état | non — livre II |
| 8 | GC 21 | § 1 | Entretenir régulièrement les appareils de cuisson | SANS ÉTAT | — | non — livre II |
| 9 | GC 21 | § 2 | Ramonage annuel des conduits d'évacuation + vacuité | PORTÉE | `cuisson-erp-circuits-extraction-nettoyage` | non — livre II |
| 10 | GC 21 | § 2 | Nettoyage des circuits d'extraction « chaque fois qu'il est nécessaire » | PORTÉE | idem | non — livre II |
| 11 | GC 21 | § 2 | Filtres nettoyés/remplacés au minimum une fois par semaine | PORTÉE | `cuisson-erp-filtres-hebdomadaire` | non — livre II |
| 12 | GC 21 | § 3 | Livret d'entretien annexé au registre de sécurité | SANS ÉTAT | aucune ligne ; réserve CH 39 (1) évoque le livret de GC 18 h), pas celui-ci | non — livre II |
| 13 | GC 22 | § 1-2 | Vérification initiale et annuelle des installations de cuisson | PORTÉE | `cuisson-erp-verification-initiale`, `cuisson-erp-appareils-annuelle` | non — livre II |
| 14 | GZ 15 | — | Vérifications techniques périodiques annuelles du gaz | PORTÉE | `cuisson-gaz-installations-annuelle` (N1-N4) | non — livre II |
| 15 | GE 6 | § 1-2 | Vérifications par organismes agréés ou techniciens compétents (régime) | PORTÉE | `elec-erp-mise-en-service` (réserve GE 6) | non — livre II ; en 5ᵉ seulement via PE 37 (sommeil) |
| 16 | EL 18 | § 1 | Entretenir ; réparer défectuosités dès constatation | ANNONCÉE | réserve EL 18 (« obligation de moyens sans acte datable ») | non |
| 17 | EL 18 | § 2 al. 1 | Personne qualifiée présente (1ʳᵉ-2ᵉ cat.) | PORTÉE | `elec-erp-presence-personne-qualifiee` | non |
| 18 | EL 18 | § 2 al. 2 | Même mesure 3ᵉ-4ᵉ sur avis de commission | ÉCARTÉE | réserve EL 18 (ADR-035, prescription particulière) | non |
| 19 | EL 18 | § 3 | Éclairage de sécurité exploité selon EC 13-14 | PORTÉE | lignes EC 14 | non |
| 20 | EL 18 | § 4 | Groupes électrogènes : quinzaine | PORTÉE | `elec-erp-groupe-electrogene-quinzaine` | non |
| 21 | EL 18 | § 4 | Groupes électrogènes : mensuel à 50 % de charge | PORTÉE | `elec-erp-groupe-electrogene-annuel` (périodicité mensuelle) | non |
| 22 | EL 18 | § 4 | Registre d'entretien tenu à la disposition de la commission | SANS ÉTAT | `pieceAttendue: null` sur les deux lignes ; la réserve ne le nomme pas | non |
| 23 | MS 38 | § 1 | Doter l'établissement de moyens d'extinction | SANS ÉTAT | aucune ligne de DOTATION ERP ; équivalent 5ᵉ = PE 26 § 1 (voir B, PE 26) | non — livre II |
| 24 | MS 38 | § 4 | Vérification annuelle | PORTÉE | `incendie-erp-extincteurs-annuelle` | non — livre II (sur-application assumée) |
| 25 | MS 38 | § 4 | Révision décennale | PORTÉE | `incendie-erp-extincteurs-revision-decennale` | non — livre II |
| 26 | MS 38 | § 4 | Plan d'implantation + relevé des vérifications au registre | PORTÉE | description `incendie-erp-extincteurs-annuelle` (incendie.ts:773) | non |
| 27 | MS 73 | § 1 | Vérification avant mise en service des installations fixes | SANS ÉTAT | aucune ligne ni réserve (événementiel) | non |
| 28 | MS 73 | § 2 | Vérification annuelle en exploitation | PORTÉE | `incendie-erp-ssi-annuelle`, `-ria-annuelle`, `-extincteurs-annuelle`, `cuisson-erp-extinction-automatique-annuelle` | non |
| 29 | MS 73 | § 2 | Triennale SSI A/B par organisme agréé | PORTÉE | `incendie-erp-ssi-triennale` (sur-application sans catégorie de SSI, relevée réserve DF 10 (2)) | non |
| 30 | MS 73 | § 2 | Triennale des sprinkleurs par organisme agréé | SANS ÉTAT | citée au corpus (livre-2 l. 292) sans ligne ni réserve | non |
| 31 | EC 14 | § 1 | Éclairage de sécurité à l'état de veille pendant l'exploitation | SANS ÉTAT | — | non |
| 32 | EC 14 | § 2 | Mise à l'état de repos/arrêt à la mise hors tension | SANS ÉTAT | — | non |
| 33 | EC 14 | § 3 | Contrôle mensuel | PORTÉE | `incendie-erp-eclairage-securite-essai-mensuel` | non |
| 34 | EC 14 | § 3 | Autonomie semestrielle | PORTÉE | `incendie-erp-eclairage-securite-autonomie-semestrielle` | non |
| 35 | EC 14 | § 3 | Opérations consignées au registre de sécurité | PORTÉE | `incendie-registre-securite` (R. 143-44 4°) | non |
| 36 | EC 14 | § 3 | Automatisation SATI | ANNONCÉE | réserve EC 14 | non |
| 37 | EC 15 | — | Vérification des installations d'éclairage (renvoi EL 19) | PORTÉE | `incendie-erp-baes-annuelle` | non |
| 38 | EL 19 | § 2 | Installations neuves/modifiées (GE 7, GE 8) | PORTÉE | `elec-erp-mise-en-service` | non |
| 39 | EL 19 | § 3 | Annuelle des installations non modifiées | PORTÉE | `elec-erp-cat1-4-annuelle` | non |
| 40 | EL 19 | § 3 | Liste close, relevé article par article, rapport décret 88-1056 | ANNONCÉE | réserve EL 19 | non |
| 41 | DF 10 | § 2 | Annuelle du désenfumage | PORTÉE | `incendie-erp-desenfumage-annuelle` | non |
| 42 | DF 10 | § 3 | Triennale (mécanique + SSI A/B) par organisme agréé | ANNONCÉE | réserve DF 10 | non |
| 43 | GE 4 | § 1 | Visites périodiques 1ʳᵉ-4ᵉ (débiteur : la commission) | PORTÉE | 8 lignes `incendie-erp-visite-commission-cat*` | non (5ᵉ exclue par le texte) |
| 44 | GE 4 | § 3 | Prolongation « dans la limite de cinq ans » | ANNONCÉE | réserve GE 4 (2) | non |
| 45 | GE 4 | § 4 | Fréquence modifiable par arrêté | ANNONCÉE | réserve GE 4 (2) | non |
| 46 | CH 39 | § 1-2, § 4 | Livret d'entretien de la filtration | ANNONCÉE | réserve CH 39 (1) | non |
| 47 | CH 39 | § 3 | Visite ≤ 1 an / 3 mois sans mesure permanente | PORTÉE | `aeration-erp-filtres-visite-periodique` (N1-N4) | non |
| 48 | CH 39 | § 3 | Périodicité plus courte portée au livret | ANNONCÉE | réserve CH 39 (3) | non |
| 49 | AS 9 | — | Vérification quinquennale par organisme agréé | PORTÉE | `ascenseur-controle-technique-quinquennal` (écart de réalisateur annoncé, réserve AS 9 (1)) | non |
| 50 | AS 9 | — | Vérification avant remise en service après transformation | ANNONCÉE | réserve AS 9 (2) | non |
| 51 | MS 69 | al. 1 | Initier le personnel au système d'alarme | ANNONCÉE | réserve MS 69 (1) | non |
| 52 | MS 69 | al. 2 | S'assurer chaque semaine du fonctionnement | PORTÉE | `incendie-erp-alarme-verification-hebdomadaire` (N1-N4) | non |
| 53 | MS 69 | al. 3 | Remises en état au plus vite | ANNONCÉE | réserve MS 69 (2) | non |
| 54 | MS 69 | al. 4 | Stock de petites fournitures de rechange | ANNONCÉE | réserve MS 69 (3) | non |
| 55 | PE 4 | chapeau | Gaz neuf/modifié vérifié à la construction/après travaux (PE 10 B) | ANNONCÉE | réserve PE 4 (2) | oui (tous établissements) — événementiel |
| 56 | PE 4 | § 1 ph. 1 | Détection, désenfumage, électricité vérifiés avant ouverture (sommeil) | ANNONCÉE | réserve PE 4 (1) | non (locaux à sommeil) |
| 57 | PE 4 | § 1 ph. 2 | Contrat annuel d'entretien du SDI (sommeil) | PORTÉE | `incendie-erp-5-sommeil-contrat-entretien-sdi` | non |
| 58 | PE 4 | § 2 | Entretien et vérification triennaux de l'ensemble des installations | PORTÉE | `incendie-erp-pe4-entretien-installations-techniques` | oui |
| 59 | PE 4 | § 3 | Sur mise en demeure, faire vérifier par organismes agréés | **SANS ÉTAT** | ni ligne, ni réserve, ni motif | oui (« L'exploitant peut être mis en demeure ») — mais acte individuel : relève d'ADR-035, pas du référentiel |
| 60 | PE 27 | § 1 a) | Présence permanente d'un membre du personnel (+ dérogations) | ANNONCÉE | réserve PE 27 (3) | oui |
| 61 | PE 27 | § 1 b) | Convention de surveillance (facultative) | ANNONCÉE | réserve PE 27 (3) | oui (facultatif) |
| 62 | PE 27 | § 2 chapeau, a), b), d) | **« Tous les établissements sont équipés d'un système d'alarme »** : alarme générale par bâtiment, signal non confondu et audible de tout point, efficacité du matériel choisi | **SANS ÉTAT** | réserve PE 27 (2) ne relève que c) et e) ; aucune ligne ERP 5ᵉ (preuve moteur) | **oui** — « Tous les établissements » |
| 63 | PE 27 | § 2 c) | Informer le personnel du signal d'alarme | ANNONCÉE | réserve PE 27 (2) | oui |
| 64 | PE 27 | § 2 e) | Maintenir le système d'alarme en bon état | ANNONCÉE | réserve PE 27 (2) | oui |
| 65 | PE 27 | § 3 | Liaison avec les sapeurs-pompiers (MS 70), atténuée sans sommeil | ANNONCÉE | réserve PE 27 (4) | oui |
| 66 | PE 27 | § 4 | Consignes affichées | PORTÉE | `incendie-erp-5-consignes-affichees` | oui |
| 67 | PE 27 | § 5 | Instruire et entraîner le personnel | PORTÉE | `incendie-erp-5-instruction-personnel` | oui |
| 68 | PE 27 | § 6 | Plan d'intervention à l'entrée | ANNONCÉE | réserve PE 27 (1) (+ GN 10, arrêté 2025-12-01 art. 12) | oui |
| 69 | PE 33 | § 1 | Tenir un registre de sécurité, le présenter à chaque visite | PORTÉE | `incendie-registre-securite` (erp: true) | oui |
| 70 | PE 33 | § 2 | Consigne d'incendie dans chaque chambre | PORTÉE | `incendie-erp-5-sommeil-consigne-chambres` | non (sommeil) |
| 71 | PE 35 | § 1-3 | Plans affichés (hall, étages, chambres) | PORTÉE | `incendie-erp-5-sommeil-plans-affiches` | non |
| 72 | PE 35 | § 1 | Contenu du plan selon MS 41 | ANNONCÉE | réserve PE 35 | non |
| 73 | PE 37 | ph. 1 | GE 2 § 1, GE 2 § 2 al. 1, GE 3, GE 5 applicables (sommeil) | ANNONCÉE | réserve PE 37 | non |
| 74 | PE 37 | ph. 1 | GE 6 applicable (sommeil) | PORTÉE | `elec-erp-mise-en-service` | non |
| 75 | PE 37 | ph. 2 | Visite quinquennale (sommeil) | PORTÉE | `incendie-erp-5-visite-commission` | non |
| 76 | PE 37 | ph. 2 | Fréquence augmentée par arrêté | ÉCARTÉE | réserve PE 37 (ADR-035) | non |
| 77 | PO 1 | § 3 | Ensemble des installations techniques tous les deux ans | ANNONCÉE | entrée `PO 1 § 3 — contrôle biennal` (obligation_manquante, perimetre) | non (type O) |
| 78 | PO 1 | § 3 | Électricité annuelle | PORTÉE | `incendie-hotel-po-controle-annuel-electricite` | non |
| 79 | PO 1 | § 3 | Détection annuelle | PORTÉE | `incendie-erp-ssi-annuelle` (notes de la ligne PO) | non |
| 80 | PO 1 | § 3 | Ascenseurs selon AS 9 | PORTÉE | `ascenseur-controle-technique-quinquennal` | non |
| 81 | PO 8 | § 3 | Proposer des solutions alternatives soumises à la commission | SANS ÉTAT | — | non (type O ; procédure) |
| 82 | PS 32 | al. 1 | Maintenance régulière par professionnel qualifié (électricité, désenfumage, alarme, SSI, moyens de lutte, clapets, qualité d'air) | SANS ÉTAT | les deux lignes ne visent que la qualité de l'air | non (type PS) |
| 83 | PS 32 | al. 2 | Essais de fonctionnement 2 ans / 1 an — qualité de l'air | PORTÉE | `aeration-erp-ps-surveillance-qualite-air-inf-250` / `-sup-250` | non |
| 84 | PS 32 | al. 2 | Essais de fonctionnement 2 ans / 1 an — autres installations | SANS ÉTAT | idem | non |
| 85 | PS 32 | al. 3 | Vérification à la mise en service puis tous les cinq ans par organisme agréé | SANS ÉTAT | — | non |
| 86 | PS 32 | al. 4 | Ascenseurs selon AS 9 | PORTÉE | `ascenseur-controle-technique-quinquennal` | non |
| 87 | Arrêté 2025-12-01 | art. 2-13 | Modificateur (PE 2, 4, 7, 9, 10, 21, 27 § 6 ; dates art. 13) | PORTÉE | `incendie-erp-pe4-entretien-installations-techniques` ; les autres articles modifiés sont au corpus. NB : `prescrit` dit « PE 4 § 2 [...] et PE 10 » — il omet PE 2, 7, 9, 21 et 27 § 6 (JORF, art. 2, 5, 6, 11, 12) | — |
| 88 | CCH R. 143-44 | — | Tenir le registre de sécurité, 1° à 5° | PORTÉE | `incendie-registre-securite` | oui |
| 89 | CCH R. 141-10 | — | Registre : vérifications, corrections des écarts, consignes | PORTÉE | `incendie-registre-securite` (note l. 531) | oui |
| 90 | CCH R. 141-11 | — | Solutions d'effet équivalent annexées | PORTÉE | `incendie-registre-securite` (note l. 540) | oui (conditionnel) |
| 91 | CCH R. 146-35 | — | Registre IGH tenu par le propriétaire, 1° à 6° | PORTÉE | `incendie-registre-securite` — typologies `{travail, erp}` : un propriétaire d'IGH sans salarié ni ERP ne la reçoit pas | non (IGH) |
| 92 | CCH R. 143-41 | — | Visites périodiques et inopinées (débiteur : la commission) | PORTÉE | 8 lignes de visite | oui (5ᵉ sommeil) |
| 93 | CCH R. 134-2 | 6° | Moyens d'alerte et de communication | PORTÉE | `ascenseur-telealarme-liaison` | oui si ascenseur |
| 94 | CCH R. 134-2 | 1°-5°, 7°-9° | Objectifs de sécurité (états) | ANNONCÉE | réserve R. 134-2 | oui si ascenseur |
| 95 | CCH R. 134-6 | 1° a) | Visite toutes les six semaines | PORTÉE | `ascenseur-visite-six-semaines` | oui si ascenseur |
| 96 | CCH R. 134-6 | 1° b) | Serrures des portes palières, six semaines | PORTÉE | idem (description) | idem |
| 97 | CCH R. 134-6 | 1° c) | Examen semestriel des câbles | PORTÉE | `ascenseur-examen-semestriel-secours` | idem |
| 98 | CCH R. 134-6 | 1° c) | Vérification annuelle des parachutes | PORTÉE | `ascenseur-examen-annuel-securite` | idem |
| 99 | CCH R. 134-6 | 1° d) | Nettoyage annuel cuvette, toit, local des machines | PORTÉE | idem (description) | idem |
| 100 | CCH R. 134-6 | 1° e) | Lubrification, nettoyage des pièces | PORTÉE | `ascenseur-entretien-contrat` (clause a de R. 134-7) | idem |
| 101 | CCH R. 134-6 | 1° f) | Moyens d'alerte vérifiés toutes les six semaines | PORTÉE | `ascenseur-visite-six-semaines` | idem |
| 102 | CCH R. 134-6 | 2° a)-c) | Réparations, défauts repérés, désincarcération | PORTÉE | `ascenseur-entretien-contrat` (R. 134-7 I a) | idem |
| 103 | CCH R. 134-6 | **2° d)** | **Remplacer les moyens d'alerte fonctionnant sur RTC ou réseau mobile 3G ou antérieur** (propriétaire) | **ÉCARTÉE — MOTIF QUI NE TIENT PAS** | notes `ascenseur-telealarme-liaison` : « Non modélisé comme échéance propre : couvert par le contrat d'entretien » ; or R. 134-7 I a) (API) : « L'exécution des obligations prescrites à l'article R. 134-6, **exception faite de l'alinéa d du 2° et de son dernier alinéa** » | oui si ascenseur (« le propriétaire d'une installation d'ascenseur prend les dispositions minimales suivantes ») |
| 104 | CCH R. 134-6 | dernier al. | Faire réparer/remplacer les pièces importantes usées (hors contrat) | SANS ÉTAT | idem : exclu du contrat par R. 134-7 I a), aucune ligne ni réserve | oui si ascenseur — événementiel |
| 105 | CCH R. 134-7 | I | Contrat d'entretien écrit, clauses minimales | PORTÉE | `ascenseur-entretien-contrat` (ancre réservée, réserve R. 134-7) | idem |
| 106 | CCH R. 134-7 | I | État initial + plan d'entretien annexés ; remise des documents à la signature | SANS ÉTAT | ni description ni réserve | idem — accessoire du contrat |
| 107 | CCH R. 134-7 | III | Carnet d'entretien | PORTÉE | `ascenseur-carnet-entretien` | idem |
| 108 | CCH R. 134-7 | III | Rapport annuel d'activité | PORTÉE | `ascenseur-rapport-annuel-activite` | idem |
| 109 | CCH R. 134-10 | al. 1 | Régie : R. 134-6, carnet, rapport | PORTÉE | `ascenseur-carnet-entretien`, `-rapport-annuel-activite` | idem |
| 110 | CCH R. 134-10 | al. 2 | Formation du personnel en régie | ANNONCÉE | réserve R. 134-10 | idem |
| 111 | CCH R. 134-11 | — | Contrôle technique quinquennal | PORTÉE | `ascenseur-controle-technique-quinquennal` | idem |
| 112 | Arrêté 2004-11-18 | art. 2 + annexe | Intervalle ≤ 6 semaines ; opérations minimales | PORTÉE | 4 lignes d'ascenseur | idem |
| 113 | Arrêté 2004-11-18 | art. 3 | Contrat ≥ 1 an ; références au carnet de copropriété | PORTÉE | `ascenseur-entretien-contrat` | idem |
| 114 | Arrêté 2004-11-18 | art. 4 | État des lieux contradictoire au changement de prestataire | SANS ÉTAT | — | idem — événementiel |
| 115 | Arrêté 2012-08-07 | art. 1 | Mettre les documents à disposition du contrôleur | SANS ÉTAT | nommé au `prescrit`, ni ligne, ni description, ni réserve | idem — accessoire du quinquennal |
| 116 | Arrêté 2012-08-07 | art. 2 | Mise en relation avec l'entreprise d'entretien | PORTÉE | contrat (R. 134-7 k) | idem |
| 117 | GH 5 | liminaire | Faire vérifier par organismes agréés | PORTÉE | `incendie-igh-moyens-secours-annuelle`, `elec-igh-annuelle` | non (IGH) |
| 118 | GH 5 | § 1, § 3.2 | Communiquer documents, registre, prescriptions aux vérificateurs | SANS ÉTAT | — | non |
| 119 | GH 5 | § 2 | Vérifications après travaux (RVRAT) | SANS ÉTAT | — | non — événementiel |
| 120 | GH 5 | § 3.1.1 | Semestriel ascenseurs à appel prioritaire | ANNONCÉE | réserve GH 5 | non |
| 121 | GH 5 | § 3.1.2 | Annuel | PORTÉE | deux lignes IGH | non |
| 122 | GH 5 | § 3.1.3 | Paratonnerres, biennal | ANNONCÉE | réserve GH 5 | non |
| 123 | GH 5 | § 3.1.4 | Charge calorifique, 5 ans | PORTÉE | `incendie-igh-charge-calorifique-quinquennale` | non |
| 124 | GH 5 | § 4 | Vérifications sur mise en demeure | SANS ÉTAT | — (ADR-035) | non |
| 125 | GH 5 | § 6 | Remédier ; remise en état sous un mois | ANNONCÉE | réserve GH 5 (2) | non |
| 126 | GH 61 | § 1-4, § 6 | Plafonds de charge calorifique (états de l'aménagement) | ÉCARTÉE | notes `incendie-igh-charge-calorifique-quinquennale` (« des états de l'aménagement ; le § 5 impose d'en faire ÉTABLIR la preuve ») | non |
| 127 | GH 61 | § 5 | Rapport quinquennal par organisme agréé | PORTÉE | `incendie-igh-charge-calorifique-quinquennale` | non |
| 128 | GH 61 | § 5 | Premier rapport dans l'année de l'installation | ANNONCÉE | réserve GH 61 | non |
| 129 | GH 61 | § 7 | Justifier au propriétaire | ÉCARTÉE | réserve GH 61 (corollaire du § 5) | non |
| 130 | Arr. 1986 art. 100 | — | Afficher consignes et plans d'intervention | PORTÉE | `habitation-consignes-plans-intervention` | non (habitation) |
| 131 | Arr. 1986 art. 101 | al. 1 | Vérification annuelle détection, désenfumage, ventilation, automatismes, colonnes sèches | PORTÉE | `habitation-verification-annuelle-installations-securite` | non |
| 132 | Arr. 1986 art. 101 | al. 2 | Portes coupe-feu, ferme-portes, ouvrants d'escalier | PORTÉE | idem (description) | non |
| 133 | Arr. 1986 art. 101 | al. 3 | Entretenir ; registre de sécurité | PORTÉE | `habitation-registre-securite` | non |
| 134 | Arr. 1986 art. 103 | — | Vérificateur compétent ; contenu minimal du registre | PORTÉE | deux lignes habitation | non |
| 135 | Arr. 1986 art. 104 | — | Présenter les justifications aux agents | PORTÉE | `habitation-registre-securite` | non |
| 136 | Arr. 2018 art. 26 | 1° | Maintenir l'accès à l'OCG et sa signalisation ; avertir le distributeur | SANS ÉTAT | aucune entrée ne vise le 1° | non (bâtiments collectifs d'habitation) |
| 137 | Arr. 2018 art. 26 | 3° | Entretien ≤ 10 ans + contrat écrit ; aménagements associés | ANNONCÉE | entrée `art. 26 § 3` (obligation_manquante) | non |
| 138 | Arr. 2018 art. 26 | 4° | Maintien de l'installation intérieure (usager) | SANS ÉTAT | — | non (usager d'un logement) |
| 139 | Arr. 2018 art. 26 | 5° | VMC-gaz annuel | PORTÉE | `aeration-habitation-vmc-gaz-annuelle` | non |
| 140 | Arr. 2018 art. 26 | 5° | VMC-gaz quinquennal | PORTÉE | `aeration-habitation-vmc-gaz-quinquennale` | non |
| 141 | Arr. 2018 art. 26 | 6°-7° | Fonte grise ; détendeurs | ANNONCÉE | entrée `art. 26 § 6 et § 7` (non_couvert, docs/veille-arbitrage-2026-08-26.md) | non |

Sans prescription propre d'exploitant (champ, définition, pur renvoi) : GC 1, CCH R. 134-1, EL 19 § 1, PO 8 § 1-2, et l'arrêté 2004-11-18 art. 5-15 (obligations du prestataire, clauses).

#### Comptes (section A)

48 articles `retenu` lus (46 portent une prescription d'exploitant ; GC 1 et R. 134-1 n'en portent pas) ; 141 prescriptions. Compté par script sur cette table (colonne « État ») :

| État | Nombre |
|---|---|
| PORTÉE | 76 |
| ANNONCÉE | 34 |
| ÉCARTÉE (motif qui tient) | 4 |
| ÉCARTÉE, motif qui ne tient pas | 1 (n° 103) |
| SANS ÉTAT | 26 |

SANS ÉTAT qui touchent la cible d'après le texte : **n° 62 (PE 27 § 2)** ; n° 59 (PE 4 § 3, acte individuel, non encodable au référentiel) ; n° 104, 106, 114, 115 (ascenseur, seulement si l'établissement en a un). Plus l'écart au motif qui ne tient pas, n° 103 (R. 134-6 2° d)).

---

### B. Articles `sans_objet` (34) et `hors_perimetre` (21) — le motif contre le texte entier

| Article | Statut | Verdict | Ce que dit le texte (API) | Cible |
|---|---|---|---|---|
| GN 1 | sans_objet | tient | § 2 c) (informer le maire) nommé au motif | — |
| GN 10 | sans_objet | tient | article de champ | — |
| PE 1 | sans_objet | tient | champ | — |
| PE 2 | sans_objet | tient en partie | § 4 : « ces locaux doivent être isolés des locaux et dégagements accessibles au public » — non nommé ; règle de construction | classé (construction) |
| PE 3 | sans_objet | tient | calcul d'effectif | — |
| PE 5, 6, 7, 9, 12, 13 | hors_perimetre (construction, sans motif) | tient | structure, isolement, accès, conduits, matériaux | — |
| PE 8 | sans_objet | tient | pur renvoi | — |
| PE 10 | sans_objet | tient en partie | B § 2 : « Les installations des autres établissements [...] sont vérifiées conformément aux dispositions de l'article GZ 13 » → GZ 13 s'applique aux N5 hors PE 2 § 3 ; l'entrée `GZ 13` du livre II porte `toucheLaCible: false` | oui (restaurant N5 > 19 personnes au gaz) — événementiel |
| **PE 11** | sans_objet | **ne tient plus** | § 1 : « aucun dépôt, aucun matériel, aucun objet ne doit faire obstacle à la circulation des personnes. » Motif : « Permanente et non datée : ne se traduit pas en échéance » — argument périmé depuis l'ADR-026 (le référentiel porte des états permanents ; cf. notes `incendie-erp-5-instruction-personnel` : « Une obligation sans périodicité n'est pas une obligation qu'on ne sait pas écrire ») | **oui** — tout ERP de 5ᵉ |
| PE 14 | sans_objet | tient | dispositifs de désenfumage (construction) | — |
| PE 15 | hors_perimetre | tient en partie | § 7 : « L'emploi de combustibles liquides extrêmement inflammables (F+) [...] est interdit » — interdiction d'usage, pas de construction | oui (restauration) — à décider |
| PE 16, 17 | sans_objet / hors_perimetre | tient | construction | — |
| **PE 18** | sans_objet | **ne tient plus** | § 1 : « Un personnel de service doit être présent pendant le fonctionnement des appareils. Les appareils ne doivent pas être en libre utilisation. » Motif « obligation continue, pas une échéance » : la politique sœur `elec-erp-presence-personne-qualifiee` (EL 18 § 2) encode exactement une présence en état permanent | **oui** — restaurant à îlot de cuisson en salle |
| PE 19 | hors_perimetre (sans motif) | tient en partie | § 2-§ 4 : règles d'USAGE (petits appareils portables seuls autorisés ; bouteille butane ≤ 13 kg « hors d'atteinte du public ») | oui (restauration) — à décider |
| PE 20 | sans_objet | tient | renvoi | — |
| PE 21 | hors_perimetre (sans motif) | tient en partie | § 3 : « Les appareils de chauffage à combustion non raccordés, à l'exception des panneaux radiants et des appareils de chauffage de terrasse, sont interdits. » — interdiction d'usage | oui — à décider |
| PE 22, 23, 25 | hors_perimetre | tient | construction | — |
| **PE 24** | sans_objet | **ne tient plus en partie** | § 1 : « L'emploi de fiches multiples est interdit » (usage) ; § 2 : escaliers/circulations > 10 m ou compliqués et salles > 100 m² « doivent être équipés d'une installation d'éclairage de sécurité d'évacuation » — l'OBJET même (dotation), motif « Aucune périodicité » périmé (ADR-026) | **oui** (§ 1 : tout N5 ; § 2 : selon surface) |
| **PE 26** | sans_objet | **ne tient plus** | § 1 : « Les établissements doivent être dotés d'au moins un extincteur portatif [...] un appareil pour 300 mètres carrés et un appareil par niveau. » Motif « règle de dotation, sans récurrence » : les sœurs `incendie-travail-moyens-lutte` (R. 4227-28, état permanent) et `incendie-travail-alarme-sonore` (R. 4227-34, « l'obligation est d'AVOIR l'alarme ») encodent la dotation. § 3 : dispositif non apparent signalé par panneau — non nommé | **oui** — tout N5 (PE 2 § 3 le maintient même ≤ 19 personnes) |
| PE 28-31 | hors_perimetre | tient | construction (sommeil) | — |
| PE 32, 34, 36 | sans_objet | motif « dotation » périmé, mais hors cible | locaux à sommeil | classé |
| CCH R. 143-42 | sans_objet | tient | assister à la visite : événement | — |
| GH 4 | hors_perimetre | tient | commission ; § 5 (registre + 2 rapports au visa) : IGH | classé |
| GH 66, GH U 16 | sans_objet | tient | — | — |
| Arr. 1986 art. 1, 3, 97, 98, 99 | sans_objet / hors_perimetre | tient | champ, définitions, construction | — |
| Arr. 2018 art. 32 | sans_objet | tient | abrogation | — |
| CCH R. 143-19, R. 143-38, R. 122-5, R. 146-3, R. 146-4 | sans_objet | tient | classement ; ouverture ponctuelle | — |
| CCH R. 164-6, Arr. 2017-04-19 art. 1-4 | sans_objet | tient | portés par le module `Accessibilite` (schema.ts : prestations, pièces, formation, maintenance) | — |
| CASF L. 114 | sans_objet | tient | définition | — |

Comptes (section B) : 55 articles relus (34 `sans_objet`, 21 `hors_perimetre`). Motif qui tient : 43. Tient en partie : 5 (PE 2, PE 10, PE 15, PE 19, PE 21). Ne tient plus : 7, dont 4 qui touchent la cible (PE 11, PE 18, PE 24, PE 26) et 3 hors cible (PE 32, PE 34, PE 36).

---

### C. Preuve moteur (sortie collée)

```
### restaurant N5, 8 salariés, 40 présents, aucun équipement → 45 obligations
incendie-erp-pe4-entretien-installations-techniques
incendie-travail-instructions-evacuation
incendie-registre-securite
incendie-erp-5-instruction-personnel
incendie-erp-5-consignes-affichees
eclairage-etablissement-regles-entretien
### commerce M N5, 3 salariés, aucun équipement → 45 obligations
[même liste]
### bureau W N5 avec EXTINCTEUR + ALARME_INCENDIE → 50 obligations
incendie-erp-pe4-entretien-installations-techniques
incendie-travail-moyens-lutte
incendie-travail-instructions-evacuation
incendie-registre-securite
incendie-erp-extincteurs-annuelle
incendie-erp-ssi-annuelle
incendie-erp-extincteurs-revision-decennale
incendie-erp-5-instruction-personnel
incendie-erp-5-consignes-affichees
signalisation-incendie-moyens-lutte
eclairage-etablissement-regles-entretien
```

Un ERP de 5ᵉ sans équipement déclaré ne reçoit ni l'alarme (PE 27 § 2) ni l'extincteur (PE 26 § 1). Côté travail, `incendie-travail-moyens-lutte` n'apparaît qu'avec un EXTINCTEUR déclaré (`porteur` équipement, catégorie `EXTINCTEUR`) : même défaut d'ancrage que celui que `incendie-travail-alarme-sonore` a corrigé pour R. 4227-34 (hors G1, signalé).

---

### D. Encodages proposés

#### Clairs et fondés (texte relu + politique sœur)

1. **`incendie-erp-5-alarme-equipement`** — « Établissement équipé d'un système d'alarme maintenu en bon état (ERP de 5ᵉ catégorie) ». Nature `etat_permanent`, périodicité `autre`, `pieceAttendue: null`, porteur `etablissement`, `equipementsEnContexte: ["ALARME_INCENDIE"]`, réalisateur `exploitant`, criticité 4, typologies `{ erp: { categories: ["N5"] } }`. Références : PE 27 § 2 a), b), d), e). Sœur : `incendie-travail-alarme-sonore` (« l'obligation est d'AVOIR l'alarme ; la conditionner à une alarme déclarée la ferait disparaître exactement chez qui n'en a pas »), et R. 4227-35/-36 repliés comme ici a), b). Les deux lignes coexistent (texte distinct, comme `incendie-erp-5-consignes-affichees` / `incendie-travail-consigne-affichee`). Réserve GN 10 : même traitement que PE 27 § 4-§ 5 (décision A6 ouverte). Le § 2 c) reste en réserve (voir « à décider »).
   Test : `incendie-erp-5-alarme-equipement` retenue pour `{typeErp: "N", categorieErp: "N5"}` SANS équipement ; absente en N4 ; et la garde « porteur établissement » : retirer l'ALARME_INCENDIE du parc ne la retire pas.
2. **`incendie-erp-5-extincteurs-dotation`** — « Établissement doté d'extincteurs portatifs : au moins un par 300 m² et un par niveau (ERP de 5ᵉ catégorie) ». `etat_permanent`, `autre`, porteur `etablissement`, `equipementsEnContexte: ["EXTINCTEUR"]`, réalisateur `exploitant`, criticité 5 (celle de `incendie-travail-moyens-lutte`), typologies `{ erp: { categories: ["N5"] } }`. Références : PE 26 § 1 et § 3 (signalisation du dispositif non apparent), MS 39 en contexte (renvoi exprès). Sœurs : `incendie-travail-moyens-lutte`, `incendie-travail-alarme-sonore`. Corpus : PE 26 `sans_objet` → `retenu` avec `historique` portant l'ancien motif ; PE 26 § 2 (colonnes sèches > 18 m) en réserve.
   Test : restaurant N5 sans équipement → retenue ; `incendie-erp-extincteurs-annuelle` inchangée.
3. **`incendie-erp-5-degagements-libres`** — « Dégagements libres de tout dépôt, matériel ou objet faisant obstacle à la circulation (ERP de 5ᵉ catégorie) ». `etat_permanent`, porteur `etablissement`, typologies `{ erp: { categories: ["N5"] } }`, criticité 4, `pieceAttendue: null`. Référence : PE 11 § 1 al. 1. Sœurs : politique ADR-026 citée dans `incendie-erp-5-instruction-personnel` ; `signalisation-etablissement-cheminements-evacuation` (état permanent d'un cheminement). Réserve GN 10 (A6).
   Test : N5 sans équipement → retenue.

#### À décider (rythme ou sens nouveau, fait non modélisé, lecture non littérale)

4. **R. 134-6 2° d) — remplacement des moyens d'alerte RTC/3G** (`ascenseur-alerte-remplacement-reseau-obsolete`). Le motif d'écart ne tient pas (R. 134-7 I a). Il faut une caractéristique d'ASCENSEUR (réseau du moyen d'alerte : RTC, 2G/3G, autre), et choisir la nature : `etat_permanent` conditionné, ou événementielle (ADR-026). À corriger d'abord, sans rien décider : la phrase des notes de `ascenseur-telealarme-liaison` et une réserve sur R. 134-6 qui nomme le 2° d) et le dernier alinéa (n° 104).
5. **PE 18 § 1 — personnel présent pendant le fonctionnement d'un îlot de cuisson**. Sœur `elec-erp-presence-personne-qualifiee` (présence = état permanent). Il manque le fait « îlot de cuisson en salle » (caractéristique d'`APPAREIL_CUISSON_ERP` ou attribut d'établissement) : sans lui, servir la ligne à tout restaurant serait une sur-application.
6. **PE 24 § 2 — éclairage de sécurité d'évacuation** (dotation conditionnée par la longueur des circulations et une salle > 100 m²) : attribut de surface absent. Porteur établissement, règle du non-renseigné (retenu « à confirmer »), à trancher.
7. **Règles d'usage de PE 24 § 1 (fiches multiples), PE 15 § 7 (F+), PE 19 § 2-§ 4, PE 21 § 3** : interdictions permanentes. Sœur la plus proche `incendie-travail-chiffons-impregnes-recipients-clos`. Une ligne regroupée ou rien : sens nouveau (« interdictions d'usage » au référentiel) → propriétaire. Au minimum, écrire les motifs manquants (PE 19, PE 21 n'en ont aucun).
8. **PE 27 § 2 c)** (informer le personnel du signal) : le replier dans `incendie-erp-5-instruction-personnel` ou dans la ligne n° 1 — lecture à trancher.
9. **Corrections de corpus sans encodage** : PE 4 § 3 et GH 5 § 4 (mise en demeure → réserve ADR-035) ; GZ 13 `toucheLaCible: false` → `true` (PE 10 B § 2, en vigueur au 2026-07-01) ; motifs PE 11, PE 18, PE 24, PE 26 à reprendre ; `prescrit` de l'arrêté 2025-12-01 (liste des articles modifiés) ; ajouter `url` LEGIARTI000020380169 à GE 6.

#### Classés (ne touchent pas la cible d'après le texte)

Livre II : CH 57 al. 1, GC 8, GC 21 § 1 et § 3, EL 18 § 4 (registre), MS 38 § 1, MS 73 § 1 et sprinkleurs, EC 14 § 1-2 (PE 1 § 1). Hôtels, IGH, parcs, habitation : PO 8 § 3, PS 32 (3), GH 5 (4), R. 146-35 (IGH sans salarié), arrêté 2018 art. 26 1° et 4°, PE 32/34/36.

## 2. G2 — Code du travail et arrêtés « équipements et lieux »
Relevé du 2026-09-27, worktree `wt-cov` (branche `lot/audit-bout-en-bout`, HEAD `71294cb`).

### Méthode et sources

- Inventaire : `CORPUS` chargé par script (`zz-g2-dump`), 26 corpus demandés, tous présents
  (`code-travail-epi-amont` vit dans `code-travail-epi.ts:446`, `froid-fluides-frigorigenes` dans `froid-fluides.ts`).
  Sortie : `zz-g2-articles.json`.
- Textes : **API Légifrance** par `resoudreCible` + `lireArticle` (`src/lib/legifrance/verification.ts`), `delaiMs: 500`.
  153 articles de droit, 152 textes rendus ; seul manque `Règlement UE 2024/573 art. 5` (hors fonds de l'API, EUR-Lex).
  Sortie : `zz-g2-textes.json` / `zz-g2-textes.txt`. Trois articles sont en `ABROGE_DIFF` (en vigueur, abrogation
  programmée) : R. 4216-2, R. 4227-37 (LEGIARTI000024769379), C. env. L. 512-7 — déjà relevé au corpus.
- Voisins hors inventaire lus par l'API pour trancher la portée : arrêté du 14/12/2011 art. 2 à 10 et 12,
  R. 4227-30 à -33, R. 4227-40, -41, R. 4226-7, -15, -17, -18 (`zz-g2-voisins.txt`).
- Moteur : `determineObligationsApplicables` sondé sur un bureau non-ERP de 8 salariés et un restaurant ERP N5 (`zz-g2-moteur`).
- Comptes (script) : 169 entrées = 84 `retenu`, 49 `sans_objet` de droit + 16 INRS, 9 `obligation_manquante`,
  6 `non_couvert`, 5 `hors_perimetre`.

Légende d'état d'une prescription : **P** portée (id) · **A** annoncée (où) · **E** écartée (motif, où) ·
**S** SANS ÉTAT (= manque ; « cible » dit s'il touche restauration / commerce / bureau / ERP 5ᵉ / ≤ 50 salariés).
**S°** = sans état écrit, mais qui se classerait `sans_objet` par une politique sœur déjà écrite (pas un manque, une trace à poser).

---

### 1. Articles `retenu` — découpage en prescriptions

#### code-travail-incendie (16 entrées)

| Article | Prescription (texte API) | État | Où / motif |
|---|---|---|---|
| R. 4227-28 | « L'employeur prend les mesures nécessaires pour que tout commencement d'incendie puisse être rapidement et efficacement combattu » | P | `incendie-travail-moyens-lutte` — mais ancrée `categoriesEquipement: ["EXTINCTEUR"]` (incendie.ts:202-236) : voir R. 4227-29 |
| R. 4227-29 al. 1 | extincteurs « en nombre suffisant et maintenus en bon état de fonctionnement » | P (sous condition) | `incendie-travail-moyens-lutte`, seulement si un EXTINCTEUR est déclaré |
| R. 4227-29 al. 2-3 | « Il existe au moins un extincteur portatif à eau pulvérisée d'une capacité minimale de 6 litres pour 200 mètres carrés de plancher. Il existe au moins un appareil par niveau. » | **S — cible** | Aucune ligne pour qui n'a déclaré aucun extincteur (moteur : bureau sans équipement → 0 ligne `moyens-lutte` ; avec `EXTINCTEUR` → 1). La règle chiffrée n'est dans aucune description. **MANQUE M1** |
| R. 4227-29 al. 4 | locaux à risques particuliers « dotés d'extincteurs dont le nombre et le type sont appropriés aux risques » | P (sous condition) | description « extincteurs appropriés » ; même ancrage |
| R. 4227-14 al. 1 | « Les établissements disposent d'un éclairage de sécurité permettant d'assurer l'évacuation » | **S — cible** | Les deux obligations travail sont ancrées `BAES` ; bureau sans BAES → 0 ligne. **MANQUE M2** |
| R. 4227-14 al. 2 | renvoi à l'arrêté (conception, exploitation, maintenance, dispenses) | P | arrêté 2011-12-14 art. 11 → essai mensuel / autonomie semestrielle |
| R. 4226-19 (copie incendie) | registre des vérifications R. 4226-14/-16 | P | `elec-travail-consignation-registre` ; support des lignes BAES (historique du corpus) |
| R. 4227-39 | essais et visites du matériel + exercices ; au moins tous les six mois ; date et observations au registre | P | `incendie-travail-exercice-semestriel`, `incendie-registre-securite` |
| R. 4227-34 | alarme sonore : > 50 personnes, ou matières R. 4227-22 « manipulées et mises en œuvre » | P | `incendie-travail-alarme-sonore` (lot 1) |
| R. 4227-35 | alarme générale par bâtiment | P | description de l'alarme |
| R. 4227-36 | pas de confusion ; audible partout ; autonomie 5 min | P | description de l'alarme |
| R. 4216-2 1° | évacuation rapide ou différée, sécurité maximale | P | `incendie-travail-instructions-evacuation` (conditions) |
| R. 4216-2 2°-3° | accès des secours ; limitation de la propagation | E | conception, maître d'ouvrage (`prescrit`) |
| R. 4227-37 al. 1 (1°, 2°) | consigne établie et affichée, par local > 5 personnes et locaux R. 4227-24, sinon par local ou dégagement | P | `incendie-travail-consigne-affichee` |
| R. 4227-37 al. 2 | « Dans les autres établissements, des instructions sont établies… » | P | `incendie-travail-instructions-evacuation` (lot 1) |
| R. 4227-38 1°-7° | contenu de la consigne | P | description de la consigne |
| R. 4227-38 8° | « Le devoir, pour toute personne apercevant un début d'incendie, de donner l'alarme et de mettre en œuvre les moyens de premier secours » | **S — cible (description)** | la description de `consigne-affichee` s'arrête au 7° ; l'obligation existe, un élément de son contenu n'est pas dit. **M5** |
| L. 4711-5 | faculté de registre unique | E | réserve (« est autorisé à ») |
| L. 4711-1 | mentions obligatoires des pièces | P | `incendie-registre-securite` |
| L. 4711-2 | conserver observations et mises en demeure de l'inspection | P | `incendie-registre-securite` (description) |
| D. 4711-2 | pièces datées, identité du vérificateur | P | `incendie-registre-securite` |
| D. 4711-3 al. 1 | conservation 5 ans / deux derniers contrôles | A | réserve de corpus (« durée non portée ») |
| D. 4711-3 al. 2 | copies des déclarations d'AT, même durée | A | réserve de corpus |

Hors inventaire (voisin de la consigne, lu par l'API, LEGIARTI000018532053) : **R. 4227-40** « La consigne de sécurité incendie est communiquée à l'inspection du travail. » — cité nulle part (`grep -rln "4227-40" src docs` : vide). **S — cible (champ R. 4227-34)**. **M8**.

#### code-travail-electricite (6 `retenu`)

| Article | Prescription | État | Où |
|---|---|---|---|
| R. 4544-11-1 | attestation 5 ans, copie conservée par l'employeur | P | `elec-salarie-attestation-medicale-voisinage` |
| R. 4226-14 | vérification initiale à la mise en service | P | `elec-travail-mise-en-service` |
| R. 4226-14 | … et après modification de structure | P / A | description ; réserve art. 2 (fait non questionné) |
| R. 4226-16 | vérification périodique | P | `elec-travail-periodique-annuelle` |
| R. 4226-19 al. 1-2 | résultats + justifications des travaux ; rapports annexés | P | `elec-travail-consignation-registre` |
| R. 4544-10 al. 1 | habilitation dans les limites, nature des opérations | P | `elec-salarie-habilitation`, `elec-travail-habilitation-personnel` |
| R. 4544-10 al. 2 | « Avant de délivrer l'habilitation, l'employeur s'assure que le travailleur a reçu la formation théorique et pratique… » | **S — cible (description)** | compté « porté » par la note (electricite.ts:266 : « le référentiel en portait trois ») mais aucune description ne le nomme (`grep "formation théorique"` : vide). **M6** |
| R. 4544-10 al. 3 | délivre / maintient / renouvelle selon les normes | E | réserve (norme non opposable) |
| R. 4544-10 al. 4 | carnet de prescriptions | P | `elec-travail-carnet-prescriptions` |
| R. 4544-10 al. 5 | voisinage : attestation médicale | P | `elec-salarie-attestation-medicale-voisinage` |
| L. 4711-5 (copie) | faculté | E | réserve |

#### arrete-2011-12-26-electricite (3 `retenu`)

| Article | Prescription | État | Où |
|---|---|---|---|
| art. 2 | méthodes (ann. I), rapport (ann. II) | E | vise le vérificateur |
| art. 2 | 5 semaines vérificateur → chef d'établissement | A | réserve (écart de la description) |
| art. 2 | définition des modifications de structure | A | réserve (question non posée) |
| art. 3 | périodicité 1 an depuis la vérification initiale | P | `elec-travail-periodique-annuelle` |
| art. 3 | faculté 2 ans + LRAR à l'inspecteur | E | `prescrit` (faculté, « à NE PAS encoder ») |
| annexe II | contenu des rapports ; liste conservée par l'organisme | E | vérificateur (`prescrit`) |
| annexe II 3.5 | rapport quadriennal | P | `elec-travail-rapport-quadriennal` |
| annexe II | « l'attention du chef d'établissement doit être attirée… il devra préalablement procéder ou faire procéder à cette vérification » (continuité de terre non vérifiée, avant intervention) | S° | événement conditionnel à une remarque du rapport ; se lit dans le rapport même — pas de manque cible |

#### code-travail-levage (7) et arrete-2004-03-01-levage (9)

| Article | Prescription | État | Où |
|---|---|---|---|
| R. 4323-22 / -23 / -28 | articles d'habilitation | P | VGP, mise en service, remise en service levage + compactage |
| R. 4323-24 | personnes qualifiées ; liste | P | `realisateurs`, `prevention-etablissement-liste-personnes-qualifiees` |
| R. 4323-24 al. 2 | compétence des personnes | E | réserve (non constatable, ADR-027) |
| R. 4323-25 / -26 | consignation ; rapports annexés ou mentions | P | `levage-registre-securite-consignation` |
| R. 4323-27 | tout support | E | permissif |
| Arr. 2004 annexe | liste / exclusions | P / E | qualification du gerbeur ; exclusions |
| art. 14 I-II | examens et épreuves à la mise en service | P | `levage-epreuve-initiale-fonctionnement`, `levage-examen-adequation-mise-en-service` |
| art. 19 | contenu de la remise en service | P | `levage-remise-en-service-apres-reparation` |
| art. 20 I | cinq cas déclencheurs | P | description de la remise en service |
| art. 20 II-VII | dispenses | E | allègements (liste reprise pour la semestrielle) |
| art. 22 I | VGP due | P | `levage-examen-etat-conservation` |
| art. 22 II | essais art. 6 b/c | A | réserve |
| art. 23, 24 | 12 / 6 / 3 mois ; accessoires 12 mois | P | cinq VGP levage |
| art. 5, 9 | définitions | P | cités en contenu |

#### code-travail-risque-chimique (6 `retenu`), matières inflammables (1), équipements-information (1)

| Article | Prescription | État | Où |
|---|---|---|---|
| R. 4222-21 | consigne ventilation + panne | P | `aeration-etablissement-consigne-utilisation` |
| R. 4222-21 al. 3 | avis MT / CSE | A | réserve |
| R. 4412-11 1°-7° | mesures de prévention (méthodes, matériel, nombre, durée, hygiène, quantités, procédures) | S° | aucune réserve ne les dit ; principe de prévention — politique sœur R. 4432-1 (`sans_objet`, « article de principe »). Trace à poser, pas un manque |
| R. 4412-38 1°-3° | information actualisée, FDS, formation | P | `stockage-dangereux-fiches-donnees`, `-formation-personnel` |
| R. 4412-38 | le CSE destinataire | A | réserve |
| R. 4412-38 | déclencheur = présence d'ACD, pas le stockage | E | brief palier 1 (#6, « refusée », 5ᵉ déclencheur) |
| R. 4412-87 | info/formation CMR | P | `stockage-dangereux-formation-personnel` |
| R. 4222-20 | maintien + contrôle régulier | P | `aeration-controle-installations-r4222-20` (établissement) |
| R. 4412-17 al. 1-2, 1° | mesures techniques ; incompatibles ; concentrations inflammables | S° | même politique sœur (principe) |
| R. 4412-17 2° | débordement, déversement | P | `stockage-dangereux-retention` |
| R. 4227-26 | chiffons en récipients clos | P | `incendie-travail-chiffons-impregnes-recipients-clos` |
| R. 4323-1 | informer les utilisateurs d'équipements de travail | P / A | `esp-personnel-formation` (ESP seuls) ; réserve (champ plus large) |

#### esp-suivi-en-service (6), icpe-stockage (4), froid (2)

| Article | Prescription | État | Où |
|---|---|---|---|
| R. 557-14-1 | champ | P | déclaration ESP |
| Arr. 2017 art. 6 I | dossier d'exploitation, conservation | P | `esp-dossier-suivi` |
| art. 6 II | dossier « transmis au nouvel exploitant lors d'un changement de site ou de propriétaire » | S — hors cible (événement) | dit au `prescrit`, sans réserve ; même trou que l'art. 18 II (réserve) |
| art. 6 III | « L'exploitant tient à jour une liste des récipients fixes, des générateurs de vapeur et des tuyauteries soumis… type, régime de surveillance, dates… » | **S — cible faible** | au `prescrit`, sans réserve ni obligation (`grep` equipement-sous-pression.ts : rien). **M7** |
| art. 7-11 | déclaration, contrôle, attestation | P | `esp-declaration-mise-en-service` |
| art. 11 V | transmettre la date de l'attestation par le téléservice | S° | sous-geste de la déclaration |
| art. 15 I | périodes maximales | P | deux inspections |
| art. 15 I dernier al. / II / III | réduire si l'état le justifie ; récipients mobiles avant remplissage ; programme tuyauteries | S — hors cible | au `prescrit` sans réserve ; remplisseur / tuyauteries > DN 100 |
| art. 18-19 | requalification ; extincteurs > 30 bar ; II | P / A / A | `esp-requalification-decennale` ; réserves |
| art. 26-28 | intervention ; déclaration de conformité annexée ; contrôle | P | `esp-intervention-reparation` |
| C. env. L. 512-1 / -7 / -8 | régimes | P | `stockage-dangereux-declaration-icpe` ; procédures A (réserves) |
| Arr. 2015-06-01 art. 22 | rétention (enregistrement) | P / A | `stockage-dangereux-retention` ; 3 réserves |
| C. env. R. 543-79 al. 1-2 | contrôle à la mise en service, renouvellement, après modification | P | huit lignes froid |
| R. 543-79 al. 3 | « le détenteur… prend toutes mesures pour remédier à la fuite qui a été constatée » | **S — cible** | aucune obligation ni réserve (froid.ts:454 ne parle que du contrôle refait après réparation). **M3** |
| R. 543-79 al. 3 | constat remis, copie au préfet | E | pèse sur l'opérateur |
| Règl. UE 2024/573 art. 5 | seuils, exemptions | non relu | hors API |

#### arrete-1987-10-08-aeration (3), portes (4), machines (1)

| Article | Prescription | État | Où |
|---|---|---|---|
| Arr. 1987 art. 2 a) | dossier de valeurs de référence, 1 mois | P | `aeration-travail-mise-en-service` |
| art. 2 b) | consigne d'utilisation | P | `aeration-etablissement-consigne-utilisation` |
| art. 2 | tenue à jour du dossier de maintenance, mise à disposition | A | réserve |
| art. 3 | contenu ; annuel | P | `aeration-controle-installations-r4222-20` |
| art. 4 2 a) / b) | annuel ; semestriel si recyclage | P / A | `aeration-travail-locaux-pollution-specifique` ; réserve de R. 4222-20 |
| R. 4224-13 | fonctionnement sans risque ; renvoi | P | `porte-auto-maintien-en-etat` |
| R. 4224-17 | entretien/vérif., défectuosité, dossier | P / A | portes ; réserve (champ général) |
| Arr. 1993-12-21 art. 2 | prescriptions de construction | P / A | `porte-auto-portail-piete-coulissant` ; réserve |
| art. 9 | semestriel ; après défaillance ; écrit préalable | P / A / A | `porte-auto-verification-semestrielle` ; réserve |
| Arr. 1993-03-05 art. 1 | 2 des 11 catégories ; II saisonnier | P / E / A | `compactage-dechets-vgp-trimestrielle` ; réserve |

#### arrete-1993-11-04-signalisation (8 `retenu`)

| Article | Prescription | État | Où |
|---|---|---|---|
| art. 2 | signaler le risque résiduel ; choix selon annexe I | P / A | `signalisation-etablissement-risques-residuels` ; réserve |
| art. 7 | alimentation de secours ; exception | P / A | `…-alimentation-secours-presence` ; réserve |
| art. 9 | balisage ; « Sortie de secours » | P | `…-cheminements-evacuation` |
| art. 10 | rouge + panneau ; dispense | P / A | `signalisation-incendie-moyens-lutte` ; réserve |
| art. 11 1-3 | tuyauteries, transport, stockage | P / A | stockage ; réserve (tuyauteries, transport) |
| art. 12 | bandes | P / A | `…-obstacles-zones-dangereuses` ; réserve R. 4224-20 |
| art. 15 | entretien ; semestriel signaux ; annuel alimentations | P | trois lignes établissement |

#### code-travail-eclairage (1), arrete-2011-12-14-eclairage (2)

| Article | Prescription | État | Où |
|---|---|---|---|
| R. 4223-11 al. 1 | matériel installé pour être entretenu aisément | S° | règle d'aménagement, politique sœur R. 4223-9 / -10 (`sans_objet`) |
| R. 4223-11 al. 2-3 | règles d'entretien, document communiqué au CSE | P | `eclairage-etablissement-regles-entretien` |
| Arr. 2011-12-14 art. 1 al. 1-2 | champ ; ERP : règlement ERP seul | P | `erp: false` |
| art. 1 al. 3 | cantines, restaurants : règle ERP si plus contraignante | E | notesInternes de `…-essai-mensuel` (« hors de portée du modèle ») |
| art. 11 | mensuel, semestriel, périodes de fermeture, registre | P | deux lignes BAES travail |
| art. 11 | SATI | A | réserve |
| art. 11 dernier al. | « Une notice descriptive des conditions de maintenance et de fonctionnement doit être annexée au registre précédent. Elle devra comporter les caractéristiques des pièces de rechange. » | **S — cible** | ni description ni réserve. **M4** |

Hors inventaire, même arrêté (API) : art. 5 (où l'éclairage d'évacuation est dû — dégagements, et tout local sauf les trois conditions cumulées), art. 12 (« lampes de rechange » en permanence). Non cités (`grep` vide) ; nécessaires à M2.

#### code-travail-epi (2 `retenu`), arrete-1993-03-19-epi (1), code-travail-conduite (2)

| Article | Prescription | État | Où |
|---|---|---|---|
| R. 4323-100 | personnes qualifiées ; liste | P / A | `epi-verification-generale-periodique` ; réserve (citation manquante) |
| R. 4323-105 | consigne ; documentation à disposition du CSE | P | `epi-etablissement-consigne-utilisation` |
| Arr. EPI art. 1er | 5 familles, 12 mois, en service ou en stock | P / A | ligne EPI ; réserve (stock) |
| R. 4323-55 | formation à la conduite | P | `conduite-salarie-formation` |
| R. 4323-56 | autorisation ; attestation 5 ans ; tenue à disposition ; modèle ; recours | P / A | `conduite-salarie-autorisation`, `…-attestation-medicale` ; réserve (3 alinéas) |

---

### 2. Articles `sans_objet` / `hors_perimetre` — motif relu contre le texte entier

Tiennent (texte API relu, motif conforme) : R. 4544-9 ; arr. 2011-12-26 annexe I (ses « anomalies… mention dans le registre prévu à l'article R. [4226-19] » sont portées par `elec-travail-consignation-registre`) ; annexe IV (`hors_perimetre`, installations temporaires) ; R. 4412-59 ; R. 4222-22 ; R. 4227-27 ; arr. 1993-03-05 art. 3, 4, 5 ; arr. 1993-11-04 art. 1, 3, 6, 16, 17, annexes I, II, IV ; R. 4223-1, -2, -3, -5, -7, -8, -9, -10, -12 ; R. 4223-6 (tient, sa frontière est déjà dite « discutable » par son propre motif) ; R. 4323-91, -92, -93, -94, -96, -98, -99, -103 ; R. 4322-1 (faiblement : `maintien en état` est porté ailleurs par équipement, jamais en général — l'argument ADR-027 tient) ; arr. EPI art. 2, 3, 4 ; arr. 1993-03-19 art. 1er (module `PlanPrevention`, confirmé : `grep "travaux dangereux"` → `FormulairePlanPrevention.tsx`, `plan-prevention/page.tsx`) ; R. 4214-11 ; R. 4431-2, R. 4432-1, R. 4433-1, R. 4441-1 ; R. 4323-57.

Ne tiennent plus :

| Article | Texte API | Pourquoi le motif ne tient plus | Proposition |
|---|---|---|---|
| Arr. 1993-11-04 art. 5 | « Le chef d'établissement doit faire bénéficier les travailleurs d'une formation adéquate… signification des panneaux, des couleurs de sécurité, des signaux lumineux et acoustiques. Cette formation doit être renouvelée aussi souvent qu'il est nécessaire. » | Le motif se déclare lui-même provisoire : « CANDIDAT À REQUALIFICATION en `retenu` … sinon elle devient `obligation_manquante` ». La condition (câblage sur `formation-securite-etablissement-organisation`) n'est pas remplie : la description de cette obligation ne nomme pas la signalisation. | **N1** — à décider (voir § 4) |
| Arr. 1993-11-04 art. 14 | « Un équipement d'alarme au moins de type 3 doit être installé dans les établissements dont l'effectif est supérieur à 700 personnes et dans ceux dont l'effectif est supérieur à 50 personnes lorsque sont entreposées ou manipulées des substances ou mélanges visés à l'article R. 4227-22… type 4… autres établissements visés à l'article R. 4227-34 » | Condition de requalification remplie (`85cbbfd`), le motif le dit. | **Point (ii)** — clair |
| R. 4323-97 | « L'employeur détermine, après consultation du comité social et économique, les conditions dans lesquelles les équipements de protection individuelle sont mis à disposition et utilisés… » | Politique sœur contraire : arr. 1993-11-04 art. 4, de structure identique (« Le chef d'établissement détermine, après consultation du [CHSCT]… la signalisation »), est `obligation_manquante`, `a_trancher`, `toucheLaCible: true`. Le motif « consultation hors périmètre » est donc contredit dans le même dépôt. | **N2** — requalifier `obligation_manquante` (`a_trancher`, cible) : clair |
| R. 4323-95 + R. 4321-4 | « …sont fournis gratuitement par l'employeur qui assure leur bon fonctionnement et leur maintien dans un état hygiénique satisfaisant… » ; « L'employeur met à la disposition des travailleurs, en tant que de besoin, les équipements de protection individuelle appropriés… Il veille à leur utilisation effective. » | Motif = « aucune périodicité, aucune pièce, rien à porter ». Depuis ADR-026 et C45, le dépôt porte des états permanents sans pièce ni date : `incendie-travail-chiffons-impregnes-recipients-clos` (R. 4227-26), `incendie-travail-alarme-sonore` (`pieceAttendue: null`). Et `epi-etablissement-consigne-utilisation` est déjà une ligne établissement déclenchée par la présence d'EPI. Cible : oui (la description de la consigne vise « gants ou chaussures de sécurité »). | **N3** — à décider |
| R. 4323-101 / -102 | « Le résultat des vérifications périodiques est consigné sur le ou les registres de sécurité mentionnés à l'article L. 4711-5. » ; rapports annexés, « A défaut… » | Motif : « Le registre lui-même est porté ailleurs, par L. 4711-5 ». Le dépôt établit le contraire (`code-travail-incendie`, réserve de L. 4711-5 : « est autorisé à — une FACULTÉ »). Sœur : R. 4323-25 / -26, `retenu` pour `levage-registre-securite-consignation`. La consignation EPI n'est portée que par une note de référence de `epi-verification-generale-periodique`. | **N4** — à décider (cible faible : 5 familles d'EPI rares dans la cible) |
| R. 4323-104 3°-4° | « 3° Des instructions ou consignes… ; 4° Des conditions de mise à disposition » | Motif : « compté une fois, dans R. 4323-105 » — mais R. 4323-105 ne reprend que « 1° et 2° ». Sœur : R. 4323-1 (information des utilisateurs d'équipements de travail) est `retenu`. | **N5** — à décider (faible) |

INRS (16 `sans_objet`) : ne fonde rien à tort. Seule citation dans une obligation : `elec-travail-habilitation-personnel`, `referencesLegales[1]` (`source: "INRS"`), la référence [0] étant R. 4544-10. Les autres usages (permis de feu, cotation ED 840) se présentent comme recommandations (« ni article de code, ni arrêté », `controle-zip/route.ts:448`).

---

### 3. Anti-zèle — phrase qui touche la cible

| Manque | Phrase du texte | Cible |
|---|---|---|
| M1 R. 4227-29 | « Il existe au moins un extincteur portatif… pour 200 mètres carrés de plancher. Il existe au moins un appareil par niveau. » | Tout employeur, sans seuil : oui |
| M2 R. 4227-14 | « Les établissements disposent d'un éclairage de sécurité » ; arr. 14/12/2011 art. 5 : « Il doit être mis en œuvre dans les dégagements et dans tout local pour lequel les conditions suivantes ne sont pas réunies… effectif du local inférieur à 20 personnes… moins de trente mètres à parcourir » | Oui, avec une exemption (petit local de plain-pied) que le modèle ne sait pas lire |
| M3 R. 543-79 | « …lequel prend toutes mesures pour remédier à la fuite » | Chambre froide et vitrines (suggérées à toute restauration et tout commerce alimentaire) : oui |
| M4 arr. 2011 art. 11 | « Une notice descriptive… doit être annexée au registre » | Qui a des BAES hors ERP (commerce, bureau) : oui |
| M5 R. 4227-38 8° | « Le devoir… de donner l'alarme… » | Champ R. 4227-34 : oui |
| M6 R. 4544-10 al. 2 | « …s'assure que le travailleur a reçu la formation théorique et pratique » | Qui habilite : oui |
| M7 arr. 2017 art. 6 III | « …tient à jour une liste des récipients fixes… » | Faible (ESP soumis) |
| M8 R. 4227-40 | « La consigne de sécurité incendie est communiquée à l'inspection du travail. » | Champ R. 4227-34 (> 50 personnes, public compris) : oui |

---

### 4. Encodages proposés

| # | Encodage | Politique sœur | Verdict |
|---|---|---|---|
| M1 | `incendie-travail-moyens-lutte` : `porteur: "etablissement"`, `EXTINCTEUR` passe de `categoriesEquipement` à `equipementsEnContexte` ; description + « au moins un extincteur à eau pulvérisée de 6 l pour 200 m², au moins un par niveau » ; `realisateurs: ["exploitant"]`. Id inchangé. | `incendie-travail-alarme-sonore` (« la conditionner à une alarme déclarée la ferait disparaître exactement chez qui n'en a pas ») ; `incendie-travail-consigne-affichee` réancrée au palier 1 | **Clair et fondé.** À vérifier avant merge : lignes d'état déjà déclarées par extincteur en base, et tests qui supposent l'ancrage (`engine.test.ts`, `fiche.test.ts`). Test : `zz-g2-dotation.test.ts` (**échoue aujourd'hui**, sortie ci-dessous) |
| M2 | Nouvelle `incendie-travail-eclairage-securite-installe` : état permanent, établissement, `travail: true, erp: false`, `BAES` en contexte, l'exemption de l'art. 5 écrite dans la description ; entrer art. 2, 5, 12 de l'arrêté au corpus | alarme (même forme) ; sur-application visible (`signalisation-etablissement-*`, réserve art. 15) | **À décider** : sur-applique au petit commerce d'une pièce qui remplit les trois conditions. Recommandation : encoder, l'erreur étant visible par qui la subit |
| M3 | Une phrase dans `froid-controle-etancheite-apres-modification` (événementielle) + R. 543-79 al. 3 en note ; ou réserve au corpus | `porte-auto-maintien-en-etat` (« Toute défectuosité… est éliminée le plus rapidement possible ») | Clair (la phrase) ; une ligne propre serait à décider |
| M4 | Une phrase dans les deux lignes BAES travail (« notice… annexée au registre, avec les pièces de rechange ») | `epi-etablissement-consigne-utilisation` (« Deux pièces, donc ») | Clair |
| M5 | Ajouter le 8° à la description de `incendie-travail-consigne-affichee` | — | Clair |
| M6 | Une phrase dans `elec-salarie-habilitation` | note electricite.ts:266 | Clair |
| M7 | Une phrase dans `esp-dossier-suivi` (liste des équipements soumis, avec les dates) | `prevention-etablissement-liste-personnes-qualifiees` | Clair, faible priorité |
| M8 | R. 4227-40 au corpus `code-travail-incendie` (`retenu`) + dans les `referencesLegales` et la description de `consigne-affichee` | R. 4227-38 (contenu de la même consigne, `retenu`) | Clair |
| N1 | (a) `retenu` sur `formation-securite-etablissement-organisation`, avec la signalisation dans la description, réserve « aussi souvent que nécessaire » ; (b) `non_couvert` annoncé (domaine « Formation ») | (a) motif même de l'article ; (b) R. 4323-106 | À décider — reco (a) |
| N2 | `obligation_manquante`, `cause: a_trancher`, `toucheLaCible: true` | arr. 1993-11-04 art. 4 | Clair (classement) |
| N3 | (a) `obligation_manquante` `a_trancher` ; (b) état permanent établissement déclenché comme la consigne EPI ; (c) `non_couvert` annoncé sous `travail_epi` | R. 4227-26 ; consigne EPI ; R. 4323-106 | À décider — reco au moins (a) |
| N4 | `retenu` sur `epi-verification-generale-periodique` + une phrase de consignation | R. 4323-25 / -26 | À décider (faible) |
| N5 | réserve sur R. 4323-105, ou `retenu` sur la consigne EPI | R. 4323-1 | À décider (faible) |

---

### 5. Points (i) et (ii)

#### (i) Champ de la question des matières

- R. 4227-22 : « Les locaux ou les emplacements dans lesquels sont **entreposées ou manipulées** des substances… ».
- R. 4227-34 : « …ceux, quelle que soit leur importance, où sont **manipulées et mises en œuvre** des matières inflammables mentionnées à l'article R. 4227-22 ».
- Arr. 1993-11-04 art. 14 : type 3 au-delà de 50 personnes « lorsque sont **entreposées ou manipulées** ».
- La question (`EtablissementForm.tsx:251-285`) demande « Manipulez-vous *et* mettez-vous en œuvre… », et son aide dit que l'entreposage relève d'articles « que Rojer ne suit pas ».
- R. 4227-22 à -25 sont annoncés à **tout employeur** (`manques-annonces.ts:154-157`, `condition: "travail"`), pas seulement à qui répond oui.

Options : (A) garder la question, qui sert R. 4227-34 mot pour mot ; (B) l'élargir à l'entreposage, ce qui ferait naître l'alarme, la consigne et les exercices chez qui ne fait que stocker, contre le texte de R. 4227-34 ; (C) ajouter une question « entreposage » pour encoder R. 4227-22 à -25, ce qui rouvrirait la décision C45 de la propriétaire.

**Recommandation : (A).** Aucune obligation n'est perdue en silence : l'annonce ne dépend pas de la réponse. Seul reste le type 3 de l'art. 14 pour un établissement de plus de 50 personnes qui stocke seulement ; il suffit de l'écrire dans la description de l'alarme (point ii).

#### (ii) Arr. 1993-11-04 art. 14

Texte API (LEGIARTI000028480696, version 2014-01-19) cité au § 2. **Requalifier en `retenu`** sur `incendie-travail-alarme-sonore`, `lecture: "api_legifrance"`. Ajouter l'article en `referencesLegales` (note verbatim) et une phrase à la description : « au moins de type 4 ; au moins de type 3 au-delà de 700 personnes, ou au-delà de 50 lorsque des matières de R. 4227-22 sont entreposées ou manipulées ; au moins 2 a ou 2 b si une temporisation est voulue ».

Politique sœur : R. 4227-35 et -36, caractéristiques de la même alarme, sont `retenu` sur cette obligation ; R. 4227-38 l'est pour le contenu de la consigne, et le motif de l'art. 14 invoque lui-même ce rapport. Le champ de l'obligation ne change pas (l'art. 14 ne vise que « les établissements visés à l'article R. 4227-34 »). **Clair et fondé.**

---

### Sortie du test proposé (M1)

```
     × un bureau sans aucun équipement reçoit la dotation en extincteurs, portée par l'établissement 2ms
AssertionError: R. 4227-29 disparaît chez qui n'a déclaré aucun extincteur: expected undefined to be defined
      Tests  1 failed | 1 passed (2)
```

## 3. G3 — Code du travail : organisation, personnes, santé
Source des textes : API Légifrance (DILA/PISTE), 229 articles relus en entier le 2026-09-27 (`zz-g3-textes.md`, même dossier). États : `portee` (id), `annoncee` (où), `ecartee` (motif, où), `SANS_ETAT` (manque) ; pour `sans_objet`/`hors_perimetre` : `tient` / `fragile` / `NE_TIENT_PLUS`.

| corpus | réf. | statut corpus | prescription | état | où / motif | cible |
|---|---|---|---|---|---|---|
| code-travail-formation-securite | L. 4141-1 | retenu | al. 1 : informer sur les risques santé-sécurité et les mesures | **portee** | formation-securite-etablissement-information | — |
| code-travail-formation-securite | L. 4141-1 | retenu | al. 2 : informer sur les risques que les produits ou procédés de fabrication de l'établissement font peser sur la SANTÉ PUBLIQUE ou l'ENVIRONNEMENT, et les mesures | **SANS_ETAT** | ni description/libellé de l'obligation, ni prescrit, ni réserve, ni annonce ; présent seulement dans la citationCle (corpus l.64) | oui (restauration : procédés de cuisson, produits de nettoyage) ; bureau marginal |
| code-travail-formation-securite | L. 4141-2 | retenu | 1° embauche, 2° changement de poste/technique, 3° salariés temporaires, 4° reprise ≥ 21 j à la demande du médecin | **portee** | formation-securite-etablissement-organisation (+ -salarie-accueil) | — |
| code-travail-formation-securite | L. 4141-2 | retenu | « répétée périodiquement » (renvoi réglementaire/conventionnel) | **annoncee** | réserve de corpus (périodicité « autre ») | — |
| code-travail-formation-securite | L. 4141-3 | sans_objet | modulation de l'étendue | **tient** | — | — |
| code-travail-formation-securite | L. 4141-4 | sans_objet | financement par l'employeur | **tient** | règle d'imputation (même traitement que L. 2315-16, R. 4624-39) | — |
| code-travail-formation-securite | L. 4141-5 | non_couvert | III 1° renseigner le passeport de prévention | **annoncee** | manques-annonces.ts (formation) | — |
| code-travail-formation-securite | R. 4141-1 | sans_objet | rattachement au programme annuel | **tient** | — | — |
| code-travail-formation-securite | R. 4141-2 | retenu | informer de façon compréhensible ; information+formation à l'embauche et chaque fois que nécessaire | **portee** | -etablissement-information / -salarie-accueil | — |
| code-travail-formation-securite | R. 4141-3 | retenu | objet et 3 volets de la formation | **portee** | -etablissement-organisation | — |
| code-travail-formation-securite | R. 4141-3-1 | retenu | contenu 1° à 5° de l'information | **portee** | -etablissement-information (description cite 1° à 5°) | — |
| code-travail-formation-securite | R. 4141-4 | sans_objet | expliquer l'utilité des mesures pendant la formation | **tient** | modalité d'une formation portée | — |
| code-travail-formation-securite | R. 4141-5 | sans_objet | adaptation (langue…), temps de formation = temps de travail | **tient** | modalités | — |
| code-travail-formation-securite | R. 4141-6 | retenu | associer le médecin du travail | **annoncee** | réserve de corpus | — |
| code-travail-formation-securite | R. 4141-7 | sans_objet | concours « le cas échéant » OPPBTP/CARSAT | **tient** | faculté | — |
| code-travail-formation-securite | R. 4141-8 | retenu | analyse après AT grave ou répété, formation s'il y a lieu | **portee** | -apres-accident-grave | — |
| code-travail-formation-securite | R. 4141-9 | retenu | formation à la reprise ≥ 21 j, à la demande du médecin | **portee** | -organisation (réserve : non calculé) | — |
| code-travail-formation-securite | R. 4141-10 | sans_objet | articulation avec formations spéciales | **tient** | — | — |
| code-travail-formation-securite | R. 4141-11 | retenu | contenu formation circulation | **portee** | -organisation | — |
| code-travail-formation-securite | R. 4141-12 | retenu | analyse après modification circulation/exploitation, formation s'il y a lieu | **portee** | -modification-circulation-exploitation | — |
| code-travail-formation-securite | R. 4141-13 | retenu | contenu formation exécution du travail | **portee** | -organisation | — |
| code-travail-formation-securite | R. 4141-14 | sans_objet | intégration et lieu | **tient** | modalité | — |
| code-travail-formation-securite | R. 4141-15 | retenu | formation en cas de création/modification de poste (8 tâches) | **portee** | -organisation / -salarie-accueil | — |
| code-travail-formation-securite | R. 4141-16 | retenu | changement de poste ; complément circulation si changement de lieu | **portee** | -salarie-accueil (+ -organisation pour la circulation) | — |
| code-travail-formation-securite | R. 4141-17 | retenu | objet formation conduite en cas d'accident | **portee** | -organisation | — |
| code-travail-formation-securite | R. 4141-18 | retenu | formation accident pour les tâches de R. 4141-15 | **portee** | -salarie-accueil | — |
| code-travail-formation-securite | R. 4141-19 | retenu | idem au changement de poste | **portee** | -salarie-accueil | — |
| code-travail-formation-securite | R. 4141-20 | retenu | dans le mois qui suit l'affectation | **portee** | -salarie-accueil (réserve : délai non calculé) | — |
| code-travail-formation-securite | L. 4741-1 | sans_objet | disposition pénale | **tient** | — | — |
| code-travail-sante-travail | R. 4624-10 | retenu | VIP dans les 3 mois | **portee** | sante-travail-salarie-vip (réserve délai) | — |
| code-travail-sante-travail | R. 4624-16 | retenu | renouvellement ≤ 5 ans | **portee** | sante-travail-salarie-vip | — |
| code-travail-sante-travail | R. 4624-17 | retenu | suivi adapté ≤ 3 ans | **portee** | sante-travail-salarie-vip-adaptee | — |
| code-travail-sante-travail | R. 4624-18 | retenu | VIP préalable (nuit, < 18 ans) | **portee** | -vip-adaptee (réserve : non calculé) | — |
| code-travail-sante-travail | R. 4451-82 | retenu | al. 1 SIR des classés et du suivi radon ; al. 2 cat. A annuelle, pas d'intermédiaire | **portee** | -sir / -sir-categorie-a | non |
| code-travail-sante-travail | R. 4624-22 | retenu | SIR des postes à risques particuliers | **portee** | -salarie-sir | — |
| code-travail-sante-travail | R. 4624-23 | retenu | III liste employeur annuelle, avis, motivation, transmission | **portee** | -etablissement-liste-postes-risques | — |
| code-travail-sante-travail | R. 4624-23 | retenu | I/II assiette ; IV COCT | **ecartee** | réserve (I/II définissent l'assiette ; IV ne vise pas l'employeur) | — |
| code-travail-sante-travail | R. 4624-24 | retenu | examen d'aptitude préalable, substitué à la VIP | **portee** | -salarie-sir | — |
| code-travail-sante-travail | R. 4624-27 | retenu | dispense d'examen sous 3 conditions | **annoncee** | réserve + description (faux positif assumé) | — |
| code-travail-sante-travail | R. 4624-28-1 | sans_objet | champ de la visite de fin d'exposition | **tient** | définition servant R. 4624-28-2 | — |
| code-travail-sante-travail | R. 4624-28-2 | retenu | informer le SPST ; aviser le travailleur | **portee** | -fin-exposition-suivi-renforce | — |
| code-travail-sante-travail | R. 4624-28-3 | hors_perimetre | actes du médecin du travail | **tient** | (le motif dit encore R. 4624-28-2 « obligation_manquante » : périmé, conclusion intacte) | — |
| code-travail-sante-travail | R. 4624-31 | retenu | saisir le SPST (4 cas, dérogation) | **portee** | -examen-de-reprise | — |
| code-travail-sante-travail | R. 4624-55 | non_couvert | conserver l'avis d'aptitude | **annoncee** | FormulaireTitre.tsx (declareA) | — |
| code-travail-sante-travail | L. 4624-2-4 | retenu | informer le travailleur de la préreprise | **portee** | -information-possibilite-prereprise | — |
| code-travail-sante-travail | R. 4624-29 | sans_objet | durée > 30 j | **tient** | définition | — |
| code-travail-sante-travail | R. 4624-30 | sans_objet | actes du médecin (préreprise) | **tient** | — | — |
| code-travail-sante-travail | R. 4624-32 | sans_objet | objet de l'examen de reprise | **tient** | — | — |
| code-travail-sante-travail | R. 4624-33 | retenu | informer le médecin des AT < 30 j | **portee** | -information-arret-accident-moins-trente-jours | — |
| code-travail-sante-travail | R. 4624-28 | retenu | renouvellement ≤ 4 ans ; visite intermédiaire ≤ 2 ans | **portee** | -sir / -sir-visite-intermediaire | — |
| code-travail-sante-travail | R. 4624-46 | retenu | fiche d'entreprise | **portee** | -fiche-entreprise | — |
| code-travail-sante-travail | R. 4624-47 | retenu | fiche dans l'année de l'adhésion | **portee** | -fiche-entreprise (réserve : délai non calculé) | — |
| code-travail-sante-travail | L. 4624-1 | sans_objet | suivi individuel (aucun sujet employeur, texte entier relu) | **tient** | le motif dit « alinéas suivants non lus » : relus ici, aucun ne nomme l'employeur | — |
| code-travail-sante-travail | R. 4624-39 | sans_objet | temps et frais de transport des visites à la charge de l'employeur | **tient** | règle de prise en charge (sœur : L. 4141-4) | — |
| code-travail-sante-travail | L. 4745-1 | sans_objet | pénal | **tient** | — | — |
| code-travail-sante-travail | R. 4451-57 | sans_objet | l'employeur CLASSE (cat. A/B), recueille l'avis du médecin, actualise | **NE_TIENT_PLUS** | acte d'employeur non porté ≠ « aucune échéance » ; relève d'obligation_manquante (cause attribut/perimetre) | non (rayonnements ionisants) |
| code-travail-secours | R. 4224-14 | retenu | matériel de premiers secours | **portee** | secours-etablissement-materiel | — |
| code-travail-secours | R. 4224-15 | retenu | secouriste par atelier à travaux dangereux (1°) / chantier (2°) | **portee** | secours-salarie-secouriste (2° hors cible) | — |
| code-travail-secours | R. 4224-16 | retenu | mesures de premiers secours consignées ; après avis du médecin | **portee** | secours-etablissement-mesures (avis : écarté en notesInternes) | — |
| code-travail-organisation-prevention | L. 4644-1 | retenu | I al. 1 désigner ; al. 2 former le désigné | **portee** | prevention-etablissement-salarie-designe / formation-securite-salarie-designe-competent | — |
| code-travail-organisation-prevention | L. 4644-1 | retenu | al. 3-5 recours à des intervenants extérieurs | **ecartee** | réserve (faculté « peut ») | — |
| code-travail-organisation-prevention | L. 2311-2 | retenu | mise en place du CSE (11, 12 mois) | **portee** | prevention-etablissement-cse (réserve 12 mois) | — |
| code-travail-organisation-prevention | L. 1111-2 | sans_objet | calcul des effectifs | **tient** | — | — |
| code-travail-organisation-prevention | L. 1111-3 | sans_objet | exclusions du calcul | **tient** | — | — |
| code-travail-organisation-prevention | L. 2315-18 | retenu | formation SSCT des élus + référent ; financement | **portee** | formation-securite-salarie-cse-sst (2° ≥ 300 hors cible, réserve) | — |
| code-travail-organisation-prevention | L. 2315-17 | retenu | organisme ; renouvellement après 4 ans de mandat | **portee** | -cse-sst / -designe-competent | — |
| code-travail-organisation-prevention | L. 2315-16 | sans_objet | temps de formation rémunéré | **tient** | — | — |
| code-travail-organisation-prevention | R. 4644-1 | retenu | désignation après avis du CSE ; temps, moyens ; non-discrimination | **annoncee** | réserve de corpus | — |
| code-travail-organisation-prevention | L. 1321-1 | retenu | RI : 1° et 2° santé-sécurité ; 3° discipline | **portee** | prevention-etablissement-reglement-interieur (3° : réserve, hors SST) | — |
| code-travail-organisation-prevention | L. 1311-2 | retenu | RI obligatoire à 50, délai 12 mois ; al. 3 faculté | **portee** | -reglement-interieur | — |
| code-travail-information-travailleurs | D. 4711-1 | retenu | affichage 1° 2° 3° | **portee** | information-etablissement-affichages-obligatoires | — |
| code-travail-information-travailleurs | R. 4121-4 | retenu | dernier alinéa : avis affiché | **portee** | information-etablissement-avis-acces-duerp | — |
| code-travail-information-travailleurs | R. 4121-4 | retenu | 1° à 7° mise à disposition 40 ans ; conservation | **annoncee** | réserve (servi par le module DUERP) | — |
| code-travail-locaux-sociaux | R. 4228-1 | retenu | moyens de propreté individuelle | **portee** | locaux-etablissement-installations-sanitaires | — |
| code-travail-locaux-sociaux | R. 4225-2 | retenu | eau potable et fraîche | **portee** | locaux-etablissement-eau-potable | — |
| code-travail-locaux-sociaux | R. 4225-3 | non_couvert | boisson non alcoolisée, liste des postes | **annoncee** | manques-annonces.ts (boissons) | — |
| code-travail-locaux-sociaux | R. 4228-22 | retenu | local de restauration ≥ 50 | **portee** | locaux-etablissement-local-restauration | — |
| code-travail-locaux-sociaux | R. 4228-23 | retenu | al. 1 emplacement < 50 | **portee** | locaux-etablissement-emplacement-restauration | — |
| code-travail-locaux-sociaux | R. 4228-23 | retenu | al. 3 dérogation à R. 4228-19 : déclaration inspection + médecin | **annoncee** | réserve + description | — |
| code-travail-locaux-sociaux | R. 4228-23 | retenu | OBJET DU RENVOI : R. 4228-19 « Il est interdit de laisser les travailleurs prendre leur repas dans les locaux affectés au travail » | **SANS_ETAT** | article non dépouillé (portee du corpus l.35) ; l'interdiction n'est dite nulle part, seulement sa dérogation | oui (restaurant, commerce : repas en cuisine, en réserve, au comptoir) |
| code-travail-co-activite | R. 4515-1 | retenu | champ | **portee** | co-activite-etablissement-protocole-securite | — |
| code-travail-co-activite | R. 4515-2 | sans_objet | définition | **tient** | — | — |
| code-travail-co-activite | R. 4515-3 | sans_objet | définition du répétitif | **tient** | — | — |
| code-travail-co-activite | R. 4515-4 | retenu | protocole : existence / contenu / préalable / exemplaire daté-signé | **portee** | co-activite-etablissement-protocole-securite | — |
| code-travail-co-activite | R. 4515-5 | retenu | protocole : existence / contenu / préalable / exemplaire daté-signé | **portee** | co-activite-etablissement-protocole-securite | — |
| code-travail-co-activite | R. 4515-6 | retenu | protocole : existence / contenu / préalable / exemplaire daté-signé | **portee** | co-activite-etablissement-protocole-securite | — |
| code-travail-co-activite | R. 4515-8 | retenu | protocole : existence / contenu / préalable / exemplaire daté-signé | **portee** | co-activite-etablissement-protocole-securite | — |
| code-travail-co-activite | R. 4515-11 | retenu | protocole : existence / contenu / préalable / exemplaire daté-signé | **portee** | co-activite-etablissement-protocole-securite | — |
| code-travail-co-activite | R. 4515-7 | sans_objet | contenu côté transporteur | **tient** | — | — |
| code-travail-co-activite | R. 4515-9 | retenu | protocole unique des opérations répétitives (état permanent) | **annoncee** | réserve de corpus + notesInternes (obligation sœur proposée, décision propriétaire) | — |
| code-travail-co-activite | R. 4515-10 | sans_objet | fournir/recueillir par tout moyen si échange impossible | **tient** | modalité de R. 4515-8 | — |
| code-travail-service-prevention-sante | L. 4622-1 | retenu | organiser un SPST | **portee** | sante-travail-etablissement-adhesion-spst | — |
| code-travail-service-prevention-sante | L. 4622-7 | sans_objet | responsabilité des dirigeants du service | **tient** | — | — |
| code-travail-service-prevention-sante | D. 4622-1 | retenu | formes du service | **portee** | -adhesion-spst | — |
| code-travail-service-prevention-sante | D. 4622-2 | retenu | al. 1 choix par l'employeur | **portee** | -adhesion-spst | — |
| code-travail-service-prevention-sante | D. 4622-2 | retenu | al. 2 CSE préalablement consulté, peut s'opposer | **SANS_ETAT** | ni réserve ni note | non (choix ouvert aux seules entreprises pouvant avoir un service autonome) |
| code-travail-manutention-ecran | R. 4541-8 | retenu | information et formation manutention | **portee** | formation-securite-etablissement-manutention | — |
| code-travail-manutention-ecran | R. 4542-16 | retenu | information et formation écran | **portee** | formation-securite-etablissement-travail-sur-ecran | — |
| code-travail-manutention-ecran | R. 4541-2 | sans_objet | définition | **tient** | — | — |
| code-travail-manutention-ecran | R. 4541-3 | sans_objet | éviter la manutention manuelle | **tient** | porté par le référentiel DUERP (commun.ts, risque trv-charges) | — |
| code-travail-manutention-ecran | R. 4541-9 | sans_objet | plafonds 55/105 kg ; femmes 25 kg / 40 kg brouette | **tient** | porté par le référentiel DUERP (commun.ts, trv-charges, cité mot pour mot) | — |
| code-travail-manutention-ecran | R. 4542-1 | sans_objet | champ | **tient** | — | — |
| code-travail-manutention-ecran | R. 4542-4 | sans_objet | pauses/changement d'activité écran | **tient** | porté par le référentiel DUERP (commun.ts, bureau.ts) | — |
| code-travail-agents-biologiques | R. 4421-1 | sans_objet | champ | **tient** | — | — |
| code-travail-agents-biologiques | R. 4423-1 | sans_objet | déterminer nature/durée/conditions d'exposition | **tient** | évaluation portée par le DUERP (commun.ts) | — |
| code-travail-travail-de-nuit | L. 3122-1 | sans_objet | recours exceptionnel | **tient** | DUERP (commun.ts) | — |
| code-travail-travail-de-nuit | L. 3122-2 | sans_objet | définition | **tient** | — | — |
| code-travail-travail-en-hauteur | R. 4323-58 | sans_objet | plan de travail sûr | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-59 | sans_objet | garde-corps | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-60 | sans_objet | recueil souple | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-62 | sans_objet | choix des équipements | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-64 | sans_objet | cordes interdites (sauf) | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-65 | sans_objet | continuité des protections | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-66 | sans_objet | enlèvement temporaire | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-67 | sans_objet | accès sûr | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-68 | sans_objet | météo | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-71 | sans_objet | protection au montage | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-73 | sans_objet | stabilité échafaudage | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-74 | sans_objet | échafaudage fixe | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-75 | sans_objet | échafaudage roulant | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-76 | sans_objet | charge admissible affichée | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-77 | sans_objet | renvoi garde-corps | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-78 | sans_objet | planchers | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-79 | sans_objet | accès entre planchers | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-80 | sans_objet | zones d'accès limité | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-85 | sans_objet | échelles suspendues | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-86 | sans_objet | échelles à coulisse | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-87 | sans_objet | dépassement 1 m | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-90 | sans_objet | dérogation une corde | **tient** | règle d'exécution sans objet pour la cible ou renvoi | non |
| code-travail-travail-en-hauteur | R. 4323-81 | sans_objet | l'employeur s'assure que échelles/escabeaux/marchepieds sont de matériaux appropriés | **fragile** | motif « sans échéance/diligence continue » — la politique sœur encode des états sans date (R. 4224-14, R. 4225-2) ; l'annonce « travail en hauteur » ne nomme que l'usage comme poste (R. 4323-63) | oui (escabeau du réassort, de la hotte) |
| code-travail-travail-en-hauteur | R. 4323-82 | sans_objet | placement stable, échelons horizontaux | **fragile** | motif « sans échéance/diligence continue » — la politique sœur encode des états sans date (R. 4224-14, R. 4225-2) ; l'annonce « travail en hauteur » ne nomme que l'usage comme poste (R. 4323-63) | oui (escabeau du réassort, de la hotte) |
| code-travail-travail-en-hauteur | R. 4323-83 | sans_objet | échelles fixes | **fragile** | motif « sans échéance/diligence continue » — la politique sœur encode des états sans date (R. 4224-14, R. 4225-2) ; l'annonce « travail en hauteur » ne nomme que l'usage comme poste (R. 4323-63) | marginal |
| code-travail-travail-en-hauteur | R. 4323-84 | sans_objet | échelles portables appuyées/immobilisées | **fragile** | motif « sans échéance/diligence continue » — la politique sœur encode des états sans date (R. 4224-14, R. 4225-2) ; l'annonce « travail en hauteur » ne nomme que l'usage comme poste (R. 4323-63) | oui (escabeau du réassort, de la hotte) |
| code-travail-travail-en-hauteur | R. 4323-88 | sans_objet | prise et appui sûrs ; port de charges exceptionnel et léger | **fragile** | motif « sans échéance/diligence continue » — la politique sœur encode des états sans date (R. 4224-14, R. 4225-2) ; l'annonce « travail en hauteur » ne nomme que l'usage comme poste (R. 4323-63) | oui (escabeau du réassort, de la hotte) |
| code-travail-travail-en-hauteur | R. 4323-61 | obligation_manquante | — | **annoncee** | compté au corpus (cause écrite) | — |
| code-travail-travail-en-hauteur | R. 4323-69 | obligation_manquante | — | **annoncee** | compté au corpus (cause écrite) | — |
| code-travail-travail-en-hauteur | R. 4323-70 | obligation_manquante | — | **annoncee** | compté au corpus (cause écrite) | — |
| code-travail-travail-en-hauteur | R. 4323-72 | obligation_manquante | — | **annoncee** | compté au corpus (cause écrite) | — |
| code-travail-travail-en-hauteur | R. 4323-89 | obligation_manquante | — | **annoncee** | compté au corpus (cause écrite) | — |
| code-travail-travail-en-hauteur | R. 4323-63 | non_couvert | échelle comme poste de travail | **annoncee** | manques-annonces.ts (travail en hauteur) | — |
| arrete-2004-12-21-echafaudages | art. 1 | sans_objet | objet | **tient** | — | non |
| arrete-2004-12-21-echafaudages | art. 2 | sans_objet | I a)-d) documents à fournir, conditions ; II s'assurer, présenter les documents | **fragile** | prescriptions d'employeur (disposer, mettre par écrit, présenter) sous un motif « sans échéance » ; hors cible | non |
| arrete-2004-12-21-echafaudages | art. 3 | sans_objet | définitions | **tient** | — | non |
| arrete-2004-12-21-echafaudages | art. 4 | obligation_manquante | — | **annoncee** | compté au corpus | non |
| arrete-2004-12-21-echafaudages | art. 5 | obligation_manquante | — | **annoncee** | compté au corpus | non |
| arrete-2004-12-21-echafaudages | art. 6 | obligation_manquante | — | **annoncee** | compté au corpus | non |
| arrete-2004-12-21-echafaudages | art. 7 | hors_perimetre | vérif. sur demande de l'inspection | **tient** | — | non |
| csp-eau-potable | R. 1321-23 | sans_objet | — | **tient** | destinataire = distributeur (question puits/forage ouverte, écrite) | — |
| csp-eau-potable | R. 1321-43 | sans_objet | — | **tient** | définition | — |
| csp-eau-potable | R. 1321-53 | sans_objet | — | **tient** | faculté | — |
| csp-eau-potable | R. 1321-55 | sans_objet | — | **tient** | obligation de résultat au passif ; al. 4 (puisage non potable) consigné sur l'art. 8 de l'arrêté 2021 (annoncé) | — |
| csp-eau-potable | R. 1321-55-1 | sans_objet | — | **tient** | seuil 10 m3/j ou 50 personnes | — |
| csp-eau-potable | R. 1321-57 | sans_objet | — | **tient** | destinataire propriétaire ; rythme ailleurs | — |
| csp-eau-potable | R. 1321-59 | sans_objet | — | **tient** | interdiction | — |
| csp-eau-potable | R. 1321-61 | sans_objet | — | **tient** | renvoi ; dette portée sur arrêté 2021 art. 9-10 (annoncés) | — |
| csp-eau-potable | R. 1321-56 | hors_perimetre | — | **tient** | distributeur / construction | — |
| csp-eau-potable | R. 1321-58 | hors_perimetre | — | **tient** | distributeur / construction | — |
| csp-eau-potable | R. 1321-60 | non_couvert | réservoirs et bâches | **annoncee** | manques-annonces.ts (eau) | — |
| arrete-2021-09-10-retours-eau | art. 1 | sans_objet | — | **tient** | définitions / modalités / dispositions finales (lecture de l'API sans écart de fond avec le motif) | — |
| arrete-2021-09-10-retours-eau | art. 2 | sans_objet | — | **tient** | définitions / modalités / dispositions finales (lecture de l'API sans écart de fond avec le motif) | — |
| arrete-2021-09-10-retours-eau | art. 3 | sans_objet | — | **tient** | définitions / modalités / dispositions finales (lecture de l'API sans écart de fond avec le motif) | — |
| arrete-2021-09-10-retours-eau | art. 5 | sans_objet | — | **tient** | définitions / modalités / dispositions finales (lecture de l'API sans écart de fond avec le motif) | — |
| arrete-2021-09-10-retours-eau | art. 6 | sans_objet | — | **tient** | définitions / modalités / dispositions finales (lecture de l'API sans écart de fond avec le motif) | — |
| arrete-2021-09-10-retours-eau | art. 7 | sans_objet | — | **tient** | définitions / modalités / dispositions finales (lecture de l'API sans écart de fond avec le motif) | — |
| arrete-2021-09-10-retours-eau | art. 11 | sans_objet | — | **tient** | définitions / modalités / dispositions finales (lecture de l'API sans écart de fond avec le motif) | — |
| arrete-2021-09-10-retours-eau | art. 13 | sans_objet | — | **tient** | définitions / modalités / dispositions finales (lecture de l'API sans écart de fond avec le motif) | — |
| arrete-2021-09-10-retours-eau | art. 14 | sans_objet | — | **tient** | définitions / modalités / dispositions finales (lecture de l'API sans écart de fond avec le motif) | — |
| arrete-2021-09-10-retours-eau | art. 4 | non_couvert | — | **annoncee** | manques-annonces.ts (eau) | — |
| arrete-2021-09-10-retours-eau | art. 8 | non_couvert | — | **annoncee** | manques-annonces.ts (eau) | — |
| arrete-2021-09-10-retours-eau | art. 9 | non_couvert | — | **annoncee** | manques-annonces.ts (eau) | — |
| arrete-2021-09-10-retours-eau | art. 10 | non_couvert | — | **annoncee** | manques-annonces.ts (eau) | — |
| arrete-2021-09-10-retours-eau | art. 12 | non_couvert | — | **annoncee** | manques-annonces.ts (eau) | — |
| arrete-2010-02-01-legionelles | art. 1 | sans_objet | — | **tient** | champ/définitions/modalités (art. 6 : frais et souches = modalités) | non |
| arrete-2010-02-01-legionelles | art. 2 | sans_objet | — | **tient** | champ/définitions/modalités (art. 6 : frais et souches = modalités) | non |
| arrete-2010-02-01-legionelles | art. 5 | sans_objet | — | **tient** | champ/définitions/modalités (art. 6 : frais et souches = modalités) | non |
| arrete-2010-02-01-legionelles | art. 6 | sans_objet | — | **tient** | champ/définitions/modalités (art. 6 : frais et souches = modalités) | non |
| arrete-2010-02-01-legionelles | art. 7 | sans_objet | — | **tient** | champ/définitions/modalités (art. 6 : frais et souches = modalités) | non |
| arrete-2010-02-01-legionelles | art. 8 | hors_perimetre | — | **tient** | exécution | non |
| arrete-2010-02-01-legionelles | art. 3 | non_couvert | — | **annoncee** | carnet-sanitaire (declareA) | — |
| arrete-2010-02-01-legionelles | art. 4 | non_couvert | — | **annoncee** | carnet-sanitaire (declareA) | — |
| arrete-2010-02-01-legionelles | annexe 1 | non_couvert | — | **annoncee** | carnet-sanitaire (declareA) | — |
| arrete-2010-02-01-legionelles | annexe 2 | non_couvert | — | **annoncee** | carnet-sanitaire (declareA) | — |
| arrete-2010-02-01-legionelles | Arrêté 23-06-1978 art. 36 | non_couvert | — | **annoncee** | carnet-sanitaire (declareA) | — |
| code-travail-chaleur-intense | R. 4463-1 | sans_objet | définition par renvoi | **tient** | — | — |
| code-travail-chaleur-intense | R. 4463-2 | retenu | évaluer ; définir les mesures | **portee** | prevention-etablissement-evaluation-chaleur-intense | — |
| code-travail-chaleur-intense | R. 4463-3 | retenu | 8 fondements (dont 8° information/formation chaleur) | **portee** | -evaluation-chaleur-intense | — |
| code-travail-chaleur-intense | R. 4463-4 | retenu | eau fraîche en épisode | **portee** | -chaleur-eau-fraiche | — |
| code-travail-chaleur-intense | R. 4463-5 | retenu | travailleur vulnérable | **portee** | -chaleur-travailleur-vulnerable | — |
| code-travail-chaleur-intense | R. 4463-6 | retenu | modalités de signalement et de secours | **portee** | secours-etablissement-signalement-chaleur-intense | — |
| code-travail-chaleur-intense | R. 4463-7 | retenu | mise en œuvre lors de l'épisode | **portee** | -chaleur-mise-en-oeuvre | — |
| code-travail-chaleur-intense | R. 4463-8 | non_couvert | plan de prévention et chaleur | **annoncee** | manques-annonces.ts (plan de prévention) | — |
| code-travail-duerp-principes | L. 4121-1 | sans_objet | principe général | **tient** | — | — |
| code-travail-duerp-principes | L. 4121-2 | sans_objet | principes de prévention | **tient** | appliqué par TypeAction | — |
| code-travail-duerp-principes | L. 4121-3 | non_couvert | impact différencié selon le sexe | **annoncee** | manques-annonces.ts (document unique) | — |
| code-travail-duerp-principes | L. 4121-3 | non_couvert | al. 2 1° « Le comité social et économique est consulté sur le document unique d'évaluation des risques professionnels et sur ses mises à jour » | **SANS_ETAT** | ni motif, ni annonce ; politique sœur : code-travail-epi.ts:243 (consultation du CSE hors périmètre) — non écrite ici | oui (11 à 50 salariés) |
| code-travail-duerp-principes | L. 4121-3-1 | non_couvert | III 1° programme annuel ; VI transmission SPST (tracée) ; V B portail | **annoncee** | couverture.ts axe effectif ; DuerpVersion.transmiseSpstLe ; documents-obligatoires.ts | — |
| code-travail-duerp-principes | L. 4121-4 | sans_objet | capacités du travailleur | **tient** | — | — |
| code-travail-duerp-principes | L. 4121-5 | sans_objet | coopération | **tient** | — | — |
| code-travail-duerp | R. 4121-1 | sans_objet | transcription = module | **tient** | module DUERP | — |
| code-travail-duerp | R. 4121-1-1 | non_couvert | annexe expositions | **annoncee** | manques-annonces.ts + PDF | — |
| code-travail-duerp | R. 4121-2 | retenu | 2°, 3° mise à jour sur fait | **portee** | prevention-etablissement-mise-a-jour-duerp-sur-fait | — |
| code-travail-duerp | R. 4121-2 | retenu | 1° annuelle ≥ 11 ; dernier al. programme/liste | **portee** | module DUERP (evaluerEtatDuerp) ; programme annoncé (axe effectif) | — |
| code-travail-duerp | R. 4121-3 | sans_objet | DUERP utilisé pour le rapport annuel CSE | **tient** | question L. 2312-27 écrite ouverte ; ≥ 50 | non |
| code-travail-duerp | R. 4121-4 | retenu | (voir information-travailleurs) | **portee** | information-etablissement-avis-acces-duerp | — |
| code-travail-plan-prevention | R. 4512-1 | non_couvert | nouveaux sous-traitants | **annoncee** | manques-annonces.ts | — |
| code-travail-plan-prevention | R. 4512-2 | sans_objet | inspection commune | **tient** | module (inspectionDate) | — |
| code-travail-plan-prevention | R. 4512-3 | sans_objet | délimiter, matérialiser, indiquer les voies, définir les accès | **NE_TIENT_PLUS** | même corpus : la contre-lecture M2 a jugé `sans_objet` faux pour R. 4512-12 parce que l'article « crée une démarche que Rojer n'accomplit pas » ; ici quatre gestes que le module ne trace pas, cités nulle part (grep src : 0) | oui (plombier, électricien, nettoyage) |
| code-travail-plan-prevention | R. 4512-4 | sans_objet | communiquer ses consignes de sécurité à l'EE | **NE_TIENT_PLUS** | même argument M2 ; aucune surface ne cite R. 4512-4 (grep src : 0) | oui |
| code-travail-plan-prevention | R. 4512-5 | sans_objet | se communiquer les informations | **tient** | module (naturesTravaux) — trace partielle | — |
| code-travail-plan-prevention | R. 4512-6 | sans_objet | plan de prévention | **tient** | module | — |
| code-travail-plan-prevention | R. 4512-7 | sans_objet | écrit à 400 h (y compris sous-traitants, en cours d'exécution) ou travaux dangereux | **tient** | module + aide du formulaire (FormulairePlanPrevention.tsx:424 annonce les deux branches) | — |
| code-travail-plan-prevention | R. 4512-8 | sans_objet | 5 rubriques | **tient** | module | — |
| code-travail-plan-prevention | R. 4512-9 | non_couvert | — | **annoncee** | manques-annonces.ts / fiche du plan | — |
| code-travail-plan-prevention | R. 4512-11 | non_couvert | — | **annoncee** | manques-annonces.ts / fiche du plan | — |
| code-travail-plan-prevention | R. 4512-12 | non_couvert | — | **annoncee** | manques-annonces.ts / fiche du plan | — |
| code-travail-plan-prevention | R. 4512-10 | sans_objet | répartition des charges d'entretien (locaux R. 4513-8) | **tient** | condition hors cible ordinaire | — |
| code-travail-plan-prevention | R. 4512-13 | sans_objet | EE / agricole / temps | **tient** | destinataire EE | — |
| code-travail-plan-prevention | R. 4512-14 | sans_objet | EE / agricole / temps | **tient** | destinataire EE | — |
| code-travail-plan-prevention | R. 4512-15 | sans_objet | EE / agricole / temps | **tient** | destinataire EE | — |
| code-travail-plan-prevention | R. 4512-16 | sans_objet | EE / agricole / temps | **tient** | destinataire EE | — |
| code-travail-travail-dissimule | L. 8221-1 | sans_objet | interdiction / exception / définitions | **tient** | — | — |
| code-travail-travail-dissimule | L. 8221-2 | sans_objet | interdiction / exception / définitions | **tient** | — | — |
| code-travail-travail-dissimule | L. 8221-3 | sans_objet | interdiction / exception / définitions | **tient** | — | — |
| code-travail-travail-dissimule | L. 8221-5 | sans_objet | interdiction / exception / définitions | **tient** | — | — |
| code-travail-vigilance | L. 8222-1 | non_couvert | — | **annoncee** | manques-annonces.ts (vigilance) | — |
| code-travail-vigilance | L. 8222-5 | non_couvert | — | **annoncee** | manques-annonces.ts (vigilance) | — |
| code-travail-vigilance | L. 8222-2 | sans_objet | conséquence / calcul / désignation / habilitation | **tient** | — | — |
| code-travail-vigilance | L. 8222-3 | sans_objet | conséquence / calcul / désignation / habilitation | **tient** | — | — |
| code-travail-vigilance | L. 8222-4 | sans_objet | conséquence / calcul / désignation / habilitation | **tient** | — | — |
| code-travail-vigilance | L. 8222-7 | sans_objet | conséquence / calcul / désignation / habilitation | **tient** | — | — |
| code-travail-vigilance | L. 8222-6 | hors_perimetre | personnes publiques | **tient** | — | — |
| code-travail-vigilance-modalites | R. 8222-1 | sans_objet | seuil / forme | **tient** | consignés sur L. 8222-1, L. 8222-5, D. 8222-7 | — |
| code-travail-vigilance-modalites | R. 8222-2 | sans_objet | seuil / forme | **tient** | consignés sur L. 8222-1, L. 8222-5, D. 8222-7 | — |
| code-travail-vigilance-modalites | D. 8222-8 | sans_objet | seuil / forme | **tient** | consignés sur L. 8222-1, L. 8222-5, D. 8222-7 | — |
| code-travail-vigilance-modalites | R. 8222-3 | hors_perimetre | personne publique / particulier | **tient** | — | — |
| code-travail-vigilance-modalites | D. 8222-4 | hors_perimetre | personne publique / particulier | **tient** | — | — |
| code-travail-vigilance-modalites | D. 8222-6 | hors_perimetre | personne publique / particulier | **tient** | — | — |
| code-travail-vigilance-modalites | D. 8222-5 | non_couvert | — | **annoncee** | manques-annonces.ts (vigilance) | — |
| code-travail-vigilance-modalites | D. 8222-7 | non_couvert | — | **annoncee** | manques-annonces.ts (vigilance) | — |

### Comptes (calculés sur les lignes ci-dessus)

- NE_TIENT_PLUS : 3
- SANS_ETAT : 4
- annoncee : 42
- ecartee : 2
- fragile : 6
- portee : 66
- tient : 116
- articles distincts : 229

### Manques et motifs à reprendre

Clairs : (1) L. 4141-1 al. 2 → description de `formation-securite-etablissement-information` + `prescrit` du corpus (la description n'entre pas dans `empreinteReferentiel`, index.ts:381-403) ; (2) R. 4228-19 → entrée de corpus `retenu` + référence de contexte sur `locaux-etablissement-emplacement-restauration`, avec la phrase dans la description ; (3) R. 4451-57 → `obligation_manquante`, `toucheLaCible: false`. Test : `zz-g3-branches.test.ts` (échoue 2/2 sur 71294cb, log `zz-g3-test.log`).

À décider : L. 4121-3 al. 2 1° (consultation du CSE sur le DUERP) ; R. 4512-3 et R. 4512-4 (reclassement en `non_couvert` selon le précédent M2 de R. 4512-12) ; R. 4323-81/82/84/88 (règles d'usage des escabeaux, que l'annonce « travail en hauteur » ne nomme pas) ; D. 4622-2 al. 2 (hors cible : service autonome ≥ 500 salariés, D. 4622-5 lu à l'API) → ajouter une réserve.

## 4. Guide Qualiconsult — lignes qui touchent la cible
Référentiel mesuré en l'appelant : `REF 2026-09-27.1 172` (zz-q-read2.tmp.ts). Corpus : 64 corpus, 534 entrées (zz-q-corpus.tmp.ts → corpus-dump.txt).
Texte du guide : `pdftotext -layout` → guide.txt (lignes citées = guide.txt:N).
Cible = restauration / commerce / bureau, ERP 5ᵉ cat., ≤ 50 salariés.
États : OBL (obligation id) · ANN (annoncé, `declareA`) · ÉCARTÉ (motif écrit, où) · HC (hors cadre, couverture-declaree § 7) · SANS ÉTAT.

### Lignes qui touchent la cible

| # | Ligne du guide (p.) | Guide | État Rojer | Où |
|---|---|---|---|---|
| 1 | CTQ ascenseurs (6) | 5 ans, CCH R.134-11 | OBL `ascenseur-controle-technique-quinquennal` | corpus cch-ascenseurs R. 134-11 retenu |
| 2 | **ERT : ascenseurs, monte-charges, élévateurs ≤ 0,15 m/s installés à demeure (6)** | **1 an, R.4323-23, A. 29/12/10** | **SANS ÉTAT.** Arrêté du 29-12-2010 absent du dépôt (aucun LEGITEXT/JORF id ; nommé seulement comme modificateur de l'arrêté 2004). Lu à l'API : art. 1 et 6 « a lieu tous les douze mois. Les ascenseurs sont dispensés de cette vérification l'année au cours de laquelle s'effectue le contrôle technique ». Les obligations `ascenseur-*` sont CCH (entretien), pas la VGP employeur. | arrete-2010-12-29-api.txt ; levage.ts:22-26 (monte-charges retirés du levage) |
| 3 | ERP 2ᵉ groupe : désenfumage, chauffage, gaz, cuisines, MS, SSI (9) | VP 1 an, PE 4 § 2 | OBL `incendie-erp-pe4-entretien-installations-techniques` (triennale ; PE 4 v. 2026-07-01 « Tous les trois ans au plus ») — divergence tranchée pour le texte | corpus livre-3 PE 4 |
| 4 | Électricité ERP 5ᵉ si CdT applicable (16) | 1 an, PE 4 | OBL `elec-travail-periodique-annuelle` | R. 4226-16 retenu |
| 5 | Vérif. sur demande de l'autorité / après travaux (16) | GE 8 § 3, PE 4 § 3 | SANS ÉTAT (aucune entrée « sur demande ») ; politique sœur : Arrêté 21-12-2004 art. 7 `hors_perimetre / sans_destinataire_exploitant` | corpus-dump |
| 6 | CdT installations permanentes (16) | 1 an, R.4226-16 | OBL `elec-travail-periodique-annuelle` | |
| 7 | Mise en service / modification (16) | initiale, R.4226-14 | OBL `elec-travail-mise-en-service` | |
| 8 | Sur demande de l'inspection du travail (16) | R.4722-26 | SANS ÉTAT (même politique sœur que #5) | grep R. 4722-26 : 0 |
| 9 | Habilitation électrique (17) | initiale + 3 ans | OBL `elec-salarie-habilitation`, `elec-travail-habilitation-personnel` (périodicité `autre`) ; « 3 ans » ÉCARTÉ | réserve R. 4544-10 « LE TRIENNAL NE VIENT PAS D'ICI » |
| 10 | Presses, massicots, compacteurs, bennes, machines à cylindres (19) | 3 mois, A. 05/03/93 | OBL `compactage-dechets-vgp-trimestrielle` (presses à balles, compacteurs) ; reste ÉCARTÉ (cylindres « pour l'industrie du caoutchouc », benne = véhicule du collecteur, massicot à main) | réserve Arrêté 1993-03-05 art. 1 |
| 11 | Formation mise en œuvre machines (19) | R.4323-3, -4, -17 | Partiel : R. 4323-1 retenu (`esp-personnel-formation`), réserve « article plus large que l'obligation » ; R. 4323-3/-4 SANS ENTRÉE propre | corpus equipements-information |
| 12 | Échelles, escabeaux (19) | à fixer (1 an recommandé) | ÉCARTÉ : R. 4323-81 sans_objet (« diligence continue, pas un contrôle daté ») | corpus travail-en-hauteur |
| 13 | EPI : APR, antichute, gilets (20) | 1 an, A. 19/03/93 | OBL `epi-verification-generale-periodique` | |
| 14 | Formation utilisation EPI (20) | R.4323-104 à 106 | R.4323-104 sans_objet ; R.4323-105 OBL `epi-etablissement-consigne-utilisation` ; R.4323-106 ANN | |
| 15 | Gestes et postures (20, 33) | R.4541-8 | OBL `formation-securite-etablissement-manutention` | |
| 16 | Levage mise / remise en service (20) | R.4323-22, -28 | OBL `levage-examen-adequation-mise-en-service`, `levage-epreuve-initiale-fonctionnement`, `levage-remise-en-service-apres-reparation` | |
| 17 | Appareils de levage 1 an / 6 mois / 3 mois (21-22) | A. 01/03/04 | OBL `levage-vgp-annuelle-charges`, `-semestrielle-chariot-gerbeur`, `-semestrielle-personnes`, `-trimestrielle-force-humaine`, `-accessoires-annuelle` | |
| 18 | Portes et portails automatiques (22) | 6 mois, A. 21/12/93 | OBL `porte-auto-verification-semestrielle` (+ initiale, dossier, maintien) | |
| 19 | Formation / autorisation de conduite (22) | R.4323-55 à 57 | OBL `conduite-salarie-formation`, `conduite-salarie-autorisation`, `conduite-salarie-attestation-medicale` | |
| 20 | CACES (22) | recyclage 5/10 ans | ÉCARTÉ (recommandation CNAM, pas le Code) | formation-securite.ts:302 |
| 21 | ESP gaz/vapeur : inspection, requalification (24-25) | 4 ans / 10 ans ; générateurs vapeur 2 ans | OBL `esp-inspection-periodique` (quadriennale), `esp-inspection-periodique-generateur-vapeur` (biennale), `esp-requalification-decennale`, `esp-declaration-mise-en-service` | |
| 22 | **Extincteurs PS > 30 bar (CO₂) — requalification au 1ᵉʳ rechargement après 6 ans, ≤ 10 ans (24)** | A. 20/11/17 | **ÉCARTÉ en note interne seulement** : « Le manque est donc un silence, jamais une sur-application » — aucune annonce à l'exploitant | equipement-sous-pression.ts:195 (notes `esp-requalification-decennale`) |
| 23 | Aération locaux non spécifiques (31) | 1 an, A. 08/10/87 | OBL `aeration-controle-installations-r4222-20` | |
| 24 | Aération pollution spécifique sans recyclage (31) | 1 an | OBL `aeration-travail-locaux-pollution-specifique` | |
| 25 | Aération avec recyclage (31) | 6 mois | OBL `aeration-travail-recyclage-semestriel` (semestrielle) | |
| 26 | Mesurage bruit (31) | ≥ tous les 5 ans | ANN `R. 4433-2` (famille « Bruit ») ; R. 4434-9 HC | manques-annonces.ts:119 ; couverture-declaree § 7 |
| 27 | Vibrations (31) | R.4444-1 à -7 | Non dépouillé, déclaré comme tel (« NE SONT PAS OUVERTS ») | code-travail-bruit-vibrations.ts:65 |
| 28 | Niveaux d'éclairement (31) | à définir par l'employeur | OBL `eclairage-etablissement-regles-entretien` (R. 4223-11) ; R. 4223-4 HC | |
| 29 | Formation bruit ≥ 80 dB (31) | R.4436-1 | Non dépouillé, déclaré comme tel | code-travail-bruit-vibrations.ts:65 |
| 30 | Formation vibrations (31) | R.4447-1 | Non dépouillé, déclaré comme tel | idem |
| 31 | RPS (32) | 1 an, ANI 02/07/08 | Porté comme risque du DUERP (referentiels/commun.ts) ; le « 1 an » n'est écarté nulle part — SANS ÉTAT sur le rythme | grep psychosoc |
| 32 | Mise à jour du DUERP (32) | 1 an, R.4121-1 à -4 | OBL `prevention-etablissement-mise-a-jour-duerp-sur-fait` (2°, 3°) + 1° annuel ≥ 11 salariés dans `evaluerEtatDuerp` | notes de l'obligation |
| 33 | Signalisation de sécurité (32) | MES + 6 mois, A. 04/11/93 | OBL `signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle` + 6 autres | art. 15 retenu |
| 34 | Alimentations de secours des signalisations (32) | MES + 1 an | OBL `signalisation-etablissement-alimentations-secours-annuelle`, `-alimentation-secours-presence` | art. 7, 15 retenus |
| 35 | CEM (32) | R.4453-6 | SANS ÉTAT dans le code (refus écrit seulement dans comparaison-guide-qualiconsult.md:147-150 ; absent de `EXCLUSIONS`, corpus/perimetre.ts:44-66) | |
| 36 | Formation prévention des risques (33) | L./R. 4141-1 et s. | OBL `formation-securite-etablissement-organisation`, `-information`, `-salarie-accueil` ; L. 4141-5 ANN | |
| 37 | Formation risque chimique (33, 35) | R.4412-38 | OBL `stockage-dangereux-formation-personnel`, `-fiches-donnees` | |
| 38 | Travaux d'entreprises extérieures (33) | R.4512-15, -16 | ÉCARTÉ : sans_objet (adressés à l'entreprise extérieure / règle de temps) ; plan de prévention = module | corpus plan-prevention |
| 39 | SST (33) | initiale + recyclage 2 ans | OBL `secours-salarie-secouriste` (`autre`) ; « 2 ans » ÉCARTÉ (MAC INRS/CNAM) | notes : « PAS DE RECYCLAGE BIENNAL » |
| 40 | Formation CSE (33) | initiale + renouvellement 4 ans | OBL `formation-securite-salarie-cse-sst` (quadriennale) ; le guide cite L. 4614-14, abrogé | |
| 41 | Écran de visualisation (33) | R.4542-16 | OBL `formation-securite-etablissement-travail-sur-ecran` | |
| 42 | Disconnecteurs (33) | 1 an, CdSP R.1321-57 | R. 1321-57 ÉCARTÉ (sans_objet, « ne porte NI périodicité NI le mot disconnecteur ») ; le contrôle réel ANN (arrêté 10-09-2021 art. 4, 8, 9, 10, 12 ; R. 1321-60) | corpus csp-eau-potable, arrete-2021-09-10 |
| 43 | Légionelles (33) | 1 an, A. 01/02/10 | ANN sur la page carnet sanitaire (art. 3, 4, annexes 1-2 `non_couvert`) | corpus arrete-2010-02-01 |
| 44 | Eaux sanitaires (33) | « 1 an conseillé » | Aucune obligation dans la ligne même (« conseillé ») — SANS ÉTAT, à classer | |
| 45 | Évaluation risque chimique (34) | R.4412-5 à -10 | SANS ENTRÉE ; politique sœur : R. 4423-1 sans_objet (« déclinaison de l'évaluation que le DUERP porte ») | |
| 46 | Mesure VLEP (34) | 1 an, R.4412-27 à -31 | SANS ÉTAT dans le code (refus écrit seulement dans comparaison-guide-qualiconsult.md:153-155) | grep : 0 |
| 47 | Amiante : flocages liste A, liste B, DTA (34-35) | 3 ans / propriétaire / R.1334-29-5 | SANS ÉTAT dans le code (une mention : le DTA non porté au plan de prévention, manques-annonces.ts:108) ; « refus » écrit seulement dans le doc de comparaison | |
| 48 | Radon, lieux de travail (35) | R.4451-14, sans périodicité | SANS ÉTAT (ERP radon : D.1333-32 vise enseignement, soins… hors cible) | grep : 0 |
| 49 | Risque biologique, formation (35) | R.4425-6, -7 | Non dépouillé, déclaré (« NE SONT PAS LUS ») | code-travail-agents-biologiques.ts:10 |
| 50 | Étanchéité frigorifique (36) | R.543-75 et s. | OBL `froid-controle-etancheite-*` (8) | |
| 51 | Systèmes thermodynamiques / ventilation > 70 kW (29) | 5 ans, CdE R.224-42 à -45-9 | SANS ÉTAT, et absent du doc de comparaison (qui ne traite que les chaufferies de 400 kW à 20 MW, l. 242-249) | grep R. 224-4 : 0 |
| 52 | Aires de jeux (41) — restauration rapide avec aire | D. 96-1136 | SANS ÉTAT dans le code (`risque_specialise` ne nomme que les « équipements sportifs ») | corpus/perimetre.ts:53 |

### Lignes hors cible (classées, pas des manques)

AS 9 / AS 10 / gares (livre II, 1ᵉʳ groupe ; AS 10 `obligation_manquante` CIBLE=false) · IGH (GH 5 : `elec-igh-annuelle`, `incendie-igh-*`) · formation manœuvre de secours ascenseurs (D. 2008-1325, cité comme abrogeant le décret 95-826 : cch-ascenseurs.ts:114) · ERP 1ᵉʳ groupe DF 10 / CH 58 / GZ / GC 22 / MS 73 / EL 19 foudre (servis en 5ᵉ avec la mention « livre II », C39) · types L, U, J, PU, PO (PO 1 retenu, PO 1 § 3 CIBLE=false), GA, OA, PA, CTS, SG, pénitentiaire, REF, EF, PS (PS 32 retenu), GHU · ENR CRE · chantiers · centrifugeuses et terrassement (HC § 7) · échafaudages et monteurs (HC § 7) · plates-formes suspendues · ACAFR · frigorifiques sous pression (refus écrit dans le doc seulement) · chaufferies 400 kW-20 MW · combustion 1-20 MW · ATEX (`risque_specialise`) · amiante SS4 · TMD · rayonnements ionisants (`risque_specialise`) · légionellose TAR · ICPE (`risque_specialise` ; `stockage-dangereux-declaration-icpe`) · cages et équipements sportifs (`risque_specialise`).

### États périmés dans docs/revues/comparaison-guide-qualiconsult.md

| Ligne du doc | Ce qu'il dit | Ce que le code dit (2026-09-27.1) |
|---|---|---|
| 3 | « 116 obligations, version `2026-08-31.4` » | `REF 2026-09-27.1 172` |
| 25-27 | ICPE, aires de jeux, rayonnements, environnement « non lu » | lus ici : aucune ligne cible neuve, sauf aires de jeux (#52) |
| 97-110 | machines = « le trou le plus net » ; « une boulangerie a une machine à cylindres » | `compactage-dechets-vgp-trimestrielle` encodé le 2026-09-02 ; machines à cylindres « pour l'industrie du caoutchouc » (réserve de l'art. 1) ; art. 2 HC § 7 |
| 112-115 | disconnecteurs : « aucune trace » | R. 1321-57 sans_objet + contrôle annoncé (arrêté 10-09-2021) |
| 117-121 | signalisation : « aucune trace » | 9 obligations `signalisation-*`, dont la semestrielle et l'annuelle |
| 123-141 | recyclage : « manque de modèle », « seul cas moins-disant » | `aeration-travail-recyclage-semestriel` semestrielle |
| 152-155 | bruit, VLEP, éclairement « hors périmètre ou ne sert pas » | bruit ANN (R. 4433-2), éclairement OBL (R. 4223-11) ; seule la VLEP reste sans état |
| 157-158 | légionelles « pas un manque », hors référentiel | `non_couvert` au corpus, annoncé sur la page carnet sanitaire |
| 170-171 | « deux pistes réellement neuves » | les deux instruites (#33-34, #42) |
| 201-230 | ESP : « nous portons `triennale` », justification périmée | `esp-inspection-periodique` quadriennale + `-generateur-vapeur` biennale |
| 13-23 | « Toutes les sections du périmètre sont donc confrontées » | omissions : #2 (VGP ascenseurs / monte-charges ERT), #22 (extincteurs CO₂), #51 (> 70 kW), et toutes les lignes FORMATION (p. 17-35) |

