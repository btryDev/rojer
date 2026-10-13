import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import type { TypologieApplication } from "@/lib/referentiels/types-communs";
import {
  CRITERES_TYPOLOGIE,
  releveDe,
  texteTypologie,
} from "./textes-grille-relecture";

describe("texteTypologie — la ligne « Régime » de la grille de relecture", () => {
  it("instructions d'évacuation (R. 4227-37 al. 2) : la ligne dit « moins de 51 », jamais « au moins 51 »", () => {
    const o = obligationsConformite.find(
      (x) => x.id === "incendie-travail-instructions-evacuation",
    );
    expect(o?.typologies.horsChampR422734).toBe(true);
    const ligne = texteTypologie(o!.typologies);
    expect(ligne).not.toMatch(/au moins \d+ personnes/);
    expect(ligne).toContain(`moins de ${o!.typologies.personnesPresentesMin} personnes présentes`);
    expect(ligne).toContain("« non »");
  });

  it("la consigne, dans le champ de R. 4227-34, garde « au moins 51 … ou matières »", () => {
    const ligne = texteTypologie({
      travail: true,
      personnesPresentesMin: 51,
      champR422734: true,
    });
    expect(ligne).toBe("Travail · au moins 51 personnes présentes · ou matières R. 4227-22");
  });

  // Pas de liste de clés recopiée ici : le compilateur tient l'exhaustivité
  // (`Required<TypologieApplication>` dans le module). Ce test-ci tient l'autre
  // moitié — qu'une clé RENDUE ne le soit pas par un `null` de convenance —, sur
  // les typologies que le référentiel écrit réellement.
  it("retirer n'importe quel critère d'une typologie du référentiel change sa ligne", () => {
    const tues: string[] = [];
    let essais = 0;
    for (const o of obligationsConformite) {
      for (const k of Object.keys(o.typologies) as (keyof TypologieApplication)[]) {
        const sans = { ...o.typologies };
        delete sans[k];
        essais++;
        if (texteTypologie(sans) === texteTypologie(o.typologies)) {
          tues.push(`${o.id} : ${k}`);
        }
      }
    }
    expect(essais).toBeGreaterThan(obligationsConformite.length);
    expect(tues).toEqual([]);
  });

  it("chaque critère du référentiel figure parmi les critères rendus", () => {
    const rendus = new Set<string>(CRITERES_TYPOLOGIE);
    const ecrits = new Set(obligationsConformite.flatMap((o) => Object.keys(o.typologies)));
    expect([...ecrits].filter((k) => !rendus.has(k))).toEqual([]);
  });

  it("les critères sans obligation porteuse aujourd'hui ont aussi leur phrase", () => {
    expect(texteTypologie({ travail: false })).toBe("hors Travail");
    expect(texteTypologie({ igh: false })).toBe("hors IGH");
    expect(texteTypologie({ habitation: false })).toBe("hors habitation");
    expect(texteTypologie({ habitation: { familles: ["DEUXIEME"] } })).toBe(
      "Habitation (DEUXIEME)",
    );
    expect(texteTypologie({ horsChampR422734: true })).toContain("hors champ de R. 4227-34");
    expect(texteTypologie({ champR422734: true })).toBe("ou matières R. 4227-22");
  });
});

describe("releveDe — le relevé imprimé sous chaque référence", () => {
  // L'identité est exigée sur TOUTES les références citées, sans liste
  // recopiée ; R. 4121-4 est nommé parce que c'est le doublon dont le relevé
  // change à l'impression (citation présente ou absente).
  it("est celui de l'index canonique, pour toute référence citée — doublons de corpus compris", () => {
    const index = indexArticlesParRef();
    const refs = obligationsConformite.flatMap((o) => o.referencesLegales);
    const ecarts = refs
      .filter((r) => releveDe(r) !== (r.article ? index.get(r.article)?.article : undefined))
      .map((r) => r.article);
    expect(ecarts).toEqual([]);
    // R. 4121-4 figure dans deux corpus ; le dernier n'a pas de citation, le
    // premier dépouillé en a une.
    const r41214 = refs.find((r) => r.article === "R. 4121-4");
    expect(r41214).toBeDefined();
    expect(releveDe(r41214!)?.citationCle).toBeTruthy();
  });

  it("une référence sans clé d'article n'a pas de relevé", () => {
    expect(releveDe({})).toBeUndefined();
  });
});
