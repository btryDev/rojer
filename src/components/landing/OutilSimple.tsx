// « UN OUTIL SIMPLE ET TRANSPARENT » — en deux temps. D'abord l'usage (un
// passage de la visite guidée des équipements), puis les sources (chaque
// obligation cite son texte).
//
// L'illustration suit la piste notée dans `docs/marketing/direction-
// illustration.md` (branche `docs/communication`) : isométrie au trait fin,
// bleu pâle, un sujet simple. Elle est décorative : tout ce qu'elle dit est
// écrit à côté.
//
// Les apparitions sont « amples » (Reveal) : la section se découvre au
// défilement, le texte d'abord, le média ensuite.

import { fichiersVisite } from "@/lib/visite/visites";
import { ExtraitVideo } from "./ExtraitVideo";
import illustrationSources from "../../../public/illustrations/landing/transparence-sources.jpg";
import { PhotoCadre } from "./PhotoCadre";
import { Reveal } from "./Reveal";

const VISITE = fichiersVisite("equipements");

/** Le bloc texte d'un temps : sur-titre, titre, paragraphe. */
function Temps({
  surTitre,
  titre,
  texte,
  delai,
  className,
}: {
  surTitre: string;
  titre: string;
  texte: string;
  delai?: number;
  className?: string;
}) {
  return (
    <Reveal ample="texte" delai={delai} className={className}>
      <p className="lp-eyebrow">{surTitre}</p>
      <h3 className="lp-titre lp-h3-temps mt-3.5">{titre}</h3>
      <p className="lp-texte mt-3.5 max-w-[42ch]">{texte}</p>
    </Reveal>
  );
}

export function OutilSimple() {
  return (
    <section className="bg-[color:var(--board-canvas)] py-24 sm:py-32">
      <div className="lp-shell">
        <Reveal as="header">
          <h2 className="lp-titre lp-h2 text-center">
            Un outil simple et transparent
          </h2>
        </Reveal>

        {/* 1 · Simple : le texte, puis la vidéo, plus large */}
        <div className="mt-24 grid grid-cols-1 items-center gap-12 sm:mt-40 lg:grid-cols-[0.6fr_1.4fr] lg:gap-20">
          <Temps
            surTitre="Simple"
            titre="Simple à utiliser"
            texte="Chaque écran répond à une question : ce qu'il faut faire cette semaine, ce qui manque, où se trouve un rapport. Déclarer un équipement, déposer un rapport ou ajouter un salarié se fait depuis la page concernée, en quelques champs."
          />
          <Reveal ample="media" delai={180}>
            <div className="lp-fiche-carte overflow-hidden">
              <ExtraitVideo
                src={VISITE.video}
                poster={VISITE.affiche}
                debut={30}
                fin={47}
                label="Démonstration : dépôt du rapport des extincteurs et calcul de la prochaine échéance"
              />
            </div>
          </Reveal>
        </div>

        {/* 2 · Transparent : l'illustration, puis le texte */}
        <div className="mt-28 grid grid-cols-1 items-center gap-12 sm:mt-40 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <Temps
            surTitre="Transparent"
            titre="Transparent sur ses sources"
            texte="Chaque obligation cite son article (Code du travail, règlement de sécurité ERP, norme) avec un lien vers Légifrance. Quand un texte ne fixe pas de rythme, Rojer l'écrit."
            delai={180}
            className="lg:order-2"
          />
          <Reveal ample="media" className="lg:order-1">
            <PhotoCadre
              photo={{ src: illustrationSources, alt: "" }}
              fond="var(--board-blue-pale)"
              ratio="4 / 3"
              sizes="(max-width: 1023px) 92vw, (max-width: 1600px) 50vw, 800px"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
