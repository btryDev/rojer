import type { OrigineAction } from "@/lib/actions/queries";

const LABEL: Record<OrigineAction, string> = {
  duerp: "DUERP",
  verification: "Vérification",
};

// L'origine n'est pas un état : elle ne prend donc aucun champ du
// vocabulaire d'urgence (rose, ambre, vert). Ardoise pour les trois — ce
// qui les distingue est le mot, pas la couleur. Trois teintes de plus sur
// une fiche qui en porte déjà deux, c'était trois signaux qui ne
// signalaient rien.
export function BadgeOrigine({ origine }: { origine: OrigineAction }) {
  return (
    <span className="pastille-board bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]">
      {LABEL[origine]}
    </span>
  );
}
