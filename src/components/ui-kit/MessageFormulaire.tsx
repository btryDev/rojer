import type { ReactNode } from "react";

const TONS = {
  alerte: { role: "alert", couleurs: "bg-[color:var(--board-signal-wash)] text-[color:var(--board-signal-ink)]" },
  info: { role: "status", couleurs: "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]" },
} as const;

/**
 * Le message d'un formulaire de la charte board, au niveau du bloc et non
 * d'un champ (`ChampBoard` porte l'erreur d'un champ) : un refus, ou un
 * accusé de réception (bleu, pas le vert « Fait » de `MessageFait` : on
 * accuse réception, aucun geste de conformité n'est accompli).
 *
 * Rien si le texte est vide — à l'inverse de `MessageFait`, toujours rendu :
 * ce message-ci est un encart coloré, qui vide se verrait. Il arrive avec la
 * réponse de l'action, en même temps que le reste du formulaire.
 */
export function MessageFormulaire({
  ton,
  className = "",
  children,
}: {
  ton: keyof typeof TONS;
  className?: string;
  children?: ReactNode;
}) {
  if (!children) return null;
  const { role, couleurs } = TONS[ton];
  return (
    <p role={role} className={`m-0 rounded-[18px] px-4 py-3 text-[12.5px] leading-[1.5] ${couleurs} ${className}`}>
      {children}
    </p>
  );
}
