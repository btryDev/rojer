/**
 * Les gestes de la fiche du plan, sur la ligne des onglets. ~~Pilules
 * blanches (maquette V2)~~ [2026-11-21, maquette « Bloc Suivi / Bloc Plan »
 * validée : des liens texte, sans fond ; le PDF en bleu, « Supprimer » en
 * encre rouge (`PlanActionsButtons`)]. Hors du module client des boutons :
 * la page, rendue au serveur, les lit aussi — une constante exportée d'un
 * module `"use client"` n'y arrive pas comme une chaîne.
 */
export const GESTE_FICHE =
  "inline-flex h-auto min-h-10 items-center rounded-full border-0 bg-transparent px-1 text-[13.5px] font-normal normal-case tracking-normal text-[color:var(--board-slate-ink)] shadow-none ring-0 underline-offset-4 transition-colors hover:bg-transparent hover:underline disabled:opacity-60";

/**
 * Une section de l'onglet « Suivi » (2026-11-21, « toujours le même bloc ») :
 * dans la carte unique de la fiche, sous la barre d'onglets. ~~Séparée de la
 * précédente par un filet ; les sections d'action requise portent, à la place
 * du filet, leur trait de couleur.~~ [2026-11-21, maquette « Bloc Suivi » :
 * l'action requise est une carte intérieure au-dessus ; les Signatures la
 * suivent sans filet, l'Historique en porte un (`FILET_SUIVI`).]
 */
export const SECTION_SUIVI = "px-6 py-7 md:px-10";
export const FILET_SUIVI = "border-t border-[color:var(--board-slate-pale)]";
