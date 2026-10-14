// Le bandeau du parc — clair, pleine largeur, bord à bord.
//
// Il portait un aplat d'encre : le noir posait une troisième bande sombre
// dans un parcours qui en compte déjà deux (la barre latérale, la bande du
// calendrier), et le titre éditorial qu'il portait n'apprenait rien.
// Celui-ci a la même charge que la bande du calendrier — d'où l'on vient,
// où l'on est, une phrase, ce que l'écran propose — mais sur papier.
//
// Les trois chiffres ne comptent que le parc AFFICHÉ — c'est l'appelant
// qui les additionne, appareil par appareil, sur les cartes qu'il rend.
// Ils ne certifient rien, ce sont des faits datés.
//
// **Le filtre par bâtiment vit donc ici, dans la même bande qu'eux.** Il
// règle ce que le bandeau compte autant que ce que l'écran montre : « 12
// au parc » au-dessus de trois cartes serait un mensonge à la ligne près,
// et un en-tête ne doit jamais contredire ce qu'il coiffe. La légende sous
// le sélecteur dit à chaque fois sur quoi la rangée porte — un compteur
// dont le périmètre se règle d'un clic doit annoncer son périmètre.
//
// ── LA LÉGENDE A DEUX AXES, ET N'EN DISAIT QU'UN ────────────────────────
//
// Elle a longtemps tenu en un ternaire : « ne portent que sur cette zone » /
// « portent sur tout l'établissement ». L'intention était juste — un compteur
// réglable d'un clic doit dire son réglage — mais « tout l'établissement » y
// voulait dire « toutes les zones », et se lisait « toutes vos obligations ».
//
// Or ces chiffres ne comptent QUE ce que porte un équipement.
// `repartirParEquipement` saute les lignes sans `equipementId`, c'est-à-dire
// tout ce qui est dû au titre de l'établissement ou d'un salarié : sur les 145
// obligations du référentiel, 86 seulement naissent d'un appareil. L'écran
// avait raison de ne compter que le parc — c'est sa définition, pas son défaut ;
// ce qui était faux est ce qu'il en disait, et il l'affirmait là où les trois
// autres écrans se contentaient de diverger en silence.
//
// La légende dit donc désormais **ses deux axes** — la zone, et la restriction
// par porteur — et elle n'est plus écrite : elle est **dérivée** de ce que
// l'agrégation compte pour de bon (`legendeParc`, `porteursDuBandeauParc`).
// Personne ne peut plus écrire « tout » au-dessus d'un compteur qui compte une
// part, parce que personne n'écrit plus cette phrase.
//
// Et elle est rendue **même sans sélecteur de zone** : la restriction par
// porteur ne dépend pas du nombre de zones, un établissement mono-zone la subit
// à l'identique. Elle vivait dans la légende du sélecteur, donc elle
// disparaissait exactement chez ceux qui n'ont qu'un lieu.

import Link from "next/link";
import { FilAriane, type Crumb } from "@/components/navigation/FilAriane";
import { SelecteurBatiment } from "@/components/batiments/SelecteurBatiment";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHAMP_ETAT,
  ENCRE_ETAT,
  LIBELLE_ETAT,
  LIBELLE_ETAT_COURT,
} from "@/lib/calendrier/etats";
import { porteursDuBandeauParc } from "@/lib/equipements/etat-verifications";
import { legendeParc } from "@/lib/perimetre/porteurs-comptes";

function Compteur({
  nombre,
  legende,
  champ,
  encre,
}: {
  nombre: number;
  legende: string;
  champ: string;
  encre: string;
}) {
  return (
    <span
      className="inline-flex items-baseline gap-2 rounded-full px-4 py-[9px]"
      style={{ background: champ }}
    >
      <span className="board-titre text-[20px] leading-none tabular-nums">
        {nombre}
      </span>
      <span
        className="board-eyebrow text-[9.5px] tracking-[0.12em]"
        style={{ color: encre }}
      >
        {legende}
      </span>
    </span>
  );
}

