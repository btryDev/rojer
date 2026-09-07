// Les corpus déclarés, et ce que leur dépouillement permet d'affirmer.

import { obligationsConformite } from "../conformite";
import { ARRETE_1980_LIVRE_1 } from "./arrete-1980-livre-1";
import { ARRETE_1980_LIVRE_2 } from "./arrete-1980-livre-2";
import { CORPUS_PE } from "./arrete-1980-livre-3";
import { ARRETE_2011_12_14_ECLAIRAGE } from "./arrete-2011-12-14-eclairage";
import { ARRETE_2011_12_30_IGH } from "./arrete-2011-12-30-igh";
import { CCH_CLASSEMENT_ERP_IGH } from "./cch-classement-erp-igh";
import { CCH_REGISTRE_SECURITE } from "./cch-registre-securite";
import { CODE_TRAVAIL_INCENDIE } from "./code-travail-incendie";
import { ARRETE_2004_03_01_LEVAGE } from "./arrete-2004-03-01-levage";
import { ARRETE_1993_03_05_MACHINES } from "./arrete-1993-03-05-machines";
import { ARRETE_2011_12_26_ELECTRICITE } from "./arrete-2011-12-26-electricite";
import { ARRETE_1980_LIVRE_4_PARCS } from "./arrete-1980-livre-4-parcs";
import { ARRETE_1987_10_08_AERATION } from "./arrete-1987-10-08-aeration";
import { ARRETE_1993_11_04_SIGNALISATION } from "./arrete-1993-11-04-signalisation";
import { ARRETE_1993_12_21_PORTES } from "./arrete-1993-12-21-portes";
import { ARRETE_1986_HABITATION } from "./arrete-1986-habitation";
import {
  ARRETE_2021_09_10_RETOURS_EAU,
  CSP_EAU_POTABLE,
} from "./csp-eau-potable";
import { ARRETE_2018_02_23_GAZ_HABITATION } from "./arrete-2018-02-23-gaz-habitation";
import { ARRETES_ASCENSEURS } from "./arretes-ascenseurs";
import { ARRETES_MODIFICATIFS_ERP } from "./arretes-modificatifs-erp";
import { CCH_ASCENSEURS } from "./cch-ascenseurs";
import { CODE_TRAVAIL_PORTES } from "./code-travail-portes";
import { CODE_TRAVAIL_ELECTRICITE } from "./code-travail-electricite";
import { CODE_TRAVAIL_RISQUE_CHIMIQUE } from "./code-travail-risque-chimique";
import { CODE_TRAVAIL_EQUIPEMENTS_INFORMATION } from "./code-travail-equipements-information";
import { ESP_SUIVI_EN_SERVICE } from "./esp-suivi-en-service";
import { ICPE_STOCKAGE } from "./icpe-stockage";
import { INRS_DOCUMENTAIRE } from "./inrs-documentaire";
import { CODE_TRAVAIL_LEVAGE } from "./code-travail-levage";
import { FROID_FLUIDES } from "./froid-fluides";
import { CODE_TRAVAIL_FORMATION_SECURITE } from "./code-travail-formation-securite";
import { CODE_TRAVAIL_SANTE_TRAVAIL } from "./code-travail-sante-travail";
import { CODE_TRAVAIL_SECOURS } from "./code-travail-secours";
import { CODE_TRAVAIL_CONDUITE } from "./code-travail-conduite";
import { CODE_TRAVAIL_ORGANISATION_PREVENTION } from "./code-travail-organisation-prevention";
import { CODE_TRAVAIL_INFORMATION_TRAVAILLEURS } from "./code-travail-information-travailleurs";
import { CODE_TRAVAIL_LOCAUX_SOCIAUX } from "./code-travail-locaux-sociaux";
import { CODE_TRAVAIL_CO_ACTIVITE } from "./code-travail-co-activite";
import { CODE_TRAVAIL_PLAN_PREVENTION } from "./code-travail-plan-prevention";
import { CODE_TRAVAIL_SERVICE_PREVENTION_SANTE } from "./code-travail-service-prevention-sante";
import { CODE_TRAVAIL_MANUTENTION_ECRAN } from "./code-travail-manutention-ecran";
import {
  CODE_TRAVAIL_DUERP,
  CODE_TRAVAIL_DUERP_PRINCIPES,
} from "./code-travail-duerp";
import {
  ARRETE_2004_12_21_ECHAFAUDAGES,
  CODE_TRAVAIL_TRAVAIL_EN_HAUTEUR,
} from "./code-travail-travail-en-hauteur";
import {
  CODE_TRAVAIL_TRAVAIL_DISSIMULE,
  CODE_TRAVAIL_VIGILANCE,
  CODE_TRAVAIL_VIGILANCE_MODALITES,
} from "./code-travail-vigilance";
import { CODE_TRAVAIL_ECLAIRAGE } from "./code-travail-eclairage";
import { CODE_TRAVAIL_BRUIT_VIBRATIONS } from "./code-travail-bruit-vibrations";
import { CODE_TRAVAIL_MATIERES_INFLAMMABLES } from "./code-travail-matieres-inflammables";
import { ARRETE_1993_03_19_TRAVAUX_DANGEREUX } from "./arrete-1993-03-19-travaux-dangereux";
import { ARRETE_1993_03_19_EPI } from "./arrete-1993-03-19-epi";
import {
  CODE_TRAVAIL_EPI,
  CODE_TRAVAIL_EPI_AMONT,
} from "./code-travail-epi";
import {
  ARRETE_2017_04_19_REGISTRE_ACCESSIBILITE,
  CASF_DEFINITION_HANDICAP,
  CCH_REGISTRE_ACCESSIBILITE,
} from "./accessibilite-handicap";
import {
  couverture,
  type ArticleDepouille,
  type Corpus,
  type CouvertureCorpus,
} from "./types";

