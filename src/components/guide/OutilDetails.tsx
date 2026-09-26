import Link from "next/link";
import type { ReactNode } from "react";
import {
  MAJ_DUERP_AMENAGEMENT_IMPORTANT,
  MAJ_DUERP_ANNUELLE,
  MAJ_DUERP_INFORMATION_NOUVELLE,
  enMinuscule,
} from "@/lib/referentiels/conformite/texte-r4121-2";

type Couleur = "vif" | "warm" | "ink" | "minium";

type OutilDetail = {
  n: string;
  titre: string;
  source: string;
  couleur: Couleur;
  loi: string[];
  app: string[];
  cta: { libelle: string; href: string };
};

const DETAILS: OutilDetail[] = [
  {
    n: "01",
    titre: "DUERP",
    source: "Art. R. 4121-1 à R. 4121-4 · Code du travail",
    couleur: "vif",
    // LA COLONNE « LOI » NE PORTE QUE LE TEXTE, CITÉ (revue de
    // l'intégration, 2026-09-26) : ~~« à tout changement »~~ réécrivait les
    // 2° et 3° de R. 4121-2 ; ceux-ci viennent des constantes de l'article.
    loi: [
      "R. 4121-1 : « un inventaire des risques identifiés dans chaque unité de travail de l'entreprise ou de l'établissement ».",
      `R. 4121-2 : « ${MAJ_DUERP_ANNUELLE} » ; « ${enMinuscule(MAJ_DUERP_AMENAGEMENT_IMPORTANT)} » ; « ${enMinuscule(MAJ_DUERP_INFORMATION_NOUVELLE)} ».`,
      "R. 4121-4 : tenus « pendant une durée de 40 ans à compter de leur élaboration ».",
    ],
    app: [
      "Trame pré-remplie adaptée à votre secteur NAF.",
      "Cotation guidée par unité de travail.",
      // ~~« Versionnage automatique, export PDF signé daté »~~ (contre-lecture
      // du 2026-09-26) : le PDF n'est pas signé, et une version naît d'une
      // validation, avec son motif (`versions/actions.ts`).
      "Chaque validation fige une version numérotée, avec son motif ; export PDF daté.",
    ],
    cta: { libelle: "Ouvrir mon DUERP", href: "duerp" },
  },
  {
    n: "02",
    titre: "Vérifications",
    // ~~« R. 4323-22 »~~ : c'est la vérification INITIALE ; les
    // vérifications périodiques sont au R. 4323-23, relu sur Légifrance le
    // 2026-09-26 (deux lectures). ~~« Périodicité imposée : annuelle,
    // semestrielle… »~~ : l'article ne fixe aucun rythme, il le renvoie aux
    // arrêtés.
    source:
      "Art. R. 4323-23 · Arrêté du 25 juin 1980 (ERP) · CCH R. 143-44",
    couleur: "warm",
    loi: [
      "R. 4323-23 : des arrêtés « déterminent les équipements de travail ou les catégories d'équipement de travail pour lesquels l'employeur procède ou fait procéder à des vérifications générales périodiques ».",
      "« Ces arrêtés précisent la périodicité des vérifications, leur nature et leur contenu. »",
    ],
    app: [
      "Calendrier généré à partir de vos équipements déclarés.",
      // ~~« Alertes J-30 / J-7 / jour J, escalade si retard. »~~ : aucun
      // rappel n'est envoyé (relecture du 2026-09-26). ~~« prestataire
      // agréé »~~ : Rojer ne vérifie aucun agrément.
      "Retards et échéances proches au tableau de bord — aucun rappel par e-mail.",
      "Lien direct vers votre prestataire (optionnel).",
    ],
    cta: { libelle: "Voir mon calendrier", href: "calendrier" },
  },
  {
    n: "03",
    titre: "Registre de sécurité",
    // ~~« Art. L. 4711-5 »~~ — corrigé le 2026-09-20. Cet article « autorise
    // à réunir » des informations dans un registre unique : une faculté, qui
    // n'institue rien. Le fondement de la consignation est R. 4323-25, qui
    // renvoie à L. 4711-5 pour NOMMER le registre — et c'est ce renvoi qui a
    // fait prendre la faculté pour le fondement, quatre fois en onze jours
    // d'après le corpus.
    source: "Art. R. 4323-25 · Code du travail",
    couleur: "ink",
    loi: [
      // ~~« Centralisation de tous les rapports… », « Tenue continue,
      // horodatée », « Consultable par agents de contrôle et salariés »~~ —
      // retirés le 2026-09-26 : R. 4323-25 ne vise que les vérifications
      // générales périodiques, aucun texte cité n'écrit « horodatée », et
      // l'accès au registre (L. 4711-3, L. 4711-4) n'est pas relu dans ce lot.
      "R. 4323-25 : « Le résultat des vérifications générales périodiques est consigné sur le ou les registres de sécurité mentionnés à l'article L. 4711-5. »",
    ],
    app: [
      // ~~« Dépôt en 1 clic, liaison automatique », « index PDF »~~
      // (contre-lecture du 2026-09-26) : le rapport se saisit sur sa
      // vérification (fichier, date, organisme, résultat), et le ZIP porte un
      // sommaire texte, `00_README.txt`.
      "Le rapport se dépose sur la vérification qu'il concerne : fichier, date, organisme, résultat.",
      "Quand le texte fixe un rythme, la prochaine échéance se recalcule depuis le rapport.",
      "Export ZIP, avec son sommaire.",
    ],
    cta: { libelle: "Ouvrir le registre", href: "registre" },
  },
  {
    n: "04",
    titre: "Plan d'actions",
    source: "Art. L. 4121-2 · Code du travail",
    couleur: "minium",
    loi: [
      // ~~« supprimer avant de protéger », « Toute action tracée de
      // l'ouverture à la levée », « Justificatif requis à la clôture »~~ :
      // L. 4121-2 n'écrit rien de tel (relecture du 2026-09-26).
      "Principes généraux de prévention, dont le 1° : « Eviter les risques ».",
      "Le 8° : la protection collective a « la priorité sur les mesures de protection individuelle ».",
    ],
    app: [
      // ~~« créée automatiquement », « rappels », « historique auditable »~~ :
      // l'action se crée à la main depuis l'écart, aucun rappel ne part, et
      // aucun journal d'audit n'existe (relecture du 2026-09-26).
      "Action ouverte depuis un écart de rapport, en un geste.",
      "Responsable et échéance.",
      "Levée datée ; le justificatif est facultatif.",
    ],
    cta: { libelle: "Ouvrir le plan", href: "actions" },
  },
];

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
  }
}

