import "server-only";
import { requireCompte } from "@/lib/auth/compte";

type ActionRow = {
  id: string;
  libelle: string;
  type: string;
  statut: string;
  echeance: Date | null;
  responsable: string | null;
  referentielMesureId: string | null;
};

function actionVersMesure(a: ActionRow) {
  const statutUI: "existante" | "prevue" =
    a.statut === "levee" ? "existante" : "prevue";
  return {
    id: a.id,
    libelle: a.libelle,
    type: a.type,
    statut: statutUI,
    echeance: a.echeance,
    responsable: a.responsable,
    referentielMesureId: a.referentielMesureId,
  };
}

export async function getRisque(id: string) {
  const { db } = await requireCompte();
  const risque = await db.risque.findFirst({
    where: {
      id,
    },
    include: {
      unite: {
        include: {
          duerp: {
            include: { etablissement: { include: { entreprise: true } } },
          },
          risques: {
            orderBy: { libelle: "asc" },
            select: { id: true, libelle: true, cotationSaisie: true },
          },
        },
      },
      actions: true,
    },
  });
  if (!risque) return null;
  return {
    ...risque,
    mesures: risque.actions.map(actionVersMesure),
    unite: {
      ...risque.unite,
      duerp: {
        ...risque.unite.duerp,
        entreprise: risque.unite.duerp.etablissement.entreprise,
      },
    },
  };
}
