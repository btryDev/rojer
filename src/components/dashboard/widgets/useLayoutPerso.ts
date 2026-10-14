"use client";

// Persistance du layout perso du tableau de bord, dans un cookie par
// établissement (`cookie-layout.ts`) que le serveur lit pour rendre
// d'emblée la bonne disposition. L'ancienne clé `localStorage`
// `duerp.dashboard.<etablissementId>` n'est plus que relue, une fois, pour
// reprendre une disposition faite avant le cookie.
// Schéma versionné — quand la structure change, on incrémente
// SCHEMA_VERSION et on fournit une fonction de migration dans
// `migrerLayout`. Les clients obsolètes retombent sur les défauts
// plutôt que de crasher.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  REGISTRY,
  layoutParDefaut,
  variantValide,
  type WidgetId,
} from "./registry";
import { cheminCookieLayout, nomCookieLayout } from "./cookie-layout";
import type { LayoutItem, PersistedLayout } from "./types";

export const SCHEMA_VERSION = 3;

/** Ancienne clé `localStorage`, relue seulement pour la reprise. */
function cleStorage(etablissementId: string): string {
  return `duerp.dashboard.${etablissementId}`;
}

/**
 * Épingle les widgets obligatoires : chacun est replacé (ou injecté
 * s'il manque) juste après le dernier widget présent qui le précède
 * dans l'ordre du board par défaut — en tête si aucun. Pour le widget
 * équipements, ça veut dire : toujours juste sous le calendrier.
 * L'ordre choisi par l'utilisateur est conservé pour tout le reste.
 */
function epingler(items: LayoutItem[]): LayoutItem[] {
  const resultat = items.filter((it) => !REGISTRY[it.widgetId].obligatoire);
  const ordreDefaut = layoutParDefaut().map((it) => it.widgetId);

  // Les obligatoires sont réinsérés dans l'ordre du board par défaut —
  // pas dans l'ordre des clés du registre, qui n'engage rien.
  const obligatoires = Object.values(REGISTRY)
    .filter((def) => def.obligatoire)
    .sort(
      (a, b) => ordreDefaut.indexOf(a.id) - ordreDefaut.indexOf(b.id),
    );

  for (const def of obligatoires) {
    const variant =
      items.find((it) => it.widgetId === def.id)?.variant ??
      def.defaultVariant;
    const position = ordreDefaut.indexOf(def.id);
    const precedents = new Set(
      position === -1 ? [] : ordreDefaut.slice(0, position),
    );
    let ancre = -1;
    for (let i = resultat.length - 1; i >= 0; i--) {
      if (precedents.has(resultat[i].widgetId)) {
        ancre = i;
        break;
      }
    }
    resultat.splice(ancre + 1, 0, { widgetId: def.id, variant });
  }

  return resultat;
}

/**
 * Normalise un layout lu depuis le storage :
 *  - filtre les widgetId inconnus du registre courant (nettoyage lent)
 *  - remplace les variants inexistants par le variant par défaut
 *  - épingle les widgets obligatoires (voir `epingler`)
 *  - conserve l'ordre utilisateur pour le reste
 */
function normaliser(items: LayoutItem[]): LayoutItem[] {
  const valides = items
    .filter(
      (it): it is LayoutItem => typeof it?.widgetId === "string" && it.widgetId in REGISTRY,
    )
    .map((it) => {
      const def = REGISTRY[it.widgetId];
      const variant = variantValide(def, it.variant)
        ? it.variant
        : def.defaultVariant;
      return { widgetId: it.widgetId, variant };
    });

  return epingler(valides);
}

/**
 * v2 → v3 : les cartes-compteur « Prochaine échéance » (countdown) et
 * « Actions en retard » sont fusionnées dans la liste « À faire ».
 * On remplace la première des deux par « à-faire » à sa position et on
 * retire l'autre — le reste de l'ordre utilisateur est conservé. Si
 * l'utilisateur avait retiré les deux, on respecte ce choix : rien
 * n'est injecté.
 */
function migrerV2VersV3(items: LayoutItem[]): LayoutItem[] {
  const fusionnes = new Set<string>(["countdown", "actions-retard"]);
  let remplace = false;
  const resultat: LayoutItem[] = [];
  for (const it of items) {
    if (typeof it?.widgetId === "string" && fusionnes.has(it.widgetId)) {
      if (!remplace) {
        resultat.push({ widgetId: "a-faire", variant: "default" });
        remplace = true;
      }
      continue;
    }
    resultat.push(it);
  }
  return resultat;
}

/**
 * Migre un layout hérité d'une ancienne version de schéma.
 *
 * v1 → v2 : refonte du tableau de bord en « board éditorial ». Plusieurs
 * widgets ont changé de propos sous le même id (la frise, le plan
 * d'actions, les documents), si bien qu'un layout v1 réordonné par
 * l'utilisateur ne décrit plus la même chose. On le laisse donc expirer :
 * les versions inconnues retombent sur le layout par défaut, c'est-à-dire
 * le board. Une personnalisation faite après coup, elle, est conservée.
 */
