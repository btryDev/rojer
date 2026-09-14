"use client";

// L'année du calendrier : une barre de réglage collante, la règle graduée
// posée sur le canvas, puis la liste — par mois ou par équipement. Le
// titre de la page vit au-dessus, dans sa bande pleine largeur ; ici ne
// restent que l'instrument et son contenu.
//
// La lecture choisie (mois ou équipement) vit dans l'URL, écrite d'un
// `history.replaceState` sans repasser serveur : le sélecteur de la barre
// de réglage (`SelecteurLecture`) l'écrit, ce composant la lit par
// `useSearchParams` et bascule ses blocs d'un `display: none` — les deux
// listes viennent du même calcul, elles sont rendues ensemble. Un lien
// partagé ouvre donc la bonne lecture, et les deux composants restent
// d'accord sans se connaître.
//
// L'état proprement local : le mois déplié (viser une graduation doit
// ouvrir la carte correspondante), l'année affichée, le pli des mois
// passés. Les deux listes restent montées : revenir d'une lecture à
// l'autre retrouve les cartes qu'on avait ouvertes.
//
// Le contenu, lui, est rendu côté serveur et descend ici en `ReactNode`.

import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  RegleAnnuelle,
  sansDateDeLAnnee,
  totalDuMois,
  type MoisRegle,
} from "./RegleAnnuelle";
import {
  libelleMoisPrecedents,
  libelleTotalAnnee,
} from "@/lib/calendrier/labels";
import { SectionMois } from "./SectionMois";
import { ecrireLecture, lectureDesParams } from "./SelecteurLecture";

export type SectionMoisData = {
  /** Clé `AAAA-MM`, partagée avec la règle. */
  cle: string;
  titre: string;
  nb: number;
  nbEnRetard: number;
  /** Lignes du mois qu'aucune barre ne place (`datable`). */
  nbSansDate: number;
  contenu: React.ReactNode;
};

/** Une année de la règle : douze mois, présents ou vides. */
export type AnneeRegle = {
  annee: number;
  mois: MoisRegle[];
};

export type Lecture = "mois" | "equipement";

