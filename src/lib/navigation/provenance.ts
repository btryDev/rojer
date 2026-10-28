// Provenance : d'où l'on vient, et donc où « retour » doit ramener.
//
// Le problème. Un même écran de détail est atteignable depuis plusieurs
// portes : une action corrective s'ouvre depuis le plan d'actions, depuis
// le calendrier, depuis une vérification, depuis un widget du tableau de
// bord. Chaque page de détail portait pourtant un lien de retour écrit en
// dur vers son parent canonique — « ← Plan d'actions ». Le dirigeant qui
// arrivait du calendrier était donc éjecté ailleurs, et perdait au passage
// la vue et les filtres qu'il avait posés.
//
// La règle. Le lien qui mène à un détail emporte l'écran d'où il part,
// dans un paramètre d'URL (`?de=/etablissements/…/calendrier?vue=…`). La
// page de détail le lit et fait deux choses : le retour ramène à cet
// écran, dans l'état exact où il a été quitté ; le parent canonique reste
// offert en second lien, jamais supprimé.
//
// Pourquoi l'URL et non un état client. Trois raisons : le rendu est
// serveur (le fil de retour est correct au premier octet, sans clignotement),
// un lien partagé ou un rafraîchissement conservent la provenance, et rien
// n'est deviné — `document.referrer` et `router.back()` ne savent pas dire
// *comment s'appelle* l'écran d'où l'on vient, donc ne savent pas l'écrire.
//
// Ce que la provenance n'est pas : un historique. Un seul saut est retenu
// (`origineDepuis` retire le `de` entrant avant de le réémettre), sinon
// l'URL grossirait sans fin en s'enroulant sur elle-même. Au-delà d'un
// saut, c'est au bouton « précédent » du navigateur de faire son métier.

import {
  LABEL_ITEM,
  deduireActif,
  type SidebarItemId,
} from "@/components/layout/sidebar-nav";

/** Nom du paramètre d'URL. Court, parce qu'il s'ajoute à tous les liens. */
export const PARAM_PROVENANCE = "de";

/** Un fil de retour : où revenir, et sous quel nom l'annoncer. */
export type Provenance = {
  href: string;
  label: string;
};

/**
 * Le nom d'un écran de détail, quand la provenance ne pointe pas sur une
 * liste. « Vérification » plutôt que « Calendrier » : `deduireActif` range
 * `/verifications/{id}` sous l'entrée Calendrier du rail — c'est juste pour
 * surligner le rail, ça ne l'est plus pour nommer un lien de retour.
 *
 * Les libellés restent génériques et fermés : jamais le titre de l'objet.
 * Un intitulé qui viendrait de l'URL serait un texte contrôlé par
 * l'appelant, affiché comme s'il venait du produit.
 */
const LABEL_DETAIL: Partial<Record<SidebarItemId, string>> = {
  calendrier: "Vérification",
  actions: "Action",
  prestataires: "Prestataire",
  equipements: "Équipement",
  "permis-feu": "Permis de feu",
  "plan-prevention": "Plan de prévention",
  duerp: "DUERP",
};

/** Garde-fou : une URL de provenance plus longue est du bruit, pas un chemin. */
const LONGUEUR_MAX = 512;

/**
 * Découpe un chemin interne en (pathname, search), ou rend `null` si la
 * valeur n'est pas un chemin relatif à ce site. Le rejet couvre les URL
 * absolues (`https://…`), les protocol-relative (`//hôte`), les
 * antislashs (que certains navigateurs normalisent en `/`) et tout ce qui
 * ne commence pas par `/`.
 */
export function decouperCheminInterne(
  brut: string,
): { pathname: string; search: string } | null {
  if (!brut || brut.length > LONGUEUR_MAX) return null;
  if (!brut.startsWith("/") || brut.startsWith("//")) return null;
  if (brut.includes("\\")) return null;
  // Base inerte : si `brut` porte son propre hôte, l'origine change et on
  // le voit. Le domaine `.invalid` est réservé, il ne résout nulle part.
  const base = "https://provenance.invalid";
  let u: URL;
  try {
    u = new URL(brut, base);
  } catch {
    return null;
  }
  if (u.origin !== base) return null;
  return { pathname: u.pathname, search: u.search };
}

/** Les segments du chemin situés sous `/etablissements/{id}`, ou `null`
 *  si le chemin sort de l'établissement courant. */
export function segmentsSousEtablissement(
  pathname: string,
  etablissementId: string,
): string[] | null {
  const base = `/etablissements/${etablissementId}`;
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return null;
  return pathname
    .slice(base.length)
    .split("/")
    .filter((s) => s.length > 0);
}

