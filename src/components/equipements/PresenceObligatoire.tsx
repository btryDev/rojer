// Les obligations de PRÉSENCE d'un matériel, posées en tête de leur groupe sur
// la page Équipements (ADR-057 § 4, décisions de la propriétaire du
// 2026-11-05 et 06) — le défibrillateur sous « Premiers secours », les
// extincteurs et l'alarme sous « Incendie ». ~~La section « Équipements de
// sécurité »~~ (2026-10-15) les montrait à part, puis le parc montrait les
// mêmes appareils une seconde fois : la mention vit désormais sur la carte de
// la catégorie, et le matériel sans catégorie (premiers secours) a sa ligne
// dans son domaine.
//
// Elle ne dit jamais qu'un matériel est en place, ni qu'il suffit : elle dit
// ce qui est DÉCLARÉ dans Rojer (ADR-027). La logique vit dans
// `equipements-securite.ts`, pure et testée.

import Link from "next/link";
import { BriefcaseMedical } from "lucide-react";
import type { AppareilListe } from "@/components/equipements/CarteCategorie";
import { MarqueIcone } from "@/components/equipements/MarqueCategorie";
import { PastilleFondement } from "@/components/etats-permanents/PastilleFondement";
import { buttonVariants } from "@/components/ui/button";
import type { LigneEquipementSecurite } from "@/lib/equipements/equipements-securite";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";

/** Une ligne prête à poser : ses appareils, comme le parc les montre. */
export type LigneSecuriteAffichee = Omit<LigneEquipementSecurite, "appareils"> & {
  appareils: AppareilListe[];
  /** « Déclarer » (`hrefActionSecurite`) pour le matériel hors parc ; l'ajout
   *  d'un appareil de la catégorie sinon. */
  hrefAction: string | null;
};

/**
 * À côté du titre d'une carte de catégorie : « Obligatoire ici · 2 déclarés »,
 * le texte qui l'exige. Le nombre est celui du parc ENTIER — un DAE déclaré
 * dans une autre zone est déclaré.
 */
export function MentionPresence({ ligne }: { ligne: LigneSecuriteAffichee }) {
  const n = ligne.appareils.length;
  const libelleCategorie =
    ligne.cible.kind === "categorie" ? LABEL_CATEGORIE_EQUIPEMENT[ligne.cible.categorie] : null;
  // Le nom de l'obligation quand il n'est pas celui de la catégorie : R. 4227-34
  // exige un « système d'alarme sonore », dont un SSI n'est qu'une forme.
  const nom = ligne.libelle !== libelleCategorie ? ` — ${enMinuscule(ligne.libelle)}` : "";
  const declares = n === 0 ? "aucun déclaré" : n === 1 ? "1 déclaré" : `${n} déclarés`;
  return (
    <>
      <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        {ligne.aConfirmer ? "À confirmer ici" : "Obligatoire ici"}
        {nom} · {declares}
      </span>
      {ligne.fondement ? <PastilleFondement fondement={ligne.fondement} /> : null}
    </>
  );
}

/**
 * Le matériel qui ne se déclare pas au parc (premiers secours) : l'en-tête
 * d'une carte de catégorie, et son geste.
 */
export function MaterielHorsParc({ ligne }: { ligne: LigneSecuriteAffichee }) {
  return (
    <section>
      <div className="flex items-center gap-3.5 border-b border-[color:var(--board-slate-line)] pb-3.5">
        <MarqueIcone icone={BriefcaseMedical} label={ligne.libelle} taille={44} />
        <div className="min-w-0 flex-1">
          <h2 className="board-titre m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[22px]">
            {ligne.libelle}
            <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
              {ligne.aConfirmer ? "À confirmer ici" : "Obligatoire ici"}
            </span>
            {ligne.fondement ? <PastilleFondement fondement={ligne.fondement} /> : null}
          </h2>
          <p className="m-0 mt-1 text-[12.5px] text-[color:var(--board-slate-mid)]">
            Ce matériel se déclare sur l&apos;écran « Ce qui doit être en place ».
          </p>
        </div>
        {ligne.hrefAction ? (
          <Link href={ligne.hrefAction} className={buttonVariants({ variant: "boardClair", size: "boardSm" })}>
            Déclarer
            <span className="sr-only"> — {enMinuscule(ligne.libelle)}</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/** « Système d'alarme sonore » → « système d'alarme sonore », en fin de phrase. */
function enMinuscule(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
