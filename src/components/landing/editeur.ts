/**
 * L'éditeur de Rojer, tel que le disent les mentions légales, les conditions
 * générales et la politique de confidentialité — écrit une fois.
 *
 * Source : les conditions générales de RiskBoard (BTRY, version du
 * 2026-06-04), remises par la propriétaire le 2026-11-19.
 *
 * ⚠︎ À confirmer par la propriétaire avant publication :
 * - ~~le SIRET : 934 765 769 00039 dans les conditions de RiskBoard, 00013
 *   dans ses mentions légales~~ [2026-11-19 : 00021, donné par la
 *   propriétaire] ;
 * - le téléphone de BTRY et celui de l'hébergeur (LCEN, art. 6 III) ;
 * - ~~le directeur de la publication (le gérant, par défaut)~~ [2026-11-19 :
 *   le gérant, confirmé par la propriétaire].
 */
export const EDITEUR = {
  denomination: "BTRY",
  forme: "société à responsabilité limitée (SARL)",
  capital: "4 000 €",
  siege: "301 avenue du Pascalet, ZA de la Montée Rouge, 30310 Vergèze, France",
  rcs: "RCS Nîmes 934 765 769",
  siret: "934 765 769 00021",
  tva: "FR62934765769",
  ape: "71.12B",
  gerant: "Julien Chantoin",
  email: "contact@btry.fr",
  telephone: "[à compléter]",
} as const;

export const HEBERGEUR = {
  nom: "Clever Cloud SAS",
  adresse: "3 rue de l'Allier, 44000 Nantes, France",
  site: "https://www.clever-cloud.com",
  telephone: "[à compléter]",
} as const;

/** « BTRY, SARL au capital de 4 000 €, … » : l'identité en une phrase. */
export const IDENTITE_EDITEUR = `${EDITEUR.denomination}, ${EDITEUR.forme} au capital de ${EDITEUR.capital}, dont le siège est situé ${EDITEUR.siege}, immatriculée au ${EDITEUR.rcs}, TVA intracommunautaire ${EDITEUR.tva}`;
