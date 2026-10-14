import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import type { DuerpSnapshot } from "./snapshot";

export async function listerVersions(duerpId: string) {
  const user = await requireUser();
  return prisma.duerpVersion.findMany({
    where: {
      duerpId,
      duerp: { etablissement: { entreprise: { userId: user.id } } },
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
