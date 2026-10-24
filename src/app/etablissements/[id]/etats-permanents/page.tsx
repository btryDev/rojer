import { FilAriane } from "@/components/navigation/FilAriane";
import { AideEcran } from "@/components/ui-kit/AideEcran";
import { LABEL_ITEM } from "@/components/layout/sidebar-nav";
import { requireEtablissement } from "@/lib/auth/scope";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import {
  listerEtatsPermanents,
  type LigneEtatPermanent,
} from "@/lib/etats-permanents/queries";
import Image from "next/image";
import Link from "next/link";
import { LigneCompacte } from "@/components/etats-permanents/LigneCompacte";
import { RevueEnPlace } from "@/components/etats-permanents/RevueEnPlace";
import { lignesParGeste } from "@/lib/etats-permanents/gestes";
import { ancreEtatPermanent } from "@/lib/etats-permanents/ancre";
import {
  dessinDe,
  etatCourtDe,
  versFiche,
} from "@/lib/etats-permanents/vers-fiche";
import {
  CompteurDeLaPage,
  SectionsParGeste,
  SectionsParUsage,
} from "@/components/etats-permanents/SectionsParUsage";
import { compteDeLaPage } from "@/lib/etats-permanents/compte";
import { manquesDeLaFiche } from "@/lib/etablissements/guide-par-module";
import { FocusSurAncre } from "@/components/etats-permanents/FocusSurAncre";
import {
  phraseFaitsDates,
  phraseFicheIncomplete,
  phraseRienEnPlace,
} from "@/lib/etats-permanents/phrases";

/** La photo du hero. Seule référence au fichier (`public/photos/README.md`). */
const PHOTO_HERO = { src: "/photos/hero-en-place.jpg" } as const;

export const metadata = {
  title: "Ce qui doit être en place — Rojer",
};

/**
 * La seconde des quatre natures d'obligation (ADR-022) reçoit son écran.
 *
 * **Le constat qui l'appelle**, mesuré au contrôle visuel du 2026-08-31 sur un
 * dossier né de l'onboarding : le moteur calculait dix-huit obligations, et
 * l'application en affichait deux. Les seize autres n'étaient persistées nulle
 * part et n'apparaissaient sur aucun des neuf écrans ouverts — sauf dans le
 * menu déroulant d'un formulaire dont le texte d'accueil dit qu'il n'y a rien à
 * y faire.
 *
 * Le générateur les écarte à raison : sans périodicité, pas de rendez-vous, et
 * inventer une date serait pire que n'en afficher aucune. Ce qui manquait
 * n'était pas un correctif d'affichage, c'était une surface.
 *
 * **Où cet écran vit, et pourquoi ici.** Quatrième item du panneau « À faire »,
 * sans nouvelle entrée de rail. L'ADR-015, décision 4 : ce panneau « ne porte
 * que des activités » et « aucune entrée n'est l'état filtré d'une autre ».
 * Les deux conditions tiennent — mettre en place est une activité, et ce n'est
 * pas un filtre du calendrier pour une raison structurelle et non contingente :
 * `estSansRendezVous` fait que ces lignes ne peuvent pas exister comme
 * `Verification`. Un filtre suppose que l'objet soit là ; ici il n'y est pas et
 * n'y sera jamais.
 *
 * **Ce que cet écran n'est pas.** Une case cochée est une déclaration de
 * l'employeur — ni un rapport, ni une pièce, ni un constat du produit
 * (ADR-027). Elle ne fait progresser aucun « % prêt » et n'ouvre aucune
 * surface de dépôt.
 *
 * **Ce qu'elle fait, depuis le 2026-09-01, et qui a changé.** Cette note
 * disait « ni une entrée du ZIP », et ce n'est plus vrai : le dossier de
 * conformité porte désormais ces lignes, déclarées comme non déclarées,
 * nommées comme des déclarations de l'employeur et jamais comme des pièces
 * (amendement de l'ADR-027). Tant que ce n'était pas le cas, un dirigeant qui
 * avait passé ses douze états en revue ne pouvait le montrer à personne — et
 * c'est ce document qu'on présente à un inspecteur.
 *
 * La phrase est corrigée ici plutôt que laissée telle quelle : une note d'en-tête
 * qui décrit un état révolu se lit comme une règle en vigueur, et c'est la
 * famille de défauts que ce dépôt a passé la semaine à retirer.
 *
 * **Ce que la séparation des deux verbes fait, et ne fait pas.** Les lignes
 * « fait le » ont leur propre section depuis le contrôle visuel du 2026-08-31 :
 * elles cohabitaient avec les états dans les mêmes cartes, sous deux pastilles
 * strictement identiques, et personne ne les distinguait — un relecteur a coché
 * douze lignes en sept secondes sans en lire une seule.
 *
 * La section **ne sauve pas ce lecteur-là** : celui qui déroule en cliquant
 * cliquera « Marquer comme fait » aussi vite qu'il cliquait « Déclarer en
 * place ». Ce qu'elle change, c'est qu'on ne peut plus atteindre ce bouton sans
 * avoir l'explication au-dessus des yeux, et que les deux verbes ne se touchent
 * plus. **Elle aide celui qui s'arrête** ; la version d'avant n'aidait
 * personne. C'est un progrès réel et incomplet, et il vaut mieux l'écrire que
 * de laisser croire la question réglée.
 *
 * **Et ce n'est pas un relevé de manquements.** Douze lignes non cochées chez
 * quelqu'un qui vient de créer son dossier, c'est une liste de ce qu'il a à
 * mettre en place — et une bonne partie décrit des choses qu'il fait déjà sans
 * savoir qu'elles ont un fondement légal. Le ton de l'en-tête et de l'état
 * initial est écrit pour ça.
 */
