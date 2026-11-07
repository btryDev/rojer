// Une fiche du registre peut être tenue **ailleurs dans l'application**.
//
// L'inventaire des moyens de secours (parties 2.1 et 2.2) est le parc
// d'équipements ; les vérifications des moyens d'extinction et des
// installations (3.1 et 3.2) sont le calendrier et ses rapports archivés.
// Ces fiches n'ont pas de formulaire propre — et il ne faut surtout pas leur
// en donner un : ce serait une deuxième saisie du même fait, qui divergerait.
//
// Mais « pas de formulaire ici » ne veut pas dire « pas outillé ». Sans cette
// distinction, la jauge comptait 34 fiches sur 49 comme « pas encore
// outillées » alors que 31 d'entre elles sont tenues, ailleurs, depuis
// toujours. Un compteur qui se trompe à ce point contre le produit est aussi
// faux qu'un compteur qui se trompe en sa faveur — et c'est le dirigeant qui
// en paierait la lecture.
//
// ⚠ La table ci-dessous est indexée par **partie**, ce qui est une
// approximation de présentation : c'est l'écran qui sait où l'on tient telle
// fiche, pas le catalogue. La bonne place à terme est une déclaration par
// fiche dans `lib/registre/sections.ts` — chaque fiche disant qui l'alimente.
// En attendant, la partie suffit : les quatre parties visées sont alimentées
// de bout en bout, aucune n'est à moitié.

/** Ce qui tient une fiche, quand ce n'est pas cet écran. */
export type Alimentation = {
  /** L'écran qui la tient, nommé comme le dirigeant l'appelle. */
  libelle: string;
  /** Où la lire et la tenir. */
  href: string;
  /**
   * Ce que cet écran porte pour cette fiche, quand on sait le compter.
   * Absent, la pastille dit seulement où la fiche est tenue — c'est moins
   * précis, jamais faux.
   */
  nombre?: number;
  /**
   * Le nom de ce qu'on compte, aux deux nombres. Écrit en toutes lettres
   * plutôt que dérivé par un « s » final : « rapport archivé » fait
   * « rapports archivés », deux mots accordés — une règle de pluriel devinée
   * se trompe dès le premier adjectif.
   */
  unite?: { singulier: string; pluriel: string };
};

const PAR_PARTIE: Readonly<
  Record<
    string,
    {
      libelle: string;
      chemin: string;
      unite: { singulier: string; pluriel: string };
    }
  >
> = {
  "2.1": {
    libelle: "vos équipements",
    chemin: "/equipements",
    unite: { singulier: "équipement déclaré", pluriel: "équipements déclarés" },
  },
  "2.2": {
    libelle: "vos équipements",
    chemin: "/equipements",
    unite: { singulier: "équipement déclaré", pluriel: "équipements déclarés" },
  },
  "3.1": {
    libelle: "votre calendrier",
    chemin: "/calendrier",
    unite: { singulier: "rapport archivé", pluriel: "rapports archivés" },
  },
  "3.2": {
    libelle: "votre calendrier",
    chemin: "/calendrier",
    unite: { singulier: "rapport archivé", pluriel: "rapports archivés" },
  },
  // Les annexes (2026-11-05) : les écrits que le texte fait annexer au
  // registre sont des lignes de « Ce qui doit être en place », où le
  // dirigeant les déclare (`annexes.ts`). La fiche les relit.
  "5": {
    libelle: "« Ce qui doit être en place »",
    chemin: "/etats-permanents",
    unite: { singulier: "écrit déclaré en place", pluriel: "écrits déclarés en place" },
  },
};

/**
 * L'écran qui tient les fiches d'une partie, s'il y en a un.
 *
 * `base` est la racine de l'établissement (`/etablissements/{id}`) : le lien
 * doit mener à l'écran de CET établissement, pas à une page générique.
 */
export function alimentationDeLaPartie(
  partieId: string,
  base: string,
  nombre?: number,
): Alimentation | undefined {
  const source = PAR_PARTIE[partieId];
  if (!source) return undefined;
  return {
    libelle: source.libelle,
    href: `${base}${source.chemin}`,
    unite: source.unite,
    nombre,
  };
}
