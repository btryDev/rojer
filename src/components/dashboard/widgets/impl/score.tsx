"use client";

// Widget « Score de conformité » — refonte V2.
//  - anneau (défaut) : ring SVG + per-famille bars à droite, pastille vif
//  - gauge           : demi-arc type jauge auto (historique, conservé)
//  - nombre          : typo monumentale centrée, minimaliste
//
// Les 3 variants partagent dashboard.score.valeur. La variante "anneau"
// ajoute un calcul de conformité par famille d'équipements, dérivé des
// stats de vérification (on part d'une moyenne par famille). Données
// locales uniquement : aucune query supplémentaire.

import { BentoCell } from "@/components/dashboard/BentoCell";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formaterDateFr } from "@/lib/dates";
import type { DashboardBundle } from "../types";
import type { Score } from "@/lib/dashboard/score";

const LIBELLE_NIVEAU = {
  satisfaisante: "Satisfaisante",
  a_surveiller: "À surveiller",
  rattrapage: "Rattrapage nécessaire",
  indetermine: "Reste à renseigner",
} as const;

/**
 * Explication déployée au hover / info-bulle. Décrit ce que mesure le score
 * et rappelle que ce n'est pas une certification officielle.
 * Formule documentée dans `src/lib/dashboard/score.ts`.
 */
function ScoreInfoTooltip({ align = "right" }: { align?: "left" | "right" | "center" }) {
  return (
    <InfoTooltip align={align}>
      Repère interne, pas une certification. Le score agrège trois
      engagements datés : les vérifications périodiques dépassées (art. R. 4226-16
      CT), les actions correctives en retard (art. L. 4121-2 CT) et la mise
      à jour du DUERP depuis moins de 12 mois (art. R. 4121-2 CT). Plus un
      engagement est urgent, plus son retard pénalise. Les états permanents
      n&apos;ont pas de date : ils ne pénalisent rien, mais tant qu&apos;ils
      restent sans réponse le score ne conclut pas.
    </InfoTooltip>
  );
}

/**
 * La pastille de niveau, **par table plutôt que par chaîne de ternaires**.
 *
 * Elle était écrite `satisfaisante ? vert : a_surveiller ? ambre : alerte`,
 * donc avec un défaut par épuisement : le niveau `indetermine`, ajouté au
 * score le 2026-09-01, y serait tombé dans « Rattrapage nécessaire » — un
 * dossier sans le moindre retard aurait été annoncé en rattrapage, et rien
 * n'aurait échoué. La table est indexée par `Score["niveau"]` : un niveau neuf
 * ne compile pas tant qu'il n'a pas sa ligne.
 *
 * `pill-v2-dashed` pour l'indétermination, et c'est un choix : le vert dirait
 * « tout va bien », l'alerte dirait « il y a un problème », et le produit ne
 * sait ni l'un ni l'autre. Un trait discontinu dit qu'il manque une réponse.
 */
const PILL_PAR_NIVEAU: Record<
  Score["niveau"],
  { classe: string; label: string }
> = {
  satisfaisante: {
    classe: "pill-v2 pill-v2-green",
    label: LIBELLE_NIVEAU.satisfaisante,
  },
  a_surveiller: {
    classe: "pill-v2 pill-v2-amber",
    label: LIBELLE_NIVEAU.a_surveiller,
  },
  rattrapage: {
    classe: "pill-v2 pill-v2-alert",
    label: LIBELLE_NIVEAU.rattrapage,
  },
  indetermine: {
    classe: "pill-v2 pill-v2-dashed",
    label: LIBELLE_NIVEAU.indetermine,
  },
};

/** Regroupement des catégories d'équipement en « familles » affichées dans la
 *  vue V2 du score.
 *
 *  « Autres » **était** une liste explicite, et le commentaire prétendait le
 *  contraire : une catégorie oubliée ici ne tombait nulle part, elle
 *  disparaissait du score sans que rien ne le signale. C'est ce qui venait
 *  d'arriver à `INSTALLATION_FRIGORIFIQUE` — un contrôle d'étanchéité en retard
 *  n'était compté dans aucune famille. `calculerFamilles` traite donc désormais
 *  « Autres » comme un vrai reliquat : ce qu'aucune famille nommée ne réclame y
 *  atterrit, et une catégorie neuve ne peut plus s'évaporer en silence. */
