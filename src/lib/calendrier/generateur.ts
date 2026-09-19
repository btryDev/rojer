/**
 * Générateur du calendrier de vérifications (étape 6).
 *
 * ~~Fonction pure qui, à partir de la liste d'obligations applicables
 * (sortie du moteur de matching) et des vérifications déjà réalisées
 * pour cet établissement, produit la **prochaine occurrence** de
 * vérification pour chaque couple (obligation, équipement déclencheur).~~
 *
 * ~~Règles (cf. spec/PLAN.md étape 6) : 1. une occurrence par couple ;
 * 2. `mise_en_service_uniquement` : dernière vérif connue → pas de nouvelle
 * occurrence, mise en service à venir → `planifiee`, sinon `a_planifier` daté
 * de la mise en service ou de `now` ; 3. `autre` → aucune occurrence ;
 * 4. mise en service qui place la première échéance dans le futur →
 * `planifiee` ; 4 bis. dans le passé → `a_planifier` ; 4 ter. rien de connu →
 * datée de `now`, `a_planifier` ; 5. dernière vérif connue → dernière +
 * périodicité, `planifiee`.~~
 *
 * BARRÉ LE 2026-09-19 (ADR-036, lot 4 — la bascule). Le générateur ne DATE
 * plus rien. Il lisait l'horloge (`now`) quand il n'avait pas de source, et
 * c'est ce qui empêchait d'appliquer son calcul : une obligation en retard de
 * 94 jours serait repassée à zéro, et sa date aurait glissé chaque jour. La
 * réconciliation gelait donc la date en base — le constat B.
 *
 * CE QU'IL FAIT DÉSORMAIS : il DÉCRIT ce qui s'applique. Une ligne par couple
 * (obligation, porteur) qui a un rendez-vous (`estSansRendezVous` écarte le
 * reste), avec ses attributs de référentiel et ses SOURCES de calcul — le pas
 * du premier cycle, la mise en service de l'appareil, la date du titre. La
 * date et le statut sortent d'une seule fonction, `echeanceDeLigne`, que le
 * réconciliateur appelle sur les faits de chaque ligne (`decision-par-faits.ts`)
 * et que le dépôt et la suppression d'un rapport appellent par le même chemin
 * (`recalcul-ligne.ts`). L'origine du suivi, seul fait que le gel protégeait,
 * est une colonne : `Verification.suiviDepuis`.
 *
 * Le statut `a_planifier` veut dire une chose : AUCUNE ÉCHÉANCE CONNUE
 * (`aUnRendezVous`). La date posée est l'origine du suivi (règle 5) — ou, pour
 * un contrôle PONCTUEL, sa mise en service quand elle est connue et déjà
 * passée à l'origine (règle 2). Le retard se lit à l'affichage, sur la date
 * (`estVerificationEnRetard`).
 */

import {
  type Periodicite,
  type Realisateur,
} from "@/lib/referentiels/types-communs";
import { estCyclique, premierPas } from "./periodicite";
import { estStatutRealise } from "@/lib/dates/retard";
import { echeanceDuTitre } from "@/lib/salaries/echeance";
import { statutDepuisResultat } from "@/lib/rapports/schema";
import type {
  ObligationApplicable,
  ObligationSurMesureApplicable,
} from "@/lib/matching";
import { PREFIXE_PRESCRIPTION } from "@/lib/matching/prescriptions";
import { estSansRendezVous } from "@/lib/etats-permanents/regle";
import {
  estPorteeParSalarie,
  type Obligation,
} from "@/lib/referentiels/conformite/types";
// La décision de date — la seule (ADR-036). `decision-par-faits.ts` n'importe de
// ce module que des TYPES (`import type`) : aucun cycle à l'exécution.
import { creerParFaits, deciderParFaits } from "./decision-par-faits";

/**
 * Sentinelle du porteur « établissement » dans la clé de ligne.
 *
 * Le `@` la rend impossible à confondre avec un identifiant d'équipement :
 * `cuid()` n'en produit jamais. Sans elle, `null` s'interpolerait en la chaîne
 * `"null"`, qu'un identifiant pourrait théoriquement porter.
 */
const PORTEUR_ETABLISSEMENT = "@etablissement";

/**
 * La clé d'identité d'une ligne de suivi (ADR-022).
 *
 * Elle est produite ici, et **nulle part ailleurs**. La réconciliation range
 * les lignes existantes dans une `Map` sous cette clé et retrouve chaque ligne
 * générée par la même : deux constructions divergentes feraient prendre une
 * ligne existante pour une ligne disparue, donc archiver ou supprimer ce
 * qu'elle portait.
 *
 * Le porteur en fait partie. Sans lui, deux lignes portées par l'établissement
 * pour deux obligations différentes seraient distinctes — c'est le cas facile —
 * mais surtout la même obligation portée par l'établissement et par un
 * équipement se confondrait, et deux porteurs non-équipement à venir (deux
 * salariés) s'écraseraient l'un l'autre. La contrainte `NULLS NOT DISTINCT` en
 * base ne protège pas de ça : la collision se produit en mémoire, avant.
 */
export function cleDeLigne(
  obligationId: string,
  porteur: { equipementId: string | null; salarieId: string | null },
): string {
  // L'ordre des cas est celui de la spécificité : un équipement, puis une
  // personne, puis l'établissement à défaut. Deux porteurs renseignés en même
  // temps sont interdits en base (CHECK `Verification_porteur_xor`, ADR-023) ;
  // si la contrainte tombait, cette fonction privilégierait l'équipement
  // plutôt que de produire une clé ambiguë.
  if (porteur.equipementId !== null) {
    return `${obligationId}::${porteur.equipementId}`;
  }
  if (porteur.salarieId !== null) {
    return `${obligationId}::${porteur.salarieId}`;
  }
  return `${obligationId}::${PORTEUR_ETABLISSEMENT}`;
}

/**
 * La clé sous laquelle une ligne demande « mon obligation s'applique-t-elle
 * encore À MOI ? » — à l'appareil que je porte, pas à l'établissement.
 *
 * POURQUOI PAS L'IDENTIFIANT SEUL. `obligationsEncoreApplicables` était un
 * ensemble d'identifiants d'obligation, valable pour tout l'établissement.
 * Deux groupes froids A et B : A reçoit une détection de fuites, l'annuelle
 * ne s'y applique plus, sa ligne est archivée — juste. B, déclaré plus tard
 * sans cette réponse, déclenche l'annuelle. À la passe suivante, la ligne de
 * A n'est pas générée, l'obligation est « encore applicable » (par B), A est
 * en service : `aDesarchiver` la ROUVRAIT, avec son échéance gelée et donc
 * « dépassée » partout, à perpétuité. Et le jumeau : si B existait déjà, la
 * ligne de A n'était jamais archivée. Relevé par la relecture du N4
 * (2026-09-13), rejoué sur des obligations réelles.
 *
 * Une ligne d'ÉQUIPEMENT se teste donc par le couple obligation × appareil,
 * que le matching sait produire (`equipementsConcernes`). Une ligne
 * d'établissement ou de salarié garde l'identifiant nu : le porteur
 * établissement ne disparaît pas, et le porteur salarié se teste à part, par
 * le couple obligation × personne des titres détenus par une personne présente
 * (`OptionsGenerateur.titresActifs`, 2026-09-17). ~~Pour le salarié la règle
 * était délibérément plus large — toute obligation qu'un titre a un jour
 * instanciée restait applicable, que la personne soit partie ou non.~~
 * Les deux formes cohabitent dans le même ensemble sans se confondre : un
 * identifiant d'obligation ne contient jamais `::`.
 */
export function cleApplicabilite(
  obligationId: string,
  equipementId: string | null,
): string {
  return equipementId === null
    ? obligationId
    : `${obligationId}::${equipementId}`;
}

/**
 * L'ensemble d'applicabilité, construit depuis le résultat du matching : une
 * clé par appareil qui DÉCLENCHE une obligation d'équipement, l'identifiant nu
 * pour une obligation d'établissement.
 *
 * Extraite de `calendrier/actions.ts`, où elle vivait dans une boucle qu'aucun
 * test n'atteignait : revenir à l'identifiant nu pour le porteur équipement y
 * laissait la suite verte (relecture du 2026-09-13). Les obligations de salarié
 * n'y passent pas — le matching ne les rend pas — et l'appelant les ajoute.
 */
export function clesApplicabilite(
  obligations: ReadonlyArray<ApplicableAIndexer>,
): Set<string> {
  // Les clés de la table des périodicités, et rien d'autre : une seule
  // construction, donc aucun désaccord possible entre « s'applique-t-elle ? »
  // et « à quel rythme ? » (2026-09-15).
  return new Set(periodicitesEffectives(obligations).keys());
}

type ApplicableAIndexer = {
  obligation: { id: string; periodicite?: Periodicite };
  porteur: string;
  equipementsConcernes: ReadonlyArray<{ id: string }>;
  surcharges?: Readonly<Record<string, { periodicite: Periodicite }>>;
};

