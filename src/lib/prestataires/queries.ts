import "server-only";
import { prisma } from "@/lib/prisma";
import { requireEtablissement } from "@/lib/auth/scope";
import { requireUser } from "@/lib/auth/require-user";
import {
  computeVigilance,
  ventilerVigilance,
  type VigilanceSnapshot,
} from "./vigilance";

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
    // Les pièces remplacées (2026-10-12), la plus récemment remplacée d'abord.
    include: {
      piecesPrecedentes: {
        orderBy: { remplaceeLe: "desc" },
        select: {
          id: true,
          type: true,
          fichierNom: true,
          deposeeLe: true,
          valableJusquA: true,
          remplaceeLe: true,
        },
      },
    },
  });
  if (!prestataire) return null;
  return { ...prestataire, vigilance: computeVigilance(prestataire) };
}

/**
 * Le prestataire de l'annuaire qu'une saisie désigne, s'il est de CET
 * établissement (relecture indépendante du 2026-10-12). Le plan de prévention
 * et le permis de feu écrivaient `prestataireId` tel que le formulaire
 * l'envoyait : un identifiant de l'annuaire d'un autre client s'y
 * rattachait. Même patron que `resoudreBatimentOptionnel` : la portée est
 * portée par le `where`, même si les appelants ont déjà établi la propriété.
 */
export async function resoudrePrestataireOptionnel(
  etablissementId: string,
  prestataireId: string | null | undefined,
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  if (!prestataireId) return { ok: true, id: null };
  const user = await requireUser();
  const p = await prisma.prestataire.findFirst({
    where: {
      id: prestataireId,
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
    },
    select: { id: true },
  });
  return p ? { ok: true, id: p.id } : { ok: false };
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

/**
 * Les mêmes prestataires, ventilés par gravité (`ventilerVigilance`) : ce que
 * lisent les surfaces qui disent « en retard » ou peignent le rouge — la
 * barre latérale et « Préparer un contrôle ». Une date non renseignée y est
 * `aPlanifier`, jamais `enRetard`.
 */
export async function compterVigilanceParGravite(etablissementId: string) {
  const prestataires = await listPrestataires(etablissementId);
  return ventilerVigilance(prestataires.map((p) => p.vigilance.etatLePlusGrave));
}

export type PrestataireAvecVigilance = Awaited<
  ReturnType<typeof listPrestataires>
>[number];

export type { VigilanceSnapshot };
