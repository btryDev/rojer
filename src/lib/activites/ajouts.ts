import "server-only";
// Ce qu'un « oui » à une activité hors référentiel ajoute au DUERP, et ce
// qu'un « non » en retire (ADR-060). L'origine d'un ajout est
// `activiteId`, sur l'unité créée comme sur chaque risque : c'est elle que
// lisent l'idempotence, l'écran (« Nous avons ajouté… ») et le retrait.

import { Prisma } from "@prisma/client";
import type { Db } from "@/lib/auth/compte";
import { avecValidation } from "@/lib/duerps/etapes-validees";
import type { TransactionBornee } from "@/lib/auth/portee/client";
import { creerEnLotVerifie } from "@/lib/auth/portee/lot-verifie";
import { placesSousLePlafond } from "@/lib/abonnements/quotas";
import { questionsDetectionTransverses } from "@/lib/referentiels";
import type { ActiviteNonCouverte } from "@/lib/referentiels/types";
import { defautCotation } from "@/lib/risques/cotation-defaut";

/** Ce que l'écran d'une activité affiche de ses ajouts, lu en base. */
export type AjoutActivite = {
  /** `creeePourActivite` : `false` quand une unité existante a été complétée. */
  unite: { id: string; nom: string; creeePourActivite: boolean };
  risques: { id: string; libelle: string; cotationSaisie: boolean }[];
};

/**
 * Les ajouts présents dans le DUERP, par activité. Absente de la Map : rien
 * n'a été ajouté (ou tout a été retiré). Présente avec une réponse « non » :
 * des ajouts gardés parce que le dirigeant les avait cotés ou complétés.
 */
export async function ajoutsParActivite(
  db: Db,
  duerpId: string,
): Promise<Map<string, AjoutActivite>> {
  const risques = await db.risque.findMany({
    where: { activiteId: { not: null }, unite: { duerpId } },
    select: {
      id: true,
      libelle: true,
      cotationSaisie: true,
      activiteId: true,
      unite: { select: { id: true, nom: true, activiteId: true } },
    },
    orderBy: { id: "asc" },
  });
  const parActivite = new Map<string, AjoutActivite>();
  for (const r of risques) {
    const activiteId = r.activiteId!;
    let ajout = parActivite.get(activiteId);
    if (!ajout) {
      ajout = {
        unite: {
          id: r.unite.id,
          nom: r.unite.nom,
          creeePourActivite: r.unite.activiteId === activiteId,
        },
        risques: [],
      };
      parActivite.set(activiteId, ajout);
    }
    ajout.risques.push({ id: r.id, libelle: r.libelle, cotationSaisie: r.cotationSaisie });
  }
  return parActivite;
}

/** Les questions transverses qu'une activité appelle, dans l'ordre déclaré. */
export function questionsTransversesDe(
  activite: Pick<ActiviteNonCouverte, "aFaire">,
): { id: string; question: string }[] {
  return (activite.aFaire.questionsTransverses ?? []).flatMap((id) => {
    const q = questionsDetectionTransverses.find((x) => x.id === id);
    return q ? [{ id: q.id, question: q.intitule }] : [];
  });
}

/**
 * Ajoute l'unité et les risques d'un « oui ». Idempotent : si l'activité a
 * déjà des ajouts dans ce DUERP, rien ne se fait. Rend `true` si quelque
 * chose a été écrit.
 *
 * L'unité dédiée n'est créée que s'il reste une place sous la limite
 * d'unités de la formule (ADR-053) — lue sous le verrou du compte, comme le
 * pré-remplissage de `choisirSecteur`. Sinon, l'unité type désignée ; à
 * défaut (supprimée par le dirigeant), l'unité « Risques transverses ».
 */
export async function ajouterPourActivite(
  tx: TransactionBornee,
  p: { duerpId: string; compteId: string; activite: ActiviteNonCouverte },
): Promise<boolean> {
  const { duerpId, compteId, activite } = p;
  const deja = await tx.risque.count({
    where: { activiteId: activite.id, unite: { duerpId } },
  });
  if (deja > 0) return false;

  const uniteId = await uniteCible(tx, { duerpId, compteId, activite });
  if (!uniteId) return false;

  const cotation = defautCotation(undefined);
  const { count } = await creerEnLotVerifie(
    tx,
    "Risque",
    activite.aFaire.risques.map((libelle) => ({
      uniteId,
      libelle,
      activiteId: activite.id,
      ...cotation,
    })),
    { skipDuplicates: true },
  );
  return count > 0;
}

