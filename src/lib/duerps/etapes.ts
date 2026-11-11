import type { Etape } from "@/components/duerps/WizardSteps";
import { questionsActivites } from "@/lib/activites/reponses";
import { questionsDetectionTransverses } from "@/lib/referentiels";
import {
  etatEtapeTransverses,
  signalQuestionsARepondre,
  type EtatEtapeTransverses,
} from "@/lib/transverses/etat";
import { lireEtapesValidees, type EtapeValidable } from "./etapes-validees";

/** Les pages du parcours — ce qu'une page passe pour dire où l'on est. */
export type EtapeId =
  | "secteur"
  | "activites"
  | "unites"
  | "risques"
  | "transverses"
  | "synthese";

/**
 * Les étapes du fil. « Votre activité » regroupe deux pages, le secteur et ses
 * précisions (2026-11-11) : la seconde n'existait que pour certains secteurs,
 * le fil comptait donc 4 ou 5 étapes selon le cas, et « Secteur » disparaissait
 * une fois choisi — l'étape 01 s'appelait tantôt « Secteur », tantôt
 * « Périmètre du référentiel ». Le fil a désormais toujours cinq étapes.
 */
export type EtapeFilId =
  | "activite"
  | "unites"
  | "risques"
  | "transverses"
  | "synthese";

/** La page d'un parcours → l'étape du fil qui la porte. */
const ETAPE_DE_LA_PAGE: Record<EtapeId, EtapeFilId> = {
  secteur: "activite",
  activites: "activite",
  unites: "unites",
  risques: "risques",
  transverses: "transverses",
  synthese: "synthese",
};

export const LIBELLES_ETAPES: Record<EtapeFilId, string> = {
  activite: "Votre activité",
  unites: "Unités de travail",
  risques: "Risques par unité",
  transverses: "Questions transverses",
  synthese: "Synthèse",
};

const ORDRE: readonly EtapeFilId[] = [
  "activite",
  "unites",
  "risques",
  "transverses",
  "synthese",
];

/** « 01 » — le numéro qu'affichent le fil et le titre d'une page. */
export function numeroEtape(page: EtapeId): string {
  return String(ORDRE.indexOf(ETAPE_DE_LA_PAGE[page]) + 1).padStart(2, "0");
}

/** Une part faite sur un total ; un total nul ne fait rien avancer. */
function part(faits: number, total: number): number {
  return total > 0 ? Math.min(1, faits / total) : 0;
}

