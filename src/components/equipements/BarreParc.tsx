// La barre du parc — sous l'en-tête de page, pleine largeur, bord à bord.
//
// [2026-10-25 : ~~le bandeau du parc~~ — le titre et sa phrase ont rejoint
// l'en-tête commun des pages d'entrée (`EnTetePage`), qui ne porte que la
// bascule de vue. Il reste ici ce que le bandeau comptait et commandait :
// les chiffres, l'ajout, le filtre par zone et sa légende, les suggestions.
// Le fichier s'appelait `BandeauParc.tsx`.]
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
// l'agrégation compte pour de bon (`legendeParc`, `porteursDuParc`).
// Personne ne peut plus écrire « tout » au-dessus d'un compteur qui compte une
// part, parce que personne n'écrit plus cette phrase.
//
// Et elle est rendue **même sans sélecteur de zone** : la restriction par
// porteur ne dépend pas du nombre de zones, un établissement mono-zone la subit
// à l'identique. Elle vivait dans la légende du sélecteur, donc elle
// disparaissait exactement chez ceux qui n'ont qu'un lieu.

import Link from "next/link";
import { SelecteurBatiment } from "@/components/batiments/SelecteurBatiment";
import { buttonVariants } from "@/components/ui/button";
import { BarreDeListe } from "@/components/ui-kit/BarreDeListe";
import { CompteurEtat } from "@/components/ui-kit/CompteurEtat";
import {
  CHAMP_ETAT,
  ENCRE_ETAT,
  LIBELLE_ETAT,
  LIBELLE_ETAT_COURT,
} from "@/lib/calendrier/etats";
import { porteursDuParc } from "@/lib/equipements/etat-verifications";
import { legendeParc } from "@/lib/perimetre/porteurs-comptes";

/** Un lien posé dans une phrase de la barre — légende et suggestions. */
const LIEN_DANS_PHRASE =
  "font-semibold text-[color:var(--board-ink)] underline underline-offset-2 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-ink)]";

export function BarreParc({
  hrefCalendrier,
  enRetard,
  proches,
  aPlanifier,
  hrefAjouter,
  suggestions,
  filtreBatiment,
}: {
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
  hrefAjouter: string;
  /**
   * Le lien qui ouvre la fenêtre des suggestions (`SuggestionsEnFenetre`),
   * posé par la page. ~~Un compte et une ancre vers le panneau de la page~~
   * [2026-10-27 : le panneau a quitté la page pour une fenêtre].
   */
  suggestions?: React.ReactNode;
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
    comptes: porteursDuParc(),
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
            className={LIEN_DANS_PHRASE}
          >
            Voir le calendrier →
          </Link>
        </>
      ) : null}
    </>
  );

  return (
    <>
      {/* Une barre et non plus un bandeau titré : le titre et sa phrase
          sont dans l'en-tête de page. Le volume (« 12 au parc ») est parti
          avec : seuls restent les comptes d'état, qui appellent un geste
          (décision de la propriétaire du 2026-10-25). */}
      <section
        aria-label="Le parc"
        className="border-y border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[18px]"
      >
        <BarreDeListe
          resume={
            <>
              {/* Les mots viennent de la table d'états, comme les couleurs
                  juste à côté — ce bandeau écrivait « en retard » pendant que
                  le relevé du tableau de bord, à un clic, écrivait
                  « DÉPASSÉES » sur le même état. */}
              <CompteurEtat
                nombre={enRetard}
                legende={LIBELLE_ETAT_COURT.enRetard}
                champ={CHAMP_ETAT.enRetard}
                encre={ENCRE_ETAT.enRetard}
              />
              <CompteurEtat
                nombre={proches}
                legende={LIBELLE_ETAT_COURT.proche}
                champ={CHAMP_ETAT.proche}
                encre={ENCRE_ETAT.proche}
              />
              {aPlanifier > 0 ? (
                <CompteurEtat
                  nombre={aPlanifier}
                  legende={LIBELLE_ETAT.aPlanifier.plusieurs}
                  champ={CHAMP_ETAT.aPlanifier}
                  encre={ENCRE_ETAT.aPlanifier}
                />
              ) : null}
            </>
          }
          action={
            <Link
              href={hrefAjouter}
              className={buttonVariants({ variant: "board", size: "board" })}
            >
              + Ajouter un équipement
            </Link>
          }
        />

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
      </section>

      {suggestions ? (
        <div className="flex items-center gap-2.5 border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-[var(--board-gutter)] py-[11px]">
          <span
            aria-hidden
            className="size-1.5 flex-none rounded-full bg-[color:var(--board-slate-soft)]"
          />
          <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
            {suggestions}
          </p>
        </div>
      ) : null}
    </>
  );
}
