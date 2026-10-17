// Le sur-titre des rubriques de la page « Ce que Rojer ne couvre pas » — un
// seul endroit pour ses classes, partagé par la page et ses rubriques.

export function SurTitre({ children }: { children: React.ReactNode }) {
  return (
    <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
      {children}
    </p>
  );
}
