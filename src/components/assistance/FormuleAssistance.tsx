"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * La formule Pro du compte, pour les encarts « Besoin d'aide ? » posés dans
 * les écrans (ADR-050, amendée le 2026-11-24) : une question de prévention
 * y ouvre le formulaire en Pro, et la présentation de la formule Pro sinon.
 * Posée par les coquilles du dossier (établissement, DUERP), qui la lisent
 * une fois par rendu ; hors d'elles (la mise en place), elle vaut « non ».
 */
const ContexteFormule = createContext(false);

export function FormuleAssistance({ pro, children }: { pro: boolean; children: ReactNode }) {
  return <ContexteFormule.Provider value={pro}>{children}</ContexteFormule.Provider>;
}

export function useAssistancePro(): boolean {
  return useContext(ContexteFormule);
}
