# ADR-046 — « Ce que Rojer ne couvre pas » se dit par familles ; le détail va au PDF

- **Statut** : acceptée, 2026-10-17 — demande de la propriétaire (« liste de
  courses énorme »), plan relu par c6 (`propositions/plan-page-ne-couvre-pas-2026-10-17.md`),
  Q1 tranchée par la propriétaire le même jour.
- **Amende** : ADR-025 § 8 (les statuts que la page distingue, et ce qu'elle
  en montre) ; ADR-042 § 3 (le geste de la rubrique hors du quotidien, et la
  référence qui n'y est plus).
- **Portée** : `app/etablissements/[id]/perimetre/page.tsx`,
  `components/perimetre/RubriqueHorsQuotidien.tsx`,
  `perimetre/manques-annonces.ts` (champ `sujet`, `phrasePage`),
  `perimetre/niveau-audit.ts` (`gesteHorsQuotidien`),
  `perimetre/familles-non-gerees.ts`, `perimetre/detail-hors-page.ts`,
  `pdf/AnnexeCeQueRojerNeSuitPas.tsx`, une ligne de
  `scripts/generer-grille-equipements.tsx`, `corpus/adresses.ts`.

## Contexte

Mesuré en appelant le code de la page sur main a493461c : un restaurant N5 de
huit salariés y lisait 498 éléments, dont 458 pour la section « Hors périmètre
déclaré » (453 articles écartés). Les annonces disaient 21 articles un par un,
avec référence et corpus. Le geste unique « À tenir vous-même » était faux
pour la fiche d'entreprise, que le service de santé au travail établit.

## Décision

1. **Quatre blocs.** A, le bandeau de couverture, inchangé. B, « Ce qui peut
   vous concerner, et que Rojer ne suit pas » : une phrase par domaine, faite
   des `sujet` des articles qui concernent le dossier — champ obligatoire,
   écrit par `nonPorte`. C, « Obligations légales que Rojer ne suit pas au
   quotidien » : nommées une par une, avec le geste de `gesteHorsQuotidien`.
   D, « Ce que Rojer ne gère pas » : cinq familles, une phrase chacune.
2. **Aucune référence d'article à l'écran**, ni corpus ; le mot « audit » n'y
   paraît pas (décision du 2026-10-18 de la rubrique, maintenue).
3. **Le geste dépend des réalisateurs** : l'exploitant parmi eux → « À tenir
   vous-même » ; sinon le service de santé au travail → « À obtenir de votre
   service de santé au travail » ; sinon, pour un ascenseur, « À obtenir de
   votre ascensoriste » ; sinon « À faire réaliser par une personne
   qualifiée » (c6, Q4).
4. **Ce qui sort de la page** : les refus à l'entrée (c6, Q5) et les articles
   sans destinataire exploitant (c6, Q3). Ils ne sont plus que dans le
   document.
5. **Tout ce qui sort de la page va dans le PDF du référentiel complet** :
   `detailHorsPage()` rassemble, `AnnexeCeQueRojerNeSuitPas` imprime, inséré
   en une ligne à la fin de la grille. Le dirigeant n'a PAS accès à ce PDF
   (Q1, propriétaire) : la page n'y renvoie jamais, et chaque phrase de
   famille se suffit à elle-même.
6. **Les familles valent clause générale** du § 7 de
   `couverture-declaree-du-produit.md` (c6, Q2). Elles passent par
   `nonPorte`, ne promettent rien sur la dotation de `R. 4227-29` (encodée),
   disent « mise en accessibilité du bâtiment », jamais « accessibilité »
   seul, et ne qualifient pas.
7. **`ADRESSE_MANQUES_ANNONCES` reste une adresse de PAGE** ; son texte nomme
   le nouveau titre de la section. Le cliquet `MUETS` ne bouge pas.

## Garde-fous

- Parité page ↔ PDF (`parite-page-pdf.test.ts`) : l'inventaire figé
  (`inventaire-page-a493461c.ts`, 513 clés, produit en appelant le code de
  main) ; chaque clé est dite par la page ou par l'annexe, sauf la table
  `SORTIS` — vide au 2026-10-17, raturée et datée quand elle change.
- L'annexe porte le détail (références, phrases, « Audit ») — lu dans
  l'arbre rendu ; le script fait l'insertion, une fois, avant `</Document>`.
- Chaque sujet est dans la phrase de son domaine, et s'écrit par `nonPorte`.
- Chaque garde a été éprouvée en injectant la régression qu'elle interdit.

## Conséquences

- La page passe à environ vingt-cinq éléments (mesures dans le rapport du lot).
- `CLAUDE.md` décrit encore une « rubrique « Niveau audit » » sur la page
  (§ « Le niveau audit ») : à rayer par qui tient ce fichier.
- Un article qui quitte le statut `hors_perimetre` fera tomber la parité :
  il s'inscrit alors dans `SORTIS`, daté, avec sa raison.
