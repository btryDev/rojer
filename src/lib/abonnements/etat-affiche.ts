// Ce que la vue d'ensemble de l'abonnement montre en tête (2026-11-17) : le
// nom de la formule, une pastille d'état, une phrase, et la frise de la
// période avec aujourd'hui dessus. Décidé ici, en un seul endroit, à partir
// de la seule copie locale de l'abonnement — aucune lecture chez Stripe.
// Fonction pure, testée phase par phase (`etat-affiche.test.ts`).

import { ajouterAns, ajouterMois, formaterDateLongueFr, joursCivilsEntre } from "@/lib/dates";
import type { RegistreLigne } from "@/lib/calendrier/etats";
import { pluriel } from "@/lib/rendu/pluriel";
import { A_REGLER, essaiProche, finPrevueDe, libelleStatut, phaseDuCompte, resiliationPrevue, type LigneAbonnement } from "./droits";
import { DUREE_ESSAI_JOURS, FORMULE_D_ESSAI, FORMULES, LIBELLE_PERIODICITE, formuleDeLookupKey } from "./formules";

/** Les états du calendrier que l'abonnement emprunte, pour leurs couleurs (`CHAMP_ETAT`, `ENCRE_ETAT`). */
export type EtatAbonnement = Extract<RegistreLigne, "enRetard" | "proche" | "lointain" | "faite" | "aPlanifier">;

export type FriseAffichee = {
  debut: Date;
  fin: Date;
  libelleDebut: string;
  libelleFin: string;
  etat: EtatAbonnement;
};

export type EtatAffiche = {
  titre: string;
  detail: string;
  pastille: { libelle: string; etat: EtatAbonnement };
  frise: FriseAffichee | null;
  /** La suppression des données, déjà due : la frise ne la dessine pas, la page le dit. */
  suppressionImminente: boolean;
};

export type LigneAffichee = LigneAbonnement & {
  formule: string | null;
  essaiUtiliseLe: Date | null;
  sansAbonnementDepuis: Date | null;
  suppressionPrevueLe: Date | null;
};

const SANS_ABONNEMENT = "Sans abonnement";

/**
 * `suppressionLe` : la date de suppression du compte sans abonnement
 * (`dateDeSuppressionPrevue`, `suppression.ts`), calculée par la page dès que
 * la ligne porte `sansAbonnementDepuis` — ce module décide si elle menace, et
 * reste pur.
 */
