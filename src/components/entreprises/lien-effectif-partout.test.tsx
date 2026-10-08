// TOUTE SURFACE QUI DIT « METTEZ-LE À JOUR SUR LA FICHE DE L'ENTREPRISE » MÈNE
// À CETTE FICHE (revue finale de l'intégration d, 2026-09-26).
//
// `phraseEffectifAConfirmer` se termine par une consigne : « S'il vient d'un
// effectif d'entreprise qui n'est plus à jour, mettez-le à jour sur la fiche de
// l'entreprise. » C37 avait posé le lien (`LienEffectifEntreprise`) sur l'écran
// « Ce qui doit être en place » ; la phrase s'affichait sans lui sur trois
// autres : le guide « Comprendre » (bloc du document unique et raisons des
// domaines), la carte des trois cas de mise à jour de la synthèse du document
// unique, et le bandeau de couverture. Une consigne sans chemin ne se suit pas.
//
// La garde a deux moitiés.
//  1. Chaque surface est RENDUE sur un dossier « à confirmer », et l'on compte :
//     autant de liens vers `/entreprises/…/modifier#effectif` que de consignes,
//     au moins. Lire le source ne suffisait pas — un lien dans une branche
//     jamais prise y passe pour présent.
//  2. Les appelants de `phraseEffectifAConfirmer` sont recensés. Un appelant
//     nouveau fait tomber ce test tant que sa surface n'est pas rendue ici :
//     c'est une borne haute, et c'est son seul rôle.
//
// Hors garde, et dit : le PDF des mentions de périmètre (`mentions-perimetre`)
// reprend le motif du bandeau. Un document imprimé n'a pas de lien ; la
// consigne y nomme l'endroit, ce qui est tout ce qu'un papier peut faire.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/etats-permanents/actions", () => ({
  declarerEnPlace: vi.fn(),
  retirerDeclaration: vi.fn(),
}));

const { ChezVous } = await import("@/components/guide/ChezVous");
const { CarteMiseAJour } = await import("@/components/duerps/CarteMiseAJour");
const { BandeauCouverture } = await import(
  "@/components/perimetre/BandeauCouverture"
);
const { LigneEtat } = await import("@/components/etats-permanents/LigneEtat");
const { construireChezVous } = await import("@/lib/guide/chez-vous");
const { couvertureDeLEtablissement } = await import(
  "@/lib/perimetre/couverture"
);
const { BlocAConfirmer } = await import("@/components/calendrier/BlocAConfirmer");
const { marquesParObligation } = await import("@/lib/matching/marques");
const { determineObligationsApplicables } = await import("@/lib/matching");
const { phraseEffectifAConfirmer } = await import(
  "@/lib/matching/effectif-entreprise"
);

const ENTREPRISE = "ent-1";
const HREF = `/entreprises/${ENTREPRISE}/modifier#effectif`;
const CONSIGNE = "mettez-le à jour sur la fiche de l'entreprise";

function texte(html: string): string {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}
const compter = (s: string, motif: string) => s.split(motif).length - 1;

function exigerLeLien(html: string) {
  const t = texte(html);
  const consignes = compter(t, CONSIGNE);
  const liens = compter(t, `href="${HREF}"`);
  expect(consignes, "le dossier de test doit faire parler la consigne").toBeGreaterThan(0);
  expect(liens).toBeGreaterThanOrEqual(consignes);
}

/** Entreprise à 9, site à 12 : le dossier de la revue. */
function etab(site: number, entreprise: number) {
  return {
    id: "etab-1",
    effectifSurSite: site,
    effectifEntreprise: entreprise,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: false,
    estHabitation: false,
    typeErp: null,
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    chiffonsImpregnes: null,
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
  };
}

