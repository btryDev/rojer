import type { ReactNode } from "react";
import Image from "next/image";
import { CarteFiche } from "@/components/ui-kit";
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
  /**
   * Une ligne : la délivrance et l'échéance, et d'où vient celle-ci — la
   * pièce, un calcul, ou rien (composée par la fiche).
   */
  dates: string;
  etat: RegistreLigne;
  /** Le mot de l'état, de la table de la fiche (`MOT_DE_L_ETAT`). */
  mot: string;
  dessin: { src: string; fond: string };
  /** `null` : pas de jauge — l'obligation ne s'applique plus. */
  jauge: JaugeTitre | null;
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
      {/* La piste est blanche : la carte du titre est déjà sur l'ardoise pâle. */}
      <div aria-hidden className="relative h-2 overflow-hidden rounded-full bg-[color:var(--board-card)]">
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
        // Une carte par titre (retour de la propriétaire, 2026-10-24) : la
        // grille se lit d'un coup d'œil, et une carte tient seule sur un
        // téléphone.
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {lignes.map((t) => (
            <li
              key={t.id}
              className={
                "flex flex-col rounded-[22px] p-4 " +
                (t.etat === "enRetard"
                  ? "bg-[color:var(--board-signal-wash)] shadow-[inset_0_0_0_1px_var(--board-signal-pale)]"
                  : "bg-[color:var(--board-slate-pale)]/70")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className="grid size-[52px] flex-none place-items-center rounded-[18px]"
                  style={{ background: t.dessin.fond }}
                >
                  <Image src={t.dessin.src} alt="" width={40} height={40} />
                </span>
                {/* Le point porte l'état, le mot le nomme : une signalétique
                    qui tient à une couleur disparaît en niveaux de gris et
                    pour qui n'y voit pas. */}
                <span
                  className="inline-flex max-w-[60%] items-start gap-1.5 text-[11.5px] font-semibold leading-[1.3]"
                  style={{ color: ENCRE_ETAT[t.etat] }}
                >
                  <span
                    aria-hidden
                    className="mt-[4px] size-[7px] flex-none rounded-full"
                    style={{ background: champDeLaJauge(t.etat) }}
                  />
                  {t.mot}
                </span>
              </div>
              <p className="m-0 mt-3 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                {t.libelle}
              </p>
              <p className="m-0 mt-1.5 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                {t.dates}
              </p>
              {t.jauge && <Jauge jauge={t.jauge} etat={t.etat} />}
              {t.renvoiAuxNormes && (
                <p className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                  {t.renvoiAuxNormes}
                </p>
              )}
              {/* ADR-039 : un rythme que le texte n'écrit pas se dit comme
                  tel. Sur une ligne (retour de la propriétaire, 2026-10-24) :
                  la phrase entière reste lue par un lecteur d'écran. */}
              {t.rythmeRetenu && (
                <p className="m-0 mt-1.5 truncate text-[11.5px] font-medium text-[color:var(--board-slate-soft)]">
                  <span aria-hidden>{t.rythmeRetenu.court}</span>
                  <span className="sr-only">{t.rythmeRetenu.long}</span>
                </p>
              )}
              {t.redevientDue && (
                <p className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                  Redevient due à chaque changement de poste ou de technique :
                  déclarez alors la nouvelle formation.
                </p>
              )}
              {t.note && (
                <p className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-soft)]">
                  {t.note}
                </p>
              )}
              {/* Les gestes en pied de carte, alignés d'une carte à l'autre. */}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                <ReferenceFondatrice obligation={t} />
                {/* Les gestes à droite, la référence à gauche (retour de la
                    propriétaire, 2026-10-24). */}
                <div className="ml-auto flex items-center gap-3">
                  {t.retirer}
                  {t.geste}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CarteFiche>
  );
}
