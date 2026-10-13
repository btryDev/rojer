# Vérification du corpus contre l'API Légifrance — 2026-10-13

*Produit par `pnpm legifrance:verifier` (`scripts/verifier-corpus-legifrance.ts`). Environnement PISTE : **sandbox**. Sélection : --ref « PO 1 », --ref « PO 7 », --ref « PO 8 », --ref « PO 12 », --ref « PE 4 », --ref « PE 27 ». 6 article(s), 7 appel(s) à l'API, 0 reprise(s). Corpus à `aabd589b`. Mode d'emploi : `docs/outils/legifrance-api.md`.*

Ce rapport CONSTATE. Il ne corrige rien : chaque écart se contre-vérifie sur Légifrance avant de toucher au corpus.

## Compteurs

| Catégorie | Articles (catégorie la plus grave) | Articles touchés (cumul) |
|---|---:|---:|
| abrogé / transféré | 0 | 0 |
| introuvable | 0 | 0 |
| écart de citation | 0 | 0 |
| version différente | 0 | 0 |
| modificateur différent | 0 | 0 |
| non vérifiable | 0 | 0 |
| OK | 6 | 0 |

Comparaisons effectuées : citation 6, version 6, modificateur 2. Un article sans `citationCle`, sans `versionEnVigueur` ou sans `modifiePar` n'est pas comparé sur ce point — il n'est pas pour autant « OK » sur ce point.

## Écarts (0), du plus important au moins important

Ordre : gravité (abrogé, introuvable, citation, version, modificateur), puis articles `retenu` d'abord, puis nombre de constats, puis distance de la citation.

Diff : `[-mot-]` est dans le corpus seulement, `{+mot+}` dans le texte officiel seulement.

## Tous les articles

| Corpus | Article | Résultat | Citation | Version | Modificateur | Légifrance |
|---|---|---|---|---|---|---|
| arrete-1980-livre-3 | PE 4 | OK | ✓ | ✓ | ✓ | LEGIARTI000053027822 VIGUEUR 2026-07-01 |
| arrete-1980-livre-3 | PE 27 | OK | ✓ | ✓ | ✓ | LEGIARTI000053888118 VIGUEUR 2026-05-01 |
| arrete-1980-livre-3 | PO 1 | OK | ✓ | ✓ | — | LEGIARTI000024770707 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 7 | OK | ✓ | ✓ | — | LEGIARTI000024770976 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 8 | OK | ✓ | ✓ | — | LEGIARTI000024771000 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 12 | OK | ✓ | ✓ | — | LEGIARTI000024771138 VIGUEUR 2011-10-30 |
