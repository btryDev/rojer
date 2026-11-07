// LE HERO — une photo de terrain bord à bord, qui passe sous la barre de
// navigation, et la promesse posée en blanc sur la salle vide, à gauche.
// Rien d'autre sur l'image : le produit se montre dans les sections
// suivantes. Tant que la page n'a pas défilé, l'en-tête est transparent et
// passe en blanc (`LandingHeader`, `surPhoto`).

import Image from "next/image";
import Link from "next/link";
import type { CompteLanding } from "./compte";
import photoHero from "@/assets/landing/hero-restaurateur.jpg";

/**
 * La photo du hero. Un seul endroit à changer pour la remplacer.
 *
 * Un patron de bistrot, dans sa salle avant le service, qui lit son
 * téléphone ; la hotte de la cuisine au fond. Cadrage attendu : 16/9, sujet
 * dans le tiers droit, la salle vide à gauche pour le texte. Cf.
 * `public/photos/README.md`.
 */
const PHOTO_HERO = {
  // Importée plutôt que nommée par son chemin : Next en tire un aperçu
  // flou glissé dans le HTML, affiché tant que la photo charge — sinon le
  // hero restait noir puis la photo tombait d'un coup.
  src: photoHero,
  alt: "Un restaurateur en tablier marine consulte son téléphone dans la salle de son bistrot avant le service",
  // Quand le cadre se resserre (écran en portrait), on garde son visage.
  // Sur téléphone, le hero est moins haut (84svh) : la photo se recadre moins.
  position: "68% 20%",
};

export function Hero({
  compte,
}: {
  /** Le compte connecté, s'il y en a un : le hero ne lui propose pas de s'inscrire. */
  compte?: CompteLanding;
}) {
  return (
    <section
      // La photo remonte de la hauteur de l'en-tête (`--lp-entete`) pour
      // passer dessous ; le texte la redescend d'autant.
      className="relative isolate -mt-[var(--lp-entete)] flex h-[84svh] max-h-[1000px] min-h-[560px] overflow-hidden bg-[color:var(--board-ink)] md:h-[100svh] md:min-h-[640px]"
    >
      <Image
        src={PHOTO_HERO.src}
        alt={PHOTO_HERO.alt}
        fill
        preload
        placeholder="blur"
        // En portrait, la photo 16/9 couvre la hauteur et déborde en largeur :
        // elle s'affiche sur environ 178 % de la hauteur d'écran (150 % sous
        // md, où le hero ne fait que 84svh).
        sizes="(max-width: 767px) 150vh, (max-aspect-ratio: 16/9) 178vh, 100vw"
        className="-z-10 object-cover"
        style={{ objectPosition: PHOTO_HERO.position }}
      />
      {/* Le voile : de bas en haut en portrait, où le texte passe sous son
          visage ; de gauche à droite dès que la salle vide laisse la place
          au texte. Le haut reste assombri pour l'en-tête blanc. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-[rgba(8,12,20,0.85)] via-[rgba(8,12,20,0.55)] via-55% to-transparent lg:bg-linear-to-r lg:from-[rgba(8,12,20,0.82)] lg:via-[rgba(8,12,20,0.62)] lg:via-38% lg:to-62%"
      />
      {/* Une bande sombre en haut, pour l'en-tête blanc. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-[rgba(8,12,20,0.55)] to-transparent"
      />

      <div className="lp-shell flex flex-col justify-end pt-[var(--lp-entete)] pb-12 sm:pb-16 lg:justify-center lg:pb-0">
        <div className="max-w-[760px]">
          {/* Une seule ligne dès qu'il y a la place (.lp-h1 est bornée pour
              ne pas déborder sur la personne, à droite). */}
          <h1 className="lp-titre lp-h1 text-white lg:whitespace-nowrap">
            Votre copilote prévention
          </h1>
          <p className="lp-lede mt-6 max-w-[44ch] text-white [text-shadow:0_1px_12px_rgba(8,12,20,0.55)]">
            {/* Espace insécable avant le deux-points : sans elle, la ligne
                peut casser juste avant, et le signe se retrouve seul en
                début de ligne. */}
            Rojer coordonne la prévention des risques de votre
            structure&nbsp;: vérifications, rapports, registres, plan
            d&apos;actions.
          </p>

          {/* Un compte connecté retrouve son dossier par « Mon espace »,
              dans l'en-tête : le hero ne le lui redemande pas. */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            {!compte ? (
              <Link href="/signup" className="lp-btn lp-btn-blanc">
                Essayer 30 jours
                <span className="lp-fleche" aria-hidden>
                  →
                </span>
              </Link>
            ) : null}
            <a href="#tarif" className="lp-btn lp-btn-verre">
              Voir les offres
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
