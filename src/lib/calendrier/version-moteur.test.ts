import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  OBLIGATIONS_RETIREES,
  REFERENTIEL_VERSION,
  empreinteReferentiel,
} from "@/lib/referentiels/conformite";
import {
  SCEAU_CALENDRIER,
  VERSION_MOTEUR_CALENDRIER,
  sceauCalendrier,
} from "./version-moteur";

/**
 * Le rappel d'incrémenter `VERSION_MOTEUR_CALENDRIER` — posé le 2026-09-15
 * (`lot/fusibles-referentiel`).
 *
 * CE QU'IL VAUT, dit honnêtement : UN RAPPEL, pas une garantie. Il tombe dès que
 * le code du moteur change et pose la question — ce changement modifie-t-il ce
 * que la régénération écrit ? —, mais recopier le relevé sans incrémenter
 * laisse tout vert. Il ne sait pas juger ; il empêche seulement d'oublier de
 * se poser la question, ce que `REFERENTIEL_VERSION` avait fait le 2026-09-10.
 *
 * CE QUI EST RELEVÉ : la passe de régénération (`calendrier/actions.ts`) et
 * tout ce qu'elle importe à l'exécution dans `src/`, de proche en proche. La
 * liste se calcule, et un fichier y entre PAR DÉFAUT : un module que le moteur
 * se met à importer, ou qu'on extrait d'un module déjà relevé, est relevé sans
 * qu'on y pense. Chaque module est relevé TRANSPILÉ — types et commentaires
 * retirés —, si bien qu'un commentaire daté ou une annotation de type ne font
 * rien tomber.
 *
 * Une exception de forme : de `referentiels/conformite/index.ts`, qui mêle
 * code, données et `REFERENTIEL_VERSION`, on ne relève que les FONCTIONS — une
 * déclaration `function`, ou une constante qui vaut une fonction fléchée ou une
 * expression de fonction — que le moteur importe, et toute déclaration de
 * premier niveau qu'elles nomment, de proche en proche : aujourd'hui le cache
 * `let _index` et la liste `obligationsConformite`, que lit `obligationParId`.
 * Pas `REFERENTIEL_VERSION`, qui ferait tomber le test à chaque version ; pas
 * `obligationsParDomaine` ni `empreinteReferentiel`, que le moteur n'importe
 * pas (une empreinte qui calcule autrement change le sceau d'elle-même). Ses
 * imports, eux, sont suivis. Le repérage des noms est textuel : un nom cité
 * dans une chaîne est relevé pour rien, sans danger. S'y ajoute une DONNÉE que le
 * moteur lit et que l'empreinte ne hache pas : la table retiré → absorbant de
 * `OBLIGATIONS_RETIREES`, retraits sans absorbant exclus — le moteur les ignore.
 *
 * CE QUI NE L'EST PAS, et pourquoi — vérifié en lisant `empreinteReferentiel` :
 *  · les fichiers de DONNÉES du référentiel, nommés un par un dans
 *    `DONNEES_REFERENTIEL` : les domaines et `veille-textes.ts`. L'empreinte
 *    hache, par obligation, l'identifiant, la périodicité, `premierDelai`, le
 *    libellé, les réalisateurs, les typologies, les conditions, les catégories,
 *    le porteur, le contexte d'équipement et `succedeA` — sur la liste
 *    `obligationsConformite` telle qu'`index.ts` la compose, si bien que la
 *    composition elle-même est scellée. `veille-textes.ts` ne produit rien au
 *    calendrier. Un test fait tomber la liste si l'un de ses fichiers disparaît ;
 *  · `calendrier/version-moteur.ts`, qui porte la constante elle-même ;
 *  · l'accès aux données (`lib/prisma`) et la garde de session (`lib/auth/`),
 *    qui ne décident d'aucune ligne ; les imports de type seul ; les paquets.
 *
 * RELEVÉS SANS ÉCRIRE, et laissés : `rapports/schema.ts` et
 * `prescriptions/sources.ts` sont relevés en entier alors que le moteur n'en
 * lit qu'une part — `statutDepuisResultat` et `RESULTATS_REALISES`, qui
 * décident d'un statut écrit ; `estSourceContractuelle`, qui ne marque que des
 * raisons. Les écarter demanderait de relever par nom dans ces fichiers aussi,
 * ou une liste d'exclusion qu'un usage futur en écriture rendrait fausse sans
 * bruit. Le prix : ils peuvent faire tomber le test pour une retouche
 * d'affichage — réponse NON.
 *
 * Une montée de TypeScript, ou du lockfile qui le fixe, peut changer la sortie
 * du transpileur, donc le relevé, sans qu'aucune règle ait bougé : recopier le
 * relevé suffit.
 */

/** La racine du dépôt, depuis ce fichier — jamais le répertoire courant. */
const RACINE = fileURLToPath(new URL("../../..", import.meta.url));
const ENTREE = "src/lib/calendrier/actions.ts";
const INDEX_REFERENTIEL = "src/lib/referentiels/conformite/index.ts";

/**
 * Les fichiers de données du référentiel, que l'empreinte scelle. Une liste
 * EXPLICITE, et non « tout le dossier sauf… » : un fichier neuf sous
 * `conformite/` — du code extrait d'`index.ts`, par exemple — entre dans le
 * relevé par défaut au lieu d'en sortir en silence.
 */
const DONNEES_REFERENTIEL = [
  "aeration",
  "ascenseurs",
  "co-activite",
  "compactage-dechets",
  "cuisson-hotte",
  "eclairage",
  "electricite",
  "epi",
  "equipement-sous-pression",
  "formation-securite",
  "froid",
  "incendie",
  "information-travailleurs",
  "levage",
  "locaux-sociaux",
  "organisation-prevention",
  "portes-portails",
  "sante-travail",
  "secours",
  "signalisation",
  "stockage-dangereux",
  "veille-textes",
].map((nom) => `src/lib/referentiels/conformite/${nom}.ts`);

/** Chemins posix relatifs à la racine, séparateurs normalisés. */
function estHorsReleve(chemin: string): boolean {
  if (chemin === "src/lib/calendrier/version-moteur.ts") return true;
  if (DONNEES_REFERENTIEL.includes(chemin)) return true;
  return chemin === "src/lib/prisma.ts" || chemin.startsWith("src/lib/auth/");
}

