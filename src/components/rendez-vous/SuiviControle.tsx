"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { depuisSaisieDateHeure, estSaisieDateHeureReelle, formaterDateHeureFr, versSaisieDateHeure } from "@/lib/dates";
import { avertissementRendezVous } from "@/lib/rendez-vous/regles";
import type { SuiviControleState } from "@/lib/rendez-vous/actions";
import type { PrestataireProposable } from "@/lib/rendez-vous/queries";
import { NOTE_RENDEZ_VOUS_MAX } from "@/lib/rendez-vous/schema";

type Prestataire = {
  id: string;
  raisonSociale: string;
  contactNom: string;
  contactTelephone: string | null;
  contactEmail: string;
};

/**
 * Le prestataire attitré d'un contrôle et le rendez-vous pris (ADR-049) :
 * ce qui est convenu, et le formulaire pour le changer. L'échéance n'en
 * dépend pas — la carte le dit.
 */
export function SuiviControle({
  action,
  prestataire,
  rendezVousLe,
  rendezVousNote,
  enAttenteDeRapport,
  proposables,
  hrefNouveauPrestataire,
  hrefPrestataire,
  echeance,
}: {
  /** L'échéance légale, quand la ligne en a une : le formulaire compare. */
  echeance: Date | null;
  action: (prev: SuiviControleState, fd: FormData) => Promise<SuiviControleState>;
  prestataire: Prestataire | null;
  rendezVousLe: Date | null;
  rendezVousNote: string | null;
  /** Le rendez-vous est passé et aucun rapport ne l'a consommé. */
  enAttenteDeRapport: boolean;
  proposables: PrestataireProposable[];
  hrefNouveauPrestataire: string;
  hrefPrestataire: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [saisieRdv, setSaisieRdv] = useState(rendezVousLe ? versSaisieDateHeure(rendezVousLe) : "");
  const [saisieEnvoyee, setSaisieEnvoyee] = useState<string | null>(null);
  const router = useRouter();
  const chemin = usePathname();
  const parametres = useSearchParams();
  const [state, formAction, pending] = useActionState<SuiviControleState, FormData>(
    async (prev, fd) => {
      setSaisieEnvoyee(typeof fd.get("rendezVousLe") === "string" ? (fd.get("rendezVousLe") as string) : "");
      const r = await action(prev, fd);
      if (r.status === "success") {
        setOuvert(false);
        // L'adresse portait peut-être la confirmation d'un dépôt (`?apres=`) :
        // elle ne doit pas survivre à un autre enregistrement.
        // Les autres paramètres (la provenance) restent.
        if (parametres.has("apres")) {
          const q = new URLSearchParams(parametres);
          q.delete("apres");
          router.replace(q.size ? `${chemin}?${q}` : chemin, { scroll: false });
        }
      }
      return r;
    },
    { status: "idle" },
  );
  const avertissement =
    saisieRdv && estSaisieDateHeureReelle(saisieRdv)
      ? avertissementRendezVous(depuisSaisieDateHeure(saisieRdv), echeance)
      : null;
  const err = (champ: string) => (state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined);
  const couvrants = proposables.filter((p) => p.couvre);
  const autres = proposables.filter((p) => !p.couvre);

  return (
    <section className="carte-board overflow-hidden px-7 py-6 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Prestataire et rendez-vous
          </p>
          {prestataire ? (
            <p className="m-0 mt-2 text-[15px] font-semibold">
              {hrefPrestataire ? (
                <Link href={hrefPrestataire} className="hover:underline">
                  {prestataire.raisonSociale}
                </Link>
              ) : (
                prestataire.raisonSociale
              )}
              <span className="ml-2 text-[12.5px] font-normal text-[color:var(--board-slate-mid)]">
                {[prestataire.contactNom, prestataire.contactTelephone, prestataire.contactEmail]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </p>
          ) : (
            <p className="m-0 mt-2 text-[13.5px] text-[color:var(--board-slate-mid)]">
              Aucun prestataire attitré.
            </p>
          )}
          <p
            className="m-0 mt-1.5 text-[13.5px]"
            style={{ color: enAttenteDeRapport ? "var(--board-signal-ink)" : undefined }}
          >
            {rendezVousLe
              ? enAttenteDeRapport
                ? `Le rendez-vous du ${formaterDateHeureFr(rendezVousLe)} est passé : déposez son rapport.`
                : `Rendez-vous le ${formaterDateHeureFr(rendezVousLe)}`
              : "Pas de rendez-vous pris."}
          </p>
          {rendezVousLe && rendezVousNote && (
            <p className="m-0 mt-0.5 text-[12.5px] text-[color:var(--board-slate-mid)]">{rendezVousNote}</p>
          )}
          <p className="m-0 mt-1.5 text-[12px] text-[color:var(--board-slate-soft)]">
            Le rendez-vous ne change pas l&apos;échéance : seul le rapport la fait avancer.
          </p>
        </div>
        {!ouvert && (
          <Button type="button" variant="boardClair" size="boardSm" onClick={() => setOuvert(true)}>
            {prestataire || rendezVousLe ? "Modifier" : "Choisir un prestataire, prendre rendez-vous"}
          </Button>
        )}
      </div>

      {ouvert && (
        <form action={formAction} className="mt-5 space-y-4 border-t border-[color:var(--board-slate-line)] pt-5">
          <div>
            <label className="label-board" htmlFor="prestataireId">
              Prestataire attitré
            </label>
            <select
              id="prestataireId"
              name="prestataireId"
              className="champ-board"
              defaultValue={prestataire?.id ?? ""}
            >
              <option value="">— Aucun —</option>
              {couvrants.length > 0 && (
                <optgroup label="Couvrent ce contrôle">
                  {couvrants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.raisonSociale}
                    </option>
                  ))}
                </optgroup>
              )}
              {autres.length > 0 && (
                <optgroup label={couvrants.length > 0 ? "Autres prestataires" : "Votre annuaire"}>
                  {autres.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.raisonSociale}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="m-0 mt-1.5 text-[12px] text-[color:var(--board-slate-mid)]">
              Il n&apos;est pas dans la liste ?{" "}
              <Link href={hrefNouveauPrestataire} className="font-semibold text-[color:var(--board-blue-ink)] underline underline-offset-4">
                Ajouter un prestataire
              </Link>
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label-board" htmlFor="rendezVousLe">
                Rendez-vous
              </label>
              <input
                id="rendezVousLe"
                name="rendezVousLe"
                type="datetime-local"
                className="champ-board"
                value={saisieRdv}
                onChange={(e) => setSaisieRdv(e.currentTarget.value)}
              />
              {avertissement && (
                <p className="m-0 mt-1 text-[12px] text-[color:var(--board-amber-ink)]">{avertissement}</p>
              )}
              {/* Le refus porte sur la date envoyée : il s'efface dès qu'on la change. */}
              {err("rendezVousLe") && saisieRdv === saisieEnvoyee && (
                <p className="m-0 mt-1 text-[12px] text-[color:var(--board-signal-ink)]">{err("rendezVousLe")}</p>
              )}
            </div>
            <div>
              <label className="label-board" htmlFor="rendezVousNote">
                Note
              </label>
              <input
                id="rendezVousNote"
                name="rendezVousNote"
                className="champ-board"
                maxLength={NOTE_RENDEZ_VOUS_MAX}
                placeholder="Ex : avec M. Martin, accès par la cour"
                defaultValue={rendezVousNote ?? undefined}
              />
            </div>
          </div>
          {state.status === "error" && !state.fieldErrors && (
            <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">{state.message}</p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" variant="board" size="boardSm" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="boardClair" size="boardSm" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
