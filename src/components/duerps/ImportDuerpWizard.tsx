"use client";

import {
  useActionState,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  commitImport,
  previewImport,
  type PreviewImportState,
  type CommitImportState,
} from "@/lib/duerps/import/actions";

/**
 * Wizard 2 étapes :
 *   1. Upload + preview (l'utilisateur voit ce qui sera créé avant de valider)
 *   2. Commit transactionnel (même fichier, même FormData)
 *
 * Le fichier est conservé côté client dans un <input type="file"> (pas
 * de stockage serveur intermédiaire) — au commit, on re-soumet le même
 * form avec le même fichier.
 */
export function ImportDuerpWizard({
  etablissementId,
}: {
  etablissementId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [nomFichier, setNomFichier] = useState<string | null>(null);

  const [previewState, previewAction, previewPending] = useActionState<
    PreviewImportState,
    FormData
  >(previewImport.bind(null, etablissementId), { status: "idle" });

  const [commitState, commitAction, commitPending] = useActionState<
    CommitImportState,
    FormData
  >(commitImport.bind(null, etablissementId), { status: "idle" });

  function onChangeFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setNomFichier(f?.name ?? null);
  }

  function onConfirmerCommit(e: FormEvent) {
    e.preventDefault();
    if (!inputRef.current?.files?.[0]) return;
    const fd = new FormData();
    fd.append("fichier", inputRef.current.files[0]);
    commitAction(fd);
  }

  // Redirect après succès
  if (commitState.status === "success") {
    router.push(`/duerp/${commitState.duerpId}/synthese`);
  }

  const peutValider =
    previewState.status === "preview" &&
    previewState.nbRisques > 0 &&
    previewState.nbErreurs === 0;

  return (
    <div className="flex flex-col gap-[22px]">
      {/* Étape 1 — upload */}
      <form ref={formRef} action={previewAction}>
        <div className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-7 py-6 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Étape 1 · Fichier
          </p>
          <h3 className="board-titre m-0 mt-2 text-[22px]">
            Téléversez votre DUERP existant
          </h3>
          <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Format Excel (.xlsx, .xls) ou CSV. Vous pouvez partir du{" "}
            <a
              href="/api/duerp/import/template"
              className="font-medium text-[color:var(--board-blue-ink)] underline"
            >
              modèle officiel
            </a>{" "}
            ou utiliser votre propre fichier — nous détectons les colonnes
            automatiquement.
          </p>

          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-[16px] border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-3 hover:border-[color:var(--board-blue-strong)]">
            <input
              ref={inputRef}
              type="file"
              name="fichier"
              required
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={onChangeFile}
              className="sr-only"
            />
            <span className="flex size-9 items-center justify-center rounded-full bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]">
              ⬆
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium text-[color:var(--board-ink)]">
                {nomFichier ?? "Choisir un fichier"}
              </span>
              <span className="board-eyebrow block text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                .xlsx · .xls · .csv · max 20 Mo
              </span>
            </span>
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="board"
              size="board"
              disabled={previewPending || !nomFichier}
            >
              {previewPending ? "Analyse…" : "Analyser le fichier"}
            </Button>
            <a
              href="/api/duerp/import/template"
              className={buttonVariants({
                variant: "boardClair",
                size: "boardSm",
              })}
            >
              Télécharger le modèle ↓
            </a>
          </div>

          {previewState.status === "error" && (
            <p className="m-0 mt-4 text-[12.5px] text-[color:var(--board-signal-ink)]">
              {previewState.message}
            </p>
          )}
        </div>
      </form>

      {/* Étape 2 — preview */}
      {previewState.status === "preview" && (
        <section className="carte-board relative overflow-clip">
          {/* Le liseré redit ce que le titre annonce juste en dessous — il
              n'informe jamais seul (interdit 10). Il ne prend pas le vert du
              board : ce vert dit « fait », or rien n'est encore importé. */}
          <span
            aria-hidden
            className={`absolute inset-x-0 top-0 h-[3px] ${
              previewState.nbErreurs === 0
                ? "bg-[color:var(--board-blue-ink)]"
                : "bg-[color:var(--board-amber-ink)]"
            }`}
          />
          <div className="px-7 pb-4 pt-7 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Étape 2 · Aperçu
            </p>
            <h3 className="board-titre m-0 mt-2 text-[22px]">
              {previewState.nbErreurs === 0
                ? "Prêt à importer"
                : `${previewState.nbErreurs} ligne${previewState.nbErreurs > 1 ? "s" : ""} à corriger`}
            </h3>
            <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Fichier{" "}
              <span className="font-mono text-[color:var(--board-ink)]">
                {previewState.nomFichier}
              </span>{" "}
              — {previewState.nbLignes} ligne
              {previewState.nbLignes > 1 ? "s" : ""} dont{" "}
              {previewState.nbRisques} risque
              {previewState.nbRisques > 1 ? "s" : ""} valides.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 border-y border-[color:var(--board-slate-line)] sm:grid-cols-5">
            <Stat label="Unités de travail" value={previewState.nbUnites} />
            <Stat label="Risques valides" value={previewState.nbRisques} />
            <Stat label="Mesures en place" value={previewState.nbMesures} />
            <Stat
              label="Mesures à mettre en œuvre"
              value={previewState.nbMesuresPrevues}
            />
            <Stat
              label="Lignes en erreur"
              value={previewState.nbErreurs}
              attention={previewState.nbErreurs > 0}
            />
          </div>

          {/* La colonne lue pour chaque champ (audit du 2026-10-12) : une
              colonne « Mesures à mettre en œuvre » prise pour des mesures en
              place, ou « Niveau de risque » pour le libellé, ne se voyait
              qu'après l'import. */}
          <div className="border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
            <p className="board-eyebrow m-0 mb-3 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Colonnes lues
            </p>
            <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
              {previewState.colonnes.map((c) => (
                <div key={c.champ} className="flex min-w-0 gap-2">
                  <dt className="shrink-0 text-[color:var(--board-slate-mid)]">
                    {c.champ}
                  </dt>
                  <dd className="m-0 min-w-0 truncate font-medium text-[color:var(--board-ink)]">
                    {c.colonne ? (
                      `« ${c.colonne} »`
                    ) : (
                      <span className="font-normal text-[color:var(--board-slate-soft)]">
                        aucune colonne
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Résumé par unité */}
          {previewState.resume.length > 0 && (
            <div className="max-h-96 overflow-auto px-7 py-5 sm:px-8">
              <p className="board-eyebrow m-0 mb-3 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                Contenu détecté
              </p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {previewState.resume.map((u) => (
                  <li
                    key={u.unite}
                    className="flex items-start justify-between gap-3 rounded-[16px] bg-[color:var(--board-slate-pale)] px-3.5 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[13.5px] font-medium text-[color:var(--board-ink)]">
                        {u.unite}
                      </p>
                      {u.exemples.length > 0 && (
                        <p className="m-0 mt-0.5 truncate text-[12px] text-[color:var(--board-slate-mid)]">
                          {u.exemples.join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-[color:var(--board-blue-pale)] px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[color:var(--board-blue-ink)]">
                      {u.nbRisques} risque{u.nbRisques > 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Commit */}
          <div className="border-t border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-7 py-5 sm:px-8">
            {commitState.status === "error" && (
              <p className="m-0 mb-3 text-[12.5px] text-[color:var(--board-signal-ink)]">
                {commitState.message}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onConfirmerCommit}
                disabled={!peutValider || commitPending}
                className={buttonVariants({
                  variant: "board",
                  size: "board",
                })}
              >
                {commitPending
                  ? "Import en cours…"
                  : `Importer ${previewState.nbRisques} risque${previewState.nbRisques > 1 ? "s" : ""}`}
              </button>
              <p className="m-0 max-w-[62ch] text-[12px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Les lignes en erreur seront ignorées. Vous pourrez compléter et
                retyper chaque action après import.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Un compteur de l'aperçu.
 *
 * Trois de ces quatre chiffres étaient peints (vert, navy) alors qu'ils ne
 * disent qu'un volume : la couleur dit l'état, jamais le volume
 * (interdit 2). Seules les lignes en erreur portent encore une encre, et
 * seulement quand il y en a — c'est là un état, pas un décompte.
 */
function Stat({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: number;
  attention?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        {label}
      </p>
      <p
        className={`m-0 mt-1.5 font-mono text-[24px] font-semibold tabular-nums leading-none ${
          attention
            ? "text-[color:var(--board-amber-ink)]"
            : "text-[color:var(--board-ink)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