/**
 * La périodicité EFFECTIVE de chaque clé d'applicabilité : celle du
 * référentiel, sauf surcharge d'une prescription particulière sur l'appareil
 * (ADR-035) — exactement celle que `genererProchainesVerifications` passe à
 * `estSansRendezVous`.
 *
 * POURQUOI ELLE EXISTE (NB4, ADR-034 N4 point 6 ; 2026-09-15). Une ligne
 * applicable que la génération saute n'arrive jamais par `aMettreAJour` : la
 * boucle finale du réconciliateur la comptait « inchangée » ou la rouvrait, en
 * n'écrivant qu'`archiveLe`. Une prescription qui donnait un rythme semestriel
 * à une obligation `autre`, une fois levée, laissait donc la ligne semestrielle,
 * marquée de sa prescription, et en retard dès sa date passée — sur une
 * obligation qui n'a plus de rythme. La clé seule ne disait pas à quel rythme
 * réaligner.
 *
 * `periodicite` est optionnel dans le type pour les fixtures qui ne testent que
 * les clés. La clé est alors indexée SANS valeur : elle reste applicable, et le
 * réconciliateur ne réaligne rien sur une périodicité qu'il ne connaît pas —
 * inventer `autre` y ferait purger un statut. L'appelant réel passe des
 * obligations complètes.
 */
export function periodicitesEffectives(
  obligations: ReadonlyArray<ApplicableAIndexer>,
): Map<string, Periodicite | undefined> {
  const table = new Map<string, Periodicite | undefined>();
  for (const oa of obligations) {
    const referentiel = oa.obligation.periodicite;
    if (oa.porteur === "equipement") {
      for (const eq of oa.equipementsConcernes) {
        table.set(
          cleApplicabilite(oa.obligation.id, eq.id),
          oa.surcharges?.[eq.id]?.periodicite ?? referentiel,
        );
      }
    } else {
      table.set(cleApplicabilite(oa.obligation.id, null), referentiel);
    }
  }
  return table;
}

/** Ce que la génération ÉCRIT. Plus de `depassee` : le retard est une
 *  fonction de la date (retrait, phase A), aucune ligne n'est plus tamponnée
 *  le jour où son échéance passe. */
export type StatutVerificationGen = "a_planifier" | "planifiee";

export type VerificationGenere = {
  /** Clé stable rendue par `cleDeLigne` — jamais reconstruite à la main. */
  cleUnique: string;
  obligationId: string;
  libelleObligation: string;
  /** `null` = ligne non portée par un appareil (ADR-022). */
  equipementId: string | null;
  /** `null` = ligne non portée par un salarié (ADR-023). Les deux nuls
   *  ensemble = porteur établissement. */
  salarieId: string | null;
  /** Le rythme EFFECTIF : celui du référentiel, sauf surcharge d'une
   *  prescription particulière sur l'appareil (ADR-035). */
  periodicite: Periodicite;
  realisateurRequis: Realisateur[];
  // ~~`datePrevue`, `statut`, `datePrevueFaisantFoi`~~ — retirés le 2026-09-19
  // (ADR-036, lot 4). Le générateur ne date plus : la date et le statut sortent
  // de `echeanceDeLigne`, sur les `sources` ci-dessous et les faits de la ligne
  // en base. Le drapeau `datePrevueFaisantFoi` disait « cette date est la
  // pièce » ; c'est `sources.dateDuTitre`, que la règle 1 fait primer.
  /** Criticité issue de l'obligation (1-5). Sert au tri par priorité. */
  criticiteObligation: 1 | 2 | 3 | 4 | 5;
  /** Raisons textuelles du matching — copiées du résultat du moteur. */
  raisons: string[];
  /**
   * Prescription particulière (ADR-035) à l'origine de la périodicité
   * (surcharge) ou de la ligne (sur mesure). `null` = référentiel seul.
   */
  prescriptionId: string | null;
  /**
   * Les identifiants auxquels cette obligation succède (`Obligation.succedeA`),
   * portés jusqu'ici pour que la réconciliation les lise SANS connaître le
   * référentiel. C'est ce qui garde ce module pur : il ne sait rien des
   * obligations, il lit ce que la ligne générée lui apporte.
   */
  succedeA?: string[];
  /**
   * Les SOURCES de calcul que le générateur a lues pour cette ligne — ce que le
   * temps 1 sait et que le temps 2 ne peut pas deviner (ADR-036 § 4) : le pas
   * du premier cycle, résolu par `premierPas` avec la surcharge de prescription
   * qu'il tient sous la main ; la mise en service de l'appareil ; la date du
   * titre pour un porteur salarié.
   *
   * REQUIS DEPUIS LA BASCULE (2026-09-19). Additif et optionnel aux lots 2b à
   * 3, il est désormais la seule chose que la réconciliation sache du temps 1
   * pour dater une ligne. Une ligne générée sans lui est un défaut de câblage :
   * `faitsDeLigne` la refuse par une erreur au lieu de retomber, en silence,
   * sur « aucune mise en service, premier pas = rythme ».
   */
  sources: SourcesDeCalcul;
};

/** Voir `VerificationGenere.sources`. */
export type SourcesDeCalcul = {
  premierPas: Periodicite;
  miseEnService: Date | null;
  dateDuTitre: Date | null;
};

/**
 * Une ligne À CRÉER : la ligne générée, datée par la stratégie de décision du
 * réconciliateur (`creerParFaits`). C'est la seule forme sous laquelle une date
 * accompagne une ligne générée — elle naît dans le temps 2, jamais dans le 1.
 */
export type LigneACreer = VerificationGenere & {
  datePrevue: Date;
  statut: StatutVerificationGen;
};

export type OptionsGenerateur = {
  /**
   * L'horloge de la passe, pour la RÉCONCILIATION seulement : c'est l'origine
   * du suivi d'une ligne à naître (`suiviDepuis`, que `actions.ts` écrit avec
   * cette même valeur), et le repli d'une ligne existante qui n'en porterait
   * pas — une fixture ; la lecture de production la fournit toujours. Défaut =
   * `new Date()`. Le GÉNÉRATEUR ne la lit plus depuis la bascule (ADR-036).
   */
  now?: Date;
  /**
   * Date de mise en service, par identifiant d'équipement. Le générateur la
   * porte dans `sources.miseEnService` ; c'est `echeanceDeLigne` qui en tire la
   * première échéance (règle 4) ou la date d'un contrôle unique (règle 2).
   */
  misesEnService?: Map<string, Date>;
  /**
   * Les obligations que le moteur juge encore applicables, par identifiant.
   *
   * Sert à la réconciliation, et à une seule question : une ligne dont
   * l'obligation n'est plus générée l'est-elle parce que l'obligation a été
   * RETIRÉE, ou parce qu'elle n'a plus d'échéance datable
   * (`periodicite: "autre"`, état permanent) ? Les deux se ressemblent — dans
   * les deux cas la ligne manque à `aGenerer` — et les confondre fait étiqueter
   * « Ne s'applique plus » une obligation qui s'applique toujours.
   *
   * Absent = comportement antérieur : tout ce qui manque est réputé retiré.
   *
   * **Les entrées sont des clés d'applicabilité** (`cleApplicabilite`) :
   * `obligation::equipement` pour une obligation portée par un appareil,
   * l'identifiant nu pour l'établissement et le salarié. Un identifiant nu
   * pour une obligation d'équipement ne protège AUCUNE ligne — c'est voulu,
   * et c'est ce qui a fermé la réouverture d'une ligne dont l'obligation ne
   * s'appliquait plus qu'à un autre appareil.
   */
  obligationsEncoreApplicables?: Set<string>;
  /**
   * La périodicité effective de chaque clé d'applicabilité
   * (`periodicitesEffectives`, plus les obligations de salarié instanciées,
   * au rythme du référentiel). Sert à RÉALIGNER une ligne applicable que la
   * génération saute — elle n'a que ce chemin (NB4, 2026-09-15).
   *
   * Absent, ou clé sans valeur = comportement antérieur : la ligne n'est ni
   * réalignée ni touchée au-delà de son archivage.
   */
  periodicitesEffectives?: ReadonlyMap<string, Periodicite | undefined>;
  /**
   * Les équipements encore en service, par identifiant.
   *
   * Sert à une question que `obligationsEncoreApplicables` ne sait pas poser :
   * une ligne est identifiée par une obligation ET UN PORTEUR, et l'obligation
   * peut parfaitement vivre chez un AUTRE porteur que celui de cette ligne.
   *
   * Le cas : deux extincteurs, l'un retiré. L'obligation reste applicable —
   * le second la porte —, donc la ligne du premier était classée « rien à
   * faire » et restait en base avec son statut, comptée en retard
   * indéfiniment. Ni archivée, ni supprimée, ni relancée, pour un appareil qui
   * n'existe plus. Le bouton de suppression promet pourtant « ne génère plus
   * d'échéance ».
   *
   * Un porteur établissement ne disparaît jamais. Le porteur salarié a sa
   * propre question, `titresActifs`, ci-dessous.
   *
   * Absent = comportement antérieur : un porteur disparu ne se distingue pas
   * d'un porteur vivant.
   */
  equipementsEnService?: Set<string>;
  /**
   * Les titres détenus par une personne PRÉSENTE dans l'effectif, par clé de
   * ligne (`cleDeLigne(obligationId, { equipementId: null, salarieId })`).
   *
   * Le pendant d'`equipementsEnService` pour le porteur salarié (2026-09-17,
   * `lot/salarie-inactif-et-menage`). Une ligne de salarié hors de cet
   * ensemble — la personne est sortie de l'effectif, ou son titre a été
   * retiré — est traitée comme la ligne d'un appareil retiré : archivée si
   * elle porte une trace, supprimée sinon.
   *
   * ~~L'ADR-023 a tranché que sa ligne n'est PAS barrée~~ — ce commentaire le
   * disait, et l'ADR ne le dit nulle part. La ligne restait donc ouverte, et
   * une ligne ouverte qui porte une action était comptée en retard par le
   * calendrier, le score et la barre latérale, pendant qu'Équipe disait « Ne
   * s'applique plus » du même titre. La preuve que la personne était habilitée
   * quand elle opérait est le TITRE (`TitreSalarie`, conservé, `docs/rgpd.md`
   * § 4.3), et la ligne archivée garde ses actions : rien ne se perd.
   *
   * Absent = comportement antérieur : une ligne de salarié n'est jamais
   * réputée orpheline de son porteur.
   */
  titresActifs?: ReadonlySet<string>;
  /**
   * Qui reprend le contenu de qui, quand une obligation est retirée du
   * référentiel : identifiant retiré → identifiant absorbant.
   *
   * **La succession est DÉCLARÉE, jamais dérivée** (ADR-024). Rien ici ne
   * devine qu'une obligation en remplace une autre par ressemblance de
   * domaine, d'article ou de libellé : la donnée vient de
   * `OBLIGATIONS_RETIREES.absorbePar`, écrite à la main par qui a fait le
   * retrait.
   *
   * Sans elle, un identifiant qui change casse la continuité : l'ancienne
   * ligne est barrée « Ne s'applique plus » et une ligne neuve apparaît « à
   * planifier », urgente, pour un acte que le dirigeant vient de faire faire.
   *
   * Absent = comportement antérieur : aucune reprise, chaque identifiant vit
   * sa vie.
   */
  successions?: ReadonlyMap<string, string>;
};

