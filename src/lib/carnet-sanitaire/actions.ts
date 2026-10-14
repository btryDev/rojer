"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { resoudreBatimentOptionnel } from "@/lib/batiments/queries";
import {
  getStorage,
  cleRapport,
  MESSAGE_DEPOT_NON_CONFIGURE,
  MESSAGE_ECHEC_ENREGISTREMENT,
  stockageEnService,
} from "@/lib/storage";
import { validerFichier } from "@/lib/rapports/validator";
import { libererFichiers } from "@/lib/suppression/fichiers";
import {
  analyseLegionelleSchema,
  estReleveConforme,
  pointReleveSchema,
  releveTemperatureSchema,
  resultatAnalyse,
} from "./schema";

export type CarnetActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success" };

/**
 * Ce qui lit le carnet, tout entier, se recalcule à la lecture : l'analyse
 * suivante du calendrier (`calendrier/echeances.ts`, `sourceLegionelles`), la
 * ligne de la matrice du tableau de bord (`dashboard/queries.ts`) et le
 * fichier 08 du ZIP de contrôle. Aucun n'est stocké ; il suffit donc
 * d'invalider l'établissement entier, barre latérale comprise, après toute
 * écriture — création comme correction (2026-10-12).
 */
function revaliderCarnet(etablissementId: string) {
  revalidatePath(`/etablissements/${etablissementId}`, "layout");
}

const formulaireInvalide = (fieldErrors: Record<string, string[]>): CarnetActionState => ({
  status: "error",
  message: "Formulaire invalide",
  fieldErrors,
});

async function obtenirOuCreerCarnet(etablissementId: string) {
  const existant = await prisma.carnetSanitaire.findUnique({
    where: { etablissementId },
  });
  if (existant) return existant;
  return prisma.carnetSanitaire.create({
    data: {
      id: `cs_${randomUUID()}`,
      etablissementId,
    },
  });
}

function lirePoint(formData: FormData) {
  return pointReleveSchema.safeParse({
    nom: formData.get("nom"),
    localisation: formData.get("localisation"),
    batimentId: formData.get("batimentId"),
    typePoint: formData.get("typePoint"),
    typeReseau: formData.get("typeReseau"),
    seuilMinCelsius: formData.get("seuilMinCelsius"),
    seuilMaxCelsius: formData.get("seuilMaxCelsius"),
  });
}

/** Ce que la base reçoit d'un point lu : le réseau est sûr après le refine. */
function champsDuPoint(p: NonNullable<ReturnType<typeof lirePoint>["data"]>) {
  return {
    nom: p.nom,
    localisation: p.localisation ?? null,
    typePoint: p.typePoint ?? null,
    typeReseau: p.typeReseau!,
    seuilMinCelsius: p.seuilMinCelsius,
    seuilMaxCelsius: p.seuilMaxCelsius,
  };
}

export async function creerPointReleve(
  etablissementId: string,
  _prev: CarnetActionState,
  formData: FormData,
): Promise<CarnetActionState> {
  await assertEtablissementOwnership(etablissementId);
  const parsed = lirePoint(formData);
  if (!parsed.success) return formulaireInvalide(parsed.error.flatten().fieldErrors);
  // Un point NEUF dit où il est (2026-10-14) : seul un point d'avant le type
  // peut rester sans, et seulement à la correction.
  if (!parsed.data.typePoint) {
    return formulaireInvalide({ typePoint: ["Type de point requis"] });
  }
  const batiment = await resoudreBatimentOptionnel(
    etablissementId,
    parsed.data.batimentId,
  );
  if (!batiment.ok) {
    return {
      status: "error",
      message: "Zone introuvable",
      fieldErrors: { batimentId: ["Zone introuvable"] },
    };
  }
  const carnet = await obtenirOuCreerCarnet(etablissementId);
  await prisma.pointReleve.create({
    data: {
      id: `pt_${randomUUID()}`,
      carnetId: carnet.id,
      ...champsDuPoint(parsed.data),
      batimentId: batiment.id,
    },
  });
  revaliderCarnet(etablissementId);
  return { status: "success" };
}

/**
 * Corriger un point : nom, zone, localisation, type de réseau, seuil
 * (2026-10-12, audit des modules, B6). Le type et le seuil décident de la
 * plage de CHAQUE relevé du point (`estReleveConforme`), et la plage est
 * stockée sur le relevé (`conforme`, que lisent la carte et le ZIP) : elle est
 * donc recalculée, dans la même transaction, pour tous ses relevés.
 */
