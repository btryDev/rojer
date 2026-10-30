import {
  CHAMP_ETAT,
  ENCRE_ETAT,
  libellePastille,
  type RegistreLigne,
} from "@/lib/calendrier/etats";

/**
 * L'état d'une ligne de calendrier en mots, sur son champ : « Sous 30 jours »,
 * « Au-delà de 30 jours », « Fait », « Aujourd'hui »… Une seule écriture pour
 * la liste par mois et la lecture par équipement (sortie de la page
 * Calendrier le 2026-10-29 : la seconde en recopiait le balisage).
 */
export function PastilleEtat({
  etat,
  duJour = false,
}: {
  etat: RegistreLigne;
  /** L'échéance tombe aujourd'hui : « Aujourd'hui » au lieu de « Sous 30
   *  jours » (`libellePastille`). */
  duJour?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full px-[13px] py-[6px] text-[12px] font-semibold"
      style={{ background: CHAMP_ETAT[etat], color: ENCRE_ETAT[etat] }}
    >
      {libellePastille(etat, duJour)}
    </span>
  );
}
