/**
 * Le compte connecté, tel que la page publique le passe à ses sections :
 * où il reprend (son dossier, ou la mise en place) et comment le bouton le
 * dit. Absent tant que personne n'est connecté — c'est sa présence, et elle
 * seule, qui distingue les deux pages. Calculé par `compteDeLaSession`
 * (`compte-session.ts`), pour l'accueil et les pages légales.
 */
export type CompteLanding = {
  href: string;
  label: string;
};
