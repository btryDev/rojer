import { libelleFamille } from "@/lib/plan-prevention/familles-risque";

/**
 * Les lignes de risque du formulaire du plan, et ce que cocher ou décocher une
 * famille de RiskBoard leur fait (2026-11-21). Module pur, sans React : la
 * règle se teste sans rendre l'écran (`lignes-risque.test.ts`).
 */

export type LigneState = {
  cle: string;
  risque: string;
  mesureEntrepriseUtilisatrice: string;
  mesureEntrepriseExterieure: string;
  /** La famille cochée (`familles-risque.ts`) ; vide : une ligne libre. */
  famille: string;
  lieu: string;
  frequence: string;
};

export const ligneVide = (cle: string, famille = "", risque = ""): LigneState => ({
  cle,
  risque,
  mesureEntrepriseUtilisatrice: "",
  mesureEntrepriseExterieure: "",
  famille,
  lieu: "",
  frequence: "",
});

/**
 * Une ligne que personne n'a remplie : son risque est vide ou n'est que le
 * libellé prérempli de sa famille, et le reste est vide. La remplacer ou la
 * retirer ne perd rien.
 */
export function estVierge(l: LigneState): boolean {
  const risque = l.risque.trim();
  return (
    (!risque || (l.famille !== "" && risque === libelleFamille(l.famille))) &&
    !l.mesureEntrepriseUtilisatrice.trim() &&
    !l.mesureEntrepriseExterieure.trim() &&
    !l.lieu.trim() &&
    !l.frequence.trim()
  );
}

/**
 * Cocher une famille ajoute sa ligne, risque prérempli, et remplace la ligne
 * libre vierge du premier affichage. Décocher retire la ligne si elle est
 * vierge ; remplie, elle reste, détachée de sa famille — décocher ne jette
 * jamais ce que l'utilisateur a écrit.
 */
export function basculerFamille(lignes: LigneState[], code: string, nouvelleCle: () => string): LigneState[] {
  if (lignes.some((x) => x.famille === code)) {
    const reste = lignes.flatMap((x) =>
      x.famille !== code ? [x] : estVierge(x) ? [] : [{ ...x, famille: "" }],
    );
    return reste.length > 0 ? reste : [ligneVide(nouvelleCle())];
  }
  const ajout = ligneVide(nouvelleCle(), code, libelleFamille(code));
  return [...lignes.filter((x) => x.famille !== "" || !estVierge(x)), ajout];
}
