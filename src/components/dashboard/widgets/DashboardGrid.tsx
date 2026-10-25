import "server-only";
import { cookies } from "next/headers";
import { DashboardGridClient } from "./DashboardGridClient";
import { nomCookieLayout } from "./cookie-layout";
import type { DashboardBundle } from "./types";

/**
 * Le tableau de bord, rendu au serveur dans la disposition de l'utilisateur.
 *
 * La disposition personnalisée vivait dans le `localStorage` : le serveur ne
 * pouvait pas la connaître, le premier rendu servait la disposition par
 * défaut et la vraie n'apparaissait qu'après hydratation — les widgets
 * sautaient (audit Next.js du 2026-10-14, B9). Elle vit désormais dans un
 * cookie, que le serveur lit ici : HTML et hydratation partent de la même
 * valeur, il n'y a plus rien à rattraper après montage.
 *
 * La clé remonte l'état à chaque établissement : la disposition de l'un ne
 * peut pas être écrite dans le cookie de l'autre.
 */
export async function DashboardGrid({
  bundle,
  entete,
}: {
  bundle: DashboardBundle;
  /** Posé en première rangée de la grille, pleine largeur (cf. le client). */
  entete?: React.ReactNode;
}) {
  const layoutCookie =
    (await cookies()).get(nomCookieLayout(bundle.etablissementId))?.value ??
    null;
  return (
    <DashboardGridClient
      key={bundle.etablissementId}
      bundle={bundle}
      layoutCookie={layoutCookie}
      entete={entete}
    />
  );
}
