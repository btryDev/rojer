import Image, { type StaticImageData } from "next/image";

/**
 * Une illustration d'en-tête générée (Krea), détourée : le fond est
 * transparent pour que la teinte de la section passe dessous. Image plate,
 * donc sans animation.
 *
 * Importée en statique (`src/assets/entetes/`) : Next en tire les dimensions
 * et une adresse à empreinte — un dessin refait change d'adresse, aucun cache
 * ne ressert l'ancien.
 *
 * La largeur se déduit du ratio, à un seul endroit : une hauteur de
 * 253 à 340 px (24vw entre les deux), plafonnée à 400 px de large pour les
 * dessins couchés. `sizes` reprend la même largeur maximale.
 */
export function ImageEnTete({ image }: { image: StaticImageData }) {
  const ratio = image.width / image.height;
  // La largeur qui donne cette hauteur, plafonnée (en px comme en vw).
  const largeur = (hauteur: number, plafond: number) =>
    Math.round(Math.min(hauteur * ratio, plafond));
  const max = largeur(340, 400);
  return (
    <Image
      src={image}
      alt=""
      preload
      sizes={`(min-width: 768px) ${max}px, 0px`}
      style={{ width: `clamp(${largeur(253, 300)}px, ${largeur(24, 30)}vw, ${max}px)` }}
      className="h-auto"
    />
  );
}
