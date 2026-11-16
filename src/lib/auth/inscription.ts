/**
 * Les inscriptions jamais activées sont effacées au bout de ce délai
 * (`comptes-non-actives.ts`, tâche quotidienne), compté depuis l'inscription.
 * Module sans dépendance : la page d'attente l'annonce, la purge l'applique.
 * Une réinscription ne remet pas le compteur à zéro : un lien envoyé la
 * veille de la purge mène à « lien invalide, refaites l'inscription ».
 */
export const JOURS_AVANT_PURGE = 30;
