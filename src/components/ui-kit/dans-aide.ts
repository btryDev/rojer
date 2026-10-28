"use client";

import { createContext } from "react";

/**
 * Vrai dans le panneau d'une aide d'écran (`AideEcran`). On y est venu pour
 * lire : un livre `Textes` s'y présente ouvert, plutôt que de demander un
 * second clic dans une modal déjà ouverte.
 */
export const DansAide = createContext(false);