export * from "./types";
export * from "./perimetre";

/**
 * Les corpus dépouillés, ou en cours de dépouillement.
 *
 * Chaque corpus ajouté rétrécit la part du référentiel qui repose sur des
 * textes qu'on n'a jamais déclaré avoir lus. Ce qui n'y figure pas n'a pas été
 * parcouru de bout en bout — et le dire est le seul moyen de le savoir.
 */
export const CORPUS: readonly Corpus[] = [
  CORPUS_PE,
  // Le Livre Ier, qui gouverne les deux autres : GN 1 porte la nomenclature
  // des types dont `TypeErp` est le reflet (`types-erp.test.ts`).
  ARRETE_1980_LIVRE_1,
  ARRETE_1980_LIVRE_2,
  CODE_TRAVAIL_INCENDIE,
  CCH_REGISTRE_SECURITE,
  ARRETE_2011_12_14_ECLAIRAGE,
  ARRETE_2011_12_30_IGH,
  FROID_FLUIDES,
  CODE_TRAVAIL_LEVAGE,
  ARRETE_2004_03_01_LEVAGE,
  CODE_TRAVAIL_ELECTRICITE,
  ARRETE_2011_12_26_ELECTRICITE,
  CODE_TRAVAIL_RISQUE_CHIMIQUE,
  // Section 1 du chapitre III (équipements de travail) : `R. 4323-1` y a été
  // déplacé le 2026-09-01, il était rangé au risque chimique.
  CODE_TRAVAIL_EQUIPEMENTS_INFORMATION,
  ESP_SUIVI_EN_SERVICE,
  ICPE_STOCKAGE,
  ARRETE_1987_10_08_AERATION,
  CCH_ASCENSEURS,
  ARRETES_ASCENSEURS,
  CODE_TRAVAIL_PORTES,
  ARRETE_1993_12_21_PORTES,
  ARRETE_1980_LIVRE_4_PARCS,
  ARRETE_2018_02_23_GAZ_HABITATION,
  INRS_DOCUMENTAIRE,
  ARRETES_MODIFICATIFS_ERP,
  // Lot 7 — les textes qui portent les obligations de salarié.
  CODE_TRAVAIL_FORMATION_SECURITE,
  CODE_TRAVAIL_SANTE_TRAVAIL,
  CODE_TRAVAIL_SECOURS,
  CODE_TRAVAIL_CONDUITE,
  // Lot 8 — les textes du socle de l'employeur, de l'effectif et de la
  // co-activité. Aucun n'est intégral : chacun dit, dans sa `portee`, ce qu'il
  // laisse non lu du chapitre dont il est tiré.
  CODE_TRAVAIL_ORGANISATION_PREVENTION,
  CODE_TRAVAIL_INFORMATION_TRAVAILLEURS,
  CODE_TRAVAIL_LOCAUX_SOCIAUX,
  CODE_TRAVAIL_CO_ACTIVITE,
  CODE_TRAVAIL_SERVICE_PREVENTION_SANTE,
  CODE_TRAVAIL_MANUTENTION_ECRAN,
  // Lot D1 — le travail en hauteur, qui n'avait aucune entrée de corpus ni
  // aucune citation au référentiel avant le 2026-09-01. Le premier corpus est
  // le seul du dépôt à couvrir une SECTION entière de code : ses 33 articles
  // sur 33. Le second porte les trois seules périodicités opposables du
  // domaine, dont aucune ne figure dans le Code.
  CODE_TRAVAIL_TRAVAIL_EN_HAUTEUR,
  ARRETE_2004_12_21_ECHAFAUDAGES,
  // Lot B2 — l'arrêté qui DÉFINIT les familles d'habitation, et que ce dépôt
  // n'avait jamais ouvert : zéro occurrence avant le 2026-09-01, alors que
  // l'enum `FamilleHabitation` en était tirée et que neuf obligations
  // portaient déjà la typologie `habitation`.
  ARRETE_1986_HABITATION,
  // Lot machines — la SECONDE branche de l'habilitation de `R. 4323-23`,
  // ouverte le 2026-09-02. Le dépôt n'avait instruit cet article que par son
  // arrêté de levage ; celui du 5 mars 1993 soumet à vérification générale
  // périodique une liste de machines qui n'en sont pas, et deux d'entre elles
  // — presse à balles et compacteur à déchets — sont des équipements
  // ordinaires du commerce de détail. Premier corpus `integral` de ce dépôt
  // pris sur un arrêté LODA : cinq articles sur cinq.
  ARRETE_1993_03_05_MACHINES,
  // Lot « signalisation », 2026-09-02 — l'arrêté du 4 novembre 1993, jamais
  // ouvert alors qu'il gouverne tout le domaine : aucune des obligations
  // livrées ne vise la signalisation de sécurité, sous aucun porteur. Le guide
  // professionnel qui a déclenché le lot a RAISON sur ses deux chiffres et
  // FAUX sur l'assiette du premier : le semestre de l'article 15 ne porte pas
  // sur « les moyens et dispositifs de signalisation » — panneaux, couleurs,
  // bandes jaune et noir, l'essentiel du parc d'un restaurant — mais sur les
  // seuls signaux LUMINEUX et ACOUSTIQUES, ceux qui se déclenchent. Sur les
  // autres, le texte n'impose qu'un entretien « régulier », sans rythme.
  // L'encoder d'après le guide aurait fabriqué un rendez-vous semestriel sur
  // un parc que le texte ne vise pas. L'annuelle des alimentations de secours,
  // elle, est écrite sans restriction d'assiette. `integral`.
  ARRETE_1993_11_04_SIGNALISATION,
  // Lot « disconnecteurs », 2026-09-02 — les deux premiers corpus du dépôt
  // tirés du code de la SANTÉ PUBLIQUE. Point de départ : un guide
  // professionnel fondant un « contrôle annuel des disconnecteurs » sur
  // `R. 1321-57` CSP, article dont `src/` n'avait aucune trace. Ouvert, il ne
  // porte ni périodicité ni le mot « disconnecteur », et son unique phrase
  // impérative s'adresse aux propriétaires des installations. Le rythme est
  // dans l'arrêté, doublement borné : par une clause de date (réseaux posés ou
  // refaits totalement depuis le 1er janvier 2023) et par un destinataire que
  // le produit ne sait pas identifier.
  CSP_EAU_POTABLE,
  ARRETE_2021_09_10_RETOURS_EAU,
  // Lot « socle DUERP », 2026-09-02 — le texte fondateur du produit, dont le
  // corpus ne portait qu'un article (`R. 4121-4`, entré par la porte de
  // l'affichage obligatoire) alors que dix-neuf surfaces le citent au
  // dirigeant. Le cliquet de `citations-ecran.ts` l'a mesuré : sept des
  // vingt-trois citations orphelines venaient d'ici, dont le seuil d'effectif
  // affiché sur l'écran de synthèse. Deux corpus et non un, parce que le
  // domaine est écrit aux deux étages du Code et que chacun des deux est
  // INTÉGRAL — six articles sur six, cinq sur cinq. Résultat principal : le
  // seuil de onze salariés affiché à l'écran est le bon, et il est attribué au
  // bon article ; ce qui manque est le RESTE de `R. 4121-2`, dont les 2° et 3°
  // s'appliquent sans condition d'effectif et ne sont portés par rien.
  CODE_TRAVAIL_DUERP_PRINCIPES,
  CODE_TRAVAIL_DUERP,
  // Lot « plan de prévention », 2026-09-02 — l'AUTRE versant de la
  // co-activité, celui que `code-travail-co-activite.ts` dit exclure sans
  // l'avoir jamais ouvert. C'était la plus grave des seize familles mesurées
  // par le cliquet de `citations-ecran.ts`, parce qu'elle ne cite pas
  // seulement des numéros : un EXTRAIT de l'arrêté du 19 mars 1993 s'affiche
  // entre guillemets au dirigeant, et il ne venait d'aucun relevé. Vérifié à
  // la source : il est exact, mot pour mot, y compris le « R. 4512-7 » qui
  // surprend sur un texte de 1993 et que Légifrance porte au titre de sa
  // version consolidée. Le verbatim FAUX était ailleurs — celui de
  // `R. 4512-2`, tronqué de trois mots dans le formulaire. Chapitre INTÉGRAL :
  // seize articles sur seize, cinq sections, et quatre d'entre eux
  // s'adressent au chef de l'entreprise extérieure et non à l'utilisateur du
  // produit.
  CODE_TRAVAIL_PLAN_PREVENTION,
  // Lot « vigilance prestataires », 2026-09-02 — la famille la plus citée des
  // seize mesurées par le cliquet de `citations-ecran.ts` : vingt occurrences
  // sur quatre surfaces, et pas un seul de ses cinq articles jamais ouvert.
  // C'est le fondement de tout le module Prestataires. Trois corpus, dont
  // deux INTÉGRAUX — le chapitre II législatif (sept articles sur sept) et le
  // même chapitre en partie réglementaire (huit sur huit) —, plus les deux
  // définitions du travail dissimulé auxquelles `L. 8222-1` renvoie
  // nommément, tirées du chapitre précédent et donc `articles_cites`.
  //
  // Résultat principal : le rythme du produit est celui du texte — six mois,
  // `D. 8222-5` —, son ANCRAGE ne l'est pas. Le module compte le semestre
  // depuis `prestataire.updatedAt`, quand le texte le compte depuis la
  // conclusion puis chaque remise ; toute retouche de la fiche repousse
  // l'échéance. Le seuil de 5 000 € HT est à jour et bien attribué à
  // `R. 8222-1` — il valait 3 000 euros, sans « hors taxes », jusqu'au
  // 2015-05-01. Le périmètre, lui, n'est PAS tranché ici : ce chapitre est du
  // droit du travail non santé-sécurité, et le produit le sert quand même.
  CODE_TRAVAIL_TRAVAIL_DISSIMULE,
  CODE_TRAVAIL_VIGILANCE,
  CODE_TRAVAIL_VIGILANCE_MODALITES,
  // Lot « les sept épars », 2026-09-02 — les citations d'écran qu'aucun
  // regroupement ne rassemblait, et que personne n'aurait reprises. Trois
  // corpus, dont DEUX INTÉGRAUX : la section de l'éclairage (douze articles
  // sur douze) et celle des matières explosives et inflammables (six sur six,
  // R. 4227-21 étant abrogé depuis 2011).
  //
  // L'ÉCLAIRAGE entre par `R. 4223-4`, imprimé dans le PDF du DUERP. La
  // consigne était d'ouvrir le chapitre : c'est ce qui a rendu `R. 4223-11`,
  // qui fait FIXER PAR L'EMPLOYEUR des règles d'entretien périodique du
  // matériel d'éclairage, consignées dans un document communiqué au CSE. Le
  // jumeau exact de `R. 4222-21`, et `R. 4224-17` les agrège tous deux
  // nommément — sa réserve, écrite la veille, ne relevait que le premier.
  CODE_TRAVAIL_ECLAIRAGE,
  // LE BRUIT ET LES VIBRATIONS entrent par deux citations du PDF, et les deux
  // sont JUSTES : « R. 4432-1 et suiv. », « R. 4441-1 et suiv. » désignent
  // correctement deux titres par leur premier article, et le PDF les donne
  // comme textes de référence, pas comme obligations. Ce que le détour a
  // rendu est ailleurs : `R. 4433-2` chiffre le seul rythme des deux titres —
  // « en cas de mesurage, celui-ci est renouvelé au moins tous les cinq
  // ans » — et le produit collecte DÉJÀ la date qui le calculerait
  // (`Risque.dateMesuresPhysiques`), rattachée à aucune exigence.
  CODE_TRAVAIL_BRUIT_VIBRATIONS,
  // LES MATIÈRES INFLAMMABLES sont le vrai objet de ce lot. Un attribut du
  // modèle porte le numéro d'un de ces articles dans son nom
  // (`Etablissement.manipuleMatieresR422722`) et l'article n'avait jamais été
  // ouvert. Il est exact quant aux produits qu'il désigne ; il est MAL NOMMÉ
  // quant à la condition — « manipulées ET mises en œuvre » est la phrase de
  // `R. 4227-34`, pas la sienne, et son propre champ est plus large
  // (« entreposées OU manipulées »). Voir l'en-tête du fichier et le motif de
  // `R. 4227-22`.
  CODE_TRAVAIL_MATIERES_INFLAMMABLES,
  // Lot « listes fermées », 2026-09-03 — trois textes ouverts non pour une
  // obligation mais pour une ÉNUMÉRATION du modèle (§ 9 de
  // `docs/chantiers-ouverts.md`). Deux d'entre eux sont ici pour ce qu'ils
  // NE disent PAS, et c'est leur usage principal.
  //
  // L'ARRÊTÉ DU 19 MARS 1993 était cité en prose par le corpus du plan de
  // prévention sans avoir jamais été porté. Ouvert, son 21° est la seule
  // désignation d'un travail par point chaud dans un texte opposable —
  // « soudage oxyacétylénique exigeant le recours à un permis de feu » — et
  // c'est la borne basse, unique, de `NatureTravauxPointChaud`.
  ARRETE_1993_03_19_TRAVAUX_DANGEREUX,
  // `L. 114` DU CASF est le seul article du droit français qui énumère les
  // familles de handicap : cinq fonctions, plus le polyhandicap et le trouble
  // de santé invalidant, mis sur le même plan. C'est de lui que
  // `HandicapAccessible` tient sa nomenclature — et non du droit de
  // l'accessibilité, qui n'en écrit aucune.
  CASF_DEFINITION_HANDICAP,
  // L'ARRÊTÉ DU 19 AVRIL 2017 est le texte que le produit cite au dirigeant
  // sur l'écran du registre. Il est ici pour porter une ABSENCE : ses quatre
  // articles de fond énumèrent neuf pièces et pas une famille de handicap.
  // Sans son verbatim, « le droit de l'accessibilité ne nomme aucune famille »
  // resterait une affirmation ; avec lui, c'est une propriété vérifiée sur le
  // texte par `handicap-accessible.test.ts`.
  ARRETE_2017_04_19_REGISTRE_ACCESSIBILITE,
  CCH_REGISTRE_ACCESSIBILITE,
  // Lot « listes fermées », 2026-09-03 — le second corpus du dépôt qui ne sert
  // AUCUNE obligation, après `arrete-1980-livre-1.ts`. Il porte les trois
  // articles du CCH qui CLASSENT : `R. 143-19` (les cinq catégories d'ERP),
  // `R. 146-3` (ce qu'est un immeuble de grande hauteur) et `R. 146-4` (les
  // dix classes d'IGH). Ce qu'ils servent est le modèle de données, pas le
  // calendrier — `docs/chantiers-ouverts.md` § 9.
  //
  // LES DEUX SOURCES PRÉSUMÉES ÉTAIENT FAUSSES. Les catégories d'ERP étaient
  // attribuées à `GN 2` de l'arrêté du 25 juin 1980, qui traite en réalité du
  // classement des GROUPEMENTS d'établissements ; les classes d'IGH à
  // l'arrêté du 30 décembre 2011, dont `GH 1` renvoie au code pour la
  // nomenclature. Le règlement de sécurité APPLIQUE une liste que le code
  // POSE, et chercher la liste dans le règlement a coûté trois classes au
  // modèle : `GHTC`, `GHW1` et `GHW2` manquaient, et un `GHW` que `R. 146-4`
  // n'écrit nulle part figurait en trop.
  CCH_CLASSEMENT_ERP_IGH,
  // Lot « EPI », 2026-09-04 — les trois textes que la catégorie
  // `CategorieEquipement.EPI` attendait pour ne pas naître fausse. Elle est
  // entrée la veille SANS obligation, et son commentaire disait pourquoi : « il
  // ne faut PAS en attacher une avant d'avoir lu R. 4323-95 à R. 4323-99 et
  // l'arrêté qui fixe la liste des EPI soumis à vérification ». Voici la
  // lecture, et elle donne raison à la prudence.
  //
  // LE RÉSULTAT TIENT EN UNE LIGNE : douze mois, et cinq familles nommées. La
  // périodicité n'est nulle part dans le Code — `R. 4323-99` est un article
  // d'habilitation qui ne chiffre rien —, elle est dans l'arrêté du 19 mars
  // 1993, et cet arrêté procède par liste NOMINATIVE et FERMÉE. Un casque, des
  // gants, des chaussures de sécurité ne s'y trouvent pas et ne sont soumis à
  // aucune vérification générale périodique : ils relèvent de `R. 4322-1`
  // (maintien en état de conformité) et de `R. 4323-95` (entretien,
  // réparations, remplacements « nécessaires »), qui sont des ÉTATS et non des
  // rendez-vous. Le guide commercial que `etablissements/parametrage.ts`
  // mentionnait depuis le 2026-09-01 avait le bon chiffre et la mauvaise
  // assiette.
  //
  // AUCUNE OBLIGATION N'EST ENCODÉE PAR CE LOT, et c'est délibéré : la seule
  // famille de l'arrêté qui touche les secteurs cibles est le harnais
  // antichute, et la porter suppose de trancher ce que devient la catégorie
  // `EPI` — une décision de modèle, donc une migration, donc pas un lot de
  // dépouillement. Les termes du choix sont dans le `bloquePar` de l'article
  // 1er de l'arrêté et au journal des vérifications.
  //
  // ⚠ DEUX ARRÊTÉS DU 19 MARS 1993 COEXISTENT DÉSORMAIS DANS CE FICHIER, de
  // même date et de même signataires, sur des objets sans rapport : les
  // travaux dangereux du plan de prévention, et les EPI. Leurs refs d'articles
  // se distinguent par un « (EPI) », faute de quoi `corpus.test.ts` les
  // verrait comme un seul article portant deux statuts.
  CODE_TRAVAIL_EPI,
  CODE_TRAVAIL_EPI_AMONT,
  ARRETE_1993_03_19_EPI,
];