export default async function EtatsPermanentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ decoupe?: string }>;
}) {
  const { id } = await params;
  // DEUX DÉCOUPES EN ESSAI (2026-10-20) : par famille (le référentiel) ou par
  // geste (`gestes.ts`). Dans l'adresse plutôt qu'en état local, pour que
  // chaque version ait son lien et se montre telle quelle à l'équipe.
  const parGeste = (await searchParams)?.decoupe === "geste";
  const { etablissement } = await requireEtablissement(id);
  const equipements = await listerEquipementsDeLEtablissement(id);

  const dossier = await listerEtatsPermanents(
    etablissement,
    equipements.map((eq) => ({
      id: eq.id,
      libelle: eq.libelle,
      categorie: eq.categorie,
      caracteristiques: (eq.caracteristiques ?? null) as Record<
        string,
        unknown
      > | null,
    })),
  );
  const { familles, faits, parLesRisques } = dossier;

  // Une seule écriture de la ligne pour les deux sections : les états rangés
  // par usage et « ce qui revient ». Elle était recopiée, et deux copies des
  // mêmes props divergent à la première correction.
  //
  // Depuis le 2026-10-20 la ligne s'affiche en VIGNETTE (`LigneCompacte`) :
  // dessin, libellé, état court. Au clic, la fiche (`RevueEnPlace`) reprend ce
  // que `LigneEtat` disait et faisait — texte qui la fonde, « à confirmer »,
  // déclaration révocable. `LigneEtat` n'est plus rendue par cet écran.
  const rendreLigne = (l: LigneEtatPermanent) => (
    <LigneCompacte
      key={l.obligation.id}
      obligationId={l.obligation.id}
      ancre={ancreEtatPermanent(l.obligation.id)}
      libelle={l.obligation.libelle}
      {...dessinDe(l)}
      etat={etatCourtDe(l)}
      aConfirmer={l.aConfirmer !== null || l.questionsSansReponse.length > 0}
    />
  );
  // La fiche (`RevueEnPlace`) reçoit les lignes dans l'ordre de la découpe
  // affichée — Précédente et Suivante suivent ce que l'écran montre — puis
  // celles de « ce qui revient ». La construction est partagée avec la page
  // des risques (`vers-fiche.ts`).
  const ordre = parGeste
    ? lignesParGeste(familles).flatMap((g) => g.lignes)
    : familles.flatMap((f) => f.blocs.flatMap((b) => b.lignes));
  const lignesFiche = [...ordre, ...faits].map((l) =>
    versFiche(l, { etablissementId: id, entrepriseId: etablissement.entrepriseId }),
  );
  // Les phrases qui s'accordent en nombre vivent dans `phrases.ts` et non dans
  // ce JSX. Une locution coupée par un ternaire s'y était cassée au rendu —
  // « Elles n'entrepas dans le compte » — et rien ne pouvait l'attraper tant
  // que la phrase n'existait nulle part en entier.
  //
  // Comptée sur les lignes AFFICHÉES : celles qui se déclarent sous une
  // question d'activité (`parLesRisques`) n'ont rien à faire dans la phrase
  // d'une section où elles ne sont pas.
  const texteFaits = phraseFaitsDates(
    faits.length,
    faits.filter((l) => l.declareLe).length,
  );
  // LA FICHE INCOMPLÈTE (2026-10-22, décision de la propriétaire) : les
  // lignes affichées « à confirmer » faute d'une réponse de la fiche, et ce
  // qui y manque — mêmes noms et même règle que le guide du tableau de bord.
  const regimeFiche = {
    estERP: etablissement.estERP,
    typeErp: etablissement.typeErp,
    typesErpAutres: etablissement.typesErpAutres,
    categorieErp: etablissement.categorieErp,
  };
  const lignesAffichees = [...ordre, ...faits];
  const lignesSansFiche = lignesAffichees.filter(
    (l) => manquesDeLaFiche(l.questionsSansReponse, regimeFiche).length > 0,
  );
  const texteFiche = phraseFicheIncomplete(
    lignesSansFiche.length,
    manquesDeLaFiche(
      lignesSansFiche.flatMap((l) => l.questionsSansReponse),
      regimeFiche,
    ),
  );
  // ~~Comptées dans l'en-tête, déclarées ailleurs : l'écran disait où.~~
  // [2026-10-22, décision de la propriétaire : elles ne sont plus comptées
  // ici (`compteDeLaPage`), la phrase et son lien sont retirés.]

  return (
    <RevueEnPlace etablissementId={id} lignes={lignesFiche}>
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      {/* LE HERO (2026-10-20) : pleine largeur, le texte à gauche dans la
          gouttière du board, la photo jusqu'au bord droit. Photo décorative —
          ce qu'elle évoque est écrit à côté (`public/photos/README.md`). */}
      <header className="grid border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex min-w-0 flex-col justify-center gap-5 py-9 pl-[var(--board-gutter)] pr-[var(--board-gutter)] md:pr-10">
          <div className="min-w-0">
            <FilAriane
              crumbs={[
                { href: `/etablissements/${id}`, label: etablissement.raisonDisplay },
                { label: LABEL_ITEM["etats-permanents"] },
              ]}
            />
            <h1 className="board-titre m-0 text-[clamp(29px,3vw,39px)]">
              Ce qui doit être en place
            </h1>
            <p className="m-0 mt-3 max-w-[62ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Ce qui doit exister chez vous en permanence. Touchez une ligne
              pour ouvrir sa fiche et la déclarer.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">

          <AideEcran titre="Comment lire cette page">
            <p className="m-0">
              Des obligations sans date : elles ne se refont pas à échéance, il
              s&apos;agit d&apos;un état à mettre en place puis à maintenir. Une
              bonne partie est sans doute déjà vraie chez vous — de l&apos;eau au
              robinet, des toilettes, une affiche au mur.
            </p>
            <p className="m-0">
              Passez-les en revue : ce que vous n&apos;aurez pas déclaré dira ce
              qu&apos;il vous reste à faire. Une déclaration est la vôtre :
              Rojer ne vérifie pas qu&apos;une chose est en place.
            </p>
            <p className="m-0">
              Le livre « Texte » de chaque ligne ouvre l&apos;article qui la
              fonde, avec le lien vers la source officielle.
            </p>
            <p className="m-0">
              Rien n&apos;est relancé : la date de votre déclaration
              s&apos;affiche, vous jugez vous-même si elle a vieilli. Dans le
              dossier de conformité, une ligne que vous n&apos;avez pas déclarée
              n&apos;est pas présentée comme un manquement.
            </p>
            <p className="m-0">
              Cette page reflète ce que vous avez renseigné sur votre
              établissement, vos équipements et vos salariés : une information
              manquante ou inexacte change ce qui s&apos;y affiche.
            </p>
          </AideEcran>

          {/*
            Le compteur est MESURÉ, jamais écrit à la main : `listerEtatsPermanents`
            le calcule sur ce que le moteur rend pour CE dossier. Le brief l'exige,
            et ce dépôt s'est fait prendre plusieurs fois par des comptes recopiés —
            jusque dans les briefs eux-mêmes, trois fois sur cette page.

            « déclarés en place par vous », jamais « conformes » : le produit
            assiste, il ne certifie pas (CLAUDE.md, règle 8). C'est ici, et
            ici SEULEMENT, que l'écran dit qui affirme « en place » : les
            familles et le sommaire ne portent que « x sur n » (2026-10-17,
            revue de c6 ; ADR-027, amendement du 2026-10-17, § 10).
          */}
          {/* `compteDeLaPage` : la même lecture que le widget du tableau de
              bord, qui affiche ce compte au-dessus de ses familles. */}
          <CompteurDeLaPage {...compteDeLaPage(dossier)} />
          </div>
          {texteFiche && (
            <p className="m-0 max-w-[62ch] text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              {texteFiche}{" "}
              <Link
                href={`/etablissements/${id}/modifier`}
                className="font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4"
              >
                Compléter la fiche
              </Link>
            </p>
          )}
        </div>
        <figure className="relative m-0 hidden min-h-[300px] md:block">
          <Image
            src={PHOTO_HERO.src}
            alt=""
            fill
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover"
            priority
          />
        </figure>
      </header>

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        {/* Vide seulement quand il n'y a NI état NI fait : la page testait
            les seuls états, et un dossier qui n'avait que des lignes « fait
            le » se voyait dire « Rien à mettre en place » au-dessus d'elles. */}
        {familles.length === 0 && faits.length === 0 ? (
          <section className="carte-board px-7 py-8 sm:px-8">
            <div className="flex max-w-[600px] flex-col gap-3">
              <h2 className="board-titre m-0 text-[22px]">
                Rien à mettre en place pour ce dossier
              </h2>
              {/* Des lignes liées aux risques existent peut-être : elles se
                  déclarent ailleurs, et la phrase de l'en-tête y mène. Dire
                  alors « aucune » serait faux (revue du 2026-10-21). */}
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                {phraseRienEnPlace(parLesRisques.length > 0)}
              </p>
            </div>
          </section>
        ) : (
          <>
            <nav aria-label="Découpe" className="flex">
              <div className="inline-flex rounded-full bg-[color:var(--board-slate-pale)] p-1">
                {[
                  { href: `/etablissements/${id}/etats-permanents`, label: "Par famille", actif: !parGeste },
                  { href: `/etablissements/${id}/etats-permanents?decoupe=geste`, label: "Ce qu'il faut faire", actif: parGeste },
                ].map((o) => (
                  <Link
                    key={o.label}
                    href={o.href}
                    scroll={false}
                    aria-current={o.actif ? "page" : undefined}
                    className={
                      "rounded-full px-4 py-[7px] text-[13px] font-semibold transition-colors " +
                      (o.actif
                        ? "bg-[color:var(--board-card)] text-[color:var(--board-ink)] shadow-[0_1px_2px_rgba(13,18,36,.08)]"
                        : "text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]")
                    }
                  >
                    {o.label}
                  </Link>
                ))}
              </div>
            </nav>
            {parGeste ? (
              <SectionsParGeste familles={familles} rendreLigne={rendreLigne} />
            ) : (
              <SectionsParUsage familles={familles} rendreLigne={rendreLigne} />
            )}
            {/* Arrivée par un lien du widget (`next/link`) : le défilement est
                celui de Next, le focus doit suivre (`FocusSurAncre`). */}
            <FocusSurAncre />

            {/*
              LE SECOND VERBE A SA PROPRE SECTION, ET C'EST UNE CORRECTION.

              Les deux verbes cohabitaient dans les mêmes cartes, avec deux
              pastilles strictement identiques — même fond, même rayon, même
              position — et la seule différence tenait dans les trois mots du
              bouton. Le contrôle visuel du 2026-08-31 a coché douze lignes en
              sept secondes sans en lire une seule : dans ce geste-là, deux
              pastilles qui se ressemblent sont la même action.

              La distinction est donc portée par le REGROUPEMENT, qui se voit
              sans se lire. Pas par une teinte — la charte interdit la couleur
              seule — ni par une icône qu'il faudrait décoder. Et l'explication
              vit ici, à côté des lignes concernées, au lieu du pied de page
              « là où l'on arrive après avoir tout coché ».

              L'écran ne perd rien de sa vitesse : à l'intérieur de chaque
              section, cliquer reste immédiat.
            */}
            {faits.length > 0 && (
              <section className="carte-board px-7 py-6 sm:px-8">
                {/* UN TITRE DE SECTION, PAS UN SUR-TITRE — et c'est la
                    correction du 2026-08-31.

                    La première rédaction composait ce libellé EXACTEMENT comme
                    un nom de domaine — les cartes étaient alors rangées par
                    domaine juridique, coiffées d'un sur-titre : mêmes petites
                    capitales, même gris, même place en tête de carte. Le
                    regroupement était juste, sa forme disait « encore un
                    domaine ».

                    Depuis le rangement par usage (2026-10-17), chaque famille
                    porte un titre de section au même barème, et cette section
                    en est la sœur : même rang, même titre. Ce qui la
                    distingue n'est plus le barème mais la place — après les
                    familles, hors du sommaire — et l'explication juste
                    dessous.

                    Interdit 11 respecté — jamais deux niveaux de titrage dans
                    une carte : celle-ci porte un titre et aucun sur-titre. */}
                <h2 className="board-titre m-0 text-[22px]">
                  Ce qui revient, sans rythme écrit
                </h2>
                {texteFaits && (
                  <p className="m-0 mt-2 max-w-[72ch] text-[13px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                    {texteFaits}
                  </p>
                )}
                <ul className="m-0 mt-3 grid list-none gap-1.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
                  {faits.map(rendreLigne)}
                </ul>
              </section>
            )}

            {/* ~~« Ce que cette page fait, et ne fait pas », bloc de pied de page~~
                (2026-10-20, décision de la propriétaire). Ses quatre paragraphes sont
                redistribués là où on les lit : « une déclaration, pas une
                vérification » et « reprise dans votre dossier de conformité » sous
                les réponses de la fiche, au moment de déclarer
                (`phraseSousLesReponses`) ; « rien n'est relancé » et « une ligne
                non déclarée n'est pas un manquement » dans l'aide de l'en-tête ;
                le reste à revoir, dans le compteur. L'ADR-027 n'exige les deux
                mises en garde détaillées que du PDF (décision 5). */}
          </>
        )}
      </div>
    </main>
    </RevueEnPlace>
  );
}
