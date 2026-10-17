# Relevé — le contenu du registre de sécurité dépend-il du type d'ERP ?

Relevé du 2026-08-26, branche `feat/registre-securite-incendie-complet`.

Question posée : le registre de sécurité est-il commun à tous les ERP, ou son
contenu varie-t-il selon l'activité ? Et si oui, que faut-il modéliser ?

---

## Méthode, et ses limites

Les pages d'article de Légifrance ne se laissent pas lire par une requête
automatique : le texte est rendu côté client et l'accès direct est filtré par
Cloudflare. Chaque article ci-dessous a donc été lu **deux fois, par deux
chemins indépendants** :

1. la reproduction consolidée éditée par Batiss (éditeur professionnel du
   règlement de sécurité, mise à jour 2026-01-05), extraite en texte ;
2. le contenu indexé de la page Légifrance de l'article, obtenu par recherche.

Une concordance entre les deux vaut présomption forte, **pas** vérification
en première main. Colonne `Lu` ci-dessous :

| Marque | Sens |
|---|---|
| `✔︎` | Les deux lectures concordent, et l'URL Légifrance de l'article est connue |
| `~` | Une seule lecture, ou article non isolé sur Légifrance (URL de section seulement) |

**Avant qu'une de ces références entre au référentiel, elle doit être relue en
verbatim sur sa page Légifrance par un humain.** C'est la règle du dépôt
(CLAUDE.md, règle 6) et elle n'est pas satisfaite par ce relevé.

---

## A. Le cadre : commun à tous les ERP

| Réf. | Ce qu'elle dit | Lu | Source |
|---|---|---|---|
| `R. 143-44 CCH` | Impose le registre et fixe la liste limitative de ce qui s'y reporte : travaux, service de sécurité, consignes, dates des contrôles et vérifications, dates des exercices. Chapitre III « Établissements recevant du public » — donc **toutes catégories, 5ᵉ comprise**. | `✔︎` | [Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819037) |

Réécrit par le décret n° 2025-1100, en vigueur depuis le 1ᵉʳ juillet 2026 :
ajout du 5° sur les dates des exercices, renvois aux articles R. 141-10 et
R. 141-11.

**Conclusion partielle : le squelette du registre est le même pour tous.** Les
49 fiches du catalogue ne sont donc pas à segmenter par type.

---

## B. Les deux règles qui commandent tout le reste

### B.1 — Un établissement peut cumuler plusieurs types

| Réf. | Ce qu'elle dit | Lu | Source |
|---|---|---|---|
| `GN 2` | Des exploitations groupées non isolées forment **un seul ERP**. La catégorie se calcule sur l'effectif total cumulé. Et surtout : « *en plus des dispositions générales communes, les dispositions particulières propres aux différents types d'exploitations groupées dans l'établissement leur sont applicables* en se référant à la catégorie déterminée ci-dessus ». | `✔︎` | [Légifrance](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000020303850) |

C'est la base réglementaire du seul vrai manque du modèle de données : un
hôtel avec restaurant relève de O **et** de N, un magasin avec restauration de
M **et** de N. `Etablissement.typeErp` ne sait en porter qu'un.

### B.2 — En 5ᵉ catégorie, les dispositions par type ne s'appliquent pas

| Réf. | Ce qu'elle dit | Lu | Source |
|---|---|---|---|
| `PE 1 § 1` | « *Les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre.* » | `✔︎` | [Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020374786) |

> **Ce qu'est le Livre II — correction d'une première version de ce relevé.**
> Il avait été écrit ici que « le livre II est l'ensemble des dispositions
> particulières par type ». C'est faux. Le chemin hiérarchique rendu par
> Légifrance pour les articles MS 45 à MS 52 est : « Livre II : Dispositions
> applicables aux établissements des quatre premières catégories > Titre Ier :
> Dispositions générales > Chapitre XI > Section 4 ». Le Livre II contient donc
> **les deux** : un Titre Ier de dispositions générales (MS, EL, EC, DF, CO…)
> *et* les dispositions particulières par type.
>
> La conclusion ne change pas — M/N/O/W ne s'appliquent pas en 5ᵉ catégorie —
> mais la raison est « **le Livre II entier est écarté** », pas « les
> dispositions par type sont écartées ». La nuance porte : c'est le même
> mécanisme qui écarte MS 45 à MS 52, donc tout le régime du service de
> sécurité incendie. Une fiche du catalogue qui se fonderait sur MS 46 sans
> exclure la 5ᵉ catégorie serait fausse pour la même raison qu'une fiche
> fondée sur M 31.
| `PE 1 § 2` | Les chapitres I et II du livre PE sont communs à tous les établissements de 5ᵉ catégorie ; les chapitres III à VI ne visent que **certains** types : PO (hôtels), PU (soins), PX (sportifs). | `✔︎` | idem |
| `PE 27` | Ce que la 5ᵉ catégorie doit à la place : présence permanente d'un membre du personnel, alarme, consignes affichées (numéro des pompiers, adresse du centre de secours, dispositions immédiates), **personnel instruit et entraîné à la manœuvre des moyens de secours**, plan d'intervention à l'entrée. | `~` | [Légifrance](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000024766984/) |

