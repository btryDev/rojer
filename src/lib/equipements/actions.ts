"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { batimentParDefaut } from "@/lib/batiments/queries";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { genererCalendrier } from "@/lib/calendrier/actions";
import { marquerCalendrierPerime } from "@/lib/calendrier/reconciliation";
import {
  equipementSchema,
  normaliserFormDataEquipement,
  serialiserCaracteristiques,
} from "./schema";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/**
 * Toute mutation d'équipement invalide le calendrier de vérifications : on
 * régénère systématiquement juste après.
 *
 * L'échec est **remonté**, pas avalé. L'ancienne version se contentait d'un
 * `console.error` : l'utilisateur voyait son équipement enregistré et repartait
 * en croyant ses obligations à jour, alors que le calendrier n'avait pas bougé.
 * Sur un outil de conformité, un silence de ce genre vaut un mensonge.
 *
 * On ne relance pas l'exception pour autant : la mutation, elle, a réussi et
 * ne doit pas être présentée comme un échec. L'appelant transforme le
 * `message` en avertissement explicite avec la marche à suivre.
 */
const MESSAGE_REGEN_ECHEC =
  "Modification enregistrée. Le calendrier des vérifications n'a pas pu être " +
  "recalculé à l'instant : il le sera automatiquement à la prochaine " +
  "ouverture de la page « Calendrier ».";

async function regenererCalendrier(
  etablissementId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await genererCalendrier(etablissementId);
    return { ok: true };
  } catch (err) {
    console.error(
      `[equipements] regen calendrier a échoué pour ${etablissementId}`,
      err,
    );
    // Sans cette marque, l'échec passerait inaperçu : le calendrier n'est
    // ni vide ni périmé en version, donc l'auto-réparation à l'affichage
    // ne le reprendrait pas. On le replace dans l'état « désynchronisé »,
    // que la prochaine ouverture du calendrier corrige d'elle-même.
    await marquerCalendrierPerime(etablissementId);
    return { ok: false, message: MESSAGE_REGEN_ECHEC };
  }
}

async function resoudreEtablissementId(equipementId: string): Promise<string> {
  const eq = await prisma.equipement.findUnique({
    where: { id: equipementId },
    select: { etablissementId: true },
  });
  if (!eq) throw new Error("Équipement introuvable");
  return eq.etablissementId;
}

export type EquipementActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; id: string };

/**
 * Normalise les données du formulaire avant validation Zod :
 *  - les checkboxes HTML envoient la valeur du `value` attribut ou rien ;
 *    on convertit en booléen
 *  - les selects vides arrivent en string "" ; on les transforme en undefined
 *  - les champs numériques vides arrivent en "" ; Zod les rendra undefined
 */
