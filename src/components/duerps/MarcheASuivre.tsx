/**
 * La marche à suivre d'une étape du DUERP, en rail (2026-11-12).
 *
 * Sur un fond creux, avec son titre, sans carte : la consigne se lisait
 * comme un bloc de contenu de plus, au même rang que les listes. Trois pas au plus, numérotés
 * parce qu'ils se font dans cet ordre. L'état d'un pas se dit en mots
 * (`detail`) ; la couleur le double, jamais seule.
 */
export type PasMarche = {
  titre: string;
  detail: string;
  etat: "fait" | "courant" | "a-faire";
};

const ROND: Record<PasMarche["etat"], string> = {
  fait: "bg-[color:var(--board-ink)] text-white",
  courant: "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]",
  "a-faire": "bg-[color:var(--board-card)] text-[color:var(--board-slate-mid)]",
};

export function MarcheASuivre({
  pas,
  libelle,
}: {
  pas: PasMarche[];
  /** Le titre du bloc : « Comment ça marche », « Où en est cette unité »… */
  libelle: string;
}) {
  // Sur un fond creux (2026-11-12) : la surface `--board-slate-pale` des
  // sous-blocs, sans ombre ni rayon de carte — la consigne se détache des
  // cartes de contenu sans en devenir une.
  return (
    <section
      aria-label={libelle}
      className="flex flex-col gap-4 rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-5 sm:px-7"
    >
      <p className="board-surtitre m-0">{libelle}</p>
    <ol
      className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3 sm:gap-0"
    >
      {pas.map((p, i) => (
        <li
          key={p.titre}
          aria-current={p.etat === "courant" ? "step" : undefined}
          className={`flex min-w-0 items-start gap-3 sm:pr-5 ${
            i > 0 ? "sm:border-l-2 sm:border-[color:var(--board-card)] sm:pl-5" : ""
          }`}
        >
          <span
            aria-hidden
            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums ${ROND[p.etat]}`}
          >
            {p.etat === "fait" ? "✓" : String(i + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0">
            <span
              className={`block text-[14px] font-semibold leading-[1.3] tracking-[-0.01em] ${
                p.etat === "courant"
                  ? "text-[color:var(--board-blue-ink)]"
                  : "text-[color:var(--board-ink)]"
              }`}
            >
              {p.titre}
            </span>
            <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-[color:var(--board-slate-mid)]">
              {p.detail}
            </span>
          </span>
        </li>
      ))}
    </ol>
    </section>
  );
}
