import Link from "next/link";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { FormulaireAssistance } from "@/components/assistance/FormulaireAssistance";
import { RendezVousAnnuel } from "@/components/assistance/RendezVousAnnuel";
import { OngletsPage } from "@/components/ui-kit/OngletsPage";
import type { Db } from "@/lib/auth/compte";
import { membresDuCompte } from "@/lib/auth/membres";
import { requireEtablissement } from "@/lib/auth/scope";
import { ligneAbonnementDuCompte } from "@/lib/abonnements/saisie";
import { PAGE_FORMULES } from "@/lib/abonnements/sous-pages";
import { formuleDAssistanceDeLaSession } from "@/lib/assistance/formule";
import { cheminAssistance } from "@/lib/assistance/libelles";
import { finDuProPrevue } from "@/lib/assistance/fin-du-pro";
import { rendezVousDuCompte } from "@/lib/assistance/rendez-vous";
import { aPlusDe24h } from "@/lib/assistance/rendez-vous-libelles";
import { listerEtablissementsDuCompte } from "@/lib/etablissements/queries";
import { PARAM_PROVENANCE, avecProvenance, decouperCheminInterne, nommerEcran } from "@/lib/navigation/provenance";

export const metadata = {
  title: "Assistance",
};

const ONGLET_RENDEZ_VOUS = "rendez-vous";

/**
 * L'assistance (ADR-050, amendée le 2026-11-24, décisions de la propriétaire
 * du même jour) : une seule entrée pour toutes les formules. En Pro, une
 * question de prévention ou de l'application, et le rendez-vous annuel
 * (ADR-063, maquette « Réserver le rendez-vous de l'année ») ; sinon,
 * l'application seule. La question part par e-mail, la réponse aussi : pas de
 * fil dans Rojer.
 *
 * La provenance (`?de=`, posée par la tuile du rail) dit d'où l'on vient :
 * envoyée avec un problème technique pour retrouver l'écran. Son chemin brut
 * part tel quel — un écran du DUERP compris ; son nom vient de `nommerEcran`.
 * Les deux onglets la reconduisent.
 */
export default async function AssistancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const recherche = await searchParams;
  const de = recherche[PARAM_PROVENANCE];
  // Lectures partagées avec la coquille, une fois par rendu (`cache()`).
  const [{ user, compte, db }, formule, etablissements] = await Promise.all([
    requireEtablissement(id),
    formuleDAssistanceDeLaSession(),
    listerEtablissementsDuCompte(),
  ]);

  const pageDOrigine = typeof de === "string" ? (decouperCheminInterne(de)?.pathname ?? null) : null;
  const surRendezVous = formule.pro && recherche.onglet === ONGLET_RENDEZ_VOUS;
  const base = cheminAssistance(id);
  const lienQuestion = avecProvenance(base, pageDOrigine);
  const rendezVous = surRendezVous ? await donneesDuRendezVous(db, compte.compteId) : null;

  return (
    <main className="flex flex-1 flex-col">
      <EnTetePage
        item="assistance"
        description={
          formule.pro
            ? "Posez vos questions, sur la prévention comme sur l'application : la réponse arrive par e-mail. Et réservez ici votre rendez-vous annuel."
            : "Un souci dans l'application ? Écrivez-nous : la réponse arrive par e-mail, les jours ouvrés."
        }
      >
        {formule.pro ? (
          <OngletsPage
            libelle="Assistance"
            onglets={[
              { href: lienQuestion, label: "Poser une question", actif: !surRendezVous },
              {
                href: avecProvenance(`${base}?onglet=${ONGLET_RENDEZ_VOUS}`, pageDOrigine),
                label: "Rendez-vous annuel",
                actif: surRendezVous,
              },
            ]}
          />
        ) : null}
      </EnTetePage>

      <div className="flex flex-1 flex-col gap-4 bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pt-7 pb-20">
        {rendezVous ? (
          <div className="mx-auto w-full max-w-[1128px]">
            <RendezVousAnnuel
              etablissementId={id}
              email={user.email}
              moi={user.name ?? null}
              etablissements={etablissements.map((e) => e.raisonDisplay)}
              lectureSeule={compte.role === "lecture"}
              agenda={`${base}/agenda`}
              lienQuestion={lienQuestion}
              {...rendezVous}
            />
          </div>
        ) : (
          <>
            <section
              aria-labelledby="titre-assistance"
              className="carte-board mx-auto w-full max-w-[820px] px-7 py-7 sm:px-8"
            >
              <h2 id="titre-assistance" className="board-titre m-0 mb-6 text-[22px]">
                {formule.pro ? "Votre question" : "Votre message"}
              </h2>
              <FormulaireAssistance
                pro={formule.pro}
                etablissementId={id}
                etablissements={etablissements}
                email={user.email}
                page={pageDOrigine ?? undefined}
                libellePage={pageDOrigine ? nommerEcran(pageDOrigine, id) : null}
              />
            </section>

            {formule.pro ? null : (
              <p className="m-0 mx-auto w-full max-w-[820px] px-2 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Les questions de prévention et le rendez-vous annuel viennent avec la formule Pro.{" "}
                <Link href={PAGE_FORMULES} className="font-semibold text-[color:var(--board-blue-ink)] underline underline-offset-4">
                  Comparer les formules
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/** L'état du rendez-vous du compte, mis en forme pour l'écran (dates en texte ISO). */
async function donneesDuRendezVous(db: Db, compteId: string) {
  const maintenant = new Date();
  const ligne = await ligneAbonnementDuCompte(db, compteId);
  // Qui a réservé : un membre du compte (une personne partie n'est plus
  // nommée) — lu en même temps que le rendez-vous (relecture du 2026-11-24).
  const { prochain, passe, creneaux, finDeLAnnee } = await rendezVousDuCompte(db, ligne?.debutPayantLe, maintenant);
  // La fin du Pro ne se lit (chez Stripe, pour une baisse) qu'avec un
  // rendez-vous à venir ; en même temps que les membres.
  const [membres, finPro] = await Promise.all([
    membresDuCompte(compteId),
    prochain ? finDuProPrevue(ligne) : Promise.resolve(null),
  ]);
  const finDuPro = prochain && finPro && finPro < prochain.debut ? finPro : null;
  // Le Pro qui s'arrête : un déplacement ne vise que les créneaux d'avant sa fin.
  const prenables = finDuPro ? creneaux.filter((c) => c.debut < finDuPro) : creneaux;
  return {
    maintenant: maintenant.toISOString(),
    prochain: prochain
      ? {
          id: prochain.id,
          debut: prochain.debut.toISOString(),
          fin: prochain.fin.toISOString(),
          mode: prochain.mode,
          telephone: prochain.telephone,
          sujet: prochain.sujet,
          reservePar: membres.find((m) => m.userId === prochain.userId)?.nom ?? null,
          reserveLe: prochain.createdAt.toISOString(),
          modifiable: aPlusDe24h(prochain.debut, maintenant),
        }
      : null,
    passe: passe ? { debut: passe.debut.toISOString() } : null,
    finDeLAnnee: finDeLAnnee.toISOString(),
    creneaux: prenables.map((c) => ({ id: c.id, debut: c.debut.toISOString(), fin: c.fin.toISOString() })),
    finDuPro: finDuPro?.toISOString() ?? null,
  };
}
