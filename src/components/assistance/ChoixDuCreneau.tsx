"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import {
  creneauxParJour,
  grilleDuMois,
  jourSansAnnee,
  majuscule,
  moisAnnee,
  moisDe,
  plageHoraire,
  type CreneauAffiche,
} from "@/lib/assistance/rendez-vous-libelles";
import { cleJourCivil, depuisCleJourCivil } from "@/lib/dates";
import { CREUX, LIEN, PETIT, SURTITRE } from "./styles-rendez-vous";
import { useFocusAuMontage } from "./useFocusAuMontage";

const JOURS_SEMAINE = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

const BOUTON_ROND =
  "cible-tactile grid size-9 place-items-center rounded-full bg-white text-[color:var(--board-ink)] shadow-[inset_0_0_0_1px_rgba(10,10,10,.14)] hover:bg-[color:var(--board-slate-pale)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-blue-strong)] disabled:cursor-not-allowed disabled:bg-white disabled:text-[color:var(--board-slate)] disabled:shadow-[inset_0_0_0_1px_var(--board-slate-line)]";

// 44 px de haut, et une grille aussi large que la carte le permet : la
// cible tactile (Apple HIG) se tient par la case elle-même — pas de halo
// `cible-tactile` sur une grappe de boutons collés, la charte l'interdit.
const JOUR = "grid h-11 place-items-center rounded-full text-[14px] tabular-nums";

const nbLibres = (n: number) => `${n} ${n > 1 ? "créneaux libres" : "créneau libre"}`;
const premierDuMois = (mois: string) => depuisCleJourCivil(`${mois}-01`);

/**
 * Étape 1 du rendez-vous annuel (maquette « Choisir un créneau ») : un mois
 * à la fois, les jours qui ont un créneau libre en bleu ; à droite, les
 * créneaux du jour choisi. Seuls les créneaux libres existent ici.
 */
