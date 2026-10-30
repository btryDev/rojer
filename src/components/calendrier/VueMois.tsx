"use client";

// Grille mensuelle des échéances — l'autre façon de lire le calendrier.
//
// La frise répond à « quand ? » (l'ordre, les creux, les rafales) ; cette
// grille répond à « quel jour ? ». Elle est purement présentationnelle :
// le mois affiché est piloté par l'appelant, et la mise en cases est
// faite par `construireGrilleMois` (testée dans `lib/calendrier/grille`).
//
// Les couleurs sont celles du board éditorial : ce composant est monté
// dans une carte blanche du tableau de bord.

import { LienProvenance } from "@/components/navigation/LienProvenance";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  construireGrilleMois,
  JOURS_SEMAINE,
  type EvenementGrille,
  type GrilleMois,
} from "@/lib/calendrier/grille";
import { GrilleAvecJour } from "./GrillePoints";
import {
  avecMentionFin,
  dateEnJeuEvenement,
  type RegistreLigne,
} from "@/lib/calendrier/etats";
import { MarqueurFamille } from "./MarqueurFamille";

/** Nombre de pastilles affichées avant de replier en « +N ». */
const MAX_PAR_JOUR = 3;

// Les cases du calendrier sont déjà très claires : la pastille d'alerte
// prend le champ plein (et non l'atténué de la frise, qui s'y noierait),
// et c'est surtout son type brique qui la fait trouver.
const TON_PASTILLE: Record<EvenementGrille["tone"], string> = {
  alerte: "bg-[color:var(--board-signal)] text-[color:var(--board-signal-ink)]",
  warn: "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]",
  ok: "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]",
};

