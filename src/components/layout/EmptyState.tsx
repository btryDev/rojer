import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * État vide pédagogique. Objectif pour un dirigeant non-expert :
 *   - expliquer **à quoi sert** le module (pourquoi je suis ici)
 *   - suggérer **quoi faire maintenant** (une action claire)
 *   - éviter d'inquiéter (pas d'icône "warning" alarmiste)
 *
 * En charte board (`docs/charte-board.md` § 6). Deux choses ont disparu
 * avec le papier :
 *
 * - le motif de points en fond, qui n'existait que « pour rester dans
 *   l'esthétique papier » — l'état vide du board ne porte pas d'ornement,
 *   il porte ce que l'écran fera et d'où viendront les données ;
 * - le `text-indigo-700` de la variante `info`, une couleur hors des deux
 *   palettes. La variante garde son rôle — signaler un état vide qui
 *   informe plutôt qu'il n'attend une saisie — mais dans la famille bleue
 *   du board.
 *
 * Ce composant ne couvre que le premier des trois cas de la charte : le
 * « vraiment vide ». Un écran filtré n'a rien à faire ici — envoyer
 * « déclarez vos équipements » à quelqu'un qui vient de le faire lui fait
 * chercher une erreur de saisie qui n'existe pas.
 */

export function EmptyState({
  titre,
  pourquoi,
  quoiFaire,
  cta,
  ctaHref,
  ctaSecondary,
  variant = "neutral",
}: {
  titre: string;
  pourquoi: string;
  quoiFaire: string;
  cta?: string;
  ctaHref?: string;
  ctaSecondary?: { libelle: string; href: string };
  variant?: "neutral" | "info";
}) {
  return (
    <div className="carte-board px-7 py-8 sm:px-8">
      <div className="max-w-[var(--board-mesure)] space-y-4">
        <p
          className={
            "board-eyebrow m-0 text-[10.5px] tracking-[0.18em] " +
            (variant === "info"
              ? "text-[color:var(--board-blue-ink)]"
              : "text-[color:var(--board-slate-soft)]")
          }
        >
          À quoi sert cette page
        </p>
        <h3 className="board-titre m-0 text-[22px]">{titre}</h3>
        <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          {pourquoi}
        </p>
        <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
          <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Pour commencer —
          </span>{" "}
          {quoiFaire}
        </p>

        {(cta || ctaSecondary) && (
          <div className="flex flex-wrap gap-3 pt-2">
            {cta && ctaHref && (
              <Link
                href={ctaHref}
                className={buttonVariants({ variant: "board", size: "board" })}
              >
                {cta}
              </Link>
            )}
            {ctaSecondary &&
              (ctaSecondary.href.startsWith("http") ? (
                <a
                  href={ctaSecondary.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: "boardClair",
                    size: "board",
                  })}
                >
                  {ctaSecondary.libelle} ↗
                </a>
              ) : (
                <Link
                  href={ctaSecondary.href}
                  className={buttonVariants({
                    variant: "boardClair",
                    size: "board",
                  })}
                >
                  {ctaSecondary.libelle}
                </Link>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
