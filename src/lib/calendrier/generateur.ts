/**
 * Générateur du calendrier de vérifications (étape 6).
 *
 * Fonction pure qui, à partir de la liste d'obligations applicables
 * (sortie du moteur de matching) et des vérifications déjà réalisées
 * pour cet établissement, produit la **prochaine occurrence** de
 * vérification pour chaque couple (obligation, équipement déclencheur).
 *
 * Règles (cf. spec/PLAN.md étape 6) :
 *   1. Une occurrence par couple (obligationId, equipementId).
 *   2. Si la périodicité est `mise_en_service_uniquement` :
 *        - dernière vérif connue → pas de nouvelle occurrence (one-shot)
 *        - mise en service à venir → `planifiee` à cette date
 *        - sinon → `a_planifier`, datée de la mise en service si on la
 *          connaît, de `now` à défaut. Jamais urgente : il n'y a pas
 *          d'échéance à dépasser, il manque une pièce au dossier.
 *   3. Si la périodicité est `autre` → aucune occurrence (obligation permanente
 *      sans échéance périodique, ex. tenue du registre de sécurité).
 *   4. Si pas de dernière vérif connue mais une **mise en service** qui place
 *      la première échéance dans le futur → datePrevue = `miseEnService +
 *      periodicite`, statut = `planifiee`. C'est le cas de l'équipement neuf :
 *      un extincteur installé le 15 mars se vérifie le 15 mars suivant, et
 *      l'outil n'a pas à demander une date qu'il sait déduire.
 *   4 bis. Si la mise en service place cette échéance dans le passé, on ne
 *      conclut rien : l'équipement n'est plus dans son premier cycle et des
 *      vérifications ont pu avoir lieu sans être saisies. Annoncer un retard
 *      de sept ans serait inventer. → statut = `a_planifier`.
 *   4 ter. Si rien n'est connu → datePrevue = `now`, statut = `a_planifier`.
 *   5. Si dernière vérif connue → datePrevue = `dateRealisee + periodicite`,
 *      statut = `planifiee` si datePrevue ≥ now, `depassee` sinon.
 *
 * Le statut Prisma `a_planifier` couvre deux réalités UI :
 *   - "à planifier d'urgence" (aucune vérif connue)   → priorité haute
 *   - "à planifier normalement"
 * La distinction est faite par le champ `estUrgent` du résultat, pas par
 * un enum en base — pour ne pas polluer l'enum Prisma avec de l'UI.
 */

import {
  PERIODICITE_EN_JOURS,
  type Periodicite,
  type Realisateur,
} from "@/lib/referentiels/types-communs";
import { estEnRetard } from "@/lib/dates/retard";
import {
  MARQUEUR_NON_APPLICABLE,
  estMarqueeNonApplicable,
  marquerNonApplicable,
  libelleSansMarqueur,
} from "./marqueur";
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

export type StatutVerificationGen =
  | "a_planifier"
  | "planifiee"
  | "depassee";

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
  periodicite: Periodicite;
  realisateurRequis: Realisateur[];
  datePrevue: Date;
  statut: StatutVerificationGen;
  /**
   * true si aucune vérification passée n'est connue — déclenche un signal
   * UI "à planifier d'urgence" sans créer d'enum supplémentaire en base.
   */
  estUrgent: boolean;
  /** Criticité issue de l'obligation (1-5). Sert au tri par priorité. */
  criticiteObligation: 1 | 2 | 3 | 4 | 5;
  /** Raisons textuelles du matching — copiées du résultat du moteur. */
  raisons: string[];
  /**
   * `datePrevue` est-elle un **fait déclaré** plutôt qu'une échéance calculée ?
   *
   * Pour un équipement ou un établissement, la date sort d'un calcul : mise en
   * service + périodicité. La réconciliation refuse de la bouger sur un cycle
   * ouvert, et elle a raison — déclarer un extincteur de plus ne doit pas
   * effacer un retard accumulé.
   *
   * Pour un titre de salarié, la date sort de la **pièce que l'employeur a en
   * main**. Refuser de la bouger revenait à figer la ligne à sa création : un
   * renouvellement saisi ne changeait rien, et le calendrier annonçait une
   * attestation dépassée à perpétuité. La rectification que `docs/rgpd.md`
   * § 5.2 promet (art. 16) ne se voyait nulle part.
   */
  datePrevueFaisantFoi?: boolean;
  /**
   * Prescription particulière (ADR-014) à l'origine de la périodicité
   * (surcharge) ou de la ligne (sur mesure). `null` = référentiel seul.
   */
  prescriptionId: string | null;
};

