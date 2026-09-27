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
  // d'arrivée des lectures.
  const pris = new Set<string>();
  const taches = fichiers.map((f) => ({ f, nom: nomDansLArchive(f, pris, defaut) }));
  // Lectures EN PARALLÈLE BORNÉ (contre-lecture du 2026-09-27) : une à une,
  // vingt rapports faisaient vingt allers-retours au stockage ; toutes
  // ensemble, autant de connexions ouvertes d'un coup.
  let suivante = 0;
  const ouvrier = async () => {
    while (suivante < taches.length) {
      const { f, nom } = taches[suivante++];
      try {
        if (!stockage) throw new Error("stockage indisponible");
        cible.file(nom, new Uint8Array(await stockage.get(f.cle)));
        compte.inclus++;
      } catch (e) {
        compte.manquants++;
        console.error(`controle-zip : fichier non récupéré (${dossier}/${nom})`, e);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(LECTURES_SIMULTANEES, taches.length) }, ouvrier),
  );
  return compte;
}

/** Lectures du stockage menées de front pour un dossier du ZIP. */
export const LECTURES_SIMULTANEES = 4;

/**
 * L'archive en FLUX (contre-lecture du 2026-09-27). Vercel refuse une réponse
 * de plus de 4,5 Mo — sauf en flux (« streaming functions, which don't have
 * this limit », guide Vercel relu le même jour) —, et trois rapports de 2 Mo
 * suffisaient à la dépasser quand la route rendait `generateAsync` d'un bloc.
 * Les fichiers sont déjà lus quand le flux commence : un échec de lecture
 * reste compté au README, il n'interrompt pas un téléchargement entamé.
 */
export function zipEnFlux(zip: JSZip): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controleur) {
      zip
        .generateInternalStream({ type: "uint8array", streamFiles: true })
        .on("data", (morceau) => controleur.enqueue(morceau))
        .on("error", (e) => controleur.error(e))
        .on("end", () => controleur.close())
        .resume();
    },
  });
}
