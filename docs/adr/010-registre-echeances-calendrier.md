# ADR-010 — Registre de sources d'échéances du calendrier

Date : 2026-08-10
Statut : accepté — **amendé par l'ADR-017** (le permis de feu et le plan de
prévention ont quitté la famille `travaux` pour une famille `operations` ;
le tableau ci-dessous est à jour de cet amendement).

## Contexte

Le calendrier de la page « Vérifications périodiques » mêle désormais
plusieurs natures d'échéances (vérifications d'équipements, actions
correctives, signalements, mise à jour du DUERP, attestations
prestataires…), classées en **grandes familles** stables pensées pour un
dirigeant non-expert :

- `controle` — faire vérifier (vérifications périodiques, analyses
  légionelles) ;
- `travaux` (libellé « Corrections & réparations ») — réparer, corriger un
  écart constaté ;
- `operations` (libellé « Opérations encadrées ») — mener un chantier daté
  dont le préalable est obligatoire (ajoutée par l'ADR-017) ;
- `papiers` (libellé « Documents à renouveler ») — tenir ses documents à
  jour ;
- `personnel` — réservée aux modules à venir (visites médicales,
  formations, habilitations).

Première implémentation : une fonction unique qui interrogeait quatre
tables en dur. Chaque nouveau module porteur de dates (permis de feu,
plan de prévention, carnet sanitaire — et demain le suivi du personnel)
obligeait à retoucher cette fonction, avec le risque qu'un module
« oublie » de verser ses échéances : le calendrier aurait alors menti
par omission, ce que le produit s'interdit.

## Décision

**Toute échéance datée du produit passe par un registre de sources**
(`SOURCES_ECHEANCES`, `src/lib/calendrier/echeances.ts`) :

- une **source** = un module qui sait lister ses échéances datées, sous
  un format unique `EcheanceCalendrier` (famille, libellé, origine en
  langage courant, date, ton d'urgence, porte vers le module) ;
- l'agrégateur `listerAutresEcheances` ne fait qu'itérer le registre,
  fusionner et trier — il ne connaît aucun module ;
- l'aval est **piloté par la donnée** : le panneau de filtres, la
  légende et la liste ne montrent que les familles effectivement
  présentes. Brancher un module = écrire sa source + l'ajouter au
  registre, rien d'autre à retoucher.

Chaque classement par date est une **fonction pure testée** (horloge
injectée), conformément au principe zéro-IA / déterminisme.

## Sources branchées

| Source | Famille | Date | Règle |
|---|---|---|---|
| Vérifications périodiques | controle | `datePrevue` | moteur de matching (hors registre : flux historique dédié) |
| Analyse légionelles | controle | dernière analyse + 1 an | arrêté du 1er février 2010 (déjà cité au module) |
| Actions correctives | travaux | `echeance` | statuts ouverte / en cours |
| Permis de feu | operations | `dateDebut` | non terminés/annulés ; alerte si la date de début est passée sans être en cours |
| Plans de prévention | operations | `dateDebut` | opérations non finies ; alerte si commencé sans inspection commune (R. 4512-7) |
| Mise à jour DUERP | papiers | dernière version + 1 an | R. 4121-2 |
| Attestations prestataires | papiers | `valableJusquA` URSSAF / RC Pro | vigilance L. 8222-1 |

## Exclusions documentées (et pourquoi)

- **Relevés de température ECS** : rythme hebdomadaire (seuil produit
  `SEUIL_RELEVE_CARNET_JOURS` = 7 j) — trop fréquent pour un calendrier
  mensuel, suivi par le module et la matrice d'obligations.
- **Formation du personnel d'accueil (accessibilité)** et **maintenance
  des équipements d'accessibilité** : pas de périodicité légale unique
  vérifiable → pas d'échéance inventée (règle n°6 du projet).
- **Kbis** : informatif, sans date-cible (choix ADR-007 / vigilance).
- **Tokens d'accès, signatures** : dates techniques, pas des obligations.
- **Dépôt de l'Ad'AP** (`RegistreAccessibilite.dateDepotAdap`) et **date de
  l'attestation de conformité** (`.dateConformite`) : **des dates d'événement
  passé, pas des points de départ d'un rythme.** L'une horodate le dépôt d'un
  agenda d'accessibilité programmée, l'autre la délivrance d'une attestation ;
  ni l'une ni l'autre n'ouvre une périodicité. Leur donner une échéance
  demanderait d'inventer un intervalle qu'aucun texte relevé ne pose — pas
  d'échéance inventée (règle n°6 du projet).

  Le modèle le dit de lui-même : chaque colonne est saisie **une fois**, dans
  un formulaire qui ne demande aucun intervalle, et elle voyage avec la pièce
  qu'elle date (`agendaAdapCle`, `attestationCle`). Ce sont des pièces
  justificatives datées — le module Accessibilité les saisit et les affiche —
  et non des points de départ dont un rendez-vous suivant se déduirait. Rien
  dans le schéma, le formulaire ni le référentiel ne fournit l'intervalle
  qu'il faudrait pour en faire une source.

  *Ajoutées le 2026-08-28.* Les quatre colonnes datées de
  `RegistreAccessibilite` sont hors du registre de sources ; deux seulement
  étaient documentées ici (`dateDerniereFormation`,
  `dernierControleMaintenance`). Les deux autres étaient exactement le « champ
  date orphelin non documenté » que la dernière ligne de cet ADR qualifie de
  bug de revue. La règle a fini par s'appliquer à elle-même.

- **Péremption d'un équipement** (`Equipement.datePeremption`) : **une fin de
  vie, pas un rythme.** Elle est fixée par le FABRICANT, pas par un texte, et
  elle ne se répète jamais — l'objet est éliminé, il n'a pas de rendez-vous
  suivant. Elle n'ouvre donc aucune périodicité et n'est pas une source.

  Ce que le droit en fait est différent de ce qu'une échéance en ferait : le 3°
  de l'article 2 de l'arrêté du 19 mars 1993 demande au **vérificateur** de
  constater, pendant la vérification générale périodique, l'élimination des
  équipements de protection arrivés à péremption. La conséquence est donc déjà
  portée — par `epi-verification-generale-periodique` —, et poser en plus une
  ligne « remplacer l'équipement » l'aurait dédoublée. Sur les autres
  catégories, aucun texte relevé n'attache de conséquence à cette date : lui en
  donner une aurait inventé une règle (règle n°6 du projet).

  La fiche d'un équipement l'affiche — « Péremption mars 2031 », ou « Périmé
  depuis mars 2024 » quand elle est passée — et le formulaire dit en toutes
  lettres que Rojer n'alerte pas à cette date. Un fait daté qu'on montre n'est
  pas une échéance qu'on réclame, et la nuance est écrite là où le dirigeant la
  lit.

  *Ajoutée le 2026-09-04*, avec la colonne, et non après : c'est la réserve
  qu'un dépouillement avait comptée sur l'arrêté du 19 mars 1993 — la
  péremption existait dans le texte et nulle part dans le modèle.

## Conséquences

- Un futur module (ex. visites médicales) livre sa source avec sa
  famille (`personnel`) et apparaît partout d'un coup : calendrier,
  filtres, légende, liste.
- Le widget calendrier du board consomme le même format ; sa bascule
  vers les familles complètes reste à faire (décision d'affichage, pas
  d'architecture).
- Toute nouvelle colonne datée du schéma doit être soit branchée en
  source, soit ajoutée aux exclusions ci-dessus — un champ date orphelin
  non documenté est un bug de revue.
