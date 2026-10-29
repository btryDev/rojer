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

import { useState } from "react";
import { LienProvenance } from "@/components/navigation/LienProvenance";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  construireGrilleMois,
  JOURS_SEMAINE,
  type EvenementGrille,
  type GrilleMois,
} from "@/lib/calendrier/grille";
import { avecMentionFin, dateEnJeuEvenement } from "@/lib/calendrier/etats";
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
        <p className="m-0 min-w-0 flex-1 text-center text-[15px] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)] sm:min-w-[168px] sm:flex-none">
          {grille.libelle}
        </p>
        <BoutonNav
          onClick={onSuivant}
          label="Mois suivant"
          actif={peutAvancer}
        >
          <ChevronRight className="size-4" />
        </BoutonNav>
        <p className="m-0 ml-auto hidden text-[12.5px] text-[color:var(--board-slate-mid)] sm:block">
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

      <div className="mt-4 hidden grid-cols-7 gap-1.5 sm:grid">
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
                  // Posée sur la fin de son opération, la pastille le dit en
                  // tête : la case du 25 se lirait comme le début des travaux
                  // (relecture, 2026-09-15).
                  const fin =
                    dateEnJeuEvenement(e, aujourdhui).getTime() !== e.date.getTime();
                  return (
                    <li key={e.id}>
                      <LienProvenance
                        href={e.href ?? hrefEvenement(e)}
                        title={`${e.libelle} — ${e.equipement}`}
                        className={
                          "flex items-center gap-1 rounded-[7px] px-1.5 py-1 text-[10.5px] font-semibold leading-tight transition-opacity hover:opacity-80 " +
                          TON_PASTILLE[e.tone]
                        }
                      >
                        {/* L'icône dit la famille ; la pastille garde la
                            couleur de son urgence. */}
                        <MarqueurFamille famille={e.famille} className="size-2.5" />
                        <span className="min-w-0 truncate">
                          {avecMentionFin(e.libelle, fin)}
                        </span>
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

const JOURS_LONGS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** Le point d'un événement dans la grille du téléphone : la couleur de sa
 *  pastille, en plus soutenu pour se lire à 6 px. */
const TON_POINT: Record<EvenementGrille["tone"], string> = {
  alerte: "bg-[color:var(--board-signal-line)]",
  warn: "bg-[color:var(--board-slate-mid)]",
  ok: "bg-[color:var(--board-blue-strong)]",
};

/**
 * La vue mois du téléphone (décision 4A de la propriétaire, 2026-10-29).
 *
 * Sept colonnes de 33 px ne laissent rien lire d'une pastille : la grille
 * ne porte plus que des points, un par échéance dans la couleur de son état,
 * et toucher un jour liste ses échéances dessous. Le mois reste un
 * calendrier — on voit d'un coup d'œil où tombent les retards.
 *
 * Le jour choisi par défaut : aujourd'hui s'il est dans le mois, sinon le
 * premier jour qui porte une échéance.
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
  const duMois = jours.filter((j) => j.dansLeMois);
  const parDefaut =
    duMois.find((j) => j.estAujourdhui) ??
    duMois.find((j) => j.evenements.length > 0) ??
    null;
  const [choisi, setChoisi] = useState<string | null>(null);
  // Un choix fait dans un autre mois ne vaut plus : on retombe sur le défaut.
  const jour = duMois.find((j) => j.cle === choisi) ?? parDefaut;
  const nomDuJour = jour ? JOURS_LONGS[jours.indexOf(jour) % 7] : "";
  // « 8 octobre 2026 » : le numéro sans zéro, le mois et l'année du titre de
  // la grille (« Octobre 2026 »), déjà calculés dans le fuseau de référence.
  const dateDuJour = (j: { numero: number }) =>
    `${j.numero} ${grille.libelle.toLowerCase()}`;

  return (
    <div className="sm:hidden">
      <div className="mt-4 grid grid-cols-7 gap-y-1">
        {JOURS_SEMAINE.map((j) => (
          <div
            key={j}
            className="pb-1 text-center font-mono text-[10px] font-semibold uppercase text-[color:var(--board-slate-soft)]"
          >
            {j.slice(0, 1)}
          </div>
        ))}
        {jours.map((j, i) => {
          if (!j.dansLeMois) return <span key={j.cle} aria-hidden />;
          const nb = j.evenements.length;
          const actif = jour?.cle === j.cle;
          return (
            <button
              key={j.cle}
              type="button"
              onClick={() => setChoisi(j.cle)}
              aria-pressed={actif}
              aria-label={`${JOURS_LONGS[i % 7]} ${dateDuJour(j)}, ${
                nb === 0 ? "aucune échéance" : `${nb} échéance${nb > 1 ? "s" : ""}`
              }`}
              className={
                "mx-auto flex h-11 w-full max-w-11 flex-col items-center justify-start gap-1 rounded-[14px] pt-1.5 " +
                (actif
                  ? "bg-[color:var(--board-ink)] text-white"
                  : j.estAujourdhui
                    ? "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                    : "text-[color:var(--board-ink)]")
              }
            >
              <span className="text-[13px] font-semibold tabular-nums leading-none">
                {j.numero}
              </span>
              <span aria-hidden className="flex h-1.5 gap-[3px]">
                {j.evenements.slice(0, MAX_PAR_JOUR).map((e) => (
                  <span
                    key={e.id}
                    className={
                      "size-1.5 rounded-full " +
                      (actif && e.tone !== "alerte" ? "bg-white" : TON_POINT[e.tone])
                    }
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {jour ? (
        <div className="mt-5">
          <p className="m-0 text-[13px] font-semibold text-[color:var(--board-slate-ink)]">
            {jour.estAujourdhui
              ? `Aujourd'hui, ${nomDuJour.toLowerCase()} ${dateDuJour(jour)}`
              : `${nomDuJour} ${dateDuJour(jour)}`}
          </p>
          {jour.evenements.length === 0 ? (
            <p className="m-0 mt-2 text-[13.5px] text-[color:var(--board-slate-mid)]">
              Aucune échéance ce jour-là.
            </p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {jour.evenements.map((e) => {
                const fin =
                  dateEnJeuEvenement(e, aujourdhui).getTime() !== e.date.getTime();
                return (
                  <li key={e.id}>
                    <LienProvenance
                      href={e.href ?? hrefEvenement(e)}
                      className={
                        "flex min-h-11 items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[13.5px] font-semibold leading-snug " +
                        TON_PASTILLE[e.tone]
                      }
                    >
                      <MarqueurFamille famille={e.famille} className="size-3.5 flex-none" />
                      <span className="min-w-0 flex-1">
                        {avecMentionFin(e.libelle, fin)}
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
          )}
        </div>
      ) : (
        <p className="m-0 mt-5 text-[13.5px] text-[color:var(--board-slate-mid)]">
          Aucune échéance ce mois-ci.
        </p>
      )}
    </div>
  );
}
