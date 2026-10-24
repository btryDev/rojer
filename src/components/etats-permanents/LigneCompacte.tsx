"use client";

// Une ligne de « Ce qui doit être en place », en vignette (2026-10-20) : le
// dessin, le libellé, l'état court. Un clic ouvre la fiche commune de la page
// (`RevueEnPlace`), qui porte la question, les réponses et le texte qui fonde
// la ligne. La vignette ne déclare rien et ne connaît aucune règle : son état
// lui est donné par la page, lu sur la même `LigneEtatPermanent` que la fiche.
// Elle porte l'ancre de la ligne (`ancreEtatPermanent`) — une seule fois sur
// la page, la fiche n'en pose aucune.

import Image from "next/image";
import { Check } from "lucide-react";
import { useOuvrirFiche } from "./RevueEnPlace";

export type EtatCourt = "declare" | "titres" | "titres-manquants" | "a-declarer";

/** Le mot sous le libellé. Jamais « conforme » : une déclaration n'est pas une preuve. */
const MOT_ETAT: Record<EtatCourt, string> = {
  declare: "Déclaré",
  titres: "D'après votre équipe",
  "titres-manquants": "À déclarer sur une fiche",
  "a-declarer": "À déclarer",
};

export function LigneCompacte({
  obligationId,
  ancre,
  libelle,
  illustration,
  fond,
  etat,
  aConfirmer,
}: {
  obligationId: string;
  ancre: string;
  libelle: string;
  illustration: string;
  /** Le fond de la teinte de famille (`FOND_TEINTE`). */
  fond: string;
  etat: EtatCourt;
  aConfirmer: boolean;
}) {
  const ouvrir = useOuvrirFiche();
  const enPlace = etat === "declare" || etat === "titres";
  return (
    <li id={ancre} className="list-none scroll-mt-24">
      <button
        type="button"
        onClick={() => ouvrir(obligationId)}
        aria-haspopup="dialog"
        className={
          "flex w-full items-center gap-2.5 rounded-[14px] border-[1.5px] py-1.5 pl-1.5 pr-3 text-left transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-blue-strong)] " +
          (enPlace
            ? "border-solid border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)]"
            : "border-dashed border-[color:var(--board-blue-soft)] bg-[color:var(--board-card)]")
        }
      >
        <span
          className="grid size-[34px] flex-none place-items-center overflow-hidden rounded-[9px]"
          style={{ background: fond }}
        >
          <Image
            src={illustration}
            alt=""
            width={34}
            height={34}
            className={enPlace ? "opacity-45 grayscale" : undefined}
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={
              "line-clamp-2 text-[12.5px] leading-[1.3] " +
              (enPlace
                ? "text-[color:var(--board-slate-mid)]"
                : "font-medium text-[color:var(--board-ink)]")
            }
          >
            {libelle}
          </span>
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[color:var(--board-slate-soft)]">
            {enPlace && <Check className="size-3" aria-hidden />}
            {MOT_ETAT[etat]}
            {aConfirmer && " · à confirmer"}
          </span>
        </span>
      </button>
    </li>
  );
}
