"use server";

import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import { ecrireEffectifs, RefusBorneEffectif, regenererLaSociete } from "./effectif";
import { effectifsSchema } from "./effectif-calcul";

export type EffectifsActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
      /** Ce qui a été saisi : rendu au formulaire, que React remet à zéro. */
      saisie?: Record<ChampEffectif, string>;
    }
  | { status: "success" };

type ChampEffectif = "effectifSurSite" | "apprentisSurSite" | "effectifHorsRojer";

/**
 * Les effectifs se déclarent dans Équipe (2026-11-03, décision de la
 * propriétaire) : ceux du site, ses apprentis, et les salariés de la société
 * hors de Rojer. La société se recalcule ; ce qui fait croître au-delà de la
 * borne est refusé, en entier (`ecrireEffectifs`).
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

  try {
    await db.$transaction(async (tx) => {
      // L'effectif ne descend pas sous les fiches actives : une fiche est une
      // personne. Les sorties se marquent sur les fiches.
      const actifs = await tx.salarie.count({ where: { etablissementId, actif: true } });
      if (parsed.data.effectifSurSite < actifs) {
        throw new SousLesFiches(actifs);
      }
      await ecrireEffectifs(tx, etablissementId, parsed.data);
    });
  } catch (e) {
    if (e instanceof RefusBorneEffectif) {
      return { status: "error", message: e.message, fieldErrors: { [e.champ]: [e.message] }, saisie };
    }
    if (e instanceof SousLesFiches) {
      const message = `Vous suivez ${e.actifs} personnes dans cet établissement : l'effectif ne peut pas être inférieur. Marquez d'abord les sorties sur leurs fiches.`;
      return { status: "error", message, fieldErrors: { effectifSurSite: [message] }, saisie };
    }
    throw e;
  }

  // L'effectif de la société est lu par chacun de ses sites (CSE, règlement
  // intérieur) : tous se recalculent.
  await regenererLaSociete(db, etablissementId);
  return { status: "success" };
}

class SousLesFiches extends Error {
  constructor(readonly actifs: number) {
    super("effectif sous les fiches actives");
  }
}