export function couvertureParCorpus(): CouvertureCorpus[] {
  return CORPUS.map(couverture);
}

/**
 * Le corpus indexé par clé canonique d'article, tous corpus confondus.
 *
 * La règle de départage est la partie qui ne doit exister qu'à un seul
 * endroit : un même article peut figurer dans deux corpus — un texte
 * modificatif reprend l'article qu'il modifie, et `R. 4226-19` comme
 * `L. 4711-5` sont déclarés deux fois. Le premier DÉPOUILLÉ gagne : une entrée
 * `non_depouille` ne doit jamais masquer une lecture réelle.
 *
 * `scripts/export-relecture.ts` portait cette règle en propre ; la mesure de
 * vérification en avait besoin à l'identique, et deux copies d'une règle de
 * départage divergent en silence — le symptôme étant un article compté lu d'un
 * côté et non lu de l'autre, sans qu'aucun des deux comptes n'ait l'air faux.
 */
export function indexArticlesParRef(): Map<
  string,
  { corpusId: string; article: ArticleDepouille }
> {
  const index = new Map<string, { corpusId: string; article: ArticleDepouille }>();
  for (const c of CORPUS) {
    for (const a of c.articles) {
      const existante = index.get(a.ref);
      if (existante && existante.article.statut !== "non_depouille") continue;
      index.set(a.ref, { corpusId: c.id, article: a });
    }
  }
  return index;
}