const FAMILLES: { nom: string; categories: string[] }[] = [
  {
    nom: "Incendie",
    categories: ["EXTINCTEUR", "RIA", "BAES", "ALARME_INCENDIE", "DESENFUMAGE"],
  },
  { nom: "Électricité", categories: ["INSTALLATION_ELECTRIQUE"] },
  { nom: "Aération", categories: ["VMC", "CTA", "HOTTE_PRO"] },
  { nom: "Levage", categories: ["ASCENSEUR", "EQUIPEMENT_LEVAGE"] },
  {
    nom: "Autres",
    categories: [
      "APPAREIL_CUISSON_ERP",
      "PORTE_AUTO",
      "PORTAIL_AUTO",
      "EQUIPEMENT_SOUS_PRESSION",
      "STOCKAGE_MATIERE_DANGEREUSE",
    ],
  },
];

export function WidgetScore({
  bundle,
  variant,
}: {
  bundle: DashboardBundle;
  variant: string;
}) {
  // Toute cette carte porte sur l'établissement entier : le score y mêle des
  // faits sans lieu (état du DUERP, actions ouvertes, documents), et la
  // légende du sélecteur de bâtiment l'annonce ainsi. Elle lit donc le parc
  // entier — lire le parc filtré donnait deux périmètres dans un seul cadre,
  // la note de l'établissement au-dessus de familles restreintes à un
  // bâtiment.
  const { dashboard, equipementsEtablissement: equipements, nbVerifs, nbRapports } =
    bundle;
  const global = dashboard.score.valeur;

  // --- Variants "gauge" et "nombre" : conservés tels quels (layout plus compact) ---

  if (variant === "gauge") {
    const verifsEnRetard = dashboard.compteurs.verifsEnRetard;
    const actionsACouvrir =
      dashboard.compteurs.actionsOuvertes + dashboard.compteurs.actionsEnCours;
    const sub = dashboard.duerp.derniereVersionAu
      ? `DUERP ${formaterDateFr(dashboard.duerp.derniereVersionAu)}`
      : dashboard.duerp.existe
        ? "DUERP en cours"
        : "Pas encore de DUERP";
    return (
      <BentoCell
        kicker={
          <>
            Score de conformité
            <ScoreInfoTooltip align="left" />
          </>
        }
        sub={sub}
      >
        <div className="flex flex-wrap items-center gap-7">
          <GaugeScore valeur={global} />
          <dl className="flex flex-1 flex-col gap-1.5 text-[0.86rem]">
            <Row label="Équipements déclarés" value={`${equipements.length}`} />
            <Row
              label="Vérifications à jour"
              value={`${Math.max(0, nbVerifs - verifsEnRetard)} / ${nbVerifs}`}
            />
            <Row label="Rapports déposés" value={`${nbRapports}`} />
            <Row label="Actions ouvertes" value={`${actionsACouvrir}`} />
          </dl>
        </div>
      </BentoCell>
    );
  }

  if (variant === "nombre") {
    return (
      <BentoCell
        kicker={
          <>
            Score de conformité
            <ScoreInfoTooltip align="left" />
          </>
        }
      >
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--board-slate-mid)]">
            Score actuel
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-[5.5rem] font-semibold leading-none tracking-[-0.055em] tabular-nums">
              {global}
            </span>
            <span className="text-[1.8rem] font-medium text-[color:var(--board-blue-ink)]">
              /100
            </span>
            <span className="ml-auto [font-family:var(--font-serif)] text-[1rem] italic text-[color:var(--board-amber-ink)]">
              {LIBELLE_NIVEAU[dashboard.score.niveau]}
            </span>
          </div>
        </div>
      </BentoCell>
    );
  }

  // --- Variant « anneau » : V2 layout (ring + per-famille bars) -----
  const familles = calculerFamilles(equipements);
  const niveauPill = PILL_PAR_NIVEAU[dashboard.score.niveau];

  return (
    <section className="carte-board px-7 py-6 sm:px-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="v2-title inline-flex items-center">
            Score de conformité
            <ScoreInfoTooltip align="left" />
          </h3>
          <p className="v2-subtitle">
            Indicateur interne — pas une certification officielle
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[auto_1fr]">
        <div className="flex min-w-[160px] flex-col items-center gap-3">
          <ScoreRingV2 pct={global} />
          <span className={niveauPill.classe}>{niveauPill.label}</span>
          {/* Affiché quel que soit le niveau, et non seulement quand la
              pastille l'annonce : un dossier en rattrapage a lui aussi des
              états non renseignés, et les taire parce qu'une information plus
              urgente s'affiche à côté serait le même silence, déplacé.
              La phrase nomme le geste qui lève le doute — c'est la forme que
              `perimetre/couverture.ts` donne à ses indéterminations. */}
          {dashboard.score.indetermines > 0 && (
            <p className="text-center text-[0.78rem] leading-snug text-[color:var(--board-slate-mid)]">
              {dashboard.score.indetermines === 1
                ? "1 point reste à confirmer"
                : `${dashboard.score.indetermines} points restent à confirmer`}{" "}
              dans «&nbsp;Ce qui doit être en place&nbsp;».
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--board-slate-mid)]">
            Vérifications à jour par famille
          </p>
          {familles.length === 0 ? (
            <p className="text-[0.85rem] text-[color:var(--board-slate-mid)]">
              Déclarez vos équipements pour suivre l&apos;état des
              vérifications par famille.
            </p>
          ) : (
            <div className="grid gap-2.5">
              {familles.map((f) => {
                const aJour = f.total - f.enRetard;
                return (
                  <div
                    key={f.nom}
                    className="grid grid-cols-[110px_1fr_auto] items-center gap-3 md:grid-cols-[140px_1fr_auto]"
                  >
                    <div className="text-[0.84rem] text-[color:var(--board-slate-ink)]">{f.nom}</div>
                    <div className="v2-bar-track">
                      <div
                        className="v2-bar-fill"
                        style={{
                          width: `${f.pct}%`,
                          background: toneColor(f.tone),
                        }}
                      />
                    </div>
                    <div
                      className="text-right font-mono text-[12px] tabular-nums"
                      style={{
                        color:
                          f.enRetard > 0 ? "var(--board-signal-ink)" : "var(--board-ink)",
                        opacity: 0.85,
                      }}
                      title={
                        f.enRetard > 0
                          ? `${f.enRetard} vérification${f.enRetard > 1 ? "s" : ""} en retard sur ${f.total}`
                          : `${aJour} / ${f.total} à jour`
                      }
                    >
                      {aJour}/{f.total}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ScoreRingV2({
  pct,
  size = 140,
  stroke = 10,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const offset = C * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Score de conformité ${pct} sur 100`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--board-slate-pale)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--board-blue-ink)"
        strokeWidth={stroke}
        strokeDasharray={C}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="49%"
        textAnchor="middle"
        fontFamily="var(--font-body)"
        fontSize="32"
        fontWeight="600"
        fill="var(--board-ink)"
        style={{ letterSpacing: "-0.03em" }}
      >
        {pct}
      </text>
      <text
        x="50%"
        y="66%"
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--muted-foreground)"
        style={{ letterSpacing: "0.2em" }}
      >
        SCORE /100
      </text>
    </svg>
  );
}

type Tone = "green" | "navy" | "amber" | "alert";

function toneColor(t: Tone): string {
  switch (t) {
    case "green":
      return "var(--board-green-ink)";
    case "amber":
      return "var(--board-amber-ink)";
    case "alert":
      return "var(--board-signal-ink)";
    default:
      return "var(--board-blue-ink)";
  }
}

function tonePourPct(pct: number): Tone {
  if (pct >= 85) return "green";
  if (pct >= 70) return "navy";
  if (pct >= 55) return "amber";
  return "alert";
}

type FamilleStat = {
  nom: string;
  pct: number;
  tone: Tone;
  enRetard: number;
  total: number;
};

/**
 * Calcule un pct de conformité par famille à partir des stats d'équipements.
 *
 * Règle alignée sur le score global (cf. `src/lib/dashboard/score.ts`) :
 *   - seules les vérifications réellement **dépassées** pénalisent le pct
 *   - les vérifications **à planifier** (jamais programmées) sont
 *     considérées neutres tant qu'une date d'échéance n'est pas passée
 *   - on n'affiche une barre que si la famille a au moins une vérification
 *     active ; sinon la famille est masquée (ne pas inventer de 50 % neutre)
 */
function calculerFamilles(
  equipements: DashboardBundle["equipements"],
): FamilleStat[] {
  const out: FamilleStat[] = [];
  // Les catégories que les familles nommées revendiquent. « Autres » prend tout
  // le reste, y compris ce que sa propre liste ne cite pas : c'est ce qui
  // empêche une catégorie neuve de sortir du score sans bruit.
  const revendiquees = new Set(
    FAMILLES.filter((f) => f.nom !== "Autres").flatMap((f) => f.categories),
  );
  const appartient = (fam: (typeof FAMILLES)[number], categorie: string) =>
    fam.nom === "Autres"
      ? !revendiquees.has(categorie)
      : fam.categories.includes(categorie);

  for (const fam of FAMILLES) {
    let totalVerifs = 0;
    let enRetard = 0;
    let aAuMoinsUneVerif = false;
    for (const eq of equipements) {
      if (!appartient(fam, eq.categorie)) continue;
      const s = eq.stats;
      if (!s) continue;
      const nbPourEq =
        s.enRetard + s.aPlanifier + s.sous30j + (s.derniereRealisee ? 1 : 0);
      if (nbPourEq === 0) continue;
      aAuMoinsUneVerif = true;
      totalVerifs += nbPourEq;
      enRetard += s.enRetard;
    }
    if (!aAuMoinsUneVerif) continue;
    const pct = Math.max(
      0,
      Math.min(100, Math.round(100 * (1 - enRetard / totalVerifs))),
    );
    out.push({
      nom: fam.nom,
      pct,
      tone: tonePourPct(pct),
      enRetard,
      total: totalVerifs,
    });
  }
  return out;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-[color:var(--board-slate-line)] py-1.5 last:border-b-0">
      <span className="text-[color:var(--board-slate-mid)]">{label}</span>
      <strong className="font-semibold tabular-nums">{value}</strong>
    </div>
  );
}

/**
 * Jauge en demi-arc type « tachymètre ». 0-100%, l'aiguille se place
 * sur l'angle correspondant. Design sobre, cohérent avec le cadran de
 * la landing (ticks radiaux, ink + navy).
 */
function GaugeScore({ valeur }: { valeur: number }) {
  const taille = 200;
  const cx = 100;
  const cy = 110;
  const rayon = 80;
  const startAngle = Math.PI; // gauche
  const endAngle = 0; // droite
  const valAngle = startAngle - (valeur / 100) * (startAngle - endAngle);

  const arcStart = {
    x: cx + Math.cos(startAngle) * rayon,
    y: cy + Math.sin(startAngle) * rayon,
  };
  const arcEnd = {
    x: cx + Math.cos(endAngle) * rayon,
    y: cy + Math.sin(endAngle) * rayon,
  };
  const arcProgEnd = {
    x: cx + Math.cos(valAngle) * rayon,
    y: cy + Math.sin(valAngle) * rayon,
  };

  const ticks = Array.from({ length: 21 }, (_, i) => {
    const a = startAngle - (i / 20) * (startAngle - endAngle);
    const r1 = rayon + 2;
    const r2 = rayon + (i % 5 === 0 ? 9 : 5);
    return {
      x1: cx + Math.cos(a) * r1,
      y1: cy + Math.sin(a) * r1,
      x2: cx + Math.cos(a) * r2,
      y2: cy + Math.sin(a) * r2,
      major: i % 5 === 0,
    };
  });

  return (
    <div
      className="shrink-0"
      style={{ width: taille, height: taille * 0.75 }}
      role="img"
      aria-label={`Score de conformité ${valeur}%`}
    >
      <svg viewBox={`0 0 ${taille} ${taille * 0.75}`} className="h-full w-full">
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${rayon} ${rayon} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
          fill="none"
          stroke="var(--board-slate-pale)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${rayon} ${rayon} 0 0 1 ${arcProgEnd.x} ${arcProgEnd.y}`}
          fill="none"
          stroke="var(--board-blue-ink)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="var(--board-ink)"
            strokeWidth={t.major ? 1.1 : 0.6}
            opacity={t.major ? 0.7 : 0.3}
            strokeLinecap="round"
          />
        ))}
        <line
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(valAngle) * (rayon - 14)}
          y2={cy + Math.sin(valAngle) * (rayon - 14)}
          stroke="var(--board-ink)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5" fill="var(--board-ink)" />
        <text
          x={cx}
          y={cy + 25}
          textAnchor="middle"
          fontFamily="var(--font-body)"
          fontSize="22"
          fontWeight="600"
          fill="var(--board-ink)"
          style={{ letterSpacing: "-0.03em" }}
        >
          {valeur}
          <tspan fontSize="14" fontWeight="500" fill="var(--board-blue-ink)" dx="2">
            %
          </tspan>
        </text>
      </svg>
    </div>
  );
}
