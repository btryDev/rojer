// Doublure de `@/lib/auth/require-user` pour `scripts/mesure-exports.ts`
// (voir `mesure-exports-auth.mjs`). Compte chaque lecture de session.
const compteur = (globalThis.__mesureSessions ??= { n: 0 });

async function lire() {
  compteur.n++;
  const id = process.env.MESURE_USER_ID;
  if (!id) throw new Error("MESURE_USER_ID manquant");
  return { id, email: null };
}

module.exports = {
  requireUser: lire,
  getOptionalUser: lire,
};
