import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Les deux formes de « ce qui attend le dirigeant » sur la fiche du plan
 * (2026-11-21, maquette V3) — une seule teinte, l'ambre du board :
 * - `CarteActionRequise`, en tête de l'onglet « Suivi » : la proposition à
 *   trancher, la signature à poser, le lien à envoyer ;
 * - `RappelSuivi`, sur l'onglet « Plan de prévention » : une ligne qui mène
 *   au suivi, où le geste se fait.
 */

/** Le filet ambre de la maquette V2, en un seul endroit (pas de jeton du board pour lui). */
const FILET_AMBRE = "shadow-[inset_0_4px_0_#f2d36b]";

export function CarteActionRequise({
  id,
  surtitre = "Action requise",
  titre,
  phrase,
  droite,
  ecriture = false,
  children,
}: {
  /** L'identifiant du titre, pour `aria-labelledby`. */
  id: string;
  surtitre?: string;
  titre: string;
  /** Sous le titre : qui, et ce que le geste déclenche. */
  phrase?: string;
  /** À droite du titre : les comptes d'une proposition. */
  droite?: ReactNode;
  /** Toute la carte mène à une écriture : masquée en lecture seule (`data-ecriture`). */
  ecriture?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      data-ecriture={ecriture ? "" : undefined}
      className={`carte-board flex flex-col gap-5 px-6 py-7 md:px-[34px] md:py-[30px] ${FILET_AMBRE}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="max-w-[720px]">
          <p className="board-eyebrow m-0 text-[11px] tracking-[0.16em] text-[color:var(--board-amber-ink)]">
            {surtitre}
          </p>
          <h2 id={id} className="board-titre m-0 mt-2 text-[28px] leading-[1.02] md:text-[34px]">
            {titre}
          </h2>
          {phrase && <p className="m-0 mt-2 text-[15px] text-[color:var(--board-slate-ink)]">{phrase}</p>}
        </div>
        {droite}
      </div>
      {children}
    </section>
  );
}

export function RappelSuivi({
  href,
  action,
  children,
}: {
  href: string;
  /** « Voir et décider → », « Terminer la correction et signer → ». */
  action: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-wrap items-center gap-3 rounded-[18px] border border-[color:var(--board-amber)] bg-[color:var(--board-amber-wash)] px-[18px] py-3 text-[color:var(--board-ink)]"
    >
      <span aria-hidden className="size-2 flex-none rounded-full bg-[color:var(--board-amber-ink)]" />
      <span className="min-w-0 flex-[1_1_320px] text-[14.5px]">{children}</span>
      <span className="text-[14px] font-semibold text-[color:var(--board-amber-ink)]">{action}</span>
    </Link>
  );
}