export type VerificationsPrecedentes = Map<string, Date>;

export type OptionsGenerateur = {
  /** Horloge injectable pour les tests. Défaut = `new Date()`. */
  now?: Date;
  /**
   * Date de mise en service, par identifiant d'équipement. Sert de point de
   * départ **à défaut** de vérification connue — un équipement neuf n'a pas
   * d'historique, mais sa première échéance est calculable.
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
   */
  obligationsEncoreApplicables?: Set<string>;
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
   * **Seul le porteur ÉQUIPEMENT est concerné**, et c'est délibéré. Un porteur
   * établissement ne disparaît jamais. Un porteur salarié disparaît, mais
   * l'ADR-023 a tranché que sa ligne n'est PAS barrée pour autant : c'est la
   * personne qui est partie, pas l'obligation qui cesse — et la ligne atteste
   * qu'elle détenait son titre au moment où elle opérait.
   *
   * Absent = comportement antérieur : un porteur disparu ne se distingue pas
   * d'un porteur vivant.
   */
  equipementsEnService?: Set<string>;
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

function ajouterJours(d: Date, jours: number): Date {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + jours);
  return out;
}

function prochaineDate(
  derniere: Date,
  periodicite: Periodicite,
): Date | null {
  const jours = PERIODICITE_EN_JOURS[periodicite];
  if (jours === null) return null;
  return ajouterJours(derniere, jours);
}

/**
 * Génère la prochaine occurrence de vérification pour chaque couple
 * (obligation applicable × équipement déclencheur).
 */
