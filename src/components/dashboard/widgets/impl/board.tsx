"use client";

// Blocs du « board éditorial » — direction 4a du design Rojer.
//
// Chaque bloc est un widget du registre : il reçoit le bundle et rend une
// carte à grand rayon sur le canvas quasi blanc — blanche à filet et
// ombre douce (bento), sauf les deux qui passent au noir (voir
// `CarteBoard`). Le système de
// personnalisation (DashboardGrid + EditToolbar, le « ⠿ Personnaliser » du
// mockup) reste donc pleinement opérant — le board n'est que le layout
// par défaut, pas une page figée.
//
// Aucune donnée n'est écrite en dur ici : tout vient du bundle, et les
// dérivations non triviales vivent dans `@/lib/dashboard/{brief,frise,
// obligations}` où elles sont testées.

import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { LienProvenance } from "@/components/navigation/LienProvenance";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  GanttChart,
} from "lucide-react";
import { construireBrief } from "@/lib/dashboard/brief";
import { LIBELLE_ETAT_COURT } from "@/lib/calendrier/etats";
import {
  illustrationBatiment,
  sourceIllustrationBatiment,
} from "@/lib/etablissements/illustration";
import { HeroBatiments } from "./hero-batiments";
import type { Recommandation } from "@/lib/dashboard/recommandations";
import { construireFrise, type EchelleFrise } from "@/lib/dashboard/frise";
import { composantesCiviles } from "@/lib/dates";
import { estVerificationEnRetard } from "@/lib/dates/retard";
import {
  badgeEcart,
  compteARebours,
  libelleAnciennete,
  libelleAnteriorite,
  libelleDateCourte,
} from "../temps";
import {
  MarqueurEcheance,
  MarqueurFamille,
} from "@/components/calendrier/MarqueurFamille";
import type { FamilleEcheance } from "@/lib/calendrier/echeances";
import type { VentilationEcheances } from "@/lib/calendrier/retards";
import { VueMois } from "@/components/calendrier/VueMois";
import { VueAnnee } from "@/components/calendrier/VueAnnee";
import {
  COLONNES_MATRICE,
  compterRestes,
  construireMatrice,
  type EtatCellule,
} from "@/lib/dashboard/obligations";
import type { DashboardBundle } from "../types";
import { estEcheanceContractuelle } from "@/lib/prescriptions/sources";
import { MentionContractuelle } from "@/components/prescriptions/MentionContractuelle";

/* ─── Primitives partagées ──────────────────────────────────── */

/**
 * Le design distingue deux rayons : 26 px sur les cartes-chiffre, 30 px
 * sur les grands blocs. Le rayon est donc un paramètre, pas une classe
 * qu'on écraserait depuis l'appelant (l'ordre des classes Tailwind ne
 * décide pas de la priorité).
 */
export function CarteBoard({
  children,
  className = "",
  rayon = 30,
  ton = "clair",
}: {
  children: React.ReactNode;
  className?: string;
  rayon?: 26 | 30;
  /**
   * Les blocs sombres sont l'exception : la préparation d'un contrôle
   * (la porte à pousser quand un inspecteur se présente) et, hors
   * défaut, la carte-compteur « Prochaine échéance ». Le reste du board
   * les entoure et les explique ; leur position par défaut vient de
   * `ORDRE_DEFAUT` (registry), et l'utilisateur peut les déplacer.
   *
   * Sur fond noir, aucune encre foncée ne passe : le texte est blanc ou
   * ardoise, et les champs colorés restent les champs clairs de la
   * palette — ils y gagnent même en présence.
   */
  ton?: "clair" | "sombre";
}) {
  return (
    <div
      className={
        // Sur canvas quasi blanc, l'aplat ne sépare plus rien : c'est le
        // filet cheveu et l'ombre douce qui détachent la carte — bento.
        "flex h-full flex-col " +
        (ton === "sombre"
          ? "bg-[color:var(--board-ink)] shadow-[0_1px_2px_rgba(13,18,36,.06),0_16px_40px_-16px_rgba(13,18,36,.22)] "
          : "bg-[color:var(--board-card)] ring-1 ring-[color:rgba(13,18,36,.06)] shadow-[0_1px_2px_rgba(13,18,36,.04),0_12px_32px_-14px_rgba(13,18,36,.10)] ") +
        (rayon === 26 ? "rounded-[26px] " : "rounded-[30px] ") +
        className
      }
    >
      {children}
    </div>
  );
}

/** En-tête standard d'un bloc du board : famille + titre 26 px +
 *  sous-titre, et à droite soit la porte ronde (href), soit des contrôles
 *  libres (actions) — exporté pour que les widgets hors de ce fichier
 *  (équipements) n'aient pas à recopier le motif. */
