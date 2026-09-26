import {
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  GripVertical,
  ListChecks,
  ShieldCheck,
  Archive,
} from "lucide-react";
import { Reveal } from "./Reveal";
import { ZoomAuDefilement } from "./ZoomAuDefilement";

// LE TABLEAU DE BORD — le plan produit de la page.
//
// Une seule section centrée sur toute la page, et c'est voulu : le reste
// est aligné à gauche, cet écart-là fait la ponctuation. On regarde un
// objet, on ne lit pas une colonne.
//
// L'objet est une FENÊTRE sur le vrai board, reproduit d'après capture :
// le rail sombre et son panneau, le bandeau bleu du brief avec les
// échéances dépassées à droite, puis le canvas gris, la pastille
// « Personnaliser » et le haut de la carte « Votre calendrier ». La
// fenêtre a une hauteur fixe et coupe net — c'est la coupe qui dit que
// l'écran continue, pas un fondu.
//
// La matière de la fenêtre vient du hero : coins très arrondis,
// profondeur portée par l'ombre seule (.lp-fiche-carte), aucune
// perspective ni inclinaison.
//
// En dessous, quatre modules s'échangent leur place en boucle
// (.lp-module-mene / .lp-module-cede, dans globals.css). C'est le seul
// mouvement de la section, et il porte une seule idée : le board se range
// comme vous voulez.
//
// Les chiffres sont ceux d'un dossier en cours de rattrapage — pas d'un
// dossier parfait. Une capture où tout est vert ne ressemble à personne.

/** Les échéances dépassées, à droite du bandeau. Nommées avec le terme du
 *  métier : une ligne qui n'affiche qu'une abstraction ne prouve rien. */
const ALERTES = [
  {
    rang: "1",
    titre: "Vérification périodique annuelle des installations électriques (travail)",
    detail: "Installation électrique principale — dépassée depuis hier",
  },
  {
    rang: "2",
    titre: "Nettoyage ou remplacement des filtres de hotte (grandes cuisines ERP)",
    detail: "Cuisine — dépassée depuis six jours",
  },
];

/**
 * Le panneau de navigation, tel qu'il est dans l'application.
 *
 * Aucun item n'est actif, et c'est fidèle : on est sur le tableau de bord,
 * qui n'a pas d'entrée de navigation — on y revient par la marque, en tête
 * de rail. Le panneau montre alors « À faire », sa porte d'entrée par
 * défaut, sans rien y surligner.
 */
const NAV = [
  { label: "Calendrier", Icone: CalendarDays, badge: "11", alerte: true },
  { label: "Plan d'actions", Icone: ListChecks, badge: "6" },
  { label: "Préparer un contrôle", Icone: ShieldCheck },
];

/** Le rail, à l'extrême gauche — la marque en tête, puis les catégories. */
const RAIL = [
  { label: "À faire", Icone: ClipboardList, point: true },
  { label: "Établissement", Icone: Building2, point: true },
  { label: "Registres", Icone: Archive },
  { label: "Comprendre", Icone: BookOpen },
];

/** Le widget « À faire » : les plus urgentes, vérifications et actions
 *  mêlées. Nommées avec le terme du métier — une ligne qui n'affiche
 *  qu'une abstraction ne prouve rien. */
const A_FAIRE = [
  {
    // Des obligations RÉELLES du référentiel, à leur libellé exact, et à
    // rythme daté (relecture du 2026-09-26) : ~~« électrique périodique (ERP
    // 5ᵉ catégorie) »~~ n'existe plus depuis le 2026-08-27, ~~« moyens de
    // lutte contre l'incendie »~~ est un état permanent, qui ne peut pas être
    // « en retard de trois jours », et ~~« dégraissage des conduits »~~ n'est
    // au référentiel sous aucun nom.
    titre: "Vérification périodique annuelle des installations électriques (travail)",
    detail: "Vérification · en retard",
    jour: "J−1",
  },
  {
    // Pas les extincteurs : la liste « prochaines échéances » plus bas les
    // donne à venir, et une même ligne ne peut pas être les deux.
    titre: "Entretien et vérification de l'ensemble des installations techniques (ERP 5ᵉ catégorie)",
    detail: "Vérification · en retard",
    jour: "J−3",
  },
  {
    titre: "Nettoyage ou remplacement des filtres de hotte (grandes cuisines ERP)",
    detail: "Vérification · en retard",
    jour: "J−6",
  },
  {
    titre: "Poser une signalétique sol glissant",
    detail: "Action · cette semaine",
    jour: "J+2",
  },
];

