import "server-only";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { EFFECTIF_MAX } from "@/lib/etablissements/schema";
import {
  contributionDuSite,
  effectifApresRattachement,
  effectifEntrepriseDesSites,
  messageRefusEffectifEntreprise,
  messageRefusEffectifSite,
  type ChampEffectif,
  type EffectifSite,
} from "./effectif-calcul";

/**
 * L'EFFECTIF DE L'ENTREPRISE EST CALCULÉ (2026-11-03, décision de la
 * propriétaire ; ADR-028 et ADR-031 amendées).
 *
 *   Entreprise.effectif = Σ (effectifSurSite − apprentisSurSite) des sites
 *                         + effectifHorsRojer
 *
 * Il n'est plus saisi : chaque site déclare ses travailleurs dans Équipe, et
 * la société ceux de ses établissements que Rojer ne suit pas. La colonne
 * reste, écrite ici et nulle part ailleurs, pour que ses lecteurs — le moteur
 * (`projection.ts`), les seuils du CSE et du règlement intérieur, la
 * couverture — ne changent pas.
 *
 * LA BORNE (ADR-031, `EFFECTIF_MAX`). Toute écriture qui fait CROÎTRE
 * l'effectif de la société au-delà de la borne, ou celui d'un site, est
 * refusée : à l'onboarding comme dans Équipe. Baisser n'est jamais refusé,
 * même au-delà — un dossier ouvert avant la règle garde son dossier. La
 * comparaison se fait sur la somme calculée avant et après, jamais sur la
 * colonne stockée.
 *
 * Chaque entrée publique verrouille la société UNE fois, la lit UNE fois sous
 * le verrou, et passe cet état aux fonctions internes.
 *
 * Module serveur sans action : appelé dans la transaction d'une action
 * serveur, jamais ailleurs.
 */

/** Levée dans la transaction pour l'annuler ; l'action rend son message. */
export class RefusBorneEffectif extends Error {
  constructor(
    message: string,
    /** Le champ du formulaire que le refus vise. */
    readonly champ: ChampEffectif,
  ) {
    super(message);
    this.name = "RefusBorneEffectif";
  }
}

/** L'effectif saisi descend sous les fiches actives : une fiche est une personne. */
export class RefusSousLesFiches extends Error {
  constructor(readonly actifs: number) {
    super(
      `Vous suivez ${actifs} personnes dans cet établissement : l'effectif ne peut pas être inférieur. Marquez d'abord les sorties sur leurs fiches.`,
    );
    this.name = "RefusSousLesFiches";
  }
}

type Site = EffectifSite & { id: string };
type Societe = { id: string; effectif: number; horsRojer: number; sites: Site[] };

/**
 * Verrouille la société et la lit, en un appel. Deux sites de la même société
 * qui grandissent en même temps se lisent l'un après l'autre : sans verrou,
 * chacun verrait la somme sans l'autre, et les deux passeraient la borne
 * ensemble. Une écriture sans effet (`increment: 0`) prend le verrou de ligne
 * jusqu'à la fin de la transaction, comme le `FOR UPDATE` de
 * `supprimerEntrepriseSiVide`, sans SQL brut (`auth/portee/imports.test.ts`) ;
 * la lecture qu'elle rend se fait sous ce verrou.
 */
async function verrouillerEtLire(
  tx: Prisma.TransactionClient,
  entrepriseId: string,
): Promise<Societe> {
  const e = await tx.entreprise.update({
    where: { id: entrepriseId },
    data: { effectif: { increment: 0 } },
    select: {
      effectif: true,
      effectifHorsRojer: true,
      etablissements: { select: { id: true, effectifSurSite: true, apprentisSurSite: true } },
    },
  });
  return {
    id: entrepriseId,
    effectif: e.effectif,
    horsRojer: e.effectifHorsRojer,
    sites: e.etablissements,
  };
}

function siteDe(societe: Societe, etablissementId: string): Site {
  const site = societe.sites.find((s) => s.id === etablissementId);
  if (!site) throw new Error(`Établissement ${etablissementId} absent de sa société`);
  return site;
}

async function societeDuSite(tx: Prisma.TransactionClient, etablissementId: string) {
  const { entrepriseId } = await tx.etablissement.findUniqueOrThrow({
    where: { id: etablissementId },
    select: { entrepriseId: true },
  });
  const societe = await verrouillerEtLire(tx, entrepriseId);
  return { societe, site: siteDe(societe, etablissementId) };
}

