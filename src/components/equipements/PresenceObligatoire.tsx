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
import { MarqueIcone } from "@/components/equipements/MarqueCategorie";
import { PastilleFondement } from "@/components/etats-permanents/PastilleFondement";
import { buttonVariants } from "@/components/ui/button";
import type { LigneEquipementSecurite } from "@/lib/equipements/equipements-securite";
import { LABEL_CATEGORIE_EQUIPEMENT, libelleEnCoursDePhrase } from "@/lib/equipements/labels";
import { NOTE_DAE_PARTAGE } from "@/lib/etats-permanents/par-le-parc";
import { pluriel } from "@/lib/rendu/pluriel";
import { CasePartageDae } from "@/components/equipements/CasePartageDae";

/** Une ligne prête à poser. */
export type LigneSecuriteAffichee = LigneEquipementSecurite & {
  /** « Déclarer » (`hrefActionSecurite`), pour le matériel hors parc : la
   *  carte d'une catégorie a déjà son bouton d'ajout. */
  hrefAction: string | null;
};

/**
 * À côté du titre d'une carte de catégorie : « Obligatoire ici · 2 déclarés »,
 * le texte qui l'exige. Le nombre est celui du parc ENTIER — un DAE déclaré
 * dans une autre zone est déclaré ; sous un filtre de zone, la mention le dit.
 */
export function MentionPresence({
  ligne,
  sousUnFiltre = false,
}: {
  ligne: LigneSecuriteAffichee;
  sousUnFiltre?: boolean;
}) {
  const n = ligne.appareils.length;
  const libelleCategorie =
    ligne.cible.kind === "categorie" ? LABEL_CATEGORIE_EQUIPEMENT[ligne.cible.categorie] : null;
  // Le nom de l'obligation quand il n'est pas celui de la catégorie : R. 4227-34
  // exige un « système d'alarme sonore », dont un SSI n'est qu'une forme.
  const nom = ligne.libelle !== libelleCategorie ? ` — ${libelleEnCoursDePhrase(ligne.libelle)}` : "";
  const etat =
    ligne.etat === "partage"
      ? "partagé avec un voisin"
      : ligne.etat === "ancienne_case"
        ? "indiqué en place, aucun appareil déclaré"
        : n === 0
          ? "aucun déclaré"
          : `${pluriel(n, "déclaré")}${sousUnFiltre ? " dans l'établissement" : ""}`;
  return (
    <>
      <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        {ligne.aConfirmer ? "À confirmer ici" : "Obligatoire ici"}
        {nom} · {etat}
      </span>
      {ligne.fondement ? <PastilleFondement fondement={ligne.fondement} /> : null}
    </>
  );
}

/**
 * Sous l'en-tête de la carte : le rappel d'une ancienne case cochée sans
 * appareil, et la case du défibrillateur partagé (décisions de la
 * propriétaire du 2026-11-06). `null` quand il n'y a rien à dire.
 */
export function SousLEnTetePresence({
  ligne,
  etablissementId,
}: {
  ligne: LigneSecuriteAffichee;
  etablissementId: string;
}) {
  const rappel =
    ligne.etat === "ancienne_case" ? (
      <p className="m-0 mt-3 text-[13px] leading-[1.6] text-[color:var(--board-slate-ink)]">
        Vous aviez indiqué en avoir : déclarez-les ici pour que Rojer suive leurs vérifications.
      </p>
    ) : null;
  const partage =
    ligne.admetLePartage && ligne.appareils.length === 0 ? (
      <CasePartageDae
        etablissementId={etablissementId}
        partage={ligne.etat === "partage"}
        libelle={NOTE_DAE_PARTAGE}
      />
    ) : null;
  if (!rappel && !partage) return null;
  return (
    <>
      {rappel}
      {partage}
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
              {ligne.etat === "appareils" ? " · déclaré" : ""}
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
            <span className="sr-only"> — {libelleEnCoursDePhrase(ligne.libelle)}</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
