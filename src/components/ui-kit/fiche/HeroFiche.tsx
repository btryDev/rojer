// La tête d'une fiche de détail — direction « la ligne qui se déplie ».
//
// Le parti : une fiche ouverte depuis le calendrier n'est pas un nouvel
// écran, c'est la ligne cliquée qui s'ouvre. Elle ne pose donc pas une
// troisième bande d'encre dans le parcours ; elle reprend la tuile-date
// de la liste, en grand, au même endroit du regard, et déroule dessous ce
// qu'on ne voyait pas dans la ligne.
//
// Le bandeau de faits en pied de héros porte les quatre ou cinq valeurs
// qu'on vient chercher en premier (échéance, équipement, responsable…).
// Elles vivaient plus bas, dans une <dl> : il fallait dérouler pour
// savoir si la fiche méritait qu'on s'y arrête.

import type { ReactNode } from "react";
import { MarqueurFamille } from "@/components/calendrier/MarqueurFamille";
import type { FamilleEcheance } from "@/lib/calendrier/echeances";
import type { RegistreLigne } from "@/lib/calendrier/etats";
import { TuileDate } from "./TuileDate";

export type FaitFiche = {
  cle: string;
  valeur: ReactNode;
  /** Sous-ligne discrète — « Dernière : 2 juil. 2025 ». */
  note?: ReactNode;
  /** Encre de retard sur la valeur. Réservé aux délais dépassés. */
  alerte?: boolean;
};

/** Classes statiques : Tailwind ne voit pas les noms construits à la volée. */
const COLONNES: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
};

export function HeroFiche({
  date,
  etat,
  famille,
  surtitre,
  titre,
  chapeau,
  pastilles,
  actions,
  faits = [],
  children,
}: {
  /** Absente = l'objet n'a pas de rendez-vous : le marqueur de famille
   *  tient la place, plutôt qu'une tuile qui afficherait un tiret. */
  date?: Date | null;
  etat: RegistreLigne;
  famille: FamilleEcheance;
  /** « Correction · Issue du DUERP » — la méta de la ligne du calendrier. */
  surtitre: ReactNode;
  titre: string;
  /** Une ligne de contexte sous le titre (lieu, prestataire…). */
  chapeau?: ReactNode;
  pastilles?: ReactNode;
  actions?: ReactNode;
  faits?: FaitFiche[];
  /** Contenu additionnel entre le titre et le bandeau de faits. */
  children?: ReactNode;
}) {
  const nb = Math.min(faits.length, 5);

  return (
    <section className="carte-board overflow-hidden">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-5 px-5 pb-6 pt-6 sm:px-9 sm:pt-7">
        {date ? (
          <TuileDate date={date} etat={etat} taille="fiche" />
        ) : (
          <span
            aria-hidden
            className="grid size-[84px] flex-none place-items-center rounded-[28px] bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-soft)]"
          >
            <MarqueurFamille famille={famille} className="size-8" />
          </span>
        )}

        {/* `min(280px, 100%)` : sur téléphone, la carte n'offre pas 280 px,
            et la fiche défilait de côté. Le texte passe sous la tuile. */}
        <div className="min-w-[min(280px,100%)] flex-1">
          <p className="board-eyebrow m-0 flex flex-wrap items-center gap-2.5 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            <MarqueurFamille famille={famille} className="size-[13px]" />
            {surtitre}
          </p>
          <h1 className="board-titre m-0 mt-2.5 max-w-[46ch] text-[clamp(23px,2.1vw,30px)]">
            {titre}
          </h1>
          {chapeau ? (
            <p className="m-0 mt-2 text-[14px] text-[color:var(--board-slate-mid)]">
              {chapeau}
            </p>
          ) : null}
          {pastilles ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {pastilles}
            </div>
          ) : null}
          {children}
        </div>

        {actions ? (
          <div className="flex flex-none flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {nb > 0 ? (
        <dl
          className={
            "m-0 grid grid-cols-1 divide-y divide-[color:var(--board-slate-line)] border-t border-[color:var(--board-slate-line)] sm:divide-x sm:divide-y-0 " +
            COLONNES[nb]
          }
        >
          {faits.slice(0, 5).map((f) => (
            <div key={f.cle} className="px-7 py-4 sm:px-6">
              <dt className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                {f.cle}
              </dt>
              <dd
                className={
                  "m-0 mt-1.5 text-[14.5px] font-semibold leading-[1.3] " +
                  (f.alerte
                    ? "text-[color:var(--board-signal-ink)]"
                    : "text-[color:var(--board-ink)]")
                }
              >
                {f.valeur}
              </dd>
              {f.note ? (
                <p className="m-0 mt-1 text-[12px] text-[color:var(--board-slate-mid)]">
                  {f.note}
                </p>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