/** La borne de la société : refuse ce qui croît au-delà, jamais ce qui baisse. */
function borner(avant: number, apres: number, champ: ChampEffectif) {
  if (apres > EFFECTIF_MAX && apres > avant) {
    throw new RefusBorneEffectif(messageRefusEffectifEntreprise(apres), champ);
  }
}

/**
 * Recalcule `Entreprise.effectif` depuis ses sites, sans rien refuser. Pour
 * une suppression de site : elle ne fait croître aucune société.
 */
export async function recalculerEffectifEntreprise(
  tx: Prisma.TransactionClient,
  entrepriseId: string,
): Promise<void> {
  const s = await verrouillerEtLire(tx, entrepriseId);
  const total = effectifEntrepriseDesSites(s.sites, s.horsRojer);
  if (total !== s.effectif) {
    await tx.entreprise.update({ where: { id: s.id }, data: { effectif: total } });
  }
}

export type NouveauxEffectifs = Partial<Record<ChampEffectif, number>>;

/** Ce qu'une écriture a changé : il décide de ce qui se recalcule. */
export type EffetEffectifs = { societe: boolean; site: boolean };

/** Applique de nouveaux effectifs à un site d'une société lue sous verrou. */
async function appliquer(
  tx: Prisma.TransactionClient,
  societe: Societe,
  site: Site,
  nouveaux: NouveauxEffectifs,
): Promise<EffetEffectifs> {
  const apres = {
    effectifSurSite: nouveaux.effectifSurSite ?? site.effectifSurSite,
    apprentisSurSite: nouveaux.apprentisSurSite ?? site.apprentisSurSite,
  };
  const horsRojer = nouveaux.effectifHorsRojer ?? societe.horsRojer;
  if (apres.effectifSurSite > EFFECTIF_MAX && apres.effectifSurSite > site.effectifSurSite) {
    throw new RefusBorneEffectif(messageRefusEffectifSite(apres.effectifSurSite), "effectifSurSite");
  }

  const totalAvant = effectifEntrepriseDesSites(societe.sites, societe.horsRojer);
  const total = effectifEntrepriseDesSites(
    societe.sites.map((s) => (s.id === site.id ? { ...s, ...apres } : s)),
    horsRojer,
  );
  // Le refus se rend sous le nombre qui a fait croître la société (passe
  // Chrome du 2026-11-03).
  borner(
    totalAvant,
    total,
    horsRojer > societe.horsRojer
      ? "effectifHorsRojer"
      : apres.effectifSurSite > site.effectifSurSite
        ? "effectifSurSite"
        : "apprentisSurSite",
  );

  const siteChange =
    apres.effectifSurSite !== site.effectifSurSite ||
    apres.apprentisSurSite !== site.apprentisSurSite;
  if (siteChange) {
    await tx.etablissement.update({ where: { id: site.id }, data: apres });
  }
  if (horsRojer !== societe.horsRojer || total !== societe.effectif) {
    await tx.entreprise.update({
      where: { id: societe.id },
      data: { effectifHorsRojer: horsRojer, effectif: total },
    });
  }
  return { societe: total !== totalAvant, site: siteChange };
}

/**
 * Écrit les effectifs d'un site (et de sa société), recalcule, et refuse ce
 * qui fait croître au-delà de la borne ou descend sous les fiches actives.
 * Lève `RefusBorneEffectif` ou `RefusSousLesFiches` : la transaction
 * appelante est annulée en entier.
 */
export async function ecrireEffectifs(
  tx: Prisma.TransactionClient,
  etablissementId: string,
  nouveaux: NouveauxEffectifs,
): Promise<EffetEffectifs> {
  const { societe, site } = await societeDuSite(tx, etablissementId);
  if (nouveaux.effectifSurSite !== undefined) {
    // Compté sous le verrou : une fiche créée en même temps est vue.
    const actifs = await tx.salarie.count({ where: { etablissementId, actif: true } });
    if (nouveaux.effectifSurSite < actifs) throw new RefusSousLesFiches(actifs);
  }
  return appliquer(tx, societe, site, nouveaux);
}

/**
 * Une personne entre dans l'équipe (création, retour dans l'effectif) : si
 * les fiches actives dépassent l'effectif déclaré du site, il monte d'autant
 * — une fiche est une personne — et la borne s'applique. Vrai si l'effectif
 * de la société a changé.
 */
