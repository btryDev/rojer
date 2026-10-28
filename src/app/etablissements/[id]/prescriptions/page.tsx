import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { requireEtablissement } from "@/lib/auth/scope";
import { cleJourCivil, formaterDateFr } from "@/lib/dates";
import { chargerPagePrescriptions } from "@/lib/prescriptions/queries";
import { creerPrescription } from "@/lib/prescriptions/actions";
import {
  LABEL_COURT_SOURCE_PRESCRIPTION,
  SOURCES_PRESCRIPTION,
  estSourceContractuelle,
  type SourcePrescription,
} from "@/lib/prescriptions/sources";
import { BarreDeListe } from "@/components/ui-kit/BarreDeListe";
import { NouvellePrescription } from "@/components/prescriptions/NouvellePrescription";
import { MentionContractuelle } from "@/components/prescriptions/MentionContractuelle";
import { PrescriptionActions } from "@/components/prescriptions/PrescriptionActions";

/**
 * Prescriptions particulières propres à l'établissement (ADR-035) : arrêtés
 * du maire ou du préfet, arrêtés ICPE, demandes de l'inspection du travail —
 * et, depuis l'ADR-032, demandes de l'assureur, seule source qui ne soit pas
 * un acte d'autorité. Celles-là portent leur marquage contractuel ici comme
 * partout ailleurs : cette liste est la première surface où une échéance
 * d'assurance pourrait se lire comme du droit.
 *
 * L'état de chaque prescription (active / levée / ignorée avec raison) est
 * recalculé à l'affichage par la même fonction pure que le générateur.
 */

/**
 * `?source=` vient de l'URL : une valeur inconnue est ignorée, jamais
 * reportée telle quelle dans le formulaire. La reconnaissance passe par
 * `SOURCES_PRESCRIPTION`, donc une source retirée de l'enum cesse d'être
 * acceptée sans qu'on ait à y penser.
 */
function sourceDemandee(
  brut: string | undefined,
): SourcePrescription | undefined {
  return SOURCES_PRESCRIPTION.find((s) => s === brut);
}

// Les trois états d'une prescription, en champs du board.
//
// Le vert est écarté : il dit « fait » (interdits 16-17), et une
// prescription active n'est pas un acquis — c'est un acte qui produit
// effet, donc le glacier, registre calme et actif. « Levée » est un
// classement sans suite : l'ardoise. « Non appliquée » demande un regard —
// la prescription vise quelque chose que l'établissement n'a pas — sans
// être une urgence datée : l'ambre de l'attention.
const CHAMP_ETAT_PRESCRIPTION = {
  active:
    "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]",
  levee:
    "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]",
  ignoree: "bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]",
} as const;

function champEtat(etat: string): string {
  return etat === "active"
    ? CHAMP_ETAT_PRESCRIPTION.active
    : etat === "levee"
      ? CHAMP_ETAT_PRESCRIPTION.levee
      : CHAMP_ETAT_PRESCRIPTION.ignoree;
}

