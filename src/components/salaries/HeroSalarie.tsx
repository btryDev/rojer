import type { ReactNode } from "react";
import Image from "next/image";
import { DOSSIER_ILLUSTRATIONS, FOND_TEINTE } from "@/lib/etats-permanents/illustrations";

/**
 * La tête de la fiche d'une personne (refonte du 2026-10-24) : un portrait,
 * son nom, son poste, son entrée. Elle se pose dans le bandeau d'`EcranFiche`,
 * comme celle d'un équipement : une personne ouvre un chapitre, elle ne
 * prolonge pas une ligne.
 *
 * Le portrait est un buste neutre dans le trait des illustrations de « Ce qui
 * doit être en place » (planche 3, `personne.png`) — sans visage, sans genre,
 * sans âge : Rojer ne sait de
 * cette personne que son nom et son poste, et un dessin qui en dirait plus
 * affirmerait ce qu'on ignore.
 */
export function PortraitPersonne({ taille = 84 }: { taille?: number }) {
  return (
    <span
      aria-hidden
      className="grid flex-none place-items-center"
      style={{
        width: taille,
        height: taille,
        borderRadius: Math.round(taille * 0.34),
        background: FOND_TEINTE.organisation,
      }}
    >
      <Image
        src={`${DOSSIER_ILLUSTRATIONS}/personne.png`}
        alt=""
        width={Math.round(taille * 0.78)}
        height={Math.round(taille * 0.78)}
        priority
      />
    </span>
  );
}

export function HeroSalarie({
  nom,
  surtitre,
  chapeau,
  pastilles,
  actions,
}: {
  nom: string;
  surtitre: string;
  chapeau?: ReactNode;
  pastilles?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-5">
      <PortraitPersonne />
      <div className="min-w-[240px] flex-1">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          {surtitre}
        </p>
        <h1 className="board-titre m-0 mt-2 max-w-[26ch] text-[clamp(24px,2.4vw,30px)]">
          {nom}
        </h1>
        {chapeau ? (
          <p className="m-0 mt-2.5 max-w-[66ch] text-[14px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            {chapeau}
          </p>
        ) : null}
        {pastilles ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-2">{pastilles}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-none flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
