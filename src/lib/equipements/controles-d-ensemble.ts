import "server-only";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { obligationParId } from "@/lib/referentiels/conformite";
import { aUnRendezVous, classerVerification, type RegistreLigne } from "@/lib/calendrier/etats";
import { joindreDernieresRealisations } from "@/lib/rapports/joindre-realisations";
import { STATUTS_ACTION_OUVERTE } from "@/lib/dates/retard";
import { DOMAINE_DE_CATEGORIE } from "./domaines";

/** Un contrôle d'ensemble tel que la page Équipements le montre. */
export type ControleDEnsemble = {
  id: string;
  libelle: string;
  datePrevue: Date;
  etat: RegistreLigne;
  /** Faux : aucune échéance connue (aucun rapport) — la date n'en est pas une. */
  echeanceConnue: boolean;
  pointsOuverts: number;
  /** Son domaine propre, celui sous lequel il se range en tête. */
  domaine: DomaineObligation;
  /** Les autres domaines qu'il couvre (« Aussi couvert par »). */
  aussi: DomaineObligation[];
};

/**
 * Les contrôles d'ensemble de l'établissement (ligne portée par
 * l'établissement, `equipementsEnContexte` non vide), chacun avec les
 * domaines d'appareils qu'il couvre (points à corriger, lot 2 — ADR-048).
 * Un contrôle se range sous SON domaine ; dans les autres domaines qu'il
 * couvre, il s'annonce « Aussi couvert par », compté une seule fois.
 */
export async function controlesDEnsemble(etablissementId: string, maintenant: Date): Promise<ControleDEnsemble[]> {
  const user = await requireUser();
  const lignes = await prisma.verification.findMany({
    where: {
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
      equipementId: null,
      salarieId: null,
      archiveLe: null,
    },
    select: {
      id: true,
      obligationId: true,
      libelleObligation: true,
      statut: true,
      datePrevue: true,
      periodicite: true,
      archiveLe: true,
      graceJusquAu: true,
      suiviDepuis: true,
      _count: { select: { actions: { where: { statut: { in: [...STATUTS_ACTION_OUVERTE] as never } } } } },
    },
    orderBy: { libelleObligation: "asc" },
  });
  const datees = await joindreDernieresRealisations(etablissementId, lignes);
  const out: ControleDEnsemble[] = [];
  for (const v of datees) {
    const o = obligationParId(v.obligationId);
    // Les catégories que la ligne vise (`equipementsEnContexte`) ou qui la
    // font naître (`siEquipementDeclare`).
    const categories =
      o && !("categoriesEquipement" in o && o.categoriesEquipement)
        ? [...(o.equipementsEnContexte ?? []), ...(o.siEquipementDeclare ?? [])]
        : [];
    if (!o || categories.length === 0) continue;
    const etat = classerVerification(v, maintenant);
    // Un contrôle est un rendez-vous : un état permanent, sans rendez-vous,
    // se tient sur « Ce qui doit être en place », pas ici.
    if (etat === "sansRendezVous") continue;
    const couverts = new Set(
      categories.map((c) => DOMAINE_DE_CATEGORIE[c]).filter((d): d is DomaineObligation => d !== null),
    );
    couverts.delete(o.domaine);
    out.push({
      id: v.id,
      libelle: v.libelleObligation,
      datePrevue: v.datePrevue,
      etat,
      echeanceConnue: aUnRendezVous(v, maintenant),
      pointsOuverts: v._count.actions,
      domaine: o.domaine,
      aussi: [...couverts],
    });
  }
  return out;
}
