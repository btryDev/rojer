import { OTP_ESSAIS_MAX } from "@/lib/signatures/otp";
import { MOTIF_REVOCATION_ENVOI_ECHOUE, MOTIF_REVOCATION_NOUVEAU_LIEN } from "./revocation";

/**
 * Le motif de révocation d'un lien, dit au porteur du lien en une phrase
 * (2026-11-19, cahier de reprise § 3.4). Les motifs sont écrits en base par
 * plusieurs chemins, certains bruts (« OTP épuisé (3 essais) ») ; la page du
 * lien et la signature les traduisent ici, et nulle part ailleurs.
 *
 * Module pur : aucune lecture, aucun effet. Le motif en base ne change pas —
 * la trace reste ce qu'elle était.
 *
 * La suite « demandez un nouveau lien à votre interlocuteur » est retirée :
 * la page dit elle-même qui contacter, avec son nom.
 */

/** Ce que les motifs écrits par `revoquerOtpEpuise` commencent par. */
const PREFIXE_OTP_EPUISE = "OTP épuisé";
/** La suite écrite pour le porteur du lien ; la fiche du plan la retire aussi (`motifLienPourLaFiche`). */
export const SUITE_NOUVEAU_LIEN = /\s*;\s*demandez un nouveau lien à votre interlocuteur\s*$/i;

/** Les révocations du cycle de vie d'un acte (`plan-prevention/actions.ts`, `permis-feu/actions.ts`). */
const CYCLE_DE_VIE = /^(Plan de prévention|Permis de feu) (clos|terminé|supprimé|annulé)$/;

export function motifLisible(motif: string | null | undefined): string | null {
  const brut = motif?.trim();
  if (!brut) return null;
  if (brut.startsWith(PREFIXE_OTP_EPUISE)) {
    return `Les ${OTP_ESSAIS_MAX} essais de code de ce lien sont épuisés.`;
  }
  if (brut === MOTIF_REVOCATION_NOUVEAU_LIEN) {
    return "Un lien plus récent remplace celui-ci : ouvrez le dernier que vous avez eu.";
  }
  if (brut === MOTIF_REVOCATION_ENVOI_ECHOUE) {
    return "L'envoi de ce lien a échoué.";
  }
  const cycle = CYCLE_DE_VIE.exec(brut);
  if (cycle) {
    const [, objet, etat] = cycle;
    const accord = objet === "Permis de feu" ? "Le permis de feu" : "Le plan de prévention";
    return `${accord} a été ${etat}.`;
  }
  const phrase = brut.replace(SUITE_NOUVEAU_LIEN, "").trim();
  if (!phrase) return null;
  const majuscule = phrase.charAt(0).toUpperCase() + phrase.slice(1);
  return /[.!?…]$/.test(majuscule) ? majuscule : `${majuscule}.`;
}
