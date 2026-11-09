// La matrice d'isolation, générée (chantier 1 du renforcement, 2026-11-09).
//
// Pour CHAQUE modèle d'un compte de `CORRESPONDANCE` — pas une liste recopiée —,
// deux comptes A et B portent chacun leurs lignes, et le client borné à A est
// éprouvé contre celles de B, sur un vrai PostgreSQL :
//   - lectures par identifiant (`findUnique`, `findFirst`, `findMany`, `count`) :
//     rien ;
//   - écritures par identifiant (`update`, `updateMany`, `delete`, `deleteMany`) :
//     refusées ou sans effet, la ligne de B intacte ;
//   - `upsert` sur l'identifiant de B : crée chez A, B intact ;
//   - création, et mise à jour, dont UNE clé (de rattachement, secondaire, de
//     racine ou d'identité) désigne la ligne de B : refusées — chaque clé du
//     schéma, une à une ;
//   - `createMany` et `creerEnLotVerifie` rattachés au parent de B : refusés.
// Chaque refus a son témoin : la même opération sur les lignes de A réussit
// (dans une transaction annulée). Sans témoin, une fabrique cassée passerait
// pour une borne qui tient.
//
// Ce que ce fichier ne refait pas : les formes servies ou refusées par la borne
// (`client.integration.test.ts`), et les liens croisés déjà en base (la sonde,
// `sonde-cles-croisees.ts`). Ce qu'il ajoute : la couverture de TOUS les
// modèles et de TOUTES leurs clés, et un modèle ajouté demain sans fabrique
// fait tomber le fichier.
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
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

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

/**
 * Les témoins de création qui ne peuvent pas réussir, et pourquoi. Le refus,
 * lui, est éprouvé quand même.
 */
const SANS_TEMOIN_DE_CREATION: Record<string, string> = {
  Abonnement: "un abonnement par compte (`compteId` unique) : A a déjà le sien",
};

