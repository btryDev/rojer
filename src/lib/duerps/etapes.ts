import type { Etape } from "@/components/duerps/WizardSteps";
import { questionsActivites } from "@/lib/activites/reponses";
import {
  etatEtapeTransverses,
  signalQuestionsARepondre,
  type EtatEtapeTransverses,
} from "@/lib/transverses/etat";

export type EtapeId =
  | "secteur"
  | "activites"
  | "unites"
  | "risques"
  | "transverses"
  | "synthese";

export function construireEtapes(
  duerpId: string,
  etapeActuelle: EtapeId,
  progression: {
    secteurOk: boolean;
    unitesOk: boolean;
    risquesOk: boolean;
    /** Toutes les questions du périmètre ont une réponse. */
    activitesOk: boolean;
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
     * demander, donc l'étape ne s'affiche pas : un écran de questions vide
     * vaudrait affirmation de couverture complète.
     */
    activitesPosees: boolean;
  },
): Etape[] {
  const atteinte = (id: EtapeId) => {
    if (id === "secteur") return true;
    // Le périmètre se déclare dès que le secteur est retenu, et avant les
    // unités : savoir que la boucherie n'est pas couverte est précisément ce
    // qui décide le dirigeant à en créer l'unité à la main.
    if (id === "activites") return progression.secteurOk;
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
    if (id === "synthese") return progression.unitesOk;
    return false;
  };
  const liste: { id: EtapeId; libelle: string }[] = [
    { id: "secteur", libelle: "Secteur d'activité" },
    { id: "activites", libelle: "Périmètre du référentiel" },
    { id: "unites", libelle: "Unités de travail" },
    { id: "risques", libelle: "Risques par unité" },
    { id: "transverses", libelle: "Questions transverses" },
    { id: "synthese", libelle: "Synthèse" },
  ];
  // On masque l'étape « Secteur » quand elle a été résolue (auto depuis le NAF
  // ou déjà traversée). Elle reste visible uniquement si elle est l'actuelle.
  // Même traitement pour « Périmètre », à l'inverse : elle n'apparaît que si
  // le secteur retenu a des questions à poser — ou si on y est déjà, pour ne
  // pas afficher un fil d'étapes où l'étape courante n'existe pas.
  const visibles = liste.filter((e) => {
    if (e.id === "secteur") return etapeActuelle === "secteur";
    if (e.id === "activites")
      return progression.activitesPosees || etapeActuelle === "activites";
    return true;
  });
  // L'étape transverse non faite le DIT, avec le compte et le chemin : sans
  // ce signal, une étape qui se décoche d'elle-même (une question ajoutée au
  // référentiel) ~~ne se verrait que par la synthèse devenue « À venir »~~
  // [2026-10-12 : la synthèse ne se verrouille plus] ne se verrait pas. Le
  // lien mène à la première question sans réponse, sur l'écran du DUERP qui
  // les pose TOUTES — Équipe (`equipe/risques`) ne pose que les faits
  // d'activité, pas les questions sans fait (`q-routier`, `q-public`…).
  // Pas de signal sur une étape « À venir » : le lien ouvrirait par le côté
  // une étape que le fil tient fermée tant qu'aucune unité n'existe.
  const { sansReponse } = progression.transverses;
  const signaler =
    sansReponse.length > 0 &&
    (atteinte("transverses") || etapeActuelle === "transverses");
  // « Fait » se lit sur les données, jamais sur le passage (2026-10-28) :
  // l'ancien « Ouvert » disait seulement qu'une étape était accessible.
  const faite = (id: EtapeId): boolean => {
    switch (id) {
      case "secteur":
        return progression.secteurOk;
      case "activites":
        return progression.activitesOk;
      case "unites":
        return progression.unitesOk;
      case "risques":
        return progression.risquesOk;
      case "transverses":
        return progression.transverses.faite;
      case "synthese":
        return progression.versionValidee;
    }
  };

  return visibles.map((e) => ({
    id: e.id,
    libelle: e.libelle,
    href: `/duerp/${duerpId}/${e.id}`,
    atteinte: atteinte(e.id),
    faite: faite(e.id),
    actuelle: e.id === etapeActuelle,
    ...(e.id === "transverses" && signaler
      ? {
          signal: {
            texte: signalQuestionsARepondre(sansReponse.length),
            href: `/duerp/${duerpId}/transverses#${sansReponse[0]}`,
          },
        }
      : {}),
  }));
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
  const questions = questionsActivites(
    duerp.referentielSecteurId,
    duerp.reponsesActivitesNonCouvertes,
  );
  return construireEtapes(duerp.id, etapeActuelle, {
    secteurOk: Boolean(duerp.referentielSecteurId),
    unitesOk,
    risquesOk: unitesOk && unites.every((u) => u.risques.length > 0),
    activitesOk:
      questions.length > 0 && questions.every((q) => q.exercee !== undefined),
    versionValidee: duerp.versions.length > 0,
    transverses: etatEtapeTransverses(duerp),
    // Une question par activité du secteur : la liste dit aussi s'il en a.
    activitesPosees: questions.length > 0,
  });
}
