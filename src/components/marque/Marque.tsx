import Link from "next/link";
import { LogoRojer } from "./LogoRojer";

/**
 * La marque : le logo sur une pastille bleue. Employée par l'en-tête et le
 * pied de la page publique (`LandingHeader`, `SiteFooter`) et par l'en-tête
 * des pages de connexion (`AppHeader`, 2026-11-11). [2026-11-24 : le logo
 * remplace le nom écrit en Instrument Sans (`LogoRojer`) ; le rail de
 * l'application, la navigation téléphone, le rail de l'onboarding
 * (`WizardShell`) et la page du lien externe (`/acces/[token]`) le portent
 * aussi. Reste écrit en texte : la couverture du registre PDF
 * (`RegistreDocument`), lot à part.] La pastille garde sa taille d'avant
 * (29,8 px de haut à 17,2 px) : le logo fait 0,953 em, la marge verticale
 * 0,39 em.
 */
export function Marque() {
  return (
    <Link
      href="/"
      aria-label="Rojer"
      className="inline-flex items-center rounded-full bg-[color:var(--board-sky)] px-3 py-[0.39em] text-[1.075rem] text-[color:var(--board-ink)] outline-none transition-colors hover:bg-[color:var(--board-blue-soft)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-ink)] focus-visible:ring-offset-2"
    >
      <LogoRojer />
    </Link>
  );
}