export function genererProchainesVerifications(
  obligations: ObligationApplicable[],
  verificationsPrecedentes: VerificationsPrecedentes = new Map(),
  options: OptionsGenerateur = {},
): VerificationGenere[] {
  const now = options.now ?? new Date();
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
      // prescription particulière (ADR-014) sur cet équipement.
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
      const derniere = verificationsPrecedentes.get(cleUnique);


      // One-shot : mise en service uniquement.
      //
      // L'occurrence est datée de la mise en service quand on la connaît, et
      // non de « maintenant ». Datée de maintenant, elle se redatait à chaque
      // régénération : une chambre froide installée en 2015 héritait, dix ans
      // plus tard, d'une échéance urgente réputée due aujourd'hui, et elle le
      // resterait à perpétuité — la date suivait l'horloge au lieu de suivre
      // l'événement.
      //
      // Et elle n'est jamais urgente. L'urgence, dans ce module, se déduit
      // d'une date dépassée (`estDepassee`) ; ici il n'y a pas d'échéance à
      // dépasser — l'événement qui la déclenche a eu lieu, ou n'a pas eu
      // lieu. Ce qui manque au dossier est une pièce, pas un rendez-vous, et
      // c'est ce que dit « à planifier ». La marquer urgente faisait remonter
      // en tête du calendrier, sur un parc repris, autant de lignes que
      // d'appareils anciens — sans qu'aucune ne soit due à cette date.
      if (periodicite === "mise_en_service_uniquement") {
        if (derniere) continue; // déjà réalisé, pas de nouvelle occurrence
        // Une ligne d'établissement n'a pas de mise en service : il n'y a pas
        // d'appareil dont on daterait l'installation. Le point de départ d'un
        // premier cycle viendra, pour elle, d'un autre fait (ADR-022) ; en
        // attendant, `null` la place à « à planifier », ce qui est juste.
        const miseEnService =
          eq.id === null ? null : (options.misesEnService?.get(eq.id) ?? null);
        const aVenir =
          miseEnService !== null && miseEnService.getTime() >= now.getTime();
        out.push({
          cleUnique,
          obligationId: o.id,
          libelleObligation: o.libelle,
          equipementId: eq.id,
          salarieId: eq.salarieId,
          periodicite,
          realisateurRequis: o.realisateurs,
          datePrevue: miseEnService ?? now,
          statut: aVenir ? "planifiee" : "a_planifier",
          estUrgent: false,
          criticiteObligation: o.criticite,
          raisons,
          prescriptionId,
        });
        continue;
      }

      if (derniere) {
        const prochaine = prochaineDate(derniere, periodicite);
        if (!prochaine) continue;
        const estDepassee = prochaine.getTime() < now.getTime();
        out.push({
          cleUnique,
          obligationId: o.id,
          libelleObligation: o.libelle,
          equipementId: eq.id,
          salarieId: eq.salarieId,
          periodicite,
          realisateurRequis: o.realisateurs,
          datePrevue: prochaine,
          statut: estDepassee ? "depassee" : "planifiee",
          estUrgent: estDepassee,
          criticiteObligation: o.criticite,
          raisons,
          prescriptionId,
        });
      } else {
        // Pas d'historique. La mise en service peut tenir lieu de départ,
        // mais seulement tant qu'elle place la première échéance devant
        // nous : au-delà, l'équipement a vécu sans que le dossier le sache,
        // et un retard calculé sur ce silence serait une invention.
        const miseEnService =
          eq.id === null ? undefined : options.misesEnService?.get(eq.id);
        // `premierDelai` quand le texte fixe un plafond de premier cycle
        // distinct du rythme — et ICI SEULEMENT. Une vérification réalisée
        // fait repartir la récurrence, pas le premier délai : la branche
        // au-dessus, qui part du dernier rapport, ne le lit pas.
        const premiere = miseEnService
          ? prochaineDate(miseEnService, o.premierDelai ?? o.periodicite)
          : null;
        const premiereEncoreAVenir =
          premiere !== null && premiere.getTime() >= now.getTime();

        out.push({
          cleUnique,
          obligationId: o.id,
          libelleObligation: o.libelle,
          equipementId: eq.id,
          salarieId: eq.salarieId,
          periodicite,
          realisateurRequis: o.realisateurs,
          datePrevue: premiereEncoreAVenir ? premiere : now,
          statut: premiereEncoreAVenir ? "planifiee" : "a_planifier",
          estUrgent: !premiereEncoreAVenir,
          criticiteObligation: o.criticite,
          raisons,
          prescriptionId,
        });
      }
    }
  }

  return out;
}

/**
 * Criticité portée par les obligations sur mesure (ADR-014). Convention de
 * tri, pas une cotation : une prescription d'autorité prime sur la plupart
 * des lignes du référentiel dans le calendrier, sans prétendre juger de sa
 * gravité.
 */
export const CRITICITE_SUR_MESURE = 4 as const;