export function construireEtapes(
  duerpId: string,
  etapeActuelle: EtapeId,
  progression: {
    secteurOk: boolean;
    /** Au moins une unité de travail existe : ouvre les étapes suivantes. */
    unitesOk: boolean;
    risquesOk: boolean;
    /**
     * Les étapes que le dirigeant a validées (`Duerp.etapesValidees`,
     * 2026-11-11) : « si pas validé, pas fait ». Ce que l'outil pré-remplit —
     * les unités du secteur — ne coche jamais une étape à lui seul.
     */
    validees: Partial<Record<EtapeValidable, unknown>>;
    /** Au moins une version du DUERP est validée (figée). */
    versionValidee: boolean;
    /**
     * CALCULÉ par `etatEtapeTransverses` (`transverses/etat.ts`), plus lu sur
     * `Duerp.transversesRepondues` depuis le 2026-10-12 (chantiers-ouverts
     * § 17.5) : un DUERP validé avant l'ADR-038 restait coché avec deux
     * questions neuves sans réponse. Pas d'autre source possible — un booléen
     * ici laisserait un appelant repasser la colonne.
     */
    transverses: EtatEtapeTransverses;
    /**
     * Le secteur retenu déclare-t-il des activités hors couverture (ADR-020) ?
     * Une liste vide n'est pas « ce secteur couvre tout » — c'est « la liste
     * n'a pas encore été instruite ». Dans les deux cas il n'y a rien à
     * demander : l'étape « Votre activité » se résume alors au secteur.
     */
    activitesPosees: boolean;
    /**
     * Ce qui est fait DANS chaque étape, de 0 à 1 (2026-11-11) : le fil
     * remplit chaque segment d'autant. Absent, un segment est plein si
     * l'étape est faite et vide sinon. Ce n'est pas un taux de complétude
     * du DUERP — aucun pourcentage n'est affiché, seulement la longueur du
     * trait.
     */
    avancement?: Partial<Record<EtapeFilId, number>>;
  },
): Etape[] {
  const atteinte = (id: EtapeFilId) => {
    if (id === "activite") return true;
    if (id === "unites") return progression.secteurOk;
    if (id === "risques") return progression.unitesOk;
    // Les étapes suivantes ne requièrent plus que « risques » soit complet :
    // une unité peut légitimement être sans risque (cf. INRS ED 840) si
    // l'évaluation conclut à l'absence de risque significatif — on laisse
    // passer et on affiche simplement un avertissement dans l'UI.
    if (id === "transverses") return progression.unitesOk;
    // ~~`synthese ⇐ transverses.faite`~~ (relecture indépendante du
    // 2026-10-12) : un DUERP déjà validé dont une question transverse est
    // sans réponse voyait « Synthèse » grisée et « À venir », alors que la
    // page reste atteignable et qu'une version se valide sans condition.
    // L'étape transverses garde son signal ; elle ne verrouille plus rien.
    return progression.unitesOk;
  };

  // « Fait » = validé par le dirigeant ET complet sur les données
  // (2026-11-11). Ni l'un ni l'autre seul : le passage ne coche rien
  // (2026-10-28), et ce que l'outil a pré-rempli non plus. Les précisions
  // d'activité sont facultatives : valider sans y répondre fait l'étape.
  const validee = (id: EtapeValidable) => Boolean(progression.validees[id]);
  const faite = (id: EtapeFilId): boolean => {
    switch (id) {
      case "activite":
        return progression.secteurOk && validee("activite");
      case "unites":
        return progression.unitesOk && validee("unites");
      case "risques":
        return progression.risquesOk && validee("risques");
      case "transverses":
        return progression.transverses.faite && validee("transverses");
      case "synthese":
        return progression.versionValidee;
    }
  };

  // Le secteur choisi, l'étape mène aux précisions s'il y en a : c'est la
  // seule partie qui reste à faire. Le secteur se change depuis cette page.
  const href = (id: EtapeFilId): string => {
    if (id !== "activite") return `/duerp/${duerpId}/${id}`;
    return progression.secteurOk && progression.activitesPosees
      ? `/duerp/${duerpId}/activites`
      : `/duerp/${duerpId}/secteur`;
  };

  // L'étape transverse non faite le DIT, avec le compte et le chemin : sans
  // ce signal, une étape qui se décoche d'elle-même (une question ajoutée au
  // référentiel) ne se verrait pas. Le lien mène à la première question sans
  // réponse, sur l'écran du DUERP qui les pose TOUTES — Équipe
  // (`equipe/risques`) ne pose que les faits d'activité, pas les questions
  // sans fait (`q-routier`, `q-public`…). Pas de signal sur une étape
  // « À faire » non atteinte : le lien ouvrirait par le côté une étape que le
  // fil tient fermée tant qu'aucune unité n'existe.
  const actuelle = ETAPE_DE_LA_PAGE[etapeActuelle];
  const { sansReponse } = progression.transverses;
  const signaler =
    sansReponse.length > 0 &&
    (atteinte("transverses") || actuelle === "transverses");

  return ORDRE.map((id) => {
    const estFaite = faite(id);
    return {
      id,
      libelle: LIBELLES_ETAPES[id],
      href: href(id),
      atteinte: atteinte(id),
      faite: estFaite,
      // Une étape faite est pleine. Seule l'étape courante montre sa part
      // faite : un segment plein mais non validé, ailleurs, se lirait
      // « fait » (2026-11-11). Plafonnée à 0,95 : complète mais pas encore
      // validée, il reste un geste, et le trait ne se ferme pas avant lui.
      avancement: estFaite
        ? 1
        : id === actuelle
          ? Math.min(progression.avancement?.[id] ?? 0, 0.95)
          : 0,
      actuelle: id === actuelle,
      ...(id === "transverses" && signaler
        ? {
            signal: {
              texte: signalQuestionsARepondre(sansReponse.length),
              href: `/duerp/${duerpId}/transverses#${sansReponse[0]}`,
            },
          }
        : {}),
    };
  });
}

/**
 * Les étapes d'un DUERP chargé, progression lue sur ses données — la seule
 * entrée des pages du DUERP (2026-10-28). Chaque page recomposait la sienne,
 * et plusieurs posaient « risques faits » ou « non faits » en dur : un
 * « Fait » n'aurait pas voulu dire la même chose d'une page à l'autre.
 */
export function etapesDuDuerp(
  duerp: {
    id: string;
    referentielSecteurId: string | null;
    etapesValidees: unknown;
    reponsesActivitesNonCouvertes: unknown;
    unites: (Parameters<typeof etatEtapeTransverses>[0]["unites"][number] & {
      estTransverse: boolean;
      risques: readonly unknown[];
    })[];
    reponsesTransverses: unknown;
    etablissement: Parameters<typeof etatEtapeTransverses>[0]["etablissement"];
    versions: readonly unknown[];
  },
  etapeActuelle: EtapeId,
): Etape[] {
  const unites = duerp.unites.filter((u) => !u.estTransverse);
  const unitesOk = unites.length > 0;
  const unitesEvaluees = unites.filter((u) => u.risques.length > 0).length;
  const questions = questionsActivites(
    duerp.referentielSecteurId,
    duerp.reponsesActivitesNonCouvertes,
  );
  const repondues = questions.filter((q) => q.exercee !== undefined).length;
  const secteurOk = Boolean(duerp.referentielSecteurId);
  const transverses = etatEtapeTransverses(duerp);
  const nbTransverses = questionsDetectionTransverses.length;

  return construireEtapes(duerp.id, etapeActuelle, {
    secteurOk,
    unitesOk,
    validees: lireEtapesValidees(duerp.etapesValidees),
    risquesOk: unitesOk && unitesEvaluees === unites.length,
    versionValidee: duerp.versions.length > 0,
    transverses,
    // Une question par activité du secteur : la liste dit aussi s'il en a.
    activitesPosees: questions.length > 0,
    avancement: {
      // Le secteur compte pour une part, chaque précision pour une autre.
      activite: part((secteurOk ? 1 : 0) + repondues, 1 + questions.length),
      risques: part(unitesEvaluees, unites.length),
      transverses: part(
        nbTransverses - transverses.sansReponse.length,
        nbTransverses,
      ),
    },
  });
}