/** Le widget « Où en est le plan d'actions ». Les trois premières lignes
 *  composent l'anneau ; la quatrième est un sous-ensemble des ouvertes et
 *  ne prend donc pas de segment. */
const PLAN = [
  { label: "Ouvertes", valeur: "5", ton: "var(--board-blue-soft)", part: 5 },
  { label: "En cours", valeur: "1", ton: "var(--board-blue-strong)", part: 1 },
  {
    label: "Clôturées ce mois",
    valeur: "+1",
    ton: "var(--board-green)",
    part: 1,
  },
  { label: "dont en retard", valeur: "3", ton: "var(--board-signal)", part: 0 },
];

/** Géométrie de l'anneau, en unités du viewBox. */
const ANNEAU_R = 26;
const ANNEAU_C = 2 * Math.PI * ANNEAU_R;

/** Les segments de l'anneau, calculés une fois au chargement du module.
 *  Le cumul se fait ici et pas dans le rendu : muter une variable pendant
 *  le rendu est refusé par le compilateur React. */
const SEGMENTS = (() => {
  const parts = PLAN.filter((p) => p.part > 0);
  const total = parts.reduce((s, p) => s + p.part, 0);
  let debut = 0;
  return parts.map((p) => {
    const longueur = (p.part / total) * ANNEAU_C;
    const segment = { label: p.label, ton: p.ton, longueur, decalage: -debut };
    debut += longueur;
    return segment;
  });
})();

/* ─── Les quatre modules réordonnables ────────────────────────────
   Ce sont de vrais widgets du registre (`src/components/dashboard/
   widgets/registry.ts`), avec leur contenu — pas des squelettes gris :
   une tuile vide ne dit pas ce qu'on déplace. Chacun porte une variante
   différente (jauge, liste, barres, file) pour que la rangée montre
   aussi que le même board ne se lit pas d'une seule façon. */

/** Jauge — variante « gauge » du score de conformité. */
function ModuleScore() {
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-[1.5rem] font-semibold leading-none tabular-nums tracking-[-0.04em] text-[color:var(--board-ink)]"
          style={{ fontFamily: "var(--font-titre), sans-serif" }}
        >
          78
        </span>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[color:var(--board-slate-soft)]">
          / 100
        </span>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--board-slate-pale)]">
        <div
          className="h-full rounded-full bg-[color:var(--board-blue-strong)]"
          style={{ width: "78%" }}
        />
      </div>
      <p className="mt-2 text-[0.6rem] text-[color:var(--board-slate-mid)]">
        Formule interne de Rojer — pas une attestation
      </p>
    </div>
  );
}

