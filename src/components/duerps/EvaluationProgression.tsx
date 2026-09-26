import Link from "next/link";

type Etape = "cotation" | "mesures";

type Props = {
  etape: Etape;
  cotationSaisie: boolean;
  nombreMesures: number;
  hrefCotation: string;
  hrefMesures: string;
};

/**
 * Diptyque montrant que la cotation et les mesures sont deux moitiés d'une
 * même évaluation, pas deux étapes séparées du wizard. Visible en tête des
 * pages cotation et mesures d'un risque.
 *
 * Chaque partie porte son état par un mot (« En cours », « Ouvert »,
 * « Verrouillé », « À faire ») autant que par sa couleur : la couleur seule
 * disparaît en niveaux de gris et pour qui n'y voit pas (interdit 10).
 */
export function EvaluationProgression({
  etape,
  cotationSaisie,
  nombreMesures,
  hrefCotation,
  hrefMesures,
}: Props) {
  const mesuresDisponibles = cotationSaisie;

  return (
    <nav
      aria-label="Parties de l'évaluation du risque"
      className="carte-board"
    >
      {/* Bandeau */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--board-slate-line)] px-7 py-4 sm:px-8">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Évaluation en deux temps
        </p>
        <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          {etape === "cotation"
            ? "Partie 01 en cours"
            : "Partie 02 en cours"}
        </p>
      </div>

      {/* Barre de progression — 2 segments */}
      <div className="px-7 pt-5 sm:px-8">
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={2}
          aria-valuenow={etape === "cotation" ? 1 : 2}
          className="flex gap-1.5"
        >
          <span
            aria-hidden
            className={`h-[5px] flex-1 rounded-full transition-colors ${
              etape === "cotation"
                ? "bg-[color:var(--board-blue-ink)]"
                : cotationSaisie
                  ? "bg-[color:var(--board-ink)]"
                  : "bg-[color:var(--board-slate-line)]"
            }`}
          />
          <span
            aria-hidden
            className={`h-[5px] flex-1 rounded-full transition-colors ${
              etape === "mesures"
                ? "bg-[color:var(--board-blue-ink)]"
                : "bg-[color:var(--board-slate-line)]"
            }`}
          />
        </div>
      </div>

      {/* Les 2 sous-parties, côte à côte */}
      <ol className="grid list-none grid-cols-1 p-0 sm:grid-cols-2">
        <li className="border-b border-[color:var(--board-slate-line)] px-7 py-6 sm:border-b-0 sm:border-r sm:px-8">
          <SousPartie
            numero="01"
            titre="Cotation"
            description="Gravité, probabilité, maîtrise actuelle. La criticité se calcule automatiquement."
            statut={
              etape === "cotation"
                ? "en-cours"
                : cotationSaisie
                  ? "fait"
                  : "a-faire"
            }
            href={hrefCotation}
            compteur={cotationSaisie ? "cotation enregistrée" : "3 questions"}
          />
        </li>
        <li className="px-7 py-6 sm:px-8">
          <SousPartie
            numero="02"
            titre="Mesures"
            description="Prévention déjà en place et prévue, par type de mesure."
            statut={
              etape === "mesures"
                ? "en-cours"
                : !mesuresDisponibles
                  ? "verrouille"
                  : nombreMesures > 0
                    ? "fait"
                    : "a-faire"
            }
            href={mesuresDisponibles ? hrefMesures : undefined}
            compteur={
              !mesuresDisponibles
                ? "après la cotation"
                : nombreMesures > 0
                  ? `${String(nombreMesures).padStart(2, "0")} retenue${
                      nombreMesures > 1 ? "s" : ""
                    }`
                  : "à renseigner"
            }
          />
        </li>
      </ol>

      {/* Pied : rappel du couplage */}
      <p className="m-0 border-t border-[color:var(--board-slate-line)] px-7 py-3.5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)] sm:px-8">
        La maîtrise notée en{" "}
        <span className="font-medium text-[color:var(--board-ink)]">01</span>{" "}
        décrit l&apos;état actuel ; les mesures de{" "}
        <span className="font-medium text-[color:var(--board-ink)]">02</span> la
        documentent et peuvent vous amener à la réajuster.
      </p>
    </nav>
  );
}

type Statut = "en-cours" | "fait" | "a-faire" | "verrouille";

// Table statique : Tailwind ne voit pas un nom de classe construit à la
// volée (interdit 23).
const MARQUE_STATUT: Record<Statut, string> = {
  "en-cours":
    "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]",
  fait: "bg-[color:var(--board-ink)] text-white",
  verrouille:
    "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-soft)]",
  "a-faire":
    "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-ink)]",
};

const TITRE_STATUT: Record<Statut, string> = {
  "en-cours": "text-[color:var(--board-blue-ink)]",
  fait: "text-[color:var(--board-ink)]",
  verrouille: "text-[color:var(--board-slate-mid)]",
  "a-faire": "text-[color:var(--board-ink)]",
};

function SousPartie({
  numero,
  titre,
  description,
  statut,
  href,
  compteur,
}: {
  numero: string;
  titre: string;
  description: string;
  statut: Statut;
  href?: string;
  compteur: string;
}) {
  const clickable = href !== undefined && statut !== "en-cours";

  const labelStatut =
    statut === "en-cours"
      ? "En cours"
      : statut === "fait"
        ? "Ouvert"
        : statut === "verrouille"
          ? "Verrouillé"
          : "À faire";

  const Body = (
    <div className="flex items-start gap-4">
      <span
        aria-hidden
        className={`flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-[11.5px] font-semibold tabular-nums transition-colors ${MARQUE_STATUT[statut]}`}
      >
        {numero}
      </span>
      <div className="min-w-0 flex-1">
        <div className="board-eyebrow flex items-baseline gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          <span>{labelStatut}</span>
          <span aria-hidden className="text-[color:var(--board-slate)]">
            ·
          </span>
          <span className="truncate">{compteur}</span>
        </div>
        <p
          className={`m-0 mt-1.5 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] ${TITRE_STATUT[statut]}`}
        >
          {titre}
        </p>
        <p className="m-0 mt-1 max-w-[62ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {description}
        </p>
      </div>
    </div>
  );

  if (!clickable) {
    return (
      <div aria-current={statut === "en-cours" ? "step" : undefined}>
        {Body}
      </div>
    );
  }

  return (
    <Link
      href={href!}
      className="group block transition-opacity hover:opacity-70"
    >
      {Body}
    </Link>
  );
}
