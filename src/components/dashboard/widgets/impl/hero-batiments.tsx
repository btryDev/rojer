"use client";

// Le bloc « lieu » du hero — l'identité de l'établissement et ses bâtiments.
//
// **Ce que ce bloc est, et n'est pas.** Une plaque unique : en tête l'enseigne
// (logo, nom, nombre de bâtiments), dessous un volume par bâtiment déclaré
// avec son nom, son parc et sa charge. C'est un **état**, pas une commande :
// rien ne s'y clique pour filtrer. Le filtre par bâtiment (ADR-019) reste
// piloté par le sélecteur posé sous le hero, qui porte son propre « Tout
// l'établissement » — une carte qui filtre sans porte de sortie visible est
// une impasse.
//
// **Une seule surface, pas une par bâtiment.** Les volumes partagent la
// plaque : ce sont les lieux d'un même établissement, pas des objets
// indépendants. Les encadrer un par un les mettrait en concurrence et
// empilerait des blancs avec les cartes de widgets du canvas.
//
// **Ce que le dessin dit, et ne dit pas.** L'application connaît l'activité
// déclarée (type ERP, code NAF) ; elle ne sait rien du bâti — ni hauteur, ni
// étages, ni forme. `Batiment` ne porte qu'un nom, un complément d'adresse et
// un rang. Les bâtiments d'un même établissement reçoivent donc le même
// dessin : ce qui varie d'un volume à l'autre est ce qu'on sait vraiment,
// c'est-à-dire le nom, le parc et la charge.

import Image from "next/image";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BatimentCharge } from "@/lib/batiments/queries";
import { etatCharge, libelleCharge } from "@/lib/batiments/etat-charge";
import { nomDeZone } from "@/lib/batiments/nom-zone";

type Props = {
  /** Le nom d'usage de l'établissement. L'adresse ne figure pas ici : elle
   *  est celle de l'établissement, et au-dessus d'une rangée de plusieurs
   *  bâtiments elle se lirait comme celle de l'un d'eux. */
  nomEtablissement: string;
  /** Le logo de l'entreprise, quand elle en a déposé un. `null` → monogramme.
   *  Cf. la note d'implémentation sous `Enseigne`. */
  logoUrl: string | null;
  batiments: BatimentCharge[];
  /** La planche à afficher — la même pour tous les bâtiments du lieu. */
  srcIllustration: string;
  /**
   * Ce que les pastilles comptent, et ce qu'elles laissent au relevé d'à côté.
   *
   * Elle arrive toute faite depuis le serveur (`DashboardBundle.perimetreHero`)
   * et non calculée ici : sa dérivation passe par le référentiel des
   * obligations, qui n'a rien à faire dans un composant client — et la plaque
   * n'a pas à savoir comment on obtient une phrase, seulement à la porter.
   */
  legende: string;
};

/** Au-delà de ce nombre, la rangée défile plutôt que de se comprimer :
 *  quatre volumes à la taille de trois ne se distinguent plus. */
const VISIBLES_SANS_DEFILEMENT = 3;

/**
 * La largeur en deçà de laquelle un volume cesse de se comprimer — et donc le
 * point où la rangée se met à défiler pour de bon.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LA DÉCOUPE DU 2026-09-03
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Avec trois zones, `taille` valait 184 px et le `<li>` portait `flex-none` :
 * la rangée mesurait 668 px de large dans une plaque qui n'en offrait que 577.
 * Le troisième volume était donc **tranché en plein glyphe** au bord arrondi —
 * « Terrasse et l… », « 0 équi… », « Sans… ».
 *
 * Ce n'était pas une pagination, c'était une découpe, et la distinction
 * commande le remède : une pagination montre un bout de la carte suivante pour
 * dire qu'il y en a d'autres — elle est délibérée, et elle laisse une carte
 * ENTIÈRE lisible. Ici les trois cartes tenaient dans le contrat annoncé par
 * le commentaire du calcul de `taille` (« sous le seuil, les volumes prennent
 * la place disponible »), mais le code leur imposait une largeur fixe. Le
 * commentaire disait vrai, le code disait autre chose.
 *
 * Sous le seuil, les volumes partagent donc réellement la largeur
 * (`flex: 1 1 0`), plafonnés à `taille` pour ne pas s'étirer quand la place
 * abonde, et planchés ici pour ne pas devenir illisibles quand elle manque.
 * En dessous de ce plancher — fenêtre très étroite —, la rangée déborde et le
 * défilement reprend son office, avec ses flèches : le débordement redevient
 * alors ce qu'il doit être, une pagination qu'on a choisie.
 */
