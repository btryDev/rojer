import Link from "next/link";

// Pied de page à l'encre : le seul bloc sombre de la page. Il porte la
// phrase de marque et les mentions, rien d'autre. Les pages légales
// n'existent pas encore — on ne pose pas de lien qui ne mène nulle part.

export function SiteFooter() {
  return (
    <footer className="bg-[color:var(--board-ink)] py-14 text-white">
      <div className="lp-shell">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              className="flex items-baseline gap-[3px] text-[1.3rem] font-semibold tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-titre), sans-serif" }}
            >
              Rojer
              <span className="size-[7px] rounded-full bg-[color:var(--board-sky)]" />
            </p>
            <p className="mt-3 max-w-[34ch] text-[0.88rem] leading-[1.6] text-white/70">
              Concentrez-vous sur votre activité, Rojer coordonne la prévention
              des risques de votre structure.
            </p>
          </div>

          <nav className="flex flex-col gap-3 text-[0.85rem] sm:items-end">
            <a href="#documents" className="text-white/70 transition-colors hover:text-white">
              Les documents
            </a>
            <a href="#questions" className="text-white/70 transition-colors hover:text-white">
              Questions
            </a>
            <Link href="/login" className="text-white/70 transition-colors hover:text-white">
              Se connecter
            </Link>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>Hébergement UE · vos données restent en Europe</span>
          <span>
            Rojer assiste, il ne certifie pas · référentiel construit depuis
            Légifrance et EUR-Lex
          </span>
        </div>
      </div>
    </footer>
  );
}
