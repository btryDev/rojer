// Une erreur de requête, en UNE ligne JSON — ce que lit un drain de journaux.
//
// Audit Next.js du 2026-10-14, M6. Next appelle `onRequestError`
// (`src/instrumentation.ts`) pour toute erreur serveur qu'il capture : rendu
// RSC, route, action serveur, proxy. Vercel et Clever Cloud collectent l'un et
// l'autre la sortie d'erreur du processus ; une ligne JSON par erreur s'y filtre
// et s'y agrège sans service tiers. Next continue d'imprimer sa propre trace :
// cette ligne s'y ajoute, elle ne la remplace pas.
//
// CE QUI N'Y EST PAS, exprès :
//   - le chemin réel et la chaîne de requête : `/acces/<jeton>`, `/signe?…`
//     portent des secrets. On journalise le MOTIF de route (`routePath`,
//     `/acces/[token]`), pas l'URL ;
//   - les en-têtes (cookies de session, `Authorization`).
//
// Module pur : il rend la ligne, l'appelant l'écrit.

export type ContexteErreurRequete = {
  routerKind?: string;
  routePath?: string;
  routeType?: string;
  renderSource?: string;
  revalidateReason?: string;
};

export type RequeteErreur = { method?: string; path?: string };

export function ligneErreurRequete(
  erreur: unknown,
  requete: RequeteErreur,
  contexte: ContexteErreurRequete,
  maintenant: Date = new Date(),
): string {
  const e = erreur instanceof Error ? erreur : null;
  const digest =
    typeof erreur === "object" && erreur !== null && "digest" in erreur
      ? String((erreur as { digest: unknown }).digest)
      : undefined;

  return JSON.stringify({
    niveau: "error",
    evenement: "erreur_requete",
    horodatage: maintenant.toISOString(),
    methode: requete.method,
    route: contexte.routePath,
    typeRoute: contexte.routeType,
    sourceRendu: contexte.renderSource,
    routeur: contexte.routerKind,
    revalidation: contexte.revalidateReason,
    nom: e?.name,
    message: e ? e.message : String(erreur),
    digest,
    pile: e?.stack,
  });
}