describe("la consigne « fiche de l'entreprise » porte son lien", () => {
  it("guide « Comprendre » : bloc du document unique et blocs des domaines", () => {
    const data = construireChezVous(etab(12, 9), [], 9);
    // Le dossier de la revue fait parler les deux blocs.
    expect(data.duerp.aConfirmer).not.toBeNull();
    const orga = data.domaines.find((d) => d.domaine === "organisation_prevention");
    expect(orga?.aConfirmer).not.toBeNull();
    const html = renderToStaticMarkup(
      <ChezVous
        data={data}
        etablissementId="etab-1"
        entrepriseId={ENTREPRISE}
        raisonDisplay="Bureau"
        regimes={["Travail"]}
      />,
    );
    // Les deux phrases sont À L'ÉCRAN — sans quoi retirer le bloc du domaine
    // entier (phrase et lien ensemble) laisserait le compte juste.
    expect(texte(html)).toContain(data.duerp.aConfirmer!);
    expect(texte(html)).toContain(orga!.aConfirmer!.phrase);
    exigerLeLien(html);
  });

  it("synthèse du document unique : la carte des trois cas", () => {
    const html = renderToStaticMarkup(
      <CarteMiseAJour
        effectifs={{ entreprise: 9, site: 12 }}
        entrepriseId={ENTREPRISE}
      />,
    );
    exigerLeLien(html);
  });

  it("bandeau de couverture : le programme annuel retenu par prudence", () => {
    const couverture = couvertureDeLEtablissement({
      regime: {
        estEtablissementTravail: true,
        estERP: false,
        estIGH: false,
        estHabitation: false,
        typeErp: null,
        categorieErp: null,
        classeIgh: null,
        familleHabitation: null,
        comporteLocauxSommeilPublic: null,
        chiffonsImpregnes: null,
        manutentionManuelle: null,
        travailSurEcran: null,
        operationsElectriques: null,
        conduiteEngins: null,
        expositionCMR: null,
        epiPresents: null,
      },
      duerp: null,
      equipements: { nbSansObligation: 0, nbEquipements: 1, nbRetires: 0 },
      effectif: { surSite: 50, entreprise: 49, seuilServi: 50 },
    } as Parameters<typeof couvertureDeLEtablissement>[0]);
    const html = renderToStaticMarkup(
      <BandeauCouverture
        couverture={couverture}
        entrepriseId={ENTREPRISE}
        hrefEtablissement="/etablissements/etab-1/modifier"
      />,
    );
    exigerLeLien(html);
  });

  it("« Ce qui doit être en place » : la ligne retenue par prudence", () => {
    const html = renderToStaticMarkup(
      <LigneEtat
        etablissementId="etab-1"
        obligationId="prevention-etablissement-cse"
        libelle="Mise en place du comité social et économique (11 salariés)"
        mode="etat"
        pieceAttendue={null}
        declareLe={null}
        aConfirmer={{
          phrase: phraseEffectifAConfirmer(
            { entreprise: 9, site: 12 },
            "cette obligation ne vous concerne pas",
          ),
          entrepriseId: ENTREPRISE,
        }}
      />,
    );
    exigerLeLien(html);
  });
});

describe("« cette obligation » nomme l'obligation dans un bloc qui en agrège plusieurs", () => {
  it("entreprise 9 / site 12, organisation de la prévention", () => {
    const data = construireChezVous(etab(12, 9), [], 9);
    const orga = data.domaines.find((d) => d.domaine === "organisation_prevention")!;
    // Le bloc compte plusieurs obligations : c'est ce qui rendait le
    // démonstratif ambigu.
    expect(orga.nbObligations).toBeGreaterThan(1);
    const cse = "Mise en place du comité social et économique (11 salariés)";
    expect(orga.aConfirmer?.obligations).toEqual([cse]);
    // La raison du moteur est nommée…
    expect(orga.raisons.some((r) => r.startsWith(`« ${cse} » : `))).toBe(true);
    // …et plus aucune ne porte le démonstratif sans nom.
    expect(orga.raisons.join(" ")).not.toContain("cette obligation");
  });
});

describe("la fiche d'une ligne « à confirmer » (2026-09-27)", () => {
  it("la marque d'effectif du moteur porte le lien de l'entreprise", () => {
    // `matching/marques.ts` traduit `effectifAConfirmer` pour le calendrier,
    // la fiche d'une vérification, les PDF et le MCP. Seule la fiche a de
    // quoi porter un lien : `BlocAConfirmer`.
    const marques = marquesParObligation(
      determineObligationsApplicables(etab(12, 9), []),
    );
    const marque = [...marques.values()].find((m) => m.effectif);
    expect(marque, "le dossier de la revue doit porter une marque d'effectif").toBeDefined();
    const html = renderToStaticMarkup(
      <BlocAConfirmer
        marque={marque!}
        hrefFicheEtablissement="/etablissements/etab-1/modifier"
        entrepriseId={ENTREPRISE}
      />,
    );
    exigerLeLien(html);
  });
});

describe("recensement des appelants de phraseEffectifAConfirmer (borne haute)", () => {
  it("chaque appelant a sa surface rendue ci-dessus", () => {
    const racine = join(process.cwd(), "src");
    const appelants: string[] = [];
    const parcourir = (dir: string) => {
      for (const nom of readdirSync(dir)) {
        const p = join(dir, nom);
        if (statSync(p).isDirectory()) parcourir(p);
        else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) {
          if (/phraseEffectifAConfirmer\(/.test(readFileSync(p, "utf8"))) {
            appelants.push(relative(racine, p));
          }
        }
      }
    };
    parcourir(racine);
    // Surface par appelant — la définition exceptée :
    //  engine.ts          → raisons des domaines du guide (1er test)
    //  chez-vous.ts       → guide (1er test)
    //  mise-a-jour.ts     → carte des trois cas (2e test)
    //  couverture.ts      → bandeau (3e test)
    //  etats-permanents/queries.ts → LigneEtat (4e test)
    //  matching/marques.ts → BlocAConfirmer (test ci-dessus, 2026-09-27)
    expect(appelants.sort()).toEqual(
      [
        "lib/duerps/mise-a-jour.ts",
        "lib/etats-permanents/queries.ts",
        "lib/guide/chez-vous.ts",
        "lib/matching/effectif-entreprise.ts",
        "lib/matching/engine.ts",
        "lib/matching/marques.ts",
        "lib/perimetre/couverture.ts",
      ].sort(),
    );
  });
});