/** Un titre déclaré, réduit à ce dont le générateur a besoin (ADR-023). */
export type TitreDeclare = {
  salarieId: string;
  /** Nom affichable du salarié, pour le libellé de la ligne. */
  libelle: string;
  /** Date de délivrance — le point de départ du cycle. */
  delivreLe: Date;
  /**
   * Échéance déclarée, quand l'employeur la connaît. `null` = à calculer
   * depuis la périodicité de l'obligation, ou pas d'échéance du tout si
   * l'obligation n'en porte pas.
   */
  echeanceLe: Date | null;
};

/** Sur quoi une ligne va porter, pendant la génération. */
type PorteurDeLigne = {
  /** Identifiant d'équipement, ou `null`. */
  id: string | null;
  /** Identifiant de salarié, ou `null`. */
  salarieId: string | null;
  /** Libellé du porteur, pour les messages. */
  libelle: string | null;
};

/**
 * Décrit, pour chaque couple (obligation applicable × porteur) qui a un
 * rendez-vous, la ligne de suivi attendue et ses SOURCES de calcul. Aucune
 * date, aucun statut : c'est le temps 2 qui les calcule (ADR-036).
 *
 * ~~LE DEUXIÈME ARGUMENT, l'historique des vérifications — emplacement mort
 * depuis la bascule, refusé s'il n'était pas vide~~ — retiré au lot 5 de
 * l'ADR-036 (2026-09-19). Le générateur n'est pas nourri de l'historique
 * (§ 4) : la réalisation d'une ligne se lit sur ses rapports, dans le
 * réconciliateur, et un ponctuel réalisé ne disparaît plus de `aGenerer`.
 */
export function genererProchainesVerifications(
  obligations: ObligationApplicable[],
  options: OptionsGenerateur = {},
): VerificationGenere[] {
  const out: VerificationGenere[] = [];

  for (const oa of obligations) {
    const o = oa.obligation;

    // Le porteur décide de ce sur quoi on boucle (ADR-022). Pour
    // l'établissement, un seul tour, sans équipement — et c'est tout l'objet
    // du chantier : `oa.equipementsConcernes` est vide, or l'obligation est
    // due. Boucler dessus produirait zéro ligne, ce qui est exactement le faux
    // négatif qu'on supprime.
    // Analyse de cas exhaustive, pas un ternaire (ADR-023). La forme
    // précédente — `oa.porteur === "etablissement" ? … : …` — envoyait tout ce
    // qui n'était pas « établissement » dans la branche équipement. Un porteur
    // salarié y aurait bouclé sur `equipementsConcernes`, vide par
    // construction, et produit ZÉRO ligne : le faux négatif muet que
    // l'ADR-022 existe pour supprimer, réintroduit par la porte de service.
    const porteurs: PorteurDeLigne[] = ((): PorteurDeLigne[] => {
      switch (oa.porteur) {
        case "etablissement":
          return [{ id: null, salarieId: null, libelle: null }];
        case "salarie":
          // Inatteignable : `evaluerObligation` rend `null` pour ce porteur,
          // faute de pouvoir juger de l'applicabilité d'un titre (ADR-023).
          // Ces lignes sont produites par `genererVerificationsDepuisTitres`.
          // Le cas est écrit pour que le `switch` reste exhaustif — s'il
          // disparaissait, le `default` ci-dessous cesserait de compiler et
          // c'est le garde-fou qu'on perdrait.
          return [];
        case "equipement":
          return oa.equipementsConcernes.map((e) => ({
            id: e.id,
            salarieId: null,
            libelle: e.libelle,
          }));
        default: {
          // Inatteignable si les types tiennent : `porteur` est une union
          // fermée et les trois cas sont couverts. On y arrive par un `as`
          // dans une fixture, ou par une donnée écrite avant l'ajout du
          // champ.
          //
          // Le refus est explicite plutôt que muet. Sans lui, l'IIFE rendait
          // `undefined` et l'appelant échouait sur « porteurs is not
          // iterable » — un message qui ne nomme ni l'obligation, ni la
          // valeur fautive, ni le champ. Le silence n'était pas une option
          // non plus : retomber sur la branche équipement est précisément ce
          // que l'ADR-023 corrige.
          const inattendu: never = oa.porteur;
          throw new Error(
            `Porteur inconnu « ${String(inattendu)} » sur l'obligation ` +
              `« ${o.id} ». Les valeurs admises sont : equipement, ` +
              `etablissement, salarie.`,
          );
        }
      }
    })();

    for (const eq of porteurs) {
      // Périodicité effective : celle du référentiel, sauf surcharge d'une
      // prescription particulière (ADR-035) sur cet équipement.
      const surcharge = eq.id === null ? undefined : oa.surcharges?.[eq.id];
      const periodicite = surcharge?.periodicite ?? o.periodicite;
      const prescriptionId = surcharge?.prescriptionId ?? null;
      const raisons = surcharge ? [...oa.raisons, surcharge.raison] : oa.raisons;

      // Pas de rendez-vous → pas de ligne de calendrier.
      //
      // La règle vit dans `etats-permanents/regle.ts` et non ici, parce que
      // l'écran « Ce qui doit être en place » a besoin exactement du
      // complémentaire : ce que cette boucle saute est ce qu'il montre. Écrite
      // des deux côtés, elle aurait fini par diverger — et le jour où elle
      // diverge, une obligation apparaît aux deux endroits ou à aucun. C'est le
      // défaut que la journée du 2026-08-31 a passé à retirer sur deux widgets
      // jumeaux, et la ligne tracée est « partage la règle, pas la mise en
      // page ».
      //
      // La périodicité passée est l'EFFECTIVE, surcharge de prescription
      // comprise : un arrêté préfectoral qui donne un rythme à une obligation
      // qui n'en avait pas la fait passer de l'écran au calendrier.
      if (estSansRendezVous(periodicite)) continue;

      const cleUnique = cleDeLigne(o.id, {
        equipementId: eq.id,
        salarieId: eq.salarieId,
      });

      out.push({
        cleUnique,
        obligationId: o.id,
        libelleObligation: o.libelle,
        equipementId: eq.id,
        salarieId: eq.salarieId,
        periodicite,
        realisateurRequis: o.realisateurs,
        criticiteObligation: o.criticite,
        succedeA: o.succedeA,
        raisons,
        prescriptionId,
        sources: {
          // Le pas du PREMIER cycle (ADR-036, D1) : le premier délai du texte,
          // borné par la surcharge quand elle est plus courte. La surcharge est
          // passée TELLE QUELLE — `null` sans prescription —, jamais le rythme
          // effectif : sans prescription les deux valent pareil, et la
          // comparaison nue ferait primer le rythme sur un premier délai plus
          // long. `premierDelai` ne sert QU'AU premier cycle : une vérification
          // réalisée fait repartir le rythme (règle 3), jamais lui.
          premierPas: premierPas(
            o.premierDelai,
            o.periodicite,
            surcharge?.periodicite ?? null,
          ),
          // Une ligne d'établissement n'a pas de mise en service : il n'y a pas
          // d'appareil dont on daterait l'installation. Elle date alors de
          // l'origine du suivi (règles 2 et 5), ce qui est juste.
          miseEnService:
            eq.id === null ? null : (options.misesEnService?.get(eq.id) ?? null),
          dateDuTitre: null,
        },
      });
    }
  }

  return out;
}

