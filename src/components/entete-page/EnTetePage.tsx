import type { ReactNode } from "react";

import { FilAriane, type Crumb } from "@/components/navigation/FilAriane";
import {
  LABEL_ITEM,
  categorieDeItem,
  type SidebarItemId,
} from "@/components/layout/sidebar-nav";

import { IllustrationEnTete } from "./illustrations";
import { TEINTE_SECTION } from "./teintes";

/**
 * L'en-tête des pages d'entrée du rail — un seul pour toutes (2026-10-25).
 *
 * Il remplace les en-têtes écrits page par page : sept façons de faire la
 * même chose, deux tailles de titre, des fils d'Ariane recopiés en dur et
 * parfois faux. On lui donne l'entrée du rail ; il en déduit la section (donc
 * la teinte), le titre et le fil.
 *
 * **Ce qu'il porte** : où l'on est (le fil), ce qu'on voit (le titre), ce
 * qu'on peut y faire (le descriptif, deux phrases au plus), puis ce que la
 * page y ajoute (`children` : onglets, actions, aide, alertes). À droite,
 * l'illustration de la page — le seul élément fort ; tout le reste est sobre.
 *
 * **Le coin haut droit est réservé** à la gélule de compte (`BarreCompte`),
 * qui flotte au-dessus. Le fil occupe la ligne de la gélule, à gauche ; la
 * colonne de droite ne porte que le panneau teinté et son illustration, qui
 * ont le droit de passer dessous. Aucun texte ni commande ne peut donc s'y
 * glisser. Sur téléphone, où le panneau disparaît, la ligne du fil garde une
 * marge à droite.
 */
export function EnTetePage({
  item,
  etablissement,
  crumbs,
  titre,
  description,
  children,
}: {
  item: Exclude<SidebarItemId, "tableau">;
  etablissement: { id: string; raisonDisplay: string };
  /** Le fil complet, pour une sous-page (un onglet qui a son adresse). Par
   *  défaut : l'établissement, puis l'entrée du rail. */
  crumbs?: Crumb[];
  /** Le nom du rail par défaut — le titre et le menu disent la même chose. */
  titre?: string;
  /** Ce qu'on voit, puis ce qu'on peut y faire. Contenu en ligne seulement :
   *  il est rendu dans un paragraphe. */
  description: ReactNode;
  children?: ReactNode;
}) {
  const fond = TEINTE_SECTION[categorieDeItem(item) ?? "tableau"];
  const fil = crumbs ?? [
    { href: `/etablissements/${etablissement.id}`, label: etablissement.raisonDisplay },
    { label: LABEL_ITEM[item] },
  ];

  return (
    // `flex-none` n'est pas décoratif : la colonne de contenu du shell est un
    // `flex flex-col` de hauteur contrainte (`h-screen`), où `flex-shrink`
    // vaut 1 et porte sur la HAUTEUR. Sans lui, l'en-tête est écrasé sous son
    // contenu et l'illustration est coupée par le bloc suivant.
    //
    // La teinte ne colore que le panneau de l'illustration, sur toute la
    // hauteur et jusqu'au bord droit ; le texte reste sur la surface de carte
    // (choix de la propriétaire du 2026-10-25, « variante A2 » : posée sur un
    // fond teinté de toute la largeur, l'illustration flottait à côté du
    // texte). Sur téléphone, où le panneau disparaît, un liseré de la teinte
    // garde le repère de section.
    <header className="grid flex-none border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] md:min-h-[360px] md:grid-cols-[minmax(0,1fr)_minmax(320px,38%)]">
      {fond ? (
        <div aria-hidden className="h-1.5 md:hidden" style={{ backgroundColor: fond }} />
      ) : null}
      <div className="flex min-w-0 flex-col pb-12 pl-[var(--board-gutter)] pr-[var(--board-gutter)] pt-3 md:pr-12">
        {/* 48 px à 12 px du haut : la hauteur et la place de la gélule. */}
        <div className="flex h-12 min-w-0 items-center pr-36 md:pr-0">
          <FilAriane crumbs={fil} />
        </div>
        <h1 className="board-titre m-0 mt-8 text-[clamp(29px,3vw,39px)]">
          {titre ?? LABEL_ITEM[item]}
        </h1>
        <p className="m-0 mt-3 max-w-[62ch] text-[15px] leading-[1.6] text-[color:var(--board-slate-ink)]">
          {description}
        </p>
        {children ? (
          <div className="mt-6 flex flex-col items-start gap-4">{children}</div>
        ) : null}
      </div>
      {/* Le panneau passe sous la gélule de compte : un fond y a droit. */}
      <div
        data-teinte-section
        className="hidden items-end justify-center overflow-hidden px-8 pb-8 pt-20 md:flex [&>*]:max-w-full"
        style={fond ? { backgroundColor: fond } : undefined}
      >
        <IllustrationEnTete item={item} />
      </div>
    </header>
  );
}
