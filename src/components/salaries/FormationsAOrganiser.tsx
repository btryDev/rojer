import { Info } from "lucide-react";
import Link from "next/link";
import { RevueEnPlace, type FicheLigne } from "@/components/etats-permanents/RevueEnPlace";
import type { EtatCourt } from "@/components/etats-permanents/LigneCompacte";
import { Vignette } from "@/components/ui-kit/Vignette";
import { dessinDuTitre } from "@/lib/salaries/illustration-titre";
import type { FaitSansPorteur } from "@/lib/salaries/titres-sans-porteur";
import { LigneFormation } from "./LigneFormation";

/**
 * « Formations à organiser » — sous les personnes, sur la page Équipe
 * (2026-10-24, décision de la propriétaire ; amende l'ADR-047 : l'onglet
 * Formations devient cette section).
 *
 * Sa raison d'être, dite par son chapeau : les formations DUES À VOS SALARIÉS
 * QUAND ROJER NE SAIT PAS LESQUELS. Elles ne peuvent pas aller sur une fiche ;
 * c'est l'établissement qui les organise. Ce qui a une personne — un titre
 * manquant — reste sur sa fiche ; ce qui a une date reste au calendrier ; ce
 * qu'un événement déclenche reste dans « Ce qui doit être en place › En cas
 * de… ». Pas de doublon ici.
 *
 * Deux sortes de lignes : les formations d'établissement (déclarées depuis la
 * fiche de `RevueEnPlace`), et ce que le DUERP signale sans que personne ait
 * le titre (`titres-sans-porteur.ts`) — on sait qu'il en faut, pas qui : la
 * ligne renvoie vers l'équipe.
 */
export type FormationAOrganiser = {
  obligationId: string;
  ancre: string;
  libelle: string;
  pourquoi: string;
  etat: EtatCourt;
  dessin: { src: string; fond: string };
};

export function FormationsAOrganiser({
  etablissementId,
  formations,
  fiches,
  sansPorteur,
  personnePresente,
  aOrganiser,
}: {
  etablissementId: string;
  /** Le compte de la pastille (`aOrganiserALEtablissement`, le même que le widget). */
  aOrganiser: number;
  formations: readonly FormationAOrganiser[];
  /** Les fiches que la ligne ouvre (`versFiche`). */
  fiches: FicheLigne[];
  sansPorteur: readonly FaitSansPorteur[];
  personnePresente: boolean;
}) {
  const vide = formations.length === 0 && sansPorteur.length === 0;

  return (
    // Un panneau bleu glacier, pas une carte blanche de plus (retour de la
    // propriétaire, 2026-10-24) : le registre « calme et actif » de la charte
    // (§ 1.3) — ce qui suit est pour l'établissement, pas pour une personne
    // de la grille au-dessus.
    <section
      id="formations"
      aria-labelledby="formations-titre"
      className="scroll-mt-6 rounded-[30px] bg-[color:var(--board-blue-pale)]/55 px-5 py-6 sm:px-8"
    >
      {/* Trois niveaux, trois registres (retour de la propriétaire,
          2026-10-24) : le titre et son compte ; l'explication en ligne
          d'aide, bleue, icône en tête ; le contenu, en pastilles blanches
          sous un filet. ~~La planche du bâtiment en tête~~ — retirée. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="formations-titre" className="board-titre m-0 text-[24px]">
          Formations à organiser
        </h2>
        {aOrganiser > 0 && (
          <span className="pastille-board bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]">
            {aOrganiser} à organiser
          </span>
        )}
      </div>
      <p className="m-0 mt-2.5 flex max-w-[var(--board-mesure)] items-start gap-2 text-[12.5px] leading-[1.55] text-[color:var(--board-blue-ink)]">
        <Info className="mt-[2px] size-3.5 flex-none" aria-hidden />
        <span>
          D&apos;après ce que vous avez déclaré, chacune de ces formations est
          due à au moins un de vos salariés. Rojer ne sait pas lesquels : une
          fois la formation organisée, touchez sa ligne pour le déclarer.
        </span>
      </p>

      {vide ? (
        <p className="m-0 mt-5 border-t border-[color:var(--board-blue-soft)]/60 pt-5 text-[13px] text-[color:var(--board-slate-mid)]">
          Aucune formation à organiser pour l&apos;établissement aujourd&apos;hui.
        </p>
      ) : (
        <RevueEnPlace etablissementId={etablissementId} lignes={fiches} parcours={false}>
          <ul className="m-0 mt-5 flex list-none flex-col gap-2 border-t border-[color:var(--board-blue-soft)]/60 p-0 pt-5">
            {formations.map((f) => (
              <LigneFormation key={f.obligationId} {...f} />
            ))}
            {sansPorteur.flatMap((fait) =>
              fait.titres.map((t, i) => {
                const d = dessinDuTitre(t.obligation.id);
                return (
                  <li
                    key={`${fait.champ}:${t.obligation.id}`}
                    className="grid list-none grid-cols-[44px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 rounded-[18px] bg-[color:var(--board-card)] px-3 py-3 sm:grid-cols-[44px_minmax(0,1fr)_auto]"
                  >
                    <Vignette src={d.src} fond={d.fond} taille={44} />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
                        {t.obligation.libelle}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                        Votre DUERP le signale, et personne n&apos;a ce titre.{" "}
                        {t.condition}{" "}
                        <Link
                          href={`/etablissements/${etablissementId}/equipe/risques#${fait.champ}`}
                          className="text-[color:var(--board-blue-ink)] underline underline-offset-4"
                        >
                          Modifier la réponse
                        </Link>
                      </span>
                      {/* Une fois par question, sous son premier titre. */}
                      {i === 0 && fait.horsQuestion && (
                        <span className="mt-1 block text-[12px] leading-[1.5] text-[color:var(--board-slate-soft)]">
                          {fait.horsQuestion}
                        </span>
                      )}
                    </span>
                    {/* Sans personne présente, la porte est d'en ajouter une. */}
                    <Link
                      href={`/etablissements/${etablissementId}/equipe${personnePresente ? "#personnes" : "/nouveau"}`}
                      className="pastille-board col-start-2 justify-self-start bg-[color:var(--board-amber)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-blue-strong)] sm:col-start-3 sm:justify-self-end text-[color:var(--board-amber-ink)] underline-offset-4 hover:underline"
                    >
                      {personnePresente ? "Déclarer sur une fiche" : "Ajouter la personne"}
                    </Link>
                  </li>
                );
              }),
            )}
          </ul>
        </RevueEnPlace>
      )}
    </section>
  );
}
