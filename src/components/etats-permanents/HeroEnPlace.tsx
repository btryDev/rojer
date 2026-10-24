import Image from "next/image";
import type { ReactNode } from "react";
import { FilAriane } from "@/components/navigation/FilAriane";
import { LABEL_ITEM } from "@/components/layout/sidebar-nav";
import { OngletsEnPlace } from "./OngletsEnPlace";
import { LABEL_ONGLET_EN_CAS_DE } from "@/lib/etats-permanents/libelles-onglets";

const PHOTO_HERO = { src: "/photos/hero-en-place.jpg" } as const;

/**
 * L'en-tête commun aux deux onglets de « Ce qui doit être en place »
 * (revue du 2026-10-24) : le même titre, la même photo, les onglets au même
 * endroit — changer d'onglet ne doit pas se lire comme changer de page.
 *
 * Le hero (2026-10-20) : pleine largeur, le texte à gauche dans la gouttière
 * du board, la photo jusqu'au bord droit. Photo décorative — ce qu'elle
 * évoque est écrit à côté (`public/photos/README.md`).
 */
export function HeroEnPlace({
  etablissementId,
  raisonDisplay,
  actif,
  decoupe,
  intro,
  outils,
  apres,
}: {
  etablissementId: string;
  raisonDisplay: string;
  actif: "permanence" | "evenement";
  /** La découpe de l'onglet « En permanence », reconduite d'un onglet à l'autre. */
  decoupe?: "geste";
  intro: ReactNode;
  /** La ligne sous les onglets : l'aide, le compteur. */
  outils: ReactNode;
  /** Ce qui suit la ligne d'outils (la fiche incomplète). */
  apres?: ReactNode;
}) {
  const base = `/etablissements/${etablissementId}`;
  return (
    <header className="grid border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex min-w-0 flex-col justify-center gap-5 py-9 pl-[var(--board-gutter)] pr-[var(--board-gutter)] md:pr-10">
        <div className="min-w-0">
          <FilAriane
            crumbs={
              actif === "permanence"
                ? [
                    { href: base, label: raisonDisplay },
                    { label: LABEL_ITEM["etats-permanents"] },
                  ]
                : [
                    { href: base, label: raisonDisplay },
                    { href: `${base}/etats-permanents`, label: LABEL_ITEM["etats-permanents"] },
                    { label: LABEL_ONGLET_EN_CAS_DE },
                  ]
            }
          />
          <h1 className="board-titre m-0 text-[clamp(29px,3vw,39px)]">
            {LABEL_ITEM["etats-permanents"]}
          </h1>
          <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            {intro}
          </p>
          <div className="mt-5">
            <OngletsEnPlace etablissementId={etablissementId} actif={actif} decoupe={decoupe} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">{outils}</div>
        {apres}
      </div>
      <figure className="relative m-0 hidden min-h-[300px] md:block">
        <Image
          src={PHOTO_HERO.src}
          alt=""
          fill
          sizes="(min-width: 768px) 55vw, 100vw"
          className="object-cover"
          priority
        />
      </figure>
    </header>
  );
}
