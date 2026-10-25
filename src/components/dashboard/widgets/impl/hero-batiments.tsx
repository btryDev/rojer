// Le bâtiment du hero et ses zones, posées autour en étiquettes.
//
// **Ce que ce bloc est, et n'est pas.** Un **état**, pas une commande : rien
// ne s'y clique pour filtrer. Le filtre par zone reste piloté par le
// sélecteur posé sous le hero, qui porte son propre « Tout l'établissement ».
//
// **Ce que le dessin dit, et ne dit pas.** L'application ne sait rien du bâti
// — ni hauteur, ni étages, ni forme, ni où se trouve la cuisine. Le dessin est
// l'emblème du genre de lieu (`illustrationBatiment`), et les étiquettes
// s'accrochent à des points fixes de chaque planche, les mêmes quel que soit
// le dossier : elles disent qu'une zone existe et ce qu'elle porte, jamais
// où elle est. [2026-10-25] Un plan du lieu avait été proposé et refusé pour
// cette raison — il ne peut pas correspondre aux lieux du client.

import Image from "next/image";
import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import type { BatimentCharge } from "@/lib/batiments/queries";
import { etatCharge, libelleCharge, type EtatCharge } from "@/lib/batiments/etat-charge";
import { nomDeZone } from "@/lib/batiments/nom-zone";
import type { IllustrationBatiment } from "@/lib/etablissements/illustration";

/**
 * Les planches de `public/illustrations/batiments/` : leurs dimensions, et
 * trois points d'accroche en pourcentage de l'image — un sur le toit, un sur
 * la façade, un sur le côté. Trois parce qu'un établissement n'a jamais plus
 * de trois zones (ADR-029). Un `Record` sur le type fermé : une planche
 * ajoutée sans ses accroches ne compile pas.
 */
export const PLANCHES: Record<
  IllustrationBatiment,
  { largeur: number; hauteur: number; ancres: readonly (readonly [number, number])[] }
> = {
  restaurant: { largeur: 507, hauteur: 384, ancres: [[42, 22], [20, 46], [78, 50]] },
  magasin: { largeur: 461, hauteur: 352, ancres: [[55, 24], [25, 55], [82, 62]] },
  bureaux: { largeur: 507, hauteur: 413, ancres: [[45, 18], [24, 42], [88, 48]] },
  hotel: { largeur: 421, hauteur: 476, ancres: [[40, 14], [30, 40], [78, 50]] },
  "salle-sport": { largeur: 614, hauteur: 376, ancres: [[55, 22], [26, 44], [80, 56]] },
  local: { largeur: 469, hauteur: 354, ancres: [[55, 28], [24, 56], [86, 62]] },
};

/**
 * Le monogramme de repli, quand aucun logo n'est déposé.
 *
 * Les initiales des deux premiers mots, ou les deux premières lettres d'un
 * mot unique. Dérivé du nom, donc jamais faux — là où une icône générique
 * de bâtiment aurait fait croire à un logo par défaut.
 */
