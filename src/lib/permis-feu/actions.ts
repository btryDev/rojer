"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resoudreBatimentOptionnel } from "@/lib/batiments/queries";
import { resoudrePrestataireOptionnel } from "@/lib/prestataires/queries";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { NatureTravauxPointChaud } from "@prisma/client";
import type { StatutPermisFeu } from "@prisma/client";
import { NATURES_TRAVAUX, permisFeuSchema, type PermisFeuInput } from "./schema";
import { nextNumeroPermisFeu } from "./queries";
import { MESURES_RETIREES } from "./referentiel";
import { porteUneTraceDeSignature } from "@/lib/signatures/trace";
import { statutPermisSignable } from "@/lib/signatures/etat-signable";
import {
  compterSignatures,
  MOTIF_CONTENU_MODIFIE,
  motifContenuScelle,
  porteUnChampScelle,
  verrouillerObjetSigne,
} from "@/lib/signatures/verrou-contenu";
import { calculerHashObjet } from "@/lib/signatures/hash-objet";
import { revoquerLiensEnVol } from "@/lib/access-tokens/revocation";

export type PermisFeuActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; permisFeuId: string; numero: number };

function extraireNatures(formData: FormData): NatureTravauxPointChaud[] {
  return formData
    .getAll("naturesTravaux")
    .map(String)
    .filter((n): n is NatureTravauxPointChaud =>
      (NATURES_TRAVAUX as readonly string[]).includes(n),
    );
}

function extraireMesures(formData: FormData): string[] {
  return formData.getAll("mesuresValidees").map(String);
}

/**
 * La saisie du formulaire, validée — UNE lecture pour la création et la
 * modification (2026-10-12).
 */
function lirePermisFeu(formData: FormData) {
  return permisFeuSchema.safeParse({
    prestataireId: formData.get("prestataireId"),
    prestataireRaison: formData.get("prestataireRaison"),
    prestataireContact: formData.get("prestataireContact"),
    prestataireEmail: formData.get("prestataireEmail"),
    donneurOrdreNom: formData.get("donneurOrdreNom"),
    donneurOrdreFonction: formData.get("donneurOrdreFonction"),
    dateDebut: formData.get("dateDebut"),
    dateFin: formData.get("dateFin"),
    lieu: formData.get("lieu"),
    batimentId: formData.get("batimentId"),
    naturesTravaux: extraireNatures(formData),
    descriptionTravaux: formData.get("descriptionTravaux"),
    mesuresValidees: extraireMesures(formData),
    mesuresNotes: formData.get("mesuresNotes"),
    dureeSurveillanceMinutes: formData.get("dureeSurveillanceMinutes"),
  });
}

/** Les colonnes du permis tirées d'une saisie valide. */
function colonnesPermis(d: PermisFeuInput) {
  return {
    prestataireId: d.prestataireId ?? null,
    prestataireRaison: d.prestataireRaison,
    prestataireContact: d.prestataireContact,
    prestataireEmail: d.prestataireEmail,
    donneurOrdreNom: d.donneurOrdreNom,
    donneurOrdreFonction: d.donneurOrdreFonction ?? null,
    dateDebut: d.dateDebut,
    dateFin: d.dateFin,
    lieu: d.lieu,
    naturesTravaux: d.naturesTravaux,
    descriptionTravaux: d.descriptionTravaux,
    mesuresValidees: d.mesuresValidees,
    mesuresNotes: d.mesuresNotes ?? null,
    dureeSurveillanceMinutes: d.dureeSurveillanceMinutes,
  };
}

const PRESTATAIRE_INTROUVABLE: PermisFeuActionState = {
  status: "error",
  message: "Prestataire introuvable",
  fieldErrors: { prestataireId: ["Prestataire introuvable dans votre annuaire"] },
};

const ZONE_INTROUVABLE: PermisFeuActionState = {
  status: "error",
  message: "Zone introuvable",
  fieldErrors: { batimentId: ["Zone introuvable"] },
};

