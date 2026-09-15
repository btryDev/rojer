/**
 * Pourquoi la suppression d'une prescription est refusée — UNE phrase, dite par
 * le serveur quand il refuse et par l'écran quand il masque le bouton
 * (2026-09-15). Module feuille, sans import : il sert au client.
 *
 * Les dates arrivent en clé civile « AAAA-MM-JJ » (`cleJourCivil`) : c'est la
 * forme que la page transmet déjà à l'écran, et elle se formate sans fuseau.
 */

export type ContexteRefus = {
  effet: "renforce_periodicite" | "obligation_sur_mesure";
  /** Jour de l'acte. */
  acte: string;
  /** Jour de la levée, ou `null`. */
  fin: string | null;
  /** Levée au sens du moteur : l'effet est déjà arrêté. */
  levee: boolean;
};

const enFrancais = (cle: string) => {
  const [a, m, j] = cle.split("-");
  return `${j}/${m}/${a}`;
};

export function raisonDuRefus(c: ContexteRefus, n: number): string {
  const pluriel = n > 1;
  const sujet =
    `${n} vérification${pluriel ? "s" : ""} visée${pluriel ? "s" : ""} ` +
    `par cette prescription porte${pluriel ? "nt" : ""}`;
  const preuve =
    c.effet === "obligation_sur_mesure"
      ? // L'obligation n'existe que par l'acte : tout ce qu'elle porte l'a été
        // sous lui, sans borne de date.
        "un rapport, une action corrective ou un contrôle enregistré"
      : c.fin === null
        ? `un rapport fait sous l'acte, daté du ${enFrancais(c.acte)} ou après`
        : `un rapport fait sous l'acte, daté du ${enFrancais(c.acte)} au ${enFrancais(c.fin)}`;
  const suite = c.levee
    ? "Déjà levée, elle reste au dossier : c'est elle qui justifie ces contrôles."
    : "Elle reste au dossier ; pour arrêter son effet, levez-la.";
  return `${sujet} ${preuve}. ${suite}`;
}
