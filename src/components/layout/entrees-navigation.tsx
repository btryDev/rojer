"use client";

// Les entrées de la navigation, partagées par le rail de l'ordinateur
// (`AppSidebar`) et la barre du bas du téléphone (`NavigationMobile`) : même
// contrat d'accessibilité, mêmes états, seules les mesures changent. Sorties
// d'`AppSidebar` le 2026-10-29 pour ne pas tenir deux copies.

import Link from "next/link";
import type { NavItem, RailCategorie, SidebarItemId } from "./sidebar-nav";

/**
 * Entrée de rail : un bouton qui ouvre le panneau de sa catégorie, sans
 * naviguer — c'est l'entrée choisie dans le panneau qui mène à une page
 * (2026-10-28, ADR-030 amendée). ~~Toujours un lien, panneau ou pas
 * (ADR-015).~~
 */
/** Les mesures d'une entrée : le rail (88 px de large) ou la barre du bas du
 *  téléphone, où l'entrée prend un cinquième de l'écran et 56 px de haut. */
const MESURES = {
  rail: {
    bouton: "w-full gap-1.5 py-2",
    tuile: "size-9",
    pastille: "-right-0.5 -top-0.5",
    libelle: "text-[9px] tracking-[0.02em]",
  },
  bas: {
    bouton: "min-h-[56px] min-w-0 flex-1 justify-center gap-1",
    tuile: "h-8 w-11",
    pastille: "right-1 top-0.5",
    libelle: "text-[10.5px]",
  },
} as const;

export function RailEntree({
  cat,
  surPage,
  ouverte,
  onClick,
  variante = "rail",
}: {
  cat: RailCategorie;
  /** La page courante appartient à cette catégorie. */
  surPage: boolean;
  /** Son panneau est celui qui est ouvert. */
  ouverte: boolean;
  onClick: () => void;
  variante?: keyof typeof MESURES;
}) {
  const allume = surPage || ouverte;
  const m = MESURES[variante];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={ouverte}
      // `aria-current` dit où l'on est ; l'ouverture d'un panneau, elle, est
      // dite par `aria-expanded`.
      aria-current={surPage ? "page" : undefined}
      // PAS d'`aria-label`. Il portait le libellé LONG (« Santé-sécurité »,
      // « Documentation ») alors que la tuile affiche le court (« Sécurité »,
      // « Documents ») : le nom accessible ne contenait pas le texte visible,
      // ce que WCAG 2.5.3 « Label in Name » interdit. Le libellé long reste
      // là où il y a la place de l'écrire : l'en-tête du panneau, qui nomme
      // aussi sa région (`aria-label={panneau.label}`).
      className={`group flex flex-col items-center rounded-xl transition-colors hover:bg-white/10 ${m.bouton}`}
    >
      <TuileIcone cat={cat} pleine={allume} m={m} />
      <RailLibelle cat={cat} allume={allume} m={m} />
    </button>
  );
}

type Mesures = (typeof MESURES)[keyof typeof MESURES];

function TuileIcone({ cat, pleine, m }: { cat: RailCategorie; pleine: boolean; m: Mesures }) {
  return (
    <span
      className={
        `relative grid ${m.tuile} place-items-center rounded-xl transition-colors ` +
        (pleine
          ? "bg-white text-[color:var(--board-ink)]"
          : "text-white/60 group-hover:text-white")
      }
    >
      <cat.Icon aria-hidden className="size-[18px]" />
      {cat.alert ? (
        <span
          aria-hidden
          className={`absolute ${m.pastille} size-2 rounded-full bg-[color:var(--board-signal-mark)] ring-2 ring-[color:var(--board-ink)]`}
        />
      ) : null}
    </span>
  );
}

function RailLibelle({ cat, allume, m }: { cat: RailCategorie; allume: boolean; m: Mesures }) {
  return (
    <span
      className={
        // `leading-[1.35]` et non `leading-none` : à 9 px, une boîte de ligne
        // haute de 9 px ne contient pas les accents. Comme `truncate` pose
        // `overflow: hidden`, ils étaient rognés — le rail affichait « A
        // faire » là où le lien et le panneau disent « À faire ». Le texte
        // était juste depuis le début (`labelCourt`), c'est le rendu qui
        // mangeait l'accent. Même cause exactement que les cartes de frise du
        // tableau de bord : une boîte trop courte, un `overflow` qui coupe.
        `max-w-full truncate px-0.5 leading-[1.35] ${m.libelle} ` +
        (allume ? "text-white" : "text-white/50 group-hover:text-white")
      }
    >
      {cat.labelCourt}
    </span>
  );
}