export async function modifierPointReleve(
  etablissementId: string,
  pointId: string,
  _prev: CarnetActionState,
  formData: FormData,
): Promise<CarnetActionState> {
  await assertEtablissementOwnership(etablissementId);
  const parsed = lirePoint(formData);
  if (!parsed.success) return formulaireInvalide(parsed.error.flatten().fieldErrors);
  const point = await prisma.pointReleve.findFirst({
    where: { id: pointId, actif: true, carnet: { etablissementId } },
    select: {
      id: true,
      typePoint: true,
      releves: { select: { id: true, temperatureCelsius: true } },
    },
  });
  if (!point) return { status: "error", message: "Point de relevé introuvable" };
  // Un type précisé ne se retire pas (revue du 2026-10-14) : « non précisé »
  // n'existe que pour les points d'avant le type. Le formulaire ne le propose
  // pas ; un envoi forgé avec `typePoint=""` le pouvait, et rendait au point
  // le réseau qu'on lui envoyait.
  if (point.typePoint !== null && !parsed.data.typePoint) {
    return formulaireInvalide({
      typePoint: ["Le type d'un point déjà précisé ne peut pas être retiré."],
    });
  }
  const batiment = await resoudreBatimentOptionnel(
    etablissementId,
    parsed.data.batimentId,
  );
  if (!batiment.ok) {
    return {
      status: "error",
      message: "Zone introuvable",
      fieldErrors: { batimentId: ["Zone introuvable"] },
    };
  }
  const champs = champsDuPoint(parsed.data);
  await prisma.$transaction([
    prisma.pointReleve.update({
      where: { id: point.id },
      data: { ...champs, batimentId: batiment.id },
    }),
    ...point.releves.map((r) =>
      prisma.releveTemperature.update({
        where: { id: r.id },
        data: { conforme: estReleveConforme(r.temperatureCelsius, champs) },
      }),
    ),
  ]);
  revaliderCarnet(etablissementId);
  return { status: "success" };
}

/**
 * Retirer un point du carnet. Un point jamais relevé empêchait « À jour »
 * pour toujours au tableau de bord (`dashboard/obligations.ts`) : cette
 * action existait, sans aucun bouton pour l'appeler, jusqu'au 2026-10-12.
 */
export async function supprimerPointReleve(
  etablissementId: string,
  pointId: string,
): Promise<void> {
  await assertEtablissementOwnership(etablissementId);
  // Soft delete : on garde les relevés historiques, on désactive le point.
  //
  // Le point est désactivé *via* son carnet : `assertEtablissementOwnership`
  // ne dit que « cet établissement est à moi », il ne dit rien du point de
  // relevé, dont l'identifiant vient du client. Sans le filtre de relation,
  // un utilisateur authentifié pouvait passer son propre établissement et
  // l'identifiant du point d'un tiers. `ajouterReleve`, juste dessous, fait
  // déjà ce rapprochement.
  const { count } = await prisma.pointReleve.updateMany({
    where: { id: pointId, carnet: { etablissementId } },
    data: { actif: false },
  });
  if (count === 0) throw new Error("Point de relevé introuvable");
  revaliderCarnet(etablissementId);
}

/** Les champs d'un relevé, communs à la saisie et à la correction. */
function lireReleve(formData: FormData, pointReleveId: unknown) {
  return releveTemperatureSchema.safeParse({
    pointReleveId,
    dateReleve: formData.get("dateReleve"),
    temperatureCelsius: formData.get("temperatureCelsius"),
    operateur: formData.get("operateur"),
    commentaire: formData.get("commentaire"),
  });
}

export async function ajouterReleve(
  etablissementId: string,
  _prev: CarnetActionState,
  formData: FormData,
): Promise<CarnetActionState> {
  await assertEtablissementOwnership(etablissementId);
  const parsed = lireReleve(formData, formData.get("pointReleveId"));
  if (!parsed.success) return formulaireInvalide(parsed.error.flatten().fieldErrors);
  const point = await prisma.pointReleve.findUnique({
    where: { id: parsed.data.pointReleveId },
    select: {
      seuilMinCelsius: true,
      seuilMaxCelsius: true,
      carnet: { select: { etablissementId: true } },
    },
  });
  if (!point || point.carnet.etablissementId !== etablissementId) {
    return { status: "error", message: "Point de relevé introuvable" };
  }
  const conforme = estReleveConforme(parsed.data.temperatureCelsius, point);
  await prisma.releveTemperature.create({
    data: {
      id: `rel_${randomUUID()}`,
      pointReleveId: parsed.data.pointReleveId,
      dateReleve: parsed.data.dateReleve,
      temperatureCelsius: parsed.data.temperatureCelsius,
      conforme,
      operateur: parsed.data.operateur,
      commentaire: parsed.data.commentaire,
    },
  });
  revaliderCarnet(etablissementId);
  return { status: "success" };
}

