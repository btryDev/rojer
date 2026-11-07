// Les imports d'images (`import photo from "…/photo.jpg"`) sont typés par
// `next-env.d.ts`, que Next régénère et que le dépôt ignore : la CI, qui
// vérifie les types sans build, ne l'a pas. Cette référence, versionnée,
// lui donne les mêmes déclarations.
/// <reference types="next/image-types/global" />
