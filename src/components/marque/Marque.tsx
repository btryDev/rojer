import Link from "next/link";

/**
 * La marque, provisoire en attendant le logo : le nom sur une pastille
 * bleue. Employée par l'en-tête et le pied de la page publique
 * (`LandingHeader`, `SiteFooter`) et par l'en-tête des pages de connexion
 * (`AppHeader`, 2026-11-11). Le rail de l'application, l'onboarding et la
 * navigation téléphone écrivent encore « Rojer » en texte sur fond d'encre :
 * le jour du logo, il se pose ici et chez eux.
 */
export function Marque() {
  return (
    <Link
      href="/"
      className="inline-flex rounded-full bg-[color:var(--board-sky)] px-3 py-0.5 text-[1.075rem] font-semibold tracking-[-0.03em] text-[color:var(--board-ink)] outline-none transition-colors hover:bg-[color:var(--board-blue-soft)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-ink)] focus-visible:ring-offset-2"
      style={{ fontFamily: "var(--font-titre), sans-serif" }}
    >
      Rojer
    </Link>
  );
}
