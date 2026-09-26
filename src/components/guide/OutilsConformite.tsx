import {
  CalendarClock,
  ClipboardCheck,
  Dot,
  FileStack,
  ListChecks,
  Wind,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Couleur = "vif" | "warm" | "ink" | "minium" | "muted";

type Outil = {
  n: string;
  titre: string;
  sousTitre: string;
  description: string;
  couleur: Couleur;
  statut: "actif" | "bientot";
  icon: LucideIcon;
};

const OUTILS: Outil[] = [
  {
    n: "01",
    titre: "DUERP",
    sousTitre: "Document unique",
    description: "Inventaire des risques par unité de travail, coté et signé.",
    couleur: "vif",
    statut: "actif",
    icon: ClipboardCheck,
  },
  {
    n: "02",
    titre: "Vérifications",
    sousTitre: "Périodiques",
    description: "Calendrier des vérifications, rapports classés.",
    couleur: "warm",
    statut: "actif",
    icon: CalendarClock,
  },
  {
    n: "03",
    titre: "Registre",
    sousTitre: "De sécurité",
    description:
      "Rapports horodatés, présentables à tout moment à un contrôleur.",
    couleur: "ink",
    statut: "actif",
    icon: FileStack,
  },
  {
    n: "04",
    titre: "Plan d'actions",
    sousTitre: "Correctives",
    description: "Écarts et risques à lever, suivis jusqu'à clôture.",
    couleur: "minium",
    statut: "actif",
    icon: ListChecks,
  },
  {
    n: "05",
    titre: "Carnet sanitaire",
    // ~~« Eau · air », « d'aération », `statut: "bientot"`~~ — relecture du
    // 2026-09-26 : le module existe (`/carnet-sanitaire`) et ne suit que
    // l'eau chaude sanitaire (arrêté du 1er février 2010).
    sousTitre: "Eau chaude",
    description: "Relevés de température et analyses de légionelles de l'eau chaude sanitaire.",
    couleur: "muted",
    statut: "actif",
    icon: Wind,
  },
  // La carte « 06 · Autres outils — À venir » a été retirée le 2026-09-01, et
  // pas parce qu'elle était laide. Elle annonçait « Registre unique du
  // personnel, affichages obligatoires, fiche d'entreprise… » sous une
  // pastille « Bientôt », c'est-à-dire une promesse — sur des documents que le
  // CLAUDE.md déclare hors périmètre depuis toujours, et sur le seul écran où
  // un dirigeant vient chercher la liste de ce qu'il doit tenir. Ils sont
  // désormais nommés pour ce qu'ils sont, avec leur texte fondateur et
  // l'endroit où ils se tiennent, dans `DocumentsObligatoires`. Mieux vaut une
  // porte annoncée fermée qu'un bouton inerte (charte, interdit 19).
];

export function OutilsConformite() {
  return (
    <section>
      <header className="mb-10">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">§ Les outils de suivi</p>
        <h2 className="board-titre text-[clamp(22px,2.2vw,27px)] mt-3 max-w-[18ch]">
          Une vue d&apos;ensemble
          <br />
          <span className="text-[color:var(--board-blue-ink)]">sur vos obligations.</span>
        </h2>
        <p className="text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)] mt-5">
          Vous déclarez vos équipements et votre matériel ; la plateforme{" "}
          <strong>génère les documents attendus</strong>{" "}
          (DUERP, registre,
          plan d&apos;actions…), les met à jour au fil de vos
          vérifications et <strong>vous montre les échéances</strong>{" "}
          qui approchent — sans rappel par e-mail. Chaque outil ci-dessous
          répond à un texte. Les documents que vous devez
          tenir <strong>et que la plateforme ne produit pas</strong>{" "}
          sont
          nommés sur la page « Documents obligatoires », avec le texte qui les fonde et l&apos;endroit où
          ils se tiennent.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OUTILS.map((o) => (
          <OutilCard key={o.n} outil={o} />
        ))}
      </ul>
    </section>
  );
}

function bordureCouleur(c: Couleur): string {
  switch (c) {
    case "vif":
      return "var(--board-green-ink)";
    case "warm":
      return "var(--board-blue-ink)";
    case "ink":
      return "var(--board-ink)";
    case "minium":
      return "var(--board-signal-ink)";
    default:
      return "var(--board-slate)";
  }
}

function OutilCard({ outil }: { outil: Outil }) {
  const Icon = outil.icon;
  const bientot = outil.statut === "bientot";
  return (
    <li
      className={
        "relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-6 transition-colors hover:border-[color:var(--board-slate)] " +
        (bientot ? "opacity-[0.75]" : "")
      }
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: bordureCouleur(outil.couleur) }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--board-slate-pale)]">
          <Icon
            aria-hidden
            className="size-5"
            style={{ color: bordureCouleur(outil.couleur) }}
          />
        </div>
        <TagStatut statut={outil.statut} />
      </div>

      <div>
        <span className="numero-section text-[0.7rem]">{outil.n}</span>
        <h3 className="mt-1 text-[1.15rem] font-semibold tracking-[-0.012em]">
          {outil.titre}
        </h3>
        <p className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[color:var(--board-slate-mid)]">
          {outil.sousTitre}
        </p>
      </div>

      <p className="text-[0.88rem] leading-[1.55] text-[color:var(--board-ink)]/75">
        {outil.description}
      </p>
    </li>
  );
}

function TagStatut({ statut }: { statut: Outil["statut"] }) {
  if (statut === "actif") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--board-green)] px-2.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[color:var(--board-green-ink)]">
        <Dot aria-hidden className="size-3 fill-current" strokeWidth={3} />
        Actif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--board-slate)] bg-[color:var(--board-slate-pale)]/60 px-2.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[color:var(--board-slate-mid)]">
      Bientôt
    </span>
  );
}
