/**
 * Deux phrases de l'écran du carnet sanitaire qui disent ce que le module
 * porte et à qui l'arrêté du 1er février 2010 s'adresse. Rangées ici, sous
 * `src/components`, pour être balayées avec les autres textes d'écran
 * (`citations-ecran`) et tenues par un test (2026-10-12, audit des modules).
 */

/**
 * ~~« Ce carnet garde la trace de vos relevés et de vos analyses : c'est le
 * « fichier sanitaire des installations » que l'arrêté fait tenir à la
 * disposition de l'agence régionale de santé. »~~ — corrigé le 2026-10-12.
 * L'article 3 met dans ce fichier les modalités de la surveillance, ses
 * résultats, la description des réseaux et leur maintenance ; le carnet ne
 * porte que des résultats, et des analyses rattachées à aucun point. Il en
 * est une partie, pas le fichier.
 */
export const ENJEU_CARNET =
  "Les légionelles se développent dans les réseaux d'eau chaude sanitaire mal tenus en température. Ce carnet garde la trace de vos relevés de température, point par point, et de vos analyses de légionelles, pour l'établissement entier : une analyse ne s'y rattache à aucun point. L'arrêté fait consigner ces résultats dans un « fichier sanitaire des installations », avec les modalités de la surveillance, la description des réseaux et leur maintenance (art. 3) : ces trois derniers éléments ne se saisissent pas ici.";

/**
 * Qui l'arrêté vise, dit selon ce que Rojer sait de l'établissement.
 *
 * ~~« Rojer ne sait pas si c'est votre cas »~~ s'affichait aussi à un
 * établissement NON ERP jusqu'au 2026-10-12, quand Rojer sait qu'il n'en est
 * pas un. L'article 1er nomme, outre « les autres établissements recevant du
 * public », les établissements de santé, sociaux et médico-sociaux,
 * pénitentiaires, les hôtels et résidences de tourisme et les campings
 * (`corpus/arrete-2010-02-01-legionelles.ts`) : hors ERP, c'est la seule
 * question qui reste, et Rojer ne la détient pas. Pour un ERP, Rojer ignore
 * toujours les deux faits qui décident — installation collective, point
 * d'usage à risque.
 *
 * La phrase se termine sur le sujet de la suivante (« il » / « Rojer »),
 * commune aux deux cas : ce que Rojer inscrit au calendrier.
 */
export function quiEstVise(estERP: boolean): string {
  return estERP
    ? "Rojer ne sait pas si c'est votre cas, et ne le décide pas à votre place : il"
    : "Votre établissement n'est pas déclaré recevant du public : l'arrêté ne le vise que s'il est l'un des autres établissements que nomme son article 1er — de santé, social ou médico-social, pénitentiaire, hôtel ou résidence de tourisme, camping. Rojer";
}
