import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { CATEGORIES_EPI } from "@/lib/referentiels/types-communs";

/**
 * Quand des EPI sont CONSTATÉS au dossier, la réponse à « Fournissez-vous des
 * équipements de protection individuelle à vos salariés ? » est « oui »
 * (décision de la propriétaire du 2026-10-22). Une seule règle, deux sources :
 *
 *   - une mesure de type `protection_individuelle` EN PLACE (`levee` — la
 *     mesure « existante » du DUERP, ou une action du plan réalisée). Une
 *     mesure prévue ou en cours dit une intention, pas des EPI fournis ;
 *   - un équipement d'une catégorie EPI déclaré au parc, et actif
 *     (`estCategorieEpi`, audit B2 du 2026-10-12).
 *
 * Le besoin d'EPI naît de l'évaluation des risques (R. 4321-4) : reposer la
 * question à qui a déjà inscrit ses EPI ferait doublon. L'inverse ne se
 * déduit pas — l'absence de mesure ne vaut pas « non », un DUERP en cours
 * n'est pas une réponse.
 */
const EPI_CONSTATES: Prisma.EtablissementWhereInput = {
  OR: [
    { actions: { some: { type: "protection_individuelle", statut: "levee" } } },
    {
      equipements: {
        some: { actif: true, categorie: { in: [...CATEGORIES_EPI] } },
      },
    },
  ],
};

/** Des EPI sont-ils constatés à ce dossier ? Lu avant d'accepter un « non ». */
export async function epiConstates(etablissementId: string): Promise<boolean> {
  const n = await prisma.etablissement.count({
    where: { AND: [{ id: etablissementId }, EPI_CONSTATES] },
  });
  return n > 0;
}

/**
 * Passe la réponse à « oui » si des EPI sont constatés et qu'elle ne l'est
 * pas. À appeler après toute écriture d'une `Action` ou d'un `Equipement` qui
 * peut en faire constater. L'appartenance est vérifiée par l'appelant.
 *
 * `regenerer: false` pour un appelant qui régénère déjà le calendrier juste
 * après (la déclaration d'un équipement). Sinon, le calendrier suit ici : la
 * consigne d'utilisation (R. 4323-105) naît d'un « non » levé.
 *
 * À SENS UNIQUE, et c'est voulu : retirer la mesure ou l'équipement ne rend
 * pas l'ancienne réponse. La question redevient libre (`epiConstates` ne
 * bloque plus le « non »), et le dirigeant la corrige au DUERP ou dans Équipe.
 */
export async function constaterEpi(
  etablissementId: string,
  { regenerer = true }: { regenerer?: boolean } = {},
): Promise<boolean> {
  const { count } = await prisma.etablissement.updateMany({
    where: {
      AND: [
        { id: etablissementId },
        { OR: [{ epiPresents: false }, { epiPresents: null }] },
        EPI_CONSTATES,
      ],
    },
    data: { epiPresents: true },
  });
  if (count === 0) return false;
  if (regenerer) {
    await regenererApresMutation(etablissementId, "epi/constate");
    revalidatePath(`/etablissements/${etablissementId}`);
  }
  return true;
}

/** Ce que l'écran dit quand un « non » contredit des EPI constatés. */
export const MESSAGE_EPI_CONSTATES =
  "Votre dossier porte des équipements de protection individuelle : une mesure de protection individuelle en place au DUERP ou au plan d'actions, ou un EPI déclaré dans vos équipements. La réponse est donc « oui ». Pour répondre « non », retirez-les d'abord.";