/** Toutes les références d'articles déclarées dépouillées, tous corpus confondus. */
export function referencesDepouillees(): Set<string> {
  const out = new Set<string>();
  for (const c of CORPUS) {
    for (const a of c.articles) {
      if (a.statut !== "non_depouille") out.add(a.ref);
    }
  }
  return out;
}

/**
 * Les obligations qui s'appuient sur au moins un texte qu'aucun corpus ne
 * déclare avoir dépouillé.
 *
 * C'est la mesure qui manquait. Le référentiel savait dire ce qu'il connaît ;
 * il ne savait pas dire ce qu'il a lu, donc aucun test ne pouvait échouer
 * parce qu'une obligation MANQUE — seulement parce qu'une obligation est
 * fausse.
 *
 * Le rapprochement se fait sur `ReferenceLegale.article`, la clé canonique, et
 * non plus sur la citation lisible. La version précédente comparait des
 * sous-chaînes — « MS 38 » apparaît-il dans « Arrêté du 25 juin 1980, art.
 * MS 38 § 4 » ? — ce qui marchait par chance et se serait trompé dès qu'un
 * article en aurait préfixé un autre : « MS 7 » est inclus dans « MS 73 ».
 *
 * Une référence sans clé compte comme non dépouillée. Le silence ne vaut pas
 * couverture.
 */
