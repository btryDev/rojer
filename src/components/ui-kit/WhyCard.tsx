import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AideEcran } from "./AideEcran";
import type { Charte } from "./charte";

/**
 * « Pourquoi je dois faire ça ? »
 *
 * En board, une explication (`info`) se replie derrière le « ? » de
 * `AideEcran` : le titre reste à l'écran, le corps s'ouvre en modal. `alerte`,
 * `ok` et `replie={false}` restent une carte ouverte.
 */

// Le bandeau latéral coloré du papier n'a pas d'équivalent board, et ce
// n'est pas un oubli : le board dit l'état par un champ et une encre, pas
// par une bande, et une carte pédagogique n'est pas un état. L'écran qui
// sert de modèle (`prestataires/page.tsx`, pied « Pourquoi cette page »)
// est une `carte-board` nue. La `tonalite` ne subsiste donc côté board
// que sur la flèche de l'enjeu — assez pour distinguer un rappel d'un
// avertissement, pas assez pour peindre un quart de carte.
const CARTE: Record<Charte, string> = {
  papier:
    "relative rounded-2xl border border-[color:var(--rule-soft)] border-l-4 bg-[color:var(--paper-elevated)] p-6 shadow-[0_1px_0_0_var(--rule-soft)]",
  board: "carte-board px-7 py-6 sm:px-8",
};

const ACCENT_PAPIER = {
  info: "border-l-[color:var(--warm)] before:bg-[color:var(--warm)]",
  alerte: "border-l-[color:var(--minium)] before:bg-[color:var(--minium)]",
  ok: "border-l-[color:var(--accent-vif)] before:bg-[color:var(--accent-vif)]",
} as const;

// Le vert du board dit « fait », jamais « conforme » : `ok` ne s'emploie
// donc que sur un fait accompli — le registre d'accessibilité publié, par
// exemple —, pas sur un jugement de conformité.
const ENCRE_FLECHE_BOARD = {
  info: "text-[color:var(--board-blue-ink)]",
  alerte: "text-[color:var(--board-signal-ink)]",
  ok: "text-[color:var(--board-green-ink)]",
} as const;

const KICKER: Record<Charte, string> = {
  papier: "g-kicker mb-2",
  board:
    "board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]",
};

const TITRE: Record<Charte, string> = {
  papier: "display-lg text-[1.35rem] text-[color:var(--ink)]",
  board: "board-titre m-0 mt-2 text-[22px]",
};

const ENJEU: Record<Charte, string> = {
  papier: "mt-3 text-[0.95rem] leading-relaxed text-[color:var(--ink)]",
  board:
    "m-0 mt-3 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]",
};

const CORPS: Record<Charte, string> = {
  papier:
    "mt-4 text-[0.9rem] leading-relaxed text-[color:var(--muted-foreground)]",
  board:
    "mt-4 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]",
};

export function WhyCard({
  kicker = "Pourquoi",
  titre,
  enjeu,
  children,
  tonalite = "info",
  className,
  charte = "board",
  replie = true,
}: {
  kicker?: string;
  titre: string;
  /** Phrase courte type « Vous risquez {X} si vous ne faites pas {Y}. » */
  enjeu?: string;
  children?: ReactNode;
  /**
   * En papier : le bandeau latéral — info = navy, alerte = minium,
   * ok = vert. En board : l'encre de la flèche seule.
   */
  tonalite?: "info" | "alerte" | "ok";
  className?: string;
  /** La grammaire visuelle de l'écran qui porte la carte. */
  charte?: Charte;
  /**
   * `false` : la carte reste ouverte même en `info` — pour ce qu'il faut lire
   * avant d'agir (la page de signature d'un prestataire).
   */
  replie?: boolean;
}) {
  // Seule l'explication (`info`) se replie : un avertissement ou un fait
  // acquis (`ok`) reste à l'écran, comme ce qu'un signataire doit lire avant
  // de signer (`replie={false}`). Le titre reste un intitulé de section.
  if (charte === "board" && tonalite === "info" && replie) {
    return (
      <h2 className={cn("m-0 flex", className)}>
        <AideEcran titre={titre} surtitre={kicker} libelle={titre}>
          {enjeu && <p className="m-0">{enjeu}</p>}
          {children && (
            <div className={cn("text-[13px] leading-[1.6]", enjeu && "mt-3")}>
              {children}
            </div>
          )}
        </AideEcran>
      </h2>
    );
  }

  return (
    <section
      className={cn(
        CARTE[charte],
        charte === "papier" && ACCENT_PAPIER[tonalite],
        className,
      )}
    >
      <div className={KICKER[charte]}>{kicker}</div>
      <h2 className={TITRE[charte]}>{titre}</h2>
      {enjeu && (
        <p className={ENJEU[charte]}>
          <span
            className={
              charte === "board"
                ? ENCRE_FLECHE_BOARD[tonalite]
                : "accent-serif text-[color:var(--warm)]"
            }
          >
            →
          </span>{" "}
          {enjeu}
        </p>
      )}
      {children && <div className={CORPS[charte]}>{children}</div>}
    </section>
  );
}
