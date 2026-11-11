# ADR-033 — Le DUERP est borné à cinq unités de travail

- **Statut** : acceptée, 2026-09-01 (réunion d'équipe) ; **plafond levé le 2026-11-11** (amendement ci-dessous)
- **Portée** : `src/lib/duerps/plafond-unites.ts` (le chiffre, le compte hors
  unité transverse et les deux phrases de refus, sans prisma),
  `src/lib/duerps/actions.ts`, `src/lib/duerps/import/`
- **Découle de** l'ADR-025


> **Amendement du 2026-11-11 — le plafond de cinq est levé** (décision de la
> propriétaire). La tarification (ADR-053, grille du 2026-11-05) borne déjà les
> unités : trois pendant l'essai, sans limite dans les formules payantes. Le
> plafond de cinq s'y superposait et bloquait un client payant à cinq, alors
> que sa formule annonce « sans limite » ; restauration et bureau
> pré-remplissant cinq unités, l'ajout était refusé dès la première visite.
> La raison d'origine — fixer la taille d'entreprise servie — est tenue depuis
> le 2026-11-03 par l'effectif (ADR-031, 49 salariés au plus), et le chiffre
> n'avait jamais été mesuré (section finale). Retirés : `plafond-unites.ts`
> et ses quatre points d'appel (choix du secteur, ajout manuel, import, écran
> des unités). Reste vrai de cette ADR : l'unité « Risques transverses » ne
> compte dans aucune limite, et le pré-remplissage s'arrête à la limite de
> l'essai sans refuser. Le reste du texte ci-dessous est l'état d'origine.

## Le problème

Rien ne limitait le nombre d'unités de travail d'un DUERP. Le cadrage du
2026-09-01 le borne à cinq — c'est la décision la plus simple à implémenter du
recadrage, et la plus lourde de conséquences commerciales : elle fixe la taille
d'entreprise que le produit accepte de servir.

Cinq postes n'est pas cinq salariés. Une TPE de six personnes peut n'avoir que
deux unités ; un commerce de trois peut en avoir quatre.

## La décision

**Cinq unités de travail au plus, *hors* l'unité « Risques transverses ».**

La précision n'est pas cosmétique. L'unité transverse est créée
systématiquement à l'ouverture du DUERP et l'écran des unités la masque déjà.
Deux des trois référentiels sectoriels — restauration et bureau — pré-remplissent
exactement cinq unités : les compter avec la transverse ferait échouer le
pré-remplissage dès la première étape, pour un dossier parfaitement dans la
cible.

**La borne est posée aux quatre endroits qui écrivent une unité**, pas seulement
au formulaire d'ajout : la création du DUERP, le choix du secteur, l'ajout
manuel, et l'import d'un DUERP existant. Le quatrième est celui qu'on oublie ;
c'est aussi celui qui peut faire entrer douze unités d'un coup.

**À l'import, on refuse en nommant la limite. On ne tronque pas.** Tronquer
silencieusement un document que le dirigeant a apporté lui ferait perdre des
risques évalués sans qu'il le sache — le contraire exact de ce que le produit
promet. Le refus est posé **avant** la création du DUERP : un import refusé qui
laisserait derrière lui un document vide serait un second dégât.

**Le pré-remplissage sectoriel, lui, s'arrête au plafond sans refuser** — et
c'est la seule dissymétrie de la règle. Ce sont des unités que le produit
*propose* : en écarter une ne retire rien au dirigeant, qui peut l'ajouter à la
main. Le cas où la coupe mord est le changement de secteur, les unités de
l'ancien secteur occupant les places ; l'utilisateur doit alors les supprimer
lui-même.

À la **création** du DUERP, rien n'est plafonné : seule l'unité « Risques
transverses » y est écrite, et elle ne compte pas. Le DUERP naît donc toujours
avec ses cinq places entières.

## Ce qu'il faudrait mesurer, et qui ne l'a pas été

L'ADR-025 le disait : « la limite doit sortir d'une mesure, pas d'une
intuition ». Combien d'unités portent les dossiers réels ? La question n'a pas
reçu de réponse chiffrée avant que la décision soit prise. Elle reste ouverte, et
c'est le premier chiffre à regarder si la borne se met à gêner : cinq est un
choix de cadrage, pas un résultat d'observation.
