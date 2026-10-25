import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { construireChezVous } from "@/lib/guide/chez-vous";
import type { EtablissementMatching } from "@/lib/matching";

/**
 * Le guide explique le produit : il ne doit ni le contredire, ni inventer.
 *
 * Trois défauts trouvés au contrôle visuel d'un dossier neuf, qu'aucun test ne
 * voyait — ils vivaient dans du JSX et dans un SVG, deux endroits où l'on ne
 * regarde pas.
 */

const SRC = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

function bureauSansRien(): EtablissementMatching {
  return {
    id: "etab-neuf",
    effectifSurSite: 6,
    effectifEntreprise: 6,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: false,
    estHabitation: false,
    typeErp: null,
    typesErpAutres: [],
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
    ssiCategorieAouB: null,
  };
}

describe("le guide ne contredit pas le produit", () => {
  it("un établissement sans équipement a bien des domaines à montrer", () => {
    // La moitié factuelle du défaut. Tant qu'elle était fausse, la phrase du
    // guide était vraie — c'est le produit qui a changé sous elle.
    const r = construireChezVous(bureauSansRien(), [], 12);
    expect(r.aucunEquipement).toBe(true);
    expect(
      r.domaines.length,
      "Sans domaine à montrer, la phrase « aucune vérification » redevient " +
        "vraie et ce test n'a plus d'objet.",
    ).toBeGreaterThan(0);
  });

  it("le guide n'affirme plus qu'aucune vérification ne peut être calculée", () => {
    // L'autre moitié. « la plateforme ne peut donc calculer aucune
    // vérification périodique » était affiché À LA PLACE de la liste des
    // domaines : les deux étaient les branches d'une même alternative, si bien
    // que déclarer zéro équipement effaçait les obligations qui ne dépendent
    // d'aucun équipement. Le paragraphe écrit pour ne pas faire croire à une
    // absence d'obligations en produisait une lui-même.
    expect(
      SRC("src/components/guide/ChezVous.tsx"),
      "Le guide affirme qu'aucune vérification ne peut être calculée sans " +
        "équipement. C'est faux depuis que des obligations naissent du statut " +
        "d'employeur.",
    ).not.toContain("ne peut donc calculer aucune vérification");
  });
});

describe("les illustrations d'en-tête n'affichent aucune donnée", () => {
  // Le défaut d'origine : l'illustration du guide portait « v3 · 04/26 » et
  // « 22 juin ». Sur un dossier créé depuis dix minutes, l'en-tête montrait
  // une version validée et une échéance datée que le dossier n'avait pas —
  // `aria-hidden` protège les lecteurs d'écran, pas les yeux.
  //
  // ~~La garde lisait `guide/IllustrationDocuments.tsx` et refusait les
  // dates et numéros de version parmi ses `<text>`.~~ [2026-10-25 : ce dessin
  // est retiré avec le hero du guide. Toutes les pages d'entrée ont désormais
  // une illustration d'en-tête, sans aucun texte : la garde passe de la forme
  // « pas de date » à la règle plus simple « pas de texte du tout », sur
  // toute la série.]
  const DOSSIER = "src/components/entete-page/illustrations";
  const dessins = readdirSync(join(process.cwd(), DOSSIER)).filter((f) =>
    f.endsWith(".tsx"),
  );

  it("balaie bien la série (borne basse)", () => {
    expect(dessins.length).toBeGreaterThanOrEqual(20);
  });

  it.each(dessins)("%s : aucun texte dessiné", (fichier) => {
    expect(SRC(`${DOSSIER}/${fichier}`)).not.toMatch(/<text\b/);
  });
});

describe("ce que le tableau de bord appelle un tiers", () => {
  it("ne parle pas de « prestataire » pour un service de santé au travail", () => {
    // « Aucun prestataire déclaré en santé au travail » : l'obligation visée
    // est l'adhésion à un service de prévention et de santé au travail, qui
    // n'est pas un fournisseur qu'on retient mais une obligation légale de
    // l'employeur. Le mot ratait sa cible.
    //
    // La règle sert dix domaines techniques où « prestataire » allait de soi.
    // Une seule phrase porte les deux cas parce que ce qu'elle constate est le
    // même : une obligation suppose un tiers, l'annuaire n'en déclare aucun.
    const src = SRC("src/lib/dashboard/recommandations.ts");
    const titreLigne = src
      .split("\n")
      .find((l) => l.includes("titre: `Aucun"));
    expect(titreLigne, "La règle a changé de forme").toBeDefined();
    expect(
      titreLigne,
      "Le titre parle de « prestataire », ce qui est un contresens pour " +
        "l'adhésion à un service de prévention et de santé au travail.",
    ).not.toContain("prestataire");
  });
});