export function BandeauParc({
  crumbs,
  hrefCalendrier,
  enRetard,
  proches,
  aPlanifier,
  total,
  hrefAjouter,
  suggestions,
  filtreBatiment,
}: {
  /** Où la page est rangée : l'établissement, puis l'entrée du rail. */
  crumbs: Crumb[];
  /** Où se lit ce que ces chiffres ne comptent pas. La légende y renvoie :
   *  nommer un manque sans dire où le trouver le laisse entier. */
  hrefCalendrier: string;
  enRetard: number;
  proches: number;
  /**
   * Vérifications sans date de rendez-vous. Ni un retard ni un engagement
   * daté — et c'est pour ça qu'il a son propre chiffre : fondu dans les
   * deux autres il aurait menti, absent il faisait pire. Un parc fraîchement
   * déclaré n'a par construction que des lignes à planifier : le bandeau
   * annonçait « 0 en retard · 0 sous 30 j » — un écran calme — au-dessus de
   * cartes qui disaient toutes « 3 à planifier ».
   */
  aPlanifier: number;
  total: number;
  hrefAjouter: string;
  /** Ce que le référentiel propose encore de déclarer, et où le lire. */
  suggestions?: { nombre: number; href: string } | null;
  /**
   * Le filtre par zone (ADR-029). Absent tant que l'établissement n'a
   * qu'une zone : le mono-zone ne paie pas la complexité du multi.
   * Il vit dans le bandeau, et pas au-dessus des cartes, parce qu'il règle
   * aussi les trois chiffres ci-contre.
   */
  filtreBatiment?: {
    baseHref: string;
    batiments: { id: string; nom: string; nbEquipements: number }[];
    /** `undefined` = tout l'établissement. */
    actif: string | undefined;
  } | null;
}) {
  // Les deux axes, dérivés — jamais recopiés. Le second sort d'un appel à
  // l'agrégation elle-même : c'est elle qui décide du périmètre, c'est donc
  // elle qui doit dicter la phrase.
  const { perimetre, horsCompte } = legendeParc({
    zone: !filtreBatiment
      ? "sansObjet"
      : filtreBatiment.actif
        ? "cette"
        : "toutes",
    comptes: porteursDuBandeauParc(),
  });
  const legende = (
    <>
      {perimetre}
      {horsCompte ? (
        <>
          {" "}
          {horsCompte}{" "}
          <Link
            href={hrefCalendrier}
            className="font-semibold text-[color:var(--board-blue-ink)] underline-offset-2 hover:text-[color:var(--board-ink)] hover:underline"
          >
            Voir le calendrier →
          </Link>
        </>
      ) : null}
    </>
  );

  return (
    <>
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="min-w-0">
              {/* Un fil d'Ariane et non un bouton rond de retour (2026-10-13) :
                  c'est une page d'entrée, elle dit où elle est rangée, pas
                  d'où l'on vient (ADR-014) — le même idiome que ses sœurs. */}
              <FilAriane crumbs={crumbs} />
              <h1 className="board-titre m-0 text-[clamp(22px,2.2vw,27px)]">
                Équipements
              </h1>
              <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                Ce que vous avez, et où. Chaque appareil porte ses
                vérifications, ses rapports et ses papiers&nbsp;: ouvrez sa
                fiche pour les voir.
              </p>
            </div>
          </div>

          <div className="flex flex-none flex-wrap items-center gap-2.5">
            {/* Les mots viennent de la table d'états, comme les couleurs
                juste à côté — ce bandeau écrivait « en retard » pendant que
                le relevé du tableau de bord, à un clic, écrivait
                « DÉPASSÉES » sur le même état. */}
            <Compteur
              nombre={enRetard}
              legende={LIBELLE_ETAT_COURT.enRetard}
              champ={CHAMP_ETAT.enRetard}
              encre={ENCRE_ETAT.enRetard}
            />
            <Compteur
              nombre={proches}
              legende={LIBELLE_ETAT_COURT.proche}
              champ={CHAMP_ETAT.proche}
              encre={ENCRE_ETAT.proche}
            />
            {aPlanifier > 0 ? (
              <Compteur
                nombre={aPlanifier}
                legende={LIBELLE_ETAT.aPlanifier.plusieurs}
                champ={CHAMP_ETAT.aPlanifier}
                encre={ENCRE_ETAT.aPlanifier}
              />
            ) : null}
            <Compteur
              nombre={total}
              legende="au parc"
              champ="var(--board-slate-pale)"
              encre="var(--board-slate-mid)"
            />
            <Link
              href={hrefAjouter}
              className={cn(
                buttonVariants({
                  variant: "board",
                  size: "board",
                  className: "ml-1.5 flex-none",
                }),
              )}
            >
              + Ajouter un équipement
            </Link>
          </div>
        </div>

        {filtreBatiment ? (
          <div className="mt-[18px] border-t border-[color:var(--board-slate-line)] pt-[15px]">
            <SelecteurBatiment
              ton="board"
              baseHref={filtreBatiment.baseHref}
              batiments={filtreBatiment.batiments}
              actif={filtreBatiment.actif}
              compteurs={
                new Map(
                  filtreBatiment.batiments.map((b) => [b.id, b.nbEquipements]),
                )
              }
              // Un compteur doit dire sur quoi il compte, surtout quand le
              // périmètre est réglable d'un clic juste à côté — et surtout
              // quand l'autre moitié de son périmètre, elle, ne se règle pas.
              legende={legende}
            />
          </div>
        ) : (
          /* Mono-zone : pas de sélecteur, donc pas de légende de sélecteur —
             mais la restriction par porteur, elle, s'applique pareil. Elle
             prend sa propre ligne plutôt que de disparaître. */
          <p className="m-0 mt-[18px] border-t border-[color:var(--board-slate-line)] pt-[15px] text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            {legende}
          </p>
        )}
      </header>

      {suggestions && suggestions.nombre > 0 ? (
        <div className="flex items-center gap-2.5 border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-[var(--board-gutter)] py-[11px]">
          <span
            aria-hidden
            className="size-1.5 flex-none rounded-full bg-[color:var(--board-blue-mid)]"
          />
          <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
            {suggestions.nombre > 1
              ? `D'après votre secteur et vos régimes, ${suggestions.nombre} catégories d'équipement restent à examiner.`
              : "D'après votre secteur et vos régimes, une catégorie d'équipement reste à examiner."}{" "}
            <Link
              href={suggestions.href}
              className="font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
            >
              Voir les suggestions →
            </Link>
          </p>
        </div>
      ) : null}
    </>
  );
}
