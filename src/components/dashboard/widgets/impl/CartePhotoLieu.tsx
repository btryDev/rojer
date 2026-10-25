"use client";

import Image from "next/image";
import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import {
  deposerPhotoEtablissement,
  retirerPhotoEtablissement,
  type EtatPhoto,
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
async function reencoder(fichier: File): Promise<File> {
  const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const echelle = Math.min(1, COTE_MAX_PHOTO / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
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
  const [etat, deposer, depotEnCours] = useActionState<EtatPhoto, FormData>(
    deposerPhotoEtablissement.bind(null, etablissementId),
    { status: "idle" },
  );
  const [retraitEnCours, lancerRetrait] = useTransition();
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);
  const [, lancerDepot] = useTransition();
  const champ = useRef<HTMLInputElement>(null);
  const occupe = depotEnCours || retraitEnCours;

  async function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setErreurLocale(null);
    let pret: File;
    try {
      pret = await reencoder(fichier);
    } catch {
      setErreurLocale("Cette image n'a pas pu être lue. Essayez une photo JPEG ou PNG.");
      return;
    }
    const fd = new FormData();
    fd.set("photo", pret);
    lancerDepot(() => deposer(fd));
  }

  const erreur = erreurLocale ?? (etat.status === "error" ? etat.message : null);

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
            reconnaissable. */}
        <button
          type="button"
          className={BOUTON}
          disabled={occupe}
          title="Une vue du lieu, sans personne reconnaissable"
          onClick={() => champ.current?.click()}
        >
          <Camera aria-hidden className="size-3.5" />
          {depotEnCours ? "Envoi…" : photo ? "Changer" : "Ajouter une photo"}
        </button>
        {photo ? (
          <button
            type="button"
            className={BOUTON}
            disabled={occupe}
            onClick={() => lancerRetrait(() => retirerPhotoEtablissement(etablissementId))}
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
