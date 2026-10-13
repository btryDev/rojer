import Link from "next/link";

export type Etape = {
  id: string;
  libelle: string;
  href: string;
  atteinte: boolean;
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
 * Trois valeurs, trois traitements — et jamais la couleur seule
 * (interdit 10) : l'étape en cours porte l'encre bleue du board **et** le
 * mot « En cours », l'étape franchie l'encre principale **et** « Ouvert »,
 * l'étape à venir l'ardoise **et** « À venir ». `aria-current="step"`
 * double le tout pour qui n'a pas la couleur du tout.
 */
export function WizardSteps({ etapes }: { etapes: Etape[] }) {
  const total = etapes.length;
  const indexActuelle = etapes.findIndex((e) => e.actuelle);
  const numeroActuelle =
    indexActuelle >= 0 ? indexActuelle + 1 : etapes.filter((e) => e.atteinte).length;

  return (
    <nav aria-label="Sommaire du DUERP" className="not-prose">
      {/* Compteur haut */}
      <div className="mb-4 flex items-baseline justify-between">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Progression
        </p>
        <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          <span className="text-[13px] tabular-nums text-[color:var(--board-ink)]">
            {String(numeroActuelle).padStart(2, "0")}
          </span>
          <span className="mx-1 text-[color:var(--board-slate)]">/</span>
          <span className="tabular-nums">{String(total).padStart(2, "0")}</span>
        </p>
      </div>

      {/* Barre segmentée — continue, avec gaps */}
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={numeroActuelle}
        className="flex gap-1.5"
      >
        {etapes.map((e) => {
          let fill = "bg-[color:var(--board-slate-line)]";
          if (e.atteinte && !e.actuelle) fill = "bg-[color:var(--board-ink)]";
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
          const muet = !e.atteinte && !e.actuelle;
          const clickable = e.atteinte || e.actuelle;

          return (
            <li key={e.id} className="min-w-0">
              <Link
                href={clickable ? e.href : "#"}
                aria-current={e.actuelle ? "step" : undefined}
                aria-disabled={muet}
                className={`group block ${muet ? "pointer-events-none" : ""}`}
              >
                <div className="board-eyebrow flex items-baseline gap-2 text-[10px] tracking-[0.16em]">
                  <span
                    className={`tabular-nums ${
                      e.actuelle
                        ? "font-semibold text-[color:var(--board-blue-ink)]"
                        : e.atteinte
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
                    {e.actuelle
                      ? "En cours"
                      : e.atteinte
                        ? "Ouvert"
                        : "À venir"}
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
              </Link>
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
