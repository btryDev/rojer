// Côté navigateur : la page est-elle ouverte en lecture seule (ADR-054 § 4) ?
// Lit la marque rendue par le serveur (`MarqueLectureSeule`). Pour les gestes
// que la feuille de style ne voit pas — un raccourci clavier qui écrit.

export function estEnLectureSeule(): boolean {
  return typeof document !== "undefined" && document.querySelector("[data-lecture-seule]") !== null;
}
