# Vérification du corpus contre l'API Légifrance — 2026-09-27

*Produit par `pnpm legifrance:verifier` (`scripts/verifier-corpus-legifrance.ts`). Environnement PISTE : **sandbox**. Sélection : tout le corpus. 531 article(s), 563 appel(s) à l'API, 7 reprise(s). Corpus à `0cd8b5e`. Mode d'emploi : `docs/outils/legifrance-api.md`.*

Ce rapport CONSTATE. Il ne corrige rien : chaque écart se contre-vérifie sur Légifrance avant de toucher au corpus.

## Compteurs

| Catégorie | Articles (catégorie la plus grave) | Articles touchés (cumul) |
|---|---:|---:|
| abrogé / transféré | 0 | 0 |
| introuvable | 0 | 0 |
| écart de citation | 0 | 0 |
| version différente | 0 | 0 |
| modificateur différent | 0 | 0 |
| non vérifiable | 20 | 20 |
| OK | 511 | 0 |

Comparaisons effectuées : citation 446, version 511, modificateur 271. Un article sans `citationCle`, sans `versionEnVigueur` ou sans `modifiePar` n'est pas comparé sur ce point — il n'est pas pour autant « OK » sur ce point.

## Écarts (0), du plus important au moins important

Ordre : gravité (abrogé, introuvable, citation, version, modificateur), puis articles `retenu` d'abord, puis nombre de constats, puis distance de la citation.

Diff : `[-mot-]` est dans le corpus seulement, `{+mot+}` dans le texte officiel seulement.

## Versions futures programmées (3)

Version en vigueur `ABROGE_DIFF` suivie d'une version `VIGUEUR_DIFF` : une modification programmée, pas une abrogation. « 2222-02-22 » = date non encore fixée (convention Légifrance).

- R. 4227-37 (`code-travail-incendie`, retenu) : `LEGIARTI000052645197` à compter du 2027-01-01.
- C. env. L. 512-7 (`icpe-stockage`, retenu) : `LEGIARTI000052083992` à compter du — date non fixée (2222-02-22).
- L. 8222-2 (`code-travail-vigilance`, sans_objet) : `LEGIARTI000054335516` à compter du 2026-12-26.

## Tous les articles