export function obligationsSurTextesNonDepouilles(): string[] {
  const lues = referencesDepouillees();
  return obligationsConformite
    .filter((o) =>
      o.referencesLegales.some((r) => !r.article || !lues.has(r.article)),
    )
    .map((o) => o.id);
}

/**
 * Les articles qu'une obligation cite sans qu'aucun corpus ne les connaisse.
 *
 * Le pendant du compte ci-dessus, à la maille de l'article : c'est la liste de
 * travail du dépouillement, ordonnée par ce que le référentiel utilise
 * réellement plutôt que par l'ordre d'un code.
 */
export function articlesCitesNonDepouilles(): {
  article: string;
  obligations: string[];
}[] {
  const lues = referencesDepouillees();
  const par = new Map<string, string[]>();
  for (const o of obligationsConformite) {
    for (const r of o.referencesLegales) {
      if (!r.article || lues.has(r.article)) continue;
      par.set(r.article, [...(par.get(r.article) ?? []), o.id]);
    }
  }
  return [...par].map(([article, obligations]) => ({ article, obligations }));
}

/**
 * Les articles déclarés « retenus » par un corpus alors que l'obligation
 * nommée ne les cite pas.
 *
 * C'est le sens inverse du lien, et il doit être vérifié aussi : sans cela un
 * corpus pourrait s'attribuer une couverture qu'aucune obligation ne confirme,
 * et le compte de dette descendrait sans que rien ne s'améliore.
 */