function migrerLayout(brut: unknown): PersistedLayout | null {
  if (!brut || typeof brut !== "object") return null;
  const obj = brut as { version?: unknown; items?: unknown };
  if (typeof obj.version !== "number") return null;
  if (!Array.isArray(obj.items)) return null;

  // Version courante : pass-through (après normalisation).
  if (obj.version === SCHEMA_VERSION) {
    return {
      version: SCHEMA_VERSION,
      items: normaliser(obj.items as LayoutItem[]),
    };
  }

  // v2 : même grammaire de board, seule la fusion « À faire » change.
  if (obj.version === 2) {
    return {
      version: SCHEMA_VERSION,
      items: normaliser(migrerV2VersV3(obj.items as LayoutItem[])),
    };
  }

  // Versions antérieures : pas de migration, retour au layout par défaut.
  return null;
}

/** Lit la valeur du cookie (déjà décodée par Next côté serveur). Même
 *  entrée, même sortie au serveur et à l'hydratation : pas de désaccord. */
function lireLayoutCookie(valeur: string | null): PersistedLayout | null {
  if (!valeur) return null;
  try {
    return migrerLayout(JSON.parse(valeur));
  } catch {
    return null;
  }
}

const UN_AN_EN_SECONDES = 60 * 60 * 24 * 365;

function ecrireLayoutCookie(etablissementId: string, layout: PersistedLayout) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${nomCookieLayout(etablissementId)}=${encodeURIComponent(JSON.stringify(layout))}` +
    `; Path=${cheminCookieLayout(etablissementId)}` +
    `; Max-Age=${UN_AN_EN_SECONDES}; SameSite=Lax${secure}`;
}

/** Reprise, une fois, d'une disposition enregistrée avant le cookie. La
 *  clé est retirée : le cookie, écrit juste après, prend le relais. */
function reprendreDuStorage(etablissementId: string): PersistedLayout | null {
  try {
    const raw = window.localStorage.getItem(cleStorage(etablissementId));
    if (!raw) return null;
    window.localStorage.removeItem(cleStorage(etablissementId));
    return migrerLayout(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function useLayoutPerso(
  etablissementId: string,
  layoutCookie: string | null,
) {
  // Le premier rendu — serveur et hydratation — part du cookie : la
  // disposition affichée est d'emblée la bonne.
  const [layout, setLayout] = useState<PersistedLayout>(
    () =>
      lireLayoutCookie(layoutCookie) ?? {
        version: SCHEMA_VERSION,
        items: layoutParDefaut(),
      },
  );
  const initialise = useRef(false);

  // Sans cookie seulement : reprise d'une disposition du `localStorage`
  // (avant B9). Elle ne peut se lire qu'après montage — c'est le seul cas
  // où la disposition change encore après le premier affichage, une fois.
  useEffect(() => {
    if (layoutCookie === null) {
      const repris = reprendreDuStorage(etablissementId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (repris) setLayout(repris);
    }
    initialise.current = true;
  }, [etablissementId, layoutCookie]);

  // Écriture : après montage, chaque changement part dans le cookie.
  useEffect(() => {
    if (!initialise.current) return;
    ecrireLayoutCookie(etablissementId, layout);
  }, [etablissementId, layout]);

  const actif = useMemo(
    () => new Set(layout.items.map((it) => it.widgetId)),
    [layout],
  );

  const ajouter = useCallback((widgetId: WidgetId) => {
    setLayout((l) => {
      if (l.items.some((it) => it.widgetId === widgetId)) return l;
      const def = REGISTRY[widgetId];
      if (!def) return l;
      return {
        ...l,
        items: [...l.items, { widgetId, variant: def.defaultVariant }],
      };
    });
  }, []);

  const retirer = useCallback((widgetId: WidgetId) => {
    setLayout((l) => {
      // Garde-fou : les widgets obligatoires ne sont jamais retirés.
      if (REGISTRY[widgetId]?.obligatoire) return l;
      return {
        ...l,
        items: l.items.filter((it) => it.widgetId !== widgetId),
      };
    });
  }, []);

  const changerVariant = useCallback(
    (widgetId: WidgetId, variant: string) => {
      setLayout((l) => ({
        ...l,
        items: l.items.map((it) =>
          it.widgetId === widgetId ? { ...it, variant } : it,
        ),
      }));
    },
    [],
  );

  /** Remplace l'ordre des items par l'array fourni (typiquement
   *  retourné par @dnd-kit `arrayMove`). L'épinglage garantit que les
   *  widgets obligatoires gardent leur place quel que soit le drag. */
  const reordonner = useCallback((items: LayoutItem[]) => {
    setLayout((l) => ({ ...l, items: epingler(items) }));
  }, []);

  const reinitialiser = useCallback(() => {
    setLayout({ version: SCHEMA_VERSION, items: layoutParDefaut() });
  }, []);

  return {
    layout,
    actif,
    ajouter,
    retirer,
    changerVariant,
    reordonner,
    reinitialiser,
  };
}

// Exports pour les tests unitaires
export const __internal = { migrerLayout, normaliser, lireLayoutCookie };
