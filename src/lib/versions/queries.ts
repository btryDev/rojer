import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import type { DuerpSnapshot } from "./snapshot";

/**
 * L'historique des versions d'un DUERP, SANS leur `snapshot` (audit Next.js
 * du 2026-10-14, B2) : le JSON figé de chaque version, conservé quarante ans,
 * était chargé en entier pour une liste. Les champs retenus sont ceux que lisent
 * les trois appelants — la synthèse (liste, transmission au SPST), l'aperçu et
 * le PDF d'une version (`historiqueJusqua`). Le contenu d'une version se lit
 * par `getVersion`.
 */
export async function listerVersions(duerpId: string) {
  const user = await requireUser();
  return prisma.duerpVersion.findMany({
    where: {
      duerpId,
      duerp: { etablissement: { entreprise: { userId: user.id } } },
    },
    select: {
      id: true,
      numero: true,
      motif: true,
      createdAt: true,
      transmiseSpstLe: true,
    },
    orderBy: { numero: "desc" },
  });
}

export async function getVersion(duerpId: string, numero: number) {
  const user = await requireUser();
  const version = await prisma.duerpVersion.findFirst({
    where: {
      duerpId,
      numero,
      duerp: { etablissement: { entreprise: { userId: user.id } } },
    },
  });
  if (!version) return null;
  return {
    ...version,
    snapshot: version.snapshot as unknown as DuerpSnapshot,
  };
}
