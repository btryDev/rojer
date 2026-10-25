"use client";

// La carte du board : fond, filet, ombre, rayon — et, sur le tableau de bord,
// la coiffe teintée de la section dont elle est l'extrait.
//
// Sortie de `widgets/impl/board.tsx` le 2026-10-25 pour que `BentoCell` et
// les widgets qui posaient `.carte-board` à la main la partagent : une coiffe
// que seule une partie des cartes portait aurait fait lire les autres comme
// hors section.

import { useSectionDuWidget } from "@/components/dashboard/widgets/section-du-widget";
import { TEINTE_SECTION } from "@/components/entete-page/teintes";
import { LABEL_CATEGORIE } from "@/components/layout/sidebar-nav";

/**
 * Le design distingue deux rayons : 26 px sur les cartes-chiffre, 30 px
 * sur les grands blocs. Le rayon est donc un paramètre, pas une classe
 * qu'on écraserait depuis l'appelant (l'ordre des classes Tailwind ne
 * décide pas de la priorité).
 */
export function CarteBoard({
  children,
  className = "",
  rayon = 30,
  ton = "clair",
}: {
  children: React.ReactNode;
  className?: string;
  rayon?: 26 | 30;
  /**
   * Les blocs sombres sont l'exception : la préparation d'un contrôle
   * (la porte à pousser quand un inspecteur se présente) et, hors
   * défaut, la carte-compteur « Prochaine échéance ». Le reste du board
   * les entoure et les explique ; leur position par défaut vient de
   * `ORDRE_DEFAUT` (registry), et l'utilisateur peut les déplacer.
   *
   * Sur fond noir, aucune encre foncée ne passe : le texte est blanc ou
   * ardoise, et les champs colorés restent les champs clairs de la
   * palette — ils y gagnent même en présence.
   */
  ton?: "clair" | "sombre";
}) {
  const section = useSectionDuWidget();
  const teinte = section ? TEINTE_SECTION[section] : null;
  return (
    <div
      className={
        // Sur le fond du board (blanc depuis le 2026-10-25), l'aplat ne
        // sépare rien : c'est le
        // filet cheveu et l'ombre douce qui détachent la carte — bento.
        "flex h-full flex-col " +
        (ton === "sombre"
          ? "bg-[color:var(--board-ink)] shadow-[0_1px_2px_rgba(13,18,36,.06),0_16px_40px_-16px_rgba(13,18,36,.22)] "
          : "bg-[color:var(--board-card)] ring-1 ring-[color:rgba(13,18,36,.10)] shadow-[0_1px_2px_rgba(13,18,36,.04),0_12px_32px_-14px_rgba(13,18,36,.10)] ") +
        (rayon === 26 ? "rounded-[26px]" : "rounded-[30px]")
      }
    >
      {/* La coiffe : la section du rail dont la carte est l'extrait, dans sa
          teinte (2026-10-25, décision de la propriétaire). Elle dit de quoi
          parle la carte avant son titre — le rôle que tenait le sur-titre
          bleu « famille », retiré pour ne pas dire deux fois la même chose.
          Pas de `overflow-hidden` sur la carte pour l'arrondir : il couperait
          les menus et les infobulles des widgets. */}
      {section && teinte ? (
        <p
          className={
            "board-eyebrow m-0 flex-none px-7 py-2.5 text-[color:var(--board-slate-ink)] " +
            (rayon === 26 ? "rounded-t-[26px]" : "rounded-t-[30px]")
          }
          style={{ background: teinte }}
        >
          {LABEL_CATEGORIE[section]}
        </p>
      ) : null}
      <div className={"flex min-h-0 flex-1 flex-col " + className}>
        {children}
      </div>
    </div>
  );
}
