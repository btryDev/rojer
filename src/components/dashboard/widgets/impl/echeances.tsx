"use client";

// Widget « Prochaines échéances » — 2 variants :
//  - list     : liste verticale (titre + equip · date J+N + pastille)
//  - timeline : axe horizontal avec dots marqués aux dates (historique)
//
// La variante « liste » parlait un dialecte à elle : en-tête en `.v2-title` /
// `.v2-subtitle`, séparateurs en pointillé, pastilles `.pill-v2` monospacées
// dont l'une en contour tireté. Elle était seule de tout le board dans ce
// registre — et les classes `v2-*` tirent leurs couleurs de `--ink`, `--rule`
// et `--muted-foreground`, c'est-à-dire de la charte papier, celle qui est de
// la dette. Elle passe donc à ce que le reste du board emploie : `BentoCell`
// pour l'en-tête, filets pleins en `--board-slate-line`, et les couples
// champ/encre de `CHAMP_ETAT`/`ENCRE_ETAT` pour les pastilles.
//
// Le monospace ne disparaît pas pour autant : la charte le réserve aux
// sur-titres et aux DATES, qui le gardent ici. C'est le libellé d'équipement
// qui n'y avait pas droit — c'est une méta de ligne, pas une date.

import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";
import { LienProvenance } from "@/components/navigation/LienProvenance";
import { BentoCell } from "@/components/dashboard/BentoCell";
import { formaterDateCourteFr } from "@/lib/dates";
import { estVerificationEnRetard } from "@/lib/dates/retard";
import { libelleEcart } from "../temps";
import { estEcheanceContractuelle } from "@/lib/prescriptions/sources";
import { MentionContractuelle } from "@/components/prescriptions/MentionContractuelle";
import type { DashboardBundle } from "../types";

// Toutes les fonctions temporelles reçoivent la date de référence du
// bundle (`aujourdhui`, figée côté serveur) : un `new Date()` au rendu
// créerait un écart d'hydratation SSR/CSR. L'écart, lui, se compte en
// jours civils (cf. `../temps`) : comparer des instants faisait basculer
// une échéance du jour en « J−1 » vers 14 h, heure de Paris.

function classifier(
  statut: string,
  datePrevue: Date,
  libelleObligation: string,
  aujourdhui: Date,
): { tone: "alerte" | "warn" | "ok"; libelleDate: string } {
  // Même prédicat que partout ailleurs (ADR-011) : le retard commence à
  // minuit, heure de Paris, du jour qui suit l'échéance — et c'est la
  // date qui le décide, pas le statut. La liste ne porte que des
  // occurrences non réalisées.
  //
  // `libelleObligation` n'est pas décoratif : il porte le marqueur
  // d'archivage. La requête qui alimente ce widget filtre sur le statut et
  // ne le regarde pas, si bien qu'une ligne archivée gelée sur `depassee`
  // arrivait ici — et, triée par date croissante, arrivait EN TÊTE, sa date
  // étant la plus ancienne. Elle s'affichait en alerte, titrée « Ne
  // s'applique plus — … ».
  if (
    estVerificationEnRetard(
      { statut, datePrevue, dateRealisee: null, libelleObligation },
      aujourdhui,
    )
  ) {
    return { tone: "alerte", libelleDate: formaterDateCourteFr(datePrevue) };
  }
  if (statut === "a_planifier") {
    return { tone: "warn", libelleDate: "—" };
  }
  return { tone: "ok", libelleDate: formaterDateCourteFr(datePrevue) };
}

