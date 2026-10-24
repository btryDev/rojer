"use client";

// Filtres du calendrier — un seul point d'entrée : le bouton « Filtres »
// ouvre un panneau à trois groupes explicites (type d'échéance, domaine
// des contrôles, urgence), et les filtres actifs restent visibles en
// chips retirables à côté du bouton.
//
// Les options sont de vrais inputs (radio, case à cocher) : cocher
// s'applique immédiatement, le panneau reste ouvert et l'on peut régler
// plusieurs filtres d'affilée. L'état filtré vit toujours dans l'URL —
// il se partage, se met en favori — mais la navigation passe par
// `router.replace` dans une transition : l'écran ne saute pas, et
// l'input coché est reflété tout de suite par un état optimiste pendant
// que le serveur recalcule les listes.

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, SlidersHorizontal, X } from "lucide-react";
import {
  LABEL_FAMILLE,
  LABEL_FAMILLE_LONG,
  MarqueurFamille,
} from "./MarqueurFamille";
import type { FamilleEcheance } from "@/lib/calendrier/echeances";
import { LABEL_TOUT_ETABLISSEMENT } from "@/lib/calendrier/labels";
import { nomDeZone } from "@/lib/batiments/nom-zone";

export type FiltresActifs = {
  famille?: FamilleEcheance;
  domaine?: string;
  urgent: boolean;
  /**
   * « Personnel et formations » (2026-10-24) : la famille `personnel` et les
   * formations d'établissement (`estFormation`).
   */
  formation?: boolean;
  /** Une zone (ADR-029) — n'existe qu'à partir de deux. */
  batiment?: string;
};

function construireHref(
  baseHref: string,
  filtres: {
    famille?: string;
    domaine?: string;
    urgent?: boolean;
    formation?: boolean;
    batiment?: string;
    /**
     * La lecture en cours (mois ou équipement). Elle n'est pas un filtre,
     * mais elle vit dans la même URL : sans la reconduire ici, régler un
     * filtre depuis la vue par équipement renvoyait à la vue par mois.
     */
    vue?: string | null;
    /**
     * L'année affichée (`?annee=`, audit Next.js M10) : comme la lecture,
     * elle vit dans l'URL ; sans la reconduire, régler un filtre depuis
     * 2027 renvoyait sur l'année par défaut.
     */
    annee?: string | null;
  },
): string {
  const p = new URLSearchParams();
  if (filtres.famille) p.set("famille", filtres.famille);
  if (filtres.domaine) p.set("domaine", filtres.domaine);
  if (filtres.urgent) p.set("urgent", "1");
  if (filtres.formation) p.set("formation", "1");
  if (filtres.batiment) p.set("batiment", filtres.batiment);
  if (filtres.vue) p.set("vue", filtres.vue);
  if (filtres.annee) p.set("annee", filtres.annee);
  const q = p.toString();
  return q ? `${baseHref}?${q}` : baseHref;
}

/** Puce d'input : cercle pour un radio, carré arrondi pour une case. */
function Puce({ actif, forme }: { actif: boolean; forme: "radio" | "case" }) {
  return (
    <span
      aria-hidden
      className={
        "flex size-4 flex-none items-center justify-center border transition-colors " +
        (forme === "radio" ? "rounded-full " : "rounded-[5px] ") +
        (actif
          ? "border-[color:var(--board-blue-ink)] "
          : "border-[color:rgba(10,10,10,.28)] ")
      }
    >
      {actif ? (
        <span
          className={
            "bg-[color:var(--board-blue-ink)] " +
            (forme === "radio"
              ? "size-2 rounded-full"
              : "size-2 rounded-[2px]")
          }
        />
      ) : null}
    </span>
  );
}

/**
 * Rangée d'option du panneau : un vrai input (radio ou case à cocher),
 * masqué mais focusable — les flèches naviguent dans un groupe de
 * radios, Espace coche — avec sa puce dessinée à gauche du libellé.
 */
