// Le bâtiment du hero, et la fiche de l'établissement qui pointe dessus.
//
// **Ce que le dessin dit, et ne dit pas.** L'application ne sait rien du bâti
// — ni hauteur, ni étages, ni forme. Le dessin est l'emblème du genre de lieu
// (`illustrationBatiment`), et les étiquettes s'accrochent à des points fixes
// de chaque planche, les mêmes pour tous les dossiers : elles présentent
// l'établissement, elles ne désignent rien sur le dessin. [2026-10-25 : une
// seule fiche, une seule tige — demande de la propriétaire.]
//
// [2026-10-25] Les étiquettes portaient d'abord les zones et leur charge ;
// retiré à la demande de la propriétaire (« autour du dessin ça n'a pas de
// sens ») : une zone épinglée sur un dessin se lit comme un emplacement. Le
// nom et les caractéristiques de l'établissement sont, eux, vrais du dessin
// entier. Un plan du lieu avait été refusé pour la même raison.

import Image from "next/image";
import { DoorOpen, MapPin, Users } from "lucide-react";
import type { IllustrationBatiment } from "@/lib/etablissements/illustration";
import { libelleRegimeErp } from "@/lib/etablissements/types-erp-affiches";
import type { EtablissementLite } from "../types";

/**
 * Les planches de `public/illustrations/batiments/` : leurs dimensions, et le
 * point d'accroche de la fiche, en pourcentage de l'image — sur le flanc
 * droit du bâtiment, du côté où la fiche est posée. Un `Record` sur le type
 * fermé : une planche ajoutée sans son accroche ne compile pas.
 */
export const PLANCHES: Record<
  IllustrationBatiment,
  { largeur: number; hauteur: number; ancre: readonly [x: number, y: number] }
> = {
  restaurant: { largeur: 507, hauteur: 384, ancre: [78, 48] },
  magasin: { largeur: 461, hauteur: 352, ancre: [80, 52] },
  bureaux: { largeur: 507, hauteur: 413, ancre: [84, 44] },
  hotel: { largeur: 421, hauteur: 476, ancre: [74, 44] },
  "salle-sport": { largeur: 614, hauteur: 376, ancre: [78, 50] },
  local: { largeur: 469, hauteur: 354, ancre: [80, 54] },
};

/**
 * Le monogramme de repli, quand aucun logo n'est déposé.
 *
 * Les initiales des deux premiers mots, ou les deux premières lettres d'un
 * mot unique. Dérivé du nom, donc jamais faux — là où une icône générique
 * de bâtiment aurait fait croire à un logo par défaut.
 *
 * NOTE D'IMPLÉMENTATION — le logo n'est pas encore persisté : `Entreprise`
 * n'a pas de colonne pour lui et aucun écran ne permet d'en déposer un. Le
 * jour où il arrive, il prend la place du monogramme dans la fiche.
 */
export function monogramme(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "—";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

/** Ville d'une adresse « …, 75001 Paris » ; l'adresse entière à défaut. */
function ville(adresse: string): string {
  const fin = adresse.split(",").pop()?.trim() ?? "";
  return /^\d{5}\s+(.+)$/.exec(fin)?.[1] ?? (fin || adresse);
}

export function HeroBatiments({
  etablissement: etab,
  illustration,
}: {
  etablissement: EtablissementLite;
  illustration: IllustrationBatiment;
}) {
  const planche = PLANCHES[illustration];
  const [ax, ay] = planche.ancre;
  const lignes: { cle: string; Icone: typeof Users; texte: string }[] = [
    {
      cle: "regime",
      Icone: DoorOpen,
      // ADR-045 : tous les types déclarés, même forme que le widget
      // d'identité. Hors ERP, le régime travail.
      texte: etab.estERP ? libelleRegimeErp(etab) : "Établissement de travail",
    },
    {
      cle: "effectif",
      Icone: Users,
      texte: `${etab.effectifSurSite} salarié${etab.effectifSurSite > 1 ? "s" : ""} sur site`,
    },
    { cle: "lieu", Icone: MapPin, texte: ville(etab.adresse) },
  ];

  return (
    // `lg:pr-64` réserve la place de la fiche, posée hors de l'image : sans
    // elle, elle débordait du hero et s'y faisait couper.
    <figure className="m-0 mx-auto w-fit max-w-full lg:pr-64">
      <div className="relative w-[clamp(220px,24vw,340px)]">
        {/* Décoratif : tout ce que le dessin évoque est écrit dans la fiche. */}
        <Image
          src={`/illustrations/batiments/${illustration}.webp`}
          alt=""
          aria-hidden
          width={planche.largeur}
          height={planche.hauteur}
          sizes="340px"
          priority
          className="block h-auto w-full select-none"
        />

        {/* La tige : du point d'accroche au bord gauche de la fiche, centrée
            sur sa hauteur. Repère en pourcentage de l'image, trait
            d'épaisseur constante. */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 hidden size-full overflow-visible lg:block"
        >
          <line
            x1={ax}
            y1={ay}
            x2={100}
            y2={50}
            stroke="var(--board-ink)"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          aria-hidden
          className="absolute hidden size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--board-ink)] lg:block"
          style={{ left: `${ax}%`, top: `${ay}%` }}
        />

        {/* La fiche : sous le dessin sur petit écran, à droite de l'image et
            reliée par la tige au-delà. */}
        <div className="mt-4 w-full max-w-64 rounded-[18px] bg-[color:var(--board-card)] p-4 ring-1 ring-[color:var(--board-ink)] lg:absolute lg:left-full lg:top-1/2 lg:mt-0 lg:w-64 lg:-translate-y-1/2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-9 flex-none items-center justify-center rounded-[11px] bg-[color:var(--board-ink)] indent-[0.06em] font-mono text-[11px] font-medium tracking-[0.06em] text-white"
            >
              {monogramme(etab.raisonDisplay)}
            </span>
            <p className="m-0 min-w-0 text-[15px] font-semibold leading-[1.25] tracking-[-0.015em] text-[color:var(--board-ink)]">
              {etab.raisonDisplay}
            </p>
          </div>
          <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 border-t border-[color:var(--board-slate-line)] p-0 pt-3">
            {lignes.map(({ cle, Icone, texte }) => (
              <li
                key={cle}
                className="flex min-w-0 items-center gap-2 text-[12.5px] text-[color:var(--board-slate-ink)]"
              >
                <Icone aria-hidden className="size-3.5 flex-none text-[color:var(--board-slate-mid)]" />
                <span className="min-w-0 truncate">{texte}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
