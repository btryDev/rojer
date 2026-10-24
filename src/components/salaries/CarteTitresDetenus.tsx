import type { ReactNode } from "react";
import Image from "next/image";
import { CarteFiche } from "@/components/ui-kit";
import { MentionRythmeRetenu } from "@/components/referentiel/MentionRythmeRetenu";
import { CHAMP_ETAT, ENCRE_ETAT, type RegistreLigne } from "@/lib/calendrier/etats";
import type { MentionRythme } from "@/lib/referentiels/conformite/mention-rythme";
import type { ReferenceLegale } from "@/lib/referentiels/conformite";
import type { FriseTitres } from "@/lib/salaries/frise-titres";
import { ReferenceFondatrice } from "./ReferenceFondatrice";

/**
 * « Titres détenus » (refonte de la fiche, 2026-10-24).
 *
 * Chaque titre est une ligne ET un couloir de la frise : sa période de
 * validité sur un axe commun à toute la fiche, de la délivrance à l'échéance,
 * avec le repère d'aujourd'hui. On voit d'un coup d'œil ce qui couvre la
 * personne aujourd'hui et ce qui s'arrête — sans lire une date. Le texte reste
 * à gauche, intact : la frise ne dit rien qui ne soit écrit à côté.
 *
 * La couleur d'un couloir est celle de l'état (`CHAMP_ETAT`), jamais une
 * teinte locale. Un titre sans échéance court jusqu'au bout de l'axe et
 * s'estompe : il n'expire pas, et la frise ne lui invente pas de fin.
 */

export type LigneTitre = {
  id: string;
  obligationId: string;
  libelle: string;
  /** La phrase des dates, déjà composée par la fiche. */
  dates: string;
  etat: RegistreLigne;
  /** Le mot de l'état, de la table de la fiche (`MOT_DE_L_ETAT`). */
  mot: string;
  dessin: { src: string; fond: string };
  referencesLegales: readonly ReferenceLegale[];
  rythmeRetenu: MentionRythme | null;
  /** La phrase du renvoi aux normes, quand aucune date n'est portée. */
  renvoiAuxNormes: string | null;
  note: string | null;
  /** La formation revient à un fait (changement de poste, de technique). */
  redevientDue: boolean;
  /** Le bouton « Renouveler », posé par la fiche quand l'échéance approche. */
  geste: ReactNode;
  /** Le bouton « Retirer ». */
  retirer: ReactNode;
};

/**
 * Le champ d'un couloir. Celui de l'état, sauf « à planifier » : son champ est
 * l'ardoise pâle de la piste elle-même, et la barre d'un titre sans échéance
 * disparaissait dedans (contrôle visuel du 2026-10-24). L'ardoise de
 * graduation la rend visible sans en faire une encre.
 */
function champDuCouloir(etat: RegistreLigne): string {
  return etat === "aPlanifier" ? "var(--board-slate)" : CHAMP_ETAT[etat];
}

function Couloir({
  frise,
  debut,
  fin,
  etat,
}: {
  frise: FriseTitres;
  debut: number;
  fin: number | null;
  etat: RegistreLigne;
}) {
  const champ = champDuCouloir(etat);
  const largeur = (fin ?? 1) - debut;
  return (
    <div aria-hidden className="relative h-9">
      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[color:var(--board-slate-pale)]" />
      <div
        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
        style={{
          left: `${debut * 100}%`,
          width: `max(8px, ${largeur * 100}%)`,
          background:
            fin === null
              ? `linear-gradient(90deg, ${champ} 0%, ${champ} 55%, transparent 100%)`
              : champ,
        }}
      />
      {/* La délivrance : un point d'encre, le départ de la couverture. */}
      <span
        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--board-ink)] ring-[3px] ring-[color:var(--board-card)]"
        style={{ left: `${debut * 100}%` }}
      />
      {fin !== null && (
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-[color:var(--board-card)]"
          style={{ left: `${fin * 100}%`, background: champ, boxShadow: `0 0 0 4.5px ${ENCRE_ETAT[etat]}` }}
        />
      )}
      <span
        className="absolute -bottom-1 -top-1 w-0.5 -translate-x-1/2 rounded-sm bg-[color:var(--board-ink)]"
        style={{ left: `${frise.aujourdhui * 100}%` }}
      />
    </div>
  );
}

