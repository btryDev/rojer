import type { ReactNode } from "react";

import {
  LABEL_ITEM,
  categorieDeItem,
  type SidebarItemId,
} from "@/components/layout/sidebar-nav";

import { TITRE_EN_TETE } from "./titres";
import { TEINTE_SECTION } from "./teintes";

/**
 * Le cadre de l'en-tête de page, sans ses dessins : titre, descriptif,
 * bascule, et le panneau teinté de la section. `EnTetePage` y pose le dessin
 * de la page ; le repli de chargement (`ChargementSection`) le laisse vide.
 *
 * Séparé le 2026-10-28 (plan performance, lot 3) : le repli est un composant
 * client, et importer les dessins pour ne pas les montrer aurait envoyé leurs
 * ≈ 46 Ko de source au navigateur sur chaque écran de l'établissement.
 *
 * La règle de l'en-tête est écrite sur `EnTetePage`.
 */
export function CadreEnTete({
  item,
  titre,
  description,
  children,
  panneau,
}: {
  item: Exclude<SidebarItemId, "tableau">;
  titre?: string;
  description: ReactNode;
  children?: ReactNode;
  /** Le contenu du panneau teinté ; `null` : pas de panneau, l'en-tête tient
   *  sur une colonne. */
  panneau: ReactNode | null;
}) {
  const fond = TEINTE_SECTION[categorieDeItem(item) ?? "tableau"];
  const avecPanneau = panneau !== null;

  return (
    // `flex-none` n'est pas décoratif : la colonne de contenu du shell est un
    // `flex flex-col` de hauteur contrainte (`h-screen`), où `flex-shrink`
    // vaut 1 et porte sur la HAUTEUR. Sans lui, l'en-tête est écrasé sous son
    // contenu et l'illustration est coupée par le bloc suivant.
    <header
      className={
        "sous-la-gelule grid flex-none bg-[color:var(--board-card)] " +
        (avecPanneau ? "md:min-h-[320px] md:grid-cols-[minmax(0,1fr)_minmax(340px,42%)]" : "")
      }
    >
      {fond ? (
        <div aria-hidden className="h-1.5 md:hidden" style={{ backgroundColor: fond }} />
      ) : null}
      <div className="flex min-w-0 flex-col justify-center pb-10 pl-[var(--board-gutter)] pr-[var(--board-gutter)] pt-20 md:py-10 md:pr-12">
        <h1 className="board-titre m-0 text-[clamp(34px,4vw,50px)] leading-[1.06] tracking-[-0.035em]">
          {titre ?? TITRE_EN_TETE[item] ?? LABEL_ITEM[item]}
        </h1>
        <p className="m-0 mt-3.5 max-w-[46ch] text-[clamp(16px,1.4vw,18px)] leading-[1.55] text-[color:var(--board-slate-ink)]">
          {description}
        </p>
        {children ? (
          <div className="mt-6 flex flex-col items-start gap-4">{children}</div>
        ) : null}
      </div>
      {/* Le panneau passe sous la gélule de compte : un fond y a droit. */}
      {avecPanneau ? (
        <div
          data-teinte-section
          className="hidden items-end justify-center overflow-hidden px-8 pb-5 pt-16 md:flex [&>*]:max-w-full"
          style={fond ? { backgroundColor: fond } : undefined}
        >
          {panneau}
        </div>
      ) : null}
    </header>
  );
}