/**
 * Criticité portée par les obligations sur mesure (ADR-035). Convention de
 * tri, pas une cotation : une prescription d'autorité prime sur la plupart
 * des lignes du référentiel dans le calendrier, sans prétendre juger de sa
 * gravité.
 */
export const CRITICITE_SUR_MESURE = 4 as const;

/**
 * Génère les occurrences des obligations sur mesure issues de prescriptions
 * particulières (ADR-035). `obligationId` est préfixé `prescription:` pour
 * que la clé d'idempotence `(obligationId, equipementId)` et la
 * réconciliation restent inchangées. Comme pour le référentiel, l'historique
 * est ignoré ici : c'est `reconcilierCalendrier` qui le lit.
 */
/**
 * Les échéances nées d'un titre déclaré par l'employeur (ADR-023).
 *
 * Pourquoi une fonction à part plutôt qu'une branche du générateur principal :
 * celui-ci part des obligations que le moteur juge applicables, et le moteur
 * ne peut pas juger d'un titre — il ne sait pas qui, dans l'effectif, exerce
 * l'activité qui le déclenche. Ici on part du fait inverse : l'employeur a
 * déclaré que cette personne détient ce titre. Le référentiel ne sert plus qu'à
 * fournir le libellé, le rythme et la criticité.
 *
 * Les dates du titre sont des FAITS — l'employeur les tient de la pièce qu'il a
 * en main. Elles priment donc sur tout calcul.
 */
export function genererVerificationsDepuisTitres(
  titres: Map<string, TitreDeclare[]>,
  obligationParId: (id: string) => Obligation | undefined,
  // (Plus d'options depuis le 2026-09-17 : l'horloge ne servait qu'à
  // `estUrgent`. Une date de titre vient de la pièce, jamais de `now`.)
): VerificationGenere[] {
  const out: VerificationGenere[] = [];

  for (const [obligationId, liste] of titres) {
    const o = obligationParId(obligationId);
    // Titre déclaré sur une obligation qui n'existe plus au référentiel. On
    // n'invente rien : la ligne n'est pas produite, et la réconciliation
    // traitera l'ancienne comme une obligation retirée — archivée si elle
    // porte une preuve, supprimée sinon (ADR-012).
    if (!o) continue;

    // Et sur une obligation qui n'est PAS portée par un salarié. Rien ne
    // l'interdit en base — `TitreSalarie.obligationId` n'a pas de clé
    // étrangère, le référentiel vivant en TypeScript — donc un titre déclaré
    // sur une obligation d'équipement produirait une ligne à porteur salarié
    // pour une obligation qui n'en veut pas, et la contrainte `porteur_xor`
    // ne dirait rien (elle interdit deux porteurs, pas le mauvais).
    if (!estPorteeParSalarie(o)) continue;

    for (const t of liste) {
      // LA définition de l'échéance d'un titre, partagée avec l'écran Équipe
      // (`salaries/echeance.ts`). Elle était écrite ici en ligne, et la page
      // Équipe en tenait une autre — `echeanceLe` seul — : une VIP sans date de
      // fin était en retard au calendrier et « sans terme écrit » sur la fiche
      // de la personne (relecture système du 2026-09-14).
      const echeance = echeanceDuTitre(t, o.periodicite);
      // Pas d'échéance calculable : l'obligation n'en porte pas (état
      // permanent). Le titre existe, il n'y a simplement pas de rendez-vous à
      // inscrire — inventer une date serait pire que n'en afficher aucune.
      if (echeance === null) continue;

      // Le retard ne se calcule pas ici : il se lit sur la date, avec la même
      // règle que pour un équipement (ADR-011, `estVerificationEnRetard`).
      out.push({
        cleUnique: cleDeLigne(obligationId, {
          equipementId: null,
          salarieId: t.salarieId,
        }),
        obligationId,
        libelleObligation: o.libelle,
        equipementId: null,
        salarieId: t.salarieId,
        periodicite: o.periodicite,
        realisateurRequis: o.realisateurs,
        criticiteObligation: o.criticite,
        succedeA: o.succedeA,
        raisons: [`titre détenu par ${t.libelle}`],
        prescriptionId: null,
        // Un titre n'a ni premier cycle ni appareil : sa seule source est la
        // pièce, et elle prime sur tout calcul, réalisation comprise (règle 1
        // de `echeanceDeLigne` : « planifiée » à cette date, passée ou non).
        // Le premier pas est le rythme, faute d'autre chose à y mettre ; la
        // règle 1 ne le lit jamais.
        sources: {
          premierPas: o.periodicite,
          miseEnService: null,
          dateDuTitre: echeance,
        },
      });
    }
  }

  return out;
}

export function genererVerificationsSurMesure(
  surMesure: ObligationSurMesureApplicable[],
  // (Plus d'horloge depuis la bascule, 2026-09-19 : une ligne sur mesure
  // naissait datée de `now`, « à planifier ». Elle date désormais de l'origine
  // de son suivi, par `echeanceDeLigne` — règle 5.)
): VerificationGenere[] {
  const out: VerificationGenere[] = [];
  for (const sm of surMesure) {
    const p = sm.prescription;
    if (p.periodicite === "autre") continue;
    const obligationId = `${PREFIXE_PRESCRIPTION}${p.id}`;
    for (const eq of sm.equipementsConcernes) {
      out.push({
        cleUnique: cleDeLigne(obligationId, {
          equipementId: eq.id,
          salarieId: null,
        }),
        obligationId,
        libelleObligation: p.libelle ?? p.reference,
        equipementId: eq.id,
        salarieId: null,
        periodicite: p.periodicite,
        realisateurRequis: p.realisateurRequis,
        criticiteObligation: CRITICITE_SUR_MESURE,
        raisons: sm.raisons,
        prescriptionId: p.id,
        // Une ligne sur mesure n'a pas de mise en service : une prescription
        // n'a pas de régime de date à elle, son premier pas est son rythme.
        sources: {
          premierPas: p.periodicite,
          miseEnService: null,
          dateDuTitre: null,
        },
      });
    }
  }
  return out;
}

// ===========================================================================
// Réconciliation idempotente du calendrier — ADR-012
//
// POURQUOI CE MODULE EXISTE
// -------------------------
// La régénération procédait par `deleteMany` (toutes les occurrences non
// réalisées) puis `createMany`. Trois conséquences, toutes silencieuses :
//
//  1. `Action.verificationId` est en `onDelete: Cascade`. Une action
//     corrective créée sur une vérification dépassée (« faire intervenir un
//     organisme agréé », avec responsable et échéance) disparaissait dès que
//     l'utilisateur déclarait un nouvel équipement — la déclaration régénère.
//  2. Un rapport déposé avec le résultat « non vérifiable » plaçait la
//     vérification en `a_planifier` : la régénération qui suivait dans la
//     même requête supprimait la vérification, donc le rapport en cascade,
//     et laissait le fichier orphelin dans le stockage.
//  3. Les identifiants changeaient à chaque passage : tout lien externe
//     (URL de la fiche vérification, `leveeRapportId`) pointait dans le vide.
//
// Depuis la migration `20260810120000_integrite_et_conservation`, la base
// porte `@@unique([etablissementId, obligationId, equipementId])`. Une
// `Verification` n'est donc plus « une occurrence » mais **la ligne de suivi**
// d'une obligation sur un équipement — un objet durable, dont l'identifiant
// est stable pour toute la vie de l'équipement.
//
// SÉMANTIQUE DE LA LIGNE DE SUIVI (ADR-034, depuis le lot N2 du 2026-09-11)
// -------------------------------------------------------------------------
//   `datePrevue`   : l'échéance OUVERTE — la seule date que la ligne porte ;
//   `statut`       : à planifier (aucune échéance connue) ou planifiée ;
//   `archiveLe`    : posé quand l'obligation cesse de s'appliquer à une ligne
//                    qui porte une preuve ;
//   `rapports`     : l'historique complet — c'est lui qui porte la preuve, et
//                    chaque rapport garde l'échéance qu'il honorait
//                    (`echeanceHonoree`).
//
// ~~La ligne ROULE AU DÉPÔT d'un rapport (`rapports/actions.ts`), dans la même
// transaction : `datePrevue` = date du rapport + périodicité. La réconciliation
// ne fait plus rouler personne : elle ne connaît que des cycles ouverts.~~
// DEPUIS LA BASCULE (ADR-036, 2026-09-19), `datePrevue` et `statut` sont une
// fonction des FAITS de la ligne — `echeanceDeLigne` —, et les trois chemins
// qui l'écrivent l'appellent : cette réconciliation, le dépôt et la suppression
// d'un rapport (`recalcul-ligne.ts`). « En retard » reste une fonction de la
// date : un contrôle annuel fait il y a deux ans a une échéance ouverte vieille
// d'un an — c'est ce qu'on lit, quel que soit le chemin qui l'a écrite.
//
// LA RÉALISATION SE LIT SUR LES RAPPORTS (`derniereRealisation`, fourni par
// `calendrier/actions.ts`), et nulle part ailleurs : la colonne qui la
// dupliquait sur la ligne est partie au N5.
// ===========================================================================

