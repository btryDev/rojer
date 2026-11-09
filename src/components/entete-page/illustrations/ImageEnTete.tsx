import Image from "next/image";

/**
 * Une illustration d'en-tête générée (Krea), détourée : le fond est
 * transparent pour que la teinte de la section passe dessous, et c'est elle
 * seule qui donne le pêche, le même derrière toutes les pages d'une section.
 *
 * Image plate, donc sans animation.
 */
export function ImageEnTete({
  src,
  width,
  height,
  className,
}: {
  src: string;
  width: number;
  height: number;
  className: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      priority
      sizes="(min-width: 768px) 360px, 0px"
      className={`h-auto ${className}`}
    />
  );
}
