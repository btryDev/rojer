"use server";

import { revalidatePath } from "next/cache";
import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import { MESSAGE_REGEN_ECHEC, regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import {
  ecrireEffectifs,
  RefusBorneEffectif,
  RefusSousLesFiches,
  regenererLaSociete,
  type EffetEffectifs,
} from "./effectif";
import { effectifsSchema, type ChampEffectif } from "./effectif-calcul";

export type EffectifsActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
      /** Ce qui a été saisi : rendu au formulaire, que React remet à zéro. */
      saisie?: Record<ChampEffectif, string>;
    }
  | { status: "success" }
  /** Enregistré, mais un calendrier n'a pas pu être recalculé à l'instant. */
  | { status: "success_avec_avertissement"; message: string };

/**
 * Les effectifs se déclarent dans Équipe (2026-11-03, décision de la
 * propriétaire) : ceux du site, ses apprentis, et les salariés de la société
 * hors de Rojer. La société se recalcule ; ce qui fait croître au-delà de la
 * borne, ou descend sous les fiches actives, est refusé en entier
 * (`ecrireEffectifs`).
 */
export async function modifierEffectifs(
  etablissementId: string,
  _prev: EffectifsActionState,
  formData: FormData,
): Promise<EffectifsActionState> {
  const { db } = await assertEtablissementDuCompte(etablissementId);
  const lu = (k: ChampEffectif) => String(formData.get(k) ?? "");
  const saisie = {
    effectifSurSite: lu("effectifSurSite"),
    apprentisSurSite: lu("apprentisSurSite"),
    effectifHorsRojer: lu("effectifHorsRojer"),
  };
  const parsed = effectifsSchema.safeParse(saisie);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
      saisie,
    };
  }

  let effet: EffetEffectifs;
  try {
    effet = await db.$transaction((tx) => ecrireEffectifs(tx, etablissementId, parsed.data));
  } catch (e) {
    if (e instanceof RefusBorneEffectif) {
      return { status: "error", message: e.message, fieldErrors: { [e.champ]: [e.message] }, saisie };
    }
    if (e instanceof RefusSousLesFiches) {
      return { status: "error", message: e.message, fieldErrors: { effectifSurSite: [e.message] }, saisie };
    }
    throw e;
  }

  // Ne recalcule que ce qui a bougé : la société entière si son total a
  // changé (CSE, règlement intérieur sur chaque site), ce site seul si
  // seuls ses nombres ont changé, rien sinon.
  const recalcule = effet.societe
    ? await regenererLaSociete(db, etablissementId)
    : effet.site
      ? await regenererApresMutation(etablissementId, "entreprises/effectif")
      : true;
  revalidatePath(`/etablissements/${etablissementId}`, "layout");
  return recalcule
    ? { status: "success" }
    : { status: "success_avec_avertissement", message: MESSAGE_REGEN_ECHEC };
}