/** Les années, et les deux repères qui comptent : l'entrée et aujourd'hui. */
function Axe({ frise }: { frise: FriseTitres }) {
  return (
    <div aria-hidden className="relative h-10">
      {frise.graduations.map((g, i) => (
        <span
          key={g.annee}
          className={
            "absolute bottom-0 font-mono text-[10px] tabular-nums text-[color:var(--board-slate-mid)] " +
            // Sur un téléphone, l'axe n'a la place que de ses deux bouts :
            // neuf années sur 200 px se chevauchaient (contrôle visuel).
            (i === 0 || i === frise.graduations.length - 1 ? "" : "hidden sm:block ") +
            // Les deux bouts se calent dedans, pour ne pas déborder la carte.
            (g.position <= 0.02
              ? "translate-x-0"
              : g.position >= 0.98
                ? "-translate-x-full"
                : "-translate-x-1/2")
          }
          style={{ left: `${g.position * 100}%` }}
        >
          {g.annee}
        </span>
      ))}
      {frise.entree !== null && (
        <span
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-[color:var(--board-slate-pale)] px-2 py-[2px] text-[10.5px] font-medium text-[color:var(--board-slate-mid)]"
          style={{ left: `${Math.max(0.04, frise.entree) * 100}%` }}
        >
          Entrée
        </span>
      )}
      <span
        className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-[color:var(--board-ink)] px-2 py-[2px] text-[10.5px] font-medium text-white"
        style={{ left: `${Math.min(0.92, frise.aujourdhui) * 100}%` }}
      >
        Aujourd&apos;hui
      </span>
    </div>
  );
}

export function CarteTitresDetenus({
  lignes,
  frise,
  ajouter,
  avant,
  vide,
}: {
  lignes: readonly LigneTitre[];
  frise: FriseTitres;
  /** « Ajouter un titre », en tête de carte. */
  ajouter: ReactNode;
  /** Ce qui se lit avant la liste : les cumuls que le droit écarte. */
  avant?: ReactNode;
  /** La phrase de l'état vide. */
  vide: ReactNode;
}) {
  return (
    <CarteFiche titreFort="Titres détenus" droite={ajouter}>
      {avant}
      {lignes.length === 0 ? (
        vide
      ) : (
        <>
          {/* L'axe a la largeur des couloirs : la colonne de droite en deux
              colonnes, toute la ligne en une seule. */}
          <div className="mb-1 grid grid-cols-1 gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <span className="hidden lg:block" />
            <Axe frise={frise} />
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {lignes.map((t) => {
              const c = frise.couloirs[t.id];
              return (
                <li
                  key={t.id}
                  className={
                    "grid grid-cols-1 items-center gap-x-6 gap-y-3 rounded-[22px] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] " +
                    (t.etat === "enRetard"
                      ? "bg-[color:var(--board-signal-wash)]"
                      : "bg-[color:var(--board-slate-pale)]/60")
                  }
                >
                  <div className="flex min-w-0 gap-4">
                    <span
                      aria-hidden
                      className="grid size-[52px] flex-none place-items-center rounded-[18px]"
                      style={{ background: t.dessin.fond }}
                    >
                      <Image src={t.dessin.src} alt="" width={40} height={40} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                        {t.libelle}
                      </p>
                      <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                        {t.dates}
                      </p>
                      {t.renvoiAuxNormes && (
                        <p className="m-0 mt-1 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                          {t.renvoiAuxNormes}
                        </p>
                      )}
                      {t.rythmeRetenu && (
                        <p className="m-0 mt-1.5">
                          <MentionRythmeRetenu mention={t.rythmeRetenu} />
                        </p>
                      )}
                      {t.redevientDue && (
                        <p className="m-0 mt-1 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                          Redevient due à chaque changement de poste ou de
                          technique : déclarez alors la nouvelle formation.
                        </p>
                      )}
                      {t.note && (
                        <p className="m-0 mt-1 text-[12px] leading-[1.5] text-[color:var(--board-slate-soft)]">
                          {t.note}
                        </p>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-3">
                        <ReferenceFondatrice obligation={t} />
                        {t.geste}
                        {t.retirer}
                      </div>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    {/* Le point porte l'état, le mot le nomme : une
                        signalétique qui tient à une couleur disparaît en
                        niveaux de gris et pour qui n'y voit pas. Au-dessus du
                        couloir, à droite : toujours au même endroit, quelle
                        que soit la longueur du libellé. */}
                    <span
                      className="inline-flex items-center gap-1.5 self-start whitespace-nowrap text-[11.5px] font-semibold lg:self-end"
                      style={{ color: ENCRE_ETAT[t.etat] }}
                    >
                      <span
                        aria-hidden
                        className="size-[7px] flex-none rounded-full"
                        style={{ background: champDuCouloir(t.etat) }}
                      />
                      {t.mot}
                    </span>
                    {c && <Couloir frise={frise} debut={c.debut} fin={c.fin} etat={t.etat} />}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="m-0 mt-3 text-[12px] leading-[1.5] text-[color:var(--board-slate-soft)]">
            {/* La légende de la frise, en clair : sans elle, une barre qui
                s'estompe se lirait comme une donnée manquante. */}
            Chaque barre va de la délivrance à l&apos;échéance. Une barre qui
            s&apos;estompe n&apos;a pas d&apos;échéance : aucun texte
            n&apos;en fixe pour ce titre.
          </p>
        </>
      )}
    </CarteFiche>
  );
}
