// Les visites guidées en vidéo : une par page d'entrée, dans une table
// plutôt qu'en props éparses (même choix que `entete-page/titres.ts`). Une
// page qui en reçoit une n'écrit qu'une ligne, `<VisiteGuidee cle="…" />`.
//
// Les fichiers vivent dans `public/videos/`, nommés d'après la clé : la
// vidéo, son image d'aperçu pleine taille et la vignette de l'îlot. La garde
// `visites.test.ts` vérifie qu'ils existent.

export type CleVisite = "equipements";

export type Visite = {
  /** Durée annoncée, « 50 s ». */
  duree: string;
  /** Titre de l'îlot. */
  titre: string;
  /** Titre du panneau qui porte la vidéo. */
  titreVideo: string;
  /** Les étapes montrées : lues par les lecteurs d'écran, la vidéo n'ayant
   *  ni voix ni sous-titres (seulement une musique). */
  etapes: string[];
};

export const VISITES: Record<CleVisite, Visite> = {
  equipements: {
    duree: "50 s",
    titre: "Comment ça marche ?",
    titreVideo: "Vos équipements, en quatre gestes",
    etapes: [
      "Déclarer un appareil",
      "Voir ce qui lui manque",
      "Déposer le rapport du dernier contrôle",
      "Prendre rendez-vous pour le suivant",
    ],
  },
};

export function fichiersVisite(cle: CleVisite) {
  return {
    video: `/videos/visite-${cle}.mp4`,
    affiche: `/videos/visite-${cle}.jpg`,
    vignette: `/videos/visite-${cle}-vignette.jpg`,
  };
}

/**
 * Le cookie qui retient « Ne plus afficher », un par visite. Lu au serveur
 * (`VisiteGuidee`) pour ne pas rendre l'îlot du tout — sans quoi il
 * apparaîtrait puis disparaîtrait à l'hydratation. Valable sur tout le compte
 * (`Path=/`) : qui a vu la visite d'une page ne veut pas qu'on la lui
 * repropose sur un autre établissement.
 */
export function cookieVisiteMasquee(cle: CleVisite): string {
  return `rojer-visite-masquee-${cle}`;
}