/** Liste — variante « list » des prochaines échéances. */
const PROCHAINES = [
  { titre: "Extincteurs — vérif. annuelle", quand: "12 sept." },
  { titre: "Attestation URSSAF", quand: "30 sept." },
];
function ModuleProchaines() {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {PROCHAINES.map((p) => (
        <li
          key={p.titre}
          className="flex items-center justify-between gap-2 border-b border-[rgba(10,10,10,.07)] py-[7px] last:border-b-0"
        >
          <span className="truncate text-[0.66rem] text-[color:var(--board-ink)]">
            {p.titre}
          </span>
          <span className="flex-none font-mono text-[0.55rem] uppercase tracking-[0.1em] text-[color:var(--board-slate-soft)]">
            {p.quand}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Barres — variante « bars » des volumes d'obligations par domaine. */
const DOMAINES = [
  { code: "Élec", part: 1 },
  { code: "Inc", part: 0.72 },
  { code: "Vent", part: 0.44 },
  { code: "Lev", part: 0.3 },
  { code: "Gaz", part: 0.2 },
];
function ModuleVolumes() {
  return (
    <div>
      <div aria-hidden className="flex h-[38px] items-end gap-1.5">
        {DOMAINES.map((d) => (
          <div
            key={d.code}
            className="flex-1 rounded-[3px] bg-[color:var(--board-blue-soft)]"
            style={{ height: `${d.part * 100}%` }}
          />
        ))}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-1.5">
        {DOMAINES.map((d) => (
          <span
            key={d.code}
            className="flex-1 truncate text-center font-mono text-[0.48rem] uppercase text-[color:var(--board-slate-soft)]"
          >
            {d.code}
          </span>
        ))}
      </div>
    </div>
  );
}

/** File — le même widget « À faire » que dans la fenêtre, en réduction. */
const URGENCES = [
  { titre: "Vérification électrique", jour: "J−1" },
  { titre: "Moyens de lutte incendie", jour: "J−3" },
];
function ModuleAFaire() {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {URGENCES.map((u) => (
        <li
          key={u.titre}
          className="flex items-center justify-between gap-2 border-b border-[rgba(10,10,10,.07)] py-[7px] last:border-b-0"
        >
          <span className="truncate text-[0.66rem] text-[color:var(--board-ink)]">
            {u.titre}
          </span>
          <span className="flex-none rounded-full bg-[color:var(--board-signal)] px-1.5 py-[2px] text-[0.53rem] font-semibold tabular-nums text-[color:var(--board-signal-ink)]">
            {u.jour}
          </span>
        </li>
      ))}
    </ul>
  );
}

const MODULES = [
  // ~~« Score de conformité »~~ sur la page publique, face à la FAQ « Rojer
  // atteste-t-il de ma conformité ? Non » (relecture du 2026-09-26) : la
  // jauge est un indice interne (`dashboard/score.ts`, « Formule interne,
  // pas une norme officielle »), et elle est dite ainsi.
  { titre: "Indice d'avancement", Contenu: ModuleScore, geste: null },
  {
    titre: "Prochaines échéances",
    Contenu: ModuleProchaines,
    geste: "mene" as const,
  },
  {
    titre: "Obligations · volumes",
    Contenu: ModuleVolumes,
    geste: "cede" as const,
  },
  { titre: "À faire", Contenu: ModuleAFaire, geste: null },
];

export function TableauDeBord() {
  return (
    // Le fond passe au canvas : sur du blanc pur, l'ombre de la fenêtre ne
    // se voyait pas et l'objet perdait sa profondeur. C'est exactement le
    // rôle de --board-canvas — le gris quasi blanc derrière les cartes.
    <section className="bg-[color:var(--board-canvas)] pb-28 pt-24 sm:pb-32 sm:pt-28">
      <div className="lp-shell">
        <Reveal className="text-center">
          {/* Pas de sur-titre : le titre nomme lui-même la vue, un eyebrow
              « Le tableau de bord » au-dessus n'aurait fait que le répéter. */}
          <h2 className="lp-titre lp-h2 mx-auto max-w-[19ch]">
            Un tableau de bord qui se lit d&apos;un coup d&apos;œil.
          </h2>
          <p className="lp-lede mx-auto mt-6 max-w-[54ch]">
            Ce qui a dépassé sa date, ce qui tombe ce mois-ci, ce qui est
            fait. Vous ouvrez, vous savez.
          </p>
        </Reveal>

        {/* ── LA FENÊTRE ────────────────────────────────────────── */}
        <Reveal delai={160} className="mx-auto mt-16 max-w-[1320px]">
          <ZoomAuDefilement depart={0.9}>
            <div className="lp-fiche-carte h-[440px] overflow-hidden sm:h-[540px]">
            <div className="flex h-full">
              {/* Le rail. Il saute en dessous de `lg` : sur un petit écran
                  il mangerait la fenêtre sans rien apprendre. */}
              <div className="hidden w-[62px] flex-none flex-col items-center gap-4 bg-[color:var(--board-ink)] py-4 lg:flex">
                <p
                  className="text-[0.72rem] font-semibold tracking-[-0.02em] text-white"
                  style={{ fontFamily: "var(--font-titre), sans-serif" }}
                >
                  Rojer
                </p>
                {RAIL.map((r) => (
                  <div key={r.label} className="flex flex-col items-center">
                    <span className="relative flex size-8 items-center justify-center rounded-full">
                      <r.Icone className="size-[15px] text-white/55" />
                      {r.point ? (
                        <span className="absolute -right-0.5 -top-0.5 size-[5px] rounded-full bg-[color:var(--board-signal)]" />
                      ) : null}
                    </span>
                    <span className="mt-1 text-center text-[0.44rem] leading-tight text-white/45">
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Le panneau de navigation. */}
              <div className="hidden w-[168px] flex-none bg-[color:var(--board-ink)] px-2.5 py-4 md:block">
                <p className="px-2 font-mono text-[0.48rem] uppercase tracking-[0.18em] text-white/35">
                  À faire
                </p>
                <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
                  {NAV.map((n) => (
                    <li
                      key={n.label}
                      /* Aucune pilule pleine : la page montrée est le
                         tableau de bord, qui vit au rail. Surligner un
                         item ici montrerait un produit qu'on n'a pas. */
                      className="flex items-center gap-2 rounded-[9px] px-2 py-[6px] text-[0.66rem] tracking-[-0.01em] text-white/60"
                    >
                      <n.Icone className="size-[13px] flex-none opacity-70" />
                      <span className="truncate">{n.label}</span>
                      {n.badge ? (
                        <span
                          className={
                            "ml-auto flex h-[15px] min-w-[15px] flex-none items-center justify-center rounded-full px-1 text-[0.5rem] font-semibold tabular-nums " +
                            (n.alerte
                              ? "bg-[color:var(--board-signal)] text-[color:var(--board-signal-ink)]"
                              : "bg-white/12 text-white/70")
                          }
                        >
                          {n.badge}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              {/* La zone de travail. */}
              <div className="flex min-w-0 flex-1 flex-col">
                {/* Le bandeau bleu du brief. */}
                <div className="grid flex-none gap-5 bg-[color:var(--board-sky)] px-5 py-5 lg:grid-cols-[1fr_1.05fr] lg:px-7 lg:py-6">
                  <div>
                    <span className="inline-flex rounded-full bg-[color:var(--board-card)] px-2.5 py-1 text-[0.55rem] font-medium text-[color:var(--board-blue-ink)]">
                      Mardi 11 août 2026
                    </span>
                    <p
                      className="mt-3 max-w-[15ch] text-[1.35rem] font-semibold leading-[1.08] tracking-[-0.035em] text-[color:var(--board-ink)] lg:text-[1.6rem]"
                      style={{ fontFamily: "var(--font-titre), sans-serif" }}
                    >
                      9 échéances à traiter cette semaine
                    </p>
                    <p className="mt-2.5 max-w-[36ch] text-[0.66rem] leading-[1.5] text-[color:var(--board-slate-ink)]">
                      Votre DUERP a été validé le 4 mars. Le registre compte 14
                      rapports. Il reste 2 vérifications dépassées et 6 actions
                      ouvertes.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {ALERTES.map((a) => (
                      <div
                        key={a.rang}
                        className="flex items-center gap-2.5 rounded-[11px] bg-[color:var(--board-card)] px-3 py-2"
                      >
                        <span className="flex size-6 flex-none items-center justify-center rounded-full bg-[color:var(--board-signal)] text-[0.6rem] font-semibold tabular-nums text-[color:var(--board-signal-ink)]">
                          {a.rang}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[0.68rem] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)]">
                            {a.titre}
                          </p>
                          <p className="truncate text-[0.6rem] text-[color:var(--board-slate-mid)]">
                            {a.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2.5 rounded-[11px] border border-dashed border-[rgba(10,10,10,.22)] px-3 py-2">
                      <span className="flex size-6 flex-none items-center justify-center rounded-full border border-[rgba(10,10,10,.25)]">
                        <Check className="size-3 text-[color:var(--board-ink)]" />
                      </span>
                      <p className="text-[0.65rem] text-[color:var(--board-slate-ink)]">
                        Aucune autre échéance sous 30 jours.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Le canvas, la pastille, et la grille de widgets. Les
                    deux cartes se font couper par le bord de la fenêtre :
                    c'est tout ce qui dit « ça continue ». */}
                <div className="min-h-0 flex-1 bg-[color:var(--board-canvas)] px-5 pt-3.5 lg:px-7">
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--board-card)] px-2.5 py-1.5 text-[0.6rem] font-medium text-[color:var(--board-ink)] shadow-[0_0_0_1px_rgba(13,18,36,.05),0_1px_2px_rgba(13,18,36,.05)]">
                      <GripVertical className="size-3 text-[color:var(--board-slate-soft)]" />
                      Personnaliser
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3.5 lg:grid-cols-2">
                    {/* À faire */}
                    <div className="rounded-[16px] bg-[color:var(--board-card)] px-4 pb-3 pt-4 shadow-[0_0_0_1px_rgba(13,18,36,.05)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className="text-[0.95rem] font-semibold tracking-[-0.025em] text-[color:var(--board-ink)]"
                            style={{
                              fontFamily: "var(--font-titre), sans-serif",
                            }}
                          >
                            À faire
                          </p>
                          <p className="mt-1 text-[0.6rem] text-[color:var(--board-slate-mid)]">
                            Les plus urgentes — vérifications et actions mêlées.
                          </p>
                        </div>
                        <span className="flex size-5 flex-none items-center justify-center rounded-full border border-[rgba(10,10,10,.12)]">
                          <ChevronRight className="size-3 text-[color:var(--board-slate-mid)]" />
                        </span>
                      </div>

                      <ul className="m-0 mt-3 flex list-none flex-col p-0">
                        {A_FAIRE.map((l) => (
                          <li
                            key={l.titre}
                            className="flex items-center justify-between gap-3 border-b border-[rgba(10,10,10,.07)] py-2 last:border-b-0"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[0.66rem] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)]">
                                {l.titre}
                              </p>
                              <p className="truncate text-[0.57rem] text-[color:var(--board-slate-mid)]">
                                {l.detail}
                              </p>
                            </div>
                            <span className="flex-none rounded-full bg-[color:var(--board-signal)] px-1.5 py-[2px] text-[0.53rem] font-semibold tabular-nums text-[color:var(--board-signal-ink)]">
                              {l.jour}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[0.57rem] text-[color:var(--board-slate-soft)]">
                        5 autres en retard — voir le calendrier
                      </p>
                    </div>

                    {/* Où en est le plan d'actions */}
                    <div className="rounded-[16px] bg-[color:var(--board-card)] px-4 pb-3 pt-4 shadow-[0_0_0_1px_rgba(13,18,36,.05)]">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className="text-[0.95rem] font-semibold tracking-[-0.025em] text-[color:var(--board-ink)]"
                          style={{
                            fontFamily: "var(--font-titre), sans-serif",
                          }}
                        >
                          Où en est le plan d&apos;actions
                        </p>
                        <span className="flex size-5 flex-none items-center justify-center rounded-full border border-[rgba(10,10,10,.12)]">
                          <ChevronRight className="size-3 text-[color:var(--board-slate-mid)]" />
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-5">
                        {/* L'anneau. Les trois premières lignes seulement :
                            « dont en retard » est un sous-ensemble des
                            ouvertes, lui donner un segment ferait un total
                            faux. */}
                        <div className="relative flex-none">
                          <svg
                            aria-hidden
                            viewBox="0 0 64 64"
                            className="size-[74px] -rotate-90"
                          >
                            {SEGMENTS.map((s) => (
                              <circle
                                key={s.label}
                                cx="32"
                                cy="32"
                                r={ANNEAU_R}
                                fill="none"
                                stroke={s.ton}
                                strokeWidth="9"
                                strokeDasharray={`${s.longueur} ${ANNEAU_C - s.longueur}`}
                                strokeDashoffset={s.decalage}
                              />
                            ))}
                          </svg>
                          <span className="absolute inset-0 flex flex-col items-center justify-center">
                            <span
                              className="text-[1.05rem] font-semibold leading-none tabular-nums text-[color:var(--board-ink)]"
                              style={{
                                fontFamily: "var(--font-titre), sans-serif",
                              }}
                            >
                              6
                            </span>
                            <span className="mt-0.5 font-mono text-[0.4rem] uppercase tracking-[0.14em] text-[color:var(--board-slate-soft)]">
                              Ouvertes
                            </span>
                          </span>
                        </div>

                        <ul className="m-0 min-w-0 flex-1 list-none p-0">
                          {PLAN.map((p) => (
                            <li
                              key={p.label}
                              className="flex items-center gap-2 py-[3px] text-[0.62rem]"
                            >
                              <span
                                className="size-1.5 flex-none rounded-full"
                                style={{ background: p.ton }}
                              />
                              <span className="truncate text-[color:var(--board-slate-mid)]">
                                {p.label}
                              </span>
                              <span className="ml-auto flex-none font-semibold tabular-nums text-[color:var(--board-ink)]">
                                {p.valeur}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <p className="mt-3 border-t border-[rgba(10,10,10,.07)] pt-2.5 text-[0.6rem] text-[color:var(--board-slate-mid)]">
                        3 actions sur 6 dépassent leur échéance.
                      </p>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </ZoomAuDefilement>
        </Reveal>

        {/* ── LES MODULES QU'ON RÉORDONNE ───────────────────────── */}
        {/* Un vrai bloc, pas deux phrases posées sous la fenêtre : filet
            de séparation, sur-titre mono, titre au caractère de titrage.
            Le lecteur doit voir qu'on change de sujet. */}
        <Reveal
          delai={260}
          className="mx-auto mt-20 max-w-[1320px] border-t border-[rgba(10,10,10,.1)] pt-14"
        >
          <div className="mx-auto max-w-[52ch] text-center">
            <p className="lp-eyebrow">Personnalisable</p>
            <p
              className="lp-titre lp-h3 mt-4 text-[1.35rem] sm:text-[1.6rem]"
              style={{ fontFamily: "var(--font-titre), sans-serif" }}
            >
              Et vous le rangez comme vous voulez.
            </p>
            <p className="lp-lede mt-4">
              Chaque module se déplace, change de forme ou se retire. Le vôtre
              ne ressemblera pas à celui du voisin.
            </p>
          </div>

          {/* Le pas d'une colonne, réglé ici et consommé par les deux
              animations : largeur de tuile + gouttière. */}
          <div
            className="mt-12 grid grid-cols-2 gap-3.5 sm:grid-cols-4"
            style={{ "--lp-pas": "calc(100% + 14px)" } as React.CSSProperties}
          >
            {MODULES.map((m) => (
              <div
                key={m.titre}
                className={
                  "rounded-[14px] bg-[color:var(--board-card)] px-4 py-4 shadow-[0_0_0_1px_rgba(13,18,36,.05),0_1px_2px_rgba(13,18,36,.04)] " +
                  (m.geste === "mene"
                    ? "lp-module-mene"
                    : m.geste === "cede"
                      ? "lp-module-cede"
                      : "")
                }
              >
                <div className="flex items-center gap-2 border-b border-[rgba(10,10,10,.07)] pb-2.5">
                  <GripVertical className="size-3.5 flex-none text-[color:var(--board-slate-soft)]" />
                  <p className="truncate text-[0.75rem] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)]">
                    {m.titre}
                  </p>
                </div>
                <div className="mt-3">
                  <m.Contenu />
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