/**
 * Le dernier relevé, et la version du moteur qu'il a servie. Un seul couple,
 * pas d'historique : `version-moteur.ts` dit ce que coûte un incrément, et le
 * message du test dit quand en faire un.
 */
const RELEVE = {
  version: 6,
  // Recopiée SANS incrément le 2026-10-17 (ADR-045, lot 1, plusieurs types
  // d'ERP) : `matchTypologie` évalue la typologie type par type et
  // `determineObligationsApplicables` résout les groupes exclusifs. Ce que la
  // régénération ÉCRIT ne change pour aucun dossier : la projection répond
  // `typesErpAutres: []` tant que la colonne n'existe pas (lot 2), et pour un
  // seul type la sortie est celle d'avant. Mesuré en appelant les deux
  // moteurs (`main` a6b2303a et le lot) sur 2 484 profils — 23 valeurs de
  // type, 6 de catégorie, 3 réponses sommeil, 3 de personnes présentes, avec
  // et sans parc —, 198 336 lignes comparées (identifiant, porteur,
  // équipements, questions sans réponse, effectif à confirmer) : zéro écart.
  // Le passage du référentiel à `2026-10-17.1` resynchronise déjà le parc.
  // ~~1171c8d71e8df5c5~~. Recopiée SANS incrément le même jour, deux fois :
  // le chemin mono-type passe l'établissement sans copie (~~894c53b2c805ef42~~),
  // puis la revue fait écrire le départage à rythme égal d'un groupe exclusif
  // (~~fcb84a3a65380209~~) — un groupe n'a jamais deux membres pour un seul
  // type, la régénération n'écrit rien d'autre.
  // Recalculée SANS incrément le 2026-10-12 à la réunion de
  // `lot/polir-relecture` (EPI déclaré, `6a4d02a8f770c62b`) et de
  // `lot/suites-0810` (SSI A/B, libellés, rythme en clair,
  // `a1418967cc88cc4f`) : chacune recopiait sans incrément, avec son motif
  // ci-dessous ; leur réunion ne change rien d'autre. ~~6a4d02a8f770c62b~~.
  // Recopiée SANS incrément le 2026-10-12 (relecture indépendante, B2) :
  // `referentiels/types-communs.ts` exporte `CATEGORIES_EPI` et
  // `estCategorieEpi`, lus par la seule `equipements/actions.ts` pour faire
  // passer `epiPresents` à vrai quand un EPI est déclaré. NON, la
  // régénération n'écrit pas autrement : ni le générateur, ni le
  // réconciliateur, ni le moteur ne les appellent ; c'est la RÉPONSE écrite
  // sur l'établissement qui change ensuite le calendrier, par la règle
  // existante. ~~e0d35b3f39ef01c3~~.
  // Recopiée SANS incrément le 2026-10-12 (`lot/suites-0810`, SSI A/B sur la
  // fiche) : `matching/engine.ts` lit le critère `ssiCategorieAouB` par
  // l'évaluateur des faits d'activité, `absence.ts` et `projection.ts`
  // portent l'attribut. NON, au sens de cette question : ce qui change les
  // lignes est une DONNÉE du référentiel (la triennale DF 10 § 3 change de
  // condition), et elle déplace l'empreinte (`2026-10-12.2`), donc le sceau —
  // chaque dossier sera réconcilié à sa prochaine ouverture. Précédent :
  // ADR-041 (C65). ~~25373a159ab4f97b~~.
  // Recopiée SANS incrément le 2026-10-12 (`lot/suites-0810`, libellés des
  // obligations retirées) : `OBLIGATIONS_RETIREES` gagne un `libelle` par
  // entrée, lu par `libelleObligationRetiree` (page des prescriptions) ; le
  // motif d'une prescription non retenue dit son rythme en clair. NON : le
  // générateur ne lit d'une obligation retirée que `absorbePar` et `porteur`,
  // inchangés. ~~6688d9fbaa6ff949~~.
  // Recopiée SANS incrément le 2026-10-12 (`lot/suites-0810`, suite de C62) :
  // `LABEL_PERIODICITE` sort de `labels.ts` vers le module feuille
  // `label-periodicite.ts`, que `matching/prescriptions.ts` lit pour dire en
  // clair le rythme de son motif de surcharge (« toutes les 6 semaines » au
  // lieu de « six_semaines »). NON, la régénération n'écrit pas autrement :
  // `surcharge.raison` rejoint `raisons`, qu'aucune colonne ne stocke ; la
  // périodicité écrite reste `surcharge.periodicite`. ~~e0d35b3f39ef01c3~~.
  // Recopiée SANS incrément le 2026-10-12 (ADR-043, ce qui manque à une
  // personne) : `mention-rythme.ts` exporte `delaiEnPhrase` (« 3 mois »),
  // lu par la seule fiche salarié. NON, la régénération n'écrit pas
  // autrement : la fonction n'est appelée ni par le générateur ni par le
  // réconciliateur, et le `premierDelai` posé sur deux titres salarié est une
  // DONNÉE, hachée par l'empreinte du référentiel (`2026-10-12.1`), que le
  // générateur des titres ne lit pas. ~~1d73fe41eeb7c14c~~.
  // Recalculée SANS incrément le 2026-10-12 à la réunion d'ADR-041 (#16,
  // faits d'activité, `34b84ee9a3627974` sur main) et d'ADR-042 (niveau
  // audit, `9ea22cc6ca8d74f9` sur sa branche) : chacune recopiait sans
  // incrément, chacune avec son motif ci-dessous ; la réunion des deux ne
  // change rien d'autre — `evaluerActivite` garde sa règle, la porte du
  // niveau audit passe avant toute typologie, et le critère des chiffons
  // que la réunion retire n'avait plus de porteuse.
  // Recopiée SANS incrément le 2026-10-08 (décisions de la propriétaire du
  // même jour, après ADR-042) : (1) `referentiels/conformite/index.ts` gagne
  // `nombreObligationsSuivies` et ses sœurs — des comptes d'affichage, que ni
  // le générateur ni le réconciliateur ne lisent ; (2) le moteur perd le
  // critère `chiffonsImpregnes` (`evaluerChiffonsImpregnes`), la projection et
  // `POLITIQUE_ABSENCE` le champ, `QuestionSansReponse` la marque. NON, la
  // régénération n'écrit pas autrement : la seule obligation qui portait le
  // critère est au niveau audit, que la porte de `evaluerObligation` écarte
  // avant toute typologie, et c'est un état permanent que le générateur saute.
  // Sa typologie neuve (`{ travail: true }`) est une DONNÉE, hachée par
  // l'empreinte du référentiel (`2026-10-08.4`, ligne réécrite, non servie).
  // Recopiée SANS incrément le 2026-10-08 (ADR-042, niveau audit) :
  // `evaluerObligation` écarte une obligation qui porte `niveau: "audit"`, le
  // générateur de titres aussi, et la passe ne la garde pas applicable par un
  // titre. NON, le CODE seul n'écrit pas autrement : sans le champ, chaque
  // branche rend ce qu'elle rendait. Ce qui écrit autrement, ce sont les trois
  // obligations qui le portent — une DONNÉE, que l'empreinte hache (segment
  // `niveau:audit`) : le passage du référentiel à `2026-10-08.4` déplace le
  // sceau et resynchronise déjà le parc (lignes archivées si elles portent une
  // trace, supprimées sinon — `niveau-audit.test.ts`). Relevé repris le même
  // jour : `passe.ts` et `salaries/catalogue.ts` importent `estNiveauAudit`
  // de son module plutôt que de l'index — même sortie.
  // Recopiée SANS incrément le 2026-10-08 (ADR-041, faits d'activité, livrée
  // après C66) : `matching/engine.ts` lit le critère `activite`, `absence.ts`
  // et `projection.ts` portent six attributs neufs. NON, la régénération
  // n'écrit pas autrement : les cinq obligations conditionnées sont à
  // `periodicite: "autre"` sans rythme retenu — le générateur n'en produit
  // aucune ligne. Précédent C37. Le critère déplace l'empreinte du
  // référentiel, donc le sceau.
  // Recopiée SANS incrément le 2026-10-08 (ADR-040, délai de grâce) :
  // `calendrier/grace.ts` entre au relevé, et `actions.ts` écrit
  // `graceJusquAu` dans le `createMany`. NON, la régénération n'écrit pas
  // autrement CE QUE CE RELEVÉ GARDE : mêmes lignes, mêmes dates, même statut,
  // même archivage — la colonne neuve n'est posée qu'à la naissance d'une
  // ligne, et aucun `update` n'y touche. Un incrément ne la rétro-remplirait
  // pas (les lignes existantes ne sont pas recréées) ; il ferait seulement de
  // la prochaine passe de chaque dossier une « reprise », ce que le passage du
  // référentiel de la relecture du préventeur fait déjà. La grâce est lue par
  // `delaiDeGrace` (`lib/dates/retard.ts`), une lecture, hors moteur.
  // Recopiée SANS incrément le 2026-10-07 (revue de la relecture du
  // préventeur, C61) : `matching/prescriptions.ts` écrit autrement le motif
  // d'une prescription écartée (face à un rythme retenu ; obligation retirée,
  // `matching/obligation-retiree.ts`) et lit pour cela `mention-rythme.ts`.
  // NON : `ignorees` n'est lu que par la page des prescriptions, aucune
  // ligne ni date n'est écrite autrement ; `PeriodiciteRetenue` est un type.
  // Recopiée SANS incrément le 2026-10-07 (ADR-039, lot relecture-jc-2) : le
  // générateur, le réconciliateur, les états permanents et les prescriptions
  // lisent désormais `periodiciteEffective(o)` au lieu de `o.periodicite`.
  // NON : aucune obligation livrée ne porte de `rythmeRetenu`, la fonction rend
  // donc partout `o.periodicite` — mêmes lignes, mêmes dates. Le lot 3, qui en
  // posera, déplacera l'empreinte du RÉFÉRENTIEL, donc le sceau. Une seule
  // règle écrit autrement dès aujourd'hui, et seulement face à un rythme
  // retenu : une prescription ÉGALE à lui s'applique (`prescriptionRenforce`) —
  // sans objet tant qu'aucun n'existe.
  // INCRÉMENTÉ le 2026-09-28 (D8, décision de la propriétaire) : le ponctuel
  // ouvert dont la mise en service précède l'origine est daté de l'origine.
  // OUI, cela écrit autrement : les lignes posées à une mise en service
  // antérieure au suivi sont redatées — en place, sans perte (test « D8 » de
  // `reconciliateur-bout-en-bout.test.ts`). Écriture en production à la
  // prochaine ouverture de chaque dossier concerné : à signaler à la
  // propriétaire avant de fusionner.
  // Recopiée SANS incrément le 2026-09-28 (contre-revue du lot 1) :
  // `absence.ts` importe `SEUIL_PERSONNES_R422734` au lieu de redéclarer 51.
  // NON : même valeur.
  // Recopiée SANS incrément (revue du lot 1) : `PLANCHER_EFFECTIF_PAR_CATEGORIE`
  // devient exporté, pour que la politique de l'absence déclare la borne basse
  // qu'elle exempte. NON : même valeur, mêmes branches.
  // Recopiée SANS incrément le 2026-09-27 (lot 2, maillon 3) : le total de
  // personnes présentes ne descend plus sous l'effectif du site. OUI, cela
  // peut écrire autrement (un exercice semestriel revient là où un nombre
  // déclaré trop bas l'avait écarté) — mais la version 5 n'a pas été livrée,
  // elle part avec le lot 1 : on y reste, comme la version 4 le 2026-09-20.
  // Recopiée SANS incrément le même jour (étape 6) : le moteur gagne le critère
  // `horsChampR422734` (R. 4227-37 al. 2), et le bloc du champ de R. 4227-34
  // cède la main au complément. NON : les deux seules obligations qui portent
  // ces critères neufs sont des états permanents, que le générateur saute ; le
  // bloc du champ rend le même verdict pour toute obligation qui existait.
  // Recopiée SANS incrément le même jour (étape 4) : le moteur lit les clés de
  // ses marques dans `matching/absence.ts` au lieu de les écrire en dur. NON :
  // mêmes clés, mêmes lignes, mêmes écritures — la garde générique le vérifie.
  // INCRÉMENTÉ le 2026-09-27 (décision de la propriétaire, option (i) de
  // `docs/revues/analyse-reponse-absente-2026-09-27.md`) : le silence sur les
  // matières de R. 4227-22 retient « à confirmer » au lieu de valoir « non ».
  // OUI, la régénération écrit autrement : tout établissement de travail sous
  // le seuil de R. 4227-34, muet sur la question, reçoit la ligne semestrielle
  // `incendie-travail-exercice-semestriel`. Les marques `personnes_presentes` et
  // `type_erp` ajoutées le même jour ne changent aucune ligne.
  // Voir le commentaire de `VERSION_MOTEUR_CALENDRIER`.
  // Recopiée SANS incrément le 2026-09-27 (C45, `lot/manques-encoder-annoncer`) :
  // le moteur gagne un critère, `chiffonsImpregnes` (`evaluerChiffonsImpregnes`),
  // et la projection un champ. NON, la régénération n'écrit pas autrement : la
  // seule obligation qui porte ce critère est un état permanent
  // (`periodicite: "autre"`), que le générateur saute (`estSansRendezVous`).
  // Le passage du référentiel à `2026-09-26.13` resynchronise déjà le parc.
  // Recopiée une seconde fois, SANS incrément, le même jour (contre-lecture de
  // C45, M1) : le moteur rend en plus `sansReponse`, les questions à trois
  // états restées muettes qui retiennent une ligne. Une métadonnée d'écran :
  // aucune ligne n'entre ni ne sort, aucune date ne bouge. NON.
  // Recopiée SANS incrément le 2026-09-26 (C37, `lot/effectif-entreprise`) :
  // les seuils d'entreprise se comparent à `Entreprise.effectif`. NON, la
  // régénération n'écrit pas autrement : les obligations d'établissement à
  // seuil sont des états permanents, que le générateur saute, et la
  // formation des élus naît des titres (contre-lecture : 256 couples, zéro
  // calendrier différent). Un incrément à 5, posé d'abord, a été retiré avant
  // livraison. Voir le commentaire de `VERSION_MOTEUR_CALENDRIER`.
  // Recopiée SANS incrément le même jour (seconde vérification C37) :
  // `matching/effectif-entreprise.ts` ne change que des PHRASES (le 6° de
  // L. 1111-3 borné à son terme, « notamment », la mention courte commune).
  // NON, la régénération n'écrit rien d'autre.
  // INCRÉMENTÉ le 2026-09-20 (décision de la propriétaire) : le silence sur
  // les locaux à sommeil ne retient plus que là où le sommeil est plausible.
  // OUI, la régénération écrit autrement : les ERP de 5ᵉ catégorie hors de ces
  // types, muets, perdent leurs quatre lignes « sommeil ». Voir le commentaire
  // de `VERSION_MOTEUR_CALENDRIER`.
  // Recopiée SANS incrément le même jour (revue du lot) : la règle devient
  // uniforme — hors liste, même un « oui » en base ne s'applique pas. La
  // version 4 n'avait pas été livrée : on y reste.
  // INCRÉMENTÉ le 2026-09-19 (ADR-036, lot 4 — la bascule) : la réconciliation
  // date chaque ligne par `echeanceDeLigne` au lieu de conserver la date en
  // base ; `decision-par-faits.ts` et `echeance-de-ligne.ts` entrent dans le
  // relevé par l'import de `generateur.ts`. OUI, la régénération écrit
  // autrement : voir le commentaire de `VERSION_MOTEUR_CALENDRIER`.
  // Recopiée SANS incrément le même jour (relecture du lot 4) : `garderLegs`
  // porté jusqu'à la boucle NB4. La bascule n'a jamais été livrée : on reste
  // en version 3.
  // Recopiée SANS incrément le 2026-09-19 (ADR-036, lot 5 — le ménage) : la
  // garde du legs est retirée. NON, la régénération n'écrit pas autrement sur
  // les dossiers réels : la garde ne changeait que le sort d'une ligne au
  // statut réalisé SANS rapport réalisé (ponctuel générée, ou `autre` en
  // boucle NB4), et d'une ligne cyclique non générée au statut réalisé — que
  // rien n'atteint, un titre cyclique ayant toujours une échéance. MESURÉ le
  // 2026-09-19 en production, en lecture seule, par le contrôle de santé de
  // CETTE branche (`comparerAuMoteur`, qui couvre aussi les lignes non
  // générées) sur les 4 établissements : `statut_seul` 0 — une ligne au statut
  // réalisé sans rapport réalisé y serait sortie —, `inexplique` 0, J+400 vide,
  // le dossier recalculé au moteur 3 identique ligne pour ligne. Et aucun
  // chemin n'en fabrique : un statut réalisé n'est écrit que depuis un rapport
  // réalisé, le retrait le rouvre (comme avant la bascule), un rapport ne se
  // dépose pas sur une ligne de salarié, les seeds n'écrivent aucun statut
  // réalisé et le générateur ne crée jamais de ligne `autre`.
  // Recopiée SANS incrément le même jour (lot 5, suite) : la couture part —
  // le réconciliateur appelle directement la seule décision qu'il prenait
  // déjà par défaut. NON : même décision, mêmes écritures.
  // Puis le deuxième argument mort du générateur (l'historique, refusé s'il
  // n'était pas vide) : NON, aucun appelant ne le remplissait.
  // Recopiée SANS incrément le 2026-09-19 (`lot/qualite-calendrier`, point 2) :
  // `dernierResultat` et `suiviDepuis` deviennent requis, leur absence lève au
  // lieu de retomber sur « conforme » et sur l'horloge. NON : `lireEntrees`
  // porte les deux sur chaque ligne (la colonne `suiviDepuis` est NOT NULL, le
  // résultat voyage avec la date du même rapport), donc aucun repli n'était
  // atteint en production ; seules des fixtures l'atteignaient.
  // Recopiée SANS incrément le même jour (point 3) : « un statut réalisé ne
  // survit pas sans rapport réalisé » sort de `statutDeLigneNonGeneree` dans
  // `reouvrirSansRapportRealise`, que `recalcul-ligne.ts` appelle aussi. NON :
  // la boucle NB4 rend le même statut dans chaque cas, branche pour branche.
  // Recopiée SANS incrément le même jour (point 4) : `deciderParFaits` et
  // `creerParFaits`, deux relais d'une ligne, sont inlinés ; la branche
  // `source === undefined`, morte, part. NON : mêmes appels, mêmes écritures.
  // Recopiée SANS incrément le même jour (point 5) : `derniere-realisation.ts`
  // gagne `ORDRE_RAPPORT_PLUS_RECENT`, que le moteur n'importe pas — il
  // départage toujours par `indexerDernieresRealisations`. NON.
  // Recopiée SANS incrément le 2026-09-20 (`lot/accueil-personnes-presentes`) :
  // `evaluerPersonnesPresentes` et ses deux tables sortent d'`engine.ts` vers
  // `matching/personnes-presentes.ts`, pour être chargeables par un écran. NON :
  // corps et gabarits de raison identiques au caractère près (contre-lecture,
  // diff ligne à ligne), et les raisons ne sont de toute façon pas persistées.
  // Le module entre au relevé avec `nombreDePersonnesADemander` et les mots de
  // la question : une retouche de ces textes déplacera l'empreinte sans toucher
  // un calendrier — recopier, ne pas incrémenter.
  // Recopiée SANS incrément le 2026-09-26 (`lot/sans-qualification`, C32) :
  // `MARQUAGE_CONTRACTUEL_LONG` (`prescriptions/sources.ts`) ne dit plus
  // « opposable par votre contrat d'assurance, pas par le droit ». NON :
  // affichage seul, jamais écrit par la régénération — lu par la fiche de
  // vérification et le formulaire des prescriptions, réexporté par
  // `prescriptions/schema.ts`, absent de `calendrier/` et de
  // `prescriptions/actions.ts` (décision de la session de coordination).
  // Recopiée SANS incrément le 2026-09-26 (`lot/referentiel-soeurs-incendie`,
  // C39) : la raison de `evaluerPersonnesPresentes` pour une 1ʳᵉ-3ᵉ catégorie
  // ne dit plus « le public admis […] franchi par le public seul » — R. 143-19
  // CCH classe d'après « l'effectif du public et du personnel » —, et la
  // constante se renomme `PLANCHER_EFFECTIF_PAR_CATEGORIE`. NON : mêmes
  // valeurs, mêmes branches, même état rendu ; seule une chaîne de `raisons`
  // change, et `raisons` n'est ni écrite par `calendrier/actions.ts` ni lue par
  // `reconciliation.ts` (grep du 2026-09-26 : le générateur la porte, rien ne
  // la persiste).
  // Recopiée SANS incrément le 2026-10-08 (C64, item A) : `engine.ts` lit
  // `siEquipementDeclare` (une obligation d'établissement qui n'existe que si
  // une catégorie est déclarée) et `index.ts` le fait entrer à l'empreinte du
  // référentiel. NON au sens de la question : sur le référentiel tel qu'il
  // était, le moteur rend exactement les mêmes lignes — la branche ne mord que
  // sur une obligation qui porte le champ, et la seule qui le porte est NEUVE,
  // ce qui déplace déjà l'empreinte du référentiel, donc le sceau. ~~b4984136384610af~~.
  // Recalculée SANS incrément le 2026-10-08 à la réunion de C63 (ADR-040,
  // délai de grâce : `5d02a6094169844b` sur sa branche) et de C64
  // (`8113bee280b53454` sur la sienne) : chacune recopiait sans incrément,
  // chacune avec son motif ; la réunion des deux ne change rien d'autre.
  // Recopiée SANS incrément le 2026-10-08 (C66, ADR-039 § 8) :
  // `rythme-retenu.ts` (`controlerRythmeRetenu`, règle 3 bis — le relevé du
  // préventeur) et `mention-rythme.ts` (la mention du relevé). NON : le
  // contrôle n'est appelé que par les tests, la mention n'est qu'affichée ;
  // le générateur lit toujours `periodiciteEffective`, inchangée. Ce qui
  // change les lignes — le rythme triennal du titre d'habilitation — est une
  // DONNÉE du référentiel, qui déplace son empreinte, donc le sceau.
  // ~~4b75258a15263110~~.
  // ~~ff1c3cda346da10d~~ (C66) ; ~~34b84ee9a3627974~~ (ADR-041, main) ;
  // ~~9ea22cc6ca8d74f9~~ (ADR-042, sa branche).
  // Recopiée SANS incrément le 2026-10-12 (`lot/polir-plans-permis-signatures`) :
  // `dates/index.ts` gagne `versSaisieDateHeure`, la réciproque de
  // `depuisSaisieDateHeure` qui remplit les écrans « Modifier » du plan et du
  // permis. NON : fonction AJOUTÉE, appelée par deux pages seulement, aucune
  // fonction existante n'est touchée — la régénération n'écrit rien d'autre.
  // ~~005b4fafbfab216a~~.
  // Recopiée SANS incrément le 2026-10-13 (`lot/securite-owasp-1013-asvs-
  // validation`, ASVS V2.2.1) : `dates/index.ts` gagne `estJourCivilReel`
  // (remonté de `prestataires/schema.ts`), `estSaisieDateHeureReelle` et
  // `formaterHeureFr` ; `rapports/schema.ts` refuse une date de rapport qui
  // n'existe pas. NON : fonctions AJOUTÉES, aucune existante touchée ; le
  // refus vaut à la SAISIE, la régénération ne relit pas ce schéma.
  // ~~7d1d30ef2861a9a2~~.
  // Recopiée SANS incrément le 2026-10-13 (`lot/dossier-relecture-2`) :
  // `matching/engine.ts` exporte `LIBELLE_ACTIVITE` et le type `FaitDeclare`,
  // lus par la seule ligne « Régime » de la grille de relecture
  // (`pdf/textes-grille-relecture.ts`). NON : deux mots-clés `export`, aucune
  // valeur ni règle touchée — la régénération n'écrit rien d'autre.
  // ~~7d1d30ef2861a9a2~~.
  // Recopiée SANS incrément le 2026-10-14 (intégration de
  // `lot/securite-owasp-1013` et `lot/dossier-relecture-2`) : la somme des deux
  // changements ci-dessus, aucun autre. ~~4943db84e624fce1~~ ~~7e3bde89eb15a58d~~.
  // Recopiée SANS incrément le 2026-10-14 (`lot/materiels-non-couverts-1014`) :
  // `referentiels/types-communs.ts` gagne la valeur `INSTALLATION_GAZ` dans
  // `CATEGORIES_EQUIPEMENT`, et `conformite/index.ts` passe à `2026-10-14.3` (numéro pris à l'intégration).
  // NON au sens de la question : aucune règle du moteur ne change ; ce qui
  // change les lignes est une DONNÉE — GZ 15 vise aussi la nouvelle
  // catégorie —, hachée par l'empreinte du référentiel, donc déjà dans le
  // sceau. Un dossier existant n'a aucun appareil de cette catégorie : sa
  // réconciliation ne pose aucune ligne nouvelle. ~~2689968acb89519c~~ (empreinte de ce lot seul, avant l'intégration de l'audit Next.js).
  // Recopiée SANS incrément le 2026-10-14, à l'intégration des lots du jour :
  // les deux lignées ci-dessus et ci-dessous se rejoignent ; même motif, NON.
  // ~~02fa4e7ac8212555~~ (bout de la lignée de l'audit Next.js).
  // Recopiée SANS incrément le 2026-10-14 (`lot/nextjs-client-1014`, audit
  // Next.js H1) : `estPeriodicitePlusStricte` passe, texte identique, de
  // `matching/prescriptions.ts` (qui la réexporte) à `calendrier/periodicite.ts`
  // — `periodicite.ts` ne tire plus le référentiel jusqu'aux composants
  // clients. NON : extraction, même fonction, mêmes appelants.
  // ~~a5d569d53f9b8b2b~~.
  // Recopiée SANS incrément le 2026-10-14 (`lot/nextjs-client-1014`, audit
  // Next.js M8) : `RESULTATS`, `RESULTATS_REALISES`, `STATUT_DEPUIS_RESULTAT`
  // et `statutDepuisResultat` passent, texte identique, de `rapports/schema.ts`
  // à `rapports/resultats.ts` (sans zod) ; le générateur, `decision-par-faits`,
  // `echeance-de-ligne` et `derniere-realisation` les y prennent. NON :
  // extraction, mêmes valeurs, mêmes appelants. ~~c8f112a346c9ac63~~.
  // Recopiée SANS incrément le 2026-10-14 (`lot/nextjs-client-1014`, audit
  // Next.js B1) : `calendrier/actions.ts` perd sa directive `"use server"` et
  // gagne `import "server-only"` — ses deux fonctions ne sont plus des
  // actions appelables depuis le navigateur. NON : aucune instruction de la
  // passe ne change. ~~adf2b7f801f974e6~~.
  // Recopiée SANS incrément le 2026-10-15 (`lot/dae-materiel-1015`) :
  // `referentiels/types-communs.ts` gagne la valeur `DEFIBRILLATEUR` dans
  // `CATEGORIES_EQUIPEMENT`, et `conformite/index.ts` passe à `2026-10-15.1`.
  // NON au sens de la question : aucune règle du moteur ne change. Ce qui
  // change les lignes — la maintenance et la déclaration Géo'DAE passent de
  // l'établissement à l'appareil — est une DONNÉE (porteur, catégories,
  // périodicité), hachée par l'empreinte du référentiel, donc déjà dans le
  // sceau : les dossiers ERP N1–N4 seront réconciliés au titre de
  // `2026-10-15.1`. ~~da691471f9fe392b~~.
  empreinte: "9811835e07535557",
};

