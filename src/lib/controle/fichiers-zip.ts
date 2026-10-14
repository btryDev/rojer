import { Readable } from "node:stream";
import type JSZip from "jszip";
import { cleJourCivil } from "@/lib/dates";
import type { FileStorage } from "@/lib/storage";
import { nomDossierArchive, nomEntreeArchive } from "@/lib/storage/noms";

/**
 * Joindre au ZIP de contrôle les fichiers DÉPOSÉS — rapports de
 * vérification, rapports de laboratoire des analyses de légionelles
 * (2026-09-27, `lot/relire-fichiers-deposes`).
 *
 * LE CONSTAT. Le ZIP partait avec le registre (`03`), qui porte l'INDEX des
 * rapports archivés et dit « Les fichiers originaux des rapports sont
 * conservés et téléchargeables depuis l'application » — mais le ZIP est remis
 * à un tiers qui n'a pas accès à l'application, et aucun texte du dépôt
 * (commentaire de la route, README, ADR) n'écartait ces fichiers. Constaté au
 * premier dépôt réel : sept entrées, aucun rapport. Le registre de sécurité
 * annexe les rapports d'un tiers (R. 4323-26, cité par l'écran « Préparer un
 * contrôle ») : le dossier qui le présente les emporte.
 *
 * Même règle que `Prestataires/` : un fichier que le stockage ne rend pas —
 * stockage non configuré, clé absente, panne — est compté manquant et le
 * README le dit ; l'archive se construit quand même.
 */

export type FichierDepose = {
  id: string;
  cle: string;
  nomOriginal: string | null;
  date: Date;
  /** Ce qui distingue le fichier à la lecture : l'équipement, l'obligation, le laboratoire. */
  etiquette: string | null;
};

export type CompteFichiers = { deposes: number; inclus: number; manquants: number };

/** Le nom de l'entrée : jour civil, étiquette, nom d'origine — assainis, uniques dans le dossier. */
export function nomDansLArchive(f: FichierDepose, dejaPris: Set<string>, defaut: string): string {
  const etiquette = f.etiquette ? `${nomDossierArchive(f.etiquette, "").slice(0, 50)}_` : "";
  const base = `${cleJourCivil(f.date)}_${etiquette}${nomEntreeArchive(f.nomOriginal, defaut)}`;
  const nom = dejaPris.has(base) ? `${f.id.slice(-8)}_${base}` : base;
  dejaPris.add(nom);
  return nom;
}

/**
 * LE CONTENU N'EST PLUS LU ICI (audit Next.js du 2026-10-14, H3). La route
 * lisait chaque fichier en entier avant d'écrire le premier octet : une
 * archive de 300 Mo montait le processus à 700 Mo, quatre ensemble à 1,8 Go.
 * On vérifie ici que le fichier EXISTE — c'est ce que le README compte —, et
 * l'entrée de l'archive ne lit son contenu qu'au moment où le flux l'atteint
 * (`contenuDiffere`) : un fichier en mémoire à la fois, quel que soit leur
 * nombre.
 *
 * Une lecture qui échoue APRÈS une existence constatée — une panne entre les
 * deux — interrompt le téléchargement : l'entrée est déjà annoncée
 * par le README et son en-tête déjà écrit, et une archive qui la tairait ou
 * la laisserait vide mentirait au tiers qui la reçoit. Le dirigeant relance.
 */
export async function joindreFichiers(
  zip: JSZip,
  dossier: string,
  fichiers: FichierDepose[],
  stockage: FileStorage | null,
  defaut: string,
): Promise<CompteFichiers> {
  const compte: CompteFichiers = { deposes: fichiers.length, inclus: 0, manquants: 0 };
  if (fichiers.length === 0) return compte;
  const cible = zip.folder(dossier) ?? zip;
  // Les noms d'abord, dans l'ordre : le dédoublonnage ne dépend pas de l'ordre
  // d'arrivée des réponses.
  const pris = new Set<string>();
  const taches = fichiers.map((f) => ({ f, nom: nomDansLArchive(f, pris, defaut), present: false }));
  // Vérifications EN PARALLÈLE BORNÉ (contre-lecture du 2026-09-27) : une à
  // une, vingt rapports faisaient vingt allers-retours au stockage ; toutes
  // ensemble, autant de connexions ouvertes d'un coup.
  let suivante = 0;
  const ouvrier = async () => {
    while (suivante < taches.length) {
      const t = taches[suivante++];
      t.present = await existe(stockage, t.f.cle, `${dossier}/${t.nom}`);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(LECTURES_SIMULTANEES, taches.length) }, ouvrier),
  );
  // Les entrées, dans l'ordre des fichiers : l'archive ne dépend pas de qui a
  // répondu le premier.
  for (const t of taches) {
    if (!t.present) {
      compte.manquants++;
      continue;
    }
    cible.file(t.nom, contenuDiffere(() => stockage!.get(t.f.cle), `${dossier}/${t.nom}`));
    compte.inclus++;
  }
  return compte;
}

