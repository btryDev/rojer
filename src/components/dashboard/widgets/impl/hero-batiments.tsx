// Le hero du tableau de bord : le bâtiment, et la fiche de l'établissement.
//
// **Ce que le dessin dit, et ne dit pas.** L'application ne sait rien du bâti
// — ni hauteur, ni étages, ni forme. Le dessin est l'emblème du genre de lieu
// (`illustrationBatiment`), jamais un portrait : rien n'y est épinglé.
// [2026-10-25] Un plan du lieu, puis des étiquettes de zone autour du dessin,
// ont été essayés et refusés par la propriétaire : un emplacement dessiné se
// lit comme celui du client, et le produit ne le connaît pas. Ce qu'on sait
// de l'établissement est écrit dans sa fiche, à gauche.

import Image from "next/image";
import { DoorOpen, MapPin, Users } from "lucide-react";
import type { IllustrationBatiment } from "@/lib/etablissements/illustration";
import { libelleRegimeErp } from "@/lib/etablissements/types-erp-affiches";
import type { EtablissementLite } from "../types";

/**
 * Les planches de `public/illustrations/batiments/` et leurs dimensions, pour
 * le `width`/`height` de next/image. Un `Record` sur le type fermé : une
 * planche ajoutée sans ses dimensions ne compile pas.
 */
export const PLANCHES: Record<IllustrationBatiment, { largeur: number; hauteur: number }> = {
  restaurant: { largeur: 507, hauteur: 384 },
  magasin: { largeur: 461, hauteur: 352 },
  bureaux: { largeur: 507, hauteur: 413 },
  hotel: { largeur: 421, hauteur: 476 },
  "salle-sport": { largeur: 614, hauteur: 376 },
  local: { largeur: 469, hauteur: 354 },
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

/**
 * La fiche de l'établissement, dans la colonne de gauche du hero : son nom
 * et ce qui le caractérise — régime, effectif, ville. Tout ce qu'elle dit se
 * lit sur la fiche établissement, d'où elle vient.
 */
export function FicheEtablissement({ etablissement: etab }: { etablissement: EtablissementLite }) {
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
    <div className="w-full max-w-[340px] rounded-[20px] bg-[color:var(--board-card)] p-5 ring-1 ring-[color:rgba(13,18,36,.08)]">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 flex-none items-center justify-center rounded-[12px] bg-[color:var(--board-ink)] indent-[0.06em] font-mono text-[12px] font-medium tracking-[0.06em] text-white"
        >
          {monogramme(etab.raisonDisplay)}
        </span>
        <p className="m-0 min-w-0 text-[17px] font-semibold leading-[1.25] tracking-[-0.02em] text-[color:var(--board-ink)]">
          {etab.raisonDisplay}
        </p>
      </div>
      <ul className="m-0 mt-4 flex list-none flex-col gap-2 border-t border-[color:var(--board-slate-line)] p-0 pt-4">
        {lignes.map(({ cle, Icone, texte }) => (
          <li
            key={cle}
            className="flex min-w-0 items-center gap-2.5 text-[13px] text-[color:var(--board-slate-ink)]"
          >
            <Icone aria-hidden className="size-4 flex-none text-[color:var(--board-slate-mid)]" />
            <span className="min-w-0 truncate">{texte}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Le bâtiment du hero — décoratif : tout ce qu'il évoque est écrit dans la fiche. */
export function HeroBatiments({ illustration }: { illustration: IllustrationBatiment }) {
  const planche = PLANCHES[illustration];
  return (
    <Image
      src={`/illustrations/batiments/${illustration}.webp`}
      alt=""
      aria-hidden
      width={planche.largeur}
      height={planche.hauteur}
      sizes="380px"
      priority
      className="mx-auto block h-auto w-[clamp(220px,28vw,380px)] select-none"
    />
  );
}
