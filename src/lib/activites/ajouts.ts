import "server-only";
// Ce qu'un « oui » à une activité hors référentiel ajoute au DUERP, et ce
// qu'un « non » en retire (ADR-060). L'origine d'un ajout est
// `activiteId`, sur l'unité créée comme sur chaque risque : c'est elle que
// lisent l'idempotence, l'écran (« Nous avons ajouté… ») et le retrait.

import { Prisma } from "@prisma/client";
import type { Db } from "@/lib/auth/compte";
import type { TransactionBornee } from "@/lib/auth/portee/client";
import { creerEnLotVerifie } from "@/lib/auth/portee/lot-verifie";
import { placesSousLePlafond } from "@/lib/abonnements/quotas";
import { avecValidation } from "@/lib/duerps/etapes-validees";
import { questionsDetectionTransverses } from "@/lib/referentiels";
import type { ActiviteNonCouverte } from "@/lib/referentiels/types";
import { defautCotation } from "@/lib/risques/cotation-defaut";

/** Le compte de la garde (`requireDuerp`), jamais une valeur reçue du client. */
type CompteDeLaGarde = { compteId: string };

/** Ce que l'écran d'une activité affiche de ses ajouts, lu en base. */
export type AjoutActivite = {
  /** `creeePourActivite` : `false` quand une unité existante a été complétée. */
  unite: { id: string; nom: string; creeePourActivite: boolean };
  risques: { id: string; libelle: string; cotationSaisie: boolean }[];
};

/**
 * Les ajouts présents dans le DUERP, par activité : l'unité créée pour elle
 * (même vidée de ses risques), et les risques qu'elle a ajoutés. Absente de
 * la Map : rien n'a été ajouté — ou rien ne pouvait l'être (limite d'unités
 * atteinte et unité type supprimée), l'écran le dit alors. Présente avec une
 * réponse « non » : des ajouts gardés parce que le dirigeant les avait
 * complétés.
 */
