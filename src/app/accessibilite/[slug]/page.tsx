import { notFound } from "next/navigation";
import { getRegistrePublicParSlug } from "@/lib/accessibilite/queries";
import { identitePublique } from "@/lib/accessibilite/identite";
import { LABEL_HANDICAP, LABEL_REGIME } from "@/lib/accessibilite/schema";
import { formaterDateLongueFr } from "@/lib/dates";

export const metadata = {
  title: "Registre d'accessibilité",
  description:
    "Registre d'accessibilité public d'un établissement recevant du public — arrêté du 19 avril 2017.",
};

/**
 * Le registre public, tel qu'un visiteur le lit après avoir scanné le QR
 * code collé à l'entrée, et tel qu'un contrôleur l'ouvre.
 *
 * Charte : **board**, pas la grammaire `.lp-*` de la page publique
 * marketing, et surtout pas le registre « document administratif » du
 * papier.
 *
 * — Contre le papier : « document réglementaire opposable » est un argument
 *   de contenu, pas de forme. C'est exactement la confusion que la charte
 *   relève à propos du DUERP (§ 5) : l'exception qu'elle accorde porte sur
 *   la **largeur de lecture**, sur rien d'autre, et elle a servi de raison
 *   à ne pas reprendre un module entier. Le papier est de la dette, y
 *   compris quand la page est solennelle.
 * — Contre `.lp-*` : ces classes sont la voix de la **landing** — échelle
 *   de héros, apparitions au défilement, îlot de navigation en verre,
 *   enveloppe `lp-shell` à 1600 px. Cette page-ci n'a ni héros, ni
 *   navigation, ni argumentaire : c'est un document qu'on lit d'un bout à
 *   l'autre sur un téléphone. Les deux familles partagent de toute façon
 *   les mêmes jetons ; ce qui les sépare est le barème, et celui du board
 *   est celui d'un dossier qu'on consulte.
 *
 * Reste l'exception de largeur (charte § 5, cas 2) : le contenu est de la
 * prose suivie, donc colonne centrée et bornée, pas la gouttière. La
 * gouttière étalerait un paragraphe sur 1200 px.
 */

function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return formaterDateLongueFr(d);
}

