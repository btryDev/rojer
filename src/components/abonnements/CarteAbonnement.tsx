import Link from "next/link";
import type { ReactNode } from "react";

/** Le texte courant secondaire des pages de l'abonnement (charte : `--board-slate-mid`, mesure de lecture). */
export const TEXTE_AIDE = "m-0 max-w-[var(--board-mesure)] text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]";

/**
 * Une carte des pages de l'abonnement (2026-11-17) : la carte du board, son
 * titre, et à droite le lien vers la sous-page qui en dit plus.
 */
export function CarteAbonnement({
  titre,
  lien,
  children,
}: {
  titre?: string;
  lien?: { href: string; libelle: string };
  children: ReactNode;
}) {
  return (
    <section className="carte-board flex flex-col gap-4 px-7 py-6 sm:px-8">
      {titre ? (
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="board-titre m-0 text-[22px]">{titre}</h2>
          {lien ? (
            <Link href={lien.href} className="text-[14px] text-[color:var(--board-blue-ink)] underline underline-offset-4">
              {lien.libelle}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** L'offre n'est pas lancée (`vue.cas === "fermee"`) : la même phrase partout. */
export function OffreFermee() {
  return (
    <CarteAbonnement>
      <p className={TEXTE_AIDE}>Les abonnements ne sont pas encore ouverts : toutes les fonctions de Rojer restent accessibles.</p>
    </CarteAbonnement>
  );
}