export function TitreBloc({
  famille,
  titre,
  sousTitre,
  href,
  actions,
}: {
  /**
   * Sur-titre mono, repris du cadran de la page publique : il dit de
   * quelle famille relève le bloc (« ÉCHÉANCES », « SUIVI », « PREUVE »)
   * avant que le titre ne dise ce qu'il montre. C'est un repère de
   * lecture, pas une décoration — un board de douze cartes se parcourt
   * mieux quand chacune annonce son registre. Les blocs dont le titre
   * porte déjà sa famille s'en passent.
   */
  famille?: string;
  titre: string;
  sousTitre?: React.ReactNode;
  href?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0">
        {famille ? (
          <p className="board-eyebrow m-0 mb-2">{famille}</p>
        ) : null}
        <h2 className="board-titre m-0 text-[26px]">{titre}</h2>
        {sousTitre ? (
          <p className="mt-[7px] text-[13.5px] text-[color:var(--board-slate-mid)]">
            {sousTitre}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="ml-auto flex flex-none items-center gap-2.5">
          {actions}
        </div>
      ) : href ? (
        <Link
          href={href}
          aria-label={`Ouvrir ${titre}`}
          className="ml-auto flex size-9 flex-none items-center justify-center rounded-full border border-[color:rgba(10,10,10,.16)] text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-blue-pale)]"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

/** Pastille de comptage — bleue par défaut, rose en alerte. Le champ
 *  d'alerte est d'un cran plus présent que le bleu neutre (1,30 contre
 *  1,13 sur carte blanche) : c'est le seul écart de poids qu'on s'autorise
 *  entre les deux tons. */
function Pastille({
  children,
  ton = "neutre",
}: {
  children: React.ReactNode;
  ton?: "neutre" | "alerte";
}) {
  const classes =
    ton === "alerte"
      ? "bg-[color:var(--board-signal)] text-[color:var(--board-signal-ink)]"
      : "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]";
  return (
    <span
      className={
        "inline-block rounded-full px-[13px] py-[6px] text-[12px] font-semibold " +
        classes
      }
    >
      {children}
    </span>
  );
}

/** Ordre de lecture des familles — celui du calendrier. */
const ORDRE_FAMILLES: FamilleEcheance[] = [
  "controle",
  "travaux",
  "operations",
  "papiers",
  "personnel",
];

/**
 * Le mot de chaque famille, accordé en nombre.
 *
 * Ce sont ceux de `LABEL_FAMILLE`, que le rail et le calendrier affichent
 * — mais toujours au pluriel, parce qu'ils y nomment une catégorie et non
 * une quantité. Ici le mot suit un chiffre : « 1 opérations » trahirait
 * que personne n'a relu la ligne.
 */
const MOT_FAMILLE: Record<FamilleEcheance, [string, string]> = {
  controle: ["vérification", "vérifications"],
  travaux: ["correction", "corrections"],
  operations: ["opération", "opérations"],
  papiers: ["document", "documents"],
  // Cf. `NOM_RETARD` dans `lib/dashboard/brief.ts` : la famille porte des
  // lignes depuis l'ADR-023, ces mots se lisent maintenant à l'écran.
  personnel: ["titre de salarié", "titres de salariés"],
};

/** Le mot de la famille pour `n` éléments. */
function motFamille(famille: FamilleEcheance, n: number): string {
  const [singulier, pluriel] = MOT_FAMILLE[famille];
  return n > 1 ? pluriel : singulier;
}

/**
 * Le détail d'un total, famille par famille : « 14 vérifications ·
 * 9 corrections · 2 documents ».
 *
 * Le nombre seul ne dit pas par quel bout prendre la journée — une
 * vérification se commande à un organisme, un document se redemande à un
 * prestataire, une correction se mène en interne. Les familles à zéro ne
 * sont pas affichées : une ligne « 0 opération » ferait du bruit là où
 * l'absence se lit très bien.
 */
function VentilationFamilles({
  ventilation,
  className = "",
}: {
  ventilation: VentilationEcheances;
  className?: string;
}) {
  const postes = ORDRE_FAMILLES.filter((f) => ventilation.parFamille[f] > 0);
  if (postes.length === 0) return null;
  return (
    <ul
      className={
        "m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1.5 p-0 text-[12.5px] text-[color:var(--board-slate-mid)] " +
        className
      }
    >
      {postes.map((f) => (
        <li key={f} className="inline-flex items-center gap-1.5">
          <MarqueurFamille famille={f} className="size-[13px]" />
          <span className="tabular-nums">{ventilation.parFamille[f]}</span>
          <span>{motFamille(f, ventilation.parFamille[f])}</span>
        </li>
      ))}
    </ul>
  );
}

/** La même ventilation, en une ligne de texte — pour un `title`. */
function libelleVentilation(ventilation: VentilationEcheances): string {
  return ORDRE_FAMILLES.filter((f) => ventilation.parFamille[f] > 0)
    .map((f) => `${ventilation.parFamille[f]} ${motFamille(f, ventilation.parFamille[f])}`)
    .join(" · ");
}

function Lien({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mt-1 inline-flex items-center gap-2 rounded-full bg-[color:var(--board-ink)] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-85"
    >
      {children}
      <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

/* ─── 1 · Le brief ──────────────────────────────────────────── */

/**
 * Le brief n'est pas un widget : c'est le bandeau de tête du tableau de
 * bord, rendu par la page au-dessus de la grille — panneau bleu ciel à
 * grand rayon, seule grande surface colorée de la page. Il n'est ni
 * déplaçable ni retirable, et c'est voulu.
 *
 * Il dit ce qu'il y a à traiter, et rien d'autre : à gauche le compte
 * (« 2 éléments à traiter ») et le paragraphe d'état dérivés des
 * compteurs réels (`construireBrief`), à droite la file de travail —
 * les deux recommandations les plus urgentes du moteur, numérotées dans
 * l'ordre où les prendre, chacune avec sa porte « Ouvrir ». La ligne
 * pointillée sous la file solde le reste : rien d'autre sous trente
 * jours, ou le compte de ce qui s'y trouve, en lien vers le calendrier.
 * Aucune chaîne décorative : tout vient du bundle.
 */

/** Tons d'une carte-tâche : le rose marque le dépassé (vérification ou
 *  action en retard), le bleu tout le reste — y compris les amorces. */
const KINDS_ALERTE: ReadonlySet<Recommandation["kind"]> = new Set([
  "verif_depassee",
  "action_en_retard",
]);

/**
 * La ligne de méta d'une recommandation — et surtout, la politique de
 * troncature qui va avec, tenue à UN SEUL ENDROIT.
 *
 * ## Pourquoi ce composant existe
 *
 * Deux widgets rendent une recommandation : `CarteTache` (« Par où
 * commencer ») et `BlocAFaire` (« À faire »). Leurs mises en page diffèrent
 * légitimement — pastille numérotée et bouton « Ouvrir » d'un côté, ligne
 * cliquable et badge d'écart de l'autre. Ce n'est pas la duplication à
 * supprimer.
 *
 * Ce qui diverge à chaque correction, en revanche, ce sont les RÈGLES. Trois
 * défauts en une journée se sont logés dans ces deux fonctions :
 *
 *  1. la file amputée par `priorite <= 5` — présente aux deux endroits, il a
 *     fallu qu'on signale le second ;
 *  2. la clé React en double — aux deux endroits ;
 *  3. la troncature du sous-titre — corrigée d'un seul côté, et c'était **le
 *     côté que personne ne voit** : sur un dossier neuf, le tableau de bord
 *     montre « À faire », et « Par où commencer » doit être ajouté à la main
 *     depuis le tiroir. La correction est allée dans le widget caché, le
 *     défaut est resté dans celui qui s'affiche.
 *
 * Trois fois en un jour, c'est une donnée et non un hasard. La troncature n'a
 * aucune raison de dépendre du widget : c'est une décision sur ce qu'on
 * s'autorise à couper d'une phrase écrite pour être lue. Elle vit donc ici, et
 * les deux widgets l'appellent.
 *
 * ## Deux lignes, et le même nombre des deux côtés
 *
 * `line-clamp-2` plutôt que `truncate`. Une seule ligne coupait à ~104 signes
 * sur une carte de 638 px — mesuré — et coupait en silence : ni le rendu ni le
 * type ne disent qu'une phrase a été amputée. Deux lignes doublent la place et
 * bornent toujours la hauteur.
 *
 * Le même nombre des deux côtés est ce qui rend le garde-fou de longueur
 * calculable : `recommandations.test.ts` refuse un sous-titre plus long que ce
 * que deux lignes tiennent. Si un widget revenait à une ligne, ce seuil
 * deviendrait faux **pour lui seul**, et c'est exactement l'erreur que ce test
 * a commise à sa première rédaction — il était calibré sur deux lignes quand
 * le widget affiché n'en avait qu'une, si bien qu'il acceptait 138 signes que
 * l'écran coupait.
 */
function MetaRecommandation({
  children,
  taille,
}: {
  children: React.ReactNode;
  /** La seule chose qui diffère entre les deux widgets : la graisse du texte. */
  taille: "12" | "12.5";
}) {
  return (
    <p
      className={
        "m-0 mt-0.5 line-clamp-2 text-[color:var(--board-slate-mid)] " +
        (taille === "12" ? "text-[12px]" : "text-[12.5px]")
      }
    >
      {children}
    </p>
  );
}

function CarteTache({
  numero,
  reco,
  aujourdhui,
}: {
  numero: number;
  reco: Recommandation;
  aujourdhui: Date;
}) {
  const alerte = KINDS_ALERTE.has(reco.kind);

  // Méta : le sous-titre du moteur, complété par la date quand elle
  // existe — « depuis N j » pour le dépassé, la date courte sinon.
  //
  // L'ancienneté est comptée en jours civils et vaut `null` le jour de
  // l'échéance : le `Math.max(1, …)` d'avant annonçait « depuis 1 j » dès
  // le jour dit, sur une échéance que le produit ne tient pas encore pour
  // dépassée. Dans ce cas on retombe sur la date, qui ne ment pas.
  let meta = reco.sousTitre ?? "";
  if (reco.date) {
    const anciennete = alerte ? libelleAnciennete(reco.date, aujourdhui) : null;
    meta = anciennete
      ? `${meta} ${anciennete}`
      : meta
        ? `${meta} · ${libelleDateCourte(reco.date)}`
        : libelleDateCourte(reco.date);
  }

  return (
    <li className="flex items-center gap-4 rounded-[24px] bg-[color:var(--board-card)] py-3.5 pl-4 pr-3.5 shadow-[0_14px_30px_-20px_rgba(13,18,36,.30)]">
      <span
        className={
          "flex size-10 flex-none items-center justify-center rounded-full text-[15px] font-semibold tabular-nums " +
          (alerte
            ? "bg-[color:var(--board-signal)] text-[color:var(--board-signal-ink)]"
            : "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]")
        }
      >
        {numero}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[15px] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)]">
          {reco.titre}
        </p>
        {meta ? (
          <MetaRecommandation taille="12.5">{meta}</MetaRecommandation>
        ) : null}
      </div>
      <LienProvenance
        href={reco.href}
        aria-label={`Ouvrir : ${reco.titre}`}
        className={
          "flex-none rounded-full bg-[color:var(--board-ink)] px-[18px] py-[9px] text-[12.5px] font-semibold text-white transition-opacity hover:opacity-85"
        }
      >
        Ouvrir
      </LienProvenance>
    </li>
  );
}

/* — Un relevé du hero : un chiffre, son libellé.
 *
 * Trois d'entre eux cadrent le titre — celui-ci dit ce qui presse, ceux-là
 * disent de combien il s'agit en tout. Mêmes agrégats que `construireBrief`,
 * pour que les deux ne puissent pas diverger.
 */
function Releve({
  valeur,
  libelle,
  alerte = false,
}: {
  valeur: number;
  libelle: string;
  alerte?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className={
          "board-titre text-[30px] leading-none tabular-nums " +
          (alerte ? "text-[color:var(--board-signal-ink)]" : "")
        }
      >
        {valeur}
      </span>
      <span className="board-eyebrow text-[color:var(--board-slate-mid)]">
        {libelle}
      </span>
    </div>
  );
}

export function BlocBrief({ bundle }: { bundle: DashboardBundle }) {
  const { aujourdhui, dashboard, echeancesEtablissement, nbRapports } = bundle;
  const { duerp, recommandations } = dashboard;
  // Un seul agrégat pour le titre comme pour les relevés chiffrés — et il
  // porte sur l'**établissement**, filtre bâtiment ignoré. Le hero dit l'état
  // du site : sa plaque de droite liste tous les volumes avec la charge de
  // chacun, et des relevés filtrés annonçaient « Dépassées 3 » à côté de
  // cartes qui en totalisent sept. Le filtre gouverne ce qui est sous le
  // hero. Cf. `DashboardBundle.echeancesEtablissement`.
  const { retards, sous30j } = echeancesEtablissement;

  const brief = construireBrief({
    aujourdhui,
    retards,
    sous30j,
    verifsAPlanifier: echeancesEtablissement.verifsAPlanifier,
    // `etat` transmis : sans lui le brief se rabattait sur sa formulation de
    // repli et n'annonçait jamais « aucune version validée » — il disait
    // « votre DUERP a plus de douze mois » à quelqu'un qui venait de l'ouvrir.
    duerp: {
      existe: duerp.existe,
      estAJour: duerp.estAJour,
      etat: duerp.etat,
    },
    recommandations: recommandations.map((r) => ({
      kind: r.kind,
      titre: r.titre,
      href: r.href,
    })),
    nbRapports,
  });

  // Le titre est celui de `construireBrief`, dérivé des **compteurs** de
  // l'établissement. Il était auparavant écrasé par `reelles.length`,
  // c'est-à-dire par le nombre de recommandations — que le moteur plafonne
  // à cinq (`genererRecommandations`, limite par défaut). Un dossier avec
  // quarante échéances dépassées annonçait donc « 5 éléments à traiter » :
  // l'outil minorait la non-conformité, ce qu'il s'interdit.
  const titre = brief.titre;

  // Le même agrégat que le titre, la pastille du widget « Échéances » et
  // le badge de la barre latérale : toutes familles confondues.
  const totalUrgent = retards.total;

  const { etablissement, batiments } = bundle;
  const srcIllustration = sourceIllustrationBatiment(
    illustrationBatiment(etablissement),
  );

  return (
    <>
      {/* Fonds inversés : le hero porte le ciel en bandeau pleine largeur,
          sans rayon. Le bandeau s'arrête après les bâtiments — les widgets
          vivent sur le canvas quasi blanc.

          La gouttière est celle du board (`--board-gutter`) et non plus
          46 px fixes : au-delà de 1560 px de viewport elle s'ouvre jusqu'à
          140 px, et le hero, resté à 46, débordait des cartes de widgets
          d'une centaine de pixels de chaque côté. Sur un grand écran, rien
          ne s'alignait verticalement d'un bloc à l'autre. */}
      <div className="bg-[color:var(--board-sky)] px-[var(--board-gutter)] pb-[52px] pt-[56px]">
        <div className="grid items-center gap-x-12 gap-y-10 lg:grid-cols-2">
          {/* Rentré de la gouttière : collé au bord, le titre partait du même
              trait que les cartes de widgets du dessous et le hero perdait
              son statut de bandeau — c'est une bannière, pas une carte. */}
          <div className="lg:pl-8 xl:pl-12">
            <p className="board-eyebrow m-0 mb-3 text-[color:var(--board-slate-ink)]">
              {brief.datePill}
            </p>

            {/* `text-pretty` plutôt que l'équilibrage de `.board-titre` : sur
                un titre de trois mots-clés, équilibrer les lignes en fabrique
                une troisième et casse le bloc.

                Le paragraphe du brief a été retiré d'ici : il énumérait en
                toutes lettres les mêmes nombres que les relevés ci-dessous
                (« 14 vérifications dépassées, 22 à programmer… »), et
                l'état du DUERP, qui a son propre widget. Trois chiffres se
                lisent d'un coup d'œil ; la même chose en prose, non. */}
            <h1 className="board-titre max-w-[480px] text-pretty text-[clamp(28px,2.9vw,40px)] leading-[1.06] tracking-[-0.035em]">
              {titre}
            </h1>

            {/* Les relevés. Séparateurs en filet plutôt qu'en gouttière :
                trois chiffres alignés sans trait se lisent comme un seul
                nombre. */}
            <div className="mt-7 flex items-stretch">
              <div className="pr-[26px]">
                {/* Le mot vient de la table d'états (`LIBELLE_ETAT_COURT`),
                    comme celui de la pastille de zone à 200 px d'ici et celui
                    du bandeau du parc à un clic : les trois écrivaient trois
                    mots différents pour cet état-là. */}
                <Releve
                  valeur={totalUrgent}
                  libelle={LIBELLE_ETAT_COURT.enRetard}
                  alerte={totalUrgent > 0}
                />
              </div>
              <div className="w-px bg-[color:rgba(10,10,10,.12)]" />
              <div className="px-[26px]">
                {/* Toutes familles, comme le relevé d'à côté : ce
                    compteur-ci ne comptait que les vérifications. */}
                <Releve
                  valeur={sous30j.total}
                  libelle={LIBELLE_ETAT_COURT.proche}
                />
              </div>
              <div className="w-px bg-[color:rgba(10,10,10,.12)]" />
              <div className="pl-[26px]">
                {/* Le parc entier, comme les deux relevés d'à côté et
                    comme les cartes de la plaque : trois chiffres alignés
                    sous un même titre ne peuvent pas avoir trois portées. */}
                <Releve
                  valeur={bundle.equipementsEtablissement.length}
                  libelle="Équipements"
                />
              </div>
            </div>

            {/* Ce que ces chiffres comptent, sous les chiffres.
                « Dépassées » est le plus large des compteurs du produit —
                toutes familles, tout l'établissement — et c'est justement pour
                ça qu'il devait le dire : il est celui que le dirigeant compare
                aux 19 de la page Équipements, sans que rien nulle part ne lui
                explique l'écart. La phrase se dérive du type fermé des
                familles (`enumererFamilles`), jamais recopiée. */}
            <p className="m-0 mt-5 max-w-[480px] text-[12px] leading-[1.5] text-[color:var(--board-slate-ink)]">
              {bundle.perimetreHero.releves}
            </p>
          </div>

          {/* Les bâtiments déclarés (ADR-019) — un état, pas une commande :
              le filtre reste au sélecteur posé sous le hero, qui porte sa
              porte de sortie.

              La plaque occupe toute sa colonne. Calée à droite sur sa seule
              largeur de contenu, elle se serrait contre le bord de l'écran
              pendant que la colonne de gauche gardait son air : les deux
              moitiés du hero ne pesaient pas le même poids. */}
          <div className="w-full">
            <HeroBatiments
              nomEtablissement={etablissement.raisonDisplay}
              // Pas encore de logo en base — cf. la note dans `Enseigne`.
              logoUrl={null}
              batiments={batiments}
              srcIllustration={srcIllustration}
              legende={bundle.perimetreHero.plaqueZones}
            />
          </div>
        </div>
      </div>

      </>
  );
}

/* ─── 1 bis · Par où commencer ────────────────────────────────
 *
 * La file de travail a quitté le hero pour devenir un widget, retiré du
 * layout par défaut. Deux raisons : le hero dit l'état du dossier et du
 * parc, pas la marche à suivre ; et une file de deux lignes n'a pas à
 * s'imposer à tout le monde en tête d'écran — celui qui la veut l'ajoute.
 *
 * Le sur-titre « N sur M » reste la seule ligne qui dit que la file est un
 * extrait. Sans lui, deux cartes se lisent comme « il n'y a que ça ».
 */
export function BlocParOuCommencer({ bundle }: { bundle: DashboardBundle }) {
  const { etablissementId, aujourdhui, dashboard, echeances } = bundle;
  const { recommandations } = dashboard;

  // Le moteur trie déjà par priorité, puis par date (`recommandations.ts`).
  // Il n'y a donc rien à ordonner ici — et surtout rien à retirer : cette
  // ligne partitionnait sur `priorite <= 5` et ne gardait le reste que si
  // la première moitié était VIDE. « Derrière les amorçages », que l'ADR-024
  // écrit noir sur blanc pour les transmissions, était rendu par « seulement
  // si rien d'autre ». Sur un dossier à 27 retards, la seule famille de
  // recommandations qui ne soit pas fondée sur une date n'apparaissait donc
  // jamais. Constaté à l'écran, pas au diff.
  const file = recommandations.slice(0, 2);

  const totalUrgent = echeances.retards.total;
  const extrait = totalUrgent > file.length;

  // « Autre » au sens strict : les vérifications proches déjà en carte ne
  // sont pas recomptées dans le solde.
  const prochesAffichees = file.filter((r) => r.kind === "verif_proche").length;
  const resteSous30j = Math.max(0, echeances.sous30j.total - prochesAffichees);
  const hrefCalendrier = `/etablissements/${etablissementId}/calendrier`;

  return (
    <CarteBoard className="p-6">
      <p className="board-eyebrow m-0 mb-3">
        {extrait
          ? `Par où commencer — ${file.length} sur ${totalUrgent}`
          : "Par où commencer"}
      </p>

      {file.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {file.map((r, i) => (
            <CarteTache
              key={r.cle}
              numero={i + 1}
              reco={r}
              aujourdhui={aujourdhui}
            />
          ))}
        </ol>
      ) : null}

      {/* Le solde de la file. À zéro, on le dit — le silence se lirait
          comme un oubli ; sinon, la ligne est la porte vers le
          calendrier. */}
      {resteSous30j > 0 ? (
        <Link
          href={hrefCalendrier}
          className="mt-3 flex items-center gap-3 rounded-[18px] border border-dashed border-[color:rgba(10,10,10,.28)] px-4 py-3 transition-colors hover:border-solid hover:bg-[color:var(--board-blue-pale)]/40"
        >
          <span className="flex size-7 flex-none items-center justify-center rounded-full bg-[color:var(--board-slate-pale)]">
            <CalendarDays className="size-3.5 text-[color:var(--board-ink)]" />
          </span>
          <span className="text-[13px] text-[color:var(--board-slate-ink)]">
            {resteSous30j} autre{resteSous30j > 1 ? "s" : ""} échéance
            {resteSous30j > 1 ? "s" : ""} sous 30 jours — voir le calendrier
          </span>
        </Link>
      ) : (
        <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-dashed border-[color:rgba(10,10,10,.28)] px-4 py-3">
          <span className="flex size-7 flex-none items-center justify-center rounded-full bg-[color:var(--board-slate-pale)]">
            <Check className="size-3.5 text-[color:var(--board-ink)]" />
          </span>
          <span className="text-[13px] text-[color:var(--board-slate-ink)]">
            Aucune autre échéance sous 30 jours.
          </span>
        </div>
      )}
    </CarteBoard>
  );
}

/* ─── 2 · La frise ──────────────────────────────────────────── */

/*
 * La géométrie de la piste — et pourquoi elle est écrite en constantes
 * dérivées plutôt qu'en littéraux dispersés.
 *
 * Les cartes de la voie HAUTE sont posées par leur bord bas : elles
 * grandissent donc vers le haut. Or le conteneur qui défile ne peut pas ne
 * pas clipper — `overflow-x: auto` interdit `overflow-y: visible`, qui
 * devient `auto`. Une carte plus haute que sa voie perdait donc ses angles
 * supérieurs et le haut de son titre, accents compris : « Systèmes de
 * sécurité » s'affichait décapité, sans coin arrondi.
 *
 * Deux corrections, et il faut les deux. La voie est dimensionnée sur la
 * carte la plus haute — et le contenu est borné pour que ce nombre existe :
 * titre sur deux lignes au plus, sous-titre qui se replie d'un bloc au lieu
 * de s'empiler un mot par ligne (cf. la carte, plus bas). Sans la seconde,
 * la hauteur maximale d'une carte est celle du plus long mot de la plus
 * longue date, c'est-à-dire rien qu'on puisse réserver.
 */

/** Carte la plus haute que le contenu borné puisse produire :
 *  `py-3` (12+12) + 2 lignes de titre (2×17,5) + `mt-[5px]` + 2 lignes de
 *  sous-titre (2×17). */
const CARTE_HAUTEUR_MAX = 98;
/** Bord bas des cartes de la voie haute — au moins la carte la plus haute,
 *  sinon le débord se fait vers le haut, là où ça coupe. */
const VOIE_HAUTE = 104;
/** Ordonnée de l'axe dans cette zone. */
const AXE_Y = VOIE_HAUTE + 16;
/** Bord haut des cartes de la voie basse, à la même distance de l'axe. */
const VOIE_BASSE = AXE_Y + 16;
/** Hauteur de la zone de marqueurs, en pixels. */
const PISTE_HAUTEUR = VOIE_BASSE + CARTE_HAUTEUR_MAX + 10;
/** Demi-largeur d'une carte de marqueur — sert à la borner aux extrémités. */
const DEMI_CARTE = 86;
/** Marge à gauche d'aujourd'hui au cadrage initial, en pixels. */
const CADRAGE_INITIAL = 130;

/** Registre visuel d'un marqueur. La frise ne sert que deux urgences :
 *  le rouge (dépassé ou en alerte), l'orange (dans les 30 jours). Tout
 *  le reste est gris — une échéance lointaine n'a rien à crier. */
type RegistreMarqueur = "chaud" | "proche" | "calme";

function registreMarqueur(m: {
  passe: boolean;
  tone: string;
  proche: boolean;
}): RegistreMarqueur {
  if (m.passe || m.tone === "alerte") return "chaud";
  if (m.proche) return "proche";
  return "calme";
}

/** Couleur du point posé sur l'axe : rose du champ pour le chaud, noir
 *  pour le proche, ardoise pour le calme. */
const TON_POINT: Record<RegistreMarqueur, string> = {
  chaud: "var(--board-signal-mark)",
  proche: "var(--board-amber-mark)",
  calme: "var(--board-slate-soft)",
};

/** Texte posé sur le point en grappe. Le rose du chaud ne porte pas le
 *  blanc — il prend l'encre rouge sombre ; noir et ardoise le gardent. */
const TON_POINT_TEXTE: Record<RegistreMarqueur, string> = {
  chaud: "var(--board-signal-ink)",
  proche: "#fff",
  calme: "#fff",
};

/** Champ et textes de la carte, par registre. */
const TON_CARTE: Record<
  RegistreMarqueur,
  { fond: string; titre: string; sousTitre: string }
> = {
  chaud: {
    fond: "bg-[color:var(--board-signal-mid)]",
    titre: "text-[color:var(--board-signal-ink)]",
    sousTitre: "text-[color:var(--board-signal-ink)]",
  },
  proche: {
    fond: "bg-[color:var(--board-amber)]",
    titre: "text-[color:var(--board-amber-ink)]",
    sousTitre: "text-[color:var(--board-amber-ink)]",
  },
  calme: {
    fond: "bg-[color:var(--board-slate-pale)]",
    titre: "text-[color:var(--board-ink)]",
    sousTitre: "text-[color:var(--board-slate-mid)]",
  },
};

/** Flèche de défilement — desktop uniquement (au doigt, on fait glisser). */
function FlecheDefilement({
  sens,
  onClick,
  visible,
}: {
  sens: "gauche" | "droite";
  onClick: () => void;
  visible: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!visible}
      aria-label={
        sens === "gauche"
          ? "Reculer dans la frise"
          : "Avancer dans la frise"
      }
      className={
        "absolute top-[100px] z-20 hidden size-10 items-center justify-center rounded-full border border-[color:rgba(10,10,10,.12)] bg-[color:var(--board-card)] text-[color:var(--board-ink)] shadow-[0_2px_10px_rgba(10,10,10,.10)] transition-opacity md:flex " +
        (sens === "gauche" ? "left-1" : "right-1") +
        (visible ? " opacity-100 hover:bg-[color:var(--board-blue-pale)]" : " opacity-0")
      }
    >
      {sens === "gauche" ? (
        <ChevronLeft className="size-4" />
      ) : (
        <ChevronRight className="size-4" />
      )}
    </button>
  );
}

export function BlocFrise({ bundle }: { bundle: DashboardBundle }) {
  // Bascules inline, comme dans le design. Elles vivent ici plutôt que
  // dans le système de variants pour rester accessibles hors mode
  // « Personnaliser ».
  const [echelle, setEchelle] = useState<EchelleFrise>("jours");
  const [vue, setVue] = useState<"frise" | "calendrier">("calendrier");
  // Maille de la vue calendrier : l'année entière d'emblée — la grille
  // d'un mois reste accessible via la bascule mois / année.
  const [maille, setMaille] = useState<"mois" | "annee">("annee");
  // Le mois affiché est lu en heure de Paris, pas dans le fuseau du
  // navigateur : ce composant est client, et `getMonth()` sur un instant
  // proche de minuit ouvrait le calendrier sur le mois précédent pour un
  // utilisateur à l'ouest de UTC.
  const [mois, setMois] = useState(() => {
    const c = composantesCiviles(bundle.aujourdhui);
    return new Date(c.annee, c.mois - 1, 1);
  });

  const piste = useRef<HTMLDivElement | null>(null);
  const [bords, setBords] = useState({ gauche: false, droite: false });

  // La fenêtre couvre trois mois de passé et deux ans à venir : c'est le
  // conteneur qui défile, l'échelle ne fait que zoomer.
  const frise = construireFrise({
    evenements: bundle.evenementsHorizon,
    aujourdhui: bundle.aujourdhui,
    echelle,
  });

  const majBords = useCallback(() => {
    const el = piste.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setBords({
      gauche: el.scrollLeft > 4,
      droite: el.scrollLeft < max - 4,
    });
  }, []);

  // À l'ouverture — et à chaque changement d'échelle — la frise s'ouvre
  // sur aujourd'hui, pas sur le premier jour consultable : le passé est
  // atteignable, il n'est pas ce qu'on vient regarder.
  useLayoutEffect(() => {
    if (vue !== "frise") return;
    const el = piste.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, frise.xAujourdhui - CADRAGE_INITIAL);
    majBords();
  }, [vue, echelle, frise.xAujourdhui, majBords]);

  const defiler = (sens: -1 | 1) => {
    const el = piste.current;
    if (!el) return;
    const anime = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    el.scrollBy({
      left: sens * el.clientWidth * 0.8,
      behavior: anime ? "smooth" : "auto",
    });
  };

  // Le compte « en retard » de l'en-tête ne vient ni de la frise ni des
  // dates de `evenementsHorizon`, mais de l'agrégat du bundle — le même
  // que le bandeau d'accueil, la sidebar et la page calendrier.
  //
  // Deux raisons, toutes deux vérifiées sur des dossiers réels :
  // `construireFrise` place ses marqueurs avec un `minuit()` calculé dans
  // le fuseau du **navigateur** (cf. `lib/dashboard/frise.ts`), ce qui
  // décale le compte d'un jour à l'ouest de UTC ; et compter les dates
  // passées comptait aussi celles d'un permis de feu **clos** la semaine
  // dernière, que le registre marque `ok`. Le dépassement se lit sur le
  // ton, jamais sur la date seule.
  const retards = bundle.echeances.retards;
  const nbEnRetard = retards.total;

  const hrefCalendrier = `/etablissements/${bundle.etablissementId}/calendrier`;
  // Du même agrégat que le reste : celui du `dashboard` ignore le filtre
  // bâtiment, et annonçait des occurrences sans date qui n'étaient pas
  // dans la liste posée juste en dessous.
  const nbSansDate = bundle.echeances.verifsAPlanifier;

  return (
    <CarteBoard className="px-[30px] pb-5 pt-[26px]">
      <div className="flex items-start gap-4">
        <div>
          <p className="board-eyebrow m-0 mb-2">Échéances</p>
          <h2 className="board-titre m-0 text-[30px]">
            {vue === "calendrier"
              ? "Votre calendrier"
              : echelle === "jours"
                ? "Les 90 prochains jours"
                : "Les 12 prochains mois"}
          </h2>
          <p className="mt-2 text-[13.5px] text-[color:var(--board-slate-mid)]">
            {vue === "calendrier"
              ? maille === "annee"
                ? "L’année d’un bloc — cliquez un mois pour le détailler."
                : "Mois par mois, ce qui tombe et quel jour."
              : "Ce qui tombe, quand, et ce qui est déjà pris en charge — faites défiler pour aller jusqu’à 24 mois."}
          </p>
          {/* Ce que la pastille recouvre. Un nombre unique ne dit pas s'il
              faut faire venir un organisme ou relancer un prestataire ;
              le bandeau d'accueil le dit en toutes lettres, ce bloc-ci
              n'a que cette ligne pour le dire. */}
          {nbEnRetard > 0 ? (
            <VentilationFamilles ventilation={retards} className="mt-2.5" />
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {nbEnRetard > 0 ? (
            <Link
              href={hrefCalendrier}
              // Toutes familles confondues, comme le calendrier et le
              // bandeau d'accueil — et non les seules vérifications, comme
              // le sous-compte `verifications`, qui nomme explicitement son
              // périmètre plus étroit. (Il servait le badge « Contrôles
              // matériel » de la barre latérale, retiré depuis par
              // l'ADR-015 ; il n'a plus de lecteur.)
              title={`${nbEnRetard} échéance${nbEnRetard > 1 ? "s" : ""} en retard, toutes familles confondues — ${libelleVentilation(retards)}`}
              className="hidden sm:inline-block"
            >
              <Pastille ton="alerte">
                {nbEnRetard} en retard
              </Pastille>
            </Link>
          ) : null}
          {vue === "calendrier"
            ? (["mois", "annee"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMaille(m)}
                  aria-pressed={maille === m}
                  className={
                    "rounded-full px-[13px] py-[6px] text-[11.5px] font-semibold transition-colors " +
                    (maille === m
                      ? "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                      : "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]")
                  }
                >
                  {m === "mois" ? "Mois" : "Année"}
                </button>
              ))
            : null}
          {vue === "frise"
            ? (["jours", "mois"] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEchelle(e)}
                  aria-pressed={echelle === e}
                  className={
                    "rounded-full px-[13px] py-[6px] text-[11.5px] font-semibold transition-colors " +
                    (echelle === e
                      ? "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                      : "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]")
                  }
                >
                  {e === "jours" ? "90 jours" : "12 mois"}
                </button>
              ))
            : null}
          <button
            type="button"
            onClick={() => setVue(vue === "frise" ? "calendrier" : "frise")}
            aria-pressed={vue === "calendrier"}
            aria-label={
              vue === "frise"
                ? "Passer en vue calendrier"
                : "Revenir à la frise"
            }
            title={
              vue === "frise" ? "Vue calendrier" : "Vue frise"
            }
            className={
              "flex size-9 flex-none items-center justify-center rounded-full transition-colors " +
              (vue === "calendrier"
                ? "bg-[color:var(--board-ink)] text-white"
                : "border border-[color:rgba(10,10,10,.16)] text-[color:var(--board-ink)] hover:bg-[color:var(--board-blue-pale)]")
            }
          >
            {vue === "frise" ? (
              <CalendarDays className="size-4" />
            ) : (
              <GanttChart className="size-4" />
            )}
          </button>
          <Link
            href={hrefCalendrier}
            aria-label="Ouvrir le calendrier"
            className="flex size-9 flex-none items-center justify-center rounded-full border border-[color:rgba(10,10,10,.16)] text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-blue-pale)]"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      {vue === "calendrier" ? (
        maille === "annee" ? (
          <VueAnnee
            annee={mois.getFullYear()}
            evenements={bundle.evenementsHorizon}
            aujourdhui={bundle.aujourdhui}
            // Même fenêtre que la frise : au-delà, la donnée n'est pas
            // chargée, et une carte-mois vide mentirait.
            fenetre={{ debut: frise.debut, fin: frise.fin }}
            onPrecedent={() =>
              setMois((m) => new Date(m.getFullYear() - 1, m.getMonth(), 1))
            }
            onSuivant={() =>
              setMois((m) => new Date(m.getFullYear() + 1, m.getMonth(), 1))
            }
            onChoisirMois={(m) => {
              setMois(m);
              setMaille("mois");
            }}
            peutReculer={new Date(mois.getFullYear() - 1, 11, 31) >= frise.debut}
            peutAvancer={new Date(mois.getFullYear() + 1, 0, 1) <= frise.fin}
          />
        ) : (
          <VueMois
            mois={mois}
            evenements={bundle.evenementsHorizon}
            aujourdhui={bundle.aujourdhui}
            hrefEvenement={(e) =>
              `/etablissements/${bundle.etablissementId}/verifications/${e.id}`
            }
            onPrecedent={() =>
              setMois((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
            }
            onSuivant={() =>
              setMois((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
            }
            // Même fenêtre que la frise : au-delà, la donnée n'est pas
            // chargée, et une grille vide ne voudrait rien dire.
            peutReculer={mois > frise.debut}
            peutAvancer={mois < frise.fin}
          />
        )
      ) : frise.marqueurs.length === 0 ? (
        // Rien à placer sur l'axe : on ne dessine pas une frise déserte de
        // 236 px. On dit ce qui bloque, et on donne la porte de sortie.
        <div className="mt-7 flex flex-col items-start gap-3 rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-7">
          {bundle.equipements.length === 0 ? (
            <>
              <p className="m-0 text-[15px] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)]">
                Votre calendrier est vide
              </p>
              <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                Il se remplit tout seul à partir des équipements déclarés — il
                n&apos;y en a pas encore.
              </p>
              <Lien
                href={`/etablissements/${bundle.etablissementId}/equipements/nouveau`}
              >
                Déclarer un équipement
              </Lien>
            </>
          ) : nbEnRetard > 0 ? (
            <>
              <p className="m-0 text-[15px] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)]">
                {nbEnRetard} échéance{nbEnRetard > 1 ? "s" : ""} en
                retard, aucune à venir
              </p>
              <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                {nbEnRetard > 1 ? "Elles datent" : "Elle date"}{" "}
                d&apos;avant
                la période affichée — trois mois en arrière au plus — et rien
                n&apos;est programmé ensuite : il n&apos;y a donc rien à poser
                sur la frise.
              </p>
              <Lien href={hrefCalendrier}>Voir le calendrier</Lien>
            </>
          ) : (
            <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">
              Aucune échéance sur cette période.
            </p>
          )}
        </div>
      ) : (
        // La frise déborde volontairement la carte : elle est plus longue
        // que large, et c'est le conteneur qui défile. Le débord négatif
        // ramène la zone de défilement aux bords de la carte, pour que
        // rien ne paraisse coupé au milieu du texte.
        <div className="relative -mx-[30px] mt-7">
          <FlecheDefilement
            sens="gauche"
            visible={bords.gauche}
            onClick={() => defiler(-1)}
          />
          <FlecheDefilement
            sens="droite"
            visible={bords.droite}
            onClick={() => defiler(1)}
          />

          <div
            ref={piste}
            onScroll={majBords}
            role="region"
            aria-label="Frise des échéances, de 3 mois en arrière à 24 mois en avant"
            className="overflow-x-auto overflow-y-hidden overscroll-x-contain"
          >
            <div className="w-max px-[30px]">
              <div
                className="relative"
                style={{ width: frise.largeur, height: PISTE_HAUTEUR }}
              >
                {/* L'axe porte l'encre pleine. C'est la ligne
                    structurante du plus grand bloc du board : au filet
                    précédent elle disparaissait, et les points
                    semblaient flotter sans support. */}
                <div
                  className="absolute inset-x-0 h-1 rounded-sm bg-[color:var(--board-ink)]"
                  style={{ top: AXE_Y }}
                />

                {/* Repère « aujourd'hui » : sans lui, un axe qui commence
                    trois mois en arrière ne dit plus où l'on est. Le trait
                    passe derrière les cartes — c'est un repère, pas un
                    élément de premier plan — et l'étiquette se pose sous
                    la voie basse, seule bande toujours libre. */}
                <div
                  className="absolute border-l border-dashed border-[color:var(--board-slate)]"
                  style={{ left: frise.xAujourdhui, top: 0, height: PISTE_HAUTEUR - 20 }}
                />
                <span
                  className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-[color:var(--board-ink)] px-2 py-[3px] font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-white"
                  style={{ left: frise.xAujourdhui, top: PISTE_HAUTEUR - 20 }}
                >
                  Aujourd&apos;hui
                </span>

                {frise.marqueurs.map((m) => {
                  const grappe = m.evenements.length > 1;
                  const registre = registreMarqueur(m);
                  const carte = TON_CARTE[registre];
                  return (
                    <Fragment key={m.cle}>
                      {/* Une grappe couvre un intervalle réel : on le
                          matérialise sur l'axe, sinon la carte laisserait
                          croire à une date unique. */}
                      {grappe && m.xFin > m.x ? (
                        <span
                          className="absolute h-1 rounded-sm"
                          style={{
                            left: m.x,
                            width: m.xFin - m.x,
                            top: AXE_Y,
                            background: TON_POINT[registre],
                            opacity: 0.45,
                          }}
                        />
                      ) : null}
                      {/* Le point est à la date exacte — c'est lui qui dit
                          vrai. En grappe, il porte le nombre. */}
                      {grappe ? (
                        <span
                          className="absolute z-10 flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold shadow-[0_0_0_4px_var(--board-card)]"
                          style={{
                            left: m.x,
                            top: AXE_Y - 8,
                            background: TON_POINT[registre],
                            color: TON_POINT_TEXTE[registre],
                          }}
                        >
                          {m.evenements.length}
                        </span>
                      ) : (
                        <span
                          className="absolute z-10 size-3.5 -translate-x-1/2 rounded-full shadow-[0_0_0_4px_var(--board-card)]"
                          style={{
                            left: m.x,
                            top: AXE_Y - 7,
                            background: TON_POINT[registre],
                          }}
                        />
                      )}
                      {/* La carte est centrée sur le point, mais bornée aux
                          extrémités de l'axe : elle y glisse légèrement, le
                          point reste à sa place. */}
                      <LienProvenance
                        href={
                          grappe
                            ? hrefCalendrier
                            : (m.evenements[0].href ??
                              `/etablissements/${bundle.etablissementId}/verifications/${m.evenements[0].id}`)
                        }
                        title={m.evenements
                          .map((e) => `${e.libelleDate} · ${e.libelle} — ${e.equipement}`)
                          .join("\n")}
                        className={
                          "absolute w-[172px] -translate-x-1/2 rounded-[18px] px-[15px] py-3 text-center transition-opacity hover:opacity-85 " +
                          carte.fond
                        }
                        style={{
                          left: Math.min(
                            Math.max(m.x, DEMI_CARTE),
                            frise.largeur - DEMI_CARTE,
                          ),
                          ...(m.cote === "haut"
                            ? { bottom: PISTE_HAUTEUR - VOIE_HAUTE }
                            : { top: VOIE_BASSE }),
                        }}
                      >
                        {/* `line-clamp-2` : la hauteur de la voie haute est
                            réservée sur deux lignes de titre, et une carte
                            plus haute que sa voie se ferait couper le haut
                            plutôt que le bas. `raccourcirLibelle` borne déjà
                            le titre à 33 caractères, qui tiennent en deux
                            lignes sauf coupe de mot défavorable ; le texte
                            entier reste dans le `title` du lien. */}
                        <p
                          className={
                            "m-0 line-clamp-2 text-[14px] font-semibold leading-[1.25] tracking-[-0.015em] " +
                            carte.titre
                          }
                        >
                          {m.titre}
                        </p>
                        {/* La nature d'abord, la date ensuite : la carte
                            disait quand, jamais quoi. La couleur porte
                            déjà l'urgence — le pictogramme et le mot
                            portent le reste (ADR-016). */}
                        {/* `flex-wrap` + `whitespace-nowrap` sur la date, et
                            c'est la moitié de la correction du rognage. Sans
                            eux, la rangée ne pouvant pas se replier, ses
                            éléments se réduisaient à leur contenu minimal et
                            « 1 SEPT. 2026 » s'empilait un mot par ligne : la
                            carte gagnait 34 px et débordait sa voie par le
                            haut. La date passe désormais entière à la ligne
                            suivante, ou reste sur la même. */}
                        <p
                          className={
                            "mt-[5px] flex flex-wrap items-center justify-center gap-x-1.5 text-[11.5px] font-semibold tracking-[0.06em] " +
                            carte.sousTitre
                          }
                        >
                          {m.type ? (
                            <>
                              <MarqueurEcheance type={m.type} />
                              <span aria-hidden>·</span>
                            </>
                          ) : null}
                          <span className="whitespace-nowrap">
                            {m.sousTitre}
                          </span>
                        </p>
                      </LienProvenance>
                    </Fragment>
                  );
                })}
              </div>

              {/* Les graduations défilent avec l'axe : c'est ce qui permet
                  de savoir où l'on est après trois écrans de défilement. */}
              <div
                className="relative mt-2.5 border-t border-[color:var(--board-slate-line)] pt-3.5"
                style={{ width: frise.largeur, height: 34 }}
              >
                {frise.mois.map((m) => (
                  <span
                    key={m.cle}
                    className={
                      "absolute top-3.5 truncate border-l border-[color:var(--board-slate)] pl-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] " +
                      (m.estMoisCourant
                        ? "text-[color:var(--board-ink)]"
                        : "text-[color:var(--board-slate-soft)]")
                    }
                    style={{ left: m.x, width: m.largeur }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Une vérification « à planifier » n'a pas de date choisie : ni la
          frise ni la grille ne la posent, les y placer à leur date de
          génération mentirait. Même note que la page Calendrier — sinon
          elles disparaîtraient sans explication. */}
      {nbSansDate > 0 ? (
        <p className="mt-2 text-[11.5px] text-[color:var(--board-slate-soft)]">
          {nbSansDate > 1
            ? `${nbSansDate} vérifications à planifier n'ont pas encore de date`
            : "1 vérification à planifier n'a pas encore de date"}{" "}
          — <Lien href={hrefCalendrier}>datez-les au calendrier</Lien>{" "}
          pour
          qu&apos;elles apparaissent ici.
        </p>
      ) : null}

      {vue === "frise" && frise.nbPlaces > frise.marqueurs.length ? (
        // Rien n'est caché : ce qui est trop rapproché pour tenir en
        // cartes distinctes est réuni en grappes. On le dit, sinon le
        // pastillage numéroté ressemble à une décoration.
        <p className="mt-2 text-[11.5px] text-[color:var(--board-slate-soft)]">
          {frise.nbPlaces} échéances sur la période. Les plus rapprochées sont
          groupées — {echelle === "mois" ? "zoomez sur « 90 jours »" : "ouvrez la vue calendrier"}{" "}
          pour les détailler.
        </p>
      ) : null}
    </CarteBoard>
  );
}

/* ─── 3 · À faire ───────────────────────────────────────────── */

/** Étiquette de type par kind de recommandation. Les amorces n'en ont
 *  pas : ce sont des invitations, leur sous-titre suffit. */
const TYPE_RECO: Partial<Record<Recommandation["kind"], string>> = {
  verif_depassee: "Vérification",
  verif_proche: "Vérification",
  action_en_retard: "Action",
  action_proche: "Action",
  duerp_a_jour: "DUERP",
};

/**
 * La to-do du dossier : vérifications ET actions mélangées, triées par
 * urgence réelle par le moteur de recommandations — l'utilisateur n'a
 * pas à savoir si « ce qui presse » est une échéance de vérification ou
 * une action corrective, c'est la même liste. Ce bloc remplace les deux
 * cartes-compteur « Prochaine échéance » et « Actions en retard » du
 * board par défaut (toujours disponibles dans le tiroir).
 *
 * Le brief du haut garde son rôle : les 2 items les plus urgents, à
 * traiter maintenant. Ici, la profondeur — jusqu'à 5 items datés, et le
 * solde sous 30 jours en pied de carte.
 */
export function BlocAFaire({ bundle }: { bundle: DashboardBundle }) {
  const { etablissementId, aujourdhui, dashboard, echeances } = bundle;
  const { recommandations } = dashboard;

  // Comme le brief : le moteur a trié, on ne retire rien. Cf. le commentaire
  // de `BlocParOuCommencer` — la partition qui vivait ici faisait sortir de
  // la file tout ce qui n'était pas une urgence réelle, au lieu de le mettre
  // derrière.
  const file = recommandations.slice(0, 5);

  // Le solde ne recompte pas les vérifications proches déjà listées.
  const prochesAffichees = file.filter(
    (r) => r.kind === "verif_proche",
  ).length;
  // Les soldes viennent de `bundle.echeances`, source unique des nombres de
  // retard du board — et la seule qui suive le filtre bâtiment. Les
  // `dashboard.compteurs` portent sur tout l'établissement : sous un filtre,
  // la carte annonçait les retards du site entier sous une liste restreinte
  // à un bâtiment.
  const solde = Math.max(0, echeances.sous30j.total - prochesAffichees);

  // Le moteur de recommandations plafonne à cinq items : la carte ne peut
  // donc pas être la liste exhaustive du retard. Le reste est compté
  // depuis les compteurs, sans quoi un dossier à quarante retards se
  // lirait « cinq choses à faire, rien d'autre sous 30 jours ».
  const totalUrgent = echeances.retards.total;
  const urgentsAffiches = file.filter((r) => KINDS_ALERTE.has(r.kind)).length;
  const resteUrgent = Math.max(0, totalUrgent - urgentsAffiches);

  const hrefCalendrier = `/etablissements/${etablissementId}/calendrier`;

  return (
    <CarteBoard className="px-7 py-[26px]">
      <TitreBloc
        famille="Priorités"
        titre="À faire"
        sousTitre={
          resteUrgent > 0
            ? "Les cinq plus urgentes — vérifications et actions mêlées."
            : "Vérifications et actions, par ordre d'urgence."
        }
        href={hrefCalendrier}
      />

      {file.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-start justify-center gap-2.5 rounded-[18px] bg-[color:var(--board-slate-pale)] px-5 py-6">
          <span className="inline-block rounded-full bg-[color:var(--board-green)] px-[13px] py-[6px] text-[12px] font-semibold text-[color:var(--board-green-ink)]">
            À jour
          </span>
          <p className="m-0 text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            Rien à traiter : aucune vérification ni action ne réclame
            votre attention.
          </p>
        </div>
      ) : (
        <ul className="m-0 mt-3 flex flex-1 list-none flex-col p-0">
          {file.map((r, i) => {
            const alerte = KINDS_ALERTE.has(r.kind);
            const type = TYPE_RECO[r.kind];
            // Écart en jours civils : le badge ne change qu'à minuit,
            // heure de Paris. Avec la division par 86 400 000, une
            // échéance du jour passait de « Auj. » à « J−1 » vers 14 h.
            const badge = r.date ? badgeEcart(r.date, aujourdhui) : null;
            // Méta : le type d'objet d'abord — c'est lui qui lève
            // l'ambiguïté — puis « en retard » ou la date.
            const meta = type
              ? `${type} · ${
                  alerte
                    ? "en retard"
                    : r.date
                      ? libelleDateCourte(r.date)
                      : (r.sousTitre ?? "")
                }`
              : (r.sousTitre ?? "");
            return (
              <li
                key={r.cle}
                className={
                  i === 0
                    ? ""
                    : "border-t border-[color:rgba(10,10,10,.07)]"
                }
              >
                <LienProvenance
                  href={r.href}
                  className="-mx-2 flex items-center gap-3 rounded-[14px] px-2 py-[11px] transition-colors hover:bg-[color:var(--board-slate-pale)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[14px] font-semibold leading-[1.3] tracking-[-0.015em] text-[color:var(--board-ink)]">
                      {r.titre}
                    </p>
                    <MetaRecommandation taille="12">
                      {meta}
                    </MetaRecommandation>
                  </div>
                  {badge ? (
                    <Pastille ton={alerte ? "alerte" : "neutre"}>
                      {badge}
                    </Pastille>
                  ) : null}
                </LienProvenance>
              </li>
            );
          })}
        </ul>
      )}

      <p className="m-0 mt-auto border-t border-[color:rgba(10,10,10,.10)] pt-[14px] text-[13px] leading-[1.5] text-[color:var(--board-slate-mid)]">
        {resteUrgent > 0 ? (
          <Link
            href={hrefCalendrier}
            className="text-[color:var(--board-ink)] underline-offset-2 hover:underline"
          >
            {resteUrgent} autre{resteUrgent > 1 ? "s" : ""} en retard
            {solde > 0
              ? `, et ${solde} échéance${solde > 1 ? "s" : ""} sous 30 jours`
              : ""}{" "}
            — voir le calendrier
          </Link>
        ) : solde > 0 ? (
          <Link
            href={hrefCalendrier}
            className="text-[color:var(--board-ink)] underline-offset-2 hover:underline"
          >
            {solde} autre{solde > 1 ? "s" : ""} échéance
            {solde > 1 ? "s" : ""} sous 30 jours — voir le calendrier
          </Link>
        ) : (
          "Rien d'autre sous 30 jours."
        )}
      </p>
    </CarteBoard>
  );
}

/* ─── 3bis · Prochaine échéance (hors défaut — repris dans « À faire ») ── */

export function BlocProchaineEcheance({ bundle }: { bundle: DashboardBundle }) {
  const { prochainesVerifs, aujourdhui, etablissementId } = bundle;

  if (prochainesVerifs.length === 0) {
    return (
      <CarteBoard
        ton="sombre"
        rayon={26}
        className="justify-center px-[26px] py-6"
      >
        <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--board-slate)]">
          Prochaine échéance
        </p>
        <p className="mt-3 text-[15px] text-white/70">
          Aucune vérification planifiée pour l&apos;instant.
        </p>
      </CarteBoard>
    );
  }

  const trie = [...prochainesVerifs].sort(
    (a, b) => a.datePrevue.getTime() - b.datePrevue.getTime(),
  );
  const v = trie[0];
  // Le compte à rebours est en jours civils, et le rouge suit le prédicat
  // partagé (ADR-011) : une échéance datée d'aujourd'hui n'est pas en
  // retard. Avec la division par 86 400 000, la carte virait au rouge
  // l'après-midi du jour dit, sans que rien n'ait changé.
  const { nombre, legende } = compteARebours(v.datePrevue, aujourdhui);
  // `archiveLe` porte l'archivage (ADR-034) : sans lui, une ligne dont
  // l'obligation ne s'applique plus — gelée sur `depassee`, donc la plus
  // ancienne, donc première du tri — s'affichait ici en compte à rebours rouge.
  const enRetard = estVerificationEnRetard(
    { ...v, dateRealisee: null },
    aujourdhui,
  );

  return (
    <CarteBoard
      ton="sombre"
      rayon={26}
      className="flex-row items-center gap-[18px] px-[26px] py-6"
    >
      <div className="min-w-0 flex-1">
        <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--board-slate)]">
          Prochaine échéance
        </p>
        <LienProvenance
          href={`/etablissements/${etablissementId}/verifications/${v.id}`}
          className="mt-3 block text-[19px] font-semibold leading-[1.2] tracking-[-0.025em] text-white hover:underline"
        >
          {v.libelleObligation}
        </LienProvenance>
        <span className="mt-2.5 inline-flex flex-wrap items-center gap-2">
          <Pastille ton={enRetard ? "alerte" : "neutre"}>
            {libelleDateCourte(v.datePrevue)} · {v.equipement.libelle}
          </Pastille>
          {/* La ligne la plus mise en avant du board ne peut pas être celle
              qui tait ce qu'elle est (ADR-032). */}
          {estEcheanceContractuelle(v) ? <MentionContractuelle /> : null}
        </span>
      </div>
      {/* Le compte à rebours est la seule surface claire de la carte :
          sur le noir, le glacier devient un carton posé dessus plutôt
          qu'une pastille de plus. */}
      <div
        className={
          "flex size-24 flex-none flex-col items-center justify-center rounded-[26px] " +
          (enRetard
            ? "bg-[color:var(--board-signal)]"
            : "bg-[color:var(--board-blue-pale)]")
        }
      >
        <span
          className={
            "text-[34px] font-semibold leading-none tracking-[-0.045em] " +
            (enRetard
              ? "text-[color:var(--board-signal-on)]"
              : "text-[color:var(--board-ink)]")
          }
        >
          {nombre}
        </span>
        <span
          className={
            // Le chiffre reste quasi-noir dans les deux cas ; c'est le
            // champ pastel et la légende colorée qui disent lequel des
            // deux on regarde.
            "mt-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] " +
            (enRetard
              ? "text-[color:var(--board-signal-ink)]"
              : "text-[color:var(--board-blue-ink)]")
          }
        >
          {legende}
        </span>
      </div>
    </CarteBoard>
  );
}

/* ─── 4 · Actions en retard (hors défaut — repris dans « À faire ») ── */

export function BlocActionsEnRetard({ bundle }: { bundle: DashboardBundle }) {
  const stats = bundle.statsRetardActions;
  const href = `/etablissements/${bundle.etablissementId}/actions`;

  return (
    <CarteBoard rayon={26} className="flex-row items-center gap-[18px] px-[26px] py-6">
      <div className="min-w-0 flex-1">
        <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--board-slate-soft)]">
          Actions en retard
        </p>
        <Link
          href={href}
          className="mt-3 block text-[19px] font-semibold leading-[1.2] tracking-[-0.025em] text-[color:var(--board-ink)] hover:underline"
        >
          {stats.plusAncienne
            ? stats.plusAncienne.libelle
            : "Aucune action dépassée"}
        </Link>
        <span className="mt-2.5 inline-block">
          {stats.nb > 0 ? (
            <Pastille ton="alerte">
              Retard moyen {stats.retardMoyenJours} jour
              {stats.retardMoyenJours > 1 ? "s" : ""}
            </Pastille>
          ) : (
            <Pastille>Plan d&apos;actions à jour</Pastille>
          )}
        </span>
      </div>
      <div
        className={
          "flex size-24 flex-none flex-col items-center justify-center rounded-[26px] " +
          (stats.nb > 0
            ? "bg-[color:var(--board-signal)]"
            : "bg-[color:var(--board-green)]")
        }
      >
        <span
          className={
            "text-[34px] font-semibold leading-none tracking-[-0.045em] " +
            (stats.nb > 0
              ? "text-[color:var(--board-signal-on)]"
              : "text-[color:var(--board-green-ink)]")
          }
        >
          {String(stats.nb).padStart(2, "0")}
        </span>
        <span
          className={
            "mt-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] " +
            (stats.nb > 0
              ? "text-[color:var(--board-signal-ink)]"
              : "text-[color:var(--board-green-ink)]")
          }
        >
          en retard
        </span>
      </div>
    </CarteBoard>
  );
}

/* ─── 5 · Où en est le plan d'actions ───────────────────────── */

export function BlocPlanActions({ bundle }: { bundle: DashboardBundle }) {
  const c = bundle.dashboard.compteurs;

  // Arcs disjoints : `actionsEnRetard` recoupe ouvertes + en cours (c'est
  // un filtre sur l'échéance, pas un statut), il ne peut donc pas être un
  // arc de plus sans fausser le total. Il est rendu en légende « dont ».
  const arcs = [
    {
      cle: "ouvertes",
      label: "Ouvertes",
      valeur: c.actionsOuvertes,
      couleur: "var(--board-blue-soft)",
    },
    {
      cle: "encours",
      label: "En cours",
      valeur: c.actionsEnCours,
      couleur: "var(--board-blue-strong)",
    },
    {
      cle: "levees",
      label: "Clôturées ce mois",
      valeur: c.actionsLeveesRecemment,
      couleur: "var(--board-green)",
    },
  ];

  const total = arcs.reduce((s, a) => s + a.valeur, 0);
  const ouvertes = c.actionsOuvertes + c.actionsEnCours;

  let curseur = 0;
  const stops = arcs
    .map((a) => {
      const debut = curseur;
      curseur += total > 0 ? (a.valeur / total) * 100 : 0;
      return `${a.couleur} ${debut}% ${curseur}%`;
    })
    .join(",");

  return (
    <CarteBoard className="px-7 py-[26px]">
      <TitreBloc
        famille="Suivi"
        titre="Où en est le plan d'actions"
        href={`/etablissements/${bundle.etablissementId}/actions`}
      />

      <div className="mt-6 flex items-center gap-[22px]">
        <div
          className="flex size-[126px] flex-none items-center justify-center rounded-full"
          style={{
            background:
              total > 0
                ? `conic-gradient(${stops})`
                : "var(--board-slate-line)",
          }}
        >
          <div className="flex size-[74px] flex-col items-center justify-center rounded-full bg-[color:var(--board-card)]">
            <span className="text-[24px] font-semibold leading-none tracking-[-0.04em] text-[color:var(--board-ink)]">
              {ouvertes}
            </span>
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[color:var(--board-blue-ink)]">
              ouvertes
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-[11px]">
          {arcs.map((a) => (
            <div
              key={a.cle}
              className="flex items-center gap-[9px] text-[13px] text-[color:var(--board-slate-ink)]"
            >
              <span
                className="size-[9px] rounded-[3px]"
                style={{ background: a.couleur }}
              />
              <span className="flex-1">{a.label}</span>
              <span
                className={
                  "font-semibold " +
                  (a.cle === "levees"
                    ? "text-[color:var(--board-green-ink-soft)]"
                    : "text-[color:var(--board-ink)]")
                }
              >
                {a.cle === "levees" && a.valeur > 0 ? "+" : ""}
                {a.valeur}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-[9px] text-[13px] text-[color:var(--board-slate-ink)]">
            <span className="size-[9px] rounded-[3px] bg-[color:var(--board-signal-mark)]" />
            <span className="flex-1">dont en retard</span>
            <span className="font-semibold text-[color:var(--board-ink)]">
              {c.actionsEnRetard}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-[22px] border-t border-[color:rgba(10,10,10,.10)] pt-[18px] text-[13px] leading-[1.5] text-[color:var(--board-slate-mid)]">
        {ouvertes === 0
          ? "Aucune action ouverte sur cet établissement."
          : c.actionsEnRetard === 0
            ? "Aucune action ne dépasse son échéance."
            : // Le possessif s'accorde avec les actions, pas avec l'échéance :
              // « 2 actions sur 5 dépassent LEUR échéance ». Il était figé au
              // singulier là où le verbe, lui, était déjà accordé — donc faux
              // dès la deuxième action en retard, et sur le premier écran du
              // produit.
              `${c.actionsEnRetard} action${c.actionsEnRetard > 1 ? "s" : ""} sur ${ouvertes} dépasse${c.actionsEnRetard > 1 ? "nt leur" : " son"} échéance.`}
      </p>
    </CarteBoard>
  );
}

/* ─── 6 · Ce qui a changé ───────────────────────────────────── */

const LIBELLE_RESULTAT: Record<string, string> = {
  conforme: "Conforme",
  observations_mineures: "Observations mineures",
  ecart_majeur: "Écart majeur",
  non_verifiable: "Non vérifiable",
};

export function BlocCeQuiAChange({ bundle }: { bundle: DashboardBundle }) {
  const { rapportsRecents, aujourdhui, etablissementId, dashboard } = bundle;

  // Ancienneté en jours civils : un rapport déposé ce matin est « du
  // jour » même s'il n'a pas encore 24 h, et un rapport d'hier soir reste
  // « d'hier » toute la journée.
  const quand = (d: Date) => libelleAnteriorite(d, aujourdhui).toUpperCase();

  // Le premier « à faire » du moteur de recos ferme la liste, comme la
  // ligne ambre du design.
  const aFaire = dashboard.recommandations[0];

  return (
    <CarteBoard className="px-7 py-[26px]">
      <TitreBloc
        famille="Preuve"
        titre="Ce qui a changé"
        sousTitre="Les derniers mouvements sur votre dossier."
        href={`/etablissements/${etablissementId}/registre`}
      />

      <div className="mt-5 flex flex-col gap-2">
        {rapportsRecents.length === 0 && !aFaire ? (
          <p className="text-[13.5px] text-[color:var(--board-slate-mid)]">
            Rien de neuf sur les derniers jours.
          </p>
        ) : null}

        {rapportsRecents.slice(0, 3).map((r, i) => (
          <LienProvenance
            key={r.id}
            href={`/etablissements/${etablissementId}/verifications/${r.verificationId}`}
            className={
              "flex items-center gap-3 rounded-full px-4 py-[13px] transition-colors hover:bg-[color:var(--board-blue-pale)] " +
              // Le plus récent est mis en avant, comme dans le design.
              (i === 0
                ? "bg-[color:var(--board-blue-pale)]"
                : "bg-[color:var(--board-slate-pale)]")
            }
          >
            <span
              className={
                "flex size-[22px] flex-none items-center justify-center rounded-full text-[11px] " +
                (r.resultat === "ecart_majeur"
                  ? "bg-[color:var(--board-signal-mark)] font-semibold text-[color:var(--board-signal-ink)]"
                  : "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]")
              }
            >
              {r.resultat === "ecart_majeur" ? "!" : "✓"}
            </span>
            <span className="flex-1 text-[13.5px] font-medium leading-[1.35] text-[color:var(--board-ink)]">
              {r.verification.libelleObligation} —{" "}
              {LIBELLE_RESULTAT[r.resultat] ?? r.resultat}
            </span>
            <span className="flex-none text-[11.5px] font-semibold text-[color:var(--board-slate-soft)]">
              {quand(r.dateRapport)}
            </span>
          </LienProvenance>
        ))}

        {aFaire ? (
          <LienProvenance
            href={aFaire.href}
            className="flex items-center gap-3 rounded-full border border-[color:var(--board-signal-line)] bg-[color:var(--board-signal-pale)] px-4 py-[13px] transition-opacity hover:opacity-85"
          >
            <span className="flex size-[22px] flex-none items-center justify-center rounded-full bg-[color:var(--board-signal-mark)] text-[11px] font-semibold text-[color:var(--board-signal-ink)]">
              !
            </span>
            <span className="flex-1 text-[13.5px] font-medium leading-[1.35] text-[color:var(--board-ink)]">
              {aFaire.titre}
            </span>
            <span className="flex-none text-[11.5px] font-semibold text-[color:var(--board-signal-ink)]">
              À FAIRE
            </span>
          </LienProvenance>
        ) : null}
      </div>
    </CarteBoard>
  );
}

/* ─── 7 · Vos documents, en un coup d'œil ───────────────────── */

function Rond({ etat }: { etat: EtatCellule }) {
  if (etat === "na") {
    return (
      <span
        title="Sans objet pour cette ligne"
        className="flex size-6 items-center justify-center text-[color:var(--board-slate-soft)]"
      >
        <span className="h-px w-2.5 bg-current" />
      </span>
    );
  }
  if (etat === "ok") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-[color:var(--board-green)] text-[12px] text-[color:var(--board-green-ink)]">
        ✓
      </span>
    );
  }
  return (
    <span
      title="Reste à faire"
      className="size-6 rounded-full bg-[color:var(--board-slate-line)]"
    />
  );
}

export function BlocDocuments({ bundle }: { bundle: DashboardBundle }) {
  const lignes = construireMatrice({
    etablissementId: bundle.etablissementId,
    duerp: bundle.dashboard.duerp,
    nbRapports: bundle.nbRapports,
    nbVerifs: bundle.nbVerifs,
    jourDernierRapport: bundle.jourDernierRapport,
    compteurs: bundle.dashboard.compteurs,
    modules: bundle.modulesMatrice,
  });
  const restes = compterRestes(lignes);

  return (
    <CarteBoard className="px-7 py-[26px]">
      <TitreBloc famille="Dossier" titre="Vos documents, en un coup d'œil" />

      <div className="mt-[22px] grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center gap-[7px]">
        <span className="rounded-full bg-[color:var(--board-blue-ink)] px-3.5 py-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-white">
          Document
        </span>
        {COLONNES_MATRICE.map((c) => (
          <span
            key={c}
            className="rounded-full bg-[color:var(--board-slate-pale)] px-2.5 py-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--board-slate-mid)]"
          >
            {c}
          </span>
        ))}

        {lignes.map((l) => (
          <Fragment key={l.id}>
            <Link
              href={l.href}
              className="rounded-full bg-[color:var(--board-blue-pale)] px-4 py-[11px] text-[13px] font-medium leading-[1.3] text-[color:var(--board-ink)] transition-opacity hover:opacity-80"
            >
              {l.libelle}
            </Link>
            {l.cellules.map((etat, i) => (
              <span key={i} className="flex justify-center">
                <Rond etat={etat} />
              </span>
            ))}
          </Fragment>
        ))}
      </div>

      <p className="mt-[18px] text-[13px] leading-[1.5] text-[color:var(--board-slate-mid)]">
        {restes === 0
          ? "Tout ce que l'outil sait mesurer est établi. Un tiret signale une colonne sans objet pour la ligne."
          : `Un rond vide n'est pas une faute : c'est ce qu'il reste à faire. ${restes} point${restes > 1 ? "s" : ""} ouvert${restes > 1 ? "s" : ""}.`}
      </p>
    </CarteBoard>
  );
}

/* ─── 8 · Préparer un contrôle ──────────────────────────────── */

export function BlocControle({ bundle }: { bundle: DashboardBundle }) {
  return (
    <CarteBoard ton="sombre" className="overflow-hidden">
      {/* Le bloc s'inverse : la hachure passe en blanc très bas, et le
          dossier devient la seule pièce claire — c'est lui qu'on tend à
          l'inspecteur. */}
      <div
        aria-hidden
        className="flex min-h-[240px] flex-1 items-center justify-center bg-[image:repeating-linear-gradient(135deg,rgba(255,255,255,.028)_0_10px,transparent_10px_20px)]"
      >
        <svg viewBox="0 0 160 110" className="w-[52%]" fill="none">
          <rect
            x="34"
            y="20"
            width="92"
            height="72"
            rx="10"
            fill="var(--board-blue-pale)"
          />
          <rect
            x="48"
            y="36"
            width="64"
            height="7"
            rx="3.5"
            fill="var(--board-blue-mid)"
          />
          <rect
            x="48"
            y="52"
            width="46"
            height="7"
            rx="3.5"
            fill="var(--board-blue-soft)"
          />
          <rect
            x="48"
            y="68"
            width="54"
            height="7"
            rx="3.5"
            fill="var(--board-blue-soft)"
          />
          <circle cx="118" cy="80" r="16" fill="var(--board-green)" />
          <path
            d="M111 80.5 116 85.5 125.5 75.5"
            stroke="var(--board-green-ink)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <Link
        href={`/etablissements/${bundle.etablissementId}/controle`}
        className="flex items-center gap-3.5 px-6 py-5 transition-colors hover:bg-white/[.06]"
      >
        <div className="min-w-0">
          <p className="m-0 text-[16px] font-semibold tracking-[-0.02em] text-white">
            Préparer un contrôle
          </p>
          <p className="mt-1 text-[13px] text-[color:var(--board-slate)]">
            Rassemblez vos pièces avant la visite d&apos;un inspecteur.
          </p>
        </div>
        {/* Le bouton s'inverse avec la carte : c'est la même touche que
            partout ailleurs, lue à l'envers. */}
        <span className="ml-auto flex size-[38px] flex-none items-center justify-center rounded-full bg-white text-[color:var(--board-ink)]">
          <ArrowUpRight className="size-4" />
        </span>
      </Link>
    </CarteBoard>
  );
}
