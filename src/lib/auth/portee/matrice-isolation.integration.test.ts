// La matrice d'isolation, générée (chantier 1 du renforcement, 2026-11-09).
//
// Pour CHAQUE modèle d'un compte de `CORRESPONDANCE` — pas une liste recopiée —,
// deux comptes A et B portent chacun leurs lignes, et le client borné à A est
// éprouvé contre celles de B, sur un vrai PostgreSQL :
//   - lectures par identifiant (`findUnique`, `findFirst`, leurs `OrThrow`,
//     `findMany`, `count`, `aggregate`, `groupBy`) : rien ;
//   - écritures par identifiant (`update`, `updateMany`, `delete`, `deleteMany`,
//     `upsert`) : refusées ou sans effet, la ligne de B relue intacte ;
//   - création, et mise à jour, dont UNE clé désigne la ligne de B : refusées.
//     Chaque clé que la borne connaît, une à une : celles des relations du
//     schéma (rattachement, secondaires, racine, identité) et les identités
//     scalaires (`IDENTITES_SCALAIRES`) ;
//   - `createMany` et `creerEnLotVerifie` rattachés au parent de B : refusés,
//     pour la raison du rattachement (le message le dit).
// Les écritures visant B sont VALIDÉES, jamais annulées : si la borne les
// laissait passer, B relu le montrerait. Chaque refus a son témoin — la même
// opération sur A réussit, elle dans une transaction annulée. Sans témoin, une
// fabrique cassée passerait pour une borne qui tient.
//
// HORS DE LA BORNE, donc hors de cette matrice : les identifiants sans relation
// au schéma (`CLES_SANS_RELATION` de la sonde — objet signé polymorphe,
// rapport de levée, identifiants du module Interventions retiré). Le client
// borné ne les voit pas ; ils sont gardés par leur code nommé
// (`objetAppartientAEtablissement`, `objetEstSignable`, lecture bornée du
// rapport) et vérifiés sur les données par la sonde des clés croisées. Un test
// plus bas les nomme, pour que la frontière se lise.
//
// Ce que ce fichier ne refait pas : les formes servies ou refusées par la borne
// (`client.integration.test.ts`), et les liens croisés déjà en base (la sonde).
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe une
// base LOCALE migrée. Il VIDE les comptes (TRUNCATE), comme
// `client.integration.test.ts` : jamais sur une base qui sert.
//   ISOLATION_INTEGRATION_URL=postgresql://…@localhost:5433/rojer_matrice \
//     pnpm exec vitest run src/lib/auth/portee/matrice-isolation.integration

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/portee/client");
vi.unmock("@/lib/auth/portee/lot-verifie");

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
// L'hôte, avec ou sans identifiants : `postgresql://localhost:5433/…` compte.
const local = URL_BASE ? /^postgres(?:ql)?:\/\/(?:[^@/]*@)?(?:localhost|127\.0\.0\.1|\[::1\])[:/]/.test(URL_BASE) : false;

type Ligne = Record<string, unknown>;
/** Les identifiants d'un compte semé, par nom de modèle (sa première ligne), plus `compte`, `user` et `etab2`. */
type Graine = Record<string, string>;
/** Les données d'une ligne, à partir des lignes déjà semées ; `n` rend unique ce qui doit l'être. */
type Fabrique = (g: Graine, n: number) => Ligne;

const JOUR = new Date("2026-11-09T08:00:00Z");
const PLUS_TARD = new Date("2026-11-09T18:00:00Z");
const DANS_UN_AN = new Date("2027-11-09T00:00:00Z");

/**
 * Une ou plusieurs lignes par modèle d'un compte, dans l'ordre où elles se
 * sèment. Plusieurs variantes quand une contrainte interdit de remplir toutes
 * les clés sur une seule ligne (`Action_origine_xor`, `Verification_porteur_xor`)
 * ou qu'une clé d'identité n'est portée que par une forme (`Signature.user`) :
 * chaque clé du schéma doit être remplie par au moins une variante (vérifié
 * plus bas).
 */