export function liensRetenusRompus(): {
  corpus: string;
  ref: string;
  obligation: string;
}[] {
  const parId = new Map(obligationsConformite.map((o) => [o.id, o]));
  const rompus: { corpus: string; ref: string; obligation: string }[] = [];
  for (const c of CORPUS) {
    for (const a of c.articles) {
      if (a.statut !== "retenu") continue;
      for (const id of a.obligations) {
        const o = parId.get(id);
        if (!o || !o.referencesLegales.some((r) => r.article === a.ref)) {
          rompus.push({ corpus: c.id, ref: a.ref, obligation: id });
        }
      }
    }
  }
  return rompus;
}

/**
 * Les articles lus qui imposent quelque chose que le référentiel ne porte pas.
 *
 * C'est le produit du dépouillement : la liste, nommée et sourcée, de ce qui
 * manque. Avant elle, une obligation absente était indistinguable d'une
 * obligation inexistante.
 */
export function obligationsManquantes(): {
  corpus: string;
  ref: string;
  motif: string;
  bloquePar?: string;
}[] {
  return CORPUS.flatMap((c) =>
    c.articles
      .filter((a) => a.statut === "obligation_manquante")
      .map((a) => ({
        corpus: c.id,
        ref: a.ref,
        motif: a.statut === "obligation_manquante" ? a.motif : "",
        bloquePar:
          a.statut === "obligation_manquante" ? a.bloquePar : undefined,
      })),
  );
}

