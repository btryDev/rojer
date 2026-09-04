import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { depuisCleJourCivil } from "@/lib/dates";
import { join } from "node:path";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import {
  CATEGORIES_TRI_ETAT,
  CHAMPS_TRI_ETAT,
  equipementSchema,
  normaliserFormDataEquipement,
  normaliserTriEtat,
  serialiserCaracteristiques,
  valeurTriEtat,
} from "./schema";

const base = {
  libelle: "TGBT principal",
  categorie: "INSTALLATION_ELECTRIQUE" as const,
};

describe("equipementSchema — validations de base", () => {
  it("accepte un équipement minimal", () => {
    const res = equipementSchema.safeParse(base);
    expect(res.success).toBe(true);
  });

  it("refuse un libellé vide", () => {
    const res = equipementSchema.safeParse({ ...base, libelle: "  " });
    expect(res.success).toBe(false);
  });

  it("refuse une catégorie inconnue", () => {
    const res = equipementSchema.safeParse({
      ...base,
      categorie: "EXOTIQUE",
    });
    expect(res.success).toBe(false);
  });

  it("accepte une date ISO courte AAAA-MM-JJ et la parse en Date", () => {
    const res = equipementSchema.safeParse({
      ...base,
      dateMiseEnService: "2024-03-15",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.dateMiseEnService).toBeInstanceOf(Date);
    }
  });

  it("refuse une date au format invalide", () => {
    const res = equipementSchema.safeParse({
      ...base,
      dateMiseEnService: "15/03/2024",
    });
    expect(res.success).toBe(false);
  });

  it("laisse la date vide passer comme undefined", () => {
    const res = equipementSchema.safeParse({
      ...base,
      dateMiseEnService: "",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.dateMiseEnService).toBeUndefined();
  });
});

describe("equipementSchema — cohérence catégorie / propriétés (superRefine)", () => {
  it("refuse aGroupeElectrogene=true hors installation électrique", () => {
    const res = equipementSchema.safeParse({
      ...base,
      categorie: "VMC",
      aGroupeElectrogene: true,
    });
    expect(res.success).toBe(false);
  });

  it("accepte aGroupeElectrogene=true sur une installation électrique", () => {
    const res = equipementSchema.safeParse({
      ...base,
      categorie: "INSTALLATION_ELECTRIQUE",
      aGroupeElectrogene: true,
    });
    expect(res.success).toBe(true);
  });

  it("refuse nbVehiculesParkingCouvert sur une hotte", () => {
    const res = equipementSchema.safeParse({
      ...base,
      categorie: "HOTTE_PRO",
      nbVehiculesParkingCouvert: 300,
    });
    expect(res.success).toBe(false);
  });

  it("accepte nbVehiculesParkingCouvert sur une VMC", () => {
    const res = equipementSchema.safeParse({
      libelle: "VMC parking souterrain",
      categorie: "VMC",
      nbVehiculesParkingCouvert: 420,
    });
    expect(res.success).toBe(true);
  });

  it("refuse estLocalPollutionSpecifique sur un extincteur", () => {
    const res = equipementSchema.safeParse({
      libelle: "Extincteur CO₂ 5kg",
      categorie: "EXTINCTEUR",
      estLocalPollutionSpecifique: true,
    });
    expect(res.success).toBe(false);
  });

  it("accepte estLocalPollutionSpecifique sur une VMC / CTA / Hotte", () => {
    for (const c of ["VMC", "CTA", "HOTTE_PRO"] as const) {
      const res = equipementSchema.safeParse({
        libelle: "Aération",
        categorie: c,
        estLocalPollutionSpecifique: true,
      });
      expect(res.success).toBe(true);
    }
  });
});

describe("serialiserCaracteristiques", () => {
  it("renvoie null si rien de spécifique n'est positionné", () => {
    const res = equipementSchema.safeParse(base);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(serialiserCaracteristiques(res.data)).toBeNull();
    }
  });

  it("conserve uniquement les clés renseignées", () => {
    const res = equipementSchema.safeParse({
      ...base,
      aGroupeElectrogene: true,
      nombre: 3,
      notes: "  Sur façade ouest  ",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      const json = serialiserCaracteristiques(res.data);
      expect(json).toEqual({
        aGroupeElectrogene: true,
        nombre: 3,
        notes: "Sur façade ouest",
      });
    }
  });
});

// =============================================================================
// Questions à trois états (amendement 2026-08)
// =============================================================================

describe("normaliserTriEtat", () => {
  it("reconnaît les formes affirmatives", () => {
    for (const v of ["oui", "true", "on", "1", "  OUI  ", true]) {
      expect(normaliserTriEtat(v)).toBe(true);
    }
  });

  it("reconnaît les formes négatives", () => {
    for (const v of ["non", "false", "off", "0", " NON ", false]) {
      expect(normaliserTriEtat(v)).toBe(false);
    }
  });

  it("ne fabrique JAMAIS un « non » depuis une valeur inconnue ou absente", () => {
    // Point de sécurité : un `false` implicite éteindrait une obligation de
    // criticité élevée sans que personne n'ait répondu quoi que ce soit.
    for (const v of ["", "  ", undefined, null, 42, {}, "peut-être"]) {
      expect(normaliserTriEtat(v)).toBeUndefined();
    }
  });
});

describe("valeurTriEtat", () => {
  it("fait l'aller-retour avec normaliserTriEtat", () => {
    for (const v of [true, false, undefined]) {
      expect(normaliserTriEtat(valeurTriEtat(v))).toBe(v);
    }
    expect(normaliserTriEtat(valeurTriEtat(null))).toBeUndefined();
  });
});

describe("equipementSchema — questions à trois états", () => {
  it("accepte oui / non / absence sur la bonne catégorie", () => {
    for (const [valeur, attendu] of [
      ["oui", true],
      ["non", false],
      ["", undefined],
    ] as const) {
      const res = equipementSchema.safeParse({
        libelle: "VMC du sous-sol",
        categorie: "VMC",
        estVmcGaz: valeur,
      });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.estVmcGaz).toBe(attendu);
    }
  });

  it("refuse une réponse posée sur une catégorie incompatible", () => {
    for (const { champ, categories } of CATEGORIES_TRI_ETAT) {
      const categorieHorsChamp = "BAES";
      expect(categories).not.toContain(categorieHorsChamp);
      const res = equipementSchema.safeParse({
        libelle: "Bloc de secours",
        categorie: categorieHorsChamp,
        [champ]: "oui",
      });
      expect(res.success, champ).toBe(false);
    }
  });

  it("refuse aussi une réponse « non » hors catégorie", () => {
    const res = equipementSchema.safeParse({
      libelle: "Bloc de secours",
      categorie: "BAES",
      sertAuLevageDePersonnes: "non",
    });
    expect(res.success).toBe(false);
  });

  it("sérialise « non » (distinct de l'absence de réponse)", () => {
    const res = equipementSchema.safeParse({
      libelle: "Transpalette",
      categorie: "EQUIPEMENT_LEVAGE",
      sertAuLevageDePersonnes: "non",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(serialiserCaracteristiques(res.data)).toEqual({
        sertAuLevageDePersonnes: false,
      });
    }
  });

  it("ne sérialise rien quand la question n'a pas reçu de réponse", () => {
    const res = equipementSchema.safeParse({
      libelle: "Transpalette",
      categorie: "EQUIPEMENT_LEVAGE",
      sertAuLevageDePersonnes: "",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(serialiserCaracteristiques(res.data)).toBeNull();
    }
  });
});

describe("normaliserFormDataEquipement", () => {
  function fd(entries: Record<string, string>): FormData {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.append(k, v);
    return f;
  }

  it("case à cocher absente ⇒ false ; question à trois états absente ⇒ undefined", () => {
    const out = normaliserFormDataEquipement(
      fd({ libelle: "Transpalette", categorie: "EQUIPEMENT_LEVAGE" }),
    );
    expect(out.aGroupeElectrogene).toBe(false);
    expect(out.sertAuLevageDePersonnes).toBeUndefined();
    expect(out.aAccessoiresDeLevage).toBeUndefined();
  });

  it("transmet les réponses explicites au schéma", () => {
    const out = normaliserFormDataEquipement(
      fd({
        libelle: "Nacelle",
        categorie: "EQUIPEMENT_LEVAGE",
        sertAuLevageDePersonnes: "oui",
        aAccessoiresDeLevage: "non",
      }),
    );
    const res = equipementSchema.safeParse(out);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.sertAuLevageDePersonnes).toBe(true);
      expect(res.data.aAccessoiresDeLevage).toBe(false);
    }
  });
});

