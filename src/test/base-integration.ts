// La garde des tests d'intégration qui VIDENT une base : elle la veut locale.
// Une seule définition — les copies avaient déjà divergé (2026-11-09,
// simplification de la matrice d'isolation). Le vidage lui-même reste dans les
// fichiers de test : du SQL brut hors d'un test tomberait sous la garde du SQL
// brut (`portee/imports.test.ts`), et c'est voulu.

/**
 * Vrai si l'URL vise une base locale (`localhost`, `127.0.0.1`, `[::1]`), avec
 * ou sans identifiants. Un test qui vide la base refuse tout le reste.
 */
export function estBaseLocale(url: string | undefined): boolean {
  return url !== undefined && /^postgres(?:ql)?:\/\/(?:[^@/]*@)?(?:localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
}
