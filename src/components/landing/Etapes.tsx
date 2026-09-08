import Image from "next/image";
import Link from "next/link";
import { Reveal } from "./Reveal";

// Le sujet de cette section, c'est la prise en main : combien de temps
// avant d'être opérationnel, et qu'est-ce qu'on a à faire. Surtout pas
// « ça tourne sans vous » — la donnée vient de l'utilisateur, du premier
// jour au dernier ; ce qu'on lui épargne, c'est le classement et le
// calcul des échéances, pas la saisie.
//
// La numérotation est ici justifiée : les trois étapes se font dans cet
// ordre. Les trois crans portent la même encre — le troisième était le
// seul en noir tant qu'on voulait marquer « c'est là que ça se répète » ;
// cette hiérarchie a sauté, une suite de trois se lit très bien sans
// qu'on désigne un vainqueur.
//
// L'étape 3 annonce le rappel e-mail avant échéance : prévu pour la
// sortie publique. À vérifier avant de mettre la page en ligne — c'est la
// seule promesse de cette section qui ne soit pas déjà livrée.
//
// Cette section porte l'appel à l'action de milieu de page : elle a
// absorbé l'ancienne bande bleue de pied de page (`CtaFinal`, supprimée).
// On demande le compte au moment où l'on vient de dire ce que ça coûte à
// prendre en main — c'est là que la question se pose.
//
// La composition rime avec le hero sans le copier : là-bas le texte tient
// la gauche et la scène la droite, ici c'est l'inverse. Les trois crans
// passent donc en colonne — ils tenaient en trois colonnes quand la
// section faisait toute la largeur.

/**
 * La photo de la section. Un seul endroit à changer pour la remplacer.
 *
 * Le sujet travaille — un ordinateur posé sur l'établi, pas un bureau.
 * Cadrage attendu : portrait 2/3, sujet dans le tiers central, lumière
 * naturelle. Cf. `public/photos/README.md`.
 */
const PHOTO_ETAPES = {
  src: "/photos/etapes-atelier.jpg",
  alt: "Une menuisière consulte un ordinateur portable posé sur l'établi de son atelier",
  position: "50% 44%",
};

/**
 * Adresse de contact affichée en bas de la section.
 *
 * ⚠︎ À confirmer avant la mise en ligne : c'est l'adresse du compte, pas
 * forcément celle qu'on veut exposer publiquement. Un seul endroit à
 * changer si elle bouge.
 */
const CONTACT = "contact@btry.fr";

const ETAPES = [
  {
    titre: "Vous déclarez votre établissement",
    corps: "Activité, effectif, locaux, équipements. Rojer en déduit vos obligations et leurs périodicités.",
    duree: "≈ 20 min",
  },
  {
    titre: "Le calendrier se remplit seul",
    corps: "Chaque équipement pose ses dates sur la frise : en retard, proche, ou calme. Rien à recopier d'une année sur l'autre.",
    duree: "Automatique",
  },
  {
    titre: "Vous traitez ce qui arrive à échéance",
    corps: "Un e-mail vous prévient avant la date, le brief ne montre que l'utile. Le reste attend son tour.",
    duree: "Chaque semaine",
  },
];

export function Etapes({
  ctaHref,
  ctaLabel,
  connecte,
}: {
  ctaHref: string;
  ctaLabel: string;
  connecte: boolean;
}) {
  return (
    <section className="bg-[color:var(--board-card)] py-20 sm:py-28">
      <div className="lp-shell grid grid-cols-1 items-start gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-24">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[30px] bg-[color:var(--board-slate-pale)] lg:rounded-[38px]">
            <Image
              src={PHOTO_ETAPES.src}
              alt={PHOTO_ETAPES.alt}
              fill
              sizes="(max-width: 1023px) 92vw, 34vw"
              className="object-cover"
              style={{ objectPosition: PHOTO_ETAPES.position }}
            />
          </div>
        </Reveal>

        <div>
          <Reveal as="header">
            <h2 className="lp-titre lp-h2 sm:whitespace-nowrap">
              Une prise en main rapide
            </h2>
          </Reveal>

          <ol className="m-0 mt-12 flex list-none flex-col p-0">
            {ETAPES.map((e, i) => (
              <Reveal
                as="li"
                key={e.titre}
                delai={i * 90}
                className="border-t border-dashed border-[rgba(10,10,10,.18)] py-7 first:border-t-0 first:pt-0"
              >
                <div className="flex items-center gap-4">
                  <span className="flex size-11 flex-none items-center justify-center rounded-full bg-[color:var(--board-ink)] text-[0.95rem] font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="lp-titre lp-h3 flex-1">{e.titre}</h3>
                  <span className="hidden flex-none font-mono text-[0.66rem] uppercase tracking-[0.14em] text-[color:var(--board-slate-soft)] sm:block">
                    {e.duree}
                  </span>
                </div>
                <p className="lp-texte mt-3 max-w-[46ch] sm:pl-[60px]">
                  {e.corps}
                </p>
              </Reveal>
            ))}
          </ol>

          {/* La provenance du référentiel. Elle est en note de bas de
              liste plutôt que dans un cran : elle ne décrit pas une étape,
              elle répond à la question que les trois posent ensemble —
              « sur quoi vous vous basez pour me dire tout ça ? ». Les
              chiffres sont comptés sur `obligationsConformite`, à
              recompter quand le référentiel s'étend. */}
          {/* Calée à gauche, sous la colonne des crans et non dans leur
              retrait : à l'aplomb du corps de texte, elle se lisait comme
              une quatrième ligne de l'étape 3. */}
          <p className="mt-9 font-mono text-[0.68rem] uppercase leading-[1.8] tracking-[0.14em] text-[color:var(--board-slate-soft)]">
            Référentiel construit depuis Légifrance et l&apos;INRS · 154
            obligations sur 21 domaines · source citée pour chacune
          </p>

          <Reveal delai={300}>
            <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-[rgba(10,10,10,.12)] pt-10">
              <Link href={ctaHref} className="lp-btn lp-btn-ink">
                {ctaLabel}
                <span className="lp-fleche" aria-hidden>
                  →
                </span>
              </Link>
              {!connecte ? (
                <Link href="/login" className="lp-btn lp-btn-clair">
                  J&apos;ai déjà un compte
                </Link>
              ) : null}
            </div>
          </Reveal>

          {/* La porte de sortie. Toutes les sections de la page poussent
              vers l'inscription ; celle-ci reconnaît qu'on peut vouloir
              parler à quelqu'un avant. Le champ bleu la détache du blanc
              sans en faire un second appel à l'action de même poids. */}
          <Reveal delai={380}>
            <div className="mt-6 flex flex-col gap-4 rounded-[22px] bg-[color:var(--board-blue-pale)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
              <div>
                <p className="text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--board-ink)]">
                  Une question sur vos obligations ?
                </p>
                <p className="mt-1.5 max-w-[48ch] text-[0.875rem] leading-[1.55] text-[color:var(--board-slate-ink)]">
                  Restauration, commerce, bureau : les obligations ne se
                  ressemblent pas. Décrivez-nous votre activité, nous regardons
                  votre situation avec vous.
                </p>
              </div>
              <a
                href={`mailto:${CONTACT}?subject=${encodeURIComponent("Une question sur Rojer")}`}
                className="lp-btn lp-btn-clair flex-none"
              >
                Nous écrire
                <span className="lp-fleche" aria-hidden>
                  →
                </span>
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