export function monogramme(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "—";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

/* — L'enseigne : logo, nom. ─────────────────────────────────────
 *
 * NOTE D'IMPLÉMENTATION — le logo n'est pas encore persisté. `Entreprise`
 * n'a pas de colonne pour lui et aucun écran ne permet d'en déposer un ;
 * `logoUrl` vaut donc `null` partout aujourd'hui, et le monogramme s'affiche.
 * L'emplacement existe pour que le jour où le champ arrive, seule la valeur
 * change — pas la composition.
 */
export function Enseigne({ nom, logoUrl }: { nom: string; logoUrl: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {logoUrl != null ? (
        <Image
          src={logoUrl}
          alt=""
          aria-hidden
          width={80}
          height={80}
          className="size-10 flex-none rounded-[12px] object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-10 flex-none items-center justify-center rounded-[12px] bg-[color:var(--board-ink)] indent-[0.06em] font-mono text-[12px] font-medium leading-none tracking-[0.06em] text-white"
        >
          {monogramme(nom)}
        </span>
      )}
      <p className="m-0 min-w-0 truncate text-[16px] font-semibold tracking-[-0.02em] text-[color:var(--board-ink)]">
        {nom}
      </p>
    </div>
  );
}

/**
 * Le rond d'état de l'étiquette — trois états, jamais deux.
 *
 * La règle est dans `lib/batiments/etat-charge.ts`, avec la raison : une zone
 * sans équipement déclaré n'est ni à jour ni en retard, elle est **sans objet**,
 * et l'annoncer « à jour » serait une affirmation fausse sur un écran de
 * conformité. Le composant ne rejuge rien, il rend l'état qu'on lui donne.
 */
function RondEtat({ etat }: { etat: EtatCharge }) {
  const base =
    "flex size-[18px] flex-none items-center justify-center rounded-full text-[10px] font-bold tabular-nums";
  switch (etat.nature) {
    case "sansObjet":
      return (
        <span aria-hidden className={base + " bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"}>
          –
        </span>
      );
    case "aJour":
      return (
        <span aria-hidden className={base + " bg-[color:var(--board-green)] text-[color:var(--board-ink)]"}>
          <Check className="size-3" strokeWidth={3} />
        </span>
      );
    case "enRetard":
      // `--board-signal-on` (noir) et non l'encre rouge : sur le rose plein,
      // seule l'encre noire tient l'AA à cette taille.
      return (
        <span aria-hidden className={base + " bg-[color:var(--board-signal)] text-[color:var(--board-signal-on)]"}>
          {etat.nbEnRetard}
        </span>
      );
  }
}

/** Le texte que lit un lecteur d'écran à la place du rond. */
function libelleLu(etat: EtatCharge): string {
  return etat.nature === "enRetard"
    ? `${etat.nbEnRetard} ${libelleCharge(etat)}`
    : libelleCharge(etat);
}

/** Hauteur de l'étiquette `i` sur `n`, en pourcentage : réparties à
 *  intervalles égaux, jamais collées aux bords. */
function rangee(i: number, n: number): number {
  return ((i + 1) / (n + 1)) * 100;
}

export function HeroBatiments({
  batiments,
  illustration,
  legende,
}: {
  batiments: BatimentCharge[];
  illustration: IllustrationBatiment;
  /**
   * Ce que les étiquettes comptent, et ce qu'elles laissent au relevé d'à
   * côté. Elle arrive toute faite depuis le serveur
   * (`DashboardBundle.perimetreHero`) : sa dérivation passe par le
   * référentiel des obligations, qui n'a rien à faire dans un composant
   * client.
   */
  legende: string;
}) {
  const planche = PLANCHES[illustration];
  const zones = batiments.map((b, i) => ({
    batiment: b,
    etat: etatCharge({ nbEquipements: b.nbEquipements, nbEnRetard: b.nbEnRetard }),
    ancre: planche.ancres[i % planche.ancres.length],
    y: rangee(i, batiments.length),
  }));

  return (
    // `lg:pr-52` réserve la colonne des étiquettes, posées hors de l'image :
    // sans elle, elles débordaient du hero et s'y faisaient couper.
    <figure className="m-0 mx-auto w-fit max-w-full lg:pr-52">
      <div className="relative w-[clamp(220px,24vw,340px)]">
        {/* Décoratif : tout ce que le dessin évoque est écrit à côté. */}
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

        {/* Les tiges : du point d'accroche au bord gauche de l'étiquette.
            Repère en pourcentage de l'image, trait d'épaisseur constante. */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 hidden size-full overflow-visible lg:block"
        >
          {zones.map(({ batiment, ancre, y }) => (
            <line
              key={batiment.id}
              x1={ancre[0]}
              y1={ancre[1]}
              x2={100}
              y2={y}
              stroke="var(--board-ink)"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {zones.map(({ batiment, ancre }) => (
          <span
            key={batiment.id}
            aria-hidden
            className="absolute hidden size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--board-ink)] lg:block"
            style={{ left: `${ancre[0]}%`, top: `${ancre[1]}%` }}
          />
        ))}

        {/* Les étiquettes : en liste sous le dessin sur petit écran, posées
            à droite de l'image et reliées par leur tige au-delà. */}
        <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0 lg:absolute lg:inset-y-0 lg:left-full lg:mt-0 lg:block lg:w-52">
          {zones.map(({ batiment, etat, y }) => (
            <li
              key={batiment.id}
              className="flex w-fit max-w-full items-center gap-2 rounded-full bg-[color:var(--board-card)] py-1 pl-1 pr-3 text-[12.5px] ring-1 ring-[color:var(--board-ink)] lg:absolute lg:top-[var(--y)] lg:-translate-y-1/2"
              style={{ "--y": `${y}%` } as CSSProperties}
            >
              <RondEtat etat={etat} />
              <span className="min-w-0 truncate">
                <span className="font-semibold text-[color:var(--board-ink)]">
                  {nomDeZone(batiment.nom)}
                </span>
                <span className="text-[color:var(--board-slate-mid)]">
                  {" · "}
                  <span className="sr-only">{libelleLu(etat)}</span>
                  <span aria-hidden>{libelleCharge(etat)}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <figcaption className="m-0 mt-4 max-w-[46ch] text-[11.5px] leading-[1.5] text-[color:var(--board-slate-ink)] lg:mt-6">
        {legende}
      </figcaption>
    </figure>
  );
}