/** Un relevé, cherché dans le carnet de CET établissement : l'identifiant
 *  vient du client (même rapprochement que `supprimerPointReleve`). */
function releveDansLeCarnet(etablissementId: string, releveId: string) {
  return prisma.releveTemperature.findFirst({
    where: { id: releveId, pointReleve: { carnet: { etablissementId } } },
    select: {
      id: true,
      pointReleveId: true,
      pointReleve: { select: { seuilMinCelsius: true, seuilMaxCelsius: true } },
    },
  });
}

/** Corriger un relevé (2026-10-12) : date, température, opérateur,
 *  commentaire. Le point ne change pas ; la plage est recalculée sur son
 *  seuil, comme à la saisie. */
export async function modifierReleve(
  etablissementId: string,
  releveId: string,
  _prev: CarnetActionState,
  formData: FormData,
): Promise<CarnetActionState> {
  await assertEtablissementOwnership(etablissementId);
  const releve = await releveDansLeCarnet(etablissementId, releveId);
  if (!releve) return { status: "error", message: "Relevé introuvable" };
  const parsed = lireReleve(formData, releve.pointReleveId);
  if (!parsed.success) return formulaireInvalide(parsed.error.flatten().fieldErrors);
  await prisma.releveTemperature.update({
    where: { id: releve.id },
    data: {
      dateReleve: parsed.data.dateReleve,
      temperatureCelsius: parsed.data.temperatureCelsius,
      conforme: estReleveConforme(parsed.data.temperatureCelsius, releve.pointReleve),
      operateur: parsed.data.operateur ?? null,
      commentaire: parsed.data.commentaire ?? null,
    },
  });
  revaliderCarnet(etablissementId);
  return { status: "success" };
}

/** Supprimer un relevé saisi par erreur. Définitif : le modèle n'a pas de
 *  suppression logique pour un relevé. */
export async function supprimerReleve(
  etablissementId: string,
  releveId: string,
): Promise<void> {
  await assertEtablissementOwnership(etablissementId);
  const { count } = await prisma.releveTemperature.deleteMany({
    where: { id: releveId, pointReleve: { carnet: { etablissementId } } },
  });
  if (count === 0) throw new Error("Relevé introuvable");
  revaliderCarnet(etablissementId);
}

function lireAnalyse(formData: FormData) {
  return analyseLegionelleSchema.safeParse({
    dateAnalyse: formData.get("dateAnalyse"),
    laboratoire: formData.get("laboratoire"),
    valeurUfcParL: formData.get("valeurUfcParL"),
    commentaire: formData.get("commentaire"),
  });
}

/**
 * Le rapport de laboratoire joint au formulaire, écrit au stockage. `null` si
 * aucun fichier n'est joint ; un refus porte son motif exact, avant toute
 * écriture en base (2026-09-27).
 */
async function deposerRapportLabo(
  etablissementId: string,
  formData: FormData,
): Promise<
  | { ok: true; rapport: { cle: string; nom: string } | null }
  | { ok: false; message: string }
> {
  const fichier = formData.get("rapport");
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: true, rapport: null };
  const val = await validerFichier(fichier);
  if (!val.ok) return { ok: false, message: val.erreur };
  // Rapport de laboratoire joint, mais pas de stockage configuré : refus
  // avec le motif exact, avant toute écriture (2026-09-27).
  if (!stockageEnService()) return { ok: false, message: MESSAGE_DEPOT_NON_CONFIGURE };
  const cle = cleRapport(etablissementId, `legio_${randomUUID()}`, fichier.name);
  // Même règle que le dépôt d'un rapport (2026-09-27) : message métier,
  // rien d'écrit en base.
  try {
    await getStorage().put(cle, Buffer.from(await fichier.arrayBuffer()), val.mime);
  } catch (e) {
    console.error(`[carnet-sanitaire/depot] écriture du fichier impossible (${cle})`, e);
    return { ok: false, message: MESSAGE_ECHEC_ENREGISTREMENT };
  }
  return { ok: true, rapport: { cle, nom: fichier.name } };
}

