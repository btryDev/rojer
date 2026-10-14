// Le cookie qui porte la disposition personnalisée du board d'un
// établissement. Lu au serveur (`DashboardGrid`) pour rendre d'emblée la
// bonne disposition, écrit par le client (`useLayoutPerso`) à chaque
// changement. Restreint au chemin de la page : il ne voyage qu'avec les
// requêtes du tableau de bord de cet établissement.

export function nomCookieLayout(etablissementId: string): string {
  return `board-layout-${etablissementId}`;
}

export function cheminCookieLayout(etablissementId: string): string {
  return `/etablissements/${etablissementId}`;
}