export function AnneeCalendrier({
  annee,
  anneesRegle,
  sections,
  moisInitial,
  cleMoisCourant,
  commandes,
  parEquipement,
}: {
  /** Année d'aujourd'hui — celle que la règle affiche à l'arrivée. */
  annee: number;
  /** La règle de chaque année couverte par le dossier, triées. */
  anneesRegle: AnneeRegle[];
  sections: SectionMoisData[];
  /** Mois déplié au chargement — le premier qui porte quelque chose. */
  moisInitial: string | null;
  /** Clé `AAAA-MM` du mois d'aujourd'hui — la charnière de la liste. */
  cleMoisCourant: string;
  /**
   * Bascule de lecture, filtres, aide — le bout droit de la barre de
   * réglage. Ils règlent ce que les deux lectures montrent, donc ils
   * n'appartiennent à aucune ; ils voyagent avec la barre collante pour
   * rester atteignables depuis n'importe quel point de la liste.
   */
  commandes?: React.ReactNode;
  /** La même année, groupée par appareil. */
  parEquipement?: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState<string | null>(moisInitial);
  // La lecture appartient à l'URL — le sélecteur de la barre l'écrit,
  // `useSearchParams` nous réveille quand elle change.
  const lecture = lectureDesParams(useSearchParams());
  const barreRef = useRef<HTMLDivElement | null>(null);
  const titreId = useId();

  // « Collée » : la barre a atteint le haut du défilement et la liste
  // passe dessous — c'est là qu'elle prend son verre. Le sentinelle est un
  // point de mesure posé juste au-dessus du sticky : tant qu'il est
  // visible, la barre est encore à sa place dans le flux.
  const sentinelle = useRef<HTMLDivElement | null>(null);
  const [collee, setCollee] = useState(false);
  useEffect(() => {
    const el = sentinelle.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setCollee(!e.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  // L'année affichée — par la règle ET par les cartes : la règle est
  // l'index de la liste, les deux tournent leurs pages ensemble. À
  // l'arrivée, c'est l'année du mois servi d'office (une dette de
  // décembre dernier ouvre la page sur son année, pas sur un présent
  // vide).
  const [anneeRegle, setAnneeRegle] = useState(() =>
    moisInitial ? Number(moisInitial.slice(0, 4)) : annee,
  );

  // Sur l'année en cours, la liste s'ouvre sur aujourd'hui : les mois
  // déjà passés restent pliés derrière leur couture — présents, comptés,
  // mais pas déroulés d'office. Les autres années se montrent entières :
  // on y est venu exprès. Si le mois servi à l'arrivée vit dans le pli,
  // le pli naît ouvert.
  // Les années révolues restent pliées à l'arrivée : leur couture porte le
  // compte de retards, ce qui suffit à ne rien taire, et les déplier
  // d'office repousserait l'année en cours sous une dette ancienne.
  const [voirAnterieurs, setVoirAnterieurs] = useState(false);

  const [voirPasses, setVoirPasses] = useState(
    () =>
      moisInitial !== null &&
      moisInitial < cleMoisCourant &&
      moisInitial.slice(0, 4) === String(annee),
  );

  const idxRegle = Math.max(
    0,
    anneesRegle.findIndex((a) => a.annee === anneeRegle),
  );
  const regle = anneesRegle[idxRegle];

  // Les douze mois de l'année affichée, cartes et creux mêlés : un mois
  // sans échéance se dit d'un mot au lieu de disparaître — l'année se lit
  // entière, sans trou muet entre deux cartes.
  const sectionsParCle = new Map(sections.map((s) => [s.cle, s]));
  const surAnneeCourante = regle.annee === annee;
  const moisPasses = surAnneeCourante
    ? regle.mois.filter((m) => m.cle < cleMoisCourant)
    : [];
  const moisAffiches = surAnneeCourante
    ? regle.mois.filter((m) => m.cle >= cleMoisCourant)
    : regle.mois;
  const elementsPasses = elementsDuSegment(moisPasses, sectionsParCle);
  const elementsAffiches = elementsDuSegment(moisAffiches, sectionsParCle);

  // ── Les retards des années précédentes ──────────────────────────────
  //
  // Une échéance dépassée en 2024 est en retard AUJOURD'HUI : « en retard »
  // est un état relatif au présent, pas à l'année où la ligne est rangée.
  // La liste, elle, ne montre qu'une année — et une dette d'une année
  // révolue ne se voyait donc nulle part sur la page ouverte à l'arrivée,
  // pendant que le tableau de bord la comptait. Deux compteurs voisins qui
  // se contredisent, ce que l'ADR-015 existe pour empêcher.
  //
  // On ne déplace pas la ligne dans l'année courante : sa date est sa date,
  // et la porter à un autre mois ferait mentir le calendrier dans l'autre
  // sens. On applique la règle que la couture des mois passés applique déjà
  // un cran plus bas — **plier n'est pas cacher, à condition que le pli
  // porte son compte de retards**. Une seconde couture, au-dessus de la
  // première, ouvre sur les mois des années révolues qui ont du retard.
  //
  // Seuls les mois EN RETARD y entrent : une échéance faite en 2024 est
  // rangée, elle n'a rien à faire en tête de 2026.
  const moisAnterieursEnRetard = surAnneeCourante
    ? moisEnRetardAvant(anneesRegle, annee)
    : [];
  const elementsAnterieurs = elementsDuSegment(
    moisAnterieursEnRetard,
    sectionsParCle,
  );
  const nbCartesAnterieures = elementsAnterieurs.reduce(
    (n, e) => n + (e.type === "carte" ? 1 : 0),
    0,
  );
  const nbRetardsAnterieurs = moisAnterieursEnRetard.reduce(
    (n, m) => n + m.enRetard + (m.retardSansDate ?? 0),
    0,
  );
  // La pastille « sans date » : l'année FEUILLETÉE, comme le total daté
  // voisin — et, sur l'année en cours, les retards sans date des années
  // passées, que la couture ci-dessus remonte sur cette page et que l'anneau
  // du tableau de bord compte aussi dans l'année en cours (relecture
  // système, 2026-09-14). Une seule règle pour la même ligne.
  const sansDate =
    sansDateDeLAnnee(regle.mois) +
    moisAnterieursEnRetard.reduce((n, m) => n + (m.retardSansDate ?? 0), 0);
  const nbCartesPassees = elementsPasses.reduce(
    (n, e) => n + (e.type === "carte" ? 1 : 0),
    0,
  );
  const nbRetardsPasses = elementsPasses.reduce(
    (n, e) => n + (e.type === "carte" ? e.section.nbEnRetard : 0),
    0,
  );

  const viser = (cle: string) => {
    // Viser un mois depuis la lecture par équipement n'aurait pas de
    // cible : la règle est l'index de l'année, elle ramène donc à la
    // liste mensuelle.
    ecrireLecture("mois");
    // La cible peut dormir dans le pli des mois passés : viser l'ouvre —
    // l'instrument ne pointe jamais une carte que la liste refuse de
    // montrer.
    setAnneeRegle(Number(cle.slice(0, 4)));
    if (cle < cleMoisCourant && cle.slice(0, 4) === String(annee)) {
      setVoirPasses(true);
    }
    setOuvert(cle);
    // Le défilement attend la peinture : la carte grandit en s'ouvrant,
    // et viser sa position d'avant la ferait manquer la cible.
    requestAnimationFrame(() => {
      const cible = document.getElementById(ancreDuMois(cle));
      if (!cible) return;
      // La barre reste collée pendant le défilement : la carte visée doit
      // s'arrêter SOUS elle, pas dessous — la marge se mesure à chaque
      // visée, la hauteur de la barre bouge avec son contenu.
      const hBarre = barreRef.current?.offsetHeight ?? 0;
      cible.style.scrollMarginTop = `${hBarre + 20}px`;
      const doux = !window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
      cible.scrollIntoView({
        behavior: doux ? "smooth" : "auto",
        block: "start",
      });
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div ref={sentinelle} aria-hidden className="-mb-5 h-0" />

      {/* La barre de réglage — et elle seule reste collée. Les douze
          graduations, elles, s'en vont avec la page : coller l'instrument
          entier mangeait deux cents pixels de liste, et c'est le réglage
          qu'on veut sous la main, pas la mesure.

          Elle vit AU-DESSUS des deux lectures, pas dans l'une d'elles :
          filtrer depuis n'importe quelle date sans remonter est le but,
          et une barre rangée dans le bloc « par mois » disparaîtrait dès
          qu'on bascule sur « par équipement ». Son parent est la colonne
          qui porte toute la liste : elle survit jusqu'à la dernière
          carte. */}
      <div
        ref={barreRef}
        role="group"
        aria-labelledby={titreId}
        className="sticky top-0 z-20"
      >
        <BarreAnnee
          titreId={titreId}
          annee={regle.annee}
          total={regle.mois.reduce((n, m) => n + totalDuMois(m), 0)}
          sansDate={sansDate}
          collee={collee}
          /* Le cadran n'a de prise que sur la liste mensuelle : la lecture
             par équipement montre chaque appareil sur toutes ses années à
             la fois. Un cadran qui ne commanderait rien serait pire qu'une
             absence — on le retire de la barre plutôt que de le griser. */
          montrerCadran={lecture === "mois"}
          onAnneePrecedente={
            idxRegle > 0
              ? () => setAnneeRegle(anneesRegle[idxRegle - 1].annee)
              : undefined
          }
          onAnneeSuivante={
            idxRegle < anneesRegle.length - 1
              ? () => setAnneeRegle(anneesRegle[idxRegle + 1].annee)
              : undefined
          }
          commandes={commandes}
        />
      </div>

      {/* `hidden` plutôt qu'un démontage : la lecture inactive garde ses
          cartes ouvertes, et la bascule ne coûte rien. Les graduations
          vivent DANS le bloc de la lecture par mois — elles en sont
          l'index, et par équipement chaque carte porte déjà son année en
          réduction : la grande au-dessus ferait deux fois le même dessin.
          La marge haute négative soude la mesure à la barre. */}
      <div
        className={
          "-mt-5 flex flex-col gap-5 " + (lecture === "mois" ? "" : "hidden")
        }
      >
        <RegleAnnuelle
          mois={regle.mois}
          moisOuvert={ouvert}
          onChoisirMois={viser}
          sansDate={sansDate}
        />

        {/* Les années révolues d'abord : une dette de 2024 se lit avant les
            mois de l'année en cours, parce qu'elle est plus en retard
            qu'eux. Fermée d'office comme la couture des mois passés, mais
            son compte de retards est visible fermé — c'est ce qui empêche
            le pli d'enterrer la dette. */}
        {nbCartesAnterieures > 0 ? (
          <CoutureMois
            ouvert={voirAnterieurs}
            onToggle={() => setVoirAnterieurs((v) => !v)}
            libelle={
              voirAnterieurs
                ? "Replier les années précédentes"
                : "Voir les retards des années précédentes"
            }
            nbEnRetard={voirAnterieurs ? 0 : nbRetardsAnterieurs}
          />
        ) : null}
        {voirAnterieurs && nbCartesAnterieures > 0 ? (
          <ElementsMois
            elements={elementsAnterieurs}
            ouvert={ouvert}
            onToggle={setOuvert}
          />
        ) : null}

        {/* La couture des mois passés vit AU-DESSUS de son contenu : elle
            marque l'endroit où la liste a été pliée, et son compte de
            retards empêche le pli d'enterrer une dette. Elle n'existe que
            sur l'année en cours — et seulement si le passé a des cartes :
            plier du vide ne protège rien. */}
        {nbCartesPassees > 0 ? (
          <CoutureMois
            ouvert={voirPasses}
            onToggle={() => setVoirPasses((v) => !v)}
            libelle={
              voirPasses
                ? "Replier les mois précédents"
                : libelleMoisPrecedents(nbCartesPassees)
            }
            nbEnRetard={voirPasses ? 0 : nbRetardsPasses}
          />
        ) : null}
        {voirPasses && nbCartesPassees > 0 ? (
          <ElementsMois
            elements={elementsPasses}
            ouvert={ouvert}
            onToggle={setOuvert}
          />
        ) : null}

        <ElementsMois
          elements={elementsAffiches}
          ouvert={ouvert}
          onToggle={setOuvert}
        />
      </div>

      {parEquipement ? (
        <div className={lecture === "equipement" ? "" : "hidden"}>
          {parEquipement}
        </div>
      ) : null}
    </div>
  );
}

/**
 * LA BARRE DE RÉGLAGE — le cadran d'année à gauche, les commandes à
 * droite, un filet en bas. C'est elle qui reste collée en tête du
 * défilement.
 *
 * Le cadran a d'abord été une pastille d'encre centrée entre deux
 * flèches, seule au milieu d'une bande blanche : elle flottait, faute de
 * quoi que ce soit à quoi se tenir. Ancrée au bord gauche d'une barre qui
 * porte aussi la lecture et les filtres, elle cesse d'être un objet posé
 * et devient le début d'un instrument — on lit la barre de gauche à
 * droite : quelle année, puis quelle lecture, puis quel filtre.
 *
 * Le champ du millésime suit la pilule bleue de l'application — champ
 * pâle, encre bleue — et non un aplat sombre : le bleu foncé est une
 * encre dans ce dossier, il n'y remplit rien nulle part ailleurs.
 */
function BarreAnnee({
  annee,
  total,
  sansDate,
  collee,
  montrerCadran,
  onAnneePrecedente,
  onAnneeSuivante,
  commandes,
  titreId,
}: {
  annee: number;
  /** Échéances DATÉES de l'année affichée — sans lui, une année déserte
   *  ressemblerait à un bug. */
  total: number;
  /**
   * Lignes SANS ÉCHÉANCE CONNUE, en retard ou non, hors des barres par
   * construction : leur `datePrevue` est une date de génération, pas un
   * rendez-vous (`aUnRendezVous`).
   *
   * La pastille en a besoin pour ne pas mentir. Elle disait « aucune
   * échéance » dès que `total` valait zéro — ce qui était exact tant que
   * « à planifier » restait marginal. Sur un dossier neuf, c'est le SEUL
   * état peuplé : l'écran annonçait « 2026 · AUCUNE ÉCHÉANCE » au-dessus
   * d'un chip « 2 à planifier » et d'une carte de mois qui les listait.
   *
   * Les lignes ne rejoignent pas les barres pour autant — la raison de les
   * en écarter tient. C'est le TOTAL qui doit dire « aucune datée », pas
   * « aucune ».
   */
  sansDate: number;
  /** Vrai quand la barre a atteint le haut : elle passe en verre pour que
   *  la liste se devine dessous au lieu de disparaître sèchement. */
  collee: boolean;
  montrerCadran: boolean;
  /** `undefined` : plus rien dans cette direction, la flèche se grise. */
  onAnneePrecedente?: () => void;
  onAnneeSuivante?: () => void;
  commandes?: React.ReactNode;
  /** `id` du titre lecteur d'écran, pour nommer la région de l'instrument. */
  titreId: string;
}) {
  return (
    <div
      className={
        "-mx-[var(--board-gutter)] flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-[color:var(--board-slate-line)] px-[var(--board-gutter)] py-[13px] transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-out " +
        (collee
          ? "bg-[color:rgba(255,255,255,.82)] shadow-[0_14px_30px_-24px_rgba(13,18,36,.55)] backdrop-blur-xl backdrop-saturate-150"
          : "bg-[color:var(--board-card)]")
      }
    >
      {/* Le titre existe pour les lecteurs d'écran ; à l'œil, l'instrument
          se présente seul — sa clé de lecture (hauteur = volume, couleur =
          état) vit dans l'aide d'écran, avec le reste des explications. */}
      <h2 id={titreId} className="sr-only">
        L&apos;année d&apos;un bloc — {total} échéance{total > 1 ? "s" : ""}{" "}
        datée{total > 1 ? "s" : ""} en {annee}
        {sansDate > 0
          ? `, et ${sansDate} sans échéance connue`
          : ""}
      </h2>
      {montrerCadran ? (
        <div className="flex flex-none items-center gap-2">
          <FlecheAnnee
            direction="precedente"
            cible={annee - 1}
            onClick={onAnneePrecedente}
          />
          {/* Millésime et compte dans un même champ, posés sur la même
              ligne : empilés, la pilule devenait un bloc de 56 px de
              haut au milieu d'une barre — c'est ce qui le faisait flotter.
              Le compte voyage avec le millésime, il ne s'en détache pas. */}
          <p className="m-0 flex items-baseline gap-2.5 rounded-full bg-[color:var(--board-blue-pale)] px-[18px] py-[7px]">
            <span className="board-titre text-[19px] leading-none tabular-nums tracking-[-0.02em] text-[color:var(--board-blue-ink)]">
              {annee}
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.1em] text-[color:var(--board-blue-ink)]">
              {libelleTotalAnnee(total, sansDate)}
            </span>
          </p>
          <FlecheAnnee
            direction="suivante"
            cible={annee + 1}
            onClick={onAnneeSuivante}
          />
          <span
            aria-hidden
            className="ml-2 h-[18px] w-px flex-none bg-[color:rgba(13,18,36,.14)]"
          />
        </div>
      ) : null}
      {commandes}
    </div>
  );
}

/** Flèche du cadran d'année. Sans cible, elle se grise mais reste posée :
 *  le cadran garde sa symétrie et la limite de la course se voit. */
function FlecheAnnee({
  direction,
  cible,
  onClick,
}: {
  direction: "precedente" | "suivante";
  cible: number;
  onClick?: () => void;
}) {
  const Chevron = direction === "precedente" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={`Afficher l'année ${cible}`}
      className="flex size-8 flex-none items-center justify-center rounded-full border border-[color:rgba(10,10,10,.16)] text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-blue-pale)] hover:text-[color:var(--board-blue-ink)] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <Chevron className="size-4" />
    </button>
  );
}

/** Un cran de la liste : une carte-mois, ou un creux — un ou plusieurs
 *  mois consécutifs sans la moindre échéance, dits d'une seule ligne. */
type ElementMois =
  | { type: "carte"; section: SectionMoisData }
  | { type: "creux"; cle: string; de: string; a: string };

/**
 * Les mois des années **révolues** qui portent encore du retard.
 *
 * Extraite du composant pour être testable : la règle qu'elle porte est
 * une règle de vérité, pas de mise en page. « En retard » se dit du
 * présent — une échéance dépassée en 2024 l'est toujours aujourd'hui —,
 * alors que la liste ne montre qu'une année à la fois. Sans cette
 * remontée, une dette d'une année révolue n'apparaît nulle part sur la
 * page ouverte à l'arrivée, pendant que le tableau de bord la compte.
 *
 * Deux exclusions, et ce sont elles qui font la règle :
 *
 *   - **les années futures** n'entrent jamais : une échéance de 2029 n'est
 *     pas en retard, quoi qu'en dise un compteur mal calculé ;
 *   - **les mois sans retard** non plus : une vérification faite en 2024
 *     est rangée, elle n'a rien à faire en tête de l'année en cours.
 *
 * Rendre les mois plutôt qu'un simple compte permet de les déplier avec
 * leurs cartes, donc de montrer chaque ligne à SA date — on remonte
 * l'information, jamais la date.
 */
export function moisEnRetardAvant(
  anneesRegle: AnneeRegle[],
  annee: number,
): MoisRegle[] {
  return anneesRegle
    .filter((a) => a.annee < annee)
    .flatMap((a) => a.mois)
    .filter((m) => m.enRetard + (m.retardSansDate ?? 0) > 0);
}

/**
 * Mêle cartes et creux dans l'ordre des mois. Les mois vides consécutifs
 * fusionnent : « De septembre à novembre — aucune échéance » plutôt que
 * trois cartes creuses qui diluent celles qui comptent.
 */
function elementsDuSegment(
  mois: MoisRegle[],
  sectionsParCle: Map<string, SectionMoisData>,
): ElementMois[] {
  const out: ElementMois[] = [];
  for (const m of mois) {
    const section = sectionsParCle.get(m.cle);
    if (section) {
      out.push({ type: "carte", section });
      continue;
    }
    // Le nom du mois sans son millésime — le creux vit déjà sous le
    // cadran de l'année, la répéter serait du bruit.
    const nom = m.labelLong.split(" ")[0];
    const dernier = out[out.length - 1];
    if (dernier?.type === "creux") dernier.a = nom;
    else out.push({ type: "creux", cle: m.cle, de: nom, a: nom });
  }
  return out;
}

/** Le rendu d'un segment de l'année : les cartes se déplient, les creux
 *  se contentent d'exister. */
function ElementsMois({
  elements,
  ouvert,
  onToggle,
}: {
  elements: ElementMois[];
  ouvert: string | null;
  onToggle: (fn: (courant: string | null) => string | null) => void;
}) {
  return (
    <>
      {elements.map((e) =>
        e.type === "carte" ? (
          <SectionMoisControlee
            key={e.section.cle}
            data={e.section}
            ouvert={ouvert === e.section.cle}
            onToggle={() =>
              onToggle((courant) =>
                courant === e.section.cle ? null : e.section.cle,
              )
            }
          />
        ) : (
          <p
            key={e.cle}
            className="m-0 rounded-[22px] bg-[color:var(--board-slate-pale)] px-7 py-[15px] text-[13px] font-medium text-[color:var(--board-slate-mid)]"
          >
            {e.de === e.a ? (
              <span className="capitalize">{e.de}</span>
            ) : (
              <>
                De {e.de} à {e.a}
              </>
            )}
            {" — aucune échéance"}
          </p>
        ),
      )}
    </>
  );
}

/**
 * La couture d'un pli de la liste : un trait pointillé qui dit « la liste
 * continue ici, repliée ». Le motif du bord pointillé vient des cases
 * « rien à signaler » du board — quelque chose existe, mais ne réclame
 * rien. Le compte de retards, lui, réclame : il garde le rose même plié.
 */
function CoutureMois({
  ouvert,
  onToggle,
  libelle,
  nbEnRetard,
}: {
  ouvert: boolean;
  onToggle: () => void;
  libelle: string;
  /** Retards dormant sous le pli — 0 pour ne rien afficher. */
  nbEnRetard: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={ouvert}
      className="flex items-center justify-center gap-3 rounded-[22px] border border-dashed border-[color:rgba(13,18,36,.18)] px-6 py-[15px] text-[13px] font-semibold text-[color:var(--board-slate-ink)] transition-colors hover:border-solid hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]"
    >
      <ChevronDown
        className={
          "size-4 flex-none transition-transform " +
          (ouvert ? "rotate-180" : "")
        }
      />
      {libelle}
      {nbEnRetard > 0 ? (
        <span className="inline-block rounded-full bg-[color:var(--board-signal)] px-[13px] py-[6px] text-[12px] font-semibold text-[color:var(--board-signal-ink)]">
          {nbEnRetard} en retard
        </span>
      ) : null}
    </button>
  );
}

/** `id` HTML d'une carte-mois. Un seul endroit pour la forme de l'ancre. */
export function ancreDuMois(cle: string): string {
  return `mois-${cle}`;
}

function SectionMoisControlee({
  data,
  ouvert,
  onToggle,
}: {
  data: SectionMoisData;
  ouvert: boolean;
  onToggle: () => void;
}) {
  return (
    <SectionMois
      titre={data.titre}
      nb={data.nb}
      nbEnRetard={data.nbEnRetard}
      nbSansDate={data.nbSansDate}
      ouvert={ouvert}
      onToggle={onToggle}
      ancre={ancreDuMois(data.cle)}
    >
      {data.contenu}
    </SectionMois>
  );
}
