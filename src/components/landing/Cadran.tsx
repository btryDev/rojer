"use client";

// LE CADRAN — signature de la page.
//
// Six documents, six crans. La roue tourne au défilement : le cran actif
// vient se poser à l'horizontale, à gauche du texte, et les voisins
// s'inclinent sur l'arc. Les chiffres repèrent la position dans le
// défilement, rien de plus : les six pièces ne se produisent PAS dans cet
// ordre (le calendrier naît à l'onboarding avant le DUERP, le registre
// d'accessibilité ne dépend de rien), et la page ne le prétend pas.
//
// Deux rendus : la roue (grand écran, mouvement autorisé) et une liste
// verticale sobre (petit écran ou `prefers-reduced-motion`). Le contenu
// est le même, écrit une seule fois.

import { useEffect, useRef, useState } from "react";

type Document = {
  numero: string;
  famille: string;
  titre: string;
  corps: string;
  reperes: string[];
};

// L'ORDRE EST UN PROPOS, et il a changé le 2026-09-01. Le DUERP ouvrait la
// liste ; c'est le calendrier qui l'ouvre désormais. Le DUERP reste le
// document que le dirigeant connaît de nom, mais il n'est plus le centre du
// produit — et une page d'accueil qui le place en premier promet un
// générateur de document là où le produit tient un suivi continu. C'est aussi
// l'ordre du réel : le calendrier se remplit dès la déclaration des
// équipements, le DUERP s'ouvre ensuite.
const DOCUMENTS: Document[] = [
  {
    numero: "01",
    famille: "Échéances",
    titre: "Le calendrier des vérifications",
    corps: "Vous déclarez vos équipements une fois. Rojer en déduit les contrôles obligatoires, pose les dates et les repousse à mesure que les rapports arrivent.",
    // Compté sur `obligationsConformite` (src/lib/referentiels/conformite).
    // À recompter quand le référentiel s'étend — un chiffre faux sur une
    // page publique se paie plus cher que pas de chiffre du tout.
    reperes: ["154 obligations · 21 domaines", "Sources Légifrance et INRS"],
  },
  {
    numero: "02",
    famille: "Évaluation",
    titre: "Le DUERP",
    corps: "L'inventaire des risques, unité de travail par unité de travail, coté et daté. Chaque validation fige une version — c'est celle-là qu'on vous demandera.",
    reperes: ["Mise à jour annuelle", "Conservé 40 ans"],
  },
  {
    numero: "03",
    famille: "Preuve",
    titre: "Le registre de sécurité",
    corps: "Chaque rapport est horodaté et rangé à côté de l'échéance qu'il solde. Vous le déposez une fois : il reste retrouvable, et il part avec l'export.",
    reperes: ["Rapports horodatés", "Export consolidé"],
  },
  {
    numero: "04",
    famille: "Suivi",
    titre: "Le plan d'actions",
    corps: "Un rond vide n'est pas une faute : c'est ce qu'il reste à faire. Chaque écart ouvre une action, avec un responsable et une date.",
    reperes: ["Hiérarchie des mesures", "Revu au fil de l'eau"],
  },
  {
    numero: "05",
    famille: "Public",
    titre: "Le registre d'accessibilité",
    corps: "La page publique de votre établissement, l'attestation, l'affiche à QR code à coller à l'entrée. Prête à imprimer, jamais périmée.",
    reperes: ["Page publique", "Affiche QR"],
  },
  {
    numero: "06",
    famille: "Restitution",
    titre: "Le dossier de contrôle",
    corps: "Inspection, assurance, bailleur, acquéreur : une archive datée avec l'index des pièces. Un clic, pas une soirée.",
    reperes: ["Export en une fois", "Index des pièces"],
  },
];

