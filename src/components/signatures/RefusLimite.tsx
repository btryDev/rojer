import type { ReactNode } from "react";
import { messageTropDeTentatives } from "@/lib/securite/limite-debit";

/**
 * La page qu'affichent `/verifier` et `/signe` quand la limite par IP tombe
 * (`verification-publique.ts`) : rendue avant toute lecture de la signature,
 * elle ne dit rien d'elle. Une page ne choisit pas son statut HTTP : le refus
 * est un message.
 */
export function RefusLimite({
  surtitre,
  titre,
  reessayerDansSecondes,
  children,
}: {
  surtitre: string;
  titre: string;
  reessayerDansSecondes: number;
  /** Ce que la page a de propre à dire, avant le délai. */
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-xl px-6 py-16 sm:px-10">
      <div className="carte-board px-7 py-7 sm:px-8">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">{surtitre}</p>
        <h1 className="mt-2 text-[1.4rem] font-semibold tracking-[-0.02em]">{titre}</h1>
        {children}
        <p role="alert" className="mt-4 text-[0.9rem] text-[color:var(--muted-foreground)]">
          {messageTropDeTentatives(reessayerDansSecondes)}
        </p>
      </div>
    </main>
  );
}
