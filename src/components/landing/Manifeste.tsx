// LA BANDE NOIRE — la phrase de marque, puis ce que Rojer apporte.
//
// Partage éditorial de la page, pour qu'aucune section ne répète l'autre :
//   · ici       → ce que Rojer vous apporte (pas comment il marche)
//   · le cadran → ce que ça produit (les six documents)
//   · « Un outil simple et transparent » → l'usage et les sources
//   · le tarif → ce que ça coûte
//
// Chaque apport dit ce que Rojer fait, sans accroche et sans automatisme :
// on ne dit pas qu'un rapport « se range tout seul », ni qu'un rappel part.

import photoManifeste from "@/assets/landing/manifeste-boulangere.jpg";
import { PhotoCadre, type PhotoLanding } from "./PhotoCadre";
import { Reveal } from "./Reveal";

/**
 * La photo de la section. Une commerçante avec une cliente : la cible au
 * travail, pas devant un écran. Cf. `src/assets/landing/README.md`.
 */
const PHOTO_MANIFESTE: PhotoLanding = {
  src: photoManifeste,
  alt: "Une boulangère en tablier marine tend un pain à une cliente par-dessus le comptoir",
  position: "55% 40%",
};

const APPORTS = [
  {
    numero: "01",
    titre: "Une saisie guidée",
    corps:
      "Le DUERP part des risques connus de votre métier, d'après les guides de l'INRS. Les équipements se choisissent dans une liste.",
  },
  {
    numero: "02",
    titre: "Vos documents au même endroit",
    corps:
      "Rapports, attestations et analyses sont rangés et horodatés. Le jour d'un contrôle, ils sortent en un seul export.",
  },
  {
    numero: "03",
    titre: "Les échéances calculées",
    corps:
      "Rojer calcule la date de chaque vérification à partir du texte qui en fixe le rythme. Le tableau de bord montre ce qui est en retard et ce qui approche.",
  },
  {
    numero: "04",
    titre: "Un expert en cas de besoin",
    corps:
      "Avec les offres Pro et Sur mesure, un expert en sécurité répond à vos questions sur une obligation ou un rapport.",
  },
];

export function Manifeste() {
  return (
    <section id="avantages" className="bg-[color:var(--board-ink)] py-24 text-white sm:py-32">
      <div className="lp-shell">
        <Reveal>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/45">
            Le principe
          </p>
        </Reveal>

        <Reveal delai={90}>
          <h2 className="lp-titre lp-h1 mt-7 text-white lg:whitespace-nowrap">
            Concentrez-vous sur votre activité
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 items-center gap-14 md:grid-cols-[0.85fr_1.15fr] md:gap-10 lg:gap-[clamp(56px,8vw,140px)]">
          <Reveal>
            <PhotoCadre photo={PHOTO_MANIFESTE} fond="rgba(255,255,255,0.05)" />
          </Reveal>

          <ol className="m-0 list-none p-0">
            {APPORTS.map((a, i) => (
              <Reveal
                as="li"
                key={a.numero}
                delai={i * 90}
                className="flex gap-5 border-t border-white/10 py-7 last:border-b"
              >
                <span className="flex size-9 flex-none items-center justify-center rounded-full border border-white/20 font-mono text-[0.68rem] text-[color:var(--board-sky)]">
                  {a.numero}
                </span>
                <div>
                  <h3 className="lp-titre lp-h3 text-[color:var(--board-sky)]">
                    {a.titre}
                  </h3>
                  <p className="mt-2 max-w-[44ch] text-[0.9375rem] leading-[1.62] text-white/60">
                    {a.corps}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