export default async function PrescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { id } = await params;
  // La checklist du tableau de bord renvoie ici avec `?source=demande_assureur`
  // quand le dirigeant a répondu que son assureur lui impose des
  // vérifications. Sans cette lecture, le lien existait et n'aboutissait à
  // rien : le formulaire s'ouvrait sur « arrêté préfectoral », et il fallait
  // retrouver la bonne source à la main — c'est-à-dire faire exactement ce
  // que le renvoi promettait d'éviter.
  const { source: sourceBrute } = await searchParams;
  const sourceInitiale = sourceDemandee(sourceBrute);
  await requireEtablissement(id);
  const { prescriptions, obligations, equipements } =
    await chargerPagePrescriptions(id);
  const action = creerPrescription.bind(null, id);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <EnTetePage
        item="prescriptions"
        description="Ce qu'un arrêté du maire ou du préfet, ou une demande de votre assureur, ajoute au référentiel commun : ces lignes entrent à votre calendrier. Une demande d'assureur vient d'un contrat, pas du droit, et le dit partout où elle s'affiche."
      />

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        {/* Le geste principal au-dessus de la liste, le formulaire en modal
            (2026-10-28) : posé sous la liste, il s'éloignait à chaque
            prescription ouverte. Le bouton reste là quand la liste est vide. */}
        <BarreDeListe
          action={
            <NouvellePrescription
              action={action}
              obligations={obligations}
              equipements={equipements}
              sourceInitiale={sourceInitiale}
              ouvertAuDepart={sourceInitiale !== undefined}
            />
          }
        />
        <section className="flex flex-col gap-4">
          <h2 className="board-titre m-0 text-[22px]">
            Prescriptions déclarées
          </h2>
          {prescriptions.length === 0 ? (
            <p className="carte-board m-0 px-7 py-5 text-[14px] leading-[1.6] text-[color:var(--board-slate-mid)] sm:px-8">
              Aucune prescription déclarée. Si personne ne vous a rien
              prescrit en propre — ni autorité, ni assureur —, il n&apos;y a
              rien à faire ici. Sinon, « Ajouter une prescription » ci-dessus.
            </p>
          ) : (
            <ul className="carte-board m-0 list-none p-0">
              {prescriptions.map((p) => (
                // Le filet appartient à la ligne, jamais à son contenu.
                <li
                  key={p.id}
                  className="border-t border-[color:var(--board-slate-line)] px-7 py-5 first:border-t-0 sm:px-8"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    {/* LA NATURE DE L'ACTE ET SA RÉFÉRENCE SE SÉPARENT — 2026-09-03.

                        Une espace simple les collait : « Demande de votre
                        assureur Avenant multirisque professionnelle n°
                        MRP-2026-4417 » se lit « votre assureur Avenant »,
                        comme si l'assureur portait ce nom. Les deux membres
                        sont de nature différente — l'un dit QUI prescrit,
                        l'autre QUEL acte —, et rien ne le marquait.

                        Le tiret cadratin est déjà le séparateur employé pour
                        ce même couple sur la fiche de vérification
                        (« Demande de votre assureur — {reference} ») : c'est
                        cette surface-là qui faisait autorité, pas celle-ci.

                        L'autorité passe donc au point médian, le séparateur
                        secondaire du board : deux tirets identiques pour deux
                        niveaux différents ne séparent plus rien. */}
                    <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                      {LABEL_COURT_SOURCE_PRESCRIPTION[
                        p.source as keyof typeof LABEL_COURT_SOURCE_PRESCRIPTION
                      ] ?? p.source}
                      {" — "}
                      {p.reference}
                      {p.autorite ? ` · ${p.autorite}` : ""}
                    </p>
                    {/* Cette liste est la première surface où une échéance
                        d'assurance pourrait se lire comme du droit : c'est
                        ici qu'on déclare l'acte, à côté d'arrêtés
                        préfectoraux et de PV de commission. Le marquage y est
                        donc plus nécessaire qu'ailleurs, pas moins
                        (ADR-032). */}
                    {estSourceContractuelle(p.source) ? (
                      <MentionContractuelle />
                    ) : null}
                    <span
                      className={`pastille-board ${champEtat(p.etat.etat)}`}
                    >
                      {p.etat.etat === "active"
                        ? "Active"
                        : p.etat.etat === "levee"
                          ? "Levée"
                          : "Non appliquée"}
                    </span>
                  </div>
                  <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-slate-mid)]">
                    {p.effet === "renforce_periodicite"
                      ? `Renforce « ${p.libelleObligationCiblee} »`
                      : `Obligation sur mesure : ${p.libelle}`}
                    {" · "}
                    {/* `formaterDateFr` et non `toISOString()` : une date d'acte
                        est stockée à minuit Paris (ADR-011), et le slice de
                        l'ISO affichait la veille. */}
                    acte du {formaterDateFr(p.dateDocument)}
                  </p>
                  <p className="m-0 mt-1.5 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
                    {p.etat.detail}
                  </p>
                  <div className="pt-3">
                    <PrescriptionActions
                      etablissementId={id}
                      prescriptionId={p.id}
                      estLevee={p.etat.etat === "levee"}
                      lignesAvecPreuve={p.lignesAvecPreuve}
                      dateDocument={cleJourCivil(p.dateDocument)}
                      effet={p.effet}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
