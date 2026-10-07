import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { cleJourCivil } from "@/lib/dates";
import { compterLignesAvecPreuve } from "./preuves";
import { chargerLignesVisees } from "./lecture-preuves";
import {
  appliquerPrescriptions,
  determineObligationsApplicables,
  estPrescriptionLevee,
  type PrescriptionMatching,
} from "@/lib/matching";
import { obligationParId, OBLIGATIONS_RETIREES } from "@/lib/referentiels/conformite";
import { libelleObligationRetiree } from "@/lib/matching/obligation-retiree";
import { derniersLibellesConnus } from "./libelles-retires";

export type EtatPrescription =
  | { etat: "active"; detail: string }
  | { etat: "levee"; detail: string }
  | { etat: "ignoree"; detail: string };

export type PrescriptionListee = PrescriptionMatching & {
  actif: boolean;
  etat: EtatPrescription;
  /** Libellé lisible de l'obligation ciblée (effet renforce_periodicite). */
  libelleObligationCiblee: string | null;
  /**
   * Nombre de lignes de calendrier visées par cette prescription qui portent
   * une preuve faite sous l'acte (`prescriptions/preuves.ts`).
   *
   * Au-delà de zéro, la suppression physique est refusée : `ON DELETE SET
   * NULL` laisserait des lignes orphelines dont plus rien ne dirait de quel
   * acte elles venaient, alors que la preuve, elle, resterait. C'est la levée
   * qui sert dans ce cas — elle arrête l'effet et garde l'historique
   * (ADR-012, ADR-035).
   */
  lignesAvecPreuve: number;
};

export type DonneesPagePrescriptions = {
  prescriptions: PrescriptionListee[];
  /** Obligations du référentiel applicables ici — les seules qu'une
   *  prescription `renforce_periodicite` peut cibler. */
  obligations: { id: string; libelle: string; periodicite: string }[];
  equipements: { id: string; libelle: string; categorie: string }[];
};

/**
 * Tout ce que la page « Prescriptions » affiche, en **une** lecture et **une**
 * passe de matching : la liste des prescriptions avec leur état calculé, les
 * obligations ciblables et les équipements déclarés.
 *
 * L'état de chaque prescription — active / levée / ignorée (raison) — n'est
 * jamais persisté : il est rejoué à l'affichage par la même fonction pure que
 * le générateur, donc même entrée, même sortie (ADR-035).
 *
 * Les deux moitiés partagent délibérément la même lecture : séparées, elles
 * relisaient l'établissement et ses équipements deux fois et faisaient tourner
 * le moteur de matching deux fois par rendu, pour un résultat identique.
 */