/** Le nom d'un écran de l'établissement, liste ou détail. */
export function nommerEcran(
  pathname: string,
  etablissementId: string,
): string | null {
  const segments = segmentsSousEtablissement(pathname, etablissementId);
  if (!segments) return null;
  const item = deduireActif(pathname, etablissementId);
  // `deduireActif` rend « tableau » pour la racine de l'établissement, mais
  // aussi, par défaut, pour un chemin qu'il ne reconnaît pas. Sous
  // l'établissement, un premier segment inconnu n'est donc pas le tableau
  // de bord : c'est une route qui n'existe pas — un `de` forgé, ou une
  // route renommée depuis. Mieux vaut retomber sur le parent canonique que
  // d'afficher « ← Tableau de bord » au-dessus d'un lien qui mène à un 404.
  if (segments.length > 0 && item === "tableau") return null;
  // Deux segments ou plus : on est sous une liste, donc sur une fiche.
  if (segments.length >= 2) return LABEL_DETAIL[item] ?? LABEL_ITEM[item];
  return LABEL_ITEM[item];
}

/**
 * Lit la provenance portée par les paramètres d'URL de la page courante.
 * Rend `null` dès que la valeur n'est pas un écran de cet établissement —
 * un `de` forgé ne peut donc pas servir de tremplin vers l'extérieur, ni
 * vers le dossier d'un autre établissement.
 */
export function lireProvenance(
  brut: string | string[] | undefined,
  etablissementId: string,
): Provenance | null {
  const valeur = Array.isArray(brut) ? brut[0] : brut;
  if (typeof valeur !== "string") return null;
  const chemin = decouperCheminInterne(valeur);
  if (!chemin) return null;
  const label = nommerEcran(chemin.pathname, etablissementId);
  if (!label) return null;
  return { href: `${chemin.pathname}${chemin.search}`, label };
}

/**
 * L'écran courant, tel qu'il sera réémis dans les liens qu'il pose.
 *
 * Le `de` entrant est retiré : une page de détail atteinte depuis le
 * calendrier ne réexpédie pas le calendrier dans ses propres liens, elle
 * s'annonce elle-même. C'est ce qui borne la chaîne à un saut.
 */
export function origineDepuis(
  pathname: string,
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): string {
  const p = new URLSearchParams();
  if (params instanceof URLSearchParams) {
    for (const [cle, valeur] of params) p.append(cle, valeur);
  } else {
    for (const [cle, valeur] of Object.entries(params)) {
      if (valeur === undefined) continue;
      for (const v of Array.isArray(valeur) ? valeur : [valeur]) p.append(cle, v);
    }
  }
  p.delete(PARAM_PROVENANCE);
  const q = p.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/** Le chemin nu d'un href, sans query ni fragment. */
function chemin(href: string): string {
  return href.split(/[?#]/, 1)[0];
}

/**
 * La provenance, mais seulement si elle mène ailleurs que le parent
 * canonique. Arriver du plan d'actions sur une action ne mérite pas deux
 * liens vers le plan d'actions : le fil de retour se contente du parent —
 * enrichi, lui, des filtres que la liste portait.
 */
export function retourDistinct(
  provenance: Provenance | null,
  canoniqueHref: string,
): Provenance | null {
  if (!provenance) return null;
  return chemin(provenance.href) === chemin(canoniqueHref) ? null : provenance;
}

/**
 * Ajoute la provenance à un lien sortant. Sans origine, le lien est rendu
 * inchangé : mieux vaut un retour canonique qu'un paramètre vide. Un lien
 * qui reste sur l'écran courant n'est pas annoté non plus — se dire à
 * soi-même d'où l'on vient n'apprend rien et salit l'URL.
 */
export function avecProvenance(
  href: string,
  origine: string | null | undefined,
): string {
  if (!origine) return href;
  if (chemin(href) === chemin(origine)) return href;
  // Le fragment ferme l'URL : un paramètre ajouté après lui atterrirait
  // *dans* l'ancre, et ne serait jamais lu.
  const diese = href.indexOf("#");
  const avant = diese === -1 ? href : href.slice(0, diese);
  const fragment = diese === -1 ? "" : href.slice(diese);
  const separateur = avant.includes("?") ? "&" : "?";
  const param = `${PARAM_PROVENANCE}=${encodeURIComponent(origine)}`;
  return `${avant}${separateur}${param}${fragment}`;
}