export default async function RegistrePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await getRegistrePublicParSlug(slug);
  if (!r) notFound();

  // Le sujet ne se compose pas ici : il se demande (`lib/accessibilite/identite.ts`,
  // et `sujet-public.test.ts` vérifie qu'aucune surface publique n'en décide
  // dans son coin — c'est en en décidant dans son coin que celle-ci a titré
  // pendant des mois du nom d'un autre lieu).
  const identite = identitePublique(r.etablissement);

  return (
    <main className="min-h-screen bg-[color:var(--board-canvas)] px-5 pb-20 pt-10 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {/* Hero */}
        <header className="text-center">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Registre d&apos;accessibilité
          </p>
          <h1 className="board-titre m-0 mt-3 text-[clamp(29px,3vw,39px)]">
            {identite.titre}
          </h1>
          {/* L'adresse monte d'un rang : c'est elle qui distingue deux lieux
              d'une même maison, et c'est sur elle que le visiteur se reconnaît.
              `<address>` et non `<p>` — un lecteur d'écran peut alors l'annoncer
              pour ce qu'elle est, sur une page justement lue par des personnes
              en situation de handicap. `not-italic` parce que l'élément est
              italique par défaut, et que l'italique n'est pas au barème. */}
          <address className="m-0 mt-2 not-italic text-[14.5px] leading-[1.5] text-[color:var(--board-slate-ink)]">
            {identite.adresse}
          </address>
          {/* L'exploitant, et seulement s'il n'est pas déjà dans le titre.
              `identitePublique` tranche ; la page ne redécide rien. */}
          {identite.exploitant && (
            <p className="m-0 mt-1.5 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              Exploité par {identite.exploitant}
            </p>
          )}
        </header>

        {/* Handicaps accueillis — bloc visuel fort.
            Bleu et non vert : le vert du board dit « fait », et « adapté à »
            n'est ni un fait de saisie ni un verdict de conformité — c'est
            une information que l'établissement donne au visiteur. Le bleu
            glacier est le registre calme et actif du board. */}
        {r.handicapsAccueillis.length > 0 && (
          <section className="carte-board px-7 py-6 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Accessibilité
            </p>
            {/* ~~« Cet établissement EST adapté à »~~ — corrigé le 2026-09-20.
                Le produit ne constate rien : il affiche des cases que
                l'exploitant a cochées. Le lecteur de cette page est, par
                construction, la personne concernée — celle pour qui l'écart
                entre « est adapté » et « se déclare adapté » décide d'un
                déplacement. */}
            <h2 className="board-titre m-0 mt-2 text-[22px]">
              L&apos;exploitant déclare cet établissement adapté à
            </h2>
            <ul className="m-0 mt-4 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
              {r.handicapsAccueillis.map((h) => (
                /* PAS DE PICTOGRAMME, ET C'EST LA CORRECTION — 2026-09-03.

                   Les huit entrées en portaient un : trois emoji en couleur
                   (♿ 👁 👂) et cinq glyphes noirs (✶ ✦ ❋ ✻ ✚). Trois raisons
                   de les retirer, dans cet ordre d'importance :

                   1. `✚` sur « trouble de santé invalidant » rend une croix
                      médicale épaisse — sur la seule des huit situations que
                      `L. 114` met sur le même plan SANS qu'elle soit une
                      désignation médicale. Le signe dit le contraire du texte.
                   2. `❋` (psychique) et `✻` (polyhandicap) sont indiscernables
                      à 19 px ; `✶` (mental) et `✦` (cognitif) aussi. Quatre
                      signes qui ne se distinguent pas ne distinguent rien :
                      seul le texte porte le sens, et il le portait déjà.
                   3. Trois des huit ont un signe conventionnel, cinq n'en ont
                      aucun — aucune symbologie officielle ne couvre les huit
                      situations de `L. 114`. En inventer cinq à côté de trois
                      vraies apprend au lecteur que les cinq sont
                      conventionnelles elles aussi.

                   S'y ajoute que le `<span>` était `aria-hidden` : les
                   pictogrammes ne portaient rien pour les lecteurs d'écran,
                   c'est-à-dire pour une partie de ceux à qui cette page
                   publique s'adresse. Ils étaient décoratifs par construction.

                   Aucune puce neutre ne les remplace : la pilule EST le
                   marqueur, et remettre un point rond serait remettre de la
                   décoration là où on vient d'en retirer. */
                <li
                  key={h}
                  className="rounded-[16px] bg-[color:var(--board-blue-pale)] px-3.5 py-2.5 text-[13.5px] font-semibold text-[color:var(--board-blue-ink)]"
                >
                  {LABEL_HANDICAP[h]}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Section 1 — Prestations */}
        {(r.prestationsFournies || r.servicesAdaptes) && (
          <section className="carte-board flex flex-col gap-6 px-7 py-6 sm:px-8">
            {r.prestationsFournies && (
              <div>
                <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                  01 · Nos prestations
                </p>
                <p className="m-0 mt-2.5 whitespace-pre-wrap text-[14.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                  {r.prestationsFournies}
                </p>
              </div>
            )}

            {r.servicesAdaptes && (
              <div>
                <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                  Services adaptés sur place
                </p>
                <p className="m-0 mt-2.5 whitespace-pre-wrap text-[14.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                  {r.servicesAdaptes}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Section 4 — Équipements */}
        {r.equipementsAccessibilite && (
          <section className="carte-board px-7 py-6 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              02 · Équipements d&apos;accessibilité
            </p>
            <p className="m-0 mt-2.5 whitespace-pre-wrap text-[14.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
              {r.equipementsAccessibilite}
            </p>
          </section>
        )}

        {/* Le filet pointillé qui coupait le document en deux n'a pas
            d'équivalent board, et n'a pas à en recevoir un : les cartes
            font désormais la séparation. */}

        {/* Section 2 — Conformité */}
        {r.conformiteRegime && (
          <section className="carte-board px-7 py-6 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Conformité
            </p>
            <div className="mt-3 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3.5">
              <p className="m-0 text-[14px] font-semibold leading-[1.45] text-[color:var(--board-ink)]">
                {LABEL_REGIME[r.conformiteRegime]}
              </p>
              {/* Le régime est DÉCLARÉ, comme le reste de cette page. Sans
                  cette ligne, « Conforme dès la construction » se lit comme un
                  constat que Rojer aurait fait — il n'en fait aucun, et ne
                  saurait pas le faire. */}
              <p className="m-0 mt-1 text-[11.5px] text-[color:var(--board-slate-soft)]">
                Régime déclaré par l&apos;exploitant.
              </p>
              {r.dateConformite && (
                <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-slate-mid)]">
                  Effective depuis le {formatDate(r.dateConformite)}
                </p>
              )}
              {r.numeroAttestationAccess && (
                <p className="m-0 mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                  Attestation n° {r.numeroAttestationAccess}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Section 3 — Formation */}
        {(r.personnelForme ||
          r.dateDerniereFormation ||
          r.organismeFormation) && (
          <section className="carte-board px-7 py-6 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Formation du personnel d&apos;accueil
            </p>
            <div className="mt-3 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3.5 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
              {r.personnelForme ? (
                <p className="m-0">
                  Notre personnel d&apos;accueil a été formé à l&apos;accueil des
                  personnes en situation de handicap.
                </p>
              ) : (
                <p className="m-0">Formation en cours de mise en place.</p>
              )}
              {r.dateDerniereFormation && (
                <p className="m-0 mt-2 text-[12.5px] text-[color:var(--board-slate-mid)]">
                  Dernière session : {formatDate(r.dateDerniereFormation)}
                  {r.organismeFormation && ` · ${r.organismeFormation}`}
                  {r.effectifForme && r.effectifForme > 0
                    ? ` · ${r.effectifForme} personne${r.effectifForme > 1 ? "s" : ""} formée${r.effectifForme > 1 ? "s" : ""}`
                    : ""}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-6 border-t border-[color:var(--board-slate-line)] pt-6 text-center">
          <p className="m-0 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--board-slate-mid)]">
            Registre établi par l&apos;exploitant — arrêté du 19 avril 2017
          </p>
          {/* ~~« Registre tenu CONFORMÉMENT À l'arrêté du 19 avril 2017 »~~ —
              corrigé le 2026-09-20. La publication n'exige que DEUX champs
              (`accessibilite/actions.ts` : prestations, régime de conformité),
              quand l'arrêté « énumère neuf pièces à son article 1er » — phrase
              écrite quinze lignes plus bas, dans ce même fichier, depuis le
              2026-09-04. Toutes les autres sections de cette page sont en
              rendu conditionnel : un registre à deux champs s'affichait donc
              comme un registre complet, et se concluait par une attestation de
              conformité.

              Le pied nomme désormais le texte SANS affirmer qu'il est
              satisfait, et dit qui a établi le registre. C'est ce que le
              produit sait ; le reste appartient à l'exploitant et au lecteur.
              La page est lue par la personne concernée, qui n'a aucun moyen de
              recouper ce qu'elle y lit. */}
          <p className="m-0 mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Mis à jour le {formatDate(r.updatedAt)}
          </p>
          {/* PAS DE SIRET, ET C'EST LA SECONDE CORRECTION — 2026-09-04.
              Le pied publiait celui de l'ENTREPRISE, faute de colonne sur
              `Etablissement` : les deux registres d'un même compte annonçaient
              le même numéro, quand le NIC — les cinq derniers chiffres —
              désigne un site et un seul. Au plus un des deux disait vrai.
              Rien ne le remplace : l'arrêté du 19 avril 2017 énumère neuf
              pièces à son article 1er, et aucune n'est un identifiant
              d'immatriculation. L'argument complet, et pourquoi une colonne
              n'a pas été ajoutée, sont dans `lib/accessibilite/identite.ts`. */}
        </footer>
      </div>
    </main>
  );
}