/** Statuts que peut porter une ligne en base (miroir de l'enum Prisma
 *  `StatutVerification`). Typé en union locale et non importé de
 *  `@prisma/client` pour que ce module reste pur et testable sans base. */
export type StatutVerificationPersiste =
  | StatutVerificationGen
  | "realisee_conforme"
  | "realisee_observations"
  | "realisee_ecart_majeur";

// Les statuts qui disent « ce contrôle a eu lieu » et `estStatutRealise`
// vivent dans `lib/dates/retard.ts`, en un seul exemplaire : la condition SQL
// du `deleteMany` doit dire la même chose que `porteUneTrace`.

/** Ligne de suivi telle qu'elle existe en base, réduite à ce dont la
 *  réconciliation a besoin. */
export type OccurrenceExistante = {
  id: string;
  obligationId: string;
  /** `null` = ligne non portée par un appareil (ADR-022). */
  equipementId: string | null;
  /** `null` = ligne non portée par un salarié (ADR-023). Optionnel : les
   *  fixtures antérieures à ce champ n'en ont pas. */
  salarieId?: string | null;
  libelleObligation: string;
  periodicite: Periodicite;
  realisateurRequis: Realisateur[];
  datePrevue: Date;
  /**
   * La date du rapport réalisé le plus récent de la ligne, ou `null`. C'est la
   * SEULE réalisation que la réconciliation connaît — lue sur les rapports par
   * `calendrier/actions.ts` (ADR-034). La ligne n'en porte plus depuis le N5.
   */
  derniereRealisation?: Date | null;
  /** Le résultat de ce rapport (`conforme`…). Il donne son statut à une ligne
   *  sans rendez-vous suivant, seule à en garder un. */
  dernierResultat?: string | null;
  statut: StatutVerificationPersiste;
  /** La ligne porte-t-elle au moins un rapport de vérification ou une action
   *  corrective ? C'est le seul critère qui autorise — ou interdit — la
   *  suppression physique. */
  porteUnePreuve: boolean;
  /** Date d'archivage (ADR-034) : `null` = ligne ouverte. Elle remplace le
   *  préfixe « Ne s'applique plus — » que la réconciliation lisait dans le
   *  libellé. Optionnel : les fixtures antérieures n'en ont pas, et une ligne
   *  sans date est ouverte. */
  archiveLe?: Date | null;
  /** Prescription particulière à l'origine de la ligne ou de sa périodicité
   *  (ADR-035). Optionnel : les fixtures antérieures n'en ont pas. */
  prescriptionId?: string | null;
  /**
   * Depuis quand Rojer suit la ligne — `Verification.suiviDepuis` (ADR-036,
   * D2) : l'ORIGINE que `echeanceDeLigne` lit (règles 2, 4 et 5). La lecture
   * de production la porte toujours — la colonne est `NOT NULL`. Optionnelle
   * dans le type pour les fixtures pures qui ne testent que l'identité ou
   * l'archivage (`continuite-identite.test.ts` doit rester vert sans retouche) :
   * absente, l'origine retombe sur l'horloge de la passe, comme pour une ligne
   * à naître.
   */
  suiviDepuis?: Date;
};

/** Ce qu'il faut écrire sur une ligne existante. `id` n'y figure jamais en
 *  cible d'écriture : il est stable par construction. */
export type MiseAJourOccurrence = {
  id: string;
  /**
   * L'identifiant d'obligation À ÉCRIRE. Il ne bouge que dans un cas : une
   * ligne ADOPTÉE, dont l'obligation a changé de nom (scission, renommage).
   * Partout ailleurs il vaut celui que la ligne portait déjà, et le réécrire
   * ne coûte rien.
   *
   * Aucun risque de collision avec la contrainte d'unicité : si une rangée
   * existait déjà à la clé cible, la réconciliation l'aurait trouvée par sa
   * clé et n'aurait adopté personne.
   */
  obligationId: string;
  libelleObligation: string;
  periodicite: Periodicite;
  realisateurRequis: Realisateur[];
  datePrevue: Date;
  statut: StatutVerificationPersiste;
  prescriptionId: string | null;
  /** D'où la décision a tiré la date (`DecisionDeLigne.source`) — pour le
   *  contrôle de santé et les tests, jamais écrite. Absente sur une ligne que
   *  la boucle finale réaligne (NB4) : elle ne décide d'aucune date. */
  source?: string;
};

/**
 * La réalisation que la réconciliation connaît pour une ligne : la date du
 * dernier rapport réalisé, et rien d'autre (ADR-034, N5). Le repli sur une
 * colonne de la ligne est parti avec elle — il avait ressuscité la date d'un
 * contrôle retiré et effacé un an de retard (relecture du 2026-09-12).
 */
function realisationConnue(ex: OccurrenceExistante): Date | null {
  return ex.derniereRealisation ?? null;
}

export type PlanReconciliation = {
  /** Couples (obligation, porteur) sans ligne de suivi : à insérer, datés par
   *  la décision de création (`creerParFaits`). */
  aCreer: LigneACreer[];
  /** Lignes existantes dont au moins un champ change. */
  aMettreAJour: MiseAJourOccurrence[];
  /** Lignes devenues non applicables mais porteuses de preuve : datées
   *  (`archiveLe`), jamais supprimées. Le libellé n'y figure plus — c'est un
   *  champ qui porte l'archivage depuis le N3 de l'ADR-034, plus un préfixe. */
  aArchiver: { id: string }[];
  /**
   * Lignes archivées dont l'obligation REDEVIENT applicable sans engendrer de
   * rendez-vous — une périodicité passée à `autre`, par exemple une
   * habilitation qui cesse d'être triennale.
   *
   * Elles n'apparaissent pas dans `aGenerer`, donc elles ne passent pas par
   * `aMettreAJour`, qui est l'autre chemin de désarchivage : sans cette liste,
   * elles restaient barrées à perpétuité, et le plan les comptait
   * « inchangées » (relecture du 2026-09-12).
   */
  aDesarchiver: { id: string }[];
  /** Lignes devenues non applicables et vides de toute preuve : supprimables
   *  sans perte. */
  aSupprimer: string[];
  /** Lignes strictement inchangées — le compteur qui prouve l'idempotence. */
  inchangees: number;
};

// ~~`statutCycleOuvert`~~ — retirée le 2026-09-19 (ADR-036, lot 4). Elle
// disait si la `datePrevue` d'un cycle ouvert était une vraie échéance, en
// relisant le statut que la ligne portait déjà : « planifiée » n'était jamais
// effacée par la régénération. C'est ce qui rendait le résultat dépendant de
// l'ordre des saisies. Le statut d'une ligne générée sort désormais de
// `echeanceDeLigne` ; ce qui en restait utile à la boucle finale (NB4) vit
// dans `statutDeLigneNonGeneree`, ci-dessous, qui ne décide d'aucune date.

/**
 * Le statut d'une ligne APPLICABLE que la génération saute, à son rythme
 * effectif — la seule écriture que la boucle finale du réconciliateur fait sur
 * elle (NB4, puis limite 1, 2026-09-15).
 *
 * UNE RÈGLE, depuis le lot 5 de l'ADR-036 (2026-09-19) : UN STATUT RÉALISÉ NE
 * SURVIT PAS SANS RAPPORT RÉALISÉ.
 *
 *  · sans rythme suivant : le résultat du dernier rapport réalisé, s'il y en a
 *    un — la ligne est soldée ; sinon « à planifier » si la ligne porte un
 *    statut réalisé ou si son rythme est SANS RENDEZ-VOUS — aucune échéance
 *    n'est attendue, et `lignePortantSansRendezVous` la tient hors des
 *    retards. Une mise en service garde son statut : elle, a un rendez-vous ;
 *  · sur un rythme : « planifiée » si la ligne l'était déjà ou si un contrôle
 *    réel est derrière elle, « à planifier » autrement. Un statut réalisé n'y
 *    survit jamais, rapport ou non : un contrôle suivi d'un rendez-vous est
 *    « planifié » (ADR-034).
 *
 * ~~Un statut réalisé sans rapport était gardé — la « seule trace » d'un legs
 * (`garderLegs`), sauf au retrait d'un rapport réalisé.~~ Retiré au lot 5 :
 * le contrôle de santé du 2026-09-19 n'a compté aucun legs en production, et
 * aucun chemin du produit n'en écrit. Sur un rythme, la branche est de plus
 * inatteignable aujourd'hui — une ligne cyclique applicable est toujours
 * générée, un titre cyclique ayant toujours une échéance (`echeanceDuTitre`).
 *
 * Idempotente par construction : appliquée à son propre résultat, elle le
 * rend.
 */
