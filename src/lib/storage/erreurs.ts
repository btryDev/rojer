/**
 * Les erreurs du stockage, typées pour que l'appelant sache quoi dire.
 *
 * Trois cas, trois réponses à l'écran : le stockage n'est pas configuré sur ce
 * serveur (un dépôt ne peut pas marcher — le dire tel quel) ; le fichier n'est
 * pas là (une ligne en base pointe vers une clé absente — « introuvable », pas
 * une page d'erreur) ; tout le reste (panne du service — erreur générique,
 * journalisée).
 *
 * Aucune de ces erreurs ne porte de secret : ni clé de service, ni URL signée.
 * Elles nomment la variable manquante ou la clé de stockage, jamais sa valeur
 * d'authentification.
 */

/** Le message à l'écran quand un dépôt est refusé faute de stockage configuré. */
export const MESSAGE_DEPOT_NON_CONFIGURE =
  "Le dépôt de fichiers n'est pas encore configuré sur ce serveur.";

/** Le message à l'écran quand une ligne pointe vers un fichier absent. */
export const MESSAGE_FICHIER_INTROUVABLE =
  "Le fichier n'est pas disponible : il n'a pas été retrouvé dans le stockage.";

export class ErreurStockage extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurStockage";
  }
}

/** Le pilote n'est pas utilisable ici — configuration, pas panne. */
export class StockageNonConfigure extends ErreurStockage {
  constructor(motif: string) {
    super(motif);
    this.name = "StockageNonConfigure";
  }
}

/** La clé demandée n'existe pas dans le stockage. */
export class FichierIntrouvable extends ErreurStockage {
  constructor(public readonly cle: string) {
    super(`Fichier absent du stockage : ${cle}`);
    this.name = "FichierIntrouvable";
  }
}
