import { z } from "zod";
import { ligneSchema } from "./schema";

/**
 * La proposition de modification d'une entreprise extérieure (ADR-061 § 3).
 *
 * **Module pur, sans `"use server"`** : la validation, la comparaison avec le
 * plan et ce qu'il faut écrire pour l'appliquer. Les actions qui l'utilisent
 * (`proposition-actions.ts`, `actions.ts`) établissent le périmètre.
 *
 * La proposition est STRUCTURÉE, jamais du texte libre :
 * - la fiche de l'entreprise extérieure, SAUF son adresse e-mail — figée :
 *   sinon elle détournerait les prochains liens de signature ;
 * - la liste COMPLÈTE des lignes de risques telle qu'elle la souhaite : un
 *   identifiant existant modifie la ligne, une ligne sans identifiant
 *   s'ajoute, un identifiant absent la supprime.
 *
 * Les bornes sont celles du formulaire du dirigeant (`schema.ts`).
 */

export const LIGNES_MAX = 50;
/** Longueur maximale du JSON reçu : 50 lignes de 3 × 500 caractères y tiennent. */
export const PROPOSITION_TAILLE_MAX = 100_000;

const SIRET_FMT = /^\d{14}$/;

/** Absent : la clé n'était pas proposée ; vide : `null` ; sinon le texte. */
const texteFacultatif = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || null : v),
    z.string().max(max).nullable().optional(),
  );

export const propositionSchema = z.object({
  fiche: z.object({
    entrepriseExterieureRaison: z.string().trim().min(1, "Raison sociale requise").max(200),
    entrepriseExterieureSiret: z.preprocess(
      (v) => (typeof v === "string" ? v.replace(/\s/g, "") || null : v),
      z.string().regex(SIRET_FMT, "SIRET : 14 chiffres attendus").nullable(),
    ),
    efChefNom: z.string().trim().min(1, "Nom du chef d'entreprise requis").max(200),
    efEffectifIntervenant: z.coerce.number().int().min(1).max(9999),
    // Repris de RiskBoard (2026-11-21). FACULTATIFS DANS LA FORME : une
    // proposition enregistrée avant ce lot ne les porte pas, et doit encore se
    // lire et s'appliquer — une clé absente ne change rien au plan
    // (`ecartsDeLaProposition`, `traiterProposition`). Vide : `null`.
    entrepriseExterieureAdresse: texteFacultatif(500),
    efChefTelephone: texteFacultatif(30),
  }),
  lignes: z
    .array(
      ligneSchema.extend({
        id: z.string().min(1).max(60).optional(),
      }),
    )
    .min(1, "Gardez au moins un risque identifié")
    .max(LIGNES_MAX, `${LIGNES_MAX} risques au plus`),
});

export type Proposition = z.infer<typeof propositionSchema>;

export type PlanComparable = {
  entrepriseExterieureRaison: string;
  entrepriseExterieureSiret: string | null;
  efChefNom: string;
  efEffectifIntervenant: number;
  entrepriseExterieureAdresse?: string | null;
  efChefTelephone?: string | null;
  lignes: {
    id: string;
    risque: string;
    mesureEntrepriseUtilisatrice: string | null;
    mesureEntrepriseExterieure: string | null;
    famille?: string | null;
    lieu?: string | null;
    frequence?: string | null;
  }[];
};

export type LectureProposition =
  | { ok: true; proposition: Proposition }
  | { ok: false; message: string };

/**
 * Lit le JSON reçu du navigateur et le valide. Les identifiants de lignes
 * doivent tous appartenir au plan (`idsDuPlan`) et n'apparaître qu'une fois :
 * un identifiant d'un autre plan, ou inventé, est refusé — jamais ignoré.
 */
export function lireProposition(brut: unknown, idsDuPlan: ReadonlySet<string>): LectureProposition {
  if (typeof brut !== "string" || brut.length === 0 || brut.length > PROPOSITION_TAILLE_MAX) {
    return { ok: false, message: "Proposition illisible." };
  }
  let json: unknown;
  try {
    json = JSON.parse(brut);
  } catch {
    return { ok: false, message: "Proposition illisible." };
  }
  const p = propositionSchema.safeParse(json);
  if (!p.success) {
    return { ok: false, message: p.error.issues[0]?.message ?? "Proposition invalide." };
  }
  const vus = new Set<string>();
  for (const l of p.data.lignes) {
    if (!l.id) continue;
    if (!idsDuPlan.has(l.id) || vus.has(l.id)) {
      return { ok: false, message: "Une ligne de risque ne correspond pas à ce plan." };
    }
    vus.add(l.id);
  }
  return { ok: true, proposition: p.data };
}

const egal = (a: string | null | undefined, b: string | null | undefined) => (a ?? "") === (b ?? "");

export type ChangementFiche = { champ: keyof Proposition["fiche"]; libelle: string; avant: string; apres: string };
export type LigneProposee = Proposition["lignes"][number];
export type Ecarts = {
  fiche: ChangementFiche[];
  modifiees: { avant: PlanComparable["lignes"][number]; apres: LigneProposee }[];
  ajoutees: LigneProposee[];
  supprimees: PlanComparable["lignes"][number][];
};

const LIBELLE_CHAMP: Record<keyof Proposition["fiche"], string> = {
  entrepriseExterieureRaison: "Raison sociale",
  entrepriseExterieureSiret: "SIRET",
  efChefNom: "Chef de l'entreprise extérieure",
  efEffectifIntervenant: "Effectif qui interviendra",
  entrepriseExterieureAdresse: "Adresse",
  efChefTelephone: "Téléphone du chef de l'entreprise extérieure",
};

/** Ce que la proposition change au plan, pour le bandeau du dirigeant. */
export function ecartsDeLaProposition(plan: PlanComparable, p: Proposition): Ecarts {
  const fiche: ChangementFiche[] = [];
  for (const champ of Object.keys(LIBELLE_CHAMP) as (keyof Proposition["fiche"])[]) {
    // Une clé absente de la proposition n'a pas été proposée (proposition
    // enregistrée avant que la fiche ne la porte) : elle ne change rien.
    if (p.fiche[champ] === undefined) continue;
    const avant = String(plan[champ] ?? "");
    const apres = String(p.fiche[champ] ?? "");
    if (avant !== apres) fiche.push({ champ, libelle: LIBELLE_CHAMP[champ], avant, apres });
  }
  const parId = new Map(plan.lignes.map((l) => [l.id, l]));
  const gardees = new Set<string>();
  const modifiees: Ecarts["modifiees"] = [];
  const ajoutees: LigneProposee[] = [];
  for (const l of p.lignes) {
    const avant = l.id ? parId.get(l.id) : undefined;
    if (!avant) {
      ajoutees.push(l);
      continue;
    }
    gardees.add(avant.id);
    if (
      !egal(avant.risque, l.risque) ||
      !egal(avant.mesureEntrepriseUtilisatrice, l.mesureEntrepriseUtilisatrice) ||
      !egal(avant.mesureEntrepriseExterieure, l.mesureEntrepriseExterieure) ||
      !egal(avant.famille, l.famille) ||
      !egal(avant.lieu, l.lieu) ||
      !egal(avant.frequence, l.frequence)
    ) {
      modifiees.push({ avant, apres: l });
    }
  }
  const supprimees = plan.lignes.filter((l) => !gardees.has(l.id));
  return { fiche, modifiees, ajoutees, supprimees };
}

export function aucunEcart(e: Ecarts): boolean {
  return e.fiche.length + e.modifiees.length + e.ajoutees.length + e.supprimees.length === 0;
}