function Option({
  forme,
  name,
  actif,
  onChoisir,
  icone,
  children,
}: {
  forme: "radio" | "case";
  /** Groupe HTML des radios — sans lui, pas de navigation aux flèches. */
  name?: string;
  actif: boolean;
  onChoisir: () => void;
  icone?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label
      className={
        "flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[color:var(--board-blue-ink)] " +
        (actif
          ? "bg-[color:var(--board-blue-pale)] font-semibold text-[color:var(--board-blue-ink)]"
          : "text-[color:var(--board-slate-ink)] hover:bg-[color:var(--board-slate-pale)]")
      }
    >
      <input
        type={forme === "radio" ? "radio" : "checkbox"}
        name={name}
        checked={actif}
        onChange={onChoisir}
        className="sr-only"
      />
      <Puce actif={actif} forme={forme} />
      {icone}
      <span className="flex-1">{children}</span>
    </label>
  );
}

function TitreGroupe({ children }: { children: React.ReactNode }) {
  return (
    <legend className="m-0 px-2.5 pb-1 pt-3 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--board-slate-soft)]">
      {children}
    </legend>
  );
}

/** Chip d'un filtre actif — toujours visible, retirable d'un clic. */
function Chip({
  onRetirer,
  ton = "neutre",
  icone,
  children,
}: {
  onRetirer: () => void;
  ton?: "neutre" | "alerte";
  icone?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onRetirer}
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-[6px] text-[11.5px] font-semibold transition-opacity hover:opacity-80 " +
        (ton === "alerte"
          ? "bg-[color:var(--board-signal)] text-[color:var(--board-signal-ink)]"
          : "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]")
      }
    >
      {icone}
      {children}
      <X className="size-3" />
    </button>
  );
}

