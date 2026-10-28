"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Charte } from "./charte";
import { DansAide } from "./dans-aide";
import { LIVRE, LIVRE_REFERENCE } from "./livre";

/**
 * La source d'une obligation, derrière un livre (2026-10-28, uniformisation).
 *
 * Une seule forme pour tous les écrans : un livre et un mot (« Texte » par
 * défaut), qui déplie la référence, la citation et le lien vers Légifrance.
 * L'ancienne pastille « § ART. … ▾ » en capitales n'existe plus : elle
 * imposait la lecture du droit à chaque visite, alors que l'écran dit déjà la
 * règle en clair. La traçabilité reste à un clic, et le nom accessible garde
 * la référence complète.
 *
 * Plusieurs sources côte à côte se rangent sous UN livre (`Textes`) : quatre
 * « Texte » identiques sur une ligne ne se distinguaient pas.
 */

const PANNEAU: Record<Charte, string> = {
  papier:
    "rounded-lg border border-[color:var(--rule-soft)] bg-[color:var(--paper-elevated)] p-4 text-[0.8rem] leading-relaxed text-[color:var(--ink)] shadow-[0_1px_0_0_var(--rule-soft)]",
  // Bloc interne creux, rayon 18 : le livre se déplie presque toujours dans
  // une `carte-board` blanche, où un second fond blanc cerné d'un filet ne se
  // lit pas. Le creux ardoise est l'idiome du board pour « un cran en
  // dessous » (cf. `BlocCreux`).
  board:
    "rounded-[18px] bg-[color:var(--board-slate-pale)] px-5 py-4 text-[13px] leading-[1.6] text-[color:var(--board-slate-ink)]",
};

const CITATION: Record<Charte, string> = {
  papier:
    "border-l-2 border-[color:var(--warm)] pl-3 text-[color:var(--foreground)] italic",
  // Le filet de citation est une structure, pas une encre : c'est l'emploi de
  // `--board-slate`, qui ne tient pas 1,6:1 en texte mais fait une graduation.
  board:
    "border-l-2 border-[color:var(--board-slate)] pl-3.5 text-[color:var(--board-slate-ink)] italic",
};

const COMPLEMENT: Record<Charte, string> = {
  papier: "mt-3 text-[color:var(--muted-foreground)]",
  board: "mt-3 text-[color:var(--board-slate-mid)]",
};

const LIEN: Record<Charte, string> = {
  papier:
    "mt-3 inline-flex items-center gap-1 font-mono text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[color:var(--warm)] hover:underline",
  board:
    "mt-3 inline-flex items-center gap-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--board-blue-ink)] hover:underline",
};

// Le filet entre deux sources d'un même livre (`Textes`).
const DIVISEUR: Record<Charte, string> = {
  papier: "divide-y divide-[color:var(--rule-soft)]",
  board: "divide-y divide-[color:var(--board-slate-line)]",
};

type SocleLegalBadge = {
  /** Référence complète, ex. « Art. R. 4224-17 CT ». Imprimée en tête du
   *  panneau, et nom accessible du livre. */
  reference: string;
  className?: string;
  defaultOpen?: boolean;
  /** La grammaire visuelle de l'écran qui porte le livre. */
  charte?: Charte;
  /**
   * Ce qui se lit AVANT la citation, au dépli (2026-10-17, mention GN 10) :
   * une phrase qui dit pourquoi l'article est cité. Les `children` restent
   * après.
   */
  avant?: ReactNode;
  /**
   * Le mot du livre, « Texte » par défaut. Un article court quand il dit
   * mieux que « Texte » ce qu'on ouvre (« GN 10 », « R. 4624-10 »).
   */
  libelle?: string;
};

/**
 * Ce qu'un livre doit porter pour avoir le droit d'exister : au moins un lien,
 * une citation ou un complément. Sans aucun des trois, il ouvrirait un panneau
 * vide — un lien mort. Une référence sans adresse s'écrit en texte
 * (`ReferenceSansLien`). Le type l'impose : le défaut se fabrique à
 * l'écriture, un test n'y suffirait pas.
 */
type SourceLegalBadge =
  | { href: string; extrait?: string; children?: ReactNode }
  | { href?: string; extrait: string; children?: ReactNode }
  | { href?: string; extrait?: string; children: ReactNode };