export async function chargerPagePrescriptions(
  etablissementId: string,
  now: Date = new Date(),
): Promise<DonneesPagePrescriptions> {
  // `findFirst` scopé, et non `findUnique` sur l'id seul (ADR-005). Cette
  // lecture rend tout le parc en service et toutes les prescriptions
  // particulières du dossier ; sans RLS pour la rattraper, un identifiant
  // venu de l'URL suffisait à ouvrir celui d'un autre compte. `null` en
  // sortie se lit « pas votre dossier » exactement comme « dossier vide » —
  // la page rend une liste vide dans les deux cas, ce qui est le
  // comportement voulu : on ne dit pas à un visiteur que l'identifiant
  // existe.
  const user = await requireUser();
  const etab = await prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    include: {
      equipements: { where: { actif: true } },
      prescriptionsParticulieres: {
        orderBy: { dateDocument: "desc" },
      },
      entreprise: { select: { effectif: true } },
    },
  });
  if (!etab) return { prescriptions: [], obligations: [], equipements: [] };

  // Le compte affiché dit ce que la suppression protégera : la même règle
  // (`prescriptions/preuves.ts`), la même lecture. Une requête par
  // prescription, sur ses seules lignes visées — un dossier en porte peu.
  // L'ancien `_count` par `prescriptionId` suivait l'effet, pas l'histoire
  // (2026-09-15).
  //
  // Une prescription peut viser une obligation que Rojer ne suit plus
  // (`OBLIGATIONS_RETIREES`) : la page affichait son id brut. Le dernier
  // libellé connu se lit en même temps que les preuves, dont il ne dépend pas
  // (2026-10-07, C62).
  const retireesVisees = [
    ...new Set(
      etab.prescriptionsParticulieres.flatMap((p) =>
        p.obligationId && OBLIGATIONS_RETIREES[p.obligationId] ? [p.obligationId] : [],
      ),
    ),
  ];
  const [comptesPreuves, derniersLibelles] = await Promise.all([
    Promise.all(
      etab.prescriptionsParticulieres.map(
        async (p) =>
          [
            p.id,
            compterLignesAvecPreuve(p, await chargerLignesVisees(etab.id, p)),
          ] as const,
      ),
    ),
    derniersLibellesConnus(etab.id, retireesVisees),
  ]);
  const preuves = new Map<string, number>(comptesPreuves);

  const equipements = etab.equipements.map((eq) => ({
    id: eq.id,
    libelle: eq.libelle,
    categorie: eq.categorie,
    caracteristiques: (eq.caracteristiques ?? null) as Record<
      string,
      unknown
    > | null,
  }));
  const applicables = determineObligationsApplicables(
    {
      id: etab.id,
      effectifSurSite: etab.effectifSurSite,
      effectifEntreprise: etab.entreprise.effectif,
      estEtablissementTravail: etab.estEtablissementTravail,
      estERP: etab.estERP,
      estIGH: etab.estIGH,
      estHabitation: etab.estHabitation,
      typeErp: etab.typeErp,
      categorieErp: etab.categorieErp,
      classeIgh: etab.classeIgh,
      familleHabitation: etab.familleHabitation,
      personnesPresentesHabituellement: etab.personnesPresentesHabituellement,
      manipuleMatieresR422722: etab.manipuleMatieresR422722,
      comporteLocauxSommeilPublic: etab.comporteLocauxSommeilPublic,
      chiffonsImpregnes: etab.chiffonsImpregnes,
    },
    equipements,
  );
  const actives = etab.prescriptionsParticulieres.filter((p) => p.actif);
  const res = appliquerPrescriptions(applicables, actives, equipements, now);
  const ignorees = new Map(
    res.ignorees.map((i) => [i.prescription.id, i.raison]),
  );
  const prescriptions = etab.prescriptionsParticulieres.map((p) => {
    let etat: EtatPrescription;
    const raison = ignorees.get(p.id);
    if (!p.actif) {
      etat = { etat: "levee", detail: "Désactivée." };
    } else if (estPrescriptionLevee(p, now)) {
      // Fin d'effet datée et atteinte : « levée », pas « ignorée ». Le
      // prédicat est celui du moteur, pas une reconnaissance de message.
      etat = {
        etat: "levee",
        detail:
          raison ??
          `Prescription levée le ${p.dateFin ? cleJourCivil(p.dateFin) : "?"}.`,
      };
    } else if (raison) {
      etat = { etat: "ignoree", detail: raison };
    } else {
      etat = {
        etat: "active",
        detail:
          p.effet === "renforce_periodicite"
            ? `Périodicité portée à « ${p.periodicite} ».`
            : `Obligation propre à votre établissement, ${p.periodicite}.`,
      };
    }
    return {
      ...p,
      etat,
      lignesAvecPreuve: preuves.get(p.id) ?? 0,
      libelleObligationCiblee: p.obligationId
        ? (obligationParId(p.obligationId)?.libelle ??
          libelleObligationRetiree(p.obligationId, derniersLibelles.get(p.obligationId)))
        : null,
    };
  });

  return {
    prescriptions,
    obligations: applicables.map((a) => ({
      id: a.obligation.id,
      libelle: a.obligation.libelle,
      periodicite: periodiciteEffective(a.obligation),
    })),
    equipements: etab.equipements.map((e) => ({
      id: e.id,
      libelle: e.libelle,
      categorie: e.categorie,
    })),
  };
}