const LARGEUR_PLANCHER = 116;

/**
 * Le monogramme de repli, quand aucun logo n'est déposé.
 *
 * Les initiales des deux premiers mots, ou les deux premières lettres d'un
 * mot unique. Dérivé du nom, donc jamais faux — là où une icône générique
 * de bâtiment aurait fait croire à un logo par défaut.
 */
export function monogramme(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "—";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

/* — L'enseigne : logo, nom, nombre de bâtiments. ─────────────────────
 *
 * NOTE D'IMPLÉMENTATION — le logo n'est pas encore persisté. `Entreprise`
 * n'a pas de colonne pour lui et aucun écran ne permet d'en déposer un ;
 * `logoUrl` vaut donc `null` partout aujourd'hui, et le monogramme s'affiche.
 * L'emplacement existe pour que le jour où le champ arrive, seule la valeur
 * change — pas la composition.
 */
function Enseigne({
  nom,
  logoUrl,
  nbBatiments,
}: {
  nom: string;
  logoUrl: string | null;
  nbBatiments: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {logoUrl != null ? (
        <Image
          src={logoUrl}
          alt=""
          aria-hidden
          width={88}
          height={88}
          className="size-11 flex-none rounded-[13px] object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-11 flex-none items-center justify-center rounded-[13px] bg-[color:var(--board-ink)] indent-[0.06em] font-mono text-[13px] font-medium leading-none tracking-[0.06em] text-white"
        >
          {monogramme(nom)}
        </span>
      )}

      <div className="min-w-0">
        <p className="m-0 truncate text-[17px] font-semibold tracking-[-0.02em] text-[color:var(--board-ink)]">
          {nom}
        </p>
        <p className="board-eyebrow m-0 mt-1 text-[color:var(--board-slate-soft)]">
          {nbBatiments} zone{nbBatiments > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

/**
 * La pastille de charge — trois états, jamais deux.
 *
 * La règle est dans `lib/batiments/etat-charge.ts`, avec la raison : une zone
 * sans équipement déclaré n'est ni à jour ni en retard, elle est **sans objet**,
 * et l'annoncer « à jour » était une affirmation fausse sur un écran de
 * conformité. Le composant ne rejuge rien, il rend l'état qu'on lui donne.
 */
function PastilleCharge({
  nbEquipements,
  nbEnRetard,
}: {
  nbEquipements: number;
  nbEnRetard: number;
}) {
  const etat = etatCharge({ nbEquipements, nbEnRetard });

  if (etat.nature === "sansObjet") {
    // Ardoise, et non le blanc de « À jour » : la pastille claire se lit comme
    // un feu vert au milieu des autres volumes. Ici il n'y a pas de feu — il
    // n'y a rien à quoi l'allumer.
    return (
      <span className="mt-2 inline-flex items-center rounded-full bg-[color:var(--board-slate-pale)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--board-slate-mid)]">
        {libelleCharge(etat)}
      </span>
    );
  }

  if (etat.nature === "aJour") {
    return (
      <span className="mt-2 inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--board-slate-ink)]">
        {libelleCharge(etat)}
      </span>
    );
  }

  return (
    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--board-signal-pale)] py-1 pl-1 pr-2.5 text-[11px] font-semibold text-[color:var(--board-signal-ink)]">
      {/* `--board-signal-on` et non `--board-signal-ink` : l'encre est faite
          pour le champ pâle, pas pour le rouge plein. À 9,5 px gras, elle
          tombait sous le seuil AA — et c'est le seul endroit de la pastille
          où le nombre se lit. */}
      <span className="flex size-4 items-center justify-center rounded-full bg-[color:var(--board-signal)] text-[9.5px] font-bold text-[color:var(--board-signal-on)]">
        {etat.nbEnRetard}
      </span>
      {libelleCharge(etat)}
    </span>
  );
}

/**
 * Le séparateur entre deux volumes — trait de cote, esprit dessin technique.
 *
 * Un filet d'un pixel borné en tête et en pied par une amorce
 * perpendiculaire, comme la ligne d'attache d'une cote sur un plan. Le trait
 * nu se lirait comme une séparation de tableau ; ce sont les deux amorces
 * qui le rattachent au vocabulaire du dessin.
 *
 * `aria-hidden` : il sépare à l'œil, la liste sépare déjà pour qui l'écoute.
 */
function TraitDeCote() {
  return (
    <li
      aria-hidden
      className="flex flex-none flex-col items-center self-stretch py-2"
    >
      <span className="h-px w-2.5 bg-[color:var(--board-slate)]" />
      <span className="w-px flex-1 bg-[color:var(--board-slate)]" />
      <span className="h-px w-2.5 bg-[color:var(--board-slate)]" />
    </li>
  );
}

function Volume({
  batiment,
  src,
  taille,
  souple,
}: {
  batiment: BatimentCharge;
  src: string;
  taille: number;
  /** Le volume partage la largeur disponible au lieu de l'imposer. Cf. la
   *  note sur `LARGEUR_PLANCHER` : c'est ce qui empêche la découpe. */
  souple: boolean;
}) {
  return (
    <li
      className={
        "flex snap-start flex-col items-center " +
        (souple ? "min-w-0" : "flex-none")
      }
      style={
        souple
          ? { flex: "1 1 0", minWidth: LARGEUR_PLANCHER, maxWidth: taille }
          : { width: taille }
      }
    >
      {/* Décoratif : tout ce que le dessin évoque est écrit sous lui. */}
      {/* `sizes` : sans lui, Next sert la variante correspondant à la
          largeur déclarée (760 px) alors que la planche est rendue entre
          156 et 232 px — et `priority` la met en préchargement bloquant,
          une fois par volume. La borne haute couvre le plus grand volume
          affiché, écrans à densité double compris. */}
      <Image
        src={src}
        alt=""
        aria-hidden
        width={760}
        height={668}
        sizes="232px"
        priority
        className="h-auto w-full select-none"
      />
      {/* Deux lignes plutôt qu'une, depuis que les volumes se partagent la
          largeur : « Terrasse et local technique » ne tenait pas sur une ligne
          de 150 px et s'abrégeait en « Terrasse et local techni… ». Le nom
          d'une zone est écrit par le dirigeant — l'abréger lui rend un mot
          qu'il n'a pas choisi. La hauteur, elle, est libre : rien ne suit sous
          la pastille.

          `min-h-[2lh]` réserve les deux lignes à TOUS les volumes, même à ceux
          dont le nom tient sur une : sans quoi le parc et la pastille du
          volume au nom long descendent d'un cran et la rangée cesse de se lire
          comme une rangée. */}
      <span className="mt-2 line-clamp-2 min-h-[2lh] w-full text-balance text-center text-[13px] font-semibold leading-[1.25] tracking-[-0.01em] text-[color:var(--board-ink)]">
        {nomDeZone(batiment.nom)}
      </span>
      <span className="mt-0.5 text-[11.5px] text-[color:var(--board-slate-mid)]">
        {batiment.nbEquipements} équipement
        {batiment.nbEquipements > 1 ? "s" : ""}
      </span>
      <PastilleCharge
        nbEquipements={batiment.nbEquipements}
        nbEnRetard={batiment.nbEnRetard}
      />
    </li>
  );
}

/** Une flèche de défilement — même objet que celles de la frise. */
function Fleche({
  sens,
  onClick,
  disabled,
}: {
  sens: "gauche" | "droite";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icone = sens === "gauche" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={
        sens === "gauche" ? "Zones précédentes" : "Zones suivantes"
      }
      className={
        "flex size-8 flex-none items-center justify-center rounded-full border border-[color:rgba(10,10,10,.16)] text-[color:var(--board-ink)] transition-opacity " +
        (disabled
          ? "pointer-events-none opacity-25"
          : "hover:bg-white/60 opacity-100")
      }
    >
      <Icone className="size-4" />
    </button>
  );
}

export function HeroBatiments({
  nomEtablissement,
  logoUrl,
  batiments,
  srcIllustration,
  legende,
}: Props) {
  const piste = useRef<HTMLUListElement>(null);
  const [bords, setBords] = useState({ gauche: false, droite: false });

  // Le défilement se déduit du débordement réel, pas du seul nombre de
  // bâtiments : à largeur réduite, trois volumes débordent déjà. Même
  // mécanique que la frise du calendrier.
  const mesurer = useCallback(() => {
    const el = piste.current;
    if (el == null) return;
    const max = el.scrollWidth - el.clientWidth;
    setBords({ gauche: el.scrollLeft > 4, droite: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    const el = piste.current;
    if (el == null) return;
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    el.addEventListener("scroll", mesurer, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", mesurer);
    };
  }, [mesurer, batiments.length]);

  const defiler = (sens: -1 | 1) => {
    const el = piste.current;
    if (el == null) return;
    el.scrollBy({ left: sens * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const defilable = bords.gauche || bords.droite;

  // Sous le seuil, les volumes prennent la place disponible ; au-delà, ils
  // gardent une taille fixe et la piste défile — les comprimer davantage
  // les rendrait indistincts.
  const souple = batiments.length <= VISIBLES_SANS_DEFILEMENT;
  const taille =
    batiments.length > VISIBLES_SANS_DEFILEMENT
      ? 156
      : batiments.length > 1
        ? 184
        : 232;

  return (
    // Verre givré, en une seule plaque. Le dégradé du haut vers le bas donne
    // le galbe — un givre n'a jamais une épaisseur constante ; le flou est
    // désaturé parce qu'un givre disperse la lumière au lieu de l'aviver ; et
    // les deux reflets intérieurs font lire une épaisseur, sans quoi un fond
    // translucide n'est qu'un voile.
    //
    // Réserve connue : le ciel du hero est un aplat uni, et `backdrop-filter`
    // n'a rien à y flouter. Ce qui porte l'effet est donc la translucidité,
    // le dégradé et les arêtes — pas le flou.
    <div className="mx-auto w-fit max-w-full rounded-[34px] border border-white/65 bg-gradient-to-b from-white/62 to-white/34 px-6 pb-8 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,.95),inset_0_-1px_0_rgba(255,255,255,.42),0_22px_48px_-26px_rgba(13,18,36,.30)] backdrop-blur-[26px] backdrop-saturate-[125%]">
      <div className="flex items-center gap-4">
        <Enseigne
          nom={nomEtablissement}
          logoUrl={logoUrl}
          nbBatiments={batiments.length}
        />

        {/* Les flèches n'apparaissent que si la piste déborde vraiment. */}
        {defilable ? (
          <div className="ml-auto flex flex-none items-center gap-1.5">
            <Fleche
              sens="gauche"
              onClick={() => defiler(-1)}
              disabled={!bords.gauche}
            />
            <Fleche
              sens="droite"
              onClick={() => defiler(1)}
              disabled={!bords.droite}
            />
          </div>
        ) : null}
      </div>

      <ul
        ref={piste}
        className={
          "m-0 mt-5 flex list-none snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
          // Centré tant que tout tient ; aligné à gauche dès qu'on défile,
          // sinon la première vignette démarre hors champ.
          (defilable ? "justify-start" : "justify-center")
        }
      >
        {batiments.map((b, i) => (
          <Fragment key={b.id}>
            {i > 0 ? <TraitDeCote /> : null}
            <Volume
              batiment={b}
              src={srcIllustration}
              taille={taille}
              souple={souple}
            />
          </Fragment>
        ))}
      </ul>

      {/* Ce que les pastilles comptent — et ce qu'elles ne comptent pas.
          Sans elle, la plaque annonçait « 5 à traiter » toutes zones
          confondues à un empan du relevé « Dépassées » qui en annonçait onze,
          et rien nulle part ne disait pourquoi. Deux nombres justes qui se
          contredisent à l'œil font douter des deux. */}
      <p className="m-0 mt-5 max-w-[46ch] text-[11.5px] leading-[1.5] text-[color:var(--board-slate-ink)]">
        {legende}
      </p>
    </div>
  );
}