| Corpus | Article | Résultat | Citation | Version | Modificateur | Légifrance |
|---|---|---|---|---|---|---|
| arrete-1980-livre-3 | PE 1 | OK | ✓ | ✓ | ✓ | LEGIARTI000020374786 VIGUEUR 1990-08-27 |
| arrete-1980-livre-3 | PE 2 | OK | ✓ | ✓ | ✓ | LEGIARTI000053027820 VIGUEUR 2026-01-01 |
| arrete-1980-livre-3 | PE 3 | OK | — | ✓ | — | LEGIARTI000024751105 VIGUEUR 1990-08-27 |
| arrete-1980-livre-3 | PE 4 | OK | ✓ | ✓ | ✓ | LEGIARTI000053027822 VIGUEUR 2026-07-01 |
| arrete-1980-livre-3 | PE 5 | OK | — | ✓ | — | LEGIARTI000024760310 VIGUEUR 1997-04-10 |
| arrete-1980-livre-3 | PE 6 | OK | — | ✓ | — | LEGIARTI000024760320 VIGUEUR 2006-07-08 |
| arrete-1980-livre-3 | PE 7 | OK | — | ✓ | — | LEGIARTI000053027825 VIGUEUR 2026-01-01 |
| arrete-1980-livre-3 | PE 8 | OK | — | ✓ | — | LEGIARTI000024751135 VIGUEUR 1990-08-27 |
| arrete-1980-livre-3 | PE 9 | OK | — | ✓ | — | LEGIARTI000053027829 VIGUEUR 2026-01-01 |
| arrete-1980-livre-3 | PE 10 | OK | — | ✓ | — | LEGIARTI000053027846 VIGUEUR 2026-07-01 |
| arrete-1980-livre-3 | PE 11 | OK | — | ✓ | — | LEGIARTI000024751142 VIGUEUR 2004-07-01 |
| arrete-1980-livre-3 | PE 12 | OK | — | ✓ | — | LEGIARTI000024751144 VIGUEUR 1990-08-27 |
| arrete-1980-livre-3 | PE 13 | OK | — | ✓ | — | LEGIARTI000024766642 VIGUEUR 2010-06-16 |
| arrete-1980-livre-3 | PE 14 | OK | — | ✓ | — | LEGIARTI000024766659 VIGUEUR 2004-07-01 |
| arrete-1980-livre-3 | PE 15 | OK | ✓ | ✓ | ✓ | LEGIARTI000024766677 VIGUEUR 2006-03-01 |
| arrete-1980-livre-3 | PE 16 | OK | — | ✓ | — | LEGIARTI000024766693 VIGUEUR 2008-08-30 |
| arrete-1980-livre-3 | PE 17 | OK | — | ✓ | — | LEGIARTI000024766700 VIGUEUR 2006-03-01 |
| arrete-1980-livre-3 | PE 18 | OK | — | ✓ | — | LEGIARTI000024766742 VIGUEUR 2008-08-30 |
| arrete-1980-livre-3 | PE 19 | OK | — | ✓ | — | LEGIARTI000024766745 VIGUEUR 2006-03-01 |
| arrete-1980-livre-3 | PE 20 | OK | ✓ | ✓ | ✓ | LEGIARTI000024766756 VIGUEUR 2004-05-22 |
| arrete-1980-livre-3 | PE 21 | OK | — | ✓ | — | LEGIARTI000053027836 VIGUEUR 2026-01-01 |
| arrete-1980-livre-3 | PE 22 | OK | — | ✓ | — | LEGIARTI000052016900 VIGUEUR 2025-08-01 |
| arrete-1980-livre-3 | PE 23 | OK | — | ✓ | — | LEGIARTI000052016903 VIGUEUR 2025-08-01 |
| arrete-1980-livre-3 | PE 24 | OK | — | ✓ | — | LEGIARTI000049576751 VIGUEUR 2024-05-24 |
| arrete-1980-livre-3 | PE 25 | OK | — | ✓ | — | LEGIARTI000047994136 VIGUEUR 2023-08-25 |
| arrete-1980-livre-3 | PE 26 | OK | ✓ | ✓ | ✓ | LEGIARTI000024766855 VIGUEUR 2008-10-08 |
| arrete-1980-livre-3 | PE 27 | OK | ✓ | ✓ | ✓ | LEGIARTI000053888118 VIGUEUR 2026-05-01 |
| arrete-1980-livre-3 | PE 28 | OK | — | ✓ | — | LEGIARTI000020374788 VIGUEUR 1990-08-27 |
| arrete-1980-livre-3 | PE 29 | OK | — | ✓ | — | LEGIARTI000024756257 VIGUEUR 1990-08-27 |
| arrete-1980-livre-3 | PE 30 | OK | — | ✓ | — | LEGIARTI000024769415 VIGUEUR 2002-04-07 |
| arrete-1980-livre-3 | PE 31 | OK | — | ✓ | — | LEGIARTI000024756305 VIGUEUR 1990-08-27 |
| arrete-1980-livre-3 | PE 32 | OK | ✓ | ✓ | — | LEGIARTI000024770703 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PE 33 | OK | ✓ | ✓ | — | LEGIARTI000024769472 VIGUEUR 2011-11-04 |
| arrete-1980-livre-3 | PE 34 | OK | ✓ | ✓ | — | LEGIARTI000024769510 VIGUEUR 2003-05-07 |
| arrete-1980-livre-3 | PE 35 | OK | ✓ | ✓ | — | LEGIARTI000024758405 VIGUEUR 1990-08-27 |
| arrete-1980-livre-3 | PE 36 | OK | — | ✓ | — | LEGIARTI000024770568 VIGUEUR 2010-05-16 |
| arrete-1980-livre-3 | PE 37 | OK | ✓ | ✓ | ✓ | LEGIARTI000024770572 VIGUEUR 2004-11-24 |
| arrete-1980-livre-3 | PO 1 | OK | ✓ | ✓ | — | LEGIARTI000024770707 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 1 § 3 — contrôle biennal des installations techniques | OK | — | ✓ | — | LEGIARTI000024770707 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 7 | OK | — | ✓ | — | LEGIARTI000024770976 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 2 | OK | — | ✓ | — | LEGIARTI000024770776 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 3 | OK | — | ✓ | — | LEGIARTI000024770800 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 4 | OK | — | ✓ | — | LEGIARTI000024770933 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 5 | OK | — | ✓ | — | LEGIARTI000024770941 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 6 | OK | — | ✓ | — | LEGIARTI000024770952 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 8 | OK | ✓ | ✓ | — | LEGIARTI000024771000 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 9 | OK | — | ✓ | — | LEGIARTI000024771040 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 10 | OK | — | ✓ | — | LEGIARTI000024771091 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 11 | OK | — | ✓ | — | LEGIARTI000024771117 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 12 | OK | — | ✓ | — | LEGIARTI000024771138 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PO 13 | OK | — | ✓ | — | LEGIARTI000024771149 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | Annexe à l'article PO 11 | OK | — | ✓ | — | LEGIARTI000024771170 VIGUEUR 2011-10-30 |
| arrete-1980-livre-3 | PU 1 | OK | — | ✓ | — | LEGIARTI000024776408 VIGUEUR 2005-04-22 |
| arrete-1980-livre-3 | PU 2 | OK | — | ✓ | — | LEGIARTI000024776463 VIGUEUR 2005-04-22 |
| arrete-1980-livre-3 | PU 3 | OK | — | ✓ | — | LEGIARTI000024776468 VIGUEUR 2005-04-22 |
| arrete-1980-livre-3 | PU 4 | OK | — | ✓ | — | LEGIARTI000024776472 VIGUEUR 2005-04-22 |
| arrete-1980-livre-3 | PU 5 | OK | — | ✓ | — | LEGIARTI000024776480 VIGUEUR 2005-04-22 |
| arrete-1980-livre-3 | PU 6 | OK | — | ✓ | — | LEGIARTI000024776491 VIGUEUR 2005-04-22 |
| arrete-1980-livre-3 | PX 1 | OK | — | ✓ | — | LEGIARTI000024776628 VIGUEUR 2001-03-20 |
| arrete-1980-livre-1 | GN 1 | OK | ✓ | ✓ | ✓ | LEGIARTI000045143487 VIGUEUR 2022-02-10 |
| arrete-1980-livre-1 | GN 10 | OK | ✓ | ✓ | ✓ | LEGIARTI000021231106 VIGUEUR 2010-01-23 |
| arrete-1980-livre-1 | GN 13 | OK | ✓ | ✓ | ✓ | LEGIARTI000020303866 VIGUEUR 1980-08-15 |
| arrete-1980-livre-2 | CH 57 | OK | ✓ | ✓ | ✓ | LEGIARTI000020304701 VIGUEUR 1980-08-15 |
| arrete-1980-livre-2 | CH 58 | OK | ✓ | ✓ | ✓ | LEGIARTI000052232581 VIGUEUR 2025-09-10 |
| arrete-1980-livre-2 | GC 8 | OK | ✓ | ✓ | — | LEGIARTI000020317565 VIGUEUR 1980-08-15 |
| arrete-1980-livre-2 | GC 1 | OK | ✓ | ✓ | — | LEGIARTI000020317551 VIGUEUR 1980-08-15 |
| arrete-1980-livre-2 | GC 21 | OK | ✓ | ✓ | ✓ | LEGIARTI000020344053 VIGUEUR 1980-08-15 |
| arrete-1980-livre-2 | GC 22 | OK | ✓ | ✓ | ✓ | LEGIARTI000020317599 VIGUEUR 1980-08-15 |
| arrete-1980-livre-2 | GZ 13 | OK | ✓ | ✓ | ✓ | LEGIARTI000051268454 VIGUEUR 2026-01-01 |
| arrete-1980-livre-2 | GZ 14 | OK | ✓ | ✓ | ✓ | LEGIARTI000051268450 VIGUEUR 2026-01-01 |
| arrete-1980-livre-2 | GZ 15 | OK | ✓ | ✓ | — | LEGIARTI000051268448 VIGUEUR 2026-01-01 |
| arrete-1980-livre-2 | GE 6 | non vérifiable : recherche par texte et numéro sans résultat (4 essai(s)) | — | — | — |  |
| arrete-1980-livre-2 | EL 18 | OK | ✓ | ✓ | — | LEGIARTI000038485456 VIGUEUR 2019-07-01 |
| arrete-1980-livre-2 | MS 38 | OK | ✓ | ✓ | ✓ | LEGIARTI000020382888 VIGUEUR 2008-10-08 |
| arrete-1980-livre-2 | MS 73 | OK | — | ✓ | — | LEGIARTI000020317755 VIGUEUR 1980-08-15 |
| arrete-1980-livre-2 | EC 14 | OK | ✓ | ✓ | ✓ | LEGIARTI000021838315 VIGUEUR 2010-05-16 |
| arrete-1980-livre-2 | EC 15 | OK | ✓ | ✓ | ✓ | LEGIARTI000020317463 VIGUEUR 1980-08-15 |
| arrete-1980-livre-2 | EL 19 | OK | ✓ | ✓ | ✓ | LEGIARTI000021231068 VIGUEUR 2010-01-23 |
| arrete-1980-livre-2 | DF 10 | OK | ✓ | ✓ | ✓ | LEGIARTI000020382687 VIGUEUR 2007-10-28 |
| arrete-1980-livre-2 | GE 4 | OK | ✓ | ✓ | ✓ | LEGIARTI000029642660 VIGUEUR 2015-01-01 |
| arrete-1980-livre-2 | CO 61 | OK | ✓ | ✓ | ✓ | LEGIARTI000049576769 VIGUEUR 2024-05-24 |
| arrete-1980-livre-2 | CH 39 | OK | ✓ | ✓ | ✓ | LEGIARTI000020304645 VIGUEUR 1980-08-15 |
| arrete-1980-livre-2 | AS 9 | OK | ✓ | ✓ | ✓ | LEGIARTI000020382882 VIGUEUR 2008-10-08 |
| arrete-1980-livre-2 | AS 10 | OK | ✓ | ✓ | ✓ | LEGIARTI000020382709 VIGUEUR 2007-09-28 |
| arrete-1980-livre-2 | GC 18 | OK | ✓ | ✓ | ✓ | LEGIARTI000052225085 VIGUEUR 2026-01-01 |
| arrete-1980-livre-2 | MS 69 | OK | ✓ | ✓ | ✓ | LEGIARTI000020317748 VIGUEUR 1980-08-15 |
| arrete-1980-livre-2 | MS 71 | OK | ✓ | ✓ | ✓ | LEGIARTI000049865160 VIGUEUR 2024-07-04 |
| code-travail-incendie | R. 4227-28 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532081 VIGUEUR 2008-05-01 |
| code-travail-incendie | R. 4227-29 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532079 VIGUEUR 2008-05-01 |
| code-travail-incendie | R. 4227-14 | OK | ✓ | ✓ | ✓ | LEGIARTI000022764985 VIGUEUR 2011-07-01 |
| code-travail-incendie | R. 4226-19 | OK | ✓ | ✓ | ✓ | LEGIARTI000022765064 VIGUEUR 2011-07-01 |
| code-travail-incendie | R. 4227-39 | OK | ✓ | ✓ | ✓ | LEGIARTI000024769386 VIGUEUR 2011-11-10 |
| code-travail-incendie | R. 4227-34 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532067 VIGUEUR 2008-05-01 |
| code-travail-incendie | R. 4227-37 | OK | ✓ | ✓ | ✓ | LEGIARTI000024769379 ABROGE_DIFF 2011-11-10 |
| code-travail-incendie | R. 4227-38 | OK | ✓ | ✓ | ✓ | LEGIARTI000024769384 VIGUEUR 2011-11-10 |
| code-travail-incendie | L. 4711-5 | OK | ✓ | ✓ | — | LEGIARTI000006903389 VIGUEUR 2008-05-01 |
| code-travail-incendie | L. 4711-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000006903383 VIGUEUR 2008-05-01 |
| code-travail-incendie | L. 4711-2 | OK | ✓ | ✓ | — | LEGIARTI000006903384 VIGUEUR 2008-05-01 |
| code-travail-incendie | D. 4711-2 | OK | ✓ | ✓ | — | LEGIARTI000018527634 VIGUEUR 2008-05-01 |
| code-travail-incendie | D. 4711-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000020398142 VIGUEUR 2009-03-16 |
| cch-registre-securite | CCH R. 143-44 | OK | ✓ | ✓ | ✓ | LEGIARTI000052645048 VIGUEUR 2026-07-01 |
| cch-registre-securite | CCH R. 141-10 | OK | ✓ | ✓ | ✓ | LEGIARTI000052644865 VIGUEUR 2026-07-01 |
| cch-registre-securite | CCH R. 141-11 | OK | ✓ | ✓ | ✓ | LEGIARTI000052644863 VIGUEUR 2026-07-01 |
| cch-registre-securite | CCH R. 146-35 | OK | ✓ | ✓ | ✓ | LEGIARTI000052645057 VIGUEUR 2026-07-01 |
| cch-registre-securite | CCH R. 143-42 | OK | ✓ | ✓ | ✓ | LEGIARTI000043819033 VIGUEUR 2021-07-01 |
| cch-registre-securite | CCH R. 143-41 | OK | ✓ | ✓ | — | LEGIARTI000043819031 VIGUEUR 2021-07-01 |
| arrete-2011-12-14-eclairage | Arrêté 2011-12-14 art. 1 | OK | ✓ | ✓ | ✓ | LEGIARTI000025072663 VIGUEUR 2011-12-31 |
| arrete-2011-12-14-eclairage | Arrêté 2011-12-14 art. 11 | OK | ✓ | ✓ | ✓ | LEGIARTI000025072657 VIGUEUR 2011-12-31 |
| arrete-2011-12-30-igh | GH 4 | OK | ✓ | ✓ | ✓ | LEGIARTI000025169254 VIGUEUR 2012-04-01 |
| arrete-2011-12-30-igh | GH 5 | OK | — | ✓ | — | LEGIARTI000052234026 VIGUEUR 2026-01-01 |
| arrete-2011-12-30-igh | GH 61 | OK | ✓ | ✓ | ✓ | LEGIARTI000025170361 VIGUEUR 2012-04-01 |
| arrete-2011-12-30-igh | GH 66 | OK | ✓ | ✓ | ✓ | LEGIARTI000025170411 VIGUEUR 2012-04-01 |
| arrete-2011-12-30-igh | GH U 16 | OK | ✓ | ✓ | ✓ | LEGIARTI000025170693 VIGUEUR 2012-04-01 |
| arrete-2011-12-30-igh | GH W 5 | OK | ✓ | ✓ | ✓ | LEGIARTI000033336961 VIGUEUR 2017-01-01 |
| froid-fluides-frigorigenes | C. env. R. 543-79 | OK | ✓ | ✓ | — | LEGIARTI000050813258 VIGUEUR 2025-01-01 |
| froid-fluides-frigorigenes | Règlement UE 2024/573 art. 5 | non vérifiable : règlement européen : hors fonds de l'API Légifrance (EUR-Lex) | — | — | — |  |
| code-travail-levage | R. 4323-22 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531483 VIGUEUR 2008-05-01 |
| code-travail-levage | R. 4323-23 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531479 VIGUEUR 2008-05-01 |
| code-travail-levage | R. 4323-24 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531477 VIGUEUR 2008-05-01 |
| code-travail-levage | R. 4323-25 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531475 VIGUEUR 2008-05-01 |
| code-travail-levage | R. 4323-26 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531473 VIGUEUR 2008-05-01 |
| code-travail-levage | R. 4323-27 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531471 VIGUEUR 2008-05-01 |
| code-travail-levage | R. 4323-28 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531467 VIGUEUR 2008-05-01 |
| arrete-2004-03-01-levage | Arrêté 2004-03-01 annexe | OK | ✓ | ✓ | ✓ | LEGIARTI000023453892 VIGUEUR 2011-01-09 |
| arrete-2004-03-01-levage | Arrêté 2004-03-01 art. 14 | OK | ✓ | ✓ | — | LEGIARTI000006680458 VIGUEUR 2005-03-31 |
| arrete-2004-03-01-levage | Arrêté 2004-03-01 art. 19 | OK | ✓ | ✓ | ✓ | LEGIARTI000032078663 VIGUEUR 2008-05-01 |
| arrete-2004-03-01-levage | Arrêté 2004-03-01 art. 20 | OK | ✓ | ✓ | ✓ | LEGIARTI000006680466 VIGUEUR 2005-03-31 |
| arrete-2004-03-01-levage | Arrêté 2004-03-01 art. 22 | OK | ✓ | ✓ | — | LEGIARTI000032078709 VIGUEUR 2008-05-01 |
| arrete-2004-03-01-levage | Arrêté 2004-03-01 art. 23 | OK | ✓ | ✓ | ✓ | LEGIARTI000006680469 VIGUEUR 2005-03-31 |
| arrete-2004-03-01-levage | Arrêté 2004-03-01 art. 24 | OK | ✓ | ✓ | ✓ | LEGIARTI000032078725 VIGUEUR 2008-05-01 |
| arrete-2004-03-01-levage | Arrêté 2004-03-01 art. 5 | OK | ✓ | ✓ | ✓ | LEGIARTI000006680446 VIGUEUR 2005-03-31 |
| arrete-2004-03-01-levage | Arrêté 2004-03-01 art. 9 | OK | ✓ | ✓ | ✓ | LEGIARTI000006680450 VIGUEUR 2005-03-31 |
| code-travail-electricite | R. 4544-11-1 | OK | ✓ | ✓ | — | LEGIARTI000051496288 VIGUEUR 2025-10-01 |
| code-travail-electricite | R. 4544-9 | OK | ✓ | ✓ | — | LEGIARTI000022849102 VIGUEUR 2011-07-01 |
| code-travail-electricite | R. 4544-11 | OK | ✓ | ✓ | — | LEGIARTI000051500365 VIGUEUR 2025-10-01 |
| code-travail-electricite | R. 4226-14 | OK | ✓ | ✓ | — | LEGIARTI000022765072 VIGUEUR 2011-07-01 |
| code-travail-electricite | R. 4226-16 | OK | ✓ | ✓ | — | LEGIARTI000022765070 VIGUEUR 2011-07-01 |
| code-travail-electricite | R. 4226-19 | OK | ✓ | ✓ | — | LEGIARTI000022765064 VIGUEUR 2011-07-01 |
| code-travail-electricite | R. 4544-10 | OK | ✓ | ✓ | — | LEGIARTI000051500368 VIGUEUR 2025-10-01 |
| code-travail-electricite | L. 4711-5 | OK | ✓ | ✓ | — | LEGIARTI000006903389 VIGUEUR 2008-05-01 |
| arrete-2011-12-26-electricite | Arrêté 2011-12-26 art. 2 | OK | ✓ | ✓ | — | LEGIARTI000025049528 VIGUEUR 2011-12-30 |
| arrete-2011-12-26-electricite | Arrêté 2011-12-26 art. 3 | OK | ✓ | ✓ | ✓ | LEGIARTI000025049531 VIGUEUR 2011-12-30 |
| arrete-2011-12-26-electricite | Arrêté 2011-12-26 annexe II | OK | ✓ | ✓ | — | LEGIARTI000025100353 VIGUEUR 2011-12-30 |
| arrete-2011-12-26-electricite | Arrêté 2011-12-26 annexe I | OK | — | ✓ | — | LEGIARTI000025049541 VIGUEUR 2011-12-30 |
| arrete-2011-12-26-electricite | Arrêté 2011-12-26 annexe IV | OK | — | ✓ | — | LEGIARTI000025100475 VIGUEUR 2011-12-30 |
| code-travail-risque-chimique | R. 4222-21 | OK | ✓ | ✓ | — | LEGIARTI000036483604 VIGUEUR 2018-01-01 |
| code-travail-risque-chimique | R. 4412-11 | OK | ✓ | ✓ | — | LEGIARTI000018530929 VIGUEUR 2008-05-01 |
| code-travail-risque-chimique | R. 4412-38 | OK | ✓ | ✓ | — | LEGIARTI000036483735 VIGUEUR 2018-01-01 |
| code-travail-risque-chimique | R. 4412-59 | OK | ✓ | ✓ | ✓ | LEGIARTI000033769354 VIGUEUR 2017-01-01 |
| code-travail-risque-chimique | R. 4412-87 | OK | ✓ | ✓ | — | LEGIARTI000036483731 VIGUEUR 2018-01-01 |
| code-travail-risque-chimique | R. 4222-20 | OK | ✓ | ✓ | — | LEGIARTI000018532294 VIGUEUR 2008-05-01 |
| code-travail-risque-chimique | R. 4222-22 | OK | ✓ | ✓ | — | LEGIARTI000018532289 VIGUEUR 2008-05-01 |
| code-travail-risque-chimique | R. 4412-17 | OK | ✓ | ✓ | — | LEGIARTI000018530917 VIGUEUR 2008-05-01 |
| code-travail-equipements-information | R. 4323-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000019761378 VIGUEUR 2009-12-29 |
| esp-suivi-en-service | C. env. R. 557-14-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000033741441 VIGUEUR 2016-12-31 |
| esp-suivi-en-service | Arrêté 2017-11-20 art. 6 | OK | ✓ | ✓ | ✓ | LEGIARTI000036131075 VIGUEUR 2018-01-01 |
| esp-suivi-en-service | Arrêté 2017-11-20 art. 7-11 | OK | ✓ | ✓ | ✓ | LEGIARTI000036131081+LEGIARTI000036131083+LEGIARTI000036131085+LEGIARTI000036131087+LEGIARTI000036131089 VIGUEUR 2018-01-01 |
| esp-suivi-en-service | Arrêté 2017-11-20 art. 15 | OK | ✓ | ✓ | ✓ | LEGIARTI000036131127 VIGUEUR 2018-01-01 |
| esp-suivi-en-service | Arrêté 2017-11-20 art. 18-19 | OK | ✓ | ✓ | ✓ | LEGIARTI000036131133+LEGIARTI000036131135 VIGUEUR 2018-01-01 |
| esp-suivi-en-service | Arrêté 2017-11-20 art. 26-28 | OK | ✓ | ✓ | ✓ | LEGIARTI000052237331+LEGIARTI000036131095+LEGIARTI000052237327 VIGUEUR 2025-09-08 |
| icpe-stockage | C. env. L. 512-1 | OK | ✓ | ✓ | — | LEGIARTI000033933233 VIGUEUR 2017-03-01 |
| icpe-stockage | C. env. L. 512-7 | OK | ✓ | ✓ | — | LEGIARTI000042654882 ABROGE_DIFF 2020-12-09 |
| icpe-stockage | C. env. L. 512-8 | OK | ✓ | ✓ | — | LEGIARTI000033933191 VIGUEUR 2017-03-01 |
| icpe-stockage | Arrêté 2015-06-01 art. 22 | OK | ✓ | ✓ | — | LEGIARTI000044166790 VIGUEUR 2022-01-01 |
| arrete-1987-10-08-aeration | Arrêté 1987-10-08 art. 2 | OK | ✓ | ✓ | — | LEGIARTI000006678609 VIGUEUR 1988-04-01 |
| arrete-1987-10-08-aeration | Arrêté 1987-10-08 art. 3 | OK | ✓ | ✓ | — | LEGIARTI000006678610 VIGUEUR 1988-04-01 |
| arrete-1987-10-08-aeration | Arrêté 1987-10-08 art. 4 | OK | ✓ | ✓ | — | LEGIARTI000006678611 VIGUEUR 1988-04-01 |
| cch-ascenseurs | CCH R. 134-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000043818725 VIGUEUR 2021-07-01 |
| cch-ascenseurs | CCH R. 134-2 | OK | ✓ | ✓ | — | LEGIARTI000043818727 VIGUEUR 2021-07-01 |
| cch-ascenseurs | CCH R. 134-6 | OK | ✓ | ✓ | ✓ | LEGIARTI000053629124 VIGUEUR 2026-04-01 |
| cch-ascenseurs | CCH R. 134-7 | OK | ✓ | ✓ | — | LEGIARTI000053629120 VIGUEUR 2026-04-01 |
| cch-ascenseurs | CCH R. 134-10 | OK | ✓ | ✓ | ✓ | LEGIARTI000043818745 VIGUEUR 2021-07-01 |
| cch-ascenseurs | CCH R. 134-11 | OK | ✓ | ✓ | ✓ | LEGIARTI000053629116 VIGUEUR 2026-05-15 |
| arretes-ascenseurs | Arrêté 2004-11-18 | non vérifiable : arrêté cité entier, sans article désigné ni citation balisée « (art. N) » | — | — | — |  |
| arretes-ascenseurs | Arrêté 2012-08-07 | OK | ✓ | ✓ | ✓ | LEGIARTI000053630589+LEGIARTI000053630584 VIGUEUR 2026-05-15 |
| code-travail-portes | R. 4224-13 | OK | ✓ | ✓ | — | LEGIARTI000018532209 VIGUEUR 2008-05-01 |
| code-travail-portes | R. 4224-17 | OK | ✓ | ✓ | — | LEGIARTI000018532197 VIGUEUR 2008-05-01 |
| arrete-1993-12-21-portes | Arrêté 1993-12-21 art. 2 | OK | ✓ | ✓ | — | LEGIARTI000006679555 VIGUEUR 1994-07-13 |
| arrete-1993-12-21-portes | Arrêté 1993-12-21 art. 9 | OK | ✓ | ✓ | — | LEGIARTI000054109592 VIGUEUR 2008-05-01 |
| arrete-1980-livre-4-parcs | PS 32 | OK | ✓ | ✓ | — | LEGIARTI000024812450 VIGUEUR 2006-07-09 |
| arrete-2018-02-23-gaz-habitation | Arrêté 23-02-2018 art. 26 | OK | ✓ | ✓ | — | LEGIARTI000043233992 VIGUEUR 2023-01-01 |
| arrete-2018-02-23-gaz-habitation | Arrêté 23-02-2018 art. 26 § 3 | OK | — | ✓ | — | LEGIARTI000043233992 VIGUEUR 2023-01-01 |
| arrete-2018-02-23-gaz-habitation | Arrêté 23-02-2018 art. 32 | OK | — | ✓ | — | LEGIARTI000036669990 VIGUEUR 2018-03-05 |
| arrete-2018-02-23-gaz-habitation | Arrêté 23-02-2018 art. 26 § 6 et § 7 | OK | — | ✓ | — | LEGIARTI000043233992 VIGUEUR 2023-01-01 |
| inrs-documentaire | INRS ED 6127 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 6030 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 840 fiche 4 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 840 fiche 5 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 840 fiche 8 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 840 fiche 9 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 840 fiche 14 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 840 fiche 17 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 880 p. 4 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 880 fiche 3 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 6305 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS page « Travail de bureau. Les risques du métier » | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS dossier web « Travail sur écran » | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 840 fiche 13 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS dossier web « Travail isolé » | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| inrs-documentaire | INRS ED 840 fiche 20 | non vérifiable : brochure INRS : hors Légifrance | — | — | — |  |
| arretes-modificatifs-erp | Arrêté 2025-12-01 | non vérifiable : arrêté cité entier, sans article désigné ni citation balisée « (art. N) » | — | — | — |  |
| code-travail-formation-securite | L. 4141-1 | OK | ✓ | ✓ | — | LEGIARTI000027326445 VIGUEUR 2013-04-18 |
| code-travail-formation-securite | L. 4141-2 | OK | ✓ | ✓ | — | LEGIARTI000006903166 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | L. 4141-3 | OK | ✓ | ✓ | — | LEGIARTI000006903167 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | L. 4141-4 | OK | ✓ | ✓ | — | LEGIARTI000037387747 VIGUEUR 2019-01-01 |
| code-travail-formation-securite | L. 4141-5 | OK | ✓ | ✓ | ✓ | LEGIARTI000054336916 VIGUEUR 2026-06-27 |
| code-travail-formation-securite | R. 4141-1 | OK | ✓ | ✓ | — | LEGIARTI000018532882 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-2 | OK | ✓ | ✓ | — | LEGIARTI000019960813 VIGUEUR 2008-12-20 |
| code-travail-formation-securite | R. 4141-3 | OK | ✓ | ✓ | — | LEGIARTI000018532878 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-3-1 | OK | ✓ | ✓ | — | LEGIARTI000021723595 VIGUEUR 2010-01-23 |
| code-travail-formation-securite | R. 4141-4 | OK | ✓ | ✓ | — | LEGIARTI000018532876 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-5 | OK | ✓ | ✓ | — | LEGIARTI000019960820 VIGUEUR 2008-12-20 |
| code-travail-formation-securite | R. 4141-6 | OK | ✓ | ✓ | — | LEGIARTI000019960823 VIGUEUR 2008-12-20 |
| code-travail-formation-securite | R. 4141-7 | OK | ✓ | ✓ | — | LEGIARTI000018532870 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-8 | OK | ✓ | ✓ | — | LEGIARTI000018532868 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-9 | OK | ✓ | ✓ | — | LEGIARTI000018532866 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-10 | OK | ✓ | ✓ | — | LEGIARTI000018532864 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-11 | OK | ✓ | ✓ | — | LEGIARTI000018532860 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-12 | OK | ✓ | ✓ | — | LEGIARTI000018532858 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-13 | OK | ✓ | ✓ | — | LEGIARTI000018532854 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-14 | OK | ✓ | ✓ | — | LEGIARTI000018532852 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-15 | OK | ✓ | ✓ | — | LEGIARTI000018532850 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-16 | OK | ✓ | ✓ | — | LEGIARTI000018532848 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-17 | OK | ✓ | ✓ | — | LEGIARTI000018532844 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-18 | OK | ✓ | ✓ | — | LEGIARTI000018532842 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-19 | OK | ✓ | ✓ | — | LEGIARTI000018532840 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | R. 4141-20 | OK | ✓ | ✓ | — | LEGIARTI000018532838 VIGUEUR 2008-05-01 |
| code-travail-formation-securite | L. 4741-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000032376248 VIGUEUR 2016-07-01 |
| code-travail-sante-travail | R. 4624-10 | OK | ✓ | ✓ | — | LEGIARTI000033769085 VIGUEUR 2017-01-01 |
| code-travail-sante-travail | R. 4624-16 | OK | ✓ | ✓ | — | LEGIARTI000033769063 VIGUEUR 2017-01-01 |
| code-travail-sante-travail | R. 4624-17 | OK | ✓ | ✓ | — | LEGIARTI000033769059 VIGUEUR 2017-01-01 |
| code-travail-sante-travail | R. 4624-18 | OK | ✓ | ✓ | — | LEGIARTI000033769047 VIGUEUR 2017-01-01 |
| code-travail-sante-travail | R. 4451-82 | OK | ✓ | ✓ | — | LEGIARTI000037024438 VIGUEUR 2018-07-01 |
| code-travail-sante-travail | R. 4624-22 | OK | ✓ | ✓ | — | LEGIARTI000033769092 VIGUEUR 2017-01-01 |
| code-travail-sante-travail | R. 4624-23 | OK | ✓ | ✓ | — | LEGIARTI000053786012 VIGUEUR 2026-04-10 |
| code-travail-sante-travail | R. 4624-24 | OK | ✓ | ✓ | — | LEGIARTI000033769104 VIGUEUR 2017-01-01 |
| code-travail-sante-travail | R. 4624-27 | OK | ✓ | ✓ | — | LEGIARTI000033769096 VIGUEUR 2017-01-01 |
| code-travail-sante-travail | R. 4624-28-1 | OK | ✓ | ✓ | — | LEGIARTI000045370991 VIGUEUR 2022-03-31 |
| code-travail-sante-travail | R. 4624-28-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000045676650 VIGUEUR 2022-04-28 |
| code-travail-sante-travail | R. 4624-28-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000045370981 VIGUEUR 2022-03-31 |
| code-travail-sante-travail | R. 4624-31 | OK | ✓ | ✓ | ✓ | LEGIARTI000054250639 VIGUEUR 2026-06-15 |
| code-travail-sante-travail | R. 4624-55 | OK | ✓ | ✓ | ✓ | LEGIARTI000033740738 VIGUEUR 2017-01-01 |
| code-travail-sante-travail | L. 4624-2-4 | OK | ✓ | ✓ | ✓ | LEGIARTI000043891306 VIGUEUR 2022-03-31 |
| code-travail-sante-travail | R. 4624-29 | OK | ✓ | ✓ | ✓ | LEGIARTI000045371016 VIGUEUR 2022-03-31 |
| code-travail-sante-travail | R. 4624-30 | OK | ✓ | ✓ | ✓ | LEGIARTI000054250636 VIGUEUR 2026-06-15 |
| code-travail-sante-travail | R. 4624-32 | OK | ✓ | ✓ | ✓ | LEGIARTI000045371021 VIGUEUR 2022-03-18 |
| code-travail-sante-travail | R. 4624-33 | OK | ✓ | ✓ | ✓ | LEGIARTI000045371018 VIGUEUR 2022-03-18 |
| code-travail-sante-travail | R. 4624-28 | OK | ✓ | ✓ | — | LEGIARTI000033769094 VIGUEUR 2017-01-01 |
| code-travail-sante-travail | R. 4624-46 | OK | ✓ | ✓ | — | LEGIARTI000045677119 VIGUEUR 2022-04-28 |
| code-travail-sante-travail | R. 4624-47 | OK | ✓ | ✓ | — | LEGIARTI000045676758 VIGUEUR 2022-04-28 |
| code-travail-sante-travail | L. 4624-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000043909039 VIGUEUR 2023-01-01 |
| code-travail-sante-travail | R. 4624-39 | OK | ✓ | ✓ | — | LEGIARTI000045677277 VIGUEUR 2022-04-28 |
| code-travail-sante-travail | L. 4745-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000033024930 VIGUEUR 2017-01-01 |
| code-travail-sante-travail | R. 4451-57 | OK | ✓ | ✓ | ✓ | LEGIARTI000047715528 VIGUEUR 2023-06-23 |
| code-travail-secours | R. 4224-14 | OK | ✓ | ✓ | — | LEGIARTI000018532205 VIGUEUR 2008-05-01 |
| code-travail-secours | R. 4224-15 | OK | ✓ | ✓ | — | LEGIARTI000018532203 VIGUEUR 2008-05-01 |
| code-travail-secours | R. 4224-16 | OK | ✓ | ✓ | — | LEGIARTI000043128580 VIGUEUR 2021-02-13 |
| code-travail-conduite | R. 4323-55 | OK | ✓ | ✓ | — | LEGIARTI000018531407 VIGUEUR 2008-05-01 |
| code-travail-conduite | R. 4323-56 | OK | ✓ | ✓ | — | LEGIARTI000051500371 VIGUEUR 2025-10-01 |
| code-travail-conduite | R. 4323-57 | OK | ✓ | ✓ | — | LEGIARTI000018531403 VIGUEUR 2008-05-01 |
| code-travail-organisation-prevention | L. 4644-1 | OK | ✓ | ✓ | — | LEGIARTI000043893856 VIGUEUR 2022-03-31 |
| code-travail-organisation-prevention | L. 2311-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000035609353 VIGUEUR 2018-01-01 |
| code-travail-organisation-prevention | L. 1111-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000019353569 VIGUEUR 2008-08-22 |
| code-travail-organisation-prevention | L. 1111-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000031565369 VIGUEUR 2016-01-01 |
| code-travail-organisation-prevention | L. 2315-18 | OK | ✓ | ✓ | — | LEGIARTI000043894249 VIGUEUR 2022-03-31 |
| code-travail-organisation-prevention | L. 2315-17 | OK | ✓ | ✓ | — | LEGIARTI000054140233 VIGUEUR 2026-05-28 |
| code-travail-organisation-prevention | L. 2315-16 | OK | ✓ | ✓ | — | LEGIARTI000035621179 VIGUEUR 2018-01-01 |
| code-travail-organisation-prevention | R. 4644-1 | OK | ✓ | ✓ | — | LEGIARTI000036483822 VIGUEUR 2018-01-01 |
| code-travail-organisation-prevention | L. 1321-1 | OK | ✓ | ✓ | — | LEGIARTI000006901432 VIGUEUR 2008-05-01 |
| code-travail-organisation-prevention | L. 1311-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000038610176 VIGUEUR 2020-01-01 |
| code-travail-information-travailleurs | D. 4711-1 | OK | ✓ | ✓ | — | LEGIARTI000018527636 VIGUEUR 2008-05-01 |
| code-travail-information-travailleurs | R. 4121-4 | OK | ✓ | ✓ | ✓ | LEGIARTI000045386451 VIGUEUR 2022-03-31 |
| code-travail-locaux-sociaux | R. 4228-1 | OK | ✓ | ✓ | — | LEGIARTI000018532006 VIGUEUR 2008-05-01 |
| code-travail-locaux-sociaux | R. 4225-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000051679293 VIGUEUR 2025-06-02 |
| code-travail-locaux-sociaux | R. 4225-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000036483598 VIGUEUR 2018-01-01 |
| code-travail-locaux-sociaux | R. 4228-22 | OK | ✓ | ✓ | ✓ | LEGIARTI000041455665 VIGUEUR 2020-01-02 |
| code-travail-locaux-sociaux | R. 4228-23 | OK | ✓ | ✓ | ✓ | LEGIARTI000041455662 VIGUEUR 2020-01-02 |
| code-travail-co-activite | R. 4515-1 | OK | ✓ | ✓ | — | LEGIARTI000036483935 VIGUEUR 2018-01-01 |
| code-travail-co-activite | R. 4515-2 | OK | ✓ | ✓ | — | LEGIARTI000018529690 VIGUEUR 2008-05-01 |
| code-travail-co-activite | R. 4515-3 | OK | ✓ | ✓ | — | LEGIARTI000018529688 VIGUEUR 2008-05-01 |
| code-travail-co-activite | R. 4515-4 | OK | ✓ | ✓ | — | LEGIARTI000018529684 VIGUEUR 2008-05-01 |
| code-travail-co-activite | R. 4515-5 | OK | ✓ | ✓ | ✓ | LEGIARTI000018529682 VIGUEUR 2008-05-01 |
| code-travail-co-activite | R. 4515-6 | OK | ✓ | ✓ | — | LEGIARTI000020398165 VIGUEUR 2009-03-16 |
| code-travail-co-activite | R. 4515-7 | OK | — | ✓ | — | LEGIARTI000018529678 VIGUEUR 2008-05-01 |
| code-travail-co-activite | R. 4515-8 | OK | ✓ | ✓ | ✓ | LEGIARTI000018529676 VIGUEUR 2008-05-01 |
| code-travail-co-activite | R. 4515-9 | OK | ✓ | ✓ | ✓ | LEGIARTI000018529674 VIGUEUR 2008-05-01 |
| code-travail-co-activite | R. 4515-10 | OK | — | ✓ | — | LEGIARTI000018529672 VIGUEUR 2008-05-01 |
| code-travail-co-activite | R. 4515-11 | OK | ✓ | ✓ | — | LEGIARTI000036484027 VIGUEUR 2018-01-01 |
| code-travail-service-prevention-sante | L. 4622-1 | OK | ✓ | ✓ | — | LEGIARTI000043893834 VIGUEUR 2022-03-31 |
| code-travail-service-prevention-sante | L. 4622-7 | OK | ✓ | ✓ | — | LEGIARTI000043893852 VIGUEUR 2022-03-31 |
| code-travail-service-prevention-sante | D. 4622-1 | OK | — | ✓ | — | LEGIARTI000045677037 VIGUEUR 2022-04-28 |
| code-travail-service-prevention-sante | D. 4622-2 | OK | — | ✓ | — | LEGIARTI000045677033 VIGUEUR 2022-04-28 |
| code-travail-manutention-ecran | R. 4541-8 | OK | ✓ | ✓ | — | LEGIARTI000018528891 VIGUEUR 2008-05-01 |
| code-travail-manutention-ecran | R. 4542-16 | OK | ✓ | ✓ | ✓ | LEGIARTI000018528838 VIGUEUR 2008-05-01 |
| code-travail-manutention-ecran | R. 4541-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000018528909 VIGUEUR 2008-05-01 |
| code-travail-manutention-ecran | R. 4541-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000018528905 VIGUEUR 2008-05-01 |
| code-travail-manutention-ecran | R. 4541-9 | OK | ✓ | ✓ | ✓ | LEGIARTI000018528889 VIGUEUR 2008-05-01 |
| code-travail-manutention-ecran | R. 4542-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000018528877 VIGUEUR 2008-05-01 |
| code-travail-manutention-ecran | R. 4542-4 | OK | ✓ | ✓ | ✓ | LEGIARTI000018528867 VIGUEUR 2008-05-01 |
| code-travail-agents-biologiques | R. 4421-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000018530512 VIGUEUR 2008-05-01 |
| code-travail-agents-biologiques | R. 4423-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000018530498 VIGUEUR 2008-05-01 |
| code-travail-travail-de-nuit | L. 3122-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000033020190 VIGUEUR 2016-08-10 |
| code-travail-travail-de-nuit | L. 3122-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000033020186 VIGUEUR 2016-08-10 |
| code-travail-travail-en-hauteur | R. 4323-58 | OK | ✓ | ✓ | — | LEGIARTI000018531397 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-59 | OK | ✓ | ✓ | — | LEGIARTI000018531395 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-60 | OK | ✓ | ✓ | — | LEGIARTI000018531393 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-61 | OK | ✓ | ✓ | — | LEGIARTI000018531391 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-62 | OK | ✓ | ✓ | — | LEGIARTI000018531387 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-63 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531385 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-64 | OK | ✓ | ✓ | — | LEGIARTI000018531383 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-65 | OK | ✓ | ✓ | — | LEGIARTI000018531379 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-66 | OK | ✓ | ✓ | — | LEGIARTI000018531377 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-67 | OK | ✓ | ✓ | — | LEGIARTI000018531375 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-68 | OK | ✓ | ✓ | — | LEGIARTI000018531373 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-69 | OK | ✓ | ✓ | — | LEGIARTI000018531367 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-70 | OK | ✓ | ✓ | — | LEGIARTI000018531365 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-71 | OK | ✓ | ✓ | — | LEGIARTI000018531363 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-72 | OK | ✓ | ✓ | — | LEGIARTI000018531361 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-73 | OK | ✓ | ✓ | — | LEGIARTI000018531359 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-74 | OK | ✓ | ✓ | — | LEGIARTI000018531357 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-75 | OK | ✓ | ✓ | — | LEGIARTI000018531354 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-76 | OK | ✓ | ✓ | — | LEGIARTI000018531352 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-77 | OK | ✓ | ✓ | — | LEGIARTI000018531350 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-78 | OK | ✓ | ✓ | — | LEGIARTI000018531348 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-79 | OK | ✓ | ✓ | — | LEGIARTI000018531346 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-80 | OK | ✓ | ✓ | — | LEGIARTI000018531344 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-81 | OK | ✓ | ✓ | — | LEGIARTI000018531340 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-82 | OK | ✓ | ✓ | — | LEGIARTI000018531338 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-83 | OK | ✓ | ✓ | — | LEGIARTI000018531336 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-84 | OK | ✓ | ✓ | — | LEGIARTI000018531334 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-85 | OK | ✓ | ✓ | — | LEGIARTI000018531332 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-86 | OK | ✓ | ✓ | — | LEGIARTI000018531330 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-87 | OK | ✓ | ✓ | — | LEGIARTI000018531328 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-88 | OK | ✓ | ✓ | — | LEGIARTI000018531326 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-89 | OK | ✓ | ✓ | — | LEGIARTI000018531322 VIGUEUR 2008-05-01 |
| code-travail-travail-en-hauteur | R. 4323-90 | OK | ✓ | ✓ | — | LEGIARTI000018531320 VIGUEUR 2008-05-01 |
| arrete-2004-12-21-echafaudages | Arrêté 21-12-2004 art. 1 | OK | — | ✓ | — | LEGIARTI000025542611 VIGUEUR 2005-01-01 |
| arrete-2004-12-21-echafaudages | Arrêté 21-12-2004 art. 2 | OK | ✓ | ✓ | — | LEGIARTI000025542606 VIGUEUR 2005-01-01 |
| arrete-2004-12-21-echafaudages | Arrêté 21-12-2004 art. 3 | OK | — | ✓ | — | LEGIARTI000025542617 VIGUEUR 2005-01-01 |
| arrete-2004-12-21-echafaudages | Arrêté 21-12-2004 art. 4 | OK | — | ✓ | — | LEGIARTI000025542614 VIGUEUR 2005-01-01 |
| arrete-2004-12-21-echafaudages | Arrêté 21-12-2004 art. 5 | OK | ✓ | ✓ | — | LEGIARTI000025542615 VIGUEUR 2005-01-01 |
| arrete-2004-12-21-echafaudages | Arrêté 21-12-2004 art. 6 | OK | ✓ | ✓ | — | LEGIARTI000025542613 VIGUEUR 2005-01-01 |
| arrete-2004-12-21-echafaudages | Arrêté 21-12-2004 art. 7 | OK | — | ✓ | — | LEGIARTI000025542612 VIGUEUR 2005-01-01 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 1 | OK | ✓ | ✓ | ✓ | LEGIARTI000042744547 VIGUEUR 2020-12-25 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 3 | OK | ✓ | ✓ | ✓ | LEGIARTI000038933527 VIGUEUR 2020-01-01 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 60 | OK | ✓ | ✓ | ✓ | LEGIARTI000006828494 VIGUEUR 1986-03-05 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 78-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000054599988 VIGUEUR 2026-08-03 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 97 | OK | ✓ | ✓ | ✓ | LEGIARTI000006828535 VIGUEUR 1986-03-05 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 98 | OK | ✓ | ✓ | ✓ | LEGIARTI000030774318 VIGUEUR 2015-10-01 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 99 | OK | ✓ | ✓ | ✓ | LEGIARTI000006828537 VIGUEUR 1986-03-05 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 100 | OK | ✓ | ✓ | ✓ | LEGIARTI000030774323 VIGUEUR 2015-10-01 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 101 | OK | ✓ | ✓ | ✓ | LEGIARTI000006828539 VIGUEUR 1986-03-05 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 102 | OK | ✓ | ✓ | ✓ | LEGIARTI000042744543 VIGUEUR 2020-12-25 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 103 | OK | ✓ | ✓ | ✓ | LEGIARTI000030774320 VIGUEUR 2015-10-01 |
| arrete-1986-habitation | Arrêté 1986-01-31 art. 104 | OK | ✓ | ✓ | ✓ | LEGIARTI000006828542 VIGUEUR 1986-03-05 |
| arrete-1993-03-05-machines | Arrêté 1993-03-05 art. 1 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679618 VIGUEUR 1993-12-01 |
| arrete-1993-03-05-machines | Arrêté 1993-03-05 art. 2 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679619 VIGUEUR 1993-12-01 |
| arrete-1993-03-05-machines | Arrêté 1993-03-05 art. 3 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679621 VIGUEUR 1993-12-01 |
| arrete-1993-03-05-machines | Arrêté 1993-03-05 art. 4 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679623 VIGUEUR 1993-06-15 |
| arrete-1993-03-05-machines | Arrêté 1993-03-05 art. 5 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679625 VIGUEUR 2006-08-23 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 1 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679529 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 2 | OK | ✓ | ✓ | ✓ | LEGIARTI000028480709 VIGUEUR 2014-01-19 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 3 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679531 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 4 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679532 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 5 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679533 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 6 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679534 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 7 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679535 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 8 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679536 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 9 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679537 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 10 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679538 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 11 | OK | ✓ | ✓ | ✓ | LEGIARTI000028480704 VIGUEUR 2014-01-19 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 12 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679540 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 13 | OK | ✓ | ✓ | ✓ | LEGIARTI000028480700 VIGUEUR 2014-01-19 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 14 | OK | ✓ | ✓ | ✓ | LEGIARTI000028480696 VIGUEUR 2014-01-19 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 15 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679543 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 16 | OK | ✓ | ✓ | ✓ | LEGIARTI000006679544 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 art. 17 | OK | — | ✓ | ✓ | LEGIARTI000006679528 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 annexe I | OK | — | ✓ | ✓ | LEGIARTI000006679546 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 annexe II | OK | — | ✓ | ✓ | LEGIARTI000028480693 VIGUEUR 2014-01-19 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 annexe III | OK | ✓ | ✓ | ✓ | LEGIARTI000006679548 VIGUEUR 1993-12-17 |
| arrete-1993-11-04-signalisation | Arrêté 1993-11-04 annexe IV | OK | — | ✓ | ✓ | LEGIARTI000006679549 VIGUEUR 1993-12-17 |
| csp-eau-potable | R. 1321-23 | OK | ✓ | ✓ | ✓ | LEGIARTI000046840762 VIGUEUR 2023-01-01 |
| csp-eau-potable | R. 1321-43 | OK | ✓ | ✓ | ✓ | LEGIARTI000046840708 VIGUEUR 2023-01-01 |
| csp-eau-potable | R. 1321-53 | OK | ✓ | ✓ | — | LEGIARTI000042292821 VIGUEUR 2020-08-30 |
| csp-eau-potable | R. 1321-55 | OK | ✓ | ✓ | ✓ | LEGIARTI000023860335 VIGUEUR 2011-04-14 |
| csp-eau-potable | R. 1321-55-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000046839690 VIGUEUR 2023-01-01 |
| csp-eau-potable | R. 1321-56 | OK | ✓ | ✓ | — | LEGIARTI000042293064 VIGUEUR 2020-08-30 |
| csp-eau-potable | R. 1321-57 | OK | ✓ | ✓ | ✓ | LEGIARTI000046840694 VIGUEUR 2023-01-01 |
| csp-eau-potable | R. 1321-58 | OK | ✓ | ✓ | ✓ | LEGIARTI000006909593 VIGUEUR 2007-01-12 |
| csp-eau-potable | R. 1321-59 | OK | ✓ | ✓ | ✓ | LEGIARTI000042292806 VIGUEUR 2020-08-30 |
| csp-eau-potable | R. 1321-60 | OK | ✓ | ✓ | ✓ | LEGIARTI000006909599 VIGUEUR 2007-01-12 |
| csp-eau-potable | R. 1321-61 | OK | ✓ | ✓ | ✓ | LEGIARTI000023860325 VIGUEUR 2011-04-14 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 1 | OK | ✓ | ✓ | — | LEGIARTI000044062856 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 2 | OK | ✓ | ✓ | — | LEGIARTI000044062851 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 3 | OK | ✓ | ✓ | — | LEGIARTI000044062852 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 4 | OK | ✓ | ✓ | ✓ | LEGIARTI000044062870 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 5 | OK | ✓ | ✓ | — | LEGIARTI000044062873 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 6 | OK | ✓ | ✓ | — | LEGIARTI000044062853 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 7 | OK | ✓ | ✓ | — | LEGIARTI000044062875 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 8 | OK | ✓ | ✓ | ✓ | LEGIARTI000044062854 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 9 | OK | ✓ | ✓ | ✓ | LEGIARTI000044062877 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 10 | OK | ✓ | ✓ | ✓ | LEGIARTI000044062879 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 11 | OK | ✓ | ✓ | — | LEGIARTI000044062882 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 12 | OK | ✓ | ✓ | ✓ | LEGIARTI000044062855 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 13 | OK | ✓ | ✓ | — | LEGIARTI000044062885 VIGUEUR 2023-01-01 |
| arrete-2021-09-10-retours-eau | Arrêté 10-09-2021 art. 14 | OK | ✓ | ✓ | — | LEGIARTI000044062886 VIGUEUR 2023-01-01 |
| arrete-2010-02-01-legionelles | Arrêté 01-02-2010 art. 1 | OK | ✓ | ✓ | ✓ | LEGIARTI000046890717 VIGUEUR 2023-01-01 |
| arrete-2010-02-01-legionelles | Arrêté 01-02-2010 art. 2 | OK | ✓ | ✓ | ✓ | LEGIARTI000046890721 VIGUEUR 2023-01-01 |
| arrete-2010-02-01-legionelles | Arrêté 01-02-2010 art. 3 | OK | ✓ | ✓ | ✓ | LEGIARTI000046890723 VIGUEUR 2023-01-01 |
| arrete-2010-02-01-legionelles | Arrêté 01-02-2010 art. 4 | OK | ✓ | ✓ | ✓ | LEGIARTI000046890728 VIGUEUR 2023-01-01 |
| arrete-2010-02-01-legionelles | Arrêté 01-02-2010 art. 5 | OK | ✓ | ✓ | ✓ | LEGIARTI000046890730 VIGUEUR 2023-01-01 |
| arrete-2010-02-01-legionelles | Arrêté 01-02-2010 art. 6 | OK | ✓ | ✓ | ✓ | LEGIARTI000046890732 VIGUEUR 2023-01-01 |
| arrete-2010-02-01-legionelles | Arrêté 01-02-2010 art. 7 | OK | ✓ | ✓ | ✓ | LEGIARTI000021796731 VIGUEUR 2010-02-10 |
| arrete-2010-02-01-legionelles | Arrêté 01-02-2010 art. 8 | OK | ✓ | ✓ | ✓ | LEGIARTI000021796734 VIGUEUR 2010-02-10 |
| arrete-2010-02-01-legionelles | Arrêté 01-02-2010 annexe 1 | OK | ✓ | ✓ | ✓ | LEGIARTI000046890734 VIGUEUR 2023-01-01 |
| arrete-2010-02-01-legionelles | Arrêté 01-02-2010 annexe 2 | OK | ✓ | ✓ | ✓ | LEGIARTI000021796797 VIGUEUR 2010-02-10 |
| arrete-2010-02-01-legionelles | Arrêté du 23 juin 1978 art. 36 | OK | ✓ | ✓ | ✓ | LEGIARTI000006828036 VIGUEUR 2006-12-15 |
| code-travail-chaleur-intense | R. 4463-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000051676923 VIGUEUR 2025-06-02 |
| code-travail-chaleur-intense | R. 4463-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000051676927 VIGUEUR 2025-06-02 |
| code-travail-chaleur-intense | R. 4463-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000051676931 VIGUEUR 2025-06-02 |
| code-travail-chaleur-intense | R. 4463-4 | OK | ✓ | ✓ | ✓ | LEGIARTI000051676933 VIGUEUR 2025-06-02 |
| code-travail-chaleur-intense | R. 4463-5 | OK | ✓ | ✓ | ✓ | LEGIARTI000051676935 VIGUEUR 2025-06-02 |
| code-travail-chaleur-intense | R. 4463-6 | OK | ✓ | ✓ | ✓ | LEGIARTI000051676937 VIGUEUR 2025-06-02 |
| code-travail-chaleur-intense | R. 4463-7 | OK | ✓ | ✓ | ✓ | LEGIARTI000051676939 VIGUEUR 2025-06-02 |
| code-travail-chaleur-intense | R. 4463-8 | OK | ✓ | ✓ | ✓ | LEGIARTI000051676941 VIGUEUR 2025-06-02 |
| code-travail-circulation-lieux | R. 4214-11 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532497 VIGUEUR 2008-05-01 |
| code-travail-circulation-lieux | R. 4224-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532231 VIGUEUR 2008-05-01 |
| code-travail-duerp-principes | L. 4121-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000035640828 VIGUEUR 2017-10-01 |
| code-travail-duerp-principes | L. 4121-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000033019913 VIGUEUR 2016-08-10 |
| code-travail-duerp-principes | L. 4121-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000043893923 VIGUEUR 2022-03-31 |
| code-travail-duerp-principes | L. 4121-3-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000043893919 VIGUEUR 2022-03-31 |
| code-travail-duerp-principes | L. 4121-4 | OK | ✓ | ✓ | ✓ | LEGIARTI000006903150 VIGUEUR 2008-05-01 |
| code-travail-duerp-principes | L. 4121-5 | OK | ✓ | ✓ | ✓ | LEGIARTI000006903151 VIGUEUR 2008-05-01 |
| code-travail-duerp | R. 4121-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000023795562 VIGUEUR 2011-04-01 |
| code-travail-duerp | R. 4121-1-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000031818152 VIGUEUR 2016-01-01 |
| code-travail-duerp | R. 4121-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000045386446 VIGUEUR 2022-03-31 |
| code-travail-duerp | R. 4121-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000045386448 VIGUEUR 2022-03-31 |
| code-travail-duerp | R. 4121-4 | OK | — | ✓ | ✓ | LEGIARTI000045386451 VIGUEUR 2022-03-31 |
| code-travail-plan-prevention | R. 4512-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000018529799 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-2 | OK | ✓ | ✓ | — | LEGIARTI000018529795 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-3 | OK | ✓ | ✓ | — | LEGIARTI000018529793 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-4 | OK | ✓ | ✓ | — | LEGIARTI000018529791 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-5 | OK | ✓ | ✓ | — | LEGIARTI000018529789 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-6 | OK | ✓ | ✓ | — | LEGIARTI000018529785 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-7 | OK | ✓ | ✓ | ✓ | LEGIARTI000018529783 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-8 | OK | ✓ | ✓ | — | LEGIARTI000018529781 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-9 | OK | ✓ | ✓ | ✓ | LEGIARTI000033769545 VIGUEUR 2017-01-01 |
| code-travail-plan-prevention | R. 4512-10 | OK | ✓ | ✓ | — | LEGIARTI000018529777 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-11 | OK | ✓ | ✓ | ✓ | LEGIARTI000043841178 VIGUEUR 2021-07-01 |
| code-travail-plan-prevention | R. 4512-12 | OK | ✓ | ✓ | ✓ | LEGIARTI000018529773 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-13 | OK | ✓ | ✓ | — | LEGIARTI000018529769 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-14 | OK | ✓ | ✓ | — | LEGIARTI000018529767 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-15 | OK | ✓ | ✓ | — | LEGIARTI000018529763 VIGUEUR 2008-05-01 |
| code-travail-plan-prevention | R. 4512-16 | OK | ✓ | ✓ | — | LEGIARTI000018529761 VIGUEUR 2008-05-01 |
| code-travail-travail-dissimule | L. 8221-1 | OK | ✓ | ✓ | — | LEGIARTI000006904815 VIGUEUR 2008-05-01 |
| code-travail-travail-dissimule | L. 8221-2 | OK | ✓ | ✓ | — | LEGIARTI000006904816 VIGUEUR 2008-05-01 |
| code-travail-travail-dissimule | L. 8221-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000044056622 VIGUEUR 2023-01-01 |
| code-travail-travail-dissimule | L. 8221-5 | OK | ✓ | ✓ | ✓ | LEGIARTI000033024966 VIGUEUR 2016-08-10 |
| code-travail-vigilance | L. 8222-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000024197683 VIGUEUR 2011-06-18 |
| code-travail-vigilance | L. 8222-2 | OK | ✓ | ✓ | — | LEGIARTI000006904824 ABROGE_DIFF 2008-05-01 |
| code-travail-vigilance | L. 8222-3 | OK | ✓ | ✓ | — | LEGIARTI000006904825 VIGUEUR 2008-05-01 |
| code-travail-vigilance | L. 8222-4 | OK | ✓ | ✓ | — | LEGIARTI000006904826 VIGUEUR 2008-05-01 |
| code-travail-vigilance | L. 8222-5 | OK | ✓ | ✓ | ✓ | LEGIARTI000029236559 VIGUEUR 2014-07-12 |
| code-travail-vigilance | L. 8222-6 | OK | ✓ | ✓ | — | LEGIARTI000028394725 VIGUEUR 2013-12-25 |
| code-travail-vigilance | L. 8222-7 | OK | ✓ | ✓ | — | LEGIARTI000006904829 VIGUEUR 2008-05-01 |
| code-travail-vigilance-modalites | R. 8222-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000030422273 VIGUEUR 2015-05-01 |
| code-travail-vigilance-modalites | R. 8222-2 | OK | ✓ | ✓ | — | LEGIARTI000018520710 VIGUEUR 2008-05-01 |
| code-travail-vigilance-modalites | R. 8222-3 | OK | ✓ | ✓ | — | LEGIARTI000018520708 VIGUEUR 2008-05-01 |
| code-travail-vigilance-modalites | D. 8222-4 | OK | ✓ | ✓ | — | LEGIARTI000018520704 VIGUEUR 2008-05-01 |
| code-travail-vigilance-modalites | D. 8222-5 | OK | ✓ | ✓ | ✓ | LEGIARTI000046078939 VIGUEUR 2023-01-01 |
| code-travail-vigilance-modalites | D. 8222-6 | OK | ✓ | ✓ | — | LEGIARTI000018520698 VIGUEUR 2008-05-01 |
| code-travail-vigilance-modalites | D. 8222-7 | OK | ✓ | ✓ | ✓ | LEGIARTI000024833495 VIGUEUR 2012-01-01 |
| code-travail-vigilance-modalites | D. 8222-8 | OK | ✓ | ✓ | — | LEGIARTI000018520694 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532271 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532269 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532267 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-4 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532265 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-5 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532263 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-6 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532261 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-7 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532259 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-8 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532257 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-9 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532255 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-10 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532253 VIGUEUR 2008-05-01 |
| code-travail-eclairage | R. 4223-11 | OK | ✓ | ✓ | ✓ | LEGIARTI000036483672 VIGUEUR 2018-01-01 |
| code-travail-eclairage | R. 4223-12 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532249 VIGUEUR 2008-05-01 |
| code-travail-bruit-vibrations | R. 4431-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000018530386 VIGUEUR 2008-05-01 |
| code-travail-bruit-vibrations | R. 4432-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000018530378 VIGUEUR 2008-05-01 |
| code-travail-bruit-vibrations | R. 4433-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000018530370 VIGUEUR 2008-05-01 |
| code-travail-bruit-vibrations | R. 4433-2 | OK | ✓ | ✓ | ✓ | LEGIARTI000018530368 VIGUEUR 2008-05-01 |
| code-travail-bruit-vibrations | R. 4434-9 | OK | ✓ | ✓ | ✓ | LEGIARTI000018530333 VIGUEUR 2008-05-01 |
| code-travail-bruit-vibrations | R. 4441-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000018530289 VIGUEUR 2008-05-01 |
| code-travail-matieres-inflammables | R. 4227-22 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532097 VIGUEUR 2008-05-01 |
| code-travail-matieres-inflammables | R. 4227-23 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532095 VIGUEUR 2008-05-01 |
| code-travail-matieres-inflammables | R. 4227-24 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532093 VIGUEUR 2008-05-01 |
| code-travail-matieres-inflammables | R. 4227-25 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532091 VIGUEUR 2008-05-01 |
| code-travail-matieres-inflammables | R. 4227-26 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532089 VIGUEUR 2008-05-01 |
| code-travail-matieres-inflammables | R. 4227-27 | OK | ✓ | ✓ | ✓ | LEGIARTI000018532087 VIGUEUR 2008-05-01 |
| arrete-1993-03-19-travaux-dangereux | Arrêté 1993-03-19 art. 1er | OK | ✓ | ✓ | ✓ | LEGIARTI000029720328 VIGUEUR 2008-05-01 |
| casf-definition-handicap | L. 114 | OK | ✓ | ✓ | ✓ | LEGIARTI000006796446 VIGUEUR 2005-02-12 |
| arrete-2017-04-19-registre-accessibilite | Arrêté 2017-04-19 art. 1er | OK | ✓ | ✓ | ✓ | LEGIARTI000034480997 VIGUEUR 2017-04-23 |
| arrete-2017-04-19-registre-accessibilite | Arrêté 2017-04-19 art. 2 | OK | ✓ | ✓ | ✓ | LEGIARTI000034480998 VIGUEUR 2017-04-23 |
| arrete-2017-04-19-registre-accessibilite | Arrêté 2017-04-19 art. 3 | OK | ✓ | ✓ | ✓ | LEGIARTI000034481000 VIGUEUR 2017-04-23 |
| arrete-2017-04-19-registre-accessibilite | Arrêté 2017-04-19 art. 4 | OK | ✓ | ✓ | ✓ | LEGIARTI000034481001 VIGUEUR 2017-04-23 |
| cch-registre-accessibilite | CCH R. 164-6 | OK | ✓ | ✓ | ✓ | LEGIARTI000043819305 VIGUEUR 2021-07-01 |
| cch-classement-erp-igh | CCH R. 143-19 | OK | ✓ | ✓ | ✓ | LEGIARTI000043818977 VIGUEUR 2021-07-01 |
| cch-classement-erp-igh | CCH R. 143-38 | OK | ✓ | ✓ | ✓ | LEGIARTI000043819025 VIGUEUR 2021-07-01 |
| cch-classement-erp-igh | CCH R. 122-5 | OK | ✓ | ✓ | ✓ | LEGIARTI000052644820 VIGUEUR 2025-11-21 |
| cch-classement-erp-igh | CCH R. 146-3 | OK | ✓ | ✓ | ✓ | LEGIARTI000043819081 VIGUEUR 2021-07-01 |
| cch-classement-erp-igh | CCH R. 146-4 | OK | ✓ | ✓ | ✓ | LEGIARTI000043819083 VIGUEUR 2021-07-01 |
| code-travail-epi | R. 4323-91 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531314 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-92 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531312 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-93 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531310 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-94 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531308 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-95 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531306 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-96 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531304 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-97 | OK | ✓ | ✓ | ✓ | LEGIARTI000051679302 VIGUEUR 2025-06-02 |
| code-travail-epi | R. 4323-98 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531300 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-99 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531296 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-100 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531294 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-101 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531292 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-102 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531290 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-103 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531288 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-104 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531284 VIGUEUR 2008-05-01 |
| code-travail-epi | R. 4323-105 | OK | ✓ | ✓ | ✓ | LEGIARTI000036483581 VIGUEUR 2018-01-01 |
| code-travail-epi | R. 4323-106 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531280 VIGUEUR 2008-05-01 |
| code-travail-epi-amont | R. 4321-4 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531553 VIGUEUR 2008-05-01 |
| code-travail-epi-amont | R. 4322-1 | OK | ✓ | ✓ | ✓ | LEGIARTI000018531543 VIGUEUR 2008-05-01 |
| arrete-1993-03-19-epi | Arrêté 1993-03-19 (EPI) art. 1er | OK | ✓ | ✓ | ✓ | LEGIARTI000006930405 VIGUEUR 1993-12-01 |
| arrete-1993-03-19-epi | Arrêté 1993-03-19 (EPI) art. 2 | OK | ✓ | ✓ | ✓ | LEGIARTI000006930406 VIGUEUR 1993-12-01 |
| arrete-1993-03-19-epi | Arrêté 1993-03-19 (EPI) art. 3 | OK | ✓ | ✓ | ✓ | LEGIARTI000006930407 VIGUEUR 1993-12-01 |
| arrete-1993-03-19-epi | Arrêté 1993-03-19 (EPI) art. 4 | OK | ✓ | ✓ | ✓ | LEGIARTI000006930408 VIGUEUR 1993-12-01 |
