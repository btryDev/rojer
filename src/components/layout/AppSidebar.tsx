"use client";

// Double sidebar persistante pour le shell d'app.
//
// Deux niveaux accolés, tous deux sur l'encre (#0A0A0A) du design Rojer :
//
//   1. Le rail (88px) porte la marque en tête, puis les entrées de premier
//      niveau — « À faire », « Opérations », « Mon établissement », « Mes
//      registres », et « Paramètres » pour fermer la marche. Icône + libellé,
//      pastille signal quand la catégorie contient une alerte.
//
//      Le compte n'y est plus : il vit dans la barre haute (`BarreCompte`).
//      La sidebar porte la hiérarchie du **produit**, la barre haute les
//      utilitaires de **session**.
//
//      La marque est le retour au tableau de bord — un logo ramène à
//      l'accueil, c'est le seul geste de navigation que tout le monde
//      connaît déjà. Le résumé du dossier n'a donc plus d'entrée de rail :
//      il n'est pas une des questions du dirigeant, il y répond toutes.
//
//   2. Le panneau (256px) affiche les items de la catégorie choisie, avec
//      les mêmes pilules qu'avant (actif = pilule blanche pleine).
//
//      Il en faisait 224 et ses entrées se mangeaient elles-mêmes :
//      « Permis de f… », « Plans de pr… », « Carnet sani… ». Deux causes qui
//      s'additionnaient — l'étiquette d'état (« au besoin ») prenait sa place
//      sur la même ligne que le libellé, et la ligne était trop courte même
//      sans elle (« Ce que Rojer ne couvr… »). L'étiquette est donc passée
//      SOUS le libellé, comme la seconde information d'un tableau board, et
//      le libellé se replie au lieu de se couper : un libellé replié se lit,
//      un libellé coupé se devine.
//
// ~~Toute entrée de rail est un lien (ADR-015) : cliquer navigue vers la page
// d'entrée de la catégorie **et** ouvre son panneau.~~ ~~Le panneau suit la
// page courante : à chaque navigation il se rabat sur la catégorie de l'item
// actif.~~ [2026-10-28, ADR-030 amendée, décision de la propriétaire : une
// entrée de rail est un bouton qui ouvre le panneau de sa catégorie sans
// naviguer — c'est l'entrée choisie dans le panneau qui mène à une page —,
// et un second clic le referme. Le panneau est replié à l'arrivée sur chaque
// page, et toute navigation le replie.] La tuile de la page courante reste
// allumée, celle du panneau ouvert aussi : « la page est ici » n'est pas
// « le panneau montre ceci ».
//
// ~~Le panneau est rétractable, et replié par défaut : un bouton en pied de
// rail — ou un clic sur une entrée du rail — le déplie, un bouton dans son
// en-tête le replie. Le choix est mémorisé dans localStorage.~~ [2026-10-28 :
// rien n'est plus mémorisé, et le bouton du pied de rail est retiré — un
// panneau resté ouvert d'une visite à l'autre mangeait la largeur des petits
// écrans, et tout le monde n'a pas le réflexe de le refermer. Le bouton de
// son en-tête, ou un second clic sur le rail, le replie.]
//
// L'arborescence vit dans `sidebar-nav.ts` (module pur, testé) : mêmes
// items, mêmes badges que le rail simple qu'elle remplace. Ce fichier ne
// fait que le rendu.

import { Fragment, useState } from "react";
import Link from "next/link";
import { DemandeAide } from "@/components/assistance/DemandeAide";
import { usePathname, useSearchParams } from "next/navigation";
import { PanelLeftClose } from "lucide-react";
import {
  categorieDeItem,
  construireRail,
  deduireActif,
  LABEL_ITEM,
  type NavItem,
  type RailCategorie,
  type RailCategorieId,
  type SidebarActive,
  type SidebarCounts,
  type SidebarItemId,
  type SidebarModules,
} from "./sidebar-nav";
import { NavigationMobile } from "./NavigationMobile";

type Etablissement = {
  id: string;
  raisonDisplay: string;
  adresse: string;
  effectifSurSite: number;
  entrepriseId: string;
};

