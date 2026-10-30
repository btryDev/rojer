import type { ReactNode } from "react";

/**
 * Le message d'un formulaire de la charte board, au niveau du bloc et non
 * d'un champ (`ChampBoard` porte l'erreur d'un champ) : un refus, ou un
 * accusé de réception. Rien si le texte est vide.
 */
export function MessageFormulaire({
  ton,
  children,
}: {
  ton: "alerte" | "info";
  children?: ReactNode;
}) {
  if (!children) return null;
  return ton === "alerte" ? (
    <p
      role="alert"
      className="m-0 rounded-[18px] bg-[color:var(--board-signal-wash)] px-4 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-signal-ink)]"
    >
      {children}
    </p>
  ) : (
    <p
      role="status"
      className="m-0 rounded-[18px] bg-[color:var(--board-blue-pale)] px-4 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-blue-ink)]"
    >
      {children}
    </p>
  );
}