function statutDeLigneNonGeneree(
  ex: OccurrenceExistante,
  effective: Periodicite,
): StatutVerificationPersiste {
  if (!estCyclique(effective)) {
    const solde = statutDepuisResultat(ex.dernierResultat);
    if (solde !== null) return solde;
    if (estStatutRealise(ex.statut) || estSansRendezVous(effective)) {
      return "a_planifier";
    }
    return ex.statut;
  }
  // SUR UN RYTHME, sans passer par la génération. (C'était
  // `statutCycleOuvert`, recopiée ici pour ce seul usage, qui ne touche pas à
  // la date.)
  if (ex.statut === "planifiee" || realisationConnue(ex) !== null) {
    return "planifiee";
  }
  return "a_planifier";
}

function memeListe(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function memeInstant(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return a.getTime() === b.getTime();
}

/**
 * Rapproche l'état souhaité (sortie du matching + du générateur) de l'état
 * en base, et produit le **plan minimal** d'écritures.
 *
 * Fonction pure : aucune I/O, horloge injectable. C'est elle qui porte toutes
 * les décisions de conservation ; `lib/calendrier/actions.ts` ne fait
 * qu'exécuter le plan dans une transaction.
 *
 * `aGenerer` est produit **sans** historique : le générateur y décrit
 * l'ensemble des couples applicables, leurs attributs de référentiel et leurs
 * sources. La date de chaque ligne se calcule ici, par `echeanceDeLigne`, sur
 * les faits de la ligne en base (ADR-036). Passer l'historique au générateur ferait disparaître de
 * `aGenerer` les obligations « mise en service » déjà réalisées, qui seraient
 * alors prises pour des obligations retirées du référentiel — et archivées à
 * tort.
 */
/**
 * LA RÈGLE DE FUSION : quand N lignes sont absorbées par une seule, laquelle
 * de leurs réalisations la ligne unique reprend-elle ?
 *
 * **La PLUS ANCIENNE.** Isolée dans cette fonction pour que la trancher
 * autrement soit une ligne à changer, pas une chasse dans le fichier.
 *
 * POURQUOI LA PLUS ANCIENNE, ET CE QUE CETTE RAISON VAUT. C'est une
 * **déduction**, pas une phrase de texte — la veille du 2026-09-10 l'a
 * cherchée aux sources primaires et ne l'a pas trouvée : `R. 4222-20` ne porte
 * aucun chiffre, l'arrêté du 8 octobre 1987 dit « au minimum une fois par an »
 * sans dire d'où part l'intervalle, et le focus juridique de l'INRS le reprend
 * sans le préciser. Ce qui est écrit, en revanche, c'est que l'obligation
 * absorbante porte sur « l'ensemble des installations » et sur « TOUS les
 * éléments » : un élément contrôlé il y a plus d'un an la rend non satisfaite,
 * quoi qu'aient dit les autres. C'est donc le plus ancien qui commande.
 *
 * Et c'est le sens d'erreur qu'on veut. Prendre la plus récente ferait
 * afficher « à jour » un parc contrôlé au tiers ; ne rien reprendre ferait
 * afficher « à planifier » un acte accompli. La plus ancienne se trompe vers
 * « à refaire », jamais vers « rien à faire » — cohérent avec l'ADR-022, qui a
 * déjà tranché que le tout hérite de la criticité la plus HAUTE de ses
 * fragments.
 *
 * UNE LIGNE SANS RÉALISATION NE LÈGUE RIEN, et ne bloque rien non plus : elle
 * n'atteste d'aucun contrôle, seulement d'une absence d'enregistrement. La
 * faire primer donnerait une ligne absorbante vierge, donc « à planifier »,
 * donc le symptôme qu'on répare.
 */
function reprendreLaRealisation(
  candidate: Date,
  dejaRetenue: Date | undefined,
): Date {
  if (dejaRetenue === undefined) return candidate;
  return candidate < dejaRetenue ? candidate : dejaRetenue;
}

/**
 * La même règle, appliquée à deux LIGNES plutôt qu'à deux dates : sert à
 * départager plusieurs prédécesseurs candidats à l'adoption.
 *
 * Une ligne sans réalisation ne l'emporte jamais sur une ligne qui en porte
 * une — elle n'atteste de rien, et adopter la vide ferait perdre la seule date
 * connue.
 */
function plusAncienne(
  candidate: OccurrenceExistante,
  retenue: OccurrenceExistante,
): boolean {
  const c = realisationConnue(candidate);
  const r = realisationConnue(retenue);
  if (c === null) return false;
  if (r === null) return true;
  return c < r;
}

/**
 * Ce que les obligations retirées lèguent à celles qui les absorbent.
 *
 * DEUX TABLES, ET LA RAISON D'ÊTRE DE LA SECONDE. Une ligne est identifiée par
 * une obligation ET un porteur ; ne retenir que l'obligation ferait, le jour où
 * un absorbant serait porté par un ÉQUIPEMENT, hériter une seule réalisation à
 * TOUTES ses lignes. Un contrôle fait sur la VMC daterait la ligne de la hotte
 * jamais contrôlée, qui naîtrait « planifiée » — exactement le sens d'erreur
 * que `reprendreLaRealisation` dit éviter.
 *
 *  · `parCle` — le porteur est CONSERVÉ : la ligne d'un appareil hérite de la
 *    ligne du même appareil. C'est le cas d'un simple changement de nom.
 *  · `parObligation` — les porteurs sont FONDUS : N lignes d'équipement pour
 *    une ligne d'établissement. Consultée uniquement par une ligne
 *    d'établissement, qui est seule par construction, donc seule destinataire
 *    possible d'une fusion.
 *
 * Les quatre successions déclarées à ce jour visent toutes un absorbant porté
 * par l'établissement : c'est `parObligation` qui sert. `parCle` n'a pas
 * d'utilisateur — elle existe pour que le premier absorbant porté par un
 * équipement ne se serve pas en silence de la mauvaise table.
 */
export function heritageDesRetirees(
  existantes: OccurrenceExistante[],
  successions: ReadonlyMap<string, string> | undefined,
): { parCle: Map<string, Date>; parObligation: Map<string, Date> } {
  const parCle = new Map<string, Date>();
  const parObligation = new Map<string, Date>();
  if (successions === undefined) return { parCle, parObligation };

  for (const ex of existantes) {
    const absorbant = successions.get(ex.obligationId);
    const realisation = realisationConnue(ex);
    if (absorbant === undefined || realisation === null) continue;

    const cle = cleDeLigne(absorbant, {
      equipementId: ex.equipementId,
      salarieId: ex.salarieId ?? null,
    });
    parCle.set(cle, reprendreLaRealisation(realisation, parCle.get(cle)));
    parObligation.set(
      absorbant,
      reprendreLaRealisation(realisation, parObligation.get(absorbant)),
    );
  }
  return { parCle, parObligation };
}

/**
 * Ce que le réconciliateur sait d'une ligne existante au moment de décider sa
 * date et son statut — et rien de plus : la décision ne voit ni le plan ni
 * les autres lignes.
 */
export type ContexteExistante = {
  /** La ligne en base, telle que la lecture l'a vue. */
  ex: OccurrenceExistante;
  /** La ligne générée qui la continue — attributs de référentiel et `sources`. */
  g: VerificationGenere;
  /** La réalisation léguée par les lignes absorbées, ou `null`. */
  heritee: Date | null;
  /** L'horloge de la passe — repli de l'origine d'une ligne sans `suiviDepuis`. */
  now: Date;
};

/** Ce que le réconciliateur sait d'une ligne À CRÉER. */
export type ContexteCreation = {
  g: VerificationGenere;
  heritee: Date | null;
  /** L'horloge de la passe : l'origine du suivi de la ligne à naître. */
  now: Date;
};

/** Ce qu'une décision rend. `source` dit d'où sort la date — pour le contrôle
 *  de santé et les tests, jamais persistée. */
export type DecisionDeLigne = {
  datePrevue: Date;
  statut: StatutVerificationPersiste;
  source?: string;
};

// ~~`StrategieDecision`~~ — la COUTURE posée au lot 2b de l'ADR-036
// (2026-09-18) pour faire tourner deux stratégies côte à côte, retirée au lot 5
// (2026-09-19) : depuis la bascule il n'y en avait plus qu'une. Le
// réconciliateur appelle directement `deciderParFaits` et `creerParFaits`
// (`decision-par-faits.ts`) — la date et le statut sortent de
// `echeanceDeLigne`, pour une ligne existante comme pour une ligne à créer.

export function reconcilierCalendrier(
  existantes: OccurrenceExistante[],
  aGenerer: VerificationGenere[],
  options: OptionsGenerateur = {},
): PlanReconciliation {
  const now = options.now ?? new Date();

  const parCle = new Map<string, OccurrenceExistante>();
  for (const ex of existantes) {
    parCle.set(
      cleDeLigne(ex.obligationId, {
        equipementId: ex.equipementId,
        salarieId: ex.salarieId ?? null,
      }),
      ex,
    );
  }

  const plan: PlanReconciliation = {
    aCreer: [],
    aMettreAJour: [],
    aArchiver: [],
    aDesarchiver: [],
    aSupprimer: [],
    inchangees: 0,
  };
  const vues = new Set<string>();
  // Les clés des lignes ADOPTÉES : elles ont changé d'identifiant d'obligation,
  // donc leur ancienne clé ne sera jamais « vue » par une ligne générée. Sans
  // ce second registre, la boucle finale les prendrait pour des orphelines et
  // les barrerait — celles-là mêmes qu'on vient de sauver.
  const adoptees = new Set<string>();

  // Ce que les obligations retirées lèguent à celles qui les absorbent :
  // identifiant absorbant → réalisation reprise.
  const heritage = heritageDesRetirees(existantes, options.successions);

  // À qui succède-t-on. DEUX SOURCES, et il en faut deux :
  //
  //  · `g.succedeA` — la SCISSION. L'obligation qui hérite le déclare
  //    elle-même, et la ligne générée le porte jusqu'ici. Rien n'est retiré du
  //    référentiel dans ce cas : c'est une part de la population qui change
  //    d'identifiant, et l'ancienne obligation continue de vivre pour les
  //    autres. Aucune table de retraits ne peut donc la voir.
  //
  //  · `options.successions` — la FUSION. L'obligation retirée nomme celle qui
  //    l'absorbe (`OBLIGATIONS_RETIREES.absorbePar`), et il faut bien qu'elle
  //    le fasse de ce côté-là : une obligation qui n'existe plus ne se déclare
  //    plus rien.
  //
  // Un identifiant peut avoir plusieurs prédécesseurs — c'est une fusion —, et
  // un prédécesseur plusieurs successeurs — c'est une scission.
  const predecesseurs = new Map<string, string[]>();
  const ajouterPredecesseur = (nouveau: string, ancien: string) => {
    const liste = predecesseurs.get(nouveau) ?? [];
    if (!liste.includes(ancien)) liste.push(ancien);
    predecesseurs.set(nouveau, liste);
  };
  for (const [ancien, nouveau] of options.successions ?? []) {
    ajouterPredecesseur(nouveau, ancien);
  }
  for (const g of aGenerer) {
    for (const ancien of g.succedeA ?? []) {
      ajouterPredecesseur(g.obligationId, ancien);
    }
  }

  /**
   * La ligne existante que cette ligne générée CONTINUE, s'il y en a une.
   *
   * Condition stricte : même porteur. Une ligne d'équipement ne peut continuer
   * que la ligne du même appareil, une ligne d'établissement que la ligne
   * d'établissement — sans quoi on ferait migrer une rangée d'un porteur à un
   * autre, ce qu'aucune succession déclarée ne dit et que la contrainte
   * d'unicité ne pardonnerait pas.
   *
   * Quand plusieurs prédécesseurs sont candidats — une fusion dont les
   * fragments partagent le porteur de l'absorbant —, c'est la réalisation la
   * plus ancienne qui l'emporte, comme partout ailleurs dans ce fichier. Les
   * autres suivent le chemin ordinaire : archivées avec leur preuve.
   */
  function adopter(g: VerificationGenere): OccurrenceExistante | undefined {
    const preds = predecesseurs.get(g.obligationId);
    if (preds === undefined) return undefined;

    let cleRetenue: string | undefined;
    let retenue: OccurrenceExistante | undefined;
    for (const pred of preds) {
      const cle = cleDeLigne(pred, {
        equipementId: g.equipementId,
        salarieId: g.salarieId,
      });
      if (adoptees.has(cle)) continue;
      const candidate = parCle.get(cle);
      if (candidate === undefined) continue;

      if (retenue === undefined || plusAncienne(candidate, retenue)) {
        cleRetenue = cle;
        retenue = candidate;
      }
    }

    if (cleRetenue === undefined) return undefined;
    adoptees.add(cleRetenue);
    return retenue;
  }

  for (const g of aGenerer) {
    // ADOPTION AVANT TOUT. Une ligne dont l'obligation a changé de nom n'est
    // pas une ligne perdue : c'est la même ligne, et elle doit rester la même
    // RANGÉE — avec son identifiant, ses rapports et ses actions attachés.
    // Reporter seulement l'échéance sur une ligne neuve marcherait aussi, mais
    // laisserait la preuve sur une ligne barrée pendant que la ligne vivante
    // affiche une date qu'elle ne peut pas justifier.
    const ex = parCle.get(g.cleUnique) ?? adopter(g);
    // Le porteur d'abord — une ligne hérite de la ligne du même appareil.
    // À défaut, et SEULEMENT si cette ligne est celle de l'établissement, la
    // fusion : N porteurs fondus en un, qui est seul par construction.
    const estLigneEtablissement =
      g.equipementId === null && g.salarieId === null;
    const heritee =
      heritage.parCle.get(g.cleUnique) ??
      (estLigneEtablissement
        ? heritage.parObligation.get(g.obligationId)
        : undefined) ??
      null;

    if (!ex) {
      // LA LIGNE NAÎT DATÉE DE SES FAITS, par la même fonction qu'une ligne
      // existante — origine = l'horloge de la passe, que `actions.ts` écrit
      // dans `suiviDepuis`. Une absorbante neuve naît donc datée de l'héritage
      // (règle 3), et non « à planifier », urgente, pour un acte accompli.
      const d = creerParFaits({ g, heritee, now });
      if (estStatutRealise(d.statut)) {
        // Inatteignable : une ligne qui n'existe pas encore ne porte aucun
        // rapport, donc aucune réalisation à solder. Le refus est explicite
        // plutôt qu'un `as` qui ferait entrer un statut réalisé dans
        // `aCreer`, dont le type ne le connaît pas.
        throw new Error(
          `reconcilierCalendrier : la décision de création a rendu le statut ` +
            `réalisé « ${d.statut} » pour la ligne « ${g.cleUnique} », qui ` +
            `n'existe pas encore.`,
        );
      }
      plan.aCreer.push({
        ...g,
        datePrevue: d.datePrevue,
        statut: d.statut as StatutVerificationGen,
      });
      continue;
    }
    vues.add(g.cleUnique);

    // Attributs de référentiel : toujours réalignés. C'est ce qui fait
    // qu'une correction de libellé ou de périodicité dans
    // `lib/referentiels/conformite/` se propage sans détruire la ligne.
    // Une obligation qui redevient applicable redevient normale : l'écriture
    // de la mise à jour remet `archiveLe` à `null` (`calendrier/actions.ts`).
    // La réalisation que la ligne prouve — son dernier rapport réalisé, lu sur
    // les rapports (ADR-034) — est rassemblée par `faitsDeLigne`.

    // LA DATE ET LE STATUT sortent de `echeanceDeLigne`, sur les faits de la
    // ligne (`deciderParFaits`). Le réconciliateur ne décide d'aucune date ; il
    // rassemble ce que la décision doit savoir et écrit ce qu'elle rend
    // (ADR-036). Ce qu'il garde en propre, ce sont ses PROTECTIONS : adoption,
    // non-suppression d'une ligne qui porte une trace, archivage et
    // désarchivage, porteur disparu, boucle NB4 — plus bas —, et, dans
    // `actions.ts`, les écritures conditionnées et le sceau.

    const decidee = deciderParFaits({ ex, g, heritee, now });

    const cible: MiseAJourOccurrence = {
      id: ex.id,
      obligationId: g.obligationId,
      libelleObligation: g.libelleObligation,
      periodicite: g.periodicite,
      realisateurRequis: g.realisateurRequis,
      datePrevue: decidee.datePrevue,
      statut: decidee.statut,
      prescriptionId: g.prescriptionId,
      // Portée pour le contrôle de santé et les tests ; `actions.ts` ne la lit
      // pas et `identique` ne la compare pas.
      ...(decidee.source === undefined ? {} : { source: decidee.source }),
    };

    const identique =
      cible.obligationId === ex.obligationId &&
      cible.libelleObligation === ex.libelleObligation &&
      cible.periodicite === ex.periodicite &&
      memeListe(cible.realisateurRequis, ex.realisateurRequis) &&
      memeInstant(cible.datePrevue, ex.datePrevue) &&
      cible.statut === ex.statut &&
      cible.prescriptionId === (ex.prescriptionId ?? null) &&
      // UNE LIGNE ARCHIVÉE N'EST JAMAIS « INCHANGÉE », puisqu'on vient de la
      // regénérer : son obligation s'applique de nouveau, donc `archiveLe` doit
      // tomber. Et il ne tombe QUE par une mise à jour — `calendrier/actions.ts`
      // écrit `archiveLe: null` dans le `data` de chaque entrée de
      // `aMettreAJour`, nulle part ailleurs. Sans cette clause, une ligne dont
      // tous les autres champs sont déjà alignés repart en `inchangees` et
      // reste barrée à perpétuité sur une obligation applicable : invisible au
      // calendrier, absente de tous les comptes.
      //
      // Le préfixe de libellé masquait le cas : il vivait dans un champ que
      // cette comparaison lit, donc une ligne barrée différait toujours du
      // référentiel. En le déplaçant dans un champ propre (ADR-034, N3), le
      // désarchivage a cessé d'être un effet de bord du libellé — il se dit ici.
      (ex.archiveLe ?? null) === null;

    if (identique) plan.inchangees += 1;
    else plan.aMettreAJour.push(cible);
  }

  // Ce qui reste : des lignes de suivi que le générateur n'a pas produites.
  //
  // Deux causes, et il a fallu apprendre à les distinguer : l'obligation a été
  // RETIRÉE du référentiel, ou elle s'applique toujours mais n'a plus
  // d'échéance datable (`periodicite: "autre"` — un état permanent, que la
  // boucle de génération saute). Les confondre revient à étiqueter « Ne
  // s'applique plus » une obligation qui s'applique parfaitement, ce qui est
  // exactement le genre de mensonge qu'un dossier présenté en contrôle ne doit
  // pas porter. Cas vécu : le passage de l'habilitation électrique de
  // `triennale` à `autre` (ADR-023 § 6).
  const encoreApplicables = options.obligationsEncoreApplicables;
  for (const [cle, ex] of parCle) {
    // `adoptees` : ces lignes ont changé d'identifiant d'obligation, donc leur
    // ancienne clé n'a été vue par aucune ligne générée. Elles ne sont pas
    // orphelines pour autant — elles CONTINUENT sous un autre nom.
    if (vues.has(cle) || adoptees.has(cle)) continue;
    // Une réalisation connue — le dernier rapport réalisé — compte comme une
    // trace au même titre qu'un rapport de tout résultat.
    // `estStatutRealise` compte comme trace : une obligation sans rendez-vous
    // suivant, consommée, n'a plus ni rapport ni date sur sa ligne une fois
    // que la réconciliation a éteint la colonne (ADR-034) — la supprimer
    // effacerait le seul témoignage qu'elle a été faite.
    const porteUneTrace =
      ex.porteUnePreuve ||
      realisationConnue(ex) !== null ||
      estStatutRealise(ex.statut);

    // LE PORTEUR DE CETTE LIGNE-CI EXISTE-T-IL ENCORE ? La question n'est pas
    // celle de l'applicabilité de l'obligation : une ligne est identifiée par
    // une obligation ET un porteur, et l'obligation peut vivre chez un autre
    // appareil que celui-ci. Deux extincteurs, l'un retiré : l'obligation
    // s'applique toujours, mais pas à l'appareil retiré.
    //
    // Le porteur établissement ne disparaît pas. ~~Le porteur salarié disparaît
    // sans que sa ligne soit barrée (ADR-023).~~ Depuis le 2026-09-17, il se
    // teste comme l'appareil : une personne sortie de l'effectif, ou un titre
    // retiré, fait sortir la ligne des comptes — archivée avec sa trace. Une
    // réactivation la rouvre par le chemin ordinaire (`aMettreAJour` si elle
    // est générée, `aDesarchiver` sinon).
    const salarieId = ex.salarieId ?? null;
    const porteurDisparu =
      (ex.equipementId !== null &&
        options.equipementsEnService !== undefined &&
        !options.equipementsEnService.has(ex.equipementId)) ||
      (salarieId !== null &&
        options.titresActifs !== undefined &&
        !options.titresActifs.has(
          cleDeLigne(ex.obligationId, { equipementId: null, salarieId }),
        ));

    // L'obligation vit encore ET son porteur aussi : la ligne n'a simplement
    // plus de rendez-vous.
    // Sans preuve, elle ne dit plus rien et disparaît — elle n'aurait jamais dû
    // porter de date. Avec une preuve, elle reste telle quelle : c'est le
    // constat d'un contrôle qui a eu lieu, et rien ne justifie de le barrer.
    // Par clé d'applicabilité — obligation × appareil pour une ligne
    // d'équipement —, jamais par identifiant nu : voir `cleApplicabilite`.
    if (
      encoreApplicables?.has(cleApplicabilite(ex.obligationId, ex.equipementId)) &&
      !porteurDisparu
    ) {
      const effective = options.periodicitesEffectives?.get(
        cleApplicabilite(ex.obligationId, ex.equipementId),
      );
      // Le statut qu'elle doit porter, calculé une fois : il entre dans la
      // condition, pour que les lignes déjà réalignées avant la limite 1 — `autre`
      // et « planifiée » — soient rattrapées sans que leur rythme ait bougé.
      const statutCible =
        effective === undefined
          ? ex.statut
          : statutDeLigneNonGeneree(ex, effective);
      if (!porteUneTrace) plan.aSupprimer.push(ex.id);
      // ELLE A CHANGÉ DE RYTHME SANS REPASSER PAR LA GÉNÉRATION (NB4,
      // 2026-09-15). Le cas vécu : une prescription donne un rythme semestriel
      // à une obligation `autre` sur un appareil ; un rapport fait rouler la
      // ligne ; la prescription est levée. L'obligation n'engendre plus de
      // ligne, et celle-ci restait semestrielle, marquée de sa prescription —
      // contractuelle le cas échéant (ADR-032) —, en retard à sa date, et un
      // nouveau dépôt la faisait encore rouler au semestre. Elle passe par
      // `aMettreAJour`, qui remet aussi `archiveLe` à `null` et reste
      // conditionnée sur la date et le statut lus.
      //
      // Ce qui est réécrit, et rien d'autre : le rythme, la prescription (une
      // clé non générée n'a plus de surcharge : une surcharge en vigueur
      // donne un rythme, donc une ligne générée), et le statut — lu sur le
      // dernier rapport réalisé quand il n'y a plus de rendez-vous suivant,
      // comme la branche « ponctuelle » plus haut, sinon celui d'un cycle
      // ouvert. L'échéance ne bouge pas : sans rythme il n'y a rien à
      // recalculer. ~~Une ligne sans rapport réalisé (une action seule, un
      // « non vérifiable ») garde son statut, donc sa date décide encore.~~
      // Depuis la limite 1 (2026-09-15), elle passe « à planifier » quand son
      // rythme est sans rendez-vous : elle n'est plus en retard, et
      // `lignePortantSansRendezVous` la sort des comptes.
      else if (
        effective !== undefined &&
        (effective !== ex.periodicite ||
          (ex.prescriptionId ?? null) !== null ||
          statutCible !== ex.statut)
      ) {
        plan.aMettreAJour.push({
          id: ex.id,
          obligationId: ex.obligationId,
          libelleObligation: ex.libelleObligation,
          periodicite: effective,
          realisateurRequis: ex.realisateurRequis,
          datePrevue: ex.datePrevue,
          statut: statutCible,
          prescriptionId: null,
        });
      }
      // ELLE REDEVIENT APPLICABLE, DONC ELLE SE ROUVRE. Le cas : une obligation
      // qui passe à `periodicite: "autre"` — une habilitation qui cesse d'être
      // triennale — n'engendre plus de ligne, donc n'arrive jamais par
      // `aMettreAJour`, l'autre chemin de désarchivage. Sans ceci, une ligne
      // barrée pendant que l'appareil était retiré restait barrée à
      // perpétuité, et le plan la comptait « inchangée » (relecture du
      // 2026-09-12).
      else if (ex.archiveLe != null) plan.aDesarchiver.push({ id: ex.id });
      else plan.inchangees += 1;
      continue;
    }

    // L'ARCHIVAGE EST UNE DATE, plus un préfixe de libellé (ADR-034, N3) :
    // `plan.aArchiver` ne porte donc plus que des identifiants, et la ligne
    // garde son libellé tel que le référentiel l'a écrit.
    if (!porteUneTrace) {
      // CE QUE CETTE SUPPRESSION LAISSE PASSER, et il vaut mieux l'écrire que
      // le redécouvrir : désactiver puis réactiver un appareil BLANCHIT le
      // retard accumulé sur ses lignes sans preuve. La ligne est supprimée à la
      // désactivation, recréée à la réactivation, et son ORIGINE DE SUIVI
      // repart de la réactivation (`suiviDepuis` neuf) — donc un « à
      // planifier » repart de zéro. L'ADR-036 § 8 l'écrit comme limite : ni
      // aggravée ni fermée par la bascule.
      //
      // Ce n'est pas un trou ouvert par le porteur : il existait déjà pour le
      // parc d'un seul appareil, où le retrait rend l'obligation inapplicable
      // et emporte la ligne par le même chemin. Le lot 2 l'élargit au parc
      // multiple, il ne l'invente pas. Le refermer voudrait dire archiver une
      // ligne qui n'atteste de rien, contre la règle — établie et éprouvée —
      // qu'une ligne sans preuve « ne dit plus rien et disparaît ».
      plan.aSupprimer.push(ex.id);
    } else if (ex.archiveLe == null) {
      plan.aArchiver.push({ id: ex.id });
    } else {
      plan.inchangees += 1;
    }
  }

  return plan;
}
