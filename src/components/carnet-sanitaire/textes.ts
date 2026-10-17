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
 * ~~La phrase se termine sur le sujet de la suivante (« il » / « Rojer »),
 * commune aux deux cas : ce que Rojer inscrit au calendrier.~~ [2026-10-17,
 * sous-lot F : la phrase est entière, et `ceQueRojerFait` dit la suite — elle
 * dépend désormais de l'installation déclarée.]
 *
 * [2026-10-17, sous-lot F] Un ERP qui a DÉCLARÉ l'installation
 * `EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC` a dit ce que Rojer ignorait : la
 * question ne se pose plus, la phrase ne la pose plus.
 */
export function quiEstVise(estERP: boolean, installationDeclaree = false): string {
  if (estERP && installationDeclaree) {
    return "Vous avez déclaré, dans vos équipements, une eau chaude collective alimentant des douches ou des bains à remous ouverts au public : l'arrêté vous concerne.";
  }
  return estERP
    ? "Rojer ne sait pas si c'est votre cas, et ne le décide pas à votre place."
    : "Votre établissement n'est pas déclaré recevant du public : l'arrêté ne le vise que s'il est l'un des autres établissements que nomme son article 1er — de santé, social ou médico-social, pénitentiaire, hôtel ou résidence de tourisme, camping.";
}

/**
 * Ce que Rojer inscrit au calendrier, selon que l'installation est déclarée
 * (2026-10-17, sous-lot F — décision de la propriétaire : les légionelles
 * passent par le matériel).
 *
 * - ERP, installation déclarée : les deux lignes du référentiel, une de chaque
 *   par installation ; le carnet garde les résultats. DETTE dite à l'écran,
 *   parce que c'est le dirigeant qui la subit : une analyse saisie ici ne fait
 *   pas avancer la date du calendrier (`docs/dette-chantier-porteur-echeance.md`).
 * - Sinon : l'échéance du module, comme avant — rien sans carnet, puis
 *   l'analyse suivante un an après la dernière saisie. En ERP, la phrase dit
 *   comment faire porter la surveillance par le calendrier.
 *
 * Un établissement non ERP qui aurait déclaré la catégorie n'en reçoit aucune
 * ligne (`typologies: { erp: true }`) : il garde l'échéance du module.
 */
export function ceQueRojerFait(estERP: boolean, installationDeclaree: boolean): string {
  if (estERP && installationDeclaree) {
    return "Rojer inscrit à votre calendrier, pour chaque installation déclarée, la mesure de la température une fois par mois et l'analyse de légionelles une fois par an, par un laboratoire accrédité. Ce carnet garde vos relevés et vos résultats ; une analyse saisie ici ne fait pas avancer la date du calendrier : déposez le rapport du laboratoire sur la ligne de l'analyse. Pas de rappel par e-mail.";
  }
  const duModule =
    "Rojer n'inscrit rien à votre calendrier tant que vous n'avez pas ouvert de carnet, puis y inscrit l'analyse suivante un an après la dernière saisie — sans rappel par e-mail.";
  return estERP
    ? `Si votre eau chaude est produite en commun et alimente des douches ou des bains à remous accessibles au public, déclarez-la dans vos équipements : Rojer inscrira à votre calendrier la température une fois par mois et l'analyse une fois par an. Sans cette déclaration, ${duModule.charAt(0).toLowerCase()}${duModule.slice(1)}`
    : duModule;
}
