import type { MethodeSignature, PartieSignataire, StatutPropositionPlan } from "@prisma/client";
import { MOTIF_REVOCATION_ENVOI_ECHOUE, MOTIF_REVOCATION_NOUVEAU_LIEN } from "@/lib/access-tokens/revocation";
import { OTP_ESSAIS_MAX, OTP_TTL_MINUTES } from "@/lib/signatures/otp";
import { LIBELLE_METHODE_COURT } from "@/lib/signatures/methode";
import { SUITE_NOUVEAU_LIEN } from "@/lib/access-tokens/motif-lisible";
import { formaterJourMoisChiffresFr } from "@/lib/dates";

/**
 * Ce que la fiche du plan montre des signatures (2026-11-19, lot 3) : l'état
 * de chaque partie — signée, lien adressé, rien encore — et l'historique, lus
 * dans ce que Rojer garde déjà (`AccessToken`, `Signature`,
 * `PropositionModificationPlan`). Aucune table neuve, aucune écriture.
 *
 * Module pur : la page lit, ces fonctions composent. Les phrases sont pour le
 * dirigeant (« Vous refusez… ») ; la page du lien a les siennes
 * (`motifLisible`).
 */

export type LienLu = {
  id: string;
  partie: PartieSignataire | null;
  emailDestinataire: string;
  nomDestinataire: string | null;
  createdAt: Date;
  expireLe: Date;
  utiliseLe: Date | null;
  revoqueLe: Date | null;
  revoqueMotif: string | null;
  /** Fin de validité du dernier code demandé : non nul = le lien a été ouvert. */
  otpExpireLe: Date | null;
};

export type SignatureLue = {
  id: string;
  partie: PartieSignataire | null;
  signataireNom: string;
  horodatageIso: Date;
  methode: MethodeSignature;
  revoqueLe: Date | null;
  revoqueMotif: string | null;
};

export type PropositionLue = {
  id: string;
  accessTokenId: string;
  statut: StatutPropositionPlan;
  createdAt: Date;
  traiteeLe: Date | null;
  traiteeParEmail: string | null;
  corrigeeLe: Date | null;
};

export type EtatPartie =
  | { etat: "signee"; signature: SignatureLue }
  | { etat: "lien_envoye"; lien: LienLu; ouvert: boolean }
  | { etat: "lien_expire"; lien: LienLu }
  | { etat: "lien_revoque"; lien: LienLu }
  | { etat: "rien" };

/** Le dernier lien d'une partie, et ce qu'il en reste. Une signature en vigueur l'emporte. */
export function etatDeLaPartie(
  partie: PartieSignataire,
  signatureActive: SignatureLue | null,
  liens: readonly LienLu[],
  maintenant: Date,
): EtatPartie {
  if (signatureActive) return { etat: "signee", signature: signatureActive };
  const dernier = liens
    .filter((l) => l.partie === partie && !l.utiliseLe)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (!dernier) return { etat: "rien" };
  if (dernier.revoqueLe) return { etat: "lien_revoque", lien: dernier };
  if (dernier.expireLe.getTime() <= maintenant.getTime()) return { etat: "lien_expire", lien: dernier };
  return { etat: "lien_envoye", lien: dernier, ouvert: dernier.otpExpireLe !== null };
}

/**
 * La correction en cours (« Corriger », 2026-11-19) : appliquée, elle court
 * jusqu'à la signature du dirigeant. Lue par la fiche et par « Modifier »,
 * qui y ramène (2026-11-21).
 */
export function correctionEnCours<P extends { corrigeeLe: Date | null; finaliseeLe: Date | null }>(p: {
  planSignable: boolean;
  propositionEnAttente: boolean;
  euSignee: boolean;
  propositions: readonly P[];
}): P | undefined {
  if (!p.planSignable || p.propositionEnAttente || p.euSignee) return undefined;
  return p.propositions.find((x) => x.corrigeeLe && !x.finaliseeLe);
}

/**
 * Ce qui attend le dirigeant sur la fiche (2026-11-21) — UN calcul, lu par la
 * pastille de l'onglet « Suivi » et par les cartes d'action qu'il porte :
 * trancher la proposition, terminer la correction en signant, signer, ou
 * envoyer le lien de l'entreprise extérieure qui n'est pas encore parti.
 * Rien pour un membre en lecture seule, ni sur un plan clos ou annulé.
 */
export type AttenteDirigeant = "proposition" | "correction" | "signer" | "envoyer_lien";