/**
 * Le fichier est-il là ? `false` — compté manquant, dit au README — pour un
 * stockage absent, une clé absente ou une panne : l'archive se construit
 * quand même.
 */
export async function existe(
  stockage: FileStorage | null,
  cle: string,
  etiquette: string,
): Promise<boolean> {
  try {
    if (!stockage) throw new Error("stockage indisponible");
    if (await stockage.exists(cle)) return true;
    throw new Error("fichier absent du stockage");
  } catch (e) {
    console.error(`controle-zip : fichier non récupéré (${etiquette})`, e);
    return false;
  }
}

/**
 * Le contenu d'une entrée, lu au moment où le flux l'atteint et pas avant.
 * JSZip consomme ses entrées une à une, dans l'ordre (`ZipFileWorker.
 * prepareNextSource`) : le flux Node ci-dessous n'est lu qu'à son tour.
 * Un échec détruit le flux de l'entrée, et l'erreur remonte jusqu'à
 * `zipEnFlux`, qui interrompt le téléchargement.
 */
export function contenuDiffere(
  lire: () => Promise<Uint8Array>,
  etiquette: string,
): Readable {
  let demande = false;
  let contenu: Uint8Array | null = null;
  let position = 0;
  // Par tranches : JSZip calcule le CRC de chaque morceau d'un tenant, et un
  // rapport de 20 Mo poussé d'un bloc tenait la boucle ~65 ms (CRC32 de JSZip
  // mesuré à ~17 ms pour 5 Mo). Une tranche n'est poussée que quand la
  // précédente a été prise.
  const pousser = (flux: Readable) => {
    if (!contenu) return;
    if (position >= contenu.byteLength) {
      flux.push(null);
      return;
    }
    flux.push(contenu.subarray(position, position + TRANCHE_OCTETS));
    position += TRANCHE_OCTETS;
  };
  return new Readable({
    read() {
      if (contenu) return pousser(this);
      if (demande) return;
      demande = true;
      lire().then(
        (lu) => {
          contenu = lu;
          pousser(this);
        },
        (e) => {
          console.error(`controle-zip : lecture interrompue (${etiquette})`, e);
          this.destroy(e instanceof Error ? e : new Error(String(e)));
        },
      );
    },
  });
}

/** Taille des tranches d'une entrée lue du stockage. */
export const TRANCHE_OCTETS = 1024 * 1024;

/** Vérifications du stockage menées de front pour un dossier du ZIP. */
export const LECTURES_SIMULTANEES = 4;

/**
 * L'archive en FLUX (contre-lecture du 2026-09-27). Vercel refuse une réponse
 * de plus de 4,5 Mo — sauf en flux (« streaming functions, which don't have
 * this limit », guide Vercel relu le même jour) —, et trois rapports de 2 Mo
 * suffisaient à la dépasser quand la route rendait `generateAsync` d'un bloc.
 *
 * AVEC CONTRE-PRESSION (2026-10-14, H3) : la génération ne produit le morceau
 * suivant que quand le client a pris le précédent (`pull`). Sans elle, un
 * client lent laissait l'archive entière s'accumuler dans la file du flux —
 * la mémoire qu'on venait d'économiser en ne lisant plus tout d'avance.
 *
 * Une entrée illisible (`contenuDiffere`) interrompt le téléchargement ; un
 * client qui abandonne arrête la génération.
 */
export function zipEnFlux(zip: JSZip): ReadableStream<Uint8Array> {
  const generation = zip.generateInternalStream({ type: "uint8array", streamFiles: true });
  // Fermé, en erreur ou abandonné : plus rien n'entre dans le flux.
  let fini = false;
  return new ReadableStream<Uint8Array>({
    start(controleur) {
      const echouer = (e: unknown) => {
        generation.pause();
        if (fini) return;
        fini = true;
        controleur.error(e);
      };
      generation
        .on("data", (morceau) => {
          if (fini) return;
          controleur.enqueue(morceau);
          if ((controleur.desiredSize ?? 1) <= 0) generation.pause();
        })
        .on("error", echouer)
        .on("end", () => {
          if (fini) return;
          fini = true;
          controleur.close();
        });
    },
    pull() {
      generation.resume();
    },
    cancel() {
      fini = true;
      generation.pause();
    },
  });
}