export function ChoixDuCreneau({
  creneaux,
  lienQuestion,
  deplacement,
  garder,
  choisir,
  selectionInitiale,
  alerte,
  focaliser,
}: {
  creneaux: CreneauAffiche[];
  lienQuestion: string;
  /** Déplacer le rendez-vous à venir : on peut le garder. */
  deplacement: boolean;
  garder: () => void;
  /** « Valider ce créneau » : l'étape suivante. */
  choisir: (c: CreneauAffiche) => void;
  /** Le créneau déjà choisi, au retour de l'étape 2 (« Changer de créneau »). */
  selectionInitiale?: CreneauAffiche | null;
  /** Le refus du créneau qu'on vient d'essayer (pris, hors de la fenêtre). */
  alerte: string | null;
  /** Ouverte par un geste : son titre prend le focus. */
  focaliser: boolean;
}) {
  const titreId = useId();
  const titreRef = useFocusAuMontage<HTMLHeadingElement>(focaliser);
  const mois = [...new Set(creneaux.map((c) => moisDe(c.debut)))];
  // Deux temps (décision de la propriétaire du 2026-11-24) : un créneau se
  // sélectionne, puis « Valider ce créneau » mène à l'étape suivante.
  const [selection, setSelection] = useState<CreneauAffiche | null>(
    selectionInitiale && creneaux.some((c) => c.id === selectionInitiale.id) ? selectionInitiale : null,
  );
  const [rang, setRang] = useState(() => Math.max(0, selection ? mois.indexOf(moisDe(selection.debut)) : 0));
  const [jourChoisi, setJourChoisi] = useState<number | null>(() =>
    selection ? Number(cleJourCivil(new Date(selection.debut)).slice(8)) : null,
  );
  const moisAffiche = mois[Math.min(rang, mois.length - 1)];
  const parJour = new Map(
    creneauxParJour(creneaux.filter((c) => moisDe(c.debut) === moisAffiche)).map((j) => [Number(j.jour.slice(8)), j.creneaux]),
  );
  const jour = jourChoisi !== null && parJour.has(jourChoisi) ? jourChoisi : [...parJour.keys()][0];
  const duJour = parJour.get(jour) ?? [];
  const changerDeMois = (r: number) => {
    setRang(r);
    setJourChoisi(null);
  };

  return (
    <section aria-labelledby={titreId} className="carte-board flex flex-col gap-[26px] px-4 pt-7 pb-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2.5">
        <div className="flex flex-col gap-1.5">
          <p className={SURTITRE}>Étape 1 sur 2</p>
          <h2 id={titreId} ref={titreRef} tabIndex={-1} className="board-titre m-0 text-[22px] focus:outline-none">
            {deplacement ? "Choisissez un nouveau jour, puis une heure" : "Choisissez un jour, puis une heure"}
          </h2>
        </div>
        {deplacement ? (
          <Button type="button" variant="boardClair" size="boardSm" onClick={garder}>
            Garder le rendez-vous actuel
          </Button>
        ) : null}
      </div>

      <MessageFormulaire ton="alerte">{alerte}</MessageFormulaire>

      <div className="flex flex-wrap gap-x-8 gap-y-7">
        <div className="min-w-[280px] flex-[0_1_380px]">
          <div className="mb-3.5 flex items-center justify-between">
            <button
              type="button"
              className={BOUTON_ROND}
              disabled={rang === 0}
              onClick={() => changerDeMois(rang - 1)}
              aria-label="Mois précédent"
            >
              <ChevronLeft className="size-4" strokeWidth={2.2} aria-hidden />
            </button>
            <h3 className="board-titre m-0 text-[17px] tracking-[-0.015em]" aria-live="polite">
              {moisAffiche ? majuscule(moisAnnee(premierDuMois(moisAffiche))) : ""}
            </h3>
            <button
              type="button"
              className={BOUTON_ROND}
              disabled={rang >= mois.length - 1}
              onClick={() => changerDeMois(rang + 1)}
              aria-label="Mois suivant"
            >
              <ChevronRight className="size-4" strokeWidth={2.2} aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-x-0.5 gap-y-1 sm:gap-x-1">
            {JOURS_SEMAINE.map((j) => (
              <span key={j} className="pb-1 text-center text-[11.5px] font-semibold text-[color:var(--board-slate-soft)]">
                {j}
              </span>
            ))}
            {(moisAffiche ? grilleDuMois(moisAffiche) : []).map((n, i) => {
              if (n === null) return <span key={`vide-${i}`} className={JOUR} aria-hidden />;
              const libres = parJour.get(n);
              if (!libres)
                return (
                  <span key={n} className={`${JOUR} text-[color:var(--board-slate-soft)]`}>
                    {n}
                  </span>
                );
              const choisi = n === jour;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={choisi}
                  aria-label={`${jourSansAnnee(new Date(libres[0].debut))}, ${nbLibres(libres.length)}`}
                  onClick={() => setJourChoisi(n)}
                  className={`${JOUR} cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-blue-strong)] ${
                    choisi
                      ? "bg-[color:var(--board-ink)] text-white"
                      : "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)] hover:bg-[color:var(--board-blue-soft)] hover:text-[color:var(--board-ink)]"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            <p className={`${PETIT} flex items-center gap-2`}>
              <span aria-hidden className="size-3.5 flex-none rounded-full bg-[color:var(--board-blue-pale)]" />
              Un jour en bleu a des créneaux libres.
            </p>
            {moisAffiche && rang >= mois.length - 1 ? (
              <p className={PETIT}>
                Les créneaux se réservent jusqu&apos;à un mois à l&apos;avance : d&apos;autres s&apos;ouvrent au fil des jours.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-[18px] border-t border-[color:var(--board-slate-line)] pt-6 min-[861px]:border-t-0 min-[861px]:border-l min-[861px]:pt-0 min-[861px]:pl-8">
          <div className="flex flex-col gap-1">
            <h3 className="board-titre m-0 text-[20px] tracking-[-0.02em]">
              {duJour[0] ? majuscule(jourSansAnnee(new Date(duJour[0].debut))) : ""}
            </h3>
            <p className={PETIT}>{nbLibres(duJour.length)}</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
            {duJour.map((c) => {
              const pris = selection?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={pris}
                  onClick={() => setSelection(c)}
                  className={`flex h-12 items-center justify-center rounded-full text-[14.5px] font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-blue-strong)] ${
                    pris
                      ? "bg-[color:var(--board-ink)] text-white"
                      : "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)] hover:bg-[color:var(--board-blue-soft)] hover:text-[color:var(--board-ink)]"
                  }`}
                >
                  {plageHoraire(new Date(c.debut), new Date(c.fin))}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-[color:var(--board-slate-line)] pt-[18px]">
            <p className="m-0 text-[14px] text-[color:var(--board-slate-ink)]" aria-live="polite">
              {selection ? (
                <>
                  <span className="font-semibold text-[color:var(--board-ink)]">
                    {majuscule(jourSansAnnee(new Date(selection.debut)))}
                  </span>
                  , {plageHoraire(new Date(selection.debut), new Date(selection.fin))}
                </>
              ) : (
                "Choisissez une heure."
              )}
            </p>
            <Button type="button" variant="board" disabled={!selection} onClick={() => selection && choisir(selection)}>
              Valider ce créneau
            </Button>
          </div>
          <div className={`${CREUX} mt-auto px-[18px] py-4`}>
            <p className={PETIT}>
              Aucun créneau ne vous convient&#160;? En attendant,{" "}
              <Link href={lienQuestion} className={LIEN}>
                posez votre question par écrit
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
