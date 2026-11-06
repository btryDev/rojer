// Le cadre photo vertical des sections de la page publique (« Concentrez-
// vous », « Une prise en main rapide ») : 4/5, coins très arrondis, photo
// recadrée sans être déformée. Un seul endroit pour les rayons et `sizes`.

import Image from "next/image";

/** Une photo de la page publique : chemin, texte alternatif, point focal. */
export type PhotoLanding = {
  src: string;
  alt: string;
  /** `object-position` : ce qu'on garde quand le cadre recadre. */
  position: string;
};

export function PhotoCadre({
  photo,
  fond,
}: {
  photo: PhotoLanding;
  /** Couleur du cadre pendant le chargement. */
  fond: string;
}) {
  return (
    <div
      className="relative aspect-[4/5] w-full overflow-hidden rounded-[30px] lg:rounded-[38px]"
      style={{ background: fond }}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="(max-width: 1023px) 92vw, 34vw"
        className="object-cover"
        style={{ objectPosition: photo.position }}
      />
    </div>
  );
}
