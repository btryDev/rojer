"use client";

import Image from "next/image";
import { useId, useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import {
  deposerPhotoEtablissement,
  retirerPhotoEtablissement,
} from "@/lib/etablissements/photo";
import { COTE_MAX_PHOTO } from "@/lib/etablissements/photo-regle";
import type { IllustrationBatiment } from "@/lib/etablissements/illustration";

/**
 * La carte du lieu, dans le hero du tableau de bord : la photo déposée par le
 * dirigeant, ou l'illustration du genre de lieu à défaut (2026-10-25).
 *
 * Avant l'envoi, la photo est ré-encodée ici : décodée par le navigateur
 * (orientation du téléphone respectée), réduite à `COTE_MAX_PHOTO` px au
 * plus sur son grand côté, ré-écrite en JPEG. Deux effets voulus : le
 * fichier pèse quelques centaines de Ko au lieu de plusieurs Mo, et il perd
 * ses métadonnées EXIF — dont la position GPS qu'un téléphone y inscrit.
 * Le serveur revalide de toute façon type, contenu et taille.
 */
async function decoder(fichier: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(fichier, { imageOrientation: "from-image" });
  } catch (e) {
    // Un navigateur qui ne connaît pas encore cette valeur lève une
    // TypeError : on décode sans, l'orientation du téléphone peut alors
    // être perdue, mais la photo part.
    if (e instanceof TypeError) return createImageBitmap(fichier);
    throw e;
  }
}

async function reencoder(fichier: File): Promise<File> {
  const image = await decoder(fichier);
  const echelle = Math.min(1, COTE_MAX_PHOTO / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponible");
  // Fond blanc d'abord : le JPEG n'a pas d'alpha, et un PNG transparent
  // (logo, photo détourée) ressortait sur fond noir.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) throw new Error("ré-encodage impossible");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

const BOUTON =
  "inline-flex h-8 items-center gap-1.5 rounded-full bg-[color:var(--board-card)]/95 px-3 text-[12px] font-semibold text-[color:var(--board-ink)] shadow-[0_0_0_1px_rgba(13,18,36,.12),0_4px_12px_-6px_rgba(13,18,36,.3)] transition-colors hover:bg-[color:var(--board-card)] disabled:opacity-60";

export function CartePhotoLieu({
  etablissementId,
  photo,
  illustration,
}: {
  etablissementId: string;
  /** L'adresse de la photo déposée, ou `null`. */
  photo: string | null;
  illustration: IllustrationBatiment;
}) {
  const [depotEnCours, lancerDepot] = useTransition();
  const [retraitEnCours, lancerRetrait] = useTransition();
  // Une seule erreur affichée, remise à zéro à chaque geste : celle de la
  // lecture locale, du dépôt ou du retrait.
  const [erreur, setErreur] = useState<string | null>(null);
  // Le ré-encodage d'une grande photo prend une à deux secondes : le bouton
  // est occupé dès le choix du fichier, pas seulement pendant l'envoi.
  const [preparation, setPreparation] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const idConseil = useId();
  const occupe = preparation || depotEnCours || retraitEnCours;

  async function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setErreur(null);
    setPreparation(true);
    let pret: File;
    try {
      pret = await reencoder(fichier);
    } catch {
      setErreur("Cette image n'a pas pu être lue. Essayez une photo JPEG ou PNG.");
      return;
    } finally {
      setPreparation(false);
    }
    const fd = new FormData();
    fd.set("photo", pret);
    lancerDepot(async () => {
      const r = await deposerPhotoEtablissement(etablissementId, fd);
      if (r.status === "error") setErreur(r.message);
    });
  }

  function retirer() {
    setErreur(null);
    lancerRetrait(async () => {
      const r = await retirerPhotoEtablissement(etablissementId);
      if (r.status === "error") setErreur(r.message);
    });
  }

  return (
    <div className="relative min-h-[220px] overflow-hidden rounded-[24px] bg-[color:var(--board-card)] ring-1 ring-[color:rgba(13,18,36,.10)]">
      {photo ? (
        // Non optimisée : la photo est servie sous session
        // (`/api/etablissements/[id]/photo`), l'optimiseur la demanderait sans.
        <Image
          src={photo}
          alt="Photo de l'établissement"
          fill
          unoptimized
          // Le premier plan du hero : chargée d'emblée, comme l'illustration.
          priority
          sizes="(min-width: 1024px) 380px, 100vw"
          className="object-cover"
        />
      ) : (
        // Décoratif : tout ce que le dessin évoque est écrit dans la fiche.
        <Image
          src={`/illustrations/batiments/${illustration}.webp`}
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 1024px) 380px, 100vw"
          priority
          className="select-none object-contain p-5 pb-12"
        />
      )}

      <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-end gap-2">
        <input
          ref={champ}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={choisir}
        />
        {/* Le conseil RGPD en infobulle, pas sur l'image (demande de la
            propriétaire) : une vue du lieu n'a pas à montrer de personne
            reconnaissable. Doublé d'une description pour le clavier et les
            lecteurs d'écran, que l'infobulle ne sert pas. */}
        <span id={idConseil} className="sr-only">
          Une vue du lieu, sans personne reconnaissable.
        </span>
        <button
          type="button"
          className={BOUTON}
          disabled={occupe}
          title="Une vue du lieu, sans personne reconnaissable"
          aria-label={photo ? "Changer la photo" : "Ajouter une photo"}
          aria-describedby={idConseil}
          onClick={() => champ.current?.click()}
        >
          <Camera aria-hidden className="size-3.5" />
          {preparation ? "Préparation…" : depotEnCours ? "Envoi…" : photo ? "Changer" : "Ajouter une photo"}
        </button>
        {photo ? (
          <button
            type="button"
            className={BOUTON}
            disabled={occupe}
            aria-label="Retirer la photo"
            onClick={retirer}
          >
            <Trash2 aria-hidden className="size-3.5" />
            Retirer
          </button>
        ) : null}
      </div>

      {erreur ? (
        <p
          role="alert"
          className="absolute inset-x-3 top-3 m-0 rounded-[12px] bg-[color:var(--board-signal-pale)] px-3 py-2 text-[12px] text-[color:var(--board-signal-ink)]"
        >
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