export function AppSidebar({
  etablissement,
  active,
  counts,
  modules,
  enAttente = false,
}: {
  etablissement: Etablissement;
  /** Item actif. Si omis, déduit automatiquement depuis `usePathname()`. */
  active?: SidebarActive;
  counts?: SidebarCounts;
  /** État des registres pour cet établissement. Omis, aucun n'est qualifié. */
  modules?: SidebarModules;
  /** La barre de repli, le temps que ses pastilles arrivent
   *  (`SidebarAvecPastilles`) : affichée mais inerte. Aucun panneau ne
   *  s'ouvre, donc rien n'est perdu ni ne se réordonne quand la barre
   *  complète la remplace. */
  enAttente?: boolean;
}) {
  const pathname = usePathname();
  // Le panneau ne dépend pas des filtres d'écran ; la query ne sert qu'à
  // détecter une navigation (un changement de filtre en est une).
  const searchParams = useSearchParams();
  const actif: SidebarItemId =
    active ?? deduireActif(pathname ?? "", etablissement.id);

  const rail = construireRail({
    etablissementId: etablissement.id,
    counts,
    modules,
  });

  const catActive = categorieDeItem(actif);
  // Le panneau ouvert : celui de la catégorie cliquée au rail, ou aucun. Il
  // se referme à chaque navigation — ajustement pendant le rendu (et non
  // dans un effet) pour ne pas provoquer de rendu en cascade. L'URL entière,
  // query comprise : passer de « Tout » à « Contrôles matériel » ne change
  // pas le pathname, mais c'est bien une navigation.
  const urlCourante = `${pathname}?${searchParams}`;
  const [ouverte, setOuverte] = useState<RailCategorieId | null>(null);
  const [derniereUrl, setDerniereUrl] = useState(urlCourante);
  if (urlCourante !== derniereUrl) {
    setDerniereUrl(urlCourante);
    setOuverte(null);
  }
  const panneau = rail.find((c) => c.id === ouverte) ?? null;

  // Trois largeurs (responsive, 2026-10-29) :
  //   - téléphone, sous 768 px : la barre latérale disparaît, la navigation
  //     passe en bas (`NavigationMobile`), même rail, même panneau en feuille ;
  //   - tablette, de 768 à 1023 px : le rail seul ; le panneau s'ouvre
  //     PAR-DESSUS la page, avec un voile, au lieu de la pousser ;
  //   - ordinateur : rien ne change, le panneau prend sa place à côté.
  return (
    <>
    <NavigationMobile
      etablissementId={etablissement.id}
      raisonDisplay={etablissement.raisonDisplay}
      rail={rail}
      catActive={catActive}
      ouverte={ouverte}
      surChoisir={setOuverte}
      enAttente={enAttente}
      rendreItem={(it) => <NavLink item={it} actif={actif} />}
    />
    {panneau ? (
      <div
        aria-hidden
        onClick={() => setOuverte(null)}
        className="fixed inset-0 z-30 hidden bg-[color:rgba(10,10,10,.28)] md:block lg:hidden"
      />
    ) : null}
    <aside
      className="relative z-40 hidden h-dvh bg-[color:var(--board-ink)] text-white md:flex"
      aria-label="Navigation principale"
      inert={enAttente}
      aria-busy={enAttente || undefined}
    >
      {/* ---- Rail : entrées de premier niveau ---- */}
      <div className="flex w-[88px] shrink-0 flex-col border-r border-white/10">
        {/* Marque : le nom en toutes lettres, et le retour au tableau de
            bord. Le panneau, lui, ne la répète plus — elle était affichée
            deux fois côte à côte. */}
        <div className="grid h-[67px] shrink-0 place-items-center border-b border-white/10">
          <Link
            href={`/etablissements/${etablissement.id}`}
            onClick={() => setOuverte(null)}
            aria-current={catActive === "tableau" ? "page" : undefined}
            aria-label={`${LABEL_ITEM.tableau} — Rojer`}
            className={
              "rounded-lg px-2 py-1 text-[17px] font-semibold leading-none tracking-[-0.025em] transition-colors hover:text-white " +
              (catActive === "tableau" ? "text-white" : "text-white/70")
            }
          >
            Rojer
          </Link>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
          {rail.map((c) => (
            <Fragment key={c.id}>
              {c.separateurAvant ? (
                <div className="mx-3 my-2 border-t border-white/10" />
              ) : null}
              <RailEntree
                cat={c}
                surPage={catActive === c.id}
                ouverte={ouverte === c.id}
                onClick={() => setOuverte(ouverte === c.id ? null : c.id)}
              />
            </Fragment>
          ))}
        </nav>

        {/* « Besoin d'aide ? », en permanence (décision du 2026-10-24). */}
        <div className="shrink-0 px-2 pb-2">
          <DemandeAide variante="rail" libelle="Aide" etablissementId={etablissement.id} />
        </div>

      </div>

      {/* ---- Panneau : items de la catégorie choisie ---- */}
      <div
        inert={!panneau}
        className={
          // Sur tablette, le panneau flotte à droite du rail (fond plein :
          // le voile de 4 % de blanc ne se lit que sur l'encre du rail).
          "shrink-0 overflow-hidden bg-white/[0.04] transition-[width] duration-200 " +
          "max-lg:absolute max-lg:inset-y-0 max-lg:left-[88px] max-lg:bg-[#1a1a1a] max-lg:shadow-[12px_0_32px_-16px_rgba(0,0,0,.5)] " +
          (panneau ? "w-[256px]" : "w-0")
        }
      >
        {/* Largeur fixe interne : le contenu glisse sous le bord au lieu de
            se recomposer pendant l'animation de largeur. */}
        <div className="flex h-full w-[256px] flex-col">
          <div className="flex h-[67px] shrink-0 items-center justify-end border-b border-white/10 pl-5 pr-3">
            <button
              type="button"
              onClick={() => setOuverte(null)}
              aria-label="Replier le panneau"
              aria-expanded
              className="grid size-8 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <PanelLeftClose aria-hidden className="size-4" />
            </button>
          </div>

          {panneau ? (
            <nav
              aria-label={panneau.label}
              className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4"
            >
              <p className="px-4 pb-2 pt-[18px] font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                {panneau.label}
              </p>
              {panneau.items.map((it) => (
                <NavLink key={it.id} item={it} actif={actif} />
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </aside>
    </>
  );
}

/**
 * Entrée de rail : un bouton qui ouvre le panneau de sa catégorie, sans
 * naviguer — c'est l'entrée choisie dans le panneau qui mène à une page
 * (2026-10-28, ADR-030 amendée). ~~Toujours un lien, panneau ou pas
 * (ADR-015).~~
 */
function RailEntree({
  cat,
  surPage,
  ouverte,
  onClick,
}: {
  cat: RailCategorie;
  /** La page courante appartient à cette catégorie. */
  surPage: boolean;
  /** Son panneau est celui qui est ouvert. */
  ouverte: boolean;
  onClick: () => void;
}) {
  const allume = surPage || ouverte;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={ouverte}
      // `aria-current` dit où l'on est ; l'ouverture d'un panneau, elle, est
      // dite par `aria-expanded`.
      aria-current={surPage ? "page" : undefined}
      // PAS d'`aria-label`. Il portait le libellé LONG (« Santé-sécurité »,
      // « Documentation ») alors que la tuile affiche le court (« Sécurité »,
      // « Documents ») : le nom accessible ne contenait pas le texte visible,
      // ce que WCAG 2.5.3 « Label in Name » interdit. Le libellé long reste
      // là où il y a la place de l'écrire : l'en-tête du panneau, qui nomme
      // aussi sa région (`aria-label={panneau.label}`).
      className="group flex w-full flex-col items-center gap-1.5 rounded-xl py-2 transition-colors hover:bg-white/10"
    >
      <TuileIcone cat={cat} pleine={allume} />
      <RailLibelle cat={cat} allume={allume} />
    </button>
  );
}

function TuileIcone({ cat, pleine }: { cat: RailCategorie; pleine: boolean }) {
  return (
    <span
      className={
        "relative grid size-9 place-items-center rounded-xl transition-colors " +
        (pleine
          ? "bg-white text-[color:var(--board-ink)]"
          : "text-white/60 group-hover:text-white")
      }
    >
      <cat.Icon aria-hidden className="size-[18px]" />
      {cat.alert ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[color:var(--board-signal-mark)] ring-2 ring-[color:var(--board-ink)]"
        />
      ) : null}
    </span>
  );
}

function RailLibelle({ cat, allume }: { cat: RailCategorie; allume: boolean }) {
  return (
    <span
      className={
        // `leading-[1.35]` et non `leading-none` : à 9 px, une boîte de ligne
        // haute de 9 px ne contient pas les accents. Comme `truncate` pose
        // `overflow: hidden`, ils étaient rognés — le rail affichait « A
        // faire » là où le lien et le panneau disent « À faire ». Le texte
        // était juste depuis le début (`labelCourt`), c'est le rendu qui
        // mangeait l'accent. Même cause exactement que les cartes de frise du
        // tableau de bord : une boîte trop courte, un `overflow` qui coupe.
        "max-w-full truncate px-0.5 text-[9px] leading-[1.35] tracking-[0.02em] " +
        (allume ? "text-white" : "text-white/50 group-hover:text-white")
      }
    >
      {cat.labelCourt}
    </span>
  );
}

const CLASSES_ITEM =
  "flex w-full items-center gap-3 rounded-full px-3.5 py-[10px] text-[13.5px] transition-colors";

/**
 * Étiquette d'un registre qui ne concerne pas (encore) l'établissement.
 *
 * « au besoin » plutôt que « à ouvrir » : l'entrée annonce une disponibilité,
 * elle ne réclame rien. Un dirigeant qui n'a pas de travaux par point chaud
 * n'a rien à faire de ce registre, et la sidebar ne doit pas lui inventer une
 * tâche — c'est le contraire de ce que promet « À faire ».
 */
const ETIQUETTE_ETAT: Record<string, string> = {
  "non-ouvert": "au besoin",
  "non-applicable": "non applicable",
};

function NavLink({ item, actif }: { item: NavItem; actif: SidebarItemId }) {
  const isActive = item.id === actif;
  // Un registre qualifié reste un lien : c'est par là qu'on l'ouvre le jour
  // venu, et la page « non applicable » explique et permet de corriger le
  // régime déclaré. Seule sa présentation s'efface.
  const etiquette =
    item.etat && item.etat !== "actif" ? ETIQUETTE_ETAT[item.etat] : null;

  // Destination pas encore implémentée : rendue inerte et étiquetée, pour
  // qu'elle ne se confonde pas visuellement avec un lien réel.
  if (item.bientot) {
    return (
      <span className={CLASSES_ITEM + " text-white/30"} aria-disabled>
        <item.Icon aria-hidden className="size-4 flex-none opacity-70" />
        <span className="min-w-0 flex-1 leading-[1.3]">{item.label}</span>
        <span className="flex-none font-mono text-[9px] uppercase tracking-[0.1em]">
          bientôt
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={
        CLASSES_ITEM + " " +
        (isActive
          ? "bg-white font-semibold text-[color:var(--board-ink)]"
          : etiquette
            ? "text-white/35 hover:bg-white/10 hover:text-white/70"
            : "text-white/60 hover:bg-white/10 hover:text-white")
      }
    >
      <item.Icon
        aria-hidden
        className={
          "size-4 flex-none " +
          (etiquette && !isActive ? "opacity-50" : "opacity-90")
        }
      />
      {/* Le libellé d'abord, son état DESSOUS. L'étiquette partageait la
          ligne et prenait 60 px des 148 disponibles : « Permis de f… ». Une
          seconde information se range sous la première (charte, patron de
          tableau dense), elle ne dispute pas sa largeur au nom de l'écran —
          c'est le nom qui sert à choisir, l'état ne fait que le qualifier. */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="leading-[1.3]">{item.label}</span>
        {etiquette && !isActive ? (
          <span className="mt-[3px] font-mono text-[9px] uppercase leading-none tracking-[0.1em] opacity-80">
            {etiquette}
          </span>
        ) : null}
      </span>
      {item.aMettreAJour ? (
        // Pastille NEUTRE et sans nombre : le compte serait faux, le
        // calendrier n'ayant pas été recalculé (2026-10-13). Le gabarit d'un
        // volume, jamais la couleur du signal.
        <span
          title={item.aMettreAJour}
          className={
            "flex-none rounded-full px-[7px] py-px font-mono text-[11px] " +
            (isActive
              ? "bg-[color:var(--board-ink)]/10 text-[color:var(--board-ink)]"
              : "bg-white/10 text-white/60")
          }
        >
          <span aria-hidden>…</span>
          <span className="sr-only">{item.aMettreAJour}</span>
        </span>
      ) : typeof item.count === "number" && item.count > 0 ? (
        <span
          className={
            "flex-none rounded-full px-[7px] py-px font-mono text-[11px] " +
            (isActive
              ? "bg-[color:var(--board-ink)]/10 text-[color:var(--board-ink)]"
              : item.alert
                ? "bg-[color:var(--board-signal)] text-[color:var(--board-signal-on)]"
                : "bg-white/10 text-white/60")
          }
        >
          {item.count}
        </span>
      ) : null}
    </Link>
  );
}
