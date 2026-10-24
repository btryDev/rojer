"use client";

import { Check } from "lucide-react";
import { useOuvrirFiche } from "@/components/etats-permanents/RevueEnPlace";
import type { EtatCourt } from "@/components/etats-permanents/LigneCompacte";
import { Vignette } from "@/components/ui-kit/Vignette";

/**
 * Une formation à organiser pour l'établissement, sur la page Équipe
 * (2026-10-24, décision de la propriétaire : l'onglet Formations devient une
 * section sous les personnes). La ligne dit la formation, POURQUOI elle est
 * due ici plutôt que sur une fiche, et son état ; la toucher ouvre la même
 * fiche que « Ce qui doit être en place » (`RevueEnPlace`), où elle se
 * déclare.
 */
const MOT_ETAT: Record<EtatCourt, string> = {
  declare: "Déclarée organisée",
  titres: "D'après votre équipe",
  "titres-manquants": "À déclarer sur une fiche",
  "a-declarer": "À organiser",
};

export function LigneFormation({
  obligationId,
  ancre,
  libelle,
  pourquoi,
  etat,
  dessin,
}: {
  obligationId: string;
  ancre: string;
  libelle: string;
  /** Pourquoi elle est due ici, en une phrase. */
  pourquoi: string;
  etat: EtatCourt;
  dessin: { src: string; fond: string };
}) {
  const ouvrir = useOuvrirFiche();
  // Jamais « conforme » : une déclaration n'est pas une preuve (ADR-027).
  const enPlace = etat === "declare" || etat === "titres";
  return (
    <li id={ancre} className="list-none scroll-mt-24">
      <button
        type="button"
        onClick={() => ouvrir(obligationId)}
        aria-haspopup="dialog"
        // Sur un téléphone, l'état passe sous le texte : à droite, il
        // écrasait la colonne de texte à quelques mots par ligne.
        className="grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 rounded-[18px] bg-[color:var(--board-card)] px-3 py-3 text-left transition-shadow hover:shadow-[0_0_0_1.5px_var(--board-blue-soft)] sm:grid-cols-[44px_minmax(0,1fr)_auto] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-blue-strong)]"
      >
        <Vignette src={dessin.src} fond={dessin.fond} taille={44} />
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
            {libelle}
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            {pourquoi}
          </span>
        </span>
        <span
          className={
            "pastille-board col-start-2 justify-self-start sm:col-start-3 sm:justify-self-end " +
            (enPlace
              ? "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"
              : "bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]")
          }
        >
          {enPlace && <Check className="size-3" aria-hidden />}
          {MOT_ETAT[etat]}
        </span>
      </button>
    </li>
  );
}
