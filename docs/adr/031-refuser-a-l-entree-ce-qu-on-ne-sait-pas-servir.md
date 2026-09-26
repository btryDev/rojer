# ADR-031 — Refuser à l'entrée ce qu'on ne sait pas servir du tout

- **Statut** : acceptée, 2026-09-01 (réunion d'équipe)
- **Portée** : `src/lib/onboarding/` (schéma, actions),
  `src/components/onboarding/validation.ts` (la validation client du wizard —
  elle vit sous `components/`, pas sous `lib/`),
  `src/lib/etablissements/schema.ts` (`etablissementCreationSchema`),
  `src/lib/perimetre/exclusions.ts` (`refusAlEntree`, catalogue des deux refus),
  `src/lib/perimetre/couverture.ts`, `src/lib/referentiels/corpus/perimetre.ts`
- **Amende** l'ADR-020, qu'elle ne renverse pas · **Découle de** l'ADR-025

## Le problème

La doctrine du produit est de **nommer ce qu'il ne couvre pas plutôt que de
refuser**. Elle est portée par l'ADR-020, par `perimetre/couverture.ts` — qui
rend des manques et des indéterminations, jamais un score —, par
`docs/couverture-declaree-du-produit.md` sous la garde d'un test, et par le
bandeau du calendrier. Elle a une bonne raison : refuser un dossier au motif
qu'un point n'est pas couvert ferme la porte à un dirigeant qui aurait profité de
tout le reste. C'est exactement la faute qu'a corrigée `onboarding/scope.ts`, qui
refusait la création hors des trois secteurs de DUERP instruits et bloquait ainsi
l'accès au référentiel de conformité, lequel ne lit jamais le code NAF.

Le cadrage du 2026-09-01 demande pourtant un **refus à l'entrée** pour une liste
de régimes. Il faut donc dire précisément où passe la frontière, sinon la
prochaine session appliquera l'une ou l'autre doctrine au hasard de celle qu'elle
aura lue.

## La décision

**On refuse ce que le produit ne sait pas servir *du tout*. On déclare ce qu'il
sert incomplètement.**

Le critère est la nature du manque, pas sa taille.

| | Refus à l'entrée | Déclaration continue |
|---|---|---|
| **Ce qui le déclenche** | Ce que le produit ne peut pas servir **du tout** : la structure sort de sa taille, ou son régime rouvre un règlement entier jamais dépouillé | Tout le reste — un régime servi dont une partie manque |
| **Ce qui refuse, au 2026-09-01** | **Deux cas, et deux seulement** : plus de cinquante travailleurs ; un ERP situé dans un immeuble de grande hauteur | ERP de 1ʳᵉ à 4ᵉ catégorie, IGH seul, ICPE, tout type d'ERP non instruit, secteur de DUERP non instruit, équipement hors référentiel, obligations suspendues au public reçu, expositions spécialisées (ATEX, amiante, plomb, radon, CMR, rayonnements ionisants) |
| **Ce que voit le dirigeant** | La création s'arrête et dit pourquoi | Le dossier vit et le prévient en permanence |

**La liste des refus est courte, et elle a été raccourcie en séance.** Un premier
jet refusait une douzaine de régimes. La propriétaire l'a ramenée à deux cas le
2026-09-01, et son critère est meilleur que celui qui présidait : **on refuse ce
qu'on ne peut pas servir, pas ce qu'on ne couvre pas entièrement.** Une TPE qui
manipule un agent CMR reste un employeur ordinaire pour tout le reste — sanitaires,
électricité, incendie, DUERP — et lui fermer la porte lui retirerait tout au motif
qu'on ne lui donnerait pas tout. Le mécanisme de déclaration existe précisément
pour ce cas.

**Le cumul ERP + IGH, et lui seul.** Un ERP dans un immeuble de grande hauteur
relève du règlement de sécurité des IGH, jamais dépouillé. **L'IGH seul n'est pas
refusé** : un employeur locataire de bureaux dans une tour relève du Code du
travail, que le produit sert entièrement, et les obligations du règlement IGH
pèsent sur l'exploitant de l'immeuble, pas sur lui. Conséquence utile : les neuf
obligations `igh` du référentiel cessent d'être des lignes mortes.

**L'ADR-020 n'est pas renversée.** Son mécanisme — ce qu'un DUERP ne couvre pas
se déclare et se grave avec la version — reste entier, et le module de couverture
avec lui : ils gouvernent toute la colonne de droite. Ce que cette ADR ajoute est
une classe de cas traitée **en amont**, avant que le dossier n'existe.

Trois précisions, parce que chacune a failli être prise à l'envers.

**1. La borne d'effectif porte sur les travailleurs, et sur eux seuls.** Le
public reçu ne la déclenche jamais. Un restaurant de huit salariés qui sert trois
cents couverts est classé en 3ᵉ catégorie d'ERP : la catégorie mesure le public,
la borne mesure les salariés, et les confondre reviendrait à refuser la cible du
produit. Un test le verrouille.

**1 bis. Elle vaut à la création, pas en édition.** Un client qui
passe de quarante-cinq à soixante salariés reste servi : lui fermer son dossier
parce qu'il a embauché serait absurde. Mais la promesse implicite doit rester
explicite — au-delà de cinquante, son dossier porte un manque de couverture qui
le dit. C'est le même traitement d'honnêteté que les ERP de 1re à 4e catégorie.

**1 ter. La borne vaut aussi pour l'effectif de l'entreprise (2026-09-26,
décision de la propriétaire : « c'est la limite de Rojer »).** Depuis C37, le
produit tient deux effectifs : les travailleurs du site et les salariés de
l'entreprise, sur lesquels se comptent les seuils du CSE, du règlement
intérieur et du programme annuel. La même borne (`EFFECTIF_MAX`) s'applique
aux deux, par le même mécanisme : refus à la création (parcours d'entrée et
création d'une entreprise), jamais en édition — une entreprise qui franchit le
seuil en cours de route garde son dossier, qui porte le manque (axe
`effectif` de la couverture). Les refus à l'entrée passent ainsi à trois.

**2. Le refus ne borne jamais le déclenchement d'une obligation.** Les seuils du
référentiel se lisent sur ce qu'ils visent : `personnesPresentesHabituellement`
n'est pas plafonné par la borne d'effectif, et un établissement de trente
salariés qui reçoit soixante personnes déclenche toujours la consigne et
l'exercice semestriel. Un test verrouille ce cas précis : c'est exactement le
genre de conséquence qu'une borne posée trop haut dans la pile emporterait sans
bruit.

**3. Un refus n'est jamais un cul-de-sac.** L'écran de refus nomme le régime,
dit pourquoi le produit ne le sert pas, et renvoie vers la page des éléments
exclus, qui donne des indications. Refuser sans expliquer serait pire que servir
mal.

## Ce que ça coûte si on se trompe

Un refus est plus dur à découvrir qu'un bandeau : la personne refusée ne
reviendra pas dire qu'elle l'a été à tort. La liste des régimes refusés est donc
un objet à relire — pas une constante qu'on augmente au fil des cas gênants.
Chaque ajout à cette liste passe par une décision, comme celui-ci.
