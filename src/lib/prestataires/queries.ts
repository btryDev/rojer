import { prisma } from "@/lib/prisma";
import { requireEtablissement } from "@/lib/auth/scope";
import { computeVigilance, type VigilanceSnapshot } from "./vigilance";

export async function listPrestataires(etablissementId: string) {
  const { etablissement } = await requireEtablissement(etablissementId);
  const prestataires = await prisma.prestataire.findMany({
    where: { etablissementId: etablissement.id },
    orderBy: [{ raisonSociale: "asc" }],
  });
  return prestataires.map((p) => ({
    ...p,
    vigilance: computeVigilance(p),
  }));
}

export async function getPrestataire(
  etablissementId: string,
  prestataireId: string,
) {
  const { etablissement } = await requireEtablissement(etablissementId);
  const prestataire = await prisma.prestataire.findFirst({
    where: { id: prestataireId, etablissementId: etablissement.id },
  });
  if (!prestataire) return null;
  return { ...prestataire, vigilance: computeVigilance(prestataire) };
}

/**
 * Les prestataires dont une pièce appelle une action, comptés SUR LA GRAVITÉ.
 *
 * ~~Comptait `alertesOuvertes > 0`.~~ Corrigé le 2026-09-20. Le module qu'il
 * appelle écrit, au champ voisin : « **les écrans lisent celui-ci**, jamais
 * `alertesOuvertes` — qui compte un volume et ne dit rien de la gravité ». Or
 * `alertesOuvertes` inclut les pièces JAMAIS FOURNIES : un prestataire créé le
 * matin même sortait donc « en retard » sur l'écran « Préparer un contrôle »,
 * sous le libellé « attestation(s) expirée(s) ou expirant », alors que sa
 * propre fiche le montrait en ardoise. Rien n'avait expiré ; rien n'avait
 * seulement été demandé.
 *
 * `etatLePlusGrave` vaut `null` quand tout est à jour, et porte sinon l'état
 * réellement présent — c'est ce que l'écran doit peindre.
 */
export async function countAlertesVigilance(
  etablissementId: string,
): Promise<number> {
  const prestataires = await listPrestataires(etablissementId);
  return prestataires.reduce(
    (acc, p) => acc + (p.vigilance.etatLePlusGrave !== null ? 1 : 0),
    0,
  );
}

export type PrestataireAvecVigilance = Awaited<
  ReturnType<typeof listPrestataires>
>[number];

export type { VigilanceSnapshot };
