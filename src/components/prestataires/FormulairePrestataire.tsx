"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { EvidenceDropzone, LegalBadge } from "@/components/ui-kit";
import type { PrestataireActionState } from "@/lib/prestataires/actions";
import {
  DOMAINES_PRESTATAIRE,
  LABEL_DOMAINE,
} from "@/lib/prestataires/schema";

type Props = {
  etablissementId: string;
  action: (
    prev: PrestataireActionState,
    formData: FormData,
  ) => Promise<PrestataireActionState>;
};

export function FormulairePrestataire({ etablissementId, action }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    PrestataireActionState,
    FormData
  >(action, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      router.push(
        `/etablissements/${etablissementId}/prestataires/${state.prestataireId}`,
      );
    }
  }, [state, etablissementId, router]);

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  return (
    <form action={formAction} className="space-y-8">
      {/* -------- Identité -------- */}
      <section className="space-y-4">
        <header>
          <h2 className="board-titre m-0 text-[17px]">Identité du prestataire</h2>
          <p className="m-0 mt-1.5 max-w-[64ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            L&apos;entreprise qui intervient chez vous. SIRET facultatif mais fortement
            recommandé (facilite la vérification d&apos;identité légale).
          </p>
        </header>

        <div className="space-y-2">
          <label className="label-board" htmlFor="raisonSociale">Raison sociale *</label>
          <input className="champ-board"
            id="raisonSociale"
            name="raisonSociale"
            required
            maxLength={200}
            placeholder="Ex : APAVE SAS, Electricité Dupond, Ascensys…"
            aria-invalid={Boolean(err("raisonSociale"))}
          />
          {err("raisonSociale") && (
            <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">{err("raisonSociale")}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="label-board" htmlFor="siret">
              SIRET (14 chiffres)
              <InfoTooltip>
                Recherche possible sur annuaire-entreprises.data.gouv.fr
              </InfoTooltip>
            </label>
            <input className="champ-board"
              id="siret"
              name="siret"
              inputMode="numeric"
              maxLength={17}
              placeholder="123 456 789 00012"
              aria-invalid={Boolean(err("siret"))}
            />
            {err("siret") && <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">{err("siret")}</p>}
          </div>

          <label className="flex cursor-pointer items-center gap-3 self-end rounded-[16px] border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-3.5 py-2.5">
            <input
              type="checkbox"
              name="estOrganismeAgree"
              className="size-4 rounded border-[color:var(--board-slate)] accent-[color:var(--board-ink)]"
            />
            <span className="text-[12.5px] font-semibold text-[color:var(--board-slate-ink)]">
              Organisme agréé
              <InfoTooltip>
                Apave, Bureau Veritas, Socotec, Dekra… — habilité par le
                ministère pour les vérifications périodiques.
              </InfoTooltip>
            </span>
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="label-board">
            Domaines d&apos;intervention
          </legend>
          <p className="text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Cochez tout ce qui s&apos;applique — ces tags servent ensuite à pré-sélectionner
            le bon prestataire quand vous créez une vérification ou un plan de prévention.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {DOMAINES_PRESTATAIRE.map((d) => (
              <label
                key={d}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[color:var(--board-slate-pale)] px-3 py-1.5 text-[12px] font-medium text-[color:var(--board-slate-mid)] transition-colors has-[:checked]:bg-[color:var(--board-blue-pale)] has-[:checked]:text-[color:var(--board-blue-ink)]"
              >
                <input
                  type="checkbox"
                  name="domaines"
                  value={d}
                  className="sr-only"
                />
                {LABEL_DOMAINE[d]}
              </label>
            ))}
          </div>
        </fieldset>
      </section>


      {/* -------- Contact -------- */}
      <section className="space-y-4">
        <header>
          <h2 className="board-titre m-0 text-[17px]">Contact principal</h2>
          <p className="m-0 mt-1.5 max-w-[64ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            L&apos;interlocuteur que vous sollicitez habituellement. Servira aussi à envoyer
            les liens de dépôt de rapport et les demandes de signature.
          </p>
        </header>

        <div className="space-y-2">
          <label className="label-board" htmlFor="contactNom">Nom et prénom *</label>
          <input className="champ-board"
            id="contactNom"
            name="contactNom"
            required
            maxLength={200}
            placeholder="Jean Dupond"
            aria-invalid={Boolean(err("contactNom"))}
          />
          {err("contactNom") && (
            <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">{err("contactNom")}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="label-board" htmlFor="contactEmail">Email *</label>
            <input className="champ-board"
              id="contactEmail"
              name="contactEmail"
              type="email"
              required
              maxLength={200}
              placeholder="jean.dupond@apave.fr"
              aria-invalid={Boolean(err("contactEmail"))}
            />
            {err("contactEmail") && (
              <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">{err("contactEmail")}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="label-board" htmlFor="contactTelephone">Téléphone</label>
            <input className="champ-board"
              id="contactTelephone"
              name="contactTelephone"
              type="tel"
              placeholder="01 23 45 67 89"
              aria-invalid={Boolean(err("contactTelephone"))}
            />
            {err("contactTelephone") && (
              <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
                {err("contactTelephone")}
              </p>
            )}
          </div>
        </div>
      </section>


      {/* -------- Vigilance L. 8222-1 -------- */}
      <section className="space-y-5">
        <header className="space-y-3">
          <h2 className="board-titre m-0 text-[17px]">Obligation de vigilance</h2>
          {/* Même défaut que sur les deux écrans prestataires : URL 404 et
              extrait qui n'était le texte d'aucun des deux articles cités.
              Relu à la source le 2026-08-28. */}
          <LegalBadge
            charte="board"
            reference="Art. L. 8222-1 CT"
            href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024197683"
            extrait="Toute personne vérifie lors de la conclusion d'un contrat dont l'objet porte sur une obligation d'un montant minimum en vue de l'exécution d'un travail, de la fourniture d'une prestation de services ou de l'accomplissement d'un acte de commerce, et périodiquement jusqu'à la fin de l'exécution du contrat, que son cocontractant s'acquitte : 1° des formalités mentionnées aux articles L. 8221-3 et L. 8221-5 […]"
          >
            Pour <strong>tout contrat ≥ 5 000 € HT</strong>, le donneur d&apos;ordre
            (vous) doit vérifier que son prestataire est à jour de ses obligations
            sociales. Renouvellement <strong>tous les 6 mois</strong>.
          </LegalBadge>
          <p className="text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Téléversez les pièces justificatives dès maintenant si vous les avez.
            Vous pourrez toujours les ajouter plus tard ; la plateforme vous enverra
            une alerte 30 jours avant expiration.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="label-board">Attestation URSSAF</label>
            <EvidenceDropzone
              name="attestationUrssaf"
              label="Attestation URSSAF"
              hint="Renouvellement tous les 6 mois"
            />
            <div className="space-y-1">
              <label
                className="label-board font-normal text-[color:var(--board-slate-soft)]"
                htmlFor="attestationUrssafValableJusquA"
              >
                Valable jusqu&apos;au
              </label>
              <input className="champ-board"
                id="attestationUrssafValableJusquA"
                name="attestationUrssafValableJusquA"
                type="date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label-board">Assurance RC Pro</label>
            <EvidenceDropzone
              name="assuranceRcPro"
              label="Attestation RC Pro"
              hint="Renouvellement annuel chez votre assureur"
            />
            <div className="space-y-1">
              <label
                className="label-board font-normal text-[color:var(--board-slate-soft)]"
                htmlFor="assuranceRcProValableJusquA"
              >
                Valable jusqu&apos;au
              </label>
              <input className="champ-board"
                id="assuranceRcProValableJusquA"
                name="assuranceRcProValableJusquA"
                type="date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label-board">Extrait Kbis</label>
            <EvidenceDropzone
              name="kbis"
              label="Extrait Kbis"
              hint="Datant de moins de 3 mois à l'embauche"
            />
            <div className="space-y-1">
              <label
                className="label-board font-normal text-[color:var(--board-slate-soft)]"
                htmlFor="kbisDateEmission"
              >
                Date d&apos;émission
              </label>
              <input className="champ-board" id="kbisDateEmission" name="kbisDateEmission" type="date" />
            </div>
          </div>
        </div>
      </section>


      {/* -------- Notes -------- */}
      <section className="space-y-3">
        <label className="label-board" htmlFor="notesInternes">
          Notes internes
          <InfoTooltip>
            Ces notes ne sont jamais partagées avec le prestataire.
          </InfoTooltip>
        </label>
        <textarea
          id="notesInternes"
          name="notesInternes"
          rows={3}
          maxLength={1000}
          className="champ-board min-h-[92px] resize-y"
          placeholder="Ex : interlocuteur historique, contrat cadre signé en 2023, remise de 15%…"
        />
      </section>

      {state.status === "error" && !state.fieldErrors && (
        <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">{state.message}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-4">
        <Button variant="board" size="board" type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Ajouter ce prestataire"}
        </Button>
        <Link
          href={`/etablissements/${etablissementId}/prestataires`}
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
