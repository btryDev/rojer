import {
  IBM_Plex_Sans,
  Instrument_Sans,
  JetBrains_Mono,
  Instrument_Serif,
} from "next/font/google";

/**
 * Les quatre polices de l'application, chargées une fois et posées sur
 * `<html>` par la mise en page racine ET par `global-error.tsx`, qui la
 * remplace quand elle tombe et doit porter son propre document.
 */

const plexSans = IBM_Plex_Sans({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

// Face de titrage. IBM Plex Sans tient l'interface ; les titres de la page
// publique et les chiffres du cadran sont posés en Instrument Sans — grotesque
// serré, même atelier qu'Instrument Serif déjà présent. La marque parle d'une
// voix un peu plus haute que l'application, sans en changer.
const instrumentSans = Instrument_Sans({
  variable: "--font-titre",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

/** Les variables CSS des quatre polices, à poser sur `<html>`. */
export const variablesPolices = `${plexSans.variable} ${instrumentSans.variable} ${jetbrains.variable} ${instrument.variable}`;