/** Écart angulaire entre deux crans, en degrés. */
const ANGLE = 26;
/** Rayon de la roue, en pixels. */
const RAYON = 460;
/** Hauteur de défilement consommée par cran, en unités de viewport. */
const CRAN_VH = 62;
/** Rallonge après le dernier cran : sans elle, le sixième document
 *  arriverait à l'instant où la section commence à sortir de l'écran —
 *  on le verrait passer sans jamais le lire. */
const QUEUE_VH = 60;
/** La roue n'occupe plus toute la largeur : elle vit dans une carte bleue
 *  posée sur le fond de page, sous un titre qui reste en place. Titre et
 *  carte tiennent ensemble dans un écran : la carte prend simplement la
 *  hauteur qui reste. */
/** Hauteur de carte pour laquelle la roue a été dessinée. En dessous, on
 *  la met à l'échelle plutôt que de laisser les crans hauts et bas se
 *  faire couper par les bords arrondis. */
const CARTE_REF_PX = 780;
/** Hauteur de la barre de navigation, elle aussi collante en haut : le
 *  panneau du cadran se cale juste en dessous. Cf. `LandingHeader`. */
const ENTETE_PX = 68;

export function Cadran() {
  const piste = useRef<HTMLDivElement | null>(null);
  const carte = useRef<HTMLDivElement | null>(null);
  // Position continue sur la roue : 0 = premier cran, 5 = dernier.
  const [pos, setPos] = useState(0);
  // Facteur d'échelle de la roue, déduit de la hauteur réelle de la carte.
  const [echelleRoue, setEchelleRoue] = useState(1);
  // `simple` : petit écran ou mouvement réduit — on sert la liste.
  const [simple, setSimple] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      "(prefers-reduced-motion: reduce), (max-width: 1023px)",
    );
    const sync = () => setSimple(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (simple) return;
    let frame = 0;
    const mesurer = () => {
      frame = 0;
      const el = piste.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const h = carte.current?.clientHeight ?? 0;
      if (h > 0) {
        setEchelleRoue(Math.min(1, Math.max(0.52, h / CARTE_REF_PX)));
      }
      // La rotation se joue sur la piste moins le panneau collant et moins
      // la rallonge : le dernier cran est donc atteint avant que la section
      // ne s'en aille. Le zéro est pris quand le panneau vient se coller
      // sous la barre de navigation, pas quand il touche le haut de page.
      const course =
        rect.height -
        (window.innerHeight - ENTETE_PX) -
        (QUEUE_VH / 100) * window.innerHeight;
      if (course <= 0) return;
      const p = Math.min(1, Math.max(0, (ENTETE_PX - rect.top) / course));
      setPos(p * (DOCUMENTS.length - 1));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(mesurer);
    };
    mesurer();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [simple]);

  if (simple) return <CadranListe />;

  const actif = Math.round(pos);
  const avancement = pos / (DOCUMENTS.length - 1);

  return (
    <section
      id="documents"
      aria-labelledby="documents-titre"
      className="bg-[color:var(--board-card)]"
    >
      <div
        ref={piste}
        style={{
          height: `calc(100vh - ${ENTETE_PX}px + ${(DOCUMENTS.length - 1) * CRAN_VH + QUEUE_VH}vh)`,
        }}
      >
        {/* Tout tient dans un écran : le titre en haut à gauche reste en
            place, la carte bleue occupe la hauteur qui reste. */}
        <div
          className="sticky flex flex-col pb-6 pt-16 sm:pt-20"
          style={{
            top: `${ENTETE_PX}px`,
            height: `calc(100vh - ${ENTETE_PX}px)`,
          }}
        >
          <header className="lp-shell shrink-0">
            {/* Le titre tient sur une seule ligne : c'est une phrase, pas
                un bloc à casser. */}
            <h2
              id="documents-titre"
              className="lp-titre lp-h2 whitespace-nowrap"
            >
              Ce que Rojer tient à jour
            </h2>
            <p className="lp-lede mt-4 max-w-[72ch]">
              Six documents que vous ne rédigez pas : ils se remplissent au fil
              de ce que vous déclarez et des rapports que vous déposez.
            </p>
          </header>

          <div className="lp-shell mt-7 min-h-0 flex-1">
            <div
              ref={carte}
              className="relative h-full overflow-hidden rounded-[36px] bg-[color:var(--board-sky)]"
            >
              {/* La roue. Centre du cercle hors champ à gauche : seul l'arc
                  droit entre dans la carte. Les repères sont des
                  pourcentages de la carte, plus des `vw` : la carte ne fait
                  plus la largeur de la fenêtre. */}
              <div
                aria-hidden
                className="absolute top-1/2 hidden lg:block"
                style={{
                  left: `calc(13% - ${RAYON * echelleRoue}px)`,
                  transform: `scale(${echelleRoue})`,
                  transformOrigin: "0 0",
                }}
              >
                <svg
                  width={RAYON * 2 + 4}
                  height={RAYON * 2 + 4}
                  viewBox={`0 0 ${RAYON * 2 + 4} ${RAYON * 2 + 4}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: 0, top: 0 }}
                >
                  <circle
                    cx={RAYON + 2}
                    cy={RAYON + 2}
                    r={RAYON - 66}
                    fill="none"
                    stroke="rgba(10,10,10,.14)"
                    strokeWidth="1"
                  />
                </svg>

                {DOCUMENTS.map((d, i) => {
                  const ecart = i - pos;
                  const distance = Math.abs(ecart);
                  const echelle = Math.max(
                    0.42,
                    1 - Math.min(distance, 2.4) * 0.24,
                  );
                  return (
                    <div key={d.numero}>
                      {/* Le point du cran, posé sur l'arc. */}
                      <span
                        className="absolute left-0 top-0 block size-[7px] rounded-full"
                        style={{
                          transform: `rotate(${ecart * ANGLE}deg) translateX(${RAYON - 66}px) translate(-50%,-50%)`,
                          transformOrigin: "0 0",
                          background:
                            distance < 0.5
                              ? "var(--board-ink)"
                              : "rgba(10,10,10,.28)",
                          opacity: distance > 3 ? 0 : 1,
                          transition:
                            "background-color 300ms ease, opacity 300ms ease",
                        }}
                      />
                      {/* Le chiffre, incliné le long de l'arc. */}
                      <span
                        className="absolute left-0 top-0 block select-none whitespace-nowrap font-semibold tabular-nums"
                        style={{
                          fontFamily: "var(--font-titre), sans-serif",
                          fontSize: "clamp(64px, 8vw, 118px)",
                          letterSpacing: "-0.05em",
                          lineHeight: 1,
                          transform: `rotate(${ecart * ANGLE}deg) translateX(${RAYON}px) translateY(-50%) scale(${echelle})`,
                          transformOrigin: "0 0",
                          color:
                            distance < 0.5
                              ? "var(--board-ink)"
                              : "var(--board-card)",
                          opacity:
                            distance < 0.5
                              ? 1
                              : Math.max(0, 0.9 - distance * 0.22),
                          transition: "color 260ms ease",
                        }}
                      >
                        {d.numero}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Le texte du cran actif. Les six panneaux sont empilés :
                  celui qui est actif monte, les autres s'effacent. Le `pb`
                  mange le bas du bloc centré — le texte se cale donc un
                  peu au-dessus du milieu de la carte.

                  Le passage est SÉQUENTIEL, pas un fondu croisé. Les deux
                  panneaux partageaient la même durée de 500 ms : le sortant
                  passait en absolu d'un coup, se superposait à l'entrant et
                  restait lisible tout du long — on lisait « Le DUERP e de
                  sécurité », les deux titres l'un dans l'autre. Le sortant
                  s'efface donc vite, et l'entrant n'arrive qu'après lui. */}
              <div className="flex h-full items-center pb-[7vh] pl-[42%] pr-[7%]">
                <div className="relative w-full max-w-[520px]">
                  {DOCUMENTS.map((d, i) => {
                    const ici = i === actif;
                    return (
                      <article
                        key={d.numero}
                        aria-hidden={!ici}
                        className={
                          "transition-[opacity,transform] ease-[cubic-bezier(.16,1,.3,1)] " +
                          (ici
                            ? "relative z-10 translate-y-0 opacity-100 delay-[160ms] duration-[380ms]"
                            : "pointer-events-none absolute inset-0 translate-y-2 opacity-0 delay-0 duration-[140ms]")
                        }
                      >
                        <p className="lp-eyebrow">{d.famille}</p>
                        <h3 className="lp-titre lp-h2 mt-3">{d.titre}</h3>
                        <p className="lp-lede mt-3 max-w-[42ch]">{d.corps}</p>
                        <div className="mt-6 flex flex-wrap gap-2">
                          {d.reperes.map((r) => (
                            <span
                              key={r}
                              className="lp-pill bg-[color:var(--board-card)] text-[color:var(--board-blue-ink)]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Avancement — le seul repère de position, discret.

                  La barre garde toute la largeur : elle mesure la carte
                  entière. La LÉGENDE, elle, se range sous la colonne de
                  texte, à l'aplomb du panneau (`pl-[42%]` ci-dessus). Posée
                  à 7 %, elle tombait sous l'arc de la roue, où le chiffre du
                  cran suivant — « 04 » quand « 02 » est actif — descend la
                  recouvrir. */}
              <div className="absolute inset-x-0 bottom-6">
                <div className="mx-[7%] h-px bg-[rgba(10,10,10,.16)]">
                  <div
                    className="h-px bg-[color:var(--board-ink)] transition-[width] duration-150 ease-linear"
                    style={{ width: `${Math.round(avancement * 100)}%` }}
                  />
                </div>
                <p className="ml-[42%] mr-[7%] mt-3 text-[0.78rem] text-[color:var(--board-slate-ink)]">
                  Faites défiler — la roue tourne, chaque document prend la
                  parole.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Rendu sobre — petit écran, ou mouvement réduit ─────────── */

function CadranListe() {
  return (
    <section
      id="documents"
      aria-labelledby="documents-titre"
      className="bg-[color:var(--board-card)] pb-20 pt-24 sm:pb-24 sm:pt-28"
    >
      <div className="lp-shell">
        <h2
          id="documents-titre"
          className="lp-titre lp-h2 sm:whitespace-nowrap"
        >
          Ce que Rojer tient à jour
        </h2>
        <p className="lp-lede mt-4 max-w-[72ch]">
          Six documents que vous ne rédigez pas : ils se remplissent au fil de
          ce que vous déclarez et des rapports que vous déposez.
        </p>
        <ol className="m-0 mt-12 flex list-none flex-col gap-10 rounded-[28px] bg-[color:var(--board-sky)] p-6 sm:mt-14 sm:gap-12 sm:p-10">
          {DOCUMENTS.map((d) => (
            <li
              key={d.numero}
              className="grid grid-cols-1 gap-3 border-t border-[rgba(10,10,10,.16)] pt-6 first:border-t-0 first:pt-0 sm:grid-cols-[88px_1fr] sm:gap-8"
            >
              <span
                className="text-[2.4rem] font-semibold leading-none tabular-nums text-[color:var(--board-ink)]"
                style={{
                  fontFamily: "var(--font-titre), sans-serif",
                  letterSpacing: "-0.05em",
                }}
              >
                {d.numero}
              </span>
              <div>
                <p className="lp-eyebrow">{d.famille}</p>
                <h3 className="lp-titre lp-h3 mt-2">{d.titre}</h3>
                <p className="lp-texte mt-2 max-w-[52ch]">{d.corps}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {d.reperes.map((r) => (
                    <span
                      key={r}
                      className="lp-pill bg-[color:var(--board-card)] text-[color:var(--board-blue-ink)]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
