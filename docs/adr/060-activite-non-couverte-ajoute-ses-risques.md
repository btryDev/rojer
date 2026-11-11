# ADR-060 — Un « oui » à une activité hors référentiel ajoute ses risques à évaluer

- **Statut** : acceptée, 2026-11-11 (décision de la propriétaire : « si en
  termes de réglementation légale on est ok et que c'est plus simple pour
  l'utilisateur, fonce »)
- **Portée** : `ActiviteNonCouverte.aFaire` (`src/lib/referentiels/types.ts`
  et les trois référentiels sectoriels), `UniteTravail.activiteId` et
  `Risque.activiteId` (`prisma/schema.prisma`), `src/lib/activites/ajouts.ts`,
  `repondreActivite` (`src/lib/activites/actions.ts`), `choisirSecteur`
  (`src/lib/duerps/actions.ts`)
- **Amende** l'ADR-020 sur un point : « répondre oui […] n'ajoute aucun
  risque ». Le reste de l'ADR-020 est inchangé : la mention de couverture
  partielle (`cequiManque`, `pourquoi`) s'imprime toujours, telle quelle.

## Le problème

Après un « oui », l'écran disait « Non couvert par votre secteur : … » et
« Créez au besoin une unité de travail dédiée à l'étape suivante ». Retour de
la propriétaire : on a l'impression que Rojer ne gère pas l'activité et laisse
le dirigeant se débrouiller ; et « une unité dédiée », laquelle ?

## La décision

Au « oui », Rojer ajoute lui-même au DUERP ce qu'il faut évaluer :

1. **L'unité.** Une unité dédiée (`aFaire.uniteDediee`, ex. « Laboratoire de
   découpe ») s'il reste une place sous la limite d'unités de la formule
   (`placesSousLePlafond`, ADR-053 : 3 pendant l'essai, sans limite ensuite).
   Sinon — ou si l'activité n'a pas de lieu propre (la caisse d'un
   restaurant) — l'unité type existante désignée (`aFaire.uniteExistante`),
   retrouvée par `referentielUniteId`. Si l'activité a déjà des ajouts (un
   « non » en a gardé), c'est leur unité qui est reprise. Sans aucune de ces
   unités (limite atteinte et unité type supprimée), **rien n'est ajouté** :
   l'unité « Risques transverses » ne porte que les risques des questions
   transverses, jamais ceux d'une activité. L'écran le dit et rend la liste
   des risques à ajouter à la main.
2. **Les risques.** Deux à quatre risques personnalisés (`aFaire.risques`),
   **non cotés** (`cotationSaisie: false`, cotation par défaut d'un risque
   personnalisé) et **sans mesure proposée**.
3. **Les étapes « Unités » et « Risques » repassent « à valider »**
   (ADR-059) : ce qui vient d'arriver, personne ne l'a relu.

Au « non » ou au retour au silence, Rojer retire ce qu'il a ajouté **et que
le dirigeant n'a pas touché** : un risque qui ne porte que ce que Rojer y a
mis — libellé d'origine, ni cotation saisie, ni action, ni description, ni
nombre d'exposés, ni date de mesures, ni exposition CMR ; puis l'unité créée
pour l'activité si elle est vide, sans justification « aucun risque », et
sous son nom et sa description d'origine. Le reste est gardé, et l'écran le
dit. Un nouveau « oui » rend ce qui manque, sans doubler ce qui est resté.
Un changement de secteur retire de même les ajouts de toutes les activités
connues hors du nouveau secteur, avant le pré-remplissage (ce qui sort
libère la limite de l'essai).

Les questions transverses que l'activité appelle (`aFaire.questionsTransverses`,
ex. « travail seul » pour une ouverture par un salarié seul) ne sont **pas**
répondues à la place du dirigeant : ce sont des faits qu'il est seul à
connaître. L'écran les lui signale.

## Pourquoi c'est conforme

Le DUERP reste l'évaluation de l'employeur (L. 4121-3, R. 4121-1) : Rojer
propose des lignes à évaluer, exactement comme les risques types du
référentiel. Rien n'est coté à sa place, chaque ligne se supprime, et le
document continue de nommer l'activité et ce que l'évaluation type ne décrit
pas.

## Rien d'inventé

- Chaque libellé de `aFaire.risques` est un découpage de `cequiManque`, déjà
  sourcé (INRS) ; aucune autre source.
- Aucune gravité ni probabilité n'est proposée : aucune source ne les donne
  pour ces risques. La cotation par défaut est celle de tout risque
  personnalisé (2/2/2, non saisie), qui compte « à coter ».
- Le nom d'une unité dédiée reprend le lieu que `cequiManque` nomme
  (« laboratoire de découpe », « banc de marée ») ou l'unité OiRA citée en
  source (« Interventions chez les clients »).

## Ce qui ne bouge pas

- `cequiManque` et `pourquoi`, au PDF et à la synthèse.
- Le snapshot de couverture (`figerCouverture`) : `aFaire` n'y entre pas.
  Les risques ajoutés entrent dans le snapshot comme tout risque retenu.
- Les référentiels sectoriels n'ont ni empreinte ni version : rien à
  incrémenter.

## Identification

`activiteId` sur `UniteTravail` et `Risque` : l'origine d'un ajout, lue pour
l'idempotence, l'affichage (« Nous avons ajouté… ») et le retrait. Index
uniques `(duerpId, activiteId)` et `(uniteId, activiteId, libelle)` : un
double « oui » ne crée rien deux fois (PostgreSQL tient les `NULL` pour
distincts, les lignes saisies à la main ne sont pas contraintes).