**C'est le résultat décisif du relevé.** Les clients visés par le produit sont
des TPE/PME, donc massivement en 5ᵉ catégorie. Pour eux, le contenu du registre
est réellement commun, et le critère qui commande est la **catégorie**, déjà
modélisée (`categorieErp`). Le type ne change rien — sauf hôtels, soins et
sportifs, tous hors périmètre produit aujourd'hui.

---

## C. Au-dessus de la 5ᵉ catégorie : la distinction est réelle

Relevé limité aux trois secteurs couverts par le produit (restauration NAF 56,
commerce de détail NAF 47, bureaux/tertiaire), plus le type O à titre de
contre-exemple.

### Type N — restaurants et débits de boissons

| Réf. | Ce qu'elle ajoute au registre | Lu | Source |
|---|---|---|---|
| `N 17` | « *Des employés, spécialement désignés, doivent être entraînés à la mise en œuvre des moyens de secours.* » → alimente la fiche « personnel de sécurité ». | `✔︎` | [Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024752266) |
| `N 20` | Précautions d'exploitation : consignes spéciales « *portées fréquemment à la connaissance du personnel* » — chiffons séchant près des appareils de cuisson, projection de graisse provoquant des « coups de feu », emballages vides en local public. **Propres au type N.** | `✔︎` | [Légifrance](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000024752327) |

### Type M — magasins et centres commerciaux

| Réf. | Ce qu'elle ajoute au registre | Lu | Source |
|---|---|---|---|
| `M 29` | Service de sécurité incendie dimensionné par l'effectif du public : sous 4 000 personnes, agents désignés par l'exploitant ; au-delà, agents SSIAP dans les conditions de MS 46, avec une table d'effectifs par tranche jusqu'à 27 000 et un SSIAP 3 au-delà de 9 000. | `✔︎` | [Légifrance](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000034988398) |
| `M 31` | « *Le directeur de l'établissement ou le responsable unique de sécurité (RUS) **annexe au registre de sécurité** un schéma d'organisation globale de la sécurité de l'établissement.* » | `✔︎` | [Légifrance](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000034988400) |

`M 31` est le cas le plus net du relevé : **une pièce du registre qui n'existe
que pour le type M**, créée par l'arrêté du 13 juin 2017 (art. 14).

### Type W — administrations, banques, bureaux

| Réf. | Ce qu'elle ajoute au registre | Lu | Source |
|---|---|---|---|
| `W 13` | « *Des personnes, spécialement désignées, doivent être entraînées à la mise en œuvre des moyens de secours.* » Même exigence que N 17, sans consigne d'exploitation propre. | `~` | [Légifrance, section W 11–W 16](https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000025177244/) |

### Type O — hôtels (hors périmètre, contre-exemple)

| Réf. | Ce qu'elle ajoute au registre | Lu | Source |
|---|---|---|---|
| `O 21` | Consigne d'incendie affichée **dans chaque chambre**, modèle en annexe, français + bande dessinée, traduction selon les usagers ; plan d'évacuation NF S 60-303 à chaque niveau. | `~` | Batiss, type O |
| `O 24` | Service de sécurité incendie : renvoi aux articles MS 45 à MS 48. | `~` | Batiss, type O |

C'est le type qui s'écarte le plus du tronc commun — et il est aujourd'hui hors
périmètre produit.

### Le renvoi commun

| Réf. | Ce qu'elle dit | Lu | Source |
|---|---|---|---|
| `MS 46` | La composition du service de sécurité incendie est déterminée « *suivant le type, la catégorie et les caractéristiques des établissements* » : personnes désignées par l'exploitant, agents de sécurité incendie (MS 48), sapeurs-pompiers, ou combinaison arrêtée après avis de la commission. | `~` | [Légifrance](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000021838331) |