function normaliserFormData(fd: FormData): Record<string, unknown> {
  const raw = Object.fromEntries(fd);
  const bool = (k: string) => raw[k] !== undefined;
  return {
    libelle: raw.libelle,
    categorie: raw.categorie || undefined,
    batimentId: raw.batimentId || undefined,
    localisation: raw.localisation,
    dateMiseEnService: raw.dateMiseEnService,
    nombre: raw.nombre,
    aGroupeElectrogene: bool("aGroupeElectrogene"),
    estLocalPollutionSpecifique: bool("estLocalPollutionSpecifique"),
    nbVehiculesParkingCouvert: raw.nbVehiculesParkingCouvert,
    notes: raw.notes,
  };
}
export async function creerEquipement(
  etablissementId: string,
  _prev: EquipementActionState,
  formData: FormData,
): Promise<EquipementActionState> {
  await assertEtablissementOwnership(etablissementId);
  const parsed = equipementSchema.safeParse(normaliserFormDataEquipement(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const caracs = serialiserCaracteristiques(parsed.data);

  // ADR-019 : le formulaire propose un bâtiment dès qu'il y en a plusieurs ;
  // sinon, le seul existant. Un id fourni doit être un bâtiment de CET
  // établissement — la base ne le vérifie pas (clé simple), l'action le fait.
  const batiment = parsed.data.batimentId
    ? await prisma.batiment.findFirst({
        where: { id: parsed.data.batimentId, etablissementId },
        select: { id: true },
      })
    : await batimentParDefaut(etablissementId);
  if (!batiment) {
    return {
      status: "error",
      message: "Zone introuvable",
      fieldErrors: { batimentId: ["Zone introuvable"] },
    };
  }

  await prisma.equipement.create({
    data: {
      etablissementId,
      batimentId: batiment.id,
      libelle: parsed.data.libelle,
      categorie: parsed.data.categorie,
      localisation: parsed.data.localisation,
      dateMiseEnService: parsed.data.dateMiseEnService,
      datePeremption: parsed.data.datePeremption,
      caracteristiques: (caracs ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  const regen = await regenererCalendrier(etablissementId);

  // Les trois chemins qui régénèrent le calendrier l'invalident : la
  // régénération vient de réécrire des dates, et `/calendrier` servait son
  // rendu précédent. Le retrait et la réactivation le faisaient déjà, la
  // création, la modification et le pré-remplissage non.
  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);
  // L'équipement est bien créé : on ne redirige pas en silence si les
  // obligations correspondantes n'ont pas pu être calculées.
  if (!regen.ok) {
    return { status: "error", message: regen.message };
  }
  redirect(`/etablissements/${etablissementId}/equipements`);
}

export async function modifierEquipement(
  id: string,
  _prev: EquipementActionState,
  formData: FormData,
): Promise<EquipementActionState> {
  const etablissementId = await resoudreEtablissementId(id);
  await assertEtablissementOwnership(etablissementId);

  const parsed = equipementSchema.safeParse(normaliserFormDataEquipement(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const caracs = serialiserCaracteristiques(parsed.data);

  // Le bâtiment ne change que si le formulaire en propose un autre ; il doit
  // appartenir au même établissement.
  if (parsed.data.batimentId) {
    const cible = await prisma.batiment.findFirst({
      where: { id: parsed.data.batimentId, etablissementId },
      select: { id: true },
    });
    if (!cible) {
      return {
        status: "error",
        message: "Zone introuvable",
        fieldErrors: { batimentId: ["Zone introuvable"] },
      };
    }
  }

  const eq = await prisma.equipement.update({
    where: { id },
    data: {
      batimentId: parsed.data.batimentId,
      libelle: parsed.data.libelle,
      categorie: parsed.data.categorie,
      localisation: parsed.data.localisation,
      dateMiseEnService: parsed.data.dateMiseEnService,
      datePeremption: parsed.data.datePeremption,
      caracteristiques: (caracs ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  const regen = await regenererCalendrier(eq.etablissementId);

  revalidatePath(`/etablissements/${eq.etablissementId}`);
  revalidatePath(`/etablissements/${eq.etablissementId}/equipements`);
  revalidatePath(`/etablissements/${eq.etablissementId}/equipements/${id}`);
  // Répondre « oui » à « charge > 50 t éq. CO₂ » fait passer la périodicité
  // de douze à six mois : la fiche et le calendrier doivent le voir.
  revalidatePath(`/etablissements/${eq.etablissementId}/calendrier`);
  if (!regen.ok) {
    return { status: "error", message: regen.message };
  }
  return { status: "success", id };
}

/** Ce que la suppression a réellement fait, pour que l'interface puisse le
 *  dire à l'utilisateur sans deviner. */
export type SuppressionEquipementResult =
  | { statut: "supprime" }
  | { statut: "desactive"; message: string }
  | { statut: "erreur"; message: string };

/**
 * Retire un équipement du parc — **sans jamais détruire son historique**.
 *
 * L'ancienne version faisait un `prisma.equipement.delete`. Or
 * `Verification.equipementId` est en `onDelete: Cascade`, et
 * `RapportVerification.verificationId` et `Action.verificationId` le sont
 * aussi : supprimer une hotte emportait ses vérifications *y compris
 * réalisées*, donc les rapports du registre de sécurité (art. L. 4711-5 CT)
 * et les actions correctives ouvertes. Les PDF, eux, restaient sur le disque,
 * orphelins.
 *
 * Règle retenue (ADR-012) :
 *  - l'équipement ne porte **aucune** trace (aucun rapport, aucune action,
 *    aucune vérification réalisée) → suppression physique, rien à conserver ;
 *  - sinon → **désactivation** (`actif = false`). L'équipement sort des
 *    listes et du matching — il ne génère donc plus d'obligation — mais son
 *    historique reste consultable et opposable.
 */
export async function supprimerEquipement(
  id: string,
): Promise<SuppressionEquipementResult> {
  const etablissementId = await resoudreEtablissementId(id);
  await assertEtablissementOwnership(etablissementId);

  // Une seule requête : y a-t-il au moins une vérification porteuse de trace ?
  const nbTraces = await prisma.verification.count({
    where: {
      equipementId: id,
      OR: [
        { dateRealisee: { not: null } },
        { rapports: { some: {} } },
        { actions: { some: {} } },
      ],
    },
  });

  let resultat: SuppressionEquipementResult;
  if (nbTraces === 0) {
    // Les vérifications restantes sont de simples échéances calculées :
    // la cascade ne détruit rien qui ne se régénère.
    await prisma.equipement.delete({ where: { id } });
    resultat = { statut: "supprime" };
  } else {
    await prisma.equipement.update({
      where: { id },
      data: { actif: false },
    });
    resultat = {
      statut: "desactive",
      message:
        "Équipement retiré du parc. Ses rapports de vérification et ses " +
        "actions correctives sont conservés : la loi impose de pouvoir les " +
        "présenter en cas de contrôle (art. L. 4711-5 du Code du travail). " +
        "Il n'apparaît plus dans vos listes et ne génère plus d'échéance.",
    };
  }

  const regen = await regenererCalendrier(etablissementId);

  // Rafraîchi dans tous les cas : l'équipement a bien quitté le parc, même si
  // le recalcul des échéances a échoué.
  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);

  if (!regen.ok) {
    return { statut: "erreur", message: regen.message };
  }
  return resultat;
}

/**
 * Remet en service un équipement désactivé. Les obligations correspondantes
 * réapparaissent au calendrier, et les lignes de suivi archivées reprennent
 * leur libellé normal (le marqueur « Ne s'applique plus » est réécrit depuis
 * le référentiel par la régénération).
 */
export async function reactiverEquipement(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const etablissementId = await resoudreEtablissementId(id);
  await assertEtablissementOwnership(etablissementId);

  await prisma.equipement.update({ where: { id }, data: { actif: true } });
  const regen = await regenererCalendrier(etablissementId);

  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);
  return regen.ok ? { ok: true } : { ok: false, message: regen.message };
}

/**
 * Action de création groupée depuis le pré-remplissage (étape 4).
 * Attend un tableau `categories` de catégories validées par l'utilisateur.
 * Chaque catégorie donne lieu à un `Equipement` minimal (libellé générique,
 * pas de caractéristiques) que l'utilisateur pourra enrichir ensuite.
 */
export async function creerEquipementsDepuisPreRemplissage(
  etablissementId: string,
  entrees: { categorie: CategorieEquipement; libelle: string }[],
): Promise<{ created: number; avertissement?: string }> {
  await assertEtablissementOwnership(etablissementId);
  if (entrees.length === 0) return { created: 0 };

  const batiment = await batimentParDefaut(etablissementId);
  const result = await prisma.equipement.createMany({
    data: entrees.map((e) => ({
      etablissementId,
      batimentId: batiment.id,
      categorie: e.categorie,
      libelle: e.libelle,
    })),
  });

  const regen = await regenererCalendrier(etablissementId);

  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);
  return {
    created: result.count,
    ...(regen.ok ? {} : { avertissement: regen.message }),
  };
}