/**
 * Génère les occurrences des obligations sur mesure issues de prescriptions
 * particulières (ADR-014). `obligationId` est préfixé `prescription:` pour
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
  options: OptionsGenerateur = {},
): VerificationGenere[] {
  const now = options.now ?? new Date();
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
      const echeance = t.echeanceLe ?? prochaineDate(t.delivreLe, o.periodicite);
      // Pas d'échéance calculable : l'obligation n'en porte pas (état
      // permanent). Le titre existe, il n'y a simplement pas de rendez-vous à
      // inscrire — inventer une date serait pire que n'en afficher aucune.
      if (echeance === null) continue;

      const depassee = echeance.getTime() < now.getTime();
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
        datePrevue: echeance,
        statut: depassee ? "depassee" : "planifiee",
        estUrgent: depassee,
        criticiteObligation: o.criticite,
        raisons: [`titre détenu par ${t.libelle}`],
        // La date vient de la pièce, pas d'un calcul : elle prime sur ce que
        // la réconciliation a déjà écrit.
        datePrevueFaisantFoi: true,
        prescriptionId: null,
      });
    }
  }

  return out;
}

export function genererVerificationsSurMesure(
  surMesure: ObligationSurMesureApplicable[],
  options: OptionsGenerateur = {},
): VerificationGenere[] {
  const now = options.now ?? new Date();
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
        datePrevue: now,
        statut: "a_planifier",
        estUrgent: true,
        criticiteObligation: CRITICITE_SUR_MESURE,
        raisons: sm.raisons,
        prescriptionId: p.id,
      });
    }
  }
  return out;
}

/**
 * Comparateur pour le tri du calendrier : les vérifications urgentes
 * (dépassées ou à planifier) d'abord, puis par date prévue croissante,
 * puis par criticité décroissante en cas d'égalité.
 */
export function comparerParUrgence(
  a: VerificationGenere,
  b: VerificationGenere,
): number {
  // 1. Urgence (urgent avant non-urgent)
  if (a.estUrgent !== b.estUrgent) return a.estUrgent ? -1 : 1;
  // 2. Date prévue croissante
  const da = a.datePrevue.getTime();
  const db = b.datePrevue.getTime();
  if (da !== db) return da - db;
  // 3. Criticité décroissante
  return b.criticiteObligation - a.criticiteObligation;
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
// SÉMANTIQUE DE LA LIGNE DE SUIVI
// -------------------------------
//   `datePrevue`   : prochaine échéance réglementaire ;
//   `dateRealisee` : réalisation **du cycle en cours**, `null` tant que le
//                    cycle n'est pas soldé ;
//   `statut`       : état du cycle en cours ;
//   `rapports`     : l'historique complet, cycle après cycle — c'est lui qui
//                    porte la preuve, jamais le statut.
//
// Quand la période s'écoule (`dateRealisee + périodicité` est atteinte), le
// cycle est **relancé** : `dateRealisee` repasse à `null` et le statut à
// `depassee`. Rien n'est perdu — les rapports du cycle précédent restent
// attachés à la même ligne. C'est ce qui permet à l'outil de ne pas continuer
// d'afficher « Conforme » sur un contrôle annuel réalisé il y a deux ans.
// ===========================================================================

/** Statuts que peut porter une ligne en base (miroir de l'enum Prisma
 *  `StatutVerification`). Typé en union locale et non importé de
 *  `@prisma/client` pour que ce module reste pur et testable sans base. */
export type StatutVerificationPersiste =
  | StatutVerificationGen
  | "realisee_conforme"
  | "realisee_observations"
  | "realisee_ecart_majeur";

const STATUTS_REALISES: readonly StatutVerificationPersiste[] = [
  "realisee_conforme",
  "realisee_observations",
  "realisee_ecart_majeur",
];

export function estStatutRealise(s: string): boolean {
  return (STATUTS_REALISES as readonly string[]).includes(s);
}

/**
 * Marqueur d'archivage : une obligation qui cesse de s'appliquer sur une
 * ligne porteuse de preuve est marquée, jamais supprimée (ADR-012). Il vit
 * dans `marqueur.ts` — il se lit dans des modules qui n'ont pas à dépendre du
 * moteur de matching — et se réexporte ici, où il se pose.
 */
export {
  MARQUEUR_NON_APPLICABLE,
  estMarqueeNonApplicable,
  marquerNonApplicable,
  libelleSansMarqueur,
};

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
  dateRealisee: Date | null;
  statut: StatutVerificationPersiste;
  /** La ligne porte-t-elle au moins un rapport de vérification ou une action
   *  corrective ? C'est le seul critère qui autorise — ou interdit — la
   *  suppression physique. */
  porteUnePreuve: boolean;
  /** Prescription particulière à l'origine de la ligne ou de sa périodicité
   *  (ADR-014). Optionnel : les fixtures antérieures n'en ont pas. */
  prescriptionId?: string | null;
};

