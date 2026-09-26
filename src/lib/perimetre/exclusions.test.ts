import { describe, expect, it } from "vitest";
import { exclusionsDeclarees, refusAlEntree } from "./exclusions";
import {
  EFFECTIF_MAX,
  etablissementCreationSchema,
} from "@/lib/etablissements/schema";
import { CORPUS, EXCLUSIONS, articlesNonCouverts } from "@/lib/referentiels/corpus";

/**
 * Un dossier que la porte accepte. Recopié depuis le module — délibérément :
 * si la sonde du module cessait d'être valide, la sienne le resterait, et
 * `refusAlEntree()` rendrait alors des refus qui viendraient de la sonde
 * elle-même. Les deux doivent diverger pour que le test le voie.
 */
const dossierAccepte = {
  raisonDisplay: "Sonde de test",
  adresse: "2 rue du Test, 75000 Paris",
  codeNaf: "47.24Z",
  effectifSurSite: 3,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  natureActivite: null,
};

describe("les refus à l'entrée sont projetés, pas recopiés", () => {
  it("rend les refus de l'ADR-031, et eux seuls", () => {
    // « Deux cas, et deux seulement » au 2026-09-01. Un troisième refus ajouté
    // au schéma sans décision fera tomber ce test — c'est ce qu'on lui demande :
    // « la liste des régimes refusés est un objet à relire, pas une constante
    // qu'on augmente au fil des cas gênants. »
    // Le troisième est entré par décision : la propriétaire, le 2026-09-26,
    // a plafonné l'effectif de l'entreprise comme celui du site (ADR-031).
    expect(refusAlEntree().map((r) => r.cle)).toEqual([
      "effectif",
      "effectif_entreprise",
      "erp_en_igh",
    ]);
  });

  it("rend la phrase de la porte, et pas une phrase de son cru", () => {
    // La preuve que le message est projeté : il porte le seuil que le schéma
    // porte. Une phrase écrite en dur dans le module ne suivrait pas
    // `EFFECTIF_MAX` et se contredirait en silence le jour où il bougerait.
    const effectif = refusAlEntree().find((r) => r.cle === "effectif");
    expect(effectif?.message).toContain(String(EFFECTIF_MAX));
  });

  it("ne refuse rien que la porte accepte", () => {
    // Le sens inverse, et c'est la moitié qu'on oublie. Trois dossiers que
    // l'ADR-031 veut voir passer, vérifiés sur la porte elle-même : si l'un
    // d'eux se mettait à être refusé, la page annoncerait deux refus pendant
    // que le produit en ferait trois.
    const auSeuil = { ...dossierAccepte, effectifSurSite: EFFECTIF_MAX };
    expect(etablissementCreationSchema.safeParse(auSeuil).success).toBe(true);

    // L'IGH SEUL n'est pas refusé : un employeur locataire de bureaux dans une
    // tour relève du Code du travail, que le produit sert entièrement.
    const ighSeul = {
      ...dossierAccepte,
      estIGH: true,
      classeIgh: "GHW1",
    };
    expect(etablissementCreationSchema.safeParse(ighSeul).success).toBe(true);

    // Et l'ERP de 3ᵉ catégorie : la catégorie mesure le public, la borne
    // mesure les salariés. Il est servi partiellement, pas refusé.
    const erpCategorie3 = {
      ...dossierAccepte,
      estERP: true,
      typeErp: "N",
      categorieErp: "N3",
      personnesPresentesHabituellement: 300,
    };
    expect(etablissementCreationSchema.safeParse(erpCategorie3).success).toBe(
      true,
    );
  });

  it("ne laisse aucun refus sans indication — un refus n'est pas un cul-de-sac", () => {
    // ADR-031 § 3. Refuser sans expliquer serait pire que servir mal, et la
    // personne refusée ne reviendra pas dire qu'elle l'a été à tort.
    for (const r of refusAlEntree()) {
      expect(r.regime.length, r.cle).toBeGreaterThan(0);
      expect(r.indication.length, r.cle).toBeGreaterThan(80);
    }
  });

  it("ne qualifie jamais la situation au regard du droit", () => {
    const dit = refusAlEntree()
      .map((r) => `${r.regime} ${r.message} ${r.indication}`)
      .join(" ")
      .toLowerCase();
    for (const interdit of [
      "conforme",
      "non conforme",
      "en infraction",
      "en règle",
      "illégal",
    ]) {
      expect(dit, interdit).not.toContain(interdit);
    }
  });
});

describe("les exclusions déclarées projettent le corpus", () => {
  it("rend les quatre clés fermées, même celles qui n'écartent rien encore", () => {
    // L'exclusion est la déclaration ; l'article n'en est que la preuve. Ne
    // rendre que les exclusions peuplées ferait disparaître de la page une
    // frontière que le produit revendique.
    expect(exclusionsDeclarees().map((e) => e.cle)).toEqual(
      Object.keys(EXCLUSIONS),
    );
  });

  it("n'écarte aucun article que le corpus n'écarte pas, ni l'inverse", () => {
    const projetes = exclusionsDeclarees()
      .flatMap((e) => e.articles.map((a) => a.ref))
      .sort();
    const duCorpus = CORPUS.flatMap((c) =>
      c.articles.filter((a) => a.statut === "hors_perimetre").map((a) => a.ref),
    ).sort();
    expect(projetes).toEqual(duCorpus);
  });

  it("ne laisse JAMAIS entrer un article `non_couvert`", () => {
    // La confusion à empêcher, et elle n'est pas de vocabulaire : ranger un
    // manque parmi les exclusions le fait disparaître du décompte — il cesse
    // d'être une dette pour devenir une non-question. Les 28 articles
    // `non_couvert` ont leur propre suivi (`docs/couverture-declaree-du-produit.md`).
    const projetes = new Set(
      exclusionsDeclarees().flatMap((e) => e.articles.map((a) => a.ref)),
    );
    const manques = articlesNonCouverts().map((a) => a.ref);
    expect(manques.filter((ref) => projetes.has(ref))).toEqual([]);
  });

  it("cite le corpus mot pour mot, sans reformuler", () => {
    // Un motif réécrit vieillit à part de sa source. La garantie est faible
    // par construction — elle ne compare que des chaînes — mais elle attrape
    // le geste le plus probable : « j'améliore la formulation ici ».
    for (const e of exclusionsDeclarees()) {
      expect(e.libelle, e.cle).toBe(EXCLUSIONS[e.cle].libelle);
      expect(e.motif, e.cle).toBe(EXCLUSIONS[e.cle].motif);
    }
  });
});
