import type { ReactNode } from "react";

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
 * même chose, deux tailles de titre. On lui donne l'entrée du rail ; il en
 * déduit la section (donc la teinte) et le titre.
 *
 * **Ce qu'il porte** : ce qu'on voit (le titre), ce qu'on peut y faire (le
 * descriptif, deux phrases au plus), et la SEULE commande qui change la vue
 * de la page (`children` : « Par mois / Par équipement », « En permanence /
 * En cas de… »). Année, filtres, aide restent sur le bloc qu'ils règlent, et
 * sous une autre forme (décision de la propriétaire du 2026-10-25). À droite,
 * l'illustration — le seul élément fort ; tout le reste est sobre.
 *
 * **Pas de fil d'Ariane** (même décision, maquette « v3 » du Calendrier) :
 * une page d'entrée du rail est rangée sous l'établissement, ce que la
 * sidebar et la gélule de compte disent déjà.
 *
 * **La teinte ne colore que le panneau de l'illustration**, sur toute la
 * hauteur et jusqu'au bord droit ; le texte reste sur la surface de carte
 * (« variante A2 » : posée sur un fond teinté de toute la largeur,
 * l'illustration flottait à côté du texte). Sur téléphone, où le panneau
 * disparaît, un liseré de la teinte garde le repère de section.
 *
 * **Le coin haut droit est réservé** à la gélule de compte (`BarreCompte`),
 * qui flotte au-dessus : sur ordinateur elle passe sur le panneau (un fond y
 * a droit) ; sur téléphone, la colonne de texte commence sous elle.
 */
export function EnTetePage({
  item,
  titre,
  description,
  children,
}: {
  item: Exclude<SidebarItemId, "tableau">;
  /** Le nom du rail par défaut — le titre et le menu disent la même chose. */
  titre?: string;
  /** Ce qu'on voit, puis ce qu'on peut y faire. Contenu en ligne seulement :
   *  il est rendu dans un paragraphe. */
  description: ReactNode;
  /** La bascule de vue de la page, et rien d'autre. */
  children?: ReactNode;
}) {
  const fond = TEINTE_SECTION[categorieDeItem(item) ?? "tableau"];

  return (
    // `flex-none` n'est pas décoratif : la colonne de contenu du shell est un
    // `flex flex-col` de hauteur contrainte (`h-screen`), où `flex-shrink`
    // vaut 1 et porte sur la HAUTEUR. Sans lui, l'en-tête est écrasé sous son
    // contenu et l'illustration est coupée par le bloc suivant.
    <header className="grid flex-none bg-[color:var(--board-card)] md:min-h-[320px] md:grid-cols-[minmax(0,1fr)_minmax(340px,42%)]">
      {fond ? (
        <div aria-hidden className="h-1.5 md:hidden" style={{ backgroundColor: fond }} />
      ) : null}
      <div className="flex min-w-0 flex-col justify-center pb-10 pl-[var(--board-gutter)] pr-[var(--board-gutter)] pt-20 md:py-10 md:pr-12">
        <h1 className="board-titre m-0 text-[clamp(34px,4vw,50px)] leading-[1.06] tracking-[-0.035em]">
          {titre ?? LABEL_ITEM[item]}
        </h1>
        <p className="m-0 mt-3.5 max-w-[46ch] text-[clamp(16px,1.4vw,18px)] leading-[1.55] text-[color:var(--board-slate-ink)]">
          {description}
        </p>
        {children ? (
          <div className="mt-6 flex flex-col items-start gap-4">{children}</div>
        ) : null}
      </div>
      {/* Le panneau passe sous la gélule de compte : un fond y a droit. */}
      <div
        data-teinte-section
        className="hidden items-end justify-center overflow-hidden px-8 pb-5 pt-16 md:flex [&>*]:max-w-full"
        style={fond ? { backgroundColor: fond } : undefined}
      >
        <IllustrationEnTete item={item} />
      </div>
    </header>
  );
}
