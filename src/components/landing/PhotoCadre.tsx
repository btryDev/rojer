// Le cadre photo des sections de la page publique : coins très arrondis,
// image recadrée sans être déformée. 4/5 par défaut (« Concentrez-vous ») ;
// l'illustration de « Un outil simple et transparent » le prend en 4/3. Un
// seul endroit pour les rayons.

import Image, { type StaticImageData } from "next/image";

/**
 * Une photo de la page publique : fichier importé, texte alternatif, point
 * focal. Importé (et non un chemin) : Next en tire l'aperçu flou affiché
 * pendant le chargement.
 */
export type PhotoLanding = {
  src: StaticImageData;
  alt: string;
  /** `object-position` : ce qu'on garde quand le cadre recadre. */
  position?: string;
};

export function PhotoCadre({
  photo,
  fond,
  ratio = "4 / 5",
  sizes = "(max-width: 1023px) 92vw, 34vw",
}: {
  photo: PhotoLanding;
  /** Couleur du cadre, sous l'aperçu flou. */
  fond: string;
  ratio?: string;
  sizes?: string;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[30px] lg:rounded-[38px]"
      style={{ background: fond, aspectRatio: ratio }}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        placeholder="blur"
        className="object-cover"
        style={{ objectPosition: photo.position }}
      />
    </div>
  );
}
