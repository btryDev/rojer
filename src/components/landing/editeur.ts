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
 * - ~~le téléphone de BTRY~~ [2026-11-19 : donné par la propriétaire] et
 *   celui de l'hébergeur (LCEN, art. 1-1 depuis la loi SREN du 21 mai 2024) ;
 * - ~~le directeur de la publication (le gérant, par défaut)~~ [2026-11-19 :
 *   le gérant, confirmé par la propriétaire].
 */
export const EDITEUR = {
  denomination: "BTRY",
  forme: "société à responsabilité limitée (SARL)",
  capital: "4\u00a0000\u00a0€",
  // [2026-11-23 : siège donné par la propriétaire ; il était « 301 avenue
  // du Pascalet, ZA de la Montée Rouge, 30310 Vergèze, France », repris des
  // textes de RiskBoard. À confirmer : le greffe (RCS) et le SIRET, qui
  // suivent normalement le siège.]
  siege: "C/O Guya Call, Bâtiment Horizon, Boîte 4, rue de l'Astrolabe, 97354 Remire-Montjoly, Guyane",
  rcs: "RCS Nîmes 934\u00a0765\u00a0769",
  siret: "934\u00a0765\u00a0769\u00a000021",
  tva: "FR62934765769",
  ape: "71.12B",
  gerant: "Julien Chantoin",
  email: "contact@btry.fr",
  telephone: "04\u00a066\u00a071\u00a007\u00a003",
} as const;

export const HEBERGEUR = {
  nom: "Clever Cloud SAS",
  adresse: "3 rue de l'Allier, 44000 Nantes, France",
  site: "https://www.clever-cloud.com",
  telephone: "[à compléter]",
} as const;

/** « BTRY, SARL au capital de 4 000 €, … » : l'identité en une phrase. */
export const IDENTITE_EDITEUR = `${EDITEUR.denomination}, ${EDITEUR.forme} au capital de ${EDITEUR.capital}, dont le siège est situé ${EDITEUR.siege}, immatriculée au ${EDITEUR.rcs}, TVA intracommunautaire ${EDITEUR.tva}`;