describe("aller-retour édition — aucune réponse ne se perd", () => {
  /**
   * Le bug : la page d'édition recopiait à la main la liste des propriétés à
   * repasser au formulaire, et n'avait pas suivi l'ajout des questions à trois
   * états. Modifier le libellé d'un équipement effaçait toutes ses réponses —
   * et un « non » redevenu « pas de réponse » RALLUME les obligations en
   * opt-out. Perte de données silencieuse, à conséquence réglementaire.
   *
   * Ce test garde le maillon sérialisation : tout ce qui est stocké doit
   * revenir identique après un aller-retour formulaire.
   */
  it("un équipement pleinement renseigné se relit sans perte", () => {
    // Porté par `dessertLocauxSommeil` jusqu'au 2026-09-01, puis par
    // `aRobinetsIncendieArmes` jusqu'au 2026-09-03 — deux champs retirés le
    // jour où ils ont cessé de borner quoi que ce soit. Le maillon gardé n'a
    // rien de propre à un champ : n'importe quelle question à trois états le
    // vérifie, et `estVmcGaz` est en opt-out comme l'étaient les deux autres.
    // Qu'il ait fallu le rebrancher deux fois est le signe qu'il faudrait
    // le dériver de `CHAMPS_TRI_ETAT` plutôt que d'y nommer un champ.
    const saisie = {
      libelle: "VMC du logement",
      categorie: "VMC" as const,
      estVmcGaz: "non",
    };
    const res = equipementSchema.safeParse(saisie);
    expect(res.success).toBe(true);
    if (!res.success) return;

    const stocke = serialiserCaracteristiques(res.data);
    expect(stocke).toEqual({ estVmcGaz: false });

    // Second passage : la page repasse la valeur stockée au formulaire, qui la
    // resoumet. Le « non » doit survivre.
    const relu = equipementSchema.safeParse({
      libelle: saisie.libelle,
      categorie: saisie.categorie,
      estVmcGaz: valeurTriEtat(false),
    });
    expect(relu.success).toBe(true);
    if (relu.success) {
      expect(serialiserCaracteristiques(relu.data)).toEqual(stocke);
    }
  });

  it("une valeur non repassée au formulaire est bien perdue (ce que le test ci-dessus prévient)", () => {
    // Démonstration du mécanisme, pour que la régression soit lisible : si la
    // page oublie un champ, le schéma reçoit `undefined` et la clé disparaît.
    const res = equipementSchema.safeParse({
      libelle: "Extincteur du hall",
      categorie: "EXTINCTEUR",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(serialiserCaracteristiques(res.data)).toBeNull();
  });
});

describe("cohérence schéma ↔ référentiel d'obligations", () => {
  it("toute propriété conditionnant une obligation est collectée par le formulaire", () => {
    // Une condition qui porte sur une propriété que rien ne renseigne est une
    // condition que l'utilisateur ne peut jamais satisfaire ni infirmer.
    const collectees = new Set<string>([
      ...CHAMPS_TRI_ETAT,
      "aGroupeElectrogene",
      "estLocalPollutionSpecifique",
      "aSystemeDeRecyclage",
      "nbVehiculesParkingCouvert",
      // Ajoutée le 2026-09-01. `familleEsp` était collectée depuis l'origine —
      // `<select name="familleEsp">` dans `EquipementForm` — mais aucune
      // condition ne s'en servait ; elle entre ici parce qu'elle en porte une
      // désormais, pas parce que la collecte aurait changé.
      "familleEsp",
    ]);
    for (const o of obligationsConformite) {
      for (const c of o.conditions ?? []) {
        expect(collectees, `${o.id} → ${c.propriete}`).toContain(c.propriete);
      }
    }
  });

  it("la catégorie visée par une condition accepte bien la propriété côté schéma", () => {
    for (const o of obligationsConformite) {
      for (const c of o.conditions ?? []) {
        const regle = CATEGORIES_TRI_ETAT.find(
          (r) => r.champ === c.propriete,
        );
        if (!regle) continue;
        expect(regle.categories, `${o.id} → ${c.propriete}`).toContain(
          c.categorie,
        );
      }
    }
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LA CHAÎNE DE SAISIE VA JUSQU'AU BOUT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CE QUI M'A FAIT ÉCRIRE CECI (2026-09-04). En ajoutant `datePeremption`, j'ai
 * retiré sa ligne de `normaliserFormDataEquipement` pour voir ce qui tomberait.
 * **Rien.** `tsc` reste muet : la fonction rend un `Record<string, unknown>`,
 * donc une clé absente n'est pas une erreur de type ; le champ serait resté à
 * l'écran, l'utilisateur l'aurait rempli, et la valeur serait tombée entre le
 * formulaire et le schéma sans qu'aucun test ne s'en aperçoive.
 *
 * C'est le trou de garantie d'un maillon entier : ce fichier vérifiait le
 * schéma, `actions.test.ts` vérifie les actions, personne ne vérifiait le
 * PASSAGE du formulaire au schéma. La forme du défaut est générique — elle
 * guette toute propriété d'équipement ajoutée après coup, et l'en-tête de
 * `schema.ts` promet justement que « toute nouvelle propriété s'ajoute dans ce
 * fichier ».
 *
 * LA GARDE NE TIENT PAS UNE LISTE DE CHAMPS. Elle relève les `name=` du
 * formulaire — la source de ce que le navigateur envoie — et exige de chacun
 * qu'il ressorte de `normaliserFormDataEquipement`. Une liste écrite ici se
 * serait réparée en y ajoutant une ligne, donc aurait cessé de mesurer.
 */
describe("du formulaire au schéma, sans perte", () => {
  const RACINE = process.cwd();

  /** Les `name` que le formulaire d'équipement envoie réellement. */
  function champsDuFormulaire(): string[] {
    const source = readFileSync(
      join(RACINE, "src/components/equipements/EquipementForm.tsx"),
      "utf8",
    );
    const noms = [...source.matchAll(/\bname="([a-zA-Z][\w]*)"/g)].map(
      (m) => m[1],
    );
    return [...new Set(noms)];
  }

  it("chaque champ du formulaire ressort de la normalisation", () => {
    const champs = champsDuFormulaire();
    expect(
      champs.length,
      "Aucun `name=` relevé dans le formulaire : le motif ne mesure plus rien.",
    ).toBeGreaterThan(5);

    // Un FormData où chaque champ porte une valeur plausible : c'est le seul
    // moyen de distinguer « la clé n'est pas lue » de « la clé vaut vide ».
    const fd = new FormData();
    for (const c of champs) fd.set(c, "2024-03-15");
    fd.set("libelle", "Harnais du quai");
    fd.set("categorie", "EPI_ANTICHUTE");

    const out = normaliserFormDataEquipement(fd);
    // LA VALEUR, PAS LA CLÉ. La première version de ce test faisait
    // `!(c in out)` — et une clé posée à `undefined` satisfait `in`. Le mode de
    // panne réaliste passait donc au vert : une faute de frappe sur la clé
    // BRUTE (`raw.localisatoin`) produit `localisation: undefined`, la valeur
    // saisie tombe entre le formulaire et le schéma, `raw` étant un
    // `Record<string, FormDataEntryValue>` où `tsc` ne voit rien. C'est
    // exactement le défaut que ce test annonce empêcher.
    const perdus = champs.filter((c) => out[c] === undefined);
    expect(
      perdus,
      "Ces champs sont affichés à l'utilisateur, remplis par lui, et " +
        "`normaliserFormDataEquipement` n'en ressort aucune valeur : soit la " +
        "clé n'est pas lue, soit elle est lue sous un autre nom (une faute de " +
        "frappe sur `raw.xxx` suffit). Leur valeur tombe entre le formulaire " +
        "et le schéma, et `tsc` ne le voit pas — `raw` est indexé par chaîne.",
    ).toEqual([]);
  });

  it("la date de péremption traverse la normalisation ET le schéma", () => {
    // Le champ qui a révélé le trou, éprouvé de bout en bout : ce n'est pas
    // sa présence dans un objet qui compte, c'est la Date qui en sort.
    const fd = new FormData();
    fd.set("libelle", "Harnais du quai");
    fd.set("categorie", "EPI_ANTICHUTE");
    fd.set("datePeremption", "2031-03-15");

    const res = equipementSchema.safeParse(normaliserFormDataEquipement(fd));
    expect(res.success, JSON.stringify(res.error?.issues)).toBe(true);
    if (!res.success) return;
    expect(res.data.datePeremption).toBeInstanceOf(Date);
    // Comparée au jour civil du dépôt, pas à une chaîne ISO : `toISOString`
    // reculerait d'un jour à Paris, et le test dirait « la date est fausse »
    // là où c'est l'assertion qui l'est.
    expect(res.data.datePeremption?.getTime()).toBe(
      depuisCleJourCivil("2031-03-15").getTime(),
    );
  });

  it("une péremption vide reste indéterminée, elle ne devient pas une date", () => {
    // « Je ne sais pas » doit rester distinct de « pas de péremption » : un
    // équipement sans date connue ne doit pas se voir attribuer aujourd'hui.
    const fd = new FormData();
    fd.set("libelle", "Casque");
    fd.set("categorie", "EPI");
    fd.set("datePeremption", "");

    const res = equipementSchema.safeParse(normaliserFormDataEquipement(fd));
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.datePeremption).toBeUndefined();
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ET LE RETOUR : DE LA BASE AU FORMULAIRE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE MAILLON QUE LE TEST PRÉCÉDENT NE VOIT PAS, et qui a cédé le même jour.
 * `datePeremption` traversait bien le formulaire vers la base — et ne revenait
 * pas. `modifier/page.tsx` construit `valeursInitiales` **à la main**, propriété
 * par propriété ; la colonne neuve n'y a pas été ajoutée. Conséquence : la
 * fiche affichait « Péremption mars 2031 », le formulaire d'édition du même
 * appareil affichait un champ vide, et — le champ vide valant `undefined`, que
 * Prisma ignore — la date était devenue **ineffaçable**.
 *
 * `tsc` ne voit rien : `valeursInitiales` a toutes ses propriétés optionnelles,
 * en omettre une est légal. Le commentaire de `modifier/page.tsx` raconte
 * précisément ce défaut pour les questions à trois états — « la page recopiait
 * à la main la liste des propriétés » — et le lot l'a reproduit sur la colonne
 * suivante. Une leçon écrite au bon endroit n'empêche rien tant qu'aucun test
 * ne la tient.
 *
 * CE QUE LA GARDE RELÈVE : les champs que le formulaire AFFICHE et qui doivent
 * donc pouvoir être relus. Elle ne tient pas de liste — elle lit les deux
 * fichiers, la source de ce qui est montré et la source de ce qui est repassé.
 */
describe("de la base au formulaire, sans perte", () => {
  const RACINE = process.cwd();

  it("chaque champ affiché est repassé en valeur initiale", () => {
    const form = readFileSync(
      join(RACINE, "src/components/equipements/EquipementForm.tsx"),
      "utf8",
    );
    const page = readFileSync(
      join(
        RACINE,
        "src/app/etablissements/[id]/equipements/[equipementId]/modifier/page.tsx",
      ),
      "utf8",
    );

    // Ce que le formulaire relit d'une valeur initiale : `valeursInitiales?.x`.
    const relus = [
      ...new Set(
        [...form.matchAll(/valeursInitiales\?\.(\w+)/g)].map((m) => m[1]),
      ),
    ];
    expect(
      relus.length,
      "Aucun `valeursInitiales?.x` relevé : le motif ne mesure plus rien.",
    ).toBeGreaterThan(5);

    // Ce que la page d'édition repasse. Le bloc est un littéral d'objet : on
    // relève ses clés, sans supposer leur ordre ni leur forme.
    const bloc = page.slice(page.indexOf("valeursInitiales={{"));
    const repassees = new Set(
      [...bloc.matchAll(/^\s{14}(\w+):/gm)].map((m) => m[1]),
    );

    const oublies = relus.filter((c) => !repassees.has(c));
    expect(
      oublies,
      "Ces champs sont affichés dans le formulaire d'édition et la page ne " +
        "leur repasse aucune valeur : le champ s'ouvre vide sur un appareil " +
        "qui en porte une, et — un champ vide valant `undefined`, que Prisma " +
        "ignore — la valeur devient ineffaçable. `tsc` ne le voit pas : " +
        "`valeursInitiales` a toutes ses propriétés optionnelles.",
    ).toEqual([]);
  });
});