export function FiltresCalendrier({
  baseHref,
  famillesDisponibles,
  domaines,
  batiments = [],
  filtres,
}: {
  baseHref: string;
  /** Familles ayant au moins une échéance — les seules proposées. */
  famillesDisponibles: FamilleEcheance[];
  domaines: { id: string; label: string }[];
  /** Le groupe « Zone » n'apparaît qu'à partir de deux (ADR-029). */
  batiments?: { id: string; nom: string }[];
  filtres: FiltresActifs;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [enCours, demarrerTransition] = useTransition();
  // Cocher doit se voir tout de suite : l'état optimiste tient la valeur
  // choisie pendant que le serveur recalcule, puis les props reprennent.
  const [optimistes, poserOptimistes] = useOptimistic(filtres);
  const [ouvert, setOuvert] = useState(false);
  const racine = useRef<HTMLDivElement | null>(null);

  // Fermeture au clic extérieur et à Échap — le panneau est le seul
  // état client, tout le reste vit dans l'URL.
  useEffect(() => {
    if (!ouvert) return;
    const surClic = (e: MouseEvent) => {
      if (racine.current && !racine.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    };
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", surClic);
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("mousedown", surClic);
      document.removeEventListener("keydown", surTouche);
    };
  }, [ouvert]);

  const f = optimistes;
  const multiBatiments = batiments.length > 1;
  const nbActifs =
    (f.famille ? 1 : 0) +
    (f.domaine ? 1 : 0) +
    (f.urgent ? 1 : 0) +
    (f.formation ? 1 : 0) +
    (f.batiment ? 1 : 0);

  const appliquer = (suivants: FiltresActifs) => {
    demarrerTransition(() => {
      poserOptimistes(suivants);
      router.replace(
        construireHref(baseHref, {
          ...suivants,
          // La lecture se lit dans l'URL courante, pas dans une prop : la
          // bascule mois/équipement la met à jour sans repasser serveur.
          vue: searchParams.get("vue"),
          annee: searchParams.get("annee"),
        }),
        { scroll: false },
      );
    });
  };

  // Les deux gestes ci-dessous repartent de `...f` : un filtre qu'on ne
  // touche pas se conserve. Énumérer les champs à la main faisait tomber le
  // bâtiment — cocher « Contrôles » depuis la Réserve renvoyait sans le dire
  // sur tout l'établissement, et la chip du lieu disparaissait de l'écran.
  const choisirFamille = (famille?: FamilleEcheance) =>
    appliquer({
      ...f,
      famille,
      // Un type d'échéance remplace « Personnel et formations » : même groupe.
      formation: false,
      // Quitter les contrôles lâche leur domaine.
      domaine: famille && famille !== "controle" ? undefined : f.domaine,
    });

  const choisirDomaine = (domaine?: string) =>
    appliquer({
      ...f,
      // Choisir un domaine recentre sur les contrôles : c'est leur
      // attribut, le panneau le montre en cochant les deux.
      famille: domaine ? "controle" : f.famille,
      domaine,
    });

  const labelDomaine = (id: string | undefined) =>
    domaines.find((d) => d.id === id)?.label ?? id;

  const choisirBatiment = (batiment?: string) => appliquer({ ...f, batiment });
  const nomBatiment = (id: string | undefined) => {
    const b = batiments.find((x) => x.id === id);
    return b ? nomDeZone(b.nom) : id;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div ref={racine} className="relative">
        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-haspopup="dialog"
          className={
            "inline-flex items-center gap-2 rounded-full border px-4 py-[9px] text-[12.5px] font-semibold transition-colors " +
            (ouvert
              ? "border-transparent bg-[color:var(--board-ink)] text-white"
              : "border-[color:rgba(10,10,10,.16)] bg-[color:var(--board-card)] text-[color:var(--board-ink)] hover:bg-[color:var(--board-blue-pale)]")
          }
        >
          {enCours ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <SlidersHorizontal className="size-3.5" />
          )}
          Filtres
          {nbActifs > 0 ? (
            <span
              className={
                "flex size-[18px] items-center justify-center rounded-full text-[10.5px] font-semibold tabular-nums " +
                (ouvert
                  ? "bg-white text-[color:var(--board-ink)]"
                  : "bg-[color:var(--board-ink)] text-white")
              }
            >
              {nbActifs}
            </span>
          ) : null}
        </button>

        {ouvert ? (
          <div
            role="dialog"
            aria-label="Filtres du calendrier"
            className="absolute left-0 top-full z-30 mt-2 w-[min(92vw,880px)] max-h-[80vh] overflow-y-auto rounded-[18px] bg-[color:var(--board-card)] p-2.5 shadow-[0_1px_2px_rgba(13,18,36,.06),0_18px_44px_-16px_rgba(13,18,36,.28)] ring-1 ring-[color:rgba(13,18,36,.08)]"
          >
            {/* À l'horizontale (2026-10-24, demande de la propriétaire) : trois
                colonnes dès l'écran moyen — type, domaine, le reste —, au lieu
                d'une colonne qu'il fallait faire défiler. */}
            <div className="grid gap-x-2 md:grid-cols-3">
            <div>
            <fieldset className="m-0 border-0 p-0">
              <TitreGroupe>Type d&apos;échéance</TitreGroupe>
              <Option
                forme="radio"
                name="filtre-famille"
                actif={!f.famille && !f.formation}
                onChoisir={() => choisirFamille(undefined)}
              >
                Tout le calendrier
              </Option>
              {/* `personnel` est absorbé par « Personnel et formations ». */}
              {famillesDisponibles.filter((fam) => fam !== "personnel").map((fam) => (
                <Option
                  key={fam}
                  forme="radio"
                  name="filtre-famille"
                  actif={f.famille === fam}
                  onChoisir={() => choisirFamille(fam)}
                  icone={<MarqueurFamille famille={fam} className="size-4" />}
                >
                  {LABEL_FAMILLE_LONG[fam]}
                </Option>
              ))}
              {/* « Personnel et formations » (2026-10-24) : les titres et
                  visites des salariés et les formations d'établissement, un
                  choix parmi les autres. Remplace « Titres du personnel ». */}
              <Option
                forme="radio"
                name="filtre-famille"
                actif={f.formation === true}
                onChoisir={() => appliquer({ ...f, famille: undefined, formation: true })}
                // Le marqueur de la famille qu'il absorbe : même dessin que
                // l'ancien « Titres du personnel ».
                icone={<MarqueurFamille famille="personnel" className="size-4" />}
              >
                Personnel et formations
              </Option>
            </fieldset>
            </div>
            <div>
            <fieldset className="m-0 border-0 p-0">
              <TitreGroupe>Domaine des contrôles</TitreGroupe>
              <Option
                forme="radio"
                name="filtre-domaine"
                actif={!f.domaine}
                onChoisir={() => choisirDomaine(undefined)}
              >
                Tous les domaines
              </Option>
              {domaines.map((d) => (
                <Option
                  key={d.id}
                  forme="radio"
                  name="filtre-domaine"
                  actif={f.domaine === d.id}
                  onChoisir={() => choisirDomaine(d.id)}
                >
                  {d.label}
                </Option>
              ))}
            </fieldset>
            </div>
            <div>

            {multiBatiments ? (
              <>
                <fieldset className="m-0 border-0 p-0">
                  <TitreGroupe>Zone</TitreGroupe>
                  <Option
                    forme="radio"
                    name="filtre-batiment"
                    actif={!f.batiment}
                    onChoisir={() => choisirBatiment(undefined)}
                  >
                    {LABEL_TOUT_ETABLISSEMENT}
                  </Option>
                  {batiments.map((b) => (
                    <Option
                      key={b.id}
                      forme="radio"
                      name="filtre-batiment"
                      actif={f.batiment === b.id}
                      onChoisir={() => choisirBatiment(b.id)}
                    >
                      {nomDeZone(b.nom)}
                    </Option>
                  ))}
                </fieldset>
              </>
            ) : null}

            {multiBatiments ? (
              <div className="mx-2.5 mt-2 border-t border-[color:rgba(10,10,10,.08)]" />
            ) : null}
            <fieldset className="m-0 border-0 p-0">
              <TitreGroupe>Urgence</TitreGroupe>
              <Option
                forme="case"
                actif={f.urgent}
                onChoisir={() => appliquer({ ...f, urgent: !f.urgent })}
              >
                En retard seulement
              </Option>
            </fieldset>


            </div>
            </div>

            {nbActifs > 0 ? (
              <>
                <div className="mx-2.5 mt-2 border-t border-[color:rgba(10,10,10,.08)]" />
                <button
                  type="button"
                  onClick={() => appliquer({ urgent: false })}
                  className="mt-1.5 flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px] font-semibold text-[color:var(--board-slate-mid)] transition-colors hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]"
                >
                  <X className="size-3.5" />
                  Tout effacer
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Les filtres actifs restent lisibles sans ouvrir le panneau. */}
      {f.famille ? (
        <Chip
          onRetirer={() => choisirFamille(undefined)}
          icone={<MarqueurFamille famille={f.famille} className="size-3" />}
        >
          {LABEL_FAMILLE[f.famille]}
        </Chip>
      ) : null}
      {f.domaine ? (
        <Chip onRetirer={() => choisirDomaine(undefined)}>
          {labelDomaine(f.domaine)}
        </Chip>
      ) : null}
      {f.urgent ? (
        <Chip
          onRetirer={() => appliquer({ ...f, urgent: false })}
          ton="alerte"
        >
          En retard seulement
        </Chip>
      ) : null}
      {f.formation ? (
        <Chip
          onRetirer={() => appliquer({ ...f, formation: false })}
          icone={<MarqueurFamille famille="personnel" className="size-3" />}
        >
          Personnel et formations
        </Chip>
      ) : null}
      {f.batiment ? (
        <Chip onRetirer={() => choisirBatiment(undefined)}>
          {nomBatiment(f.batiment)}
        </Chip>
      ) : null}
    </div>
  );
}