export async function ajoutsParActivite(
  db: Db,
  duerpId: string,
): Promise<Map<string, AjoutActivite>> {
  const [unites, risques] = await Promise.all([
    db.uniteTravail.findMany({
      where: { duerpId, activiteId: { not: null } },
      select: { id: true, nom: true, activiteId: true },
    }),
    db.risque.findMany({
      where: { activiteId: { not: null }, unite: { duerpId } },
      select: {
        id: true,
        libelle: true,
        cotationSaisie: true,
        activiteId: true,
        unite: { select: { id: true, nom: true, activiteId: true } },
      },
      orderBy: { id: "asc" },
    }),
  ]);
  const parActivite = new Map<string, AjoutActivite>();
  for (const u of unites)
    parActivite.set(u.activiteId!, { unite: { id: u.id, nom: u.nom, creeePourActivite: true }, risques: [] });
  for (const r of risques) {
    const activiteId = r.activiteId!;
    let ajout = parActivite.get(activiteId);
    if (!ajout) {
      ajout = {
        unite: { id: r.unite.id, nom: r.unite.nom, creeePourActivite: r.unite.activiteId === activiteId },
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
 * Ajoute ce qu'un « oui » appelle et qui manque. Rend `true` si quelque chose
 * a été écrit.
 *
 * Idempotent par l'index `(uniteId, activiteId, libelle)` : un risque déjà là
 * n'est pas recréé, un risque retiré par un « non » revient. L'unité est
 * celle des ajouts déjà présents s'il y en a — un « non » qui en a gardé un
 * ne doit pas faire répartir les autres ailleurs —, sinon l'unité dédiée
 * s'il reste une place sous la limite d'unités de la formule (ADR-053 ; lue
 * sous le verrou du compte, comme le pré-remplissage de `choisirSecteur`),
 * sinon l'unité type désignée. Sans aucune des trois (limite atteinte et
 * unité type supprimée), rien n'est ajouté : les risques transverses ne
 * reçoivent jamais ceux d'une activité, ils ne portent que ceux des questions
 * transverses.
 */
export async function ajouterPourActivite(
  tx: TransactionBornee,
  p: { duerpId: string; compte: CompteDeLaGarde; activite: ActiviteNonCouverte },
): Promise<boolean> {
  const { duerpId, compte, activite } = p;

  let uniteId =
    (
      await tx.uniteTravail.findFirst({
        where: { duerpId, activiteId: activite.id },
        select: { id: true },
      })
    )?.id ??
    (
      await tx.risque.findFirst({
        where: { activiteId: activite.id, unite: { duerpId } },
        select: { uniteId: true },
        orderBy: { id: "asc" },
      })
    )?.uniteId ??
    null;
  let uniteCreee = false;

  const dediee = activite.aFaire.uniteDediee;
  if (!uniteId && dediee && (await placesSousLePlafond(tx, compte.compteId, "unitesTravail")) >= 1) {
    const unite = await tx.uniteTravail.create({
      data: { duerpId, nom: dediee.nom, description: dediee.description, activiteId: activite.id },
      select: { id: true },
    });
    uniteId = unite.id;
    uniteCreee = true;
  }

  uniteId ??=
    (
      await tx.uniteTravail.findFirst({
        where: { duerpId, estTransverse: false, referentielUniteId: activite.aFaire.uniteExistante },
        select: { id: true },
        orderBy: { id: "asc" },
      })
    )?.id ?? null;
  if (!uniteId) return false;

  const cotation = defautCotation(undefined);
  const { count } = await creerEnLotVerifie(
    tx,
    "Risque",
    activite.aFaire.risques.map((libelle) => ({ uniteId, libelle, activiteId: activite.id, ...cotation })),
    { skipDuplicates: true },
  );
  return uniteCreee || count > 0;
}

/**
 * Retire les ajouts que le dirigeant n'a pas touchés, pour les activités
 * données. Un risque est touché dès qu'il porte autre chose que ce que Rojer
 * y a mis : une cotation saisie, une action, une description, un nombre
 * d'exposés, une date de mesures, une exposition CMR, ou un libellé reformulé.
 * L'unité créée pour l'activité n'est retirée que vide, sans justification
 * « aucun risque », et sous le nom et la description que Rojer lui a donnés.
 * Rend `true` si quelque chose a été retiré.
 */
export async function retirerPourActivites(
  tx: TransactionBornee,
  p: { duerpId: string; activites: readonly ActiviteNonCouverte[] },
): Promise<boolean> {
  const { duerpId, activites } = p;
  if (activites.length === 0) return false;
  const { count: risquesRetires } = await tx.risque.deleteMany({
    where: {
      unite: { duerpId },
      OR: activites.map((a) => ({ activiteId: a.id, libelle: { in: a.aFaire.risques } })),
      cotationSaisie: false,
      actions: { none: {} },
      interventions: { none: {} },
      description: null,
      nombreSalariesExposes: null,
      dateMesuresPhysiques: null,
      exposeCMR: false,
    },
  });
  const dediees = activites.flatMap((a) =>
    a.aFaire.uniteDediee
      ? [{ activiteId: a.id, nom: a.aFaire.uniteDediee.nom, description: a.aFaire.uniteDediee.description }]
      : [],
  );
  const { count: unitesRetirees } =
    dediees.length === 0
      ? { count: 0 }
      : await tx.uniteTravail.deleteMany({
          where: { duerpId, OR: dediees, aucunRisqueJustif: null, risques: { none: {} } },
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
 * un des deux index d'origine et ne crée rien de plus — ce n'est pas une
 * erreur. Toute autre violation d'unicité remonte.
 */
export async function synchroniserAjouts(
  db: Db,
  p: { duerpId: string; compte: CompteDeLaGarde; activite: ActiviteNonCouverte; exercee: boolean | null },
): Promise<void> {
  const { duerpId, compte, activite, exercee } = p;
  try {
    await db.$transaction(async (tx) => {
      const bouge =
        exercee === true
          ? await ajouterPourActivite(tx, { duerpId, compte, activite })
          : await retirerPourActivites(tx, { duerpId, activites: [activite] });
      if (bouge) await aRevalider(tx, duerpId);
    });
  } catch (e) {
    if (estDoublonDOrigine(e)) return;
    throw e;
  }
}

/** Une violation d'un des deux index qui portent `activiteId`, et d'eux seuls. */
export function estDoublonDOrigine(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    JSON.stringify(e.meta?.target ?? "").includes("activiteId")
  );
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