const FABRIQUES: Record<string, Fabrique[]> = {
  Entreprise: [(g, n) => ({ compteId: g.compte, raisonSociale: `E${n}`, effectif: 5, adresse: "1 rue" })],
  Etablissement: [
    (g, n) => ({ entrepriseId: g.Entreprise, raisonDisplay: `Et${n}`, adresse: "1 rue", codeNaf: "56.10A", effectifSurSite: 5 }),
  ],
  Batiment: [(g, n) => ({ etablissementId: g.Etablissement, nom: `Bat${n}` })],
  Equipement: [
    (g, n) => ({ etablissementId: g.Etablissement, batimentId: g.Batiment, categorie: "EXTINCTEUR", libelle: `Eq${n}` }),
  ],
  Salarie: [(g, n) => ({ etablissementId: g.Etablissement, nom: `N${n}`, prenom: "P" })],
  Prestataire: [
    (g, n) => ({ etablissementId: g.Etablissement, raisonSociale: `P${n}`, contactNom: "C", contactEmail: "c@exemple.invalid", domaines: [] }),
  ],
  PrescriptionParticuliere: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      source: "autre",
      effet: "obligation_sur_mesure",
      reference: `R${n}`,
      dateDocument: JOUR,
      periodicite: "annuelle",
      libelle: `L${n}`,
      equipementId: g.Equipement,
    }),
  ],
  Verification: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      obligationId: `o-eq-${n}`,
      libelleObligation: "V",
      periodicite: "annuelle",
      datePrevue: DANS_UN_AN,
      equipementId: g.Equipement,
      prestataireId: g.Prestataire,
      prescriptionId: g.PrescriptionParticuliere,
    }),
    // L'équipement XOR le salarié (`Verification_porteur_xor`).
    (g, n) => ({
      etablissementId: g.Etablissement,
      obligationId: `o-sal-${n}`,
      libelleObligation: "V",
      periodicite: "annuelle",
      datePrevue: DANS_UN_AN,
      salarieId: g.Salarie,
    }),
  ],
  RapportVerification: [
    (g) => ({ etablissementId: g.Etablissement, verificationId: g.Verification, dateRapport: JOUR, resultat: "conforme", realiseEnInterne: true }),
  ],
  Duerp: [(g) => ({ etablissementId: g.Etablissement })],
  DuerpVersion: [(g, n) => ({ duerpId: g.Duerp, numero: n, snapshot: {} })],
  UniteTravail: [(g, n) => ({ duerpId: g.Duerp, nom: `U${n}` })],
  Risque: [(g, n) => ({ uniteId: g.UniteTravail, libelle: `R${n}`, gravite: 2, probabilite: 2, maitrise: 2, criticite: 4 })],
  Action: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      libelle: `A${n}`,
      type: "suppression",
      verificationId: g.Verification,
      equipementId: g.Equipement,
      rapportOrigineId: g.RapportVerification,
    }),
    // Le risque XOR la vérification (`Action_origine_xor`).
    (g, n) => ({ etablissementId: g.Etablissement, libelle: `Ar${n}`, type: "suppression", risqueId: g.Risque }),
  ],
  PiecePrestataire: [(g, n) => ({ prestataireId: g.Prestataire, type: "kbis", fichierCle: `k${n}` })],
  PermisFeu: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      numero: n,
      prestataireRaison: "x",
      prestataireContact: "x",
      prestataireEmail: "x@exemple.invalid",
      donneurOrdreNom: "x",
      dateDebut: JOUR,
      dateFin: PLUS_TARD,
      lieu: "x",
      descriptionTravaux: "x",
      naturesTravaux: [],
      prestataireId: g.Prestataire,
      batimentId: g.Batiment,
    }),
  ],
  Signature: [
    (g) => ({
      etablissementId: g.Etablissement,
      objetType: "permis_feu",
      objetId: g.PermisFeu,
      signataireNom: "S",
      signataireEmail: "s@exemple.invalid",
      hashDocument: "0".repeat(64),
      methode: "otp_email",
    }),
    // Signée depuis un compte connecté : l'auteur est une personne (`Signature.user`).
    (g) => ({
      etablissementId: g.Etablissement,
      objetType: "permis_feu",
      objetId: g.PermisFeu,
      signataireNom: "S",
      signataireEmail: "s@exemple.invalid",
      hashDocument: "0".repeat(64),
      methode: "compte_connecte",
      userId: g.user,
    }),
  ],
  AccessToken: [
    (g) => ({
      tokenHash: randomUUID(),
      etablissementId: g.Etablissement,
      scope: "consultation",
      objetType: "permis_feu",
      objetId: g.PermisFeu,
      prestataireId: g.Prestataire,
      emailDestinataire: "x@exemple.invalid",
      expireLe: DANS_UN_AN,
      createdByUserId: g.user,
    }),
  ],
  RegistreAccessibilite: [(g) => ({ etablissementId: g.Etablissement, slugPublic: randomUUID() })],
  PlanPrevention: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      numero: n,
      entrepriseExterieureRaison: "x",
      efChefNom: "x",
      efChefEmail: "x@exemple.invalid",
      efEffectifIntervenant: 1,
      euChefNom: "x",
      dateDebut: JOUR,
      dateFin: PLUS_TARD,
      lieux: "x",
      naturesTravaux: "x",
      prestataireId: g.Prestataire,
      batimentId: g.Batiment,
    }),
  ],
  LignePlanPrevention: [(g) => ({ planPreventionId: g.PlanPrevention, risque: "x" })],
  PhaseDangereuse: [(g) => ({ planPreventionId: g.PlanPrevention, phase: "x" })],
  CarnetSanitaire: [(g) => ({ etablissementId: g.Etablissement })],
  PointReleve: [
    (g, n) => ({ carnetId: g.CarnetSanitaire, nom: `Pt${n}`, typeReseau: "ECS", seuilMinCelsius: 50, batimentId: g.Batiment }),
  ],
  ReleveTemperature: [(g) => ({ pointReleveId: g.PointReleve, dateReleve: JOUR, temperatureCelsius: 55, conforme: true })],
  AnalyseLegionelle: [(g) => ({ carnetId: g.CarnetSanitaire, dateAnalyse: JOUR, conforme: true })],
  FicheRegistre: [(g, n) => ({ etablissementId: g.Etablissement, sectionId: `s${n}`, contenu: {} })],
  TitreSalarie: [(g, n) => ({ salarieId: g.Salarie, obligationId: `t${n}`, delivreLe: JOUR })],
  DeclarationEtatPermanent: [(g, n) => ({ etablissementId: g.Etablissement, obligationId: `d${n}` })],
  PieceEtatPermanent: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      obligationId: `p${n}`,
      fichierCle: `f${n}`,
      fichierNom: "f.pdf",
      fichierMime: "application/pdf",
      fichierTaille: 1,
    }),
  ],
  Intervention: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      numero: n,
      titre: "x",
      creeParUserId: g.user,
      risqueId: g.Risque,
      uniteTravailId: g.UniteTravail,
      prestataireId: g.Prestataire,
    }),
  ],
  CommentaireIntervention: [(g) => ({ interventionId: g.Intervention, auteurNom: "x", contenu: "x" })],
  DemandeAssistance: [
    (g) => ({ compteId: g.compte, userId: g.user, categorie: "diagnostic", message: "x", page: "/x", etablissementId: g.Etablissement }),
  ],
  AcceptationConditions: [(g) => ({ compteId: g.compte, userId: g.user, version: "v", empreinte: "e", contexte: "c" })],
  ConsommationQuota: [(g) => ({ compteId: g.compte, quota: "q" })],
  FichierStocke: [(g) => ({ cle: `${g.compte}/${randomUUID()}`, compteId: g.compte, octets: 1 })],
  Abonnement: [(g) => ({ compteId: g.compte, stripeCustomerId: `cus_${randomUUID()}` })],
};

