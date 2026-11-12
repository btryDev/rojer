import type { Etape } from "@/components/duerps/WizardSteps";
import { questionsActivites } from "@/lib/activites/reponses";
import { questionsDetectionTransverses } from "@/lib/referentiels";
import {
  etatEtapeTransverses,
  signalQuestionsARepondre,
  type EtatEtapeTransverses,
} from "@/lib/transverses/etat";
import {
  ORDRE_DU_FIL,
  lireEtapesValidees,
  type EtapeFilId,
  type EtapeValidable,
} from "./etapes-validees";
import { etatUnite, type RisqueEvalue } from "@/lib/risques/etat-unite";

/** Les pages du parcours — ce qu'une page passe pour dire où l'on est. */
export const PAGES_DU_PARCOURS = [
  "secteur",
  "activites",
  "unites",
  "risques",
  "transverses",
  "synthese",
] as const;
export type EtapeId = (typeof PAGES_DU_PARCOURS)[number];

/**
 * La page d'un parcours → l'étape du fil qui la porte (`ORDRE_DU_FIL`).
 * « Votre activité » regroupe deux pages, le secteur et ses précisions
 * (2026-11-11) : la seconde n'existait que pour certains secteurs, le fil
 * comptait donc 4 ou 5 étapes selon le cas. Il a toujours cinq étapes.
 */
const ETAPE_DE_LA_PAGE: Record<EtapeId, EtapeFilId> = {
  secteur: "activite",
  activites: "activite",
  unites: "unites",
  risques: "risques",
  transverses: "transverses",
  synthese: "synthese",
};

const LIBELLES_ETAPES: Record<EtapeFilId, string> = {
  activite: "Votre activité",
  unites: "Unités de travail",
  risques: "Risques par unité",
  transverses: "Questions transverses",
  synthese: "Synthèse",
};

const numero = (id: EtapeFilId) =>
  String(ORDRE_DU_FIL.indexOf(id) + 1).padStart(2, "0");

/** « 01 · Votre activité » — le surtitre d'une page, aligné sur le fil. */
export function enteteEtape(page: EtapeId): string {
  const id = ETAPE_DE_LA_PAGE[page];
  return `${numero(id)} · ${LIBELLES_ETAPES[id]}`;
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
     * Ce qui est fait DANS chaque étape, de 0 à 1 (2026-11-11), validation
     * comprise comme dernière part : le trait ne se ferme pas sans le geste.
     * Seule l'étape courante le montre. Ce n'est pas un taux de complétude
     * du DUERP — aucun pourcentage n'est affiché.
     */
    avancement?: Partial<Record<EtapeFilId, number>>;
  },
): Etape[] {
  // Les étapes après les unités ne requièrent plus que « risques » soit
  // complet : une unité peut légitimement être sans risque (cf. INRS ED 840).
  // ~~`synthese ⇐ transverses.faite`~~ (relecture indépendante du
  // 2026-10-12) : la synthèse reste atteignable, l'étape transverses garde
  // son signal et ne verrouille plus rien.
  const atteinte = (id: EtapeFilId) =>
    id === "activite"
      ? true
      : id === "unites"
        ? progression.secteurOk
        : progression.unitesOk;

  // « Fait » = validé par le dirigeant ET complet sur les données
  // (ADR-059). Ni l'un ni l'autre seul : le passage ne coche rien
  // (2026-10-28), et ce que l'outil a pré-rempli non plus. Les précisions
  // d'activité sont facultatives : valider sans y répondre fait l'étape.
  const complete: Record<EtapeValidable, boolean> = {
    activite: progression.secteurOk,
    unites: progression.unitesOk,
    risques: progression.risquesOk,
    transverses: progression.transverses.faite,
  };
  const faite = (id: EtapeFilId): boolean =>
    id === "synthese"
      ? progression.versionValidee
      : complete[id] && Boolean(progression.validees[id]);

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

  return ORDRE_DU_FIL.map((id) => {
    const estFaite = faite(id);
    return {
      id,
      libelle: LIBELLES_ETAPES[id],
      href: href(id),
      atteinte: atteinte(id),
      faite: estFaite,
      // Une étape faite est pleine. Seule l'étape courante montre sa part :
      // un segment rempli ailleurs se lirait « fait » (2026-11-11).
      avancement: estFaite
        ? 1
        : id === actuelle
          ? (progression.avancement?.[id] ?? 0)
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
      aucunRisqueJustif: string | null;
      risques: readonly RisqueEvalue[];
    })[];
    reponsesTransverses: unknown;
    etablissement: Parameters<typeof etatEtapeTransverses>[0]["etablissement"];
    versions: readonly unknown[];
  },
  etapeActuelle: EtapeId,
): Etape[] {
  const unites = duerp.unites.filter((u) => !u.estTransverse);
  const unitesOk = unites.length > 0;
  // Une unité est évaluée selon la même règle que la vue d'ensemble
  // (`etatUnite`, 2026-11-12) : déclarée sans risque, ou tous ses risques
  // cotés et pourvus de mesures. Compter les seules unités « avec un risque »
  // laissait l'étape à faire pour une unité déclarée sans risque — et le PDF
  // n'était jamais proposé.
  const unitesEvaluees = unites.filter((u) => etatUnite(u).terminee).length;
  const questions = questionsActivites(
    duerp.referentielSecteurId,
    duerp.reponsesActivitesNonCouvertes,
  );
  const repondues = questions.filter((q) => q.exercee !== undefined).length;
  const secteurOk = Boolean(duerp.referentielSecteurId);
  const transverses = etatEtapeTransverses(duerp);
  const nbTransverses = questionsDetectionTransverses.length;
  const validees = lireEtapesValidees(duerp.etapesValidees);
  // La validation compte pour une part de chaque étape, la dernière.
  const v = (id: EtapeValidable) => (validees[id] ? 1 : 0);

  return construireEtapes(duerp.id, etapeActuelle, {
    secteurOk,
    unitesOk,
    validees,
    risquesOk: unitesOk && unitesEvaluees === unites.length,
    versionValidee: duerp.versions.length > 0,
    transverses,
    // Une question par activité du secteur : la liste dit aussi s'il en a.
    activitesPosees: questions.length > 0,
    avancement: {
      // Le secteur, chaque précision, puis la validation : une part chacun.
      activite: part(
        (secteurOk ? 1 : 0) + repondues + v("activite"),
        2 + questions.length,
      ),
      unites: part((unitesOk ? 1 : 0) + v("unites"), 2),
      risques: part(unitesEvaluees + v("risques"), unites.length + 1),
      transverses: part(
        nbTransverses - transverses.sansReponse.length + v("transverses"),
        nbTransverses + 1,
      ),
    },
  });
}