export function BoutonNav({
  onClick,
  label,
  actif,
  children,
}: {
  onClick: () => void;
  label: string;
  actif: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!actif}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-full border border-[color:rgba(10,10,10,.16)] text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-blue-pale)] disabled:cursor-not-allowed disabled:border-[color:var(--board-slate-line)] disabled:text-[color:var(--board-slate-soft)] disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export function VueMois({
  mois,
  evenements,
  aujourdhui,
  hrefEvenement,
  onPrecedent,
  onSuivant,
  peutReculer = true,
  peutAvancer = true,
}: {
  /** N'importe quelle date du mois à afficher. */
  mois: Date;
  evenements: EvenementGrille[];
  aujourdhui: Date;
  hrefEvenement: (e: EvenementGrille) => string;
  onPrecedent: () => void;
  onSuivant: () => void;
  /** Bornes de la période chargée : au-delà, il n'y a rien à montrer. */
  peutReculer?: boolean;
  peutAvancer?: boolean;
}) {
  const grille = construireGrilleMois({ mois, evenements, aujourdhui });

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <BoutonNav
          onClick={onPrecedent}
          label="Mois précédent"
          actif={peutReculer}
        >
          <ChevronLeft className="size-4" />
        </BoutonNav>
        <p className="m-0 min-w-0 flex-1 text-center text-[15px] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)] md:min-w-[168px] md:flex-none">
          {grille.libelle}
        </p>
        <BoutonNav
          onClick={onSuivant}
          label="Mois suivant"
          actif={peutAvancer}
        >
          <ChevronRight className="size-4" />
        </BoutonNav>
        <p className="m-0 ml-auto hidden text-[12.5px] text-[color:var(--board-slate-mid)] md:block">
          {grille.nbEvenements === 0
            ? "Aucune échéance ce mois-ci"
            : `${grille.nbEvenements} échéance${grille.nbEvenements > 1 ? "s" : ""}`}
        </p>
      </div>

      <GrilleTelephone
        grille={grille}
        aujourdhui={aujourdhui}
        hrefEvenement={hrefEvenement}
      />

      <div className="mt-4 hidden grid-cols-7 gap-1.5 md:grid">
        {JOURS_SEMAINE.map((j) => (
          <div
            key={j}
            className="pb-1 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--board-slate-soft)]"
          >
            {j}
          </div>
        ))}

        {grille.semaines.flat().map((jour) => {
          const visibles = jour.evenements.slice(0, MAX_PAR_JOUR);
          const reste = jour.evenements.length - visibles.length;
          return (
            <div
              key={jour.cle}
              className={
                "flex min-h-[94px] flex-col rounded-[14px] p-2 " +
                (jour.estAujourdhui
                  ? "bg-[color:var(--board-blue-pale)] ring-1 ring-[color:var(--board-blue-mid)]"
                  : jour.dansLeMois
                    ? "bg-[color:var(--board-slate-pale)]"
                    : "bg-[color:var(--board-slate-pale)]/40")
              }
            >
              <span
                className={
                  "text-[12.5px] font-semibold tabular-nums " +
                  (jour.estAujourdhui
                    ? "text-[color:var(--board-blue-ink)]"
                    : jour.dansLeMois
                      ? "text-[color:var(--board-ink)]"
                      : "text-[color:var(--board-slate-soft)]")
                }
              >
                {jour.numero}
              </span>

              <ul className="mt-1 flex flex-col gap-1">
                {visibles.map((e) => {
                  const cible = cibleEvenement(e, aujourdhui, hrefEvenement);
                  return (
                    <li key={e.id}>
                      <LienProvenance
                        href={cible.href}
                        title={`${e.libelle} — ${e.equipement}`}
                        className={
                          "flex items-center gap-1 rounded-[7px] px-1.5 py-1 text-[10.5px] font-semibold leading-tight transition-opacity hover:opacity-80 " +
                          TON_PASTILLE[e.tone]
                        }
                      >
                        {/* L'icône dit la famille ; la pastille garde la
                            couleur de son urgence. */}
                        <MarqueurFamille famille={e.famille} className="size-2.5" />
                        <span className="min-w-0 truncate">{cible.texte}</span>
                      </LienProvenance>
                    </li>
                  );
                })}
                {reste > 0 ? (
                  <li className="px-1.5 text-[10px] font-semibold text-[color:var(--board-slate-soft)]">
                    +{reste}
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Où mène la pastille d'un événement, et ce qu'elle dit : posée sur la fin
 *  de son opération, elle le dit en tête — la case du 25 se lirait comme le
 *  début des travaux (relecture, 2026-09-15). Partagé par les deux grilles. */
function cibleEvenement(
  e: EvenementGrille,
  aujourdhui: Date,
  hrefEvenement: (e: EvenementGrille) => string,
) {
  const fin = dateEnJeuEvenement(e, aujourdhui).getTime() !== e.date.getTime();
  return { href: e.href ?? hrefEvenement(e), texte: avecMentionFin(e.libelle, fin) };
}

/** L'état d'un événement, pour la couleur de son point. Le widget ne reçoit
 *  qu'un ton (`TON_REGISTRE` : `warn` = à planifier ou à confirmer, `ok` =
 *  tout ce qui n'appelle rien), pas l'état : le point prend la couleur de la
 *  pastille de la liste dessous (`TON_PASTILLE` : rose, ardoise, bleu), tirée
 *  de la même table que la page Calendrier (`POINT_ETAT`). */
const ETAT_DU_TON: Record<EvenementGrille["tone"], RegistreLigne> = {
  alerte: "enRetard",
  warn: "aPlanifier",
  ok: "lointain",
};

/**
 * La vue mois du widget, sur téléphone (décision 4A de la propriétaire,
 * 2026-10-29) : la grille à points de la page Calendrier (`GrilleAvecJour`),
 * et la liste du jour touché faite des pastilles du widget.
 */
export function GrilleTelephone({
  grille,
  aujourdhui,
  hrefEvenement,
}: {
  grille: GrilleMois;
  aujourdhui: Date;
  hrefEvenement: (e: EvenementGrille) => string;
}) {
  const jours = grille.semaines.flat();
  const parCle = new Map(jours.map((j) => [j.cle, j]));

  return (
    <div className="mt-4 md:hidden">
      <GrilleAvecJour
        cases={jours.map((j) =>
          j.dansLeMois
            ? {
                cle: j.cle,
                numero: j.numero,
                estAujourdhui: j.estAujourdhui,
                etats: j.evenements.map((e) => ETAT_DU_TON[e.tone]),
              }
            : null,
        )}
        rendreJour={(cle) => {
          const evenements = parCle.get(cle)?.evenements ?? [];
          if (evenements.length === 0) return null;
          return (
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {evenements.map((e) => {
                const cible = cibleEvenement(e, aujourdhui, hrefEvenement);
                return (
                  <li key={e.id}>
                    <LienProvenance
                      href={cible.href}
                      className={
                        "flex min-h-11 items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[13.5px] font-semibold leading-snug " +
                        TON_PASTILLE[e.tone]
                      }
                    >
                      <MarqueurFamille famille={e.famille} className="size-3.5 flex-none" />
                      <span className="min-w-0 flex-1">
                        {cible.texte}
                        {e.equipement ? (
                          <span className="block text-[12px] font-normal opacity-80">
                            {e.equipement}
                          </span>
                        ) : null}
                      </span>
                    </LienProvenance>
                  </li>
                );
              })}
            </ul>
          );
        }}
      />
    </div>
  );
}