describe.skipIf(!URL_BASE || !local)("matrice d'isolation, générée — PostgreSQL réel", async () => {
  // Jamais une base qui n'est pas locale : le describe est sauté, et rien n'est posé.
  if (URL_BASE && local) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { Prisma } = await import("@prisma/client");
  const { CORRESPONDANCE, IDENTITES_SCALAIRES } = await import("./correspondance");
  const { relations, ErreurPortee } = await import("./borne");
  const { clientBorne } = await import("./client");
  const { creerEnLotVerifie, nomDuDelegue } = await import("./lot-verifie");
  const { CLES_SANS_RELATION } = await import("./sonde-cles-croisees");

  const A = randomUUID();
  const B = randomUUID();
  const UA = randomUUID();
  const UB = randomUUID();
  const dbA = clientBorne({ type: "compte", compteId: A, userId: UA });

  const MODELES = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
  const CLASSEMENT = CORRESPONDANCE as Record<string, { racine?: string; parent?: string }>;
  const DU_COMPTE = Object.entries(CLASSEMENT)
    .filter(([, c]) => c.racine !== undefined || c.parent !== undefined)
    .map(([nom]) => nom);

  type Delegue = Record<string, (a: object) => Promise<unknown>>;
  const delegue = (client: unknown, nom: string) => (client as Record<string, Delegue>)[nomDuDelegue(nom)];
  const identifiant = (nom: string) => MODELES.get(nom)!.fields.find((f) => f.isId)!.name;
  /** La racine d'un modèle, si elle est unique (un abonnement par compte) : le témoin libère la place d'abord. */
  const racineUnique = (nom: string) => {
    const r = CLASSEMENT[nom].racine;
    return r !== undefined && MODELES.get(nom)!.fields.some((f) => f.name === r && f.isUnique) ? r : null;
  };

  /**
   * Le champ qu'une mise à jour modifie pour se voir : un scalaire libre — ni
   * identifiant, ni clé, ni membre d'une contrainte d'unicité, ni liste, ni
   * énumération. Une chaîne de préférence, sinon un entier, sinon du JSON.
   */
  function champLibre(nom: string): { champ: string; valeur: unknown } {
    const m = MODELES.get(nom)!;
    const cles = new Set(m.fields.flatMap((f) => f.relationFromFields ?? []));
    const uniques = new Set([...m.uniqueFields.flat(), ...m.fields.filter((f) => f.isUnique).map((f) => f.name)]);
    const libres = m.fields.filter(
      (f) => f.kind === "scalar" && !f.isId && !f.isList && !f.isUpdatedAt && !cles.has(f.name) && !uniques.has(f.name),
    );
    const s = libres.find((f) => f.type === "String");
    if (s) return { champ: s.name, valeur: "matrice" };
    const i = libres.find((f) => f.type === "Int");
    if (i) return { champ: i.name, valeur: 2 };
    const j = libres.find((f) => f.type === "Json");
    if (j) return { champ: j.name, valeur: { matrice: true } };
    throw new Error(`matrice : aucun champ libre pour ${nom}`);
  }

  /** Les clés que la borne connaît : relations vers un compte ou l'identité, et identités scalaires. */
  const clesEprouvees = (nom: string) => [
    ...relations(nom)
      .filter((r) => r.cle !== undefined && r.genre !== "hors")
      .map((r) => ({ cle: r.cle!, identite: r.genre === "identite" })),
    ...(IDENTITES_SCALAIRES[nom as keyof typeof IDENTITES_SCALAIRES] ?? []).map((cle) => ({ cle, identite: true })),
  ];

  const lignes: Record<"A" | "B", Record<string, Ligne[]>> = { A: {}, B: {} };
  const graines: Record<"A" | "B", Graine> = { A: {}, B: {} };
  let n = 0;

  async function semer(qui: "A" | "B", compteId: string, userId: string) {
    await prisma.user.create({ data: { id: userId, name: qui, email: `${userId}@exemple.invalid` } });
    await prisma.compte.create({
      data: { id: compteId, name: qui, slug: compteId, membres: { create: { userId, role: "owner" } } },
    });
    const g: Graine = { compte: compteId, user: userId };
    for (const [nom, fabriques] of Object.entries(FABRIQUES)) {
      lignes[qui][nom] = [];
      for (const fabrique of fabriques) {
        const ligne = (await delegue(prisma, nom).create({ data: fabrique(g, ++n) })) as Ligne;
        lignes[qui][nom].push(ligne);
        g[nom] ??= ligne[identifiant(nom)] as string;
      }
      // Un second établissement, nu : les témoins de création y rattachent les
      // modèles qui n'admettent qu'une ligne par établissement (DUERP, carnet,
      // registre public).
      if (nom === "Etablissement") {
        const etab2 = (await delegue(prisma, "Etablissement").create({ data: FABRIQUES.Etablissement[0](g, ++n) })) as Ligne;
        g.etab2 = etab2.id as string;
      }
    }
    graines[qui] = g;
  }

  async function vider() {
    await prisma.$executeRawUnsafe('TRUNCATE "Entreprise" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE "Compte" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE "User" CASCADE');
  }

  beforeAll(async () => {
    await vider();
    await semer("A", A, UA);
    await semer("B", B, UB);
  });
  afterAll(async () => {
    await vider();
    await prisma.$disconnect();
  });

  /** Exécute `fn` dans une transaction du client de A, puis l'annule : un témoin n'écrit rien. */
  const ANNULER = new Error("annuler le témoin");
  async function puisAnnuler<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    let rendu: T | undefined;
    try {
      await dbA.$transaction(async (tx) => {
        rendu = await fn(tx);
        throw ANNULER;
      });
    } catch (e) {
      if (e !== ANNULER) throw e;
    }
    return rendu as T;
  }

  /**
   * Un refus de la borne, sur une écriture VALIDÉE (hors transaction) :
   * `ErreurPortee`, ou la cible bornée introuvable (P2025, P2018) — jamais une
   * autre erreur. `motif` : ce que le message doit dire, quand plusieurs
   * refus sont possibles et qu'un seul prouve quelque chose.
   */
  async function refuse(operation: () => Promise<unknown>, motif?: RegExp) {
    const erreur = await operation().then(
      () => null,
      (e: unknown) => e,
    );
    expect(erreur, "l'opération devait être refusée").not.toBeNull();
    const bornee =
      erreur instanceof ErreurPortee ||
      (erreur instanceof Prisma.PrismaClientKnownRequestError && ["P2025", "P2018"].includes(erreur.code));
    expect(bornee, `refus attendu de la borne, reçu : ${(erreur as Error).message}`).toBe(true);
    if (motif) expect((erreur as Error).message).toMatch(motif);
  }

  /** La ligne, relue par le client brut : présente et telle que semée (son champ libre, ses clés). */
  async function intacte(nom: string, ligne: Ligne) {
    const id = identifiant(nom);
    const relue = (await delegue(prisma, nom).findUnique({ where: { [id]: ligne[id] } })) as Ligne | null;
    expect(relue, `${nom} ${String(ligne[id])} a disparu`).not.toBeNull();
    expect(relue![champLibre(nom).champ]).toEqual(ligne[champLibre(nom).champ]);
    for (const { cle } of clesEprouvees(nom)) expect(relue![cle]).toEqual(ligne[cle]);
  }

  /** Une ligne neuve de A pour `nom`, rattachée au second établissement (unicité par établissement). */
  const donneesA = (nom: string, variante = 0) =>
    FABRIQUES[nom][variante]({ ...graines.A, Etablissement: graines.A.etab2 }, ++n);

  /** Dans un témoin : libère la place d'une racine unique (l'abonnement de A), par le client borné. */
  async function liberer(tx: unknown, nom: string) {
    if (racineUnique(nom)) await delegue(tx, nom).deleteMany({});
  }

  // --- Ce que couvre la matrice ------------------------------------------------

  describe("couverture", () => {
    it("chaque modèle d'un compte a sa fabrique, et seulement eux", () => {
      expect(DU_COMPTE.length).toBeGreaterThan(30);
      expect([...DU_COMPTE].sort()).toEqual(Object.keys(FABRIQUES).sort());
    });

    it("chaque clé que la borne connaît est remplie chez B par au moins une variante", () => {
      const vides = DU_COMPTE.flatMap((nom) =>
        clesEprouvees(nom)
          .filter(({ cle }) => !lignes.B[nom].some((l) => l[cle] != null))
          .map(({ cle }) => `${nom}.${cle}`),
      );
      expect(vides).toEqual([]);
    });

    it("toute colonne UUID sans relation d'un modèle de compte est une identité bornée", () => {
      // Ancrage lu dans le schéma, indépendant d'IDENTITES_SCALAIRES : sans
      // lui, retirer une entrée de cette table retirait aussi son test, et la
      // matrice restait verte (mutation éprouvée le 2026-11-09).
      const nonBornees = DU_COMPTE.flatMap((nom) => {
        const m = MODELES.get(nom)!;
        const cles = new Set(m.fields.flatMap((f) => f.relationFromFields ?? []));
        return m.fields
          .filter((f) => f.kind === "scalar" && !f.isId && !cles.has(f.name) && f.nativeType?.[0] === "Uuid")
          .filter((f) => !clesEprouvees(nom).some((c) => c.cle === f.name))
          .map((f) => `${nom}.${f.name}`);
      });
      expect(nonBornees).toEqual([]);
    });

    it("la frontière : les identifiants sans relation sont hors de la borne, donc hors de la matrice", () => {
      // Gardés par leur code nommé et par la sonde (en-tête du fichier).
      expect(CLES_SANS_RELATION.length).toBeGreaterThan(0);
      const dansLaMatrice = CLES_SANS_RELATION.filter(({ modele, cle }) =>
        clesEprouvees(modele).some((c) => c.cle === cle),
      ).map(({ modele, cle }) => `${modele}.${cle}`);
      expect(dansLaMatrice).toEqual([]);
    });
  });

  // --- La matrice, modèle par modèle --------------------------------------------

  describe.each(Object.keys(FABRIQUES))("%s", (nom) => {
    const ligneA = () => lignes.A[nom][0];
    const ligneB = () => lignes.B[nom][0];
    const id = () => identifiant(nom);
    const whereB = () => ({ [id()]: ligneB()[id()] });

    it("lectures : la ligne de B est absente, celle de A présente", async () => {
      const d = delegue(dbA, nom);
      expect(await d.findUnique({ where: whereB() })).toBeNull();
      expect(await d.findFirst({ where: whereB() })).toBeNull();
      expect(await d.findMany({ where: whereB() })).toEqual([]);
      expect(await d.count({ where: whereB() })).toBe(0);
      expect(await d.aggregate({ where: whereB(), _count: { _all: true } })).toEqual({ _count: { _all: 0 } });
      expect(await d.groupBy({ by: [id()], where: whereB() })).toEqual([]);
      await refuse(() => d.findUniqueOrThrow({ where: whereB() }));
      await refuse(() => d.findFirstOrThrow({ where: whereB() }));
      expect(await d.findUnique({ where: { [id()]: ligneA()[id()] } })).not.toBeNull();
    });

    it("écritures par identifiant sur B : refusées ou sans effet, B relue intacte ; le témoin sur A écrit", async () => {
      const { champ, valeur } = champLibre(nom);
      const d = delegue(dbA, nom);
      await refuse(() => d.update({ where: whereB(), data: { [champ]: valeur } }));
      await refuse(() => d.delete({ where: whereB() }));
      expect(await d.updateMany({ where: whereB(), data: { [champ]: valeur } })).toEqual({ count: 0 });
      expect(await d.deleteMany({ where: whereB() })).toEqual({ count: 0 });
      await intacte(nom, ligneB());

      const temoin = await puisAnnuler((tx) =>
        delegue(tx, nom).update({ where: { [id()]: ligneA()[id()] }, data: { [champ]: valeur } }),
      );
      expect((temoin as Ligne)[champ]).toEqual(valeur);
    });

    it("upsert sur l'identifiant de B : crée chez A, ne touche pas B", async () => {
      const { champ, valeur } = champLibre(nom);
      // Une racine unique (l'abonnement) : la place de A est libérée, puis rendue.
      const unique = racineUnique(nom);
      if (unique) await delegue(prisma, nom).delete({ where: { [id()]: ligneA()[id()] } });
      try {
        const cree = (await delegue(dbA, nom).upsert({
          where: whereB(),
          create: donneesA(nom),
          update: { [champ]: valeur },
        })) as Ligne;
        expect(cree[id()]).not.toEqual(ligneB()[id()]);
        expect(await delegue(dbA, nom).findUnique({ where: { [id()]: cree[id()] } })).not.toBeNull();
        await delegue(prisma, nom).delete({ where: { [id()]: cree[id()] } });
        await intacte(nom, ligneB());
      } finally {
        if (unique) await delegue(prisma, nom).create({ data: ligneA() });
      }
    });

    it("création : le témoin de chaque variante, rattaché à A, réussit", async () => {
      for (const v of FABRIQUES[nom].keys()) {
        const cree = (await puisAnnuler(async (tx) => {
          await liberer(tx, nom);
          return delegue(tx, nom).create({ data: donneesA(nom, v) });
        })) as Ligne;
        expect(cree[id()]).toBeTruthy();
      }
    });

    it.each(clesEprouvees(nom).map((c) => [c.cle] as const))(
      "clé %s vers la ligne de B : création et mise à jour refusées ; les mêmes, vers A, passent",
      async (cle) => {
        const v = lignes.B[nom].findIndex((l) => l[cle] != null);
        const valeurB = lignes.B[nom][v][cle];
        const ligneDeA = lignes.A[nom][v];
        // Témoin d'abord : les mêmes données, la clé de A, passent — le refus
        // qui suit ne tient donc qu'à la clé éprouvée.
        const donnees = donneesA(nom, v);
        await puisAnnuler(async (tx) => {
          await liberer(tx, nom);
          return delegue(tx, nom).create({ data: donnees });
        });
        await refuse(() => delegue(dbA, nom).create({ data: { ...donnees, [cle]: valeurB } }));
        await refuse(() => delegue(dbA, nom).update({ where: { [id()]: ligneDeA[id()] }, data: { [cle]: valeurB } }));
        // La ligne de A n'a pas été déplacée vers B.
        await intacte(nom, ligneDeA);
        const temoin = (await puisAnnuler((tx) =>
          delegue(tx, nom).update({ where: { [id()]: ligneDeA[id()] }, data: { [cle]: ligneDeA[cle] } }),
        )) as Ligne;
        expect(temoin[cle]).toEqual(ligneDeA[cle]);
      },
    );

    it("createMany et creerEnLotVerifie rattachés à B : refusés pour le rattachement ; le lot vérifié de A passe", async () => {
      const c = CLASSEMENT[nom];
      const rattachement = c.racine ?? relations(nom).find((r) => r.nom === c.parent)!.cle!;
      const donnees = donneesA(nom);
      // Les clés d'identité retirées : `createMany` les refuse toutes (pas de
      // `connect`), et ce refus-là ne dirait rien du rattachement.
      const personnes = relations(nom)
        .filter((r) => r.genre === "identite" && r.porteePar === "userId" && r.cle)
        .map((r) => r.cle!);
      const sansIdentite = Object.fromEntries(Object.entries(donnees).filter(([k]) => !personnes.includes(k)));
      const ligneDeB = { ...sansIdentite, [rattachement]: ligneB()[rattachement] };
      const motif = c.racine ? /différent du compte/ : /parents non vérifiés|hors du compte/;
      await refuse(() => delegue(dbA, nom).createMany({ data: [ligneDeB] }), motif);
      await refuse(() => creerEnLotVerifie(dbA, nom as never, [ligneDeB]), motif);

      // Une clé vers une personne n'est pas bornable dans `createMany` : la
      // borne refuse le lot entier, même de A. Forme non servie — dite ici,
      // pour qu'un lot de ces modèles ne passe pas un jour pour un oubli.
      if (Object.keys(sansIdentite).length !== Object.keys(donnees).length) {
        await refuse(() => creerEnLotVerifie(dbA, nom as never, [donnees]), /hors compte/);
        return;
      }
      const temoin = await puisAnnuler(async (tx) => {
        await liberer(tx, nom);
        return creerEnLotVerifie(tx as never, nom as never, [donnees]);
      });
      expect(temoin).toEqual({ count: 1 });
    });
  });
});