export function ceQuiAttendLeDirigeant(p: {
  planSignable: boolean;
  lectureSeule: boolean;
  propositionEnAttente: boolean;
  correctionEnCours: boolean;
  eu: EtatPartie["etat"];
  ee: EtatPartie["etat"];
}): AttenteDirigeant | null {
  if (!p.planSignable || p.lectureSeule) return null;
  if (p.propositionEnAttente) return "proposition";
  if (p.eu !== "signee") return p.correctionEnCours ? "correction" : "signer";
  if (p.ee === "rien") return "envoyer_lien";
  return null;
}

/** Un lien parti, ou une signature en vigueur : ce qui fait sortir le plan du « Brouillon ». */
export function aUnLienOuUneSignature(liens: readonly LienLu[], signaturesActives: number): boolean {
  return signaturesActives > 0 || liens.some((l) => l.revoqueMotif !== MOTIF_REVOCATION_ENVOI_ECHOUE);
}

/**
 * Le motif d'une révocation de lien, pour le dirigeant. La suite « demandez
 * un nouveau lien à votre interlocuteur », que `retirerSignaturesDuPlan`
 * écrit pour le porteur du lien, est retirée (2026-11-21, retour de test) :
 * le panneau dit lui-même ce qui suit pour le dirigeant.
 */
export function motifLienPourLaFiche(motif: string | null): string {
  const brut = motif?.replace(SUITE_NOUVEAU_LIEN, "").trim() ?? "";
  if (!brut) return "révoqué";
  if (brut === MOTIF_REVOCATION_NOUVEAU_LIEN) return "remplacé par un lien plus récent";
  if (brut === MOTIF_REVOCATION_ENVOI_ECHOUE) return "l'e-mail n'est pas parti";
  if (brut.startsWith("OTP épuisé")) return `les ${OTP_ESSAIS_MAX} essais de code sont épuisés`;
  return brut.charAt(0).toLowerCase() + brut.slice(1);
}

export type TonHistorique = "fait" | "proche" | "bleu" | "neutre" | "retard";

export type EvenementHistorique = {
  cle: string;
  date: Date;
  ligne: string;
  sousLigne?: string;
  pastille: { mot: string; ton: TonHistorique };
  /** Les signatures qu'on peut vérifier depuis cette ligne. */
  /** Les signatures à vérifier dans l'application (`VerifierSignature`, 2026-11-21). */
  verifier?: { libelle: string; signatureId: string }[];
};

const jour = formaterJourMoisChiffresFr;

/**
 * L'historique du plan, du plus récent au plus ancien. `raisonEE` nomme
 * l'entreprise extérieure ; une partie absente (signature d'avant le
 * 2026-10-12) se dit « — ».
 */
