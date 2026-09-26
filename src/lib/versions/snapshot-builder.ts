import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import type {
  DuerpSnapshot,
  MesureSnapshot,
  UniteSnapshot,
} from "./snapshot";
import { questionsActivites } from "@/lib/activites/reponses";
import { figerCouverture } from "@/lib/activites/snapshot";
import type { TypeMesure } from "@/lib/referentiels/types";

/**
 * Construit un snapshot DUERP à partir de l'état courant en base.
 * Partagé entre la validation de version et l'aperçu brouillon du PDF.
 * Ne persiste rien — la persistance reste à la charge de l'appelant.
 *
 * **Scoping (ADR-005).** La lecture est bornée au user connecté :
 * `Duerp → Etablissement → Entreprise → userId`. C'est indispensable ici et
 * pas seulement chez l'appelant, parce que le snapshot embarque l'intégralité
 * du document — raison sociale, SIRET, adresse, unités de travail, risques,
 * cotations et mesures. Sans ce filtre, l'aperçu PDF rendait le DUERP d'un
 * autre utilisateur à qui connaissait un identifiant. Un DUERP hors périmètre
 * est indistinguable d'un DUERP inexistant : les deux renvoient `null`.
 *
 * Le format `mesures: [...]` est conservé dans le snapshot malgré le passage
 * à `Action` en base (ADR-002) : les snapshots sont des documents versionnés
 * à valeur légale, consommés tels quels par le moteur PDF. La conversion
 * Action → MesureSnapshot est triviale et documentée dans le code ci-dessous.
 */
export async function construireSnapshot(
  duerpId: string,
  options: { numero: number; motif: string | null },
): Promise<DuerpSnapshot | null> {
  const user = await requireUser();
  const duerp = await prisma.duerp.findFirst({
    where: {
      id: duerpId,
      etablissement: { entreprise: { userId: user.id } },
    },
    include: {
      etablissement: { include: { entreprise: true } },
      unites: {
        orderBy: { nom: "asc" },
        include: {
          risques: {
            orderBy: { libelle: "asc" },
            include: { actions: true },
          },
        },
      },
    },
  });
  if (!duerp) return null;

  const unitesSnap: UniteSnapshot[] = duerp.unites.map((u) => ({
    id: u.id,
    nom: u.nom,
    description: u.description,
    estTransverse: u.estTransverse,
    referentielUniteId: u.referentielUniteId,
    aucunRisqueJustif: u.aucunRisqueJustif,
    risques: u.risques.map((r) => ({
      id: r.id,
      referentielId: r.referentielId,
      libelle: r.libelle,
      description: r.description,
      gravite: r.gravite,
      probabilite: r.probabilite,
      maitrise: r.maitrise,
      criticite: r.criticite,
      cotationSaisie: r.cotationSaisie,
      nombreSalariesExposes: r.nombreSalariesExposes,
      dateMesuresPhysiques: r.dateMesuresPhysiques
        ? r.dateMesuresPhysiques.toISOString()
        : null,
      exposeCMR: r.exposeCMR,
      mesures: r.actions.map<MesureSnapshot>((a) => ({
        id: a.id,
        libelle: a.libelle,
        type: a.type as TypeMesure,
        // Action.statut (ouverte|en_cours|levee|abandonnee) → MesureSnapshot.statut (existante|prevue).
        // "levee" = mesure déjà en place = "existante" ; sinon "prevue".
        statut: a.statut === "levee" ? "existante" : "prevue",
        echeance: a.echeance ? a.echeance.toISOString() : null,
        responsable: a.responsable,
      })),
    })),
  }));

  const etab = duerp.etablissement;
  const ent = etab.entreprise;

  // Couverture du référentiel (ADR-020) : le référentiel sectoriel est
  // interrogé **ici et maintenant**, au moment de figer, et le résultat est
  // recopié dans le snapshot. Après quoi le document n'en dépend plus — il
  // sera régénéré à l'identique quand la liste des activités aura changé,
  // voire quand le secteur aura disparu du référentiel.
  const couverture = figerCouverture(
    duerp.referentielSecteurId,
    questionsActivites(
      duerp.referentielSecteurId,
      duerp.reponsesActivitesNonCouvertes,
    ),
  );

  return {
    version: options.numero,
    genereLe: new Date().toISOString(),
    motif: options.motif,
    referentielSecteurId: duerp.referentielSecteurId,
    entreprise: {
      raisonSociale: ent.raisonSociale,
      siret: ent.siret,
      codeNaf: etab.codeNaf ?? ent.codeNaf,
      effectif: etab.effectifSurSite,
      effectifEntreprise: ent.effectif,
      adresse: etab.adresse,
    },
    unites: unitesSnap,
    couverture,
  };
}