export async function effectifSuitLesFiches(
  tx: Prisma.TransactionClient,
  etablissementId: string,
): Promise<boolean> {
  // Sous le verrou : deux créations simultanées se comptent l'une après
  // l'autre (revue du 2026-11-03).
  const { societe, site } = await societeDuSite(tx, etablissementId);
  const actifs = await tx.salarie.count({ where: { etablissementId, actif: true } });
  if (actifs <= site.effectifSurSite) return false;
  return (await appliquer(tx, societe, site, { effectifSurSite: actifs })).societe;
}

/** Un site entre dans une société suivie, lue sous verrou. */
async function rejoindre(tx: Prisma.TransactionClient, societe: Societe, site: Site) {
  const avant = effectifEntrepriseDesSites(
    societe.sites.filter((s) => s.id !== site.id),
    societe.horsRojer,
  );
  const { total, horsRojerApres } = effectifApresRattachement(
    avant,
    societe.horsRojer,
    contributionDuSite(site),
  );
  borner(avant, total, "effectifSurSite");
  await tx.entreprise.update({
    where: { id: societe.id },
    data: { effectif: total, effectifHorsRojer: horsRojerApres },
  });
}

/**
 * Un établissement vient d'être créé par le parcours d'entrée.
 *
 * - Seul site de sa société (elle naît avec lui) : le parcours a demandé
 *   l'effectif de la société, apprentis non compris. On en déduit les deux
 *   nombres que le calcul lit — l'écart sous le site est fait d'apprentis,
 *   l'écart au-dessus travaille hors de Rojer —, et la somme retombe dessus.
 * - Société déjà suivie : la valeur postée est ignorée, l'établissement la
 *   rejoint (`effectifApresRattachement`), et la borne s'applique.
 */
export async function accueillirSite(
  tx: Prisma.TransactionClient,
  cree: { id: string; entrepriseId: string; effectifSurSite: number },
  effectifEntrepriseDeclare: number,
): Promise<void> {
  const societe = await verrouillerEtLire(tx, cree.entrepriseId);
  const site = siteDe(societe, cree.id);
  if (societe.sites.length > 1) return rejoindre(tx, societe, site);

  const apprentis = Math.max(0, cree.effectifSurSite - effectifEntrepriseDeclare);
  if (apprentis > 0) {
    await tx.etablissement.update({ where: { id: cree.id }, data: { apprentisSurSite: apprentis } });
  }
  await tx.entreprise.update({
    where: { id: societe.id },
    data: {
      effectifHorsRojer: Math.max(0, effectifEntrepriseDeclare - cree.effectifSurSite),
      effectif: effectifEntrepriseDeclare,
    },
  });
}

/**
 * Un site a changé de société (son SIRET l'a rattaché à celle de son SIREN) :
 * il entre dans la nouvelle, borne comprise, et l'ancienne recompte ses sites
 * si elle n'est pas partie avec lui (`supprimerEntrepriseSiVide`).
 */
export async function changerDeSociete(
  tx: Prisma.TransactionClient,
  ecrit: { id: string; entrepriseId: string },
  quittee: { id: string; supprimee: boolean },
): Promise<void> {
  const societe = await verrouillerEtLire(tx, ecrit.entrepriseId);
  await rejoindre(tx, societe, siteDe(societe, ecrit.id));
  if (!quittee.supprimee) await recalculerEffectifEntreprise(tx, quittee.id);
}

/**
 * L'effectif de la société a changé : chacun de ses sites lit les seuils qui
 * en dépendent (CSE, règlement intérieur), tous se recalculent. Hors
 * transaction, après elle. Faux si un calendrier n'a pas pu être recalculé :
 * un échec ne se tait pas derrière un « Enregistré » (le patron de
 * `modifierEntreprise`).
 */
export async function regenererLaSociete(
  db: Pick<Prisma.TransactionClient, "etablissement">,
  etablissementId: string,
): Promise<boolean> {
  const sites = await db.etablissement.findMany({
    where: { entreprise: { etablissements: { some: { id: etablissementId } } } },
    select: { id: true },
  });
  let toutes = true;
  for (const s of sites) {
    if (!(await regenererApresMutation(s.id, "entreprises/effectif"))) toutes = false;
    revalidatePath(`/etablissements/${s.id}`, "layout");
  }
  return toutes;
}