export const CLASSES_ITEM =
  "flex w-full items-center gap-3 rounded-full px-3.5 py-[10px] text-[13.5px] transition-colors";
/** Le ton d'une entrée de panneau au repos — repris par « Besoin d'aide ? »
 *  au pied de la feuille du téléphone, qui doit s'aligner sur ses voisines. */
export const TON_ITEM_REPOS = "text-white/60 hover:bg-white/10 hover:text-white";

/**
 * Étiquette d'un registre qui ne concerne pas (encore) l'établissement.
 *
 * « au besoin » plutôt que « à ouvrir » : l'entrée annonce une disponibilité,
 * elle ne réclame rien. Un dirigeant qui n'a pas de travaux par point chaud
 * n'a rien à faire de ce registre, et la sidebar ne doit pas lui inventer une
 * tâche — c'est le contraire de ce que promet « À faire ».
 */
const ETIQUETTE_ETAT: Record<string, string> = {
  "non-ouvert": "au besoin",
  "non-applicable": "non applicable",
};

export function NavLink({
  item,
  actif,
  auChoix,
}: {
  item: NavItem;
  actif: SidebarItemId;
  /** Referme le panneau au clic : le repli à chaque navigation (`AppSidebar`)
   *  ne voit pas un lien vers la page où l'on est déjà, l'adresse ne
   *  changeant pas — le panneau restait ouvert, on croyait n'avoir rien fait. */
  auChoix?: () => void;
}) {
  const isActive = item.id === actif;
  // Un registre qualifié reste un lien : c'est par là qu'on l'ouvre le jour
  // venu, et la page « non applicable » explique et permet de corriger le
  // régime déclaré. Seule sa présentation s'efface.
  const etiquette =
    item.etat && item.etat !== "actif" ? ETIQUETTE_ETAT[item.etat] : null;

  // Destination pas encore implémentée : rendue inerte et étiquetée, pour
  // qu'elle ne se confonde pas visuellement avec un lien réel.
  if (item.bientot) {
    return (
      <span className={CLASSES_ITEM + " text-white/30"} aria-disabled>
        <item.Icon aria-hidden className="size-4 flex-none opacity-70" />
        <span className="min-w-0 flex-1 leading-[1.3]">{item.label}</span>
        <span className="flex-none font-mono text-[9px] uppercase tracking-[0.1em]">
          bientôt
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={auChoix}
      aria-current={isActive ? "page" : undefined}
      className={
        CLASSES_ITEM + " " +
        (isActive
          ? "bg-white font-semibold text-[color:var(--board-ink)]"
          : etiquette
            ? "text-white/35 hover:bg-white/10 hover:text-white/70"
            : TON_ITEM_REPOS)
      }
    >
      <item.Icon
        aria-hidden
        className={
          "size-4 flex-none " +
          (etiquette && !isActive ? "opacity-50" : "opacity-90")
        }
      />
      {/* Le libellé d'abord, son état DESSOUS. L'étiquette partageait la
          ligne et prenait 60 px des 148 disponibles : « Permis de f… ». Une
          seconde information se range sous la première (charte, patron de
          tableau dense), elle ne dispute pas sa largeur au nom de l'écran —
          c'est le nom qui sert à choisir, l'état ne fait que le qualifier. */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="leading-[1.3]">{item.label}</span>
        {etiquette && !isActive ? (
          <span className="mt-[3px] font-mono text-[9px] uppercase leading-none tracking-[0.1em] opacity-80">
            {etiquette}
          </span>
        ) : null}
      </span>
      {item.aMettreAJour ? (
        // Pastille NEUTRE et sans nombre : le compte serait faux, le
        // calendrier n'ayant pas été recalculé (2026-10-13). Le gabarit d'un
        // volume, jamais la couleur du signal.
        <span
          title={item.aMettreAJour}
          className={
            "flex-none rounded-full px-[7px] py-px font-mono text-[11px] " +
            (isActive
              ? "bg-[color:var(--board-ink)]/10 text-[color:var(--board-ink)]"
              : "bg-white/10 text-white/60")
          }
        >
          <span aria-hidden>…</span>
          <span className="sr-only">{item.aMettreAJour}</span>
        </span>
      ) : typeof item.count === "number" && item.count > 0 ? (
        <span
          className={
            "flex-none rounded-full px-[7px] py-px font-mono text-[11px] " +
            (isActive
              ? "bg-[color:var(--board-ink)]/10 text-[color:var(--board-ink)]"
              : item.alert
                ? "bg-[color:var(--board-signal)] text-[color:var(--board-signal-on)]"
                : "bg-white/10 text-white/60")
          }
        >
          {item.count}
        </span>
      ) : null}
    </Link>
  );
}
