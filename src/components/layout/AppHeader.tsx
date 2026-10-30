import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";

/**
 * Header global persistant — visible partout où l'app n'a pas son propre
 * chrome : connexion, création de compte, pages publiques hors accueil. Il
 * n'est rendu que par les segments qui l'affichent (`LayoutAvecEnTete`,
 * audit Next.js du 2026-10-14, M2) — un portillon client le masquait après
 * coup, et il s'exécutait donc sur tous les écrans.
 *
 * Il portait la charte papier — surfaces et gris du papier, filet
 * pointillé, boutons du registre administratif. C'était un constat de
 * dette, pas une justification : la charte en vigueur est le board
 * (`docs/charte-board.md`), et un en-tête papier au-dessus d'écrans board
 * se lit comme un morceau d'un autre logiciel.
 *
 * Server component : lit la session (Better Auth, ADR-052) pour afficher l'email + logout
 * quand l'utilisateur est connecté, ou les liens de connexion sinon.
 */
export async function AppHeader() {
  const user = await getOptionalUser();
  const etab = user ? await getOptionalUserEtablissement() : null;
  const dashboardHref = etab ? `/etablissements/${etab.id}` : "/onboarding";
  const dashboardLabel = etab ? "Mon dossier" : "Commencer";

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3 sm:px-10">
        <Link href="/" className="group flex items-center gap-3">
          {/* Marque carrée : le rayon suit la règle du board pour ces
              marques — un tiers du côté, ici 28 px. */}
          <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[color:var(--board-ink)] text-[0.6rem] font-bold uppercase tracking-widest text-[color:var(--board-card)]">
            R
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[0.88rem] font-semibold tracking-[-0.01em] text-[color:var(--board-ink)]">
              Rojer
            </span>
            <span className="board-eyebrow m-0 text-[9px] tracking-[0.22em] text-[color:var(--board-slate-soft)]">
              Conformité santé-sécurité — TPE / PME
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <Link
                href={dashboardHref}
                className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
              >
                {dashboardLabel} →
              </Link>
              <span
                className="board-eyebrow m-0 hidden max-w-[220px] truncate text-[9.5px] tracking-[0.16em] text-[color:var(--board-slate-soft)] sm:inline"
                title={user.email ?? ""}
              >
                {user.email}
              </span>
              <form method="post" action="/auth/deconnexion">
                <button
                  type="submit"
                  className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] underline decoration-[color:var(--board-slate)] decoration-1 underline-offset-4 transition-colors hover:text-[color:var(--board-ink)] hover:decoration-[color:var(--board-ink)]"
                >
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({
                  variant: "boardClair",
                  size: "boardSm",
                })}
              >
                Se connecter
              </Link>
              <Link
                href="/signup"
                className={buttonVariants({ variant: "board", size: "boardSm" })}
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
