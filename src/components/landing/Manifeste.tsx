// LA BANDE NOIRE — la phrase de marque, puis sa contrepartie concrète :
// ce que Rojer prend en charge pour que vous puissiez travailler.
//
// Partage éditorial de la page, pour qu'aucune section ne répète l'autre :
//   · ici       → ce qu'on vous retire des mains (les dates, le classement
//                 des preuves, l'ordre de priorité)
//   · le cadran → ce que ça produit (les six documents)
//   · « Trois étapes » → ce que ça coûte à prendre en main (≈ 30 min, puis
//                 ce qui arrive à échéance)
//   · ~~« Par métier »~~ — n'est plus une section de cette page (elle vit
//     dans le guide, derrière la connexion) ; le lien du pied est retiré.
//
// Cette bande a absorbé l'ancienne « Sur le terrain », qui racontait la
// même mécanique une troisième fois. Chaque charge est nommée par ce
// qu'elle vous épargne, jamais par un automatisme : on ne dit pas qu'un
// rapport « se range tout seul », on dit où il va.
//
// Chaque temps porte un petit schéma en CSS plutôt qu'une icône.

import { Reveal } from "./Reveal";

const CHARGES = [
  {
    numero: "01",
    titre: "Vos échéances, posées et recalculées",
    corps:
      "Quand un texte fixe le rythme d'une vérification, sa date se pose, et se reporte à chaque rapport déposé. Le reste se lit sans date : un état à tenir, un événement qui déclenche.",
  },
  {
    // Pas seulement des rapports : le stockage reçoit aussi les
    // attestations de prestataires (URSSAF, RC Pro, Kbis) et les bulletins
    // d'analyse du carnet sanitaire.
    numero: "02",
    titre: "Vos pièces, classées à l'arrivée",
    corps:
      "Rapport, attestation, analyse d'eau, permis signé : chacune se range là où elle sert, horodatée.",
  },
  {
    numero: "03",
    titre: "Votre semaine, déjà triée",
    corps:
      "Le retard passe devant, ce qui approche est annoncé, le reste attend son tour.",
  },
];

/** Jeton du schéma : un mot posé sur un fond d'encre claire. */
function Jeton({
  children,
  fort = false,
}: {
  children: React.ReactNode;
  fort?: boolean;
}) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] " +
        (fort
          ? "bg-[color:var(--board-sky)] text-[color:var(--board-ink)]"
          : "bg-white/10 text-white/70")
      }
    >
      {children}
    </span>
  );
}

/** Les trois files d'attente du brief, dans l'ordre où Rojer les sert. */
const FILES = [
  { ton: "var(--board-signal)", label: "En retard", compte: "1" },
  { ton: "var(--board-amber)", label: "Cette semaine", compte: "2" },
  { ton: "rgba(255,255,255,.22)", label: "Plus tard", compte: "12" },
];

/** Les trois schémas. Un par charge, dans l'ordre. */
const SCHEMAS = [
  // 01 — la date qui se repose d'elle-même, douze mois plus loin.
  <div key="dates" className="flex items-center gap-2">
    <Jeton>12 mars 2026</Jeton>
    <span aria-hidden className="relative h-px w-16 flex-none bg-white/25">
      <span className="absolute -top-[9px] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[0.55rem] tracking-[0.1em] text-white/45">
        +12 mois
      </span>
    </span>
    <Jeton fort>12 mars 2027</Jeton>
  </div>,

  // 02 — la pièce déposée et sa place. « Pièce » et non « rapport » :
  // attestations, analyses et photos passent par le même chemin.
  <div key="preuves" className="flex items-center gap-2">
    <Jeton>Pièce déposée</Jeton>
    <span aria-hidden className="h-px w-6 flex-none bg-white/25" />
    <Jeton fort>Classée, horodatée</Jeton>
  </div>,

  // 03 — l'ordre de passage : trois files, une seule à traiter maintenant.
  <div key="priorite" className="flex flex-col gap-2.5">
    {FILES.map((f) => (
      <span key={f.label} className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-2 flex-none rounded-full"
          style={{ background: f.ton }}
        />
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-white/55">
          {f.label}
        </span>
        <span className="font-mono text-[0.62rem] tabular-nums text-white/35">
          {f.compte}
        </span>
      </span>
    ))}
  </div>,
];

export function Manifeste() {
  return (
    <section className="bg-[color:var(--board-ink)] py-24 text-white sm:py-32">
      <div className="lp-shell">
        <Reveal>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/45">
            Le principe
          </p>
        </Reveal>

        <Reveal delai={90}>
          <p className="lp-titre lp-h1 mt-7 max-w-[20ch] text-white">
            Concentrez-vous sur votre activité.
          </p>
        </Reveal>

        <Reveal delai={180}>
          <p className="lp-lede mt-7 max-w-[40ch] text-white/60">
            Trois charges que Rojer porte à votre place, toute l&apos;année.
          </p>
        </Reveal>

        {/* La frise. Le filet qui part de chaque numéro relie les trois
            charges sur grand écran ; en colonne, il devient un simple
            soulignement. */}
        <ol className="m-0 mt-20 grid list-none grid-cols-1 gap-14 p-0 sm:mt-24 lg:grid-cols-3 lg:gap-16">
          {CHARGES.map((c, i) => (
            <Reveal as="li" key={c.numero} delai={i * 110}>
              <div className="flex items-center gap-4">
                <span className="flex size-9 flex-none items-center justify-center rounded-full border border-white/20 font-mono text-[0.68rem] text-[color:var(--board-sky)]">
                  {c.numero}
                </span>
                <span aria-hidden className="h-px flex-1 bg-white/12" />
              </div>

              <h3
                className="mt-7 max-w-[22ch] text-[1.25rem] font-semibold leading-[1.2] tracking-[-0.025em] text-white"
                style={{ fontFamily: "var(--font-titre), sans-serif" }}
              >
                {c.titre}
              </h3>
              <p className="mt-3 max-w-[38ch] text-[0.9375rem] leading-[1.62] text-white/55">
                {c.corps}
              </p>

              <div className="mt-7">{SCHEMAS[i]}</div>
            </Reveal>
          ))}
        </ol>

        {/* La sortie des trois charges. Ce n'est pas une quatrième colonne :
            c'est ce que les trois produisent ensemble. On nomme le moment
            du contrôle et on renvoie au cadran (document 06, le dossier de
            contrôle) plutôt que de réexpliquer l'export ici. */}
        <Reveal delai={340}>
          <div className="mt-20 flex flex-col gap-8 border-t border-white/10 pt-10 sm:flex-row sm:items-end sm:justify-between">
            <p
              className="max-w-[30ch] text-[1.5rem] leading-[1.22] tracking-[-0.03em] text-white sm:text-[1.75rem]"
              style={{ fontFamily: "var(--font-titre), sans-serif" }}
            >
              <span className="text-[color:var(--board-sky)]">
                Le jour d&apos;un contrôle,
              </span>{" "}
              ce que Rojer tient part en un seul export.
            </p>

            <a
              href="#documents"
              className="inline-flex flex-none items-center gap-2 self-start rounded-full border border-white/25 px-5 py-3 text-[0.875rem] font-medium text-white transition-colors hover:bg-white/10 sm:self-auto"
            >
              Voir le dossier de contrôle
              <span aria-hidden>→</span>
            </a>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