/** Ce qu'il faut écrire sur une ligne existante. `id` n'y figure jamais en
 *  cible d'écriture : il est stable par construction. */
export type MiseAJourOccurrence = {
  id: string;
  libelleObligation: string;
  periodicite: Periodicite;
  realisateurRequis: Realisateur[];
  datePrevue: Date;
  dateRealisee: Date | null;
  statut: StatutVerificationPersiste;
  prescriptionId: string | null;
};

export type PlanReconciliation = {
  /** Couples (obligation, équipement) sans ligne de suivi : à insérer. */
  aCreer: VerificationGenere[];
  /** Lignes existantes dont au moins un champ change. */
  aMettreAJour: MiseAJourOccurrence[];
  /** Lignes devenues non applicables mais porteuses de preuve : marquées,
   *  jamais supprimées. */
  aArchiver: { id: string; libelleObligation: string }[];
  /** Lignes devenues non applicables et vides de toute preuve : supprimables
   *  sans perte. */
  aSupprimer: string[];
  /** Lignes strictement inchangées — le compteur qui prouve l'idempotence. */
  inchangees: number;
};

/**
 * Statut à porter sur une ligne dont le cycle courant n'est **pas** soldé.
 *
 * Le retard se juge au jour civil (ADR-011) et non à l'horodatage : une
 * échéance datée d'aujourd'hui n'est pas dépassée. `planifiee` n'est conservé
 * que s'il était déjà là — il signifie « une date a été arrêtée avec le
 * prestataire », information que la régénération n'a aucune raison d'effacer.
 */