/**
 * Ce que des articles RETENUS imposent encore et que le référentiel ne porte
 * pas.
 *
 * Le pendant d'`obligationsManquantes()` pour les articles partiellement
 * couverts. Un article retenu se lit spontanément comme un article fini ;
 * sans ce compte, la moitié non encodée d'un article à plusieurs paragraphes
 * disparaîtrait du tableau de bord du dépouillement — et une disparition est
 * exactement ce qu'un inventaire doit empêcher.
 */
export function reservesDeLecture(): {
  corpus: string;
  ref: string;
  reserve: string;
}[] {
  return CORPUS.flatMap((c) =>
    c.articles.flatMap((a) =>
      a.statut === "retenu" && a.reserve
        ? [{ corpus: c.id, ref: a.ref, reserve: a.reserve }]
        : [],
    ),
  );
}

/**
 * Les références qui ne portent pas encore de clé d'article.
 *
 * Sans clé, une référence ne peut être rattachée à aucun corpus : elle compte
 * comme non dépouillée, mais n'apparaît dans aucune liste de travail par
 * article. Ce compte est le complément indispensable des deux autres — sinon
 * « 0 article cité non dépouillé » se lirait comme « tout est lu » alors que
 * la plupart des références ne sont même pas rattachables.
 */
export function referencesSansCle(): {
  obligation: string;
  reference: string;
}[] {
  return obligationsConformite.flatMap((o) =>
    o.referencesLegales
      .filter((r) => !r.article)
      .map((r) => ({ obligation: o.id, reference: r.reference })),
  );
}

/**
 * Les articles qui imposent quelque chose à un exploitant et que le produit
 * choisit de ne pas couvrir.
 *
 * Le principe est de couvrir le maximum de ce qui est possible et, à défaut,
 * de le dire clairement. Cette liste est la seconde moitié de la phrase : elle
 * nomme ce qu'on ne couvre pas, et où on le dit. Une entrée sans `declareA`
 * est un manque que personne n'a annoncé — donc un silence, pas une
 * déclaration.
 */
export function articlesNonCouverts(): {
  corpus: string;
  ref: string;
  motif: string;
  declareA?: string;
}[] {
  return CORPUS.flatMap((c) =>
    c.articles
      .filter((a) => a.statut === "non_couvert")
      .map((a) => ({
        corpus: c.id,
        ref: a.ref,
        motif: a.statut === "non_couvert" ? a.motif : "",
        declareA: a.statut === "non_couvert" ? a.declareA : undefined,
      })),
  );
}