export type LegalBadgeProps = SocleLegalBadge & SourceLegalBadge;

/** Dans un `Textes`, chaque source rend son contenu sous le livre commun. */
const DansTextes = createContext<Charte | null>(null);

/** Le contenu d'une source : référence, avant, citation, complément, lien. */
function ContenuSource({
  charte,
  reference,
  avant,
  extrait,
  children,
  href,
}: Pick<SocleLegalBadge, "reference" | "avant"> & {
  charte: Charte;
  extrait?: string;
  children?: ReactNode;
  href?: string;
}) {
  return (
    <>
      <p className={LIVRE_REFERENCE[charte]}>{reference}</p>
      {avant && <div className="mb-3">{avant}</div>}
      {extrait && (
        <blockquote className={cn("m-0", CITATION[charte])}>
          «&nbsp;{extrait}&nbsp;»
        </blockquote>
      )}
      {children && <div className={COMPLEMENT[charte]}>{children}</div>}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={LIEN[charte]}
        >
          Lire la source officielle →
          {/* Le lien ouvre un onglet : le lecteur d'écran l'entend (F4). */}
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
      )}
    </>
  );
}

/** Le bouton livre et son panneau, communs à `LegalBadge` et à `Textes`. */
function Livre({
  charte,
  libelle,
  nomAccessible,
  defaultOpen,
  className,
  children,
}: {
  charte: Charte;
  libelle: string;
  nomAccessible?: string;
  defaultOpen: boolean;
  className?: string;
  children: ReactNode;
}) {
  // Dans une aide d'écran, on est venu lire : le livre s'y présente ouvert.
  const dansAide = useContext(DansAide);
  const [open, setOpen] = useState(defaultOpen || dansAide);
  return (
    <div className={cn("inline-flex max-w-full flex-col gap-2 align-top", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn("self-start text-left", LIVRE[charte])}
        aria-expanded={open}
        aria-label={nomAccessible}
        title={nomAccessible}
      >
        <BookOpen aria-hidden className="size-3.5" />
        <span>{libelle}</span>
      </button>
      {open && <div className={PANNEAU[charte]}>{children}</div>}
    </div>
  );
}

export function LegalBadge(props: LegalBadgeProps) {
  const {
    reference,
    href,
    extrait,
    children,
    className,
    defaultOpen = false,
    charte = "board",
    avant,
    libelle = "Texte",
  } = props;
  const groupe = useContext(DansTextes);
  const contenu = (
    <ContenuSource
      charte={groupe ?? charte}
      reference={reference}
      avant={avant}
      extrait={extrait}
      href={href}
    >
      {children}
    </ContenuSource>
  );

  // Sous un livre commun : le contenu seul, séparé du précédent.
  if (groupe !== null) {
    return (
      <section className="py-4 first:pt-0 last:pb-0">
        {contenu}
      </section>
    );
  }

  return (
    <Livre
      charte={charte}
      libelle={libelle}
      // Le livre ne répète pas la référence quand il la dit déjà.
      nomAccessible={libelle === reference ? undefined : `${libelle} : ${reference}`}
      defaultOpen={defaultOpen}
      className={className}
    >
      {contenu}
    </Livre>
  );
}

/**
 * Plusieurs sources sous un seul livre. Les `LegalBadge` enfants n'affichent
 * plus de bouton : leur contenu se suit dans le panneau commun, séparé par un
 * filet. Remplace les rangées de pastilles.
 *
 * La présentation est celle du livre commun : `charte`, `className`,
 * `defaultOpen` et `libelle` d'un enfant n'ont pas d'effet ici.
 */
export function Textes({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Livre
      charte="board"
      libelle="Textes"
      nomAccessible="Textes : les articles cités"
      defaultOpen={false}
      className={className}
    >
      <DansTextes.Provider value="board">
        <div className={cn("flex flex-col", DIVISEUR.board)}>{children}</div>
      </DansTextes.Provider>
    </Livre>
  );
}

/**
 * Une référence qu'on ne peut pas ouvrir (pas d'adresse Légifrance) : en
 * texte simple, sans « § » ni capitales. Un livre sans rien dessous serait un
 * lien mort.
 */
export function ReferenceSansLien({ reference }: { reference: string }) {
  return (
    <span className="text-[12px] text-[color:var(--board-slate-soft)]">
      {reference}
    </span>
  );
}