export async function creerPermisFeu(
  etablissementId: string,
  _prev: PermisFeuActionState,
  formData: FormData,
): Promise<PermisFeuActionState> {
  await assertEtablissementOwnership(etablissementId);

  const parsed = lirePermisFeu(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const batiment = await resoudreBatimentOptionnel(
    etablissementId,
    parsed.data.batimentId,
  );
  if (!batiment.ok) return ZONE_INTROUVABLE;
  const prestataire = await resoudrePrestataireOptionnel(
    etablissementId,
    parsed.data.prestataireId,
  );
  if (!prestataire.ok) return PRESTATAIRE_INTROUVABLE;

  const numero = await nextNumeroPermisFeu(etablissementId);
  const id = `pf_${randomUUID()}`;

  const permis = await prisma.permisFeu.create({
    data: {
      id,
      etablissementId,
      numero,
      ...colonnesPermis(parsed.data),
      batimentId: batiment.id,
      statut: "attente_signatures",
    },
  });

  revalidatePath(`/etablissements/${etablissementId}/permis-feu`);
  return { status: "success", permisFeuId: permis.id, numero: permis.numero };
}

/**
 * Corriger un permis (audit du 2026-10-12, constat 4) — même règle que le plan
 * de prévention (`verrou-contenu.ts`) : sans signature tout se corrige, avec
 * les validations de la création ; signé, seule la zone (hors empreinte) se
 * modifie, et une saisie qui porte un champ couvert est refusée. Un permis
 * terminé ou annulé ne se modifie plus. Compter puis écrire se fait sous le
 * verrou de la ligne, et un contenu dont l'empreinte change révoque les liens
 * de signature en vol, dans la même transaction (relecture indépendante du
 * 2026-10-12 — voir `modifierPlanPrevention`).
 *
 * Les mesures d'une liste antérieure (`MESURES_RETIREES`) que le permis porte
 * ne sont plus proposées par le formulaire, et le schéma les refuse : elles
 * sont CONSERVÉES ici plutôt que perdues en silence à la première correction.
 */
export async function modifierPermisFeu(
  permisFeuId: string,
  _prev: PermisFeuActionState,
  formData: FormData,
): Promise<PermisFeuActionState> {
  const permis = await prisma.permisFeu.findUnique({
    where: { id: permisFeuId },
    select: { etablissementId: true, statut: true, numero: true },
  });
  if (!permis) return { status: "error", message: "Permis introuvable" };
  await assertEtablissementOwnership(permis.etablissementId);
  const etablissementId = permis.etablissementId;
  if (!statutPermisSignable(permis.statut)) {
    return { status: "error", message: "Ce permis est terminé ou annulé : il ne se modifie plus." };
  }

  // Les lectures de propriété AVANT la transaction (relecture finale du
  // 2026-10-12, B1) : elles lisent par le client global, et la prod est en
  // `connection_limit=1` — dans la transaction, elles attendaient la
  // connexion qu'elle tient. Même règle que `modifierPlanPrevention`.
  const parsed = lirePermisFeu(formData);
  const brut = formData.get("batimentId");
  const batiment = await resoudreBatimentOptionnel(
    etablissementId,
    parsed.success
      ? parsed.data.batimentId
      : typeof brut === "string" && brut.trim()
        ? brut
        : undefined,
  );
  if (!batiment.ok) return ZONE_INTROUVABLE;
  const prestataire = parsed.success
    ? await resoudrePrestataireOptionnel(etablissementId, parsed.data.prestataireId)
    : null;
  if (prestataire && !prestataire.ok) return PRESTATAIRE_INTROUVABLE;

  const resultat = await prisma.$transaction(async (tx): Promise<PermisFeuActionState | null> => {
    await verrouillerObjetSigne(tx, "permis_feu", permisFeuId);
    // Le statut relu sous le verrou (relecture finale, R1).
    const statut = await tx.permisFeu.findUnique({
      where: { id: permisFeuId },
      select: { statut: true },
    });
    if (!statut || !statutPermisSignable(statut.statut)) {
      return { status: "error", message: "Ce permis est terminé ou annulé : il ne se modifie plus." };
    }
    const scelle = motifContenuScelle(
      "permis",
      await compterSignatures("permis_feu", permisFeuId, etablissementId, tx),
    );
    if (scelle) {
      if (porteUnChampScelle(formData)) return { status: "error", message: scelle };
      await tx.permisFeu.updateMany({
        where: { id: permisFeuId, etablissementId },
        data: { batimentId: batiment.id },
      });
      return null;
    }
    if (!parsed.success) {
      return {
        status: "error",
        message: "Formulaire invalide",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    // Relues sous le verrou : ce sont elles que l'écriture conserve.
    const enBase = await tx.permisFeu.findFirst({
      where: { id: permisFeuId, etablissementId },
      select: { mesuresValidees: true },
    });
    const retirees = (enBase?.mesuresValidees ?? []).filter((id) =>
      MESURES_RETIREES.some((m) => m.id === id),
    );
    const colonnes = colonnesPermis(parsed.data);
    const avant = await calculerHashObjet("permis_feu", permisFeuId, etablissementId, tx);
    await tx.permisFeu.updateMany({
      where: { id: permisFeuId, etablissementId },
      data: {
        ...colonnes,
        mesuresValidees: [...colonnes.mesuresValidees, ...retirees],
        batimentId: batiment.id,
      },
    });
    const apres = await calculerHashObjet("permis_feu", permisFeuId, etablissementId, tx);
    if (!avant.ok || !apres.ok || avant.hash !== apres.hash) {
      await revoquerLiensEnVol(
        {
          etablissementId,
          objetType: "permis_feu",
          objetId: permisFeuId,
          motif: MOTIF_CONTENU_MODIFIE.permis,
        },
        tx,
      );
    }
    return null;
  });
  if (resultat) return resultat;

  revalidatePath(`/etablissements/${etablissementId}/permis-feu`);
  revalidatePath(`/etablissements/${etablissementId}/permis-feu/${permisFeuId}`);
  return { status: "success", permisFeuId, numero: permis.numero };
}

/**
 * Les deux transitions du chantier, CONTRÔLÉES CÔTÉ SERVEUR (audit du
 * 2026-10-12, constat 6). Elles écrivaient sans lire l'état : un appel direct
 * démarrait un permis annulé, terminé ou non signé, et terminait un permis
 * jamais démarré. La fiche n'offrait pas ces gestes, le serveur les acceptait.
 *
 * Chaque transition part d'UN statut, porté par la clause de l'écriture :
 * `valide` (les deux parties ont signé, `validerSiCoSigne`) → `en_cours` →
 * `termine`. Hors de ce statut, rien ne s'écrit.
 */
const TRANSITIONS_CHANTIER = {
  en_cours: "valide",
  termine: "en_cours",
} as const satisfies Partial<Record<StatutPermisFeu, StatutPermisFeu>>;

async function franchir(
  permisFeuId: string,
  vers: keyof typeof TRANSITIONS_CHANTIER,
): Promise<{ etablissementId: string; fait: boolean } | null> {
  const permis = await prisma.permisFeu.findUnique({
    where: { id: permisFeuId },
    select: { etablissementId: true },
  });
  if (!permis) return null;
  await assertEtablissementOwnership(permis.etablissementId);
  const r = await prisma.permisFeu.updateMany({
    where: {
      id: permisFeuId,
      etablissementId: permis.etablissementId,
      statut: TRANSITIONS_CHANTIER[vers],
    },
    data: { statut: vers },
  });
  revalidatePath(`/etablissements/${permis.etablissementId}/permis-feu/${permisFeuId}`);
  return { etablissementId: permis.etablissementId, fait: r.count === 1 };
}

export async function marquerEnCours(permisFeuId: string): Promise<void> {
  await franchir(permisFeuId, "en_cours");
}

export async function marquerTermine(permisFeuId: string): Promise<void> {
  const r = await franchir(permisFeuId, "termine");
  if (!r?.fait) return;
  // Un permis terminé ne se signe plus (`etat-signable.ts`) : ses liens
  // encore ouverts tombent avec lui.
  await revoquerLiensEnVol({
    etablissementId: r.etablissementId,
    objetType: "permis_feu",
    objetId: permisFeuId,
    motif: "Permis de feu terminé",
  });
}

export async function supprimerPermisFeu(permisFeuId: string): Promise<void> {
  const permis = await prisma.permisFeu.findUnique({
    where: { id: permisFeuId },
    select: { etablissementId: true, statut: true },
  });
  if (!permis) return;
  await assertEtablissementOwnership(permis.etablissementId);
  // On ne supprime pas un permis déjà signé : on l'annule à la place pour
  // conserver la piste d'audit. LE STATUT NE LE DISAIT PAS : un permis est
  // créé en `attente_signatures` et y reste ~~une fois signé, rien n'écrivant
  // `valide`~~ [2026-10-12 : tant qu'une partie manque — `validerSiCoSigne`
  // écrit `valide` à la seconde signature]. Le critère est donc le fait en base — une signature posée ou un
  // lien émis (`porteUneTraceDeSignature`) —, et seul un permis vierge
  // s'efface.
  const etabId = permis.etablissementId;
  const effacable =
    (permis.statut === "attente_signatures" || permis.statut === "brouillon") &&
    !(await porteUneTraceDeSignature("permis_feu", permisFeuId, etabId));
  if (effacable) {
    await prisma.permisFeu.delete({ where: { id: permisFeuId } });
  } else {
    await prisma.permisFeu.update({
      where: { id: permisFeuId },
      data: { statut: "annule" },
    });
  }
  await revoquerLiensEnVol({
    etablissementId: etabId,
    objetType: "permis_feu",
    objetId: permisFeuId,
    motif: effacable ? "Permis de feu supprimé" : "Permis de feu annulé",
  });
  revalidatePath(`/etablissements/${etabId}/permis-feu`);
  redirect(`/etablissements/${etabId}/permis-feu`);
}