async function uniteCible(
  tx: TransactionBornee,
  p: { duerpId: string; compteId: string; activite: ActiviteNonCouverte },
): Promise<string | null> {
  const { duerpId, compteId, activite } = p;
  // Une unité déjà créée pour l'activité (ses risques retirés à la main,
  // puis un nouveau « oui ») : on la reprend plutôt que d'en refaire une.
  const creee = await tx.uniteTravail.findFirst({
    where: { duerpId, activiteId: activite.id },
    select: { id: true },
  });
  if (creee) return creee.id;

  const dediee = activite.aFaire.uniteDediee;
  if (dediee && (await placesSousLePlafond(tx, compteId, "unitesTravail")) >= 1) {
    const unite = await tx.uniteTravail.create({
      data: {
        duerpId,
        nom: dediee.nom,
        description: dediee.description,
        activiteId: activite.id,
      },
      select: { id: true },
    });
    return unite.id;
  }

  const existante =
    (await tx.uniteTravail.findFirst({
      where: { duerpId, estTransverse: false, referentielUniteId: activite.aFaire.uniteExistante },
      select: { id: true },
      orderBy: { id: "asc" },
    })) ??
    (await tx.uniteTravail.findFirst({
      where: { duerpId, estTransverse: true },
      select: { id: true },
    }));
  return existante?.id ?? null;
}

/**
 * Retire les ajouts d'une ou de plusieurs activités que le dirigeant n'a pas
 * touchés : un risque non coté et sans action ; puis l'unité créée pour
 * l'activité, si elle n'a plus aucun risque ni justification « aucun
 * risque ». Le reste est gardé. Rend `true` si quelque chose a été retiré.
 */
export async function retirerPourActivites(
  tx: TransactionBornee,
  p: { duerpId: string; activiteIds: string[] },
): Promise<boolean> {
  const { duerpId, activiteIds } = p;
  if (activiteIds.length === 0) return false;
  const { count: risquesRetires } = await tx.risque.deleteMany({
    where: {
      activiteId: { in: activiteIds },
      unite: { duerpId },
      cotationSaisie: false,
      actions: { none: {} },
      interventions: { none: {} },
    },
  });
  const { count: unitesRetirees } = await tx.uniteTravail.deleteMany({
    where: {
      duerpId,
      activiteId: { in: activiteIds },
      aucunRisqueJustif: null,
      risques: { none: {} },
    },
  });
  return risquesRetires + unitesRetirees > 0;
}

/**
 * Met les ajouts d'une activité d'accord avec sa réponse, en une
 * transaction : « oui » ajoute, « non » et le silence retirent. Si quelque
 * chose a bougé, les étapes « Unités » et « Risques » repassent à valider
 * (ADR-059) : ce qui vient d'arriver, personne ne l'a relu.
 *
 * Deux « oui » simultanés (double clic, deux onglets) : le second bute sur
 * un index unique et ne crée rien de plus — il n'y a rien à lui reprocher.
 */
export async function synchroniserAjouts(
  db: Db,
  p: { duerpId: string; compteId: string; activite: ActiviteNonCouverte; exercee: boolean | null },
): Promise<void> {
  const { duerpId, compteId, activite, exercee } = p;
  try {
    await db.$transaction(async (tx) => {
      const bouge =
        exercee === true
          ? await ajouterPourActivite(tx, { duerpId, compteId, activite })
          : await retirerPourActivites(tx, { duerpId, activiteIds: [activite.id] });
      if (bouge) await aRevalider(tx, duerpId);
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return;
    throw e;
  }
}

/** Retire les validations « Unités » et « Risques » du DUERP. */
export async function aRevalider(tx: TransactionBornee, duerpId: string): Promise<void> {
  const duerp = await tx.duerp.findUnique({
    where: { id: duerpId },
    select: { etapesValidees: true },
  });
  if (!duerp) return;
  const sansUnites = avecValidation(duerp.etapesValidees, "unites", null);
  await tx.duerp.update({
    where: { id: duerpId },
    data: { etapesValidees: avecValidation(sansUnites, "risques", null) },
  });
}