const versPosix = (p: string) => p.split("\\").join("/");
const surDisque = (chemin: string) => posix.join(versPosix(RACINE), chemin);

function resoudre(depuis: string, specifieur: string): string | null {
  let base: string;
  if (specifieur.startsWith("@/")) {
    base = posix.join("src", specifieur.slice(2));
  } else if (specifieur.startsWith(".")) {
    base = posix.join(posix.dirname(depuis), specifieur);
  } else {
    return null; // un paquet
  }
  for (const candidat of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(surDisque(candidat))) return candidat;
  }
  return null;
}

function lire(chemin: string): ts.SourceFile {
  return ts.createSourceFile(
    chemin,
    readFileSync(surDisque(chemin), "utf8"),
    ts.ScriptTarget.Latest,
    false,
    chemin.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/**
 * Les déclarations de premier niveau d'un fichier, par nom, et lesquelles sont
 * des fonctions : `function`, ou constante qui vaut une fonction fléchée ou une
 * expression de fonction.
 */
function declarationsDe(source: ts.SourceFile): {
  textes: Map<string, string>;
  fonctions: Set<string>;
} {
  const textes = new Map<string, string>();
  const fonctions = new Set<string>();
  for (const instruction of source.statements) {
    if (ts.isFunctionDeclaration(instruction) && instruction.name) {
      textes.set(instruction.name.text, instruction.getText(source));
      fonctions.add(instruction.name.text);
    } else if (ts.isVariableStatement(instruction)) {
      for (const d of instruction.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        textes.set(d.name.text, instruction.getText(source));
        if (
          d.initializer !== undefined &&
          (ts.isArrowFunction(d.initializer) ||
            ts.isFunctionExpression(d.initializer))
        ) {
          fonctions.add(d.name.text);
        }
      }
    }
  }
  return { textes, fonctions };
}

/** Les noms qu'un texte cite — identifiants Unicode compris. */
const NOMS_CITES = /[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*/gu;

/**
 * Les fonctions d'`index.ts` que le moteur importe, et tout ce qu'elles nomment
 * au premier niveau du fichier — fonctions, cache (`let _index`), liste
 * (`obligationsConformite`) —, de proche en proche. Seules les FONCTIONS
 * importées servent de point de départ : une donnée importée par le moteur
 * (`OBLIGATIONS_RETIREES`) n'entre que si une fonction retenue la nomme.
 * `null` = toutes les fonctions (import par espace de noms).
 */
function fonctionsReleveesDeLIndex(
  source: ts.SourceFile,
  importees: Set<string> | null,
): string {
  const { textes, fonctions } = declarationsDe(source);
  const retenues = new Set<string>();
  const aVoir = [...(importees ?? fonctions)].filter((n) => fonctions.has(n));
  while (aVoir.length > 0) {
    const nom = aVoir.pop()!;
    const texte = textes.get(nom);
    if (texte === undefined || retenues.has(nom)) continue;
    retenues.add(nom);
    for (const mot of texte.match(NOMS_CITES) ?? []) {
      if (textes.has(mot) && !retenues.has(mot)) aVoir.push(mot);
    }
  }
  const releves = new Set([...retenues].sort().map((nom) => textes.get(nom)!));
  return [...releves].join("\n");
}

/**
 * Les noms qu'un import ou un réexport tire de son module, sous leur nom
 * D'ORIGINE (`{ a as b }` rend `a`). `null` = tout : `* as`, `export *`, ou
 * import sans liaison nommée.
 */
function nomsLies(
  instruction: ts.ImportDeclaration | ts.ExportDeclaration,
): string[] | null {
  const liaisons = ts.isImportDeclaration(instruction)
    ? instruction.importClause?.namedBindings
    : instruction.exportClause;
  if (
    liaisons === undefined ||
    ts.isNamespaceImport(liaisons) ||
    ts.isNamespaceExport(liaisons)
  ) {
    return null;
  }
  return liaisons.elements
    .filter((e) => !e.isTypeOnly)
    .map((e) => (e.propertyName ?? e.name).text);
}

/** Les modules du moteur, de proche en proche depuis la passe de régénération. */
function modulesDuMoteur(): Map<string, string> {
  const sources = new Map<string, ts.SourceFile>();
  // Ce que les modules relevés importent d'`index.ts`, par nom.
  let importeesDeLIndex: Set<string> | null = new Set();
  const aVisiter = [ENTREE];
  while (aVisiter.length > 0) {
    const chemin = versPosix(aVisiter.pop()!);
    if (sources.has(chemin) || estHorsReleve(chemin)) continue;
    const source = lire(chemin);
    sources.set(chemin, source);
    for (const instruction of source.statements) {
      const estImport =
        ts.isImportDeclaration(instruction) &&
        !instruction.importClause?.isTypeOnly;
      const estReexport =
        ts.isExportDeclaration(instruction) && !instruction.isTypeOnly;
      if (!estImport && !estReexport) continue;
      const specifieur = instruction.moduleSpecifier;
      if (specifieur === undefined || !ts.isStringLiteral(specifieur)) continue;
      const cible = resoudre(chemin, specifieur.text);
      if (cible === null) continue;
      aVisiter.push(cible);
      if (cible !== INDEX_REFERENTIEL || chemin === INDEX_REFERENTIEL) continue;
      const noms = nomsLies(instruction);
      if (noms === null) importeesDeLIndex = null;
      else if (importeesDeLIndex !== null) {
        for (const nom of noms) importeesDeLIndex.add(nom);
      }
    }
  }
  const textes = new Map<string, string>();
  for (const [chemin, source] of sources) {
    textes.set(
      chemin,
      chemin === INDEX_REFERENTIEL
        ? fonctionsReleveesDeLIndex(source, importeesDeLIndex)
        : source.getFullText(),
    );
  }
  return textes;
}

function releverLeMoteur(): { empreinte: string; modules: string[] } {
  const modules = [...modulesDuMoteur()].sort(([a], [b]) => (a < b ? -1 : 1));
  const hachage = createHash("sha256");
  for (const [chemin, texte] of modules) {
    const { outputText } = ts.transpileModule(texte, {
      fileName: chemin,
      compilerOptions: {
        removeComments: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.Preserve,
      },
    });
    hachage.update(`${chemin}\n${outputText}\n`);
  }
  // La donnée que le moteur lit hors empreinte (`SUCCESSIONS_DECLAREES`).
  // Les retraits SANS absorbant n'y entrent pas : le moteur les ignore.
  const successions = Object.entries(OBLIGATIONS_RETIREES)
    .filter(([, r]) => r.absorbePar !== null)
    .map(([id, r]) => `${id}>${r.absorbePar}`)
    .sort();
  hachage.update(`OBLIGATIONS_RETIREES.absorbePar\n${successions.join("\n")}\n`);
  return {
    empreinte: hachage.digest("hex").slice(0, 16),
    modules: modules.map(([chemin]) => chemin),
  };
}

describe("VERSION_MOTEUR_CALENDRIER — le code du moteur scelle aussi le calendrier", () => {
  it("le code du moteur est celui du dernier relevé", () => {
    const { empreinte, modules } = releverLeMoteur();
    expect(
      empreinte,
      "LE CODE DU MOTEUR DE CALENDRIER A CHANGÉ (hors commentaires et types), " +
        "ou la table des absorbants. Question à trancher avant de recopier quoi " +
        "que ce soit : ce changement modifie-t-il CE QUE LA RÉGÉNÉRATION ÉCRIT " +
        "sur un dossier existant — quelles lignes existent, leurs dates, leur " +
        "statut, leur archivage ?\n" +
        "  · OUI : incrémentez `VERSION_MOTEUR_CALENDRIER` " +
        "(`src/lib/calendrier/version-moteur.ts`) et `RELEVE.version`, puis " +
        "recopiez l'empreinte reçue dans `RELEVE.empreinte`. Tous les dossiers " +
        "seront régénérés à leur prochaine ouverture : une écriture en " +
        "production, à signaler à la propriétaire avant de fusionner.\n" +
        "  · NON (renommage, extraction, affichage) : recopiez l'empreinte seule.\n" +
        "  · Un fichier de DONNÉES neuf du référentiel figure dans les modules " +
        "relevés : ajoutez-le à `DONNEES_REFERENTIEL`, ne recopiez pas.\n" +
        "  · Une montée de TypeScript ou du lockfile peut aussi le faire tomber sans " +
        "qu'aucune règle ait changé : c'est NON.\n" +
        "  · Un absorbant modifié AVEC le retrait d'une obligation déplace déjà " +
        "l'empreinte du référentiel, donc le sceau : l'incrément y est superflu, " +
        "sans danger.\n" +
        `Modules relevés : ${modules.join(", ")}.`,
    ).toBe(RELEVE.empreinte);
  });

  it("le relevé couvre les tables de périodicité et le code du porteur", () => {
    // Le trou de la première version (relecture du 2026-09-15) : tout
    // `lib/referentiels/` était exclu, au motif que l'empreinte le scelle. Elle
    // ne hache que la CHAÎNE `o.periodicite` : `triennale` passé de 36 à 30 mois
    // dans `PERIODICITE_CALENDAIRE` ne bougeait rien.
    const { modules } = releverLeMoteur();
    expect(modules).toContain("src/lib/referentiels/types-communs.ts");
    expect(modules).toContain("src/lib/referentiels/conformite/types.ts");
    expect(modules).toContain("src/lib/calendrier/generateur.ts");
    expect(modules).toContain("src/lib/referentiels/conformite/index.ts");
    expect(modules).not.toContain("src/lib/calendrier/version-moteur.ts");
  });

  it("de l'index du référentiel, seules les fonctions que le moteur importe sont relevées", () => {
    const index = modulesDuMoteur().get(INDEX_REFERENTIEL) ?? "";
    expect(index).toContain("function obligationParId");
    // Ce que `obligationParId` lit au premier niveau.
    expect(index).toContain("let _index");
    expect(index).toContain("const obligationsConformite");
    expect(index).not.toContain("obligationsParDomaine");
    expect(index).not.toContain("function empreinteReferentiel");
    expect(index).not.toContain("REFERENTIEL_VERSION");
  });

  it("de l'index, une fonction appelée par une fonction importée est relevée, fléchée comprise", () => {
    const source = ts.createSourceFile(
      "index.ts",
      [
        "const aide = (id: string) => id.trim();",
        "const expression = function (x: number) { return x; };",
        "export function importee(id: string) { return aide(id); }",
        "export function inutile() { return expression(1); }",
        "let mémoire: Map<string, string> | null = null;",
        "export function lireMémoire() { return mémoire; }",
      ].join("\n"),
      ts.ScriptTarget.Latest,
    );
    const releve = fonctionsReleveesDeLIndex(source, new Set(["importee"]));
    expect(releve).toContain("function importee");
    expect(releve).toContain("const aide");
    expect(releve).not.toContain("inutile");
    expect(releve).not.toContain("expression");
    expect(releve).not.toContain("let mémoire");
    // Une déclaration non fonction, nommée par une fonction retenue — et un
    // identifiant accentué, que le repérage ASCII coupait en deux.
    expect(
      fonctionsReleveesDeLIndex(source, new Set(["lireMémoire"])),
    ).toContain("let mémoire");
    expect(fonctionsReleveesDeLIndex(source, null)).toContain("const expression");
  });

  it("les noms liés suivent le nom d'origine, et `* as` comme `export *` valent tout", () => {
    const source = ts.createSourceFile(
      "m.ts",
      [
        'import { obligationParId as parId, type Obligation } from "x";',
        'export { obligationsConformite as liste } from "x";',
        'import * as ref from "x";',
        'export * from "x";',
      ].join("\n"),
      ts.ScriptTarget.Latest,
    );
    const [renomme, reexport, espace, tout] = source.statements as unknown as [
      ts.ImportDeclaration,
      ts.ExportDeclaration,
      ts.ImportDeclaration,
      ts.ExportDeclaration,
    ];
    expect(nomsLies(renomme)).toEqual(["obligationParId"]);
    expect(nomsLies(reexport)).toEqual(["obligationsConformite"]);
    expect(nomsLies(espace)).toBeNull();
    expect(nomsLies(tout)).toBeNull();
  });

  it("aucun fichier de données exclu ne porte de fonction ni d'import de valeur", () => {
    // La liste d'exclusion ne vaut que si ses fichiers ne sont QUE des données :
    // du code qui s'y glisserait sortirait du relevé en silence.
    const fautes = DONNEES_REFERENTIEL.filter((c) =>
      existsSync(surDisque(c)),
    ).flatMap((chemin) => {
      const trouve = new Set<string>();
      const visiter = (n: ts.Node) => {
        if (
          ts.isFunctionDeclaration(n) ||
          ts.isFunctionExpression(n) ||
          ts.isArrowFunction(n) ||
          ts.isMethodDeclaration(n)
        ) {
          trouve.add(`${chemin} : fonction`);
        }
        const importDeValeur =
          ts.isImportDeclaration(n) &&
          !n.importClause?.isTypeOnly &&
          (nomsLies(n)?.length ?? 1) > 0;
        const reexportDeValeur =
          ts.isExportDeclaration(n) &&
          n.moduleSpecifier !== undefined &&
          !n.isTypeOnly;
        if (importDeValeur || reexportDeValeur) {
          trouve.add(`${chemin} : import de valeur`);
        }
        ts.forEachChild(n, visiter);
      };
      visiter(lire(chemin));
      return [...trouve];
    });
    expect(
      fautes,
      "Un fichier de `DONNEES_REFERENTIEL` porte du code : retirez-le de la " +
        "liste (il sera relevé), ou sortez le code dans un module relevé.",
    ).toEqual([]);
  });

  it("chaque fichier de données exclu du relevé existe encore", () => {
    // Sans ceci, la liste pourrit : un fichier renommé y resterait nommé pour
    // rien, et son successeur — relevé par défaut — ferait tomber le test sans
    // que personne ne comprenne pourquoi.
    const disparus = DONNEES_REFERENTIEL.filter((c) => !existsSync(surDisque(c)));
    expect(
      disparus,
      "Un fichier de `DONNEES_REFERENTIEL` n'existe plus : retirez-le de la liste, " +
        "et ajoutez son successeur s'il ne porte que des données.",
    ).toEqual([]);
  });

  it("la version du moteur est celle du dernier relevé", () => {
    expect(
      VERSION_MOTEUR_CALENDRIER,
      "`VERSION_MOTEUR_CALENDRIER` et `RELEVE.version` doivent bouger ensemble, " +
        "avec l'empreinte du code qui a motivé l'incrément.",
    ).toBe(RELEVE.version);
  });

  it("le sceau posé sur les calendriers porte la version du moteur", () => {
    // Sans ceci, la constante pourrait être incrémentée sans que le sceau la
    // lise — le trou exact qu'elle ferme, rouvert en silence.
    expect(SCEAU_CALENDRIER).toBe(
      sceauCalendrier(
        REFERENTIEL_VERSION,
        empreinteReferentiel(),
        VERSION_MOTEUR_CALENDRIER,
      ),
    );
  });

  it("le moteur 0 garde la forme d'avant, tout moteur suivant la change", () => {
    // Le moteur 0 est celui que les bases portent déjà : livrer la constante ne
    // désynchronise rien. Le premier incrément, lui, doit désynchroniser tout
    // le parc — et deux incréments ne doivent pas se confondre.
    expect(sceauCalendrier("2026-09-11.1", "154-abc", 0)).toBe(
      "2026-09-11.1+154-abc",
    );
    const un = sceauCalendrier("2026-09-11.1", "154-abc", 1);
    const deux = sceauCalendrier("2026-09-11.1", "154-abc", 2);
    expect(un).not.toBe("2026-09-11.1+154-abc");
    expect(un.startsWith("2026-09-11.1+154-abc")).toBe(true);
    expect(deux).not.toBe(un);
  });
});
