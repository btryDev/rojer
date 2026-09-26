"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { construireSnapshot } from "./snapshot-builder";
import {
  estConflitDeNumeroVersion,
  TENTATIVES_NUMEROTATION,
} from "./numerotation";
import {
  MOTIFS_VERSION,
  type MotifVersion,
  type VersionActionState,
} from "./motifs";

const motifCleSchema = z.enum(
  Object.keys(MOTIFS_VERSION) as [MotifVersion, ...MotifVersion[]],
);
const precisionSchema = z
  .string()
  .trim()
  .max(300)
  .optional()
  .or(z.literal("").transform(() => undefined));

export async function creerVersion(
  duerpId: string,
  _prev: VersionActionState,
  formData: FormData,
): Promise<VersionActionState> {
  const cleParsed = motifCleSchema.safeParse(formData.get("motifCle"));
  if (!cleParsed.success) {
    return {
      status: "error",
      message:
        "Sélectionnez un motif de mise à jour.",
    };
  }
  const precisionParsed = precisionSchema.safeParse(
    formData.get("motifPrecision"),
  );
  const precision = precisionParsed.success ? precisionParsed.data : undefined;

  const cle = cleParsed.data;
  // « Autre » exige une précision libre, sinon le motif n'est pas traçable.
  if (cle === "autre" && !precision) {
    return {
      status: "error",
      message:
        "Précisez le motif quand vous choisissez « Autre ».",
    };
  }
  const motif = precision
    ? `${MOTIFS_VERSION[cle]} — ${precision}`
    : MOTIFS_VERSION[cle];

  // Le snapshot est figé une fois pour toutes, avant la boucle : son contenu
  // ne dépend pas du numéro attribué (seul le champ `version` est réécrit à
  // chaque tentative). Le construire une seule fois évite de relire tout le
  // DUERP à chaque reprise, et garantit que deux tentatives successives
  // gèlent bien le *même* état du document.
  //
  // `construireSnapshot` est scopé au user connecté : un `null` couvre à la
  // fois le DUERP inexistant et le DUERP d'un tiers.
  const snapshotBase = await construireSnapshot(duerpId, {
    numero: 0,
    motif,
  });
  if (!snapshotBase) return { status: "error", message: "DUERP introuvable" };

  // Lecture du dernier numéro + insertion dans une même transaction. La
  // transaction ne suffit pas à sérialiser deux validations concurrentes
  // (les deux lisent le même maximum en niveau « read committed ») : c'est
  // `@@unique([duerpId, numero])` qui tranche, et la reprise ci-dessous qui
  // rattrape le perdant. Sans elle, le second utilisateur recevait une
  // erreur Prisma P2002 brute à l'écran.
  for (let tentative = 1; tentative <= TENTATIVES_NUMEROTATION; tentative++) {
    try {
      const cree = await prisma.$transaction(async (tx) => {
        const derniere = await tx.duerpVersion.findFirst({
          where: { duerpId },
          orderBy: { numero: "desc" },
          select: { numero: true },
        });
        const prochainNumero = (derniere?.numero ?? 0) + 1;

        return tx.duerpVersion.create({
          data: {
            duerpId,
            numero: prochainNumero,
            motif,
            snapshot: {
              ...snapshotBase,
              version: prochainNumero,
            } as unknown as object,
          },
          select: {
            numero: true,
            duerp: {
              select: { etablissement: { select: { entrepriseId: true } } },
            },
          },
        });
      });

      revalidatePath(`/duerp/${duerpId}/synthese`);
      revalidatePath(`/entreprises/${cree.duerp.etablissement.entrepriseId}`);
      return { status: "success", numero: cree.numero };
    } catch (erreur) {
      if (!estConflitDeNumeroVersion(erreur)) throw erreur;
      // Numéro pris entre-temps : on rejoue la lecture du maximum.
    }
  }

  return {
    status: "error",
    message:
      "Une autre validation de version est en cours sur ce DUERP. Rechargez la page et réessayez.",
  };
}
