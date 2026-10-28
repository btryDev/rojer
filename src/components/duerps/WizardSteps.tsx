import Link from "next/link";

export type Etape = {
  id: string;
  libelle: string;
  href: string;
  /** Accessible : ses prérequis sont remplis, l'étape est un lien. */
  atteinte: boolean;
  /** Complète, lu sur les données (`construireEtapes`). */
  faite: boolean;
  actuelle?: boolean;
  /**
   * Ce qui manque pour que l'étape soit faite, et où le faire. Posé
   * aujourd'hui par la seule étape « Questions transverses », calculée
   * depuis le 2026-10-12 (`construireEtapes`).
   */
  signal?: { texte: string; href: string };
};

/**
 * Le fil des étapes du DUERP, en charte board.
 *
 * Trois mots — et jamais la couleur seule (interdit 10) : « Fait » pour
 * une étape complète (même celle où l'on est), « En cours » pour l'étape
 * courante pas encore faite, « À faire » pour les autres. L'étape courante
 * porte toujours l'encre bleue (2026-10-28 : « Ouvert » disait seulement « accessible », et
 * « À venir » se confondait avec « à faire »). Une étape dont les prérequis
 * manquent reste un bloc non cliquable. `aria-current="step"` double le tout.
 *
 * Posé sur une carte board (charte § checklist 3) : sans surface, le fil
 * flottait sur le canvas et ne se lisait pas comme un bloc de la page.
 */
export function WizardSteps({ etapes }: { etapes: Etape[] }) {
  const total = etapes.length;
  // Le compteur dit ce qui est FAIT, pas où l'on se trouve.
  const faites = etapes.filter((e) => e.faite).length;

  return (
    <nav
      aria-label="Sommaire du DUERP"
      className="carte-board not-prose px-7 py-6 sm:px-8"
    >
      {/* Compteur haut */}
      <div className="mb-4 flex items-baseline justify-between">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Progression
        </p>
        <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          <span className="text-[13px] tabular-nums text-[color:var(--board-ink)]">
            {faites}
          </span>
          <span className="mx-1 text-[color:var(--board-slate-soft)]">/</span>
          <span className="tabular-nums">{total}</span>
          <span className="ml-1.5">{faites > 1 ? "faites" : "faite"}</span>
        </p>
      </div>

      {/* Barre segmentée — continue, avec gaps */}
      <div
        role="progressbar"
        aria-label="Étapes faites"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={faites}
        className="flex gap-1.5"
      >
        {etapes.map((e) => {
          let fill = "bg-[color:var(--board-slate-line)]";
          if (e.faite && !e.actuelle) fill = "bg-[color:var(--board-ink)]";
          if (e.actuelle) fill = "bg-[color:var(--board-blue-ink)]";
          return (
            <span
              key={e.id}
              aria-hidden
              className={`h-[5px] flex-1 rounded-full ${fill}`}
            />
          );
        })}
      </div>

      {/* Libellés alignés sous chaque segment */}
      <ol className="mt-4 grid list-none grid-cols-1 gap-y-5 p-0 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-0">
        {etapes.map((e, i) => {
          const numero = String(i + 1).padStart(2, "0");
          const muet = !e.faite && !e.actuelle;
          const clickable = e.atteinte || e.actuelle;

          // Une étape à venir n'est pas un lien : pas de `href="#"` inerte
          // (interdits 19 et 20), un simple bloc.
          const corps = (
            <>
              <div className="board-eyebrow flex items-baseline gap-2 text-[10px] tracking-[0.16em]">
                <span
                  className={`tabular-nums ${
                    e.actuelle
                      ? "font-semibold text-[color:var(--board-blue-ink)]"
                      : e.faite
                        ? "text-[color:var(--board-ink)]"
                        : "text-[color:var(--board-slate-soft)]"
                  }`}
                >
                  {numero}
                </span>
                <span
                  className={
                    e.actuelle
                      ? "font-semibold text-[color:var(--board-blue-ink)]"
                      : "text-[color:var(--board-slate-soft)]"
                  }
                >
                  {/* « Fait » prime : le compteur compte l'étape courante quand
                      elle est faite, le mot doit le dire aussi. L'étape
                      courante garde son encre bleue et `aria-current`. */}
                  {e.faite ? "Fait" : e.actuelle ? "En cours" : "À faire"}
                </span>
              </div>

              <p
                className={`m-0 mt-2 text-[14px] leading-[1.3] tracking-[-0.01em] ${
                  muet
                    ? "text-[color:var(--board-slate-mid)]"
                    : e.actuelle
                      ? "font-semibold text-[color:var(--board-ink)]"
                      : "font-medium text-[color:var(--board-ink)]"
                } ${clickable ? "transition-opacity group-hover:opacity-60" : ""}`}
              >
                {e.libelle}
              </p>
            </>
          );

          return (
            <li key={e.id} className="min-w-0">
              {clickable ? (
                <Link
                  href={e.href}
                  aria-current={e.actuelle ? "step" : undefined}
                  className="group block"
                >
                  {corps}
                </Link>
              ) : (
                <div>{corps}</div>
              )}
              {/* Hors du lien de l'étape : deux ancres ne s'imbriquent pas. */}
              {e.signal && (
                <Link
                  href={e.signal.href}
                  className="mt-1.5 inline-block text-[12.5px] leading-[1.4] text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
                >
                  {e.signal.texte} →
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
