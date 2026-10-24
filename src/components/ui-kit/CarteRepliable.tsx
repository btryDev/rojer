import type { ReactNode } from "react";
import { ChevronRepli } from "@/components/ui/repli";

/**
 * Une carte du board qui se replie (page Équipements, 2026-10-24 : chaque
 * domaine et « Équipements de sécurité », une seule forme). L'en-tête dit le
 * titre, un compte, et une alerte s'il y en a une.
 */
export function CarteRepliable({
  id,
  titre,
  compte,
  alerte,
  ouverte,
  children,
}: {
  id?: string;
  titre: string;
  /** « 3 équipements », « 3 obligatoires ». */
  compte: string;
  /** Rose : « 2 dépassées », « 1 à déclarer ». */
  alerte?: string | null;
  ouverte: boolean;
  children: ReactNode;
}) {
  return (
    <details id={id} open={ouverte} className="carte-board group scroll-mt-6 px-7 py-6 sm:px-8">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-1 [&::-webkit-details-marker]:hidden">
        <ChevronRepli />
        <h2 className="board-titre m-0 flex-1 text-[22px]">{titre}</h2>
        <span className="text-[12.5px] text-[color:var(--board-slate-mid)]">{compte}</span>
        {alerte ? (
          <span className="rounded-full bg-[color:var(--board-signal)] px-3 py-1 text-[12px] font-semibold text-[color:var(--board-signal-ink)]">
            {alerte}
          </span>
        ) : null}
      </summary>
      <div className="mt-5 flex flex-col gap-6">{children}</div>
    </details>
  );
}
