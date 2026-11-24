/**
 * Le logo « Rojer » (décision de la propriétaire du 2026-11-24) : IBM Plex
 * Sans, graisse 600, interlettrage -0,06 em, point du j ROND — Plex le dessine
 * carré. Un seul chemin, tiré des contours de la police embarquée par
 * `scripts/marque/logo-rojer.py` : à relancer si ces règles changent, jamais
 * à retoucher à la main. Le même dessin sert de logo dans Stripe.
 *
 * - Couleur : celle du texte (`currentColor`).
 * - Taille : la viewBox va du haut du point du j au bas de son jambage, soit
 *   0,953 em ; `h-[0.953em]` le met à l'échelle du texte voisin.
 * - Décoratif : le lien qui l'entoure porte le nom accessible.
 */
export function LogoRojer({ className }: { className?: string }) {
  return (
    <svg
      viewBox="82 -753 2111 953"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M214 -269V0H82V-698H397Q461 -698 507 -671Q553 -645 578 -597Q603 -548 603 -482Q603 -411 571 -358Q538 -306 473 -284L616 0H469L339 -269ZM214 -380H384Q410 -380 428 -389Q446 -399 456 -416Q466 -434 466 -459V-505Q466 -531 456 -548Q446 -565 428 -574Q410 -583 384 -583H214ZM885 12Q811 12 757 -22Q702 -55 673 -117Q643 -178 643 -262Q643 -346 673 -406Q702 -467 757 -501Q811 -534 885 -534Q960 -534 1014 -501Q1069 -467 1098 -406Q1128 -346 1128 -262Q1128 -178 1098 -117Q1069 -55 1014 -22Q960 12 885 12ZM885 -91Q936 -91 965 -123Q994 -154 994 -213V-310Q994 -369 965 -400Q936 -431 885 -431Q836 -431 807 -400Q777 -369 777 -310V-213Q777 -154 807 -123Q836 -91 885 -91ZM1181 98V-522H1309V63Q1309 128 1276 164Q1243 200 1171 200H1101V98ZM1607 12Q1530 12 1475 -22Q1420 -55 1391 -117Q1361 -178 1361 -262Q1361 -344 1390 -405Q1419 -467 1473 -500Q1527 -534 1603 -534Q1685 -534 1737 -498Q1790 -462 1815 -402Q1841 -343 1841 -271V-229H1494V-216Q1494 -160 1526 -125Q1558 -90 1621 -90Q1668 -90 1699 -111Q1730 -131 1754 -161L1823 -84Q1791 -41 1735 -14Q1680 12 1607 12ZM1605 -438Q1571 -438 1546 -422Q1521 -407 1508 -380Q1494 -352 1494 -316V-308H1708V-317Q1708 -354 1696 -381Q1684 -407 1661 -423Q1638 -438 1605 -438ZM2022 0H1894V-522H2022V-414H2027Q2034 -442 2050 -466Q2067 -491 2096 -507Q2124 -522 2165 -522H2193V-401H2153Q2110 -401 2080 -393Q2051 -384 2036 -367Q2022 -349 2022 -320ZM1164 -672a81 81 0 1 0 162 0a81 81 0 1 0 -162 0Z" />
    </svg>
  );
}