MS 46 est l'article qui **énonce** la dépendance au type. Il ne la chiffre pas :
ce sont les dispositions particulières de chaque type qui le font.

---

## D. Ce que le relevé change pour le produit

### D.1 — Ce qui est déjà juste

Le catalogue des 49 fiches, commun à tous les ERP, est conforme à R. 143-44. La
segmentation actuelle par régime et par catégorie (`erp: true`,
`erp: { categories: [...] }`, `travail: true`) est le bon axe principal.

### D.2 — Le manque réel, et il est en base

> **[2026-10-17 : CLOS par l'ADR-045** — colonne `typesErpAutres` (PR #50),
> écrans (PR #51). Ce qui suit est l'état antérieur, gardé barré dans son
> esprit : le nom retenu est `typesErpAutres`, pas `typesErpSecondaires`, et
> `typeErp` est le PREMIER type déclaré, **pas un type principal** — GN 2 n'en
> connaît pas. La lecture est `typesErpDe` (`matching/types-erp.ts`).]

`Etablissement.typeErp` est une valeur unique (`TypeErp?`). GN 2 admet le cumul
d'exploitations dans un même établissement, et impose que les dispositions
particulières de **chacune** s'appliquent. Le modèle ne sait pas le représenter.

Proposition, purement additive :

- `typesErpSecondaires TypeErp[]` sur `Etablissement`, défaut `[]` ;
- ~~`typeErp` reste le type **principal**, celui qui commande le classement~~ ;
- un helper pur `typesErpDeLEtablissement(etab): TypeErp[]` rend l'union ;
- le moteur de matching lit `TypologieApplication.erp.types` — qui **existe
  déjà et n'est utilisé par aucune fiche** — en OU contre cette union.

Même forme que `Prestataire.domaines`, déjà en place dans le dépôt.

**Ce changement engage le schéma : il appelle un ADR, pas une migration écrite
au fil d'une tâche.** La racine de la typologie (ADR-004 : régimes cumulables
et enums de précision) a été tranchée une fois ; y ajouter un second axe
cumulable se décide de la même façon.

### D.3 — Le garde-fou à ne pas oublier

Une règle doit neutraliser les dispositions par type en 5ᵉ catégorie, sauf
PO / PU / PX (PE 1 § 1). Sans elle, brancher `erp: { types: ["M"] }` sur une
fiche ferait apparaître le schéma d'organisation globale de M 31 à une
supérette de quartier : l'inverse du service rendu, et le genre d'erreur qu'un
dirigeant ne peut pas détecter seul.

### D.4 — Ce qui reste en TypeScript, et pourquoi

La règle « quelle fiche pour quel type » ne va **pas** en base (ADR-003) : un
référentiel en base ne se relit pas dans l'historique Git, et c'est
précisément ce qu'on doit pouvoir produire devant un contrôle. Seule la donnée
— les types de l'établissement — est en base.

---

## E. Trouvé en chemin, hors sujet mais à ne pas perdre

- **Arrêté du 19 février 2026** modifiant l'arrêté du 25 juin 1980 : porte sur
  les structures combustibles et les façades (articles CO 26, CO 53…),
  **entrée en vigueur au 1ᵉʳ juin 2027**. Sans effet sur le registre, mais le
  référentiel devra en tenir compte le moment venu.
  [Légifrance](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053525217)
- **Arrêté du 29 juillet 2025** et **arrêté du 1ᵉʳ septembre 2025** modifient
  également l'arrêté du 25 juin 1980 (articles GZ notamment). Non dépouillés.

---

## F. Ce qu'il reste à faire avant de coder

1. Relire en verbatim sur Légifrance, à la main, les six articles marqués `✔︎`
   ci-dessus, et isoler l'article W 13 dont l'identifiant n'a pas été obtenu.
   En le faisant, relever aussi le **chemin hiérarchique** de chaque article :
   c'est lui qui dit à quel Livre il appartient, donc s'il tombe ou non sous
   l'exclusion de PE 1 § 1. C'est ce relevé de chemin qui a corrigé la
   première version du § B.2 ci-dessus.
2. Dépouiller les types restants du périmètre s'il s'élargit (L, P, R, S, T,
   U, V, X, Y) — non couverts par ce relevé.
3. Décider si le produit prend en charge les ERP au-dessus de la 5ᵉ catégorie.
   **Si la réponse est non, rien de ce qui précède n'a besoin d'être
   implémenté** hors le cumul de types de GN 2, qui vaut à toutes catégories.
