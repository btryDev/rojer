// Le client que rend une garde simulée (`assertEtablissementDuCompte`,
// `requireCompte`…) dans un test de module : le client borné SIMULÉ
// (`vitest.setup.ts`), jamais le client brut — sinon les refus de la borne ne
// s'appliquent pas, et une écriture que la production refuserait passerait la
// CI (seconde lecture du 2026-10-31).
//
// Import statique : deux imports dynamiques concurrents du module simulé
// (`Promise.all` de deux actions) en rendaient un réel.

import { clientBorne } from "@/lib/auth/portee/client";

export async function clientDuCompteSimule(userId = "user-1") {
  return clientBorne({ type: "compte", userId });
}