export async function ajouterAnalyseLegionelle(
  etablissementId: string,
  _prev: CarnetActionState,
  formData: FormData,
): Promise<CarnetActionState> {
  await assertEtablissementOwnership(etablissementId);
  const parsed = lireAnalyse(formData);
  if (!parsed.success) return formulaireInvalide(parsed.error.flatten().fieldErrors);

  const carnet = await obtenirOuCreerCarnet(etablissementId);

  const depot = await deposerRapportLabo(etablissementId, formData);
  if (!depot.ok) return { status: "error", message: depot.message };

  // ~~`valeurUfcParL === undefined ||`~~ : une analyse sans valeur n'est pas
  // conforme (relecture du 2026-09-26). La colonne n'est plus lue pour
  // l'affichage — `resultatAnalyse` lit la valeur — mais elle ne doit plus
  // affirmer ce que personne n'a saisi.
  const conforme = resultatAnalyse(parsed.data.valeurUfcParL) === "sous_limite";

  // Le fichier est déjà sur le disque : si l'insert échoue, il faut le
  // reprendre, sinon le stockage accumule des rapports que plus aucune ligne
  // ne référence. Même nettoyage best-effort que les trois autres modules
  // d'upload (rapports, prestataires).
  try {
    await prisma.analyseLegionelle.create({
      data: {
        id: `ana_${randomUUID()}`,
        carnetId: carnet.id,
        dateAnalyse: parsed.data.dateAnalyse,
        laboratoire: parsed.data.laboratoire,
        valeurUfcParL: parsed.data.valeurUfcParL,
        conforme,
        rapportCle: depot.rapport?.cle ?? null,
        rapportNom: depot.rapport?.nom ?? null,
        commentaire: parsed.data.commentaire,
      },
    });
  } catch (e) {
    if (depot.rapport) {
      await getStorage().delete(depot.rapport.cle).catch(() => {});
    }
    throw e;
  }
  revaliderCarnet(etablissementId);
  return { status: "success" };
}

/** Une analyse, cherchée dans le carnet de CET établissement. */
function analyseDansLeCarnet(etablissementId: string, analyseId: string) {
  return prisma.analyseLegionelle.findFirst({
    where: { id: analyseId, carnet: { etablissementId } },
    select: { id: true, rapportCle: true },
  });
}

/**
 * Corriger une analyse (2026-10-12) : date, laboratoire, valeur, commentaire,
 * et le remplacement du rapport de laboratoire. Un champ facultatif vidé
 * efface la valeur. Le rapport remplacé n'est plus référencé par aucune
 * ligne — le modèle n'en garde qu'un par analyse — : il est libéré après
 * l'écriture en base, et l'écran le dit avant l'envoi.
 */
export async function modifierAnalyseLegionelle(
  etablissementId: string,
  analyseId: string,
  _prev: CarnetActionState,
  formData: FormData,
): Promise<CarnetActionState> {
  await assertEtablissementOwnership(etablissementId);
  const analyse = await analyseDansLeCarnet(etablissementId, analyseId);
  if (!analyse) return { status: "error", message: "Analyse introuvable" };
  const parsed = lireAnalyse(formData);
  if (!parsed.success) return formulaireInvalide(parsed.error.flatten().fieldErrors);

  const depot = await deposerRapportLabo(etablissementId, formData);
  if (!depot.ok) return { status: "error", message: depot.message };

  try {
    await prisma.analyseLegionelle.update({
      where: { id: analyse.id },
      data: {
        dateAnalyse: parsed.data.dateAnalyse,
        laboratoire: parsed.data.laboratoire ?? null,
        valeurUfcParL: parsed.data.valeurUfcParL ?? null,
        conforme: resultatAnalyse(parsed.data.valeurUfcParL) === "sous_limite",
        commentaire: parsed.data.commentaire ?? null,
        ...(depot.rapport
          ? { rapportCle: depot.rapport.cle, rapportNom: depot.rapport.nom }
          : {}),
      },
    });
  } catch (e) {
    if (depot.rapport) await libererFichiers([depot.rapport.cle], "carnet-sanitaire/modification");
    throw e;
  }
  if (depot.rapport && analyse.rapportCle) {
    await libererFichiers([analyse.rapportCle], "carnet-sanitaire/remplacement");
  }
  revaliderCarnet(etablissementId);
  return { status: "success" };
}

/** Supprimer une analyse saisie par erreur, et son rapport de laboratoire.
 *  Définitif : le modèle n'a pas de suppression logique pour une analyse. */
export async function supprimerAnalyseLegionelle(
  etablissementId: string,
  analyseId: string,
): Promise<void> {
  await assertEtablissementOwnership(etablissementId);
  const analyse = await analyseDansLeCarnet(etablissementId, analyseId);
  if (!analyse) throw new Error("Analyse introuvable");
  await prisma.analyseLegionelle.delete({ where: { id: analyse.id } });
  if (analyse.rapportCle) {
    await libererFichiers([analyse.rapportCle], "carnet-sanitaire/suppression");
  }
  revaliderCarnet(etablissementId);
}