function statutCycleOuvert(
  datePrevue: Date,
  statutExistant: StatutVerificationPersiste,
  now: Date,
): StatutVerificationGen {
  if (estEnRetard(datePrevue, now)) return "depassee";
  return statutExistant === "planifiee" ? "planifiee" : "a_planifier";
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
 * `aGenerer` doit être produit **sans** historique (`verificationsPrecedentes`
 * vide) : le générateur y décrit simplement l'ensemble des couples applicables
 * et leurs attributs de référentiel. Le calcul des dates à partir de
 * l'historique est fait ici, ligne par ligne, à partir de ce qu'il y a
 * réellement en base. Passer l'historique au générateur ferait disparaître de
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
 * Ce que les obligations retirées lèguent à celles qui les absorbent.
 *
 * Rend une table `identifiant absorbant → réalisation reprise`. Une obligation
 * absorbante qui n'hérite de rien n'y figure pas.
 */
function heritageDesRetirees(
  existantes: OccurrenceExistante[],
  successions: ReadonlyMap<string, string> | undefined,
): Map<string, Date> {
  const heritage = new Map<string, Date>();
  if (successions === undefined) return heritage;

  for (const ex of existantes) {
    const absorbant = successions.get(ex.obligationId);
    if (absorbant === undefined || ex.dateRealisee === null) continue;
    heritage.set(
      absorbant,
      reprendreLaRealisation(ex.dateRealisee, heritage.get(absorbant)),
    );
  }
  return heritage;
}

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
    aSupprimer: [],
    inchangees: 0,
  };
  const vues = new Set<string>();

  // Ce que les obligations retirées lèguent à celles qui les absorbent :
  // identifiant absorbant → réalisation reprise.
  const heritage = heritageDesRetirees(existantes, options.successions);

  for (const g of aGenerer) {
    const ex = parCle.get(g.cleUnique);
    const heritee = heritage.get(g.obligationId) ?? null;

    if (!ex) {
      if (heritee === null) {
        plan.aCreer.push(g);
        continue;
      }
      // La ligne absorbante NAÎT DÉJÀ DATÉE. Sans cela, l'exploitant qui a
      // fait faire son contrôle voit apparaître une ligne « à planifier »,
      // urgente, pour un acte accompli — c'est le symptôme que ce report
      // existe pour éteindre.
      const prochaine = prochaineDate(heritee, g.periodicite);
      plan.aCreer.push(
        prochaine === null
          ? g
          : {
              ...g,
              datePrevue: prochaine,
              statut: estEnRetard(prochaine, now) ? "depassee" : "planifiee",
            },
      );
      continue;
    }
    vues.add(g.cleUnique);

    // Attributs de référentiel : toujours réalignés. C'est ce qui fait
    // qu'une correction de libellé ou de périodicité dans
    // `lib/referentiels/conformite/` se propage sans détruire la ligne.
    // Le marqueur d'archivage tombe de lui-même puisqu'on réécrit le libellé
    // depuis le référentiel : une obligation qui redevient applicable
    // redevient normale.
    let datePrevue: Date;
    let dateRealisee: Date | null;
    let statut: StatutVerificationPersiste;

    if (g.datePrevueFaisantFoi === true) {
      // EN PREMIER, et c'est le correctif du correctif. Placée après la
      // branche `dateRealisee`, elle n'était jamais atteinte dès qu'une ligne
      // de titre portait une réalisation : la date recalculée depuis
      // `dateRealisee + périodicité` écrasait celle que l'employeur venait de
      // déclarer. Le renouvellement était perdu sur un chemin sur deux.
      //
      // La date d'un titre n'est pas un calcul : elle est écrite sur la pièce
      // que l'employeur a en main. Elle prime donc sur tout, y compris sur ce
      // qu'une réalisation antérieure ferait déduire — c'est la rectification
      // que `docs/rgpd.md` § 5.2 promet (art. 16).
      //
      // La preuve ne bouge pas : `dateRealisee` et le statut réalisé sont
      // repris tels quels, et une ligne portant un rapport n'est de toute
      // façon jamais candidate à la suppression.
      datePrevue = g.datePrevue;
      dateRealisee = ex.dateRealisee;
      statut = estStatutRealise(ex.statut) ? ex.statut : g.statut;
    } else if (ex.dateRealisee !== null) {
      const prochaine = prochaineDate(ex.dateRealisee, g.periodicite);
      if (prochaine === null) {
        // Périodicité sans échéance suivante (`mise_en_service_uniquement`,
        // `autre`) : le one-shot est consommé, plus rien à replanifier.
        datePrevue = ex.datePrevue;
        dateRealisee = ex.dateRealisee;
        statut = ex.statut;
      } else if (!estEnRetard(prochaine, now)) {
        // Cycle encore valide : on affiche la prochaine échéance sans toucher
        // au résultat du contrôle déjà réalisé.
        datePrevue = prochaine;
        dateRealisee = ex.dateRealisee;
        statut = estStatutRealise(ex.statut) ? ex.statut : "planifiee";
      } else {
        // Période écoulée : nouveau cycle. Les rapports du cycle précédent
        // restent attachés à cette même ligne — c'est eux, la preuve.
        datePrevue = prochaine;
        dateRealisee = null;
        statut = "depassee";
      }
    } else if (heritee !== null) {
      // La ligne absorbante existe mais n'a PAS de réalisation propre : elle
      // reprend celle des lignes qu'elle absorbe. Placée après la branche
      // ci-dessus, et c'est délibéré : une réalisation faite SOUS LE NOUVEL
      // IDENTIFIANT est plus récente que tout héritage et prime toujours.
      //
      // On reporte l'ÉCHÉANCE, pas la réalisation. Écrire `dateRealisee` ici
      // ferait dire à cette ligne « contrôle effectué le … » alors qu'aucun
      // rapport n'y est attaché — la pièce est restée sur la ligne archivée,
      // qui la conserve (ADR-012). Une ligne ne doit jamais attester d'un acte
      // dont elle ne porte pas la preuve.
      const prochaine = prochaineDate(heritee, g.periodicite);
      datePrevue = prochaine ?? ex.datePrevue;
      dateRealisee = null;
      statut = statutCycleOuvert(datePrevue, ex.statut, now);
    } else if (ex.statut === "a_planifier" && g.statut === "planifiee") {
      // La ligne n'avait qu'un **placeholder** — « à planifier » n'est pas
      // un rendez-vous, c'est son absence — et le générateur sait désormais
      // en calculer un depuis la mise en service. Poser cette date n'efface
      // aucun retard : il n'y en avait pas à effacer.
      datePrevue = g.datePrevue;
      dateRealisee = null;
      statut = "planifiee";
    } else {
      // Cycle ouvert : l'échéance réglementaire ne bouge pas parce que
      // l'utilisateur a déclaré un extincteur de plus. Repousser `datePrevue`
      // à `now` à chaque régénération — ce que faisait le delete/create —
      // effaçait le retard accumulé.
      datePrevue = ex.datePrevue;
      dateRealisee = null;
      statut = statutCycleOuvert(ex.datePrevue, ex.statut, now);
    }

    const cible: MiseAJourOccurrence = {
      id: ex.id,
      libelleObligation: g.libelleObligation,
      periodicite: g.periodicite,
      realisateurRequis: g.realisateurRequis,
      datePrevue,
      dateRealisee,
      statut,
      prescriptionId: g.prescriptionId,
    };

    const identique =
      cible.libelleObligation === ex.libelleObligation &&
      cible.periodicite === ex.periodicite &&
      memeListe(cible.realisateurRequis, ex.realisateurRequis) &&
      memeInstant(cible.datePrevue, ex.datePrevue) &&
      memeInstant(cible.dateRealisee, ex.dateRealisee) &&
      cible.statut === ex.statut &&
      cible.prescriptionId === (ex.prescriptionId ?? null);

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
    if (vues.has(cle)) continue;
    // `dateRealisee` compte comme une trace au même titre qu'un rapport : elle
    // atteste qu'un contrôle a eu lieu, même si la pièce jointe a depuis été
    // retirée du registre.
    const porteUneTrace = ex.porteUnePreuve || ex.dateRealisee !== null;

    // LE PORTEUR DE CETTE LIGNE-CI EXISTE-T-IL ENCORE ? La question n'est pas
    // celle de l'applicabilité de l'obligation : une ligne est identifiée par
    // une obligation ET un porteur, et l'obligation peut vivre chez un autre
    // appareil que celui-ci. Deux extincteurs, l'un retiré : l'obligation
    // s'applique toujours, mais pas à l'appareil retiré.
    //
    // Seul l'équipement se teste. Le porteur établissement ne disparaît pas ;
    // le porteur salarié disparaît sans que sa ligne soit barrée (ADR-023).
    const porteurDisparu =
      ex.equipementId !== null &&
      options.equipementsEnService !== undefined &&
      !options.equipementsEnService.has(ex.equipementId);

    // L'obligation vit encore ET son porteur aussi : la ligne n'a simplement
    // plus de rendez-vous.
    // Sans preuve, elle ne dit plus rien et disparaît — elle n'aurait jamais dû
    // porter de date. Avec une preuve, elle reste telle quelle : c'est le
    // constat d'un contrôle qui a eu lieu, et rien ne justifie de le barrer.
    if (encoreApplicables?.has(ex.obligationId) && !porteurDisparu) {
      if (porteUneTrace) plan.inchangees += 1;
      else plan.aSupprimer.push(ex.id);
      continue;
    }

    if (!porteUneTrace) {
      plan.aSupprimer.push(ex.id);
    } else if (!estMarqueeNonApplicable(ex.libelleObligation)) {
      plan.aArchiver.push({
        id: ex.id,
        libelleObligation: marquerNonApplicable(ex.libelleObligation),
      });
    } else {
      plan.inchangees += 1;
    }
  }

  return plan;
}
