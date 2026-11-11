# ADR-059 — Une étape du DUERP n'est faite que validée

- **Statut** : acceptée, 2026-11-11 (décision de la propriétaire : « si pas
  validé, pas fait »)
- **Portée** : `prisma/schema.prisma` (`Duerp.etapesValidees`),
  `src/lib/duerps/etapes-validees.ts` (seule lecture), `src/lib/duerps/etapes.ts`
  (`construireEtapes`), `validerEtape` et `choisirSecteur`
  (`src/lib/duerps/actions.ts`), l'import (`src/lib/duerps/import/actions.ts`),
  `ValiderEtapeBouton`
- **Amende** la décision du 2026-10-12 (chantiers-ouverts § 17.5 : l'étape
  « Questions transverses » calculée, plus stockée) sans la renverser

## Le problème

Le fil du DUERP cochait « Fait » sur des étapes que le dirigeant n'avait pas
ouvertes. Confirmer le secteur pré-remplit les unités de travail ; l'étape
« Unités » était faite dès qu'une unité existait. Relevé par la propriétaire
en parcourant l'écran : « je n'y ai pas touché ».

## La décision

**« Fait » = validé par le dirigeant ET complet sur les données.** Ni l'un ni
l'autre seul.

| Étape | Se valide par | Complet si |
|---|---|---|
| 01 Votre activité | « Valider et continuer » des précisions ; la confirmation du secteur quand il n'a pas de précision | un secteur est retenu (les précisions sont facultatives) |
| 02 Unités | « Valider et continuer » | au moins une unité |
| 03 Risques | « Valider et continuer » | chaque unité porte un risque |
| 04 Questions transverses | « Valider — aller à la synthèse » | chaque question a une réponse (calcul du 2026-10-12, inchangé) |
| 05 Synthèse | une version figée (inchangé) | — |

La validation est une date par étape, dans une colonne JSON
(`{ activite?, unites?, risques?, transverses? }`), lue par la seule
`lireEtapesValidees`. Une colonne et non quatre : le fil peut gagner ou perdre
une étape sans migration.

**Ce qui la retire** : un changement de secteur (activité, unités, risques —
de nouvelles unités arrivent), un import dans un DUERP existant (unités,
risques). Reconfirmer le même secteur ne retire rien et ne pré-remplit rien.

**Pourquoi ce n'est pas un retour à `transversesRepondues`** : la colonne
retirée le 2026-10-12 *remplaçait* l'état calculé, et restait vraie quand une
question neuve arrivait. Ici la validation s'*ajoute* au calcul : une question
sans réponse laisse l'étape à faire, validée ou non.

**Qui ne peut pas écrire** (lecture seule, ADR-054 ; saisie fermée, ADR-053)
voit un simple lien « Étape suivante » à la place du bouton : il avance sans
valider.

## Limites connues

- La validation se lit puis se réécrit (JSON entier) sans verrou : deux
  validations simultanées sur le même DUERP peuvent en perdre une. Effet : une
  étape à revalider d'un clic. Jugé acceptable ; un `jsonb_set` en SQL brut
  le corrigerait.
- Les DUERP existants repartent « à valider » : pas de reprise (production
  sans clients, données factices, 2026-10-08).