export function etatAffiche(ligne: LigneAffichee | null, maintenant: Date, suppressionLe: Date | null): EtatAffiche {
  const phase = phaseDuCompte(ligne, maintenant);
  const libelle = libelleStatut(ligne, maintenant);
  const f = formuleDeLookupKey(ligne?.formule);
  const nomFormule = f ? FORMULES[f.formule].libelle : "Abonnement";
  const facturation = f ? `Facturation ${LIBELLE_PERIODICITE[f.periodicite].adjectif}` : "";

  switch (phase.type) {
    case "essai": {
      const proche = essaiProche(phase.fin, maintenant);
      const etat = proche ? "proche" : "lointain";
      // Le reste de l'essai se dit dans la pastille (retour de test du
      // 2026-11-17 : « on ne voit pas qu'on est dans la période d'essai »).
      // En jours civils, comme la date de la phrase (`joursCivilsEntre`).
      const jours = Math.max(1, joursCivilsEntre(maintenant, phase.fin));
      return {
        titre: FORMULES[FORMULE_D_ESSAI].libelle,
        detail: `Essai gratuit de la formule ${FORMULES[FORMULE_D_ESSAI].libelle} jusqu'au ${formaterDateLongueFr(phase.fin)}, sans carte bancaire`,
        pastille: { libelle: `Essai en cours, ${pluriel(jours, "jour restant", "jours restants")}`, etat },
        frise: ligne?.essaiUtiliseLe
          ? { debut: ligne.essaiUtiliseLe, fin: phase.fin, libelleDebut: "Début de l'essai", libelleFin: "Fin de l'essai", etat }
          : null,
        suppressionImminente: false,
      };
    }
    case "abonne": {
      const aRegler = A_REGLER.has(phase.statut);
      const finPrevue = !!ligne && resiliationPrevue(ligne);
      const etat = aRegler ? "enRetard" : finPrevue ? "proche" : "faite";
      return {
        titre: nomFormule,
        detail: facturation,
        pastille: { libelle, etat },
        frise: periodeEnCours(ligne!, f?.periodicite, aRegler, finPrevue),
        suppressionImminente: false,
      };
    }
    case "sans-essai":
      return {
        titre: SANS_ABONNEMENT,
        detail: `Démarrez votre essai gratuit de ${DUREE_ESSAI_JOURS} jours, sans carte bancaire.`,
        pastille: { libelle, etat: "aPlanifier" },
        frise: null,
        suppressionImminente: false,
      };
    case "facture-en-attente":
    case "essai-termine":
    case "abonnement-termine": {
      const titre = phase.type === "facture-en-attente" ? nomFormule : SANS_ABONNEMENT;
      const detail =
        phase.type === "facture-en-attente"
          ? "Un paiement attend d'être réglé."
          : phase.type === "essai-termine"
            ? "Votre essai gratuit est terminé."
            : "Votre abonnement a pris fin.";
      // La suppression ne menace que ces phases : une date restée sur la ligne
      // d'un abonné ou d'un essai (notification en retard) ne se dit pas.
      const imminente = !!ligne?.sansAbonnementDepuis && !!suppressionLe && suppressionLe.getTime() <= maintenant.getTime();
      return {
        titre,
        detail,
        pastille: { libelle, etat: "enRetard" },
        frise: avantSuppression(ligne, phase.type, suppressionLe, maintenant),
        suppressionImminente: imminente,
      };
    }
  }
}

/**
 * La période payée en cours. Seule sa fin est recopiée de Stripe
 * (`finPeriode`) : son début s'en déduit par le rythme de la formule — un
 * changement de rythme fait repartir la période chez Stripe, la déduction
 * reste juste.
 */
function periodeEnCours(
  ligne: LigneAffichee,
  periodicite: "mensuel" | "annuel" | undefined,
  aRegler: boolean,
  finPrevue: boolean,
): FriseAffichee | null {
  if (!ligne.finPeriode || !periodicite) return null;
  const debut = periodicite === "annuel" ? ajouterAns(ligne.finPeriode, -1) : ajouterMois(ligne.finPeriode, -1);
  return {
    debut,
    fin: finPrevueDe(ligne) ?? ligne.finPeriode,
    libelleDebut: "Début de la période",
    libelleFin: aRegler ? "Fin de la période" : finPrevue ? "Fin de l'abonnement" : "Prochain prélèvement",
    etat: aRegler ? "enRetard" : finPrevue ? "proche" : "lointain",
  };
}

/**
 * Sans abonnement depuis une date, le compte est supprimé douze mois après,
 * sauf abonnement d'ici là (ADR-058). Une date déjà passée ne se dessine
 * pas — la suppression est imminente, la phrase de la page le dit.
 */
function avantSuppression(
  ligne: LigneAffichee | null,
  type: "facture-en-attente" | "essai-termine" | "abonnement-termine",
  fin: Date | null,
  maintenant: Date,
): FriseAffichee | null {
  if (!ligne?.sansAbonnementDepuis || !fin || fin.getTime() <= maintenant.getTime()) return null;
  return {
    debut: ligne.sansAbonnementDepuis,
    fin,
    libelleDebut: type === "essai-termine" ? "Fin de l'essai" : "Sans abonnement depuis",
    libelleFin: "Suppression des données, sauf abonnement",
    etat: "enRetard",
  };
}