export function WidgetProchainesEcheances({
  bundle,
  variant,
}: {
  bundle: DashboardBundle;
  variant: string;
}) {
  const { prochainesVerifs, etablissementId, aujourdhui } = bundle;

  if (prochainesVerifs.length === 0) {
    return (
      <BentoCell kicker="Prochaines échéances" sub="Les 5 prochaines vérifications">
        <p className="mt-3 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          Aucune vérification planifiée pour l&apos;instant.
        </p>
      </BentoCell>
    );
  }

  if (variant === "timeline") {
    return (
      <BentoCell
        kicker="Prochaines échéances"
        more={{
          href: `/etablissements/${etablissementId}/calendrier`,
          label: "Tout voir",
        }}
      >
        <TimelineEcheances
          verifs={prochainesVerifs}
          etablissementId={etablissementId}
          aujourdhui={aujourdhui}
        />
      </BentoCell>
    );
  }

  // Variant "list" : titre + equip (gauche) · date + J+N + pastille (droite)
  return (
    <BentoCell
      kicker="Prochaines échéances"
      sub="Les 5 prochaines vérifications"
      more={{
        href: `/etablissements/${etablissementId}/calendrier`,
        label: "Tout voir",
      }}
    >
      <ul className="m-0 mt-1 flex list-none flex-col p-0">
        {prochainesVerifs.map((v, i) => {
          const c = classifier(v.statut, v.datePrevue, v.libelleObligation, aujourdhui);
          // Les trois états que cette liste sait montrer, pris à la table
          // unique : un couple champ/encre réinventé ici a déjà rendu un
          // « à venir » rose dans un écran sur trois.
          const etat =
            c.tone === "alerte"
              ? "enRetard"
              : c.tone === "warn"
                ? "aPlanifier"
                : "lointain";
          const pillLabel =
            c.tone === "alerte"
              ? "Dépassé"
              : c.tone === "warn"
                ? "À planifier"
                : "Planifié";
          const dans =
            v.statut === "a_planifier"
              ? "À planifier"
              : libelleEcart(v.datePrevue, aujourdhui);
          const dansColor =
            c.tone === "alerte" ? "text-[color:var(--board-signal-ink)]" : "text-[color:var(--board-slate-mid)]";
          return (
            <li
              key={v.id}
              // Filet plein, et sur le `<li>` : le pointillé était le seul
              // du board, et `--board-slate` n'est pas une encre de filet —
              // c'est la teinte des graduations.
              className={
                i === 0
                  ? ""
                  : "border-t border-[color:var(--board-slate-line)]"
              }
            >
              <LienProvenance
                href={`/etablissements/${etablissementId}/verifications/${v.id}`}
                className="grid grid-cols-[1fr_auto] items-start gap-3 rounded-md py-3 transition-colors hover:bg-[color:var(--board-slate-pale)]"
              >
                <div className="min-w-0">
                  {/* Le marquage est une pastille à côté du libellé, jamais
                      un morceau du libellé : celui-ci est tronqué, et un
                      marquage tronqué disparaît précisément sur les lignes
                      longues — c'est-à-dire sur celles qu'un assureur
                      impose (ADR-032). */}
                  <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium tracking-[-0.005em]">
                    <span className="truncate">{v.libelleObligation}</span>
                    {estEcheanceContractuelle(v) ? (
                      <MentionContractuelle />
                    ) : null}
                  </p>
                  {/* Méta de ligne, pas une date : elle n'a rien à faire en
                      monospace, et le `tracking` positif hors capitales
                      monospacées n'existe pas dans le barème. */}
                  <p className="mt-[3px] truncate text-[12.5px] text-[color:var(--board-slate-mid)]">
                    {v.equipement.libelle}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {/* La date garde le monospace : le barème le lui réserve,
                      avec les sur-titres. */}
                  <span className="font-mono text-[12px] tabular-nums text-[color:var(--board-slate-ink)]">
                    {c.libelleDate}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={"text-[12px] " + dansColor}>{dans}</span>
                    <span
                      className="pastille-board flex-none"
                      style={{
                        background: CHAMP_ETAT[etat],
                        color: ENCRE_ETAT[etat],
                      }}
                    >
                      {pillLabel}
                    </span>
                  </div>
                </div>
              </LienProvenance>
            </li>
          );
        })}
      </ul>
    </BentoCell>
  );
}

function TimelineEcheances({
  verifs,
  etablissementId,
  aujourdhui,
}: {
  verifs: DashboardBundle["prochainesVerifs"];
  etablissementId: string;
  aujourdhui: Date;
}) {
  // Axe temporel : de aujourd'hui à la dernière date prévue (au moins
  // 30 jours d'horizon pour ne pas écraser si toutes proches).
  const toJour = aujourdhui.getTime();
  const maxFutur = Math.max(
    ...verifs.map((v) => v.datePrevue.getTime()),
    toJour + 30 * 86_400_000,
  );
  const minPasse = Math.min(
    ...verifs.map((v) => v.datePrevue.getTime()),
    toJour,
  );
  const span = Math.max(1, maxFutur - minPasse);

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* Axe avec ticks d'aujourd'hui */}
      <div className="relative h-16 w-full">
        {/* Ligne de base */}
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-rule" />
        {/* Marker "aujourd'hui" */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${((toJour - minPasse) / span) * 100}%` }}
        >
          <div className="h-8 w-px bg-ink" />
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[color:var(--board-ink)]">
            aujourd&apos;hui
          </span>
        </div>
        {/* Markers des échéances */}
        {verifs.map((v) => {
          const c = classifier(v.statut, v.datePrevue, v.libelleObligation, aujourdhui);
          const left =
            ((v.datePrevue.getTime() - minPasse) / span) * 100;
          const color =
            c.tone === "alerte"
              ? CHAMP_ETAT.enRetard
              : c.tone === "warn"
                ? CHAMP_ETAT.proche
                : CHAMP_ETAT.lointain;
          return (
            <div
              key={v.id}
              className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%` }}
            >
              <span
                aria-hidden
                className="block size-3 rounded-full border-2 border-paper-elevated"
                style={{ background: color }}
              />
              <span
                className="invisible absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-0.5 font-mono text-[10px] text-paper-elevated group-hover:visible"
                role="tooltip"
              >
                {v.libelleObligation}
                {estEcheanceContractuelle(v) ? " (assurance)" : ""} ·{" "}
                {c.libelleDate}
              </span>
            </div>
          );
        })}
      </div>

      {/* Légende / liste compacte */}
      <ul className="flex flex-col gap-1.5">
        {verifs.slice(0, 5).map((v) => {
          const c = classifier(v.statut, v.datePrevue, v.libelleObligation, aujourdhui);
          const dotColor =
            c.tone === "alerte"
              ? CHAMP_ETAT.enRetard
              : c.tone === "warn"
                ? CHAMP_ETAT.proche
                : CHAMP_ETAT.lointain;
          return (
            <li key={v.id}>
              <LienProvenance
                href={`/etablissements/${etablissementId}/verifications/${v.id}`}
                className="flex items-center gap-3 rounded-md px-1 py-1 text-[0.82rem] transition-colors hover:bg-[color:var(--board-slate-pale)]"
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: dotColor }}
                />
                <span className="flex-1 truncate">{v.libelleObligation}</span>
                {estEcheanceContractuelle(v) ? <MentionContractuelle /> : null}
                <span className="font-mono text-[0.76rem] text-[color:var(--board-slate-mid)]">
                  {c.libelleDate}
                </span>
              </LienProvenance>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
