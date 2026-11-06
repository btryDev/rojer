// Le cadre photo des sections de la page publique : coins très arrondis,
// image recadrée sans être déformée. 4/5 par défaut (« Concentrez-vous ») ;
// l'illustration de « Un outil simple et transparent » le prend en 4/3. Un
// seul endroit pour les rayons.

import Image from "next/image";

/** Une photo de la page publique : chemin, texte alternatif, point focal. */
export type PhotoLanding = {
  src: string;
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
  /** Couleur du cadre pendant le chargement. */
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
        className="object-cover"
        style={{ objectPosition: photo.position }}
      />
    </div>
  );
}