export function OutilDetails({ etablissementId }: { etablissementId: string }) {
  return (
    <section>
      <header className="mb-10 max-w-[64ch]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">§ Détail — ce que dit la loi · ce que fait l&apos;app</p>
        <h2 className="board-titre text-[clamp(22px,2.2vw,27px)] mt-3">
          Pour chaque outil, <span className="text-[color:var(--board-blue-ink)]">deux colonnes</span>.
        </h2>
        <p className="mt-3 text-[0.92rem] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {/* ~~« génère, suit ou rappelle pour vous la tenir »~~ — « rappelle »
              se lisait comme un envoi (vérification du 2026-09-26) ; la colonne
              de gauche ne contient plus que le texte, cité. */}
          À gauche, ce que dit le texte, cité. À droite, ce que la
          plateforme génère et suit pour vous aider à la tenir.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {DETAILS.map((d) => (
          <CarteOutilDetail
            key={d.n}
            detail={d}
            etablissementId={etablissementId}
          />
        ))}
      </div>
    </section>
  );
}

function CarteOutilDetail({
  detail,
  etablissementId,
}: {
  detail: OutilDetail;
  etablissementId: string;
}) {
  const ctaHref =
    detail.cta.href === "duerp"
      ? `/etablissements/${etablissementId}`
      : `/etablissements/${etablissementId}/${detail.cta.href}`;

  return (
    <article
      className="flex flex-col gap-5 overflow-hidden rounded-2xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-6"
      style={{
        borderTop: `3px solid ${bordureCouleur(detail.couleur)}`,
      }}
    >
      <header>
        <div className="flex items-baseline gap-3">
          <span
            className="font-mono text-[0.75rem] font-medium tabular-nums"
            style={{ color: bordureCouleur(detail.couleur) }}
          >
            {detail.n}
          </span>
          <h3 className="text-[1.3rem] font-semibold tracking-[-0.02em]">
            {detail.titre}
          </h3>
        </div>
        <code className="mt-1.5 block font-mono text-[0.7rem] text-[color:var(--board-slate-mid)]">
          {detail.source}
        </code>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BlocColonne
          titre="Ce que dit la loi"
          items={detail.loi}
          ton="neutre"
        />
        <BlocColonne
          titre="Ce que l'app fait"
          items={detail.app}
          ton="vif"
        />
      </div>

      <Link
        href={ctaHref}
        className="inline-flex w-fit items-center gap-1.5 self-start text-[0.86rem] font-medium text-[color:var(--board-green-ink)] transition-opacity hover:opacity-80"
      >
        {detail.cta.libelle} →
      </Link>
    </article>
  );
}

function BlocColonne({
  titre,
  items,
  ton,
}: {
  titre: string;
  items: string[];
  ton: "neutre" | "vif";
}) {
  return (
    <div
      className={
        "flex flex-col gap-2 rounded-lg px-3.5 py-3 " +
        (ton === "vif"
          ? "bg-[color:var(--board-green)]"
          : "bg-[color:var(--board-slate-pale)]")
      }
    >
      <p
        className={
          "font-mono text-[0.62rem] uppercase tracking-[0.18em] " +
          (ton === "vif"
            ? "text-[color:var(--board-green-ink)]"
            : "text-[color:var(--board-slate-mid)]")
        }
      >
        {titre}
      </p>
      <ul className="flex flex-col gap-1.5 text-[0.86rem] leading-[1.5]">
        {items.map((it, i) => (
          <LigneOutil key={i}>{it}</LigneOutil>
        ))}
      </ul>
    </div>
  );
}

function LigneOutil({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-[6px] inline-block size-1 shrink-0 rounded-full bg-current opacity-60"
      />
      <span>{children}</span>
    </li>
  );
}
