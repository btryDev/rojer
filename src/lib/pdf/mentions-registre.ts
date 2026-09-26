// Les articles qui fondent le registre de sécurité, selon le régime.
//
// Les deux PDF du ZIP les imprimaient chacun à sa façon, et aucun selon le
// dossier : le dossier de conformité citait « R. 143-44 CCH (ERP), R. 146-35
// CCH (IGH) » à un bureau qui n'est ni l'un ni l'autre, et le registre
// imprimait R. 143-44 en titre pour tout le monde. Un article cité à qui il ne
// s'adresse pas se lit comme une obligation.
//
// Ce que disent les textes, relus à la source :
//
//  - R. 4323-25 et R. 4323-26 CT — l'employeur consigne les vérifications et
//    annexe les rapports d'un tiers. Côté Code du travail : cités à tous,
//    comme ils l'étaient.
//  - R. 143-44 CCH — le registre de l'ERP. Cité à l'ERP seul.
//  - R. 146-35 CCH (chapitre VI « Immeubles de grande hauteur », section 5
//    « Mesures de contrôle », en vigueur depuis le 1er juillet 2026), relu sur
//    Légifrance le 2026-09-26, deux fois : « Il doit être tenu, par le
//    propriétaire, un registre de sécurité sur lequel sont portés les
//    renseignements indispensables au contrôle de la sécurité. » Cité à l'IGH
//    seul, et avec son débiteur : c'est le PROPRIÉTAIRE qui le tient, pas
//    nécessairement le dirigeant qui lit ce document. Le citer sans le dire
//    lui ferait croire que ce registre-ci en tient lieu.
//
// Module **pur**.

export type RegimeDuRegistre = {
  estERP: boolean;
  estIGH: boolean;
};

/** Pour la ligne « Registre de sécurité » des mentions légales du dossier. */
export function referencesRegistreDossier(r: RegimeDuRegistre): string {
  const refs = ["R. 4323-25 et R. 4323-26 CT"];
  if (r.estERP) refs.push("R. 143-44 CCH (ERP)");
  if (r.estIGH) {
    refs.push("R. 146-35 CCH (IGH, registre tenu par le propriétaire)");
  }
  return refs.join(", ");
}

/** Pour le titre du bloc « Tenue du registre » du registre de sécurité. */
export function referencesRegistreTenue(r: RegimeDuRegistre): string {
  return [
    ...(r.estERP ? ["R. 143-44 CCH"] : []),
    "R. 4323-25 et R. 4323-26 CT",
  ].join(" · ");
}

/**
 * La phrase que le registre de sécurité imprime pour un IGH, `null` sinon.
 *
 * Pas en titre, à côté des articles que ce document met en œuvre : ce
 * document-ci n'est pas le registre de R. 146-35, qui est celui de l'immeuble
 * et de son propriétaire. Il le nomme pour qu'on ne les confonde pas.
 */
export function phraseRegistreIgh(r: RegimeDuRegistre): string | null {
  if (!r.estIGH) return null;
  // ~~« Cet établissement est déclaré immeuble de grande hauteur »~~ —
  // corrigé le 2026-09-26 par la contre-lecture. La case recueillie porte sur
  // le BÂTIMENT (« Immeuble de Grande Hauteur », hauteur > 28 m ou > 50 m) :
  // l'établissement y est situé, il n'est pas l'immeuble.
  return (
    "Cet établissement est situé dans un immeuble déclaré de grande hauteur (IGH). L'article " +
    "R. 146-35 CCH y prévoit un registre de sécurité tenu par le " +
    "propriétaire de l'immeuble ; le présent document n'en tient pas lieu."
  );
}
