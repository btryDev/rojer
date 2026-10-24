import type { ReactNode } from "react";
import Image from "next/image";
import { CarteFiche } from "@/components/ui-kit";
import { MentionRythmeRetenu } from "@/components/referentiel/MentionRythmeRetenu";
import { CHAMP_ETAT, ENCRE_ETAT, type RegistreLigne } from "@/lib/calendrier/etats";
import type { MentionRythme } from "@/lib/referentiels/conformite/mention-rythme";
import type { ReferenceLegale } from "@/lib/referentiels/conformite";
import type { JaugeTitre } from "@/lib/salaries/jauge-titre";
import { ReferenceFondatrice } from "./ReferenceFondatrice";

/**
 * « Titres détenus » (refonte de la fiche, 2026-10-24).
 *
 * Chaque titre porte sa jauge : de la délivrance à l'échéance, remplie
 * jusqu'à aujourd'hui, et le temps restant en clair (`jauge-titre.ts`). On
 * voit d'un coup d'œil ce qui tient encore et ce qui s'arrête. ~~Une frise
 * commune à tous les titres~~ [même jour : sur un axe partagé, les années se
 * serraient et le téléphone n'en laissait rien — retour de la propriétaire.]
 *
 * La couleur d'une jauge est celle de l'état (`CHAMP_ETAT`), jamais une
 * teinte locale. Un titre sans échéance a une barre qui s'estompe : il n'a
 * pas de terme écrit, et la jauge ne lui en invente pas.
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
  jauge: JaugeTitre;
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
 * Le champ d'une jauge. Celui de l'état, sauf « à planifier » : son champ est
 * l'ardoise pâle de la piste elle-même, et la barre d'un titre sans échéance
 * disparaissait dedans (contrôle visuel du 2026-10-24). L'ardoise de
 * graduation la rend visible sans en faire une encre.
 */
function champDeLaJauge(etat: RegistreLigne): string {
  return etat === "aPlanifier" ? "var(--board-slate)" : CHAMP_ETAT[etat];
}

function Jauge({ jauge, etat }: { jauge: JaugeTitre; etat: RegistreLigne }) {
  const champ = champDeLaJauge(etat);
  return (
    <div className="mt-3">
      <div aria-hidden className="relative h-2 overflow-hidden rounded-full bg-[color:var(--board-slate-pale)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={
            jauge.ecoule === null
              ? { width: "100%", background: `linear-gradient(90deg, ${champ} 0%, ${champ} 40%, transparent 100%)` }
              : { width: `max(8px, ${jauge.ecoule * 100}%)`, background: champ }
          }
        />
      </div>
      {/* Sans échéance, l'état le dit déjà (« Sans terme écrit ») : la
          phrase de la jauge le répéterait. */}
      {jauge.ecoule !== null && (
        <p
          className="m-0 mt-1.5 text-[12px] font-semibold tabular-nums"
          style={{ color: ENCRE_ETAT[etat] }}
        >
          {jauge.phrase}
        </p>
      )}
    </div>
  );
}

export function CarteTitresDetenus({
  lignes,
  ajouter,
  avant,
  vide,
}: {
  lignes: readonly LigneTitre[];
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
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {lignes.map((t) => (
            <li
              key={t.id}
              className={
                "flex gap-3 rounded-[22px] px-4 py-4 sm:gap-4 " +
                (t.etat === "enRetard"
                  ? "bg-[color:var(--board-signal-wash)]"
                  : "bg-[color:var(--board-slate-pale)]/60")
              }
            >
              <span
                aria-hidden
                className="grid size-10 flex-none place-items-center rounded-[14px] sm:size-[52px] sm:rounded-[18px]"
                style={{ background: t.dessin.fond }}
              >
                <Image src={t.dessin.src} alt="" width={40} height={40} className="size-8 sm:size-10" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <p className="m-0 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                    {t.libelle}
                  </p>
                  {/* Le point porte l'état, le mot le nomme : une
                      signalétique qui tient à une couleur disparaît en
                      niveaux de gris et pour qui n'y voit pas. */}
                  <span
                    className="inline-flex flex-none items-center gap-1.5 whitespace-nowrap text-[11.5px] font-semibold"
                    style={{ color: ENCRE_ETAT[t.etat] }}
                  >
                    <span
                      aria-hidden
                      className="size-[7px] flex-none rounded-full"
                      style={{ background: champDeLaJauge(t.etat) }}
                    />
                    {t.mot}
                  </span>
                </div>
                <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                  {t.dates}
                </p>
                <Jauge jauge={t.jauge} etat={t.etat} />
                {t.renvoiAuxNormes && (
                  <p className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                    {t.renvoiAuxNormes}
                  </p>
                )}
                {t.rythmeRetenu && (
                  <p className="m-0 mt-1.5">
                    <MentionRythmeRetenu mention={t.rythmeRetenu} />
                  </p>
                )}
                {t.redevientDue && (
                  <p className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                    Redevient due à chaque changement de poste ou de
                    technique : déclarez alors la nouvelle formation.
                  </p>
                )}
                {t.note && (
                  <p className="m-0 mt-1 text-[12px] leading-[1.5] text-[color:var(--board-slate-soft)]">
                    {t.note}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <ReferenceFondatrice obligation={t} />
                  {t.geste}
                  {t.retirer}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CarteFiche>
  );
}
