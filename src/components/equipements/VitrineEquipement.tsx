// La carte d'un appareil dans le parc.
//
// Ce qu'elle remplace : une ligne de liste dont l'objet le plus visible
// était une tuile-date. Le parc répond à « qu'est-ce que j'ai, et où » —
// pas à « qu'est-ce qui tombe quand », qui est la question du calendrier.
// La date a donc quitté l'inventaire ; ce que la carte montre en grand,
// c'est le LIEU, et ce qu'elle chiffre en petit, ce sont des signaux.
//
// Le champ ne porte pas la marque de catégorie : dans une section
// « Extincteurs », la répéter quatre fois n'apprend rien. Il porte le
// « où », qui a deux étages depuis l'ADR-019 : le bâtiment, et la
// précision dans le bâtiment. La carte ne décide pas lequel des deux
// s'affiche en grand — c'est l'écran qui sait s'il y a plusieurs
// bâtiments, et s'il en a déjà nommé un en tête.

import Link from "next/link";
import { MapPin } from "lucide-react";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";
import type { SignalEquipement } from "@/lib/equipements/etat-verifications";

/* La table de correspondance qui vivait ici a disparu avec sa cause. Elle
   traduisait la clé `aVenir` — qui réunissait `proche` et `lointain` — en un
   seul état, `lointain`, et peignait donc en bleu « plus tard » un compte
   pouvant ne contenir que des échéances des trente prochains jours. Le signal
   porte désormais son état, et la couleur n'a plus à être devinée. */

function Signal({ signal }: { signal: SignalEquipement }) {
  const etat = signal.cle;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--board-slate-pale)] px-2.5 py-[5px] text-[11.5px] font-semibold"
      style={{ color: ENCRE_ETAT[etat] }}
    >
      {/* Le cerne n'est pas une bordure décorative : `CHAMP_ETAT.aPlanifier`
          VAUT `--board-slate-pale`, le fond de cette pastille. Sans lui, la
          puce de « à planifier » est peinte exactement de la couleur sur
          laquelle elle est posée — 1,00:1 — et le dirigeant lit quatre
          signaux colorés et une étiquette nue, sur l'état qui dit justement
          qu'aucune date n'est convenue. Le calendrier avait déjà rencontré
          ce défaut et l'avait réglé par un cerne (cf. contraste.test.ts) ;
          cet écran-ci ne l'avait pas repris. L'encre de l'état porte donc
          le cerne : la garde mesure qu'elle atteint le seuil graphique sur
          ce fond, pour les cinq états. */}
      <span
        aria-hidden
        className="size-[7px] flex-none rounded-full"
        style={{
          background: CHAMP_ETAT[etat],
          boxShadow: `inset 0 0 0 1px ${ENCRE_ETAT[etat]}`,
        }}
      />
      {signal.libelle}
    </span>
  );
}

export function VitrineEquipement({
  libelle,
  lieu,
  precision,
  signaux,
  horsReferentiel,
  href,
}: {
  libelle: string;
  /** Ce que le champ annonce en grand. `null` = non renseigné, et l'écran
   *  le dit plutôt que de laisser un blanc. */
  lieu: string | null;
  /** Le second étage du lieu, en petit sous le premier : la localisation
   *  dans le bâtiment quand c'est le bâtiment qui est annoncé en grand.
   *  `null` — le cas courant — n'affiche rien. */
  precision?: string | null;
  signaux: SignalEquipement[];
  /** Le référentiel ne calcule aucune échéance pour cet appareil. Le
   *  silence ne doit jamais ressembler à une réponse : sans cette
   *  mention, un appareil muet et un appareil à jour affichent la même
   *  chose — rien. */
  horsReferentiel?: { libelle: string; explication: string } | null;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="carte-board group flex flex-col overflow-hidden rounded-[22px]"
    >
      <span
        className={
          "flex h-[104px] flex-none flex-col items-start justify-end gap-2 p-3.5 " +
          (lieu
            ? "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
            : "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-soft)]")
        }
      >
        <MapPin className="size-[22px]" aria-hidden />
        <span className="min-w-0">
          <span
            className={
              "block font-mono text-[11px] font-semibold uppercase leading-[1.25] tracking-[0.1em] " +
              (precision ? "line-clamp-1" : "line-clamp-2")
            }
          >
            {lieu ?? "Emplacement non précisé"}
          </span>
          {/* La précision ne devient jamais le grand titre : elle ne
              distingue rien tant qu'on ne sait pas de quel bâtiment on
              parle. */}
          {precision ? (
            <span className="mt-1 line-clamp-1 block text-[11.5px] leading-[1.3] opacity-75">
              {precision}
            </span>
          ) : null}
        </span>
      </span>

      <span className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <span className="text-[15px] font-semibold leading-[1.25] text-[color:var(--board-ink)]">
          {libelle}
        </span>
        <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {/* Le motif passe devant : c'est le seul état que la carte ne
              pouvait pas montrer. Il s'ajoute aux signaux, il ne les
              remplace pas — les vérifications déjà faites restent la
              seule chose à présenter en cas de contrôle. */}
          {horsReferentiel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--board-slate-pale)] px-2.5 py-[5px] text-[11.5px] font-semibold text-[color:var(--board-slate-mid)]">
              <span
                aria-hidden
                className="size-[7px] flex-none rounded-full bg-[color:var(--board-slate)]"
              />
              {horsReferentiel.libelle}
            </span>
          ) : null}
          {signaux.length > 0 ? (
            signaux.map((s) => <Signal key={s.cle} signal={s} />)
          ) : horsReferentiel ? null : (
            <span className="text-[12px] text-[color:var(--board-slate-soft)]">
              Aucune vérification rattachée
            </span>
          )}
        </span>

        {/* La phrase longue s'écrit en clair, jamais en infobulle : elle
            porte l'avertissement qui empêche l'écran de laisser croire
            qu'il n'y a rien à faire — « cela ne veut pas dire qu'aucune
            vérification ne lui est due ». Une infobulle n'existe pas au
            doigt, et c'est exactement la phrase qu'il ne faut pas
            cacher. */}
        {horsReferentiel ? (
          <span className="mt-2.5 block text-[11.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            {horsReferentiel.explication}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
