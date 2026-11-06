// « UN OUTIL SIMPLE ET TRANSPARENT » — en deux temps. D'abord l'usage (un
// passage de la visite guidée des équipements), puis les sources (chaque
// obligation cite son texte ; un rythme que le texte ne fixe pas est dit
// comme un choix de Rojer, ADR-039).
//
// L'illustration suit la piste notée dans `docs/marketing/direction-
// illustration.md` (branche `docs/communication`) : isométrie au trait fin,
// bleu pâle, un sujet simple. Elle est décorative : tout ce qu'elle dit est
// écrit à côté.

import Image from "next/image";
import { ExtraitVideo } from "./ExtraitVideo";
import { Reveal } from "./Reveal";

const SIMPLE =
  "Chaque écran répond à une question : ce qu'il faut faire cette semaine, ce qui manque, où se trouve un rapport. Déclarer un équipement, déposer un rapport ou ajouter un salarié se fait depuis la page concernée, en quelques champs.";

const TRANSPARENT =
  "Chaque obligation cite son article (Code du travail, règlement de sécurité ERP, norme) avec un lien vers Légifrance. Quand un texte ne fixe pas de rythme, Rojer l'écrit.";

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
        <div className="mt-20 grid grid-cols-1 items-center gap-12 sm:mt-28 lg:grid-cols-[0.6fr_1.4fr] lg:gap-20">
          <Reveal>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--board-blue-ink)]">
              Simple
            </p>
            <h3 className="lp-titre mt-3.5 text-[clamp(1.5rem,2.2vw,1.9rem)]">
              Simple à utiliser
            </h3>
            <p className="lp-texte mt-3.5 max-w-[42ch]">
              {SIMPLE}
            </p>
          </Reveal>

          <Reveal delai={120}>
            <div className="overflow-hidden rounded-[26px] bg-[color:var(--board-card)] shadow-[0_0_0_1px_rgba(13,18,36,0.05),0_2px_4px_rgba(13,18,36,0.04),0_16px_32px_-18px_rgba(13,18,36,0.18),0_56px_90px_-56px_rgba(13,18,36,0.42)]">
              <ExtraitVideo
                src="/videos/visite-equipements.mp4"
                poster="/videos/visite-equipements.jpg"
                debut={30}
                fin={47}
                label="Démonstration : dépôt du rapport des extincteurs et calcul de la prochaine échéance"
              />
            </div>
          </Reveal>
        </div>

        {/* 2 · Transparent : l'illustration, puis le texte */}
        <div className="mt-28 grid grid-cols-1 items-center gap-12 sm:mt-40 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <Reveal className="lg:order-2">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--board-blue-ink)]">
              Transparent
            </p>
            <h3 className="lp-titre mt-3.5 text-[clamp(1.5rem,2.2vw,1.9rem)]">
              Transparent sur ses sources
            </h3>
            <p className="lp-texte mt-3.5 max-w-[42ch]">
              {TRANSPARENT}
            </p>
            <span className="mt-5 inline-flex rounded-full bg-[color:var(--board-card)] px-3.5 py-2 font-mono text-[0.7rem] tracking-[0.04em] text-[color:var(--board-ink)] shadow-[0_0_0_1px_rgba(10,10,10,0.08)]">
              1 fois par an (choix de Rojer)
            </span>
          </Reveal>

          <Reveal delai={120} className="lg:order-1">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[30px] bg-[color:var(--board-blue-pale)] lg:rounded-[38px]">
              <Image
                src="/illustrations/landing/transparence-sources.jpg"
                alt=""
                fill
                sizes="(max-width: 1023px) 92vw, 55vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