export function historiqueDuPlan(p: {
  creeLe: Date | null;
  raisonEE: string;
  liens: readonly LienLu[];
  signatures: readonly SignatureLue[];
  propositions: readonly PropositionLue[];
  maintenant: Date;
}): EvenementHistorique[] {
  const qui = (partie: PartieSignataire | null, nom: string | null) =>
    partie === "entreprise_exterieure"
      ? p.raisonEE
      : partie === "entreprise_utilisatrice"
        ? `${nom ?? "un collègue"} (entreprise utilisatrice)`
        : "—";
  // ~~Le plan ne garde pas sa date de création (aucune colonne)~~ [2026-11-21 :
  // faux, `PlanPrevention.createdAt` existe et la fiche le passe]. Sans date,
  // pas de ligne « Plan créé » plutôt qu'une date inventée.
  const e: EvenementHistorique[] = p.creeLe
    ? [{ cle: "creation", date: p.creeLe, ligne: "Plan créé", pastille: { mot: "Création", ton: "neutre" } }]
    : [];

  for (const l of p.liens) {
    const echoue = l.revoqueMotif === MOTIF_REVOCATION_ENVOI_ECHOUE;
    e.push({
      cle: `lien-${l.id}`,
      date: l.createdAt,
      ligne: echoue ? `Envoi du lien à ${qui(l.partie, l.nomDestinataire)} échoué` : `Lien adressé à ${qui(l.partie, l.nomDestinataire)}`,
      sousLigne: [l.nomDestinataire, l.emailDestinataire, echoue ? null : `expire le ${jour(l.expireLe)}`]
        .filter(Boolean)
        .join(" · "),
      pastille: { mot: echoue ? "Échec" : "Lien", ton: echoue ? "neutre" : "bleu" },
    });
    // La date du DERNIER code demandé se déduit de son expiration : c'est
    // ce que Rojer sait de l'ouverture.
    if (l.otpExpireLe) {
      e.push({
        cle: `code-${l.id}`,
        date: new Date(l.otpExpireLe.getTime() - OTP_TTL_MINUTES * 60_000),
        ligne: `${l.nomDestinataire ?? l.emailDestinataire} ouvre le lien et demande un code`,
        sousLigne: "Dernier code demandé sur ce lien",
        pastille: { mot: "Ouvert", ton: "bleu" },
      });
    }
    if (l.revoqueLe && !echoue) {
      e.push({
        cle: `revocation-${l.id}`,
        date: l.revoqueLe,
        ligne: `Lien adressé à ${qui(l.partie, l.nomDestinataire)} révoqué`,
        sousLigne: motifLienPourLaFiche(l.revoqueMotif),
        pastille: { mot: "Révoqué", ton: "neutre" },
      });
    } else if (!l.revoqueLe && !l.utiliseLe && l.expireLe.getTime() <= p.maintenant.getTime()) {
      e.push({
        cle: `expiration-${l.id}`,
        date: l.expireLe,
        ligne: `Lien adressé à ${qui(l.partie, l.nomDestinataire)} expiré`,
        sousLigne: "Sans signature",
        pastille: { mot: "Expiré", ton: "neutre" },
      });
    }
  }

  for (const s of p.signatures) {
    e.push({
      cle: `signature-${s.id}`,
      date: s.horodatageIso,
      ligne: `${s.signataireNom} signe pour ${s.partie === "entreprise_exterieure" ? p.raisonEE : s.partie === "entreprise_utilisatrice" ? "l'entreprise utilisatrice" : "—"}`,
      sousLigne: LIBELLE_METHODE_COURT[s.methode],
      pastille: { mot: "Signée", ton: "fait" },
      verifier: [{ libelle: "Vérifier", signatureId: s.id }],
    });
  }
  // Les signatures révoquées d'un même geste se lisent sur une ligne.
  const revocations = new Map<string, SignatureLue[]>();
  for (const s of p.signatures) {
    if (!s.revoqueLe) continue;
    const cle = `${s.revoqueLe.getTime()}|${s.revoqueMotif ?? ""}`;
    revocations.set(cle, [...(revocations.get(cle) ?? []), s]);
  }
  for (const [cle, groupe] of revocations) {
    const n = groupe.length;
    e.push({
      cle: `revocation-signatures-${cle}`,
      date: groupe[0].revoqueLe!,
      ligne: `${n} signature${n > 1 ? "s" : ""} révoquée${n > 1 ? "s" : ""}${groupe[0].revoqueMotif ? ` : ${groupe[0].revoqueMotif}` : ""}`,
      sousLigne: `${n > 1 ? "Gardées et vérifiables" : "Gardée et vérifiable"} · ${groupe.map((s) => s.signataireNom).join(", ")}`,
      pastille: { mot: n > 1 ? "Révoquées" : "Révoquée", ton: "neutre" },
      verifier: groupe.map((s) => ({ libelle: `Vérifier (${s.signataireNom})`, signatureId: s.id })),
    });
  }

  const liensParId = new Map(p.liens.map((l) => [l.id, l]));
  for (const pr of p.propositions) {
    const lien = liensParId.get(pr.accessTokenId);
    const auteur = lien?.nomDestinataire ?? lien?.emailDestinataire ?? p.raisonEE;
    e.push({
      cle: `proposition-${pr.id}`,
      date: pr.createdAt,
      ligne: `${auteur} propose des modifications`,
      sousLigne: `${p.raisonEE}, depuis son lien`,
      pastille: { mot: "Proposition", ton: "proche" },
    });
    if (!pr.traiteeLe) continue;
    const decision =
      pr.statut === "acceptee"
        ? pr.corrigeeLe
          ? { ligne: `Vous acceptez la proposition de ${p.raisonEE} et la corrigez`, mot: "Corrigée", ton: "fait" as const }
          : { ligne: `Vous acceptez la proposition de ${p.raisonEE}`, mot: "Acceptée", ton: "fait" as const }
        : pr.traiteeParEmail
          ? { ligne: `Vous refusez la proposition de ${p.raisonEE}`, mot: "Refusée", ton: "retard" as const }
          : { ligne: "Proposition refusée d'office : le plan a été clos ou annulé", mot: "Refusée", ton: "retard" as const };
    e.push({
      cle: `decision-${pr.id}`,
      date: pr.traiteeLe,
      ligne: decision.ligne,
      sousLigne: pr.traiteeParEmail ?? "—",
      pastille: { mot: decision.mot, ton: decision.ton },
    });
  }

  return e.sort((a, b) => b.date.getTime() - a.date.getTime());
}
