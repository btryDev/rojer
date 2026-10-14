import { AppHeader } from "./AppHeader";

/**
 * Le layout des segments qui portent l'en-tête global (audit Next.js du
 * 2026-10-14, M2) : connexion, création de compte, réinitialisation, pages
 * publiques (`/acces`, `/accessibilite`, `/signe`, `/verifier`) et
 * `/entreprises`.
 *
 * L'en-tête vivait dans le layout RACINE, masqué après coup par un portillon
 * client (`AppHeaderGate`) sur les écrans qui ont leur propre chrome — le
 * tableau de bord, le calendrier, le DUERP, l'onboarding, l'accueil. Le
 * portillon cachait le résultat, pas le travail : `AppHeader` lisait la
 * session et faisait sa requête en base sur chacun de ces écrans pour rien.
 * Il n'est plus rendu que là où il s'affiche.
 *
 * Pourquoi un layout par segment plutôt qu'un groupe de routes `(public)` :
 * le groupe déplaçait neuf dossiers de `src/app`, dont `login/`, qu'un lot
 * parallèle modifie ; un layout d'une ligne par segment ne déplace rien, et
 * les URL ne peuvent pas changer — aucun chemin n'est touché. La règle à
 * tenir est la même dans les deux cas : un nouveau segment public qui doit
 * porter l'en-tête déclare ce layout (`layout.tsx`, une ligne de
 * réexportation).
 *
 * PAS D'EN-TÊTE DANS `not-found.tsx`, ni dans les pages d'erreur. On l'y a
 * mis, derrière l'ancien portillon, pour garder l'en-tête sur une URL
 * inconnue : mesuré, la requête de l'en-tête repartait sur CHAQUE écran. Next
 * sérialise l'élément `not-found` racine dans la charge utile de toutes les
 * pages (repli de la frontière « introuvable »), donc tout ce qu'il rend
 * s'exécute à chaque rendu. La page introuvable garde son bouton « Revenir à
 * l'accueil » ; elle perd l'en-tête qu'elle montrait hors de l'application.
 * `error.tsx` est un composant client et ne peut pas rendre celui-ci.
 */
export default function LayoutAvecEnTete({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