describe.skipIf(!URL_BASE || !local)("matrice d'isolation, générée — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { Prisma } = await import("@prisma/client");
  const { CORRESPONDANCE } = await import("./correspondance");
  const { relations, ErreurPortee } = await import("./borne");
  const { clientBorne } = await import("./client");
  const { creerEnLotVerifie } = await import("./lot-verifie");

  const A = randomUUID();
  const B = randomUUID();
  const UA = randomUUID();
  const UB = randomUUID();
  const dbA = clientBorne({ type: "compte", compteId: A, userId: UA });

  const MODELES = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
  const DU_COMPTE = Object.entries(CORRESPONDANCE as Record<string, object>)
    .filter(([, c]) => "racine" in c || "parent" in c)
    .map(([nom]) => nom);

  const cleDelegue = (nom: string) => nom.charAt(0).toLowerCase() + nom.slice(1);
  type Delegue = Record<string, (a: object) => Promise<unknown>>;
  const delegue = (client: unknown, nom: string) => (client as Record<string, Delegue>)[cleDelegue(nom)];
  const identifiant = (nom: string) => MODELES.get(nom)!.fields.find((f) => f.isId)!.name;

  /**
   * Le champ qu'une mise à jour modifie pour se voir : un scalaire libre — ni
   * identifiant, ni clé, ni membre d'une contrainte d'unicité, ni liste, ni
   * énumération. Une chaîne de préférence, sinon un entier.
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

  /** Les clés d'un modèle vers une ligne d'un compte ou vers l'identité : chacune est éprouvée. */
  const clesEprouvees = (nom: string) =>
    relations(nom).filter((r) => r.cle !== undefined && r.genre !== "hors").map((r) => ({ cle: r.cle!, cible: r.cible }));

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

  /** Un refus de la borne : `ErreurPortee`, ou la cible bornée introuvable (P2025, P2018) — jamais une autre erreur. */
  async function refuse(operation: (tx: unknown) => Promise<unknown>) {
    const erreur = await puisAnnuler(async (tx) => {
      await operation(tx);
      return null;
    }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(erreur, "l'opération devait être refusée").not.toBeNull();
    const bornee =
      erreur instanceof ErreurPortee ||
      (erreur instanceof Prisma.PrismaClientKnownRequestError && ["P2025", "P2018"].includes(erreur.code));
    expect(bornee, `refus attendu de la borne, reçu : ${(erreur as Error).message}`).toBe(true);
  }

  /** La ligne de B, relue par le client brut : présente et telle que semée. */
  async function bIntacte(nom: string, ligneB: Ligne) {
    const id = identifiant(nom);
    const relue = (await delegue(prisma, nom).findUnique({ where: { [id]: ligneB[id] } })) as Ligne | null;
    expect(relue).not.toBeNull();
    const { champ } = champLibre(nom);
    expect(relue![champ]).toEqual(ligneB[champ]);
  }

  /** Une ligne neuve de A pour `nom`, rattachée au second établissement (unicité par établissement). */
  const donneesA = (nom: string, variante = 0) =>
    FABRIQUES[nom][variante]({ ...graines.A, Etablissement: graines.A.etab2 }, ++n);

  // --- Ce que couvre la matrice ------------------------------------------------

  describe("couverture", () => {
    it("chaque modèle d'un compte a sa fabrique, et seulement eux", () => {
      expect(DU_COMPTE.length).toBeGreaterThan(30);
      expect([...DU_COMPTE].sort()).toEqual(Object.keys(FABRIQUES).sort());
    });

    it("chaque clé vers un compte ou l'identité est remplie chez B par au moins une variante", () => {
      const vides = DU_COMPTE.flatMap((nom) =>
        clesEprouvees(nom)
          .filter(({ cle }) => !lignes.B[nom].some((l) => l[cle] != null))
          .map(({ cle }) => `${nom}.${cle}`),
      );
      expect(vides).toEqual([]);
    });

    it("les exemptions de témoin nomment des modèles de la matrice", () => {
      expect(Object.keys(SANS_TEMOIN_DE_CREATION).filter((m) => !(m in FABRIQUES))).toEqual([]);
    });
  });

  // --- La matrice, modèle par modèle --------------------------------------------

  describe.each(Object.keys(FABRIQUES))("%s", (nom) => {
    const ligneA = () => lignes.A[nom][0];
    const ligneB = () => lignes.B[nom][0];
    const id = () => identifiant(nom);

    it("lectures : la ligne de B est absente, celle de A présente", async () => {
      const d = delegue(dbA, nom);
      const whereB = { [id()]: ligneB()[id()] };
      expect(await d.findUnique({ where: whereB })).toBeNull();
      expect(await d.findFirst({ where: whereB })).toBeNull();
      expect(await d.findMany({ where: whereB })).toEqual([]);
      expect(await d.count({ where: whereB })).toBe(0);
      expect(await d.findUnique({ where: { [id()]: ligneA()[id()] } })).not.toBeNull();
    });

    it("écritures par identifiant : refusées ou sans effet sur B ; le témoin sur A écrit", async () => {
      const { champ, valeur } = champLibre(nom);
      const whereB = { [id()]: ligneB()[id()] };
      await refuse((tx) => delegue(tx, nom).update({ where: whereB, data: { [champ]: valeur } }));
      await refuse((tx) => delegue(tx, nom).delete({ where: whereB }));
      const sansEffet = await puisAnnuler(async (tx) => [
        await delegue(tx, nom).updateMany({ where: whereB, data: { [champ]: valeur } }),
        await delegue(tx, nom).deleteMany({ where: whereB }),
      ]);
      expect(sansEffet).toEqual([{ count: 0 }, { count: 0 }]);
      await bIntacte(nom, ligneB());

      const temoin = await puisAnnuler((tx) =>
        delegue(tx, nom).update({ where: { [id()]: ligneA()[id()] }, data: { [champ]: valeur } }),
      );
      expect((temoin as Ligne)[champ]).toEqual(valeur);
    });

    it("upsert sur l'identifiant de B : ne touche pas B", async () => {
      if (nom in SANS_TEMOIN_DE_CREATION) return;
      const { champ, valeur } = champLibre(nom);
      const cree = (await puisAnnuler((tx) =>
        delegue(tx, nom).upsert({ where: { [id()]: ligneB()[id()] }, create: donneesA(nom), update: { [champ]: valeur } }),
      )) as Ligne;
      expect(cree[id()]).not.toEqual(ligneB()[id()]);
      await bIntacte(nom, ligneB());
    });

    it("création : le témoin, rattaché à A, réussit", async () => {
      if (nom in SANS_TEMOIN_DE_CREATION) return;
      for (const v of FABRIQUES[nom].keys()) {
        const cree = (await puisAnnuler((tx) => delegue(tx, nom).create({ data: donneesA(nom, v) }))) as Ligne;
        expect(cree[id()]).toBeTruthy();
      }
    });

    it.each(clesEprouvees(nom).map((c) => [c.cle, c] as const))(
      "clé %s vers la ligne de B : création et mise à jour refusées, témoin sur A",
      async (cle) => {
        const v = lignes.B[nom].findIndex((l) => l[cle] != null);
        const valeurB = lignes.B[nom][v][cle];
        await refuse((tx) => delegue(tx, nom).create({ data: { ...donneesA(nom, v), [cle]: valeurB } }));
        const ligneDeA = lignes.A[nom][v];
        await refuse((tx) => delegue(tx, nom).update({ where: { [id()]: ligneDeA[id()] }, data: { [cle]: valeurB } }));
        // Témoin : la même mise à jour, avec la valeur de A, passe.
        const temoin = (await puisAnnuler((tx) =>
          delegue(tx, nom).update({ where: { [id()]: ligneDeA[id()] }, data: { [cle]: ligneDeA[cle] } }),
        )) as Ligne;
        expect(temoin[cle]).toEqual(ligneDeA[cle]);
        await bIntacte(nom, ligneB());
      },
    );

    it("createMany et creerEnLotVerifie rattachés à B : refusés ; le lot vérifié de A passe", async () => {
      const [rattachement] = clesEprouvees(nom).filter(({ cle }) => {
        const c = (CORRESPONDANCE as Record<string, { parent?: string; racine?: string }>)[nom];
        return c.racine === cle || relations(nom).find((r) => r.nom === c.parent)?.cle === cle;
      });
      expect(rattachement, "la clé de rattachement du modèle").toBeDefined();
      const ligneDeB = { ...donneesA(nom), [rattachement.cle]: ligneB()[rattachement.cle] };
      await refuse((tx) => delegue(tx, nom).createMany({ data: [ligneDeB] }));
      await refuse((tx) => creerEnLotVerifie(tx as never, nom as never, [ligneDeB]));
      // `createMany` n'accepte pas de `connect` : une clé vers l'identité (une
      // personne, `User`) n'y est pas bornable, la borne refuse le lot entier,
      // même de A. Forme non servie — dite ici, pour qu'un lot de ces modèles
      // ne passe pas un jour pour un oubli.
      const identite = relations(nom).some((r) => r.genre === "identite" && r.porteePar === "userId" && r.cle && donneesA(nom)[r.cle] != null);
      if (identite) {
        await refuse((tx) => creerEnLotVerifie(tx as never, nom as never, [donneesA(nom)]));
        return;
      }
      if (nom in SANS_TEMOIN_DE_CREATION) return;
      const temoin = await puisAnnuler((tx) => creerEnLotVerifie(tx as never, nom as never, [donneesA(nom)]));
      expect(temoin).toEqual({ count: 1 });
    });
  });
});
