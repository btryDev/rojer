"use client";

import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PastilleFiche } from "@/components/ui-kit";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import {
  depublierRegistre,
  publierRegistre,
} from "@/lib/accessibilite/actions";

export function PublicationPanel({
  etablissementId,
  slugPublic,
  publie,
  urlPublique,
  qrDataUrl,
  urlIndisponible = null,
}: {
  etablissementId: string;
  slugPublic: string;
  publie: boolean;
  urlPublique: string;
  qrDataUrl: string;
  /** Le message à montrer quand l'adresse publique est inconnue en production
   *  (`MESSAGE_URL_PUBLIQUE_ABSENTE`) ; `null` sinon. */
  urlIndisponible?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const { demander, confirmation } = useConfirmation();

  function onPublier() {
    setErreur(null);
    startTransition(async () => {
      const res = await publierRegistre(etablissementId);
      if (res.status === "error") {
        setErreur(res.message);
      }
    });
  }

  function onDepublier() {
    demander({
      titre: "Retirer le registre de la publication ?",
      detail:
        "L'URL publique cesse de répondre, et les QR codes déjà collés à " +
        "l'entrée mènent à une page qui n'affiche plus rien. Le contenu du " +
        "registre, lui, reste saisi : republier le remet en ligne à la même " +
        "adresse.",
      agir: "Retirer la publication",
      alors: () =>
        startTransition(async () => {
          await depublierRegistre(etablissementId);
        }),
    });
  }

  async function copierUrl() {
    await navigator.clipboard.writeText(urlPublique);
    setCopie(true);
    setTimeout(() => setCopie(false), 1500);
  }

  if (!publie) {
    return (
      <div className="carte-board px-7 py-6 sm:px-8">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Publication
        </p>
        <h3 className="board-titre m-0 mt-2 text-[22px]">
          Votre registre n&apos;est pas encore public
        </h3>
        <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          Dès que les sections <strong>1 (prestations)</strong> et{" "}
          <strong>2 (conformité)</strong>{" "}
          sont remplies, vous pouvez publier. Une
          URL publique sera générée, consultable avec un simple QR code collé à
          l&apos;entrée de votre établissement.
        </p>
        {erreur && (
          <p className="m-0 mt-3 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {erreur}
          </p>
        )}
        <div className="mt-4">
          <Button
            type="button"
            variant="board"
            size="board"
            onClick={onPublier}
            disabled={pending}
          >
            {pending ? "Publication…" : "Publier le registre"}
          </Button>
        </div>
      </div>
    );
  }

  // L'ADRESSE PUBLIQUE INCONNUE SE DIT (audit du 2026-10-12, B7). Sans elle,
  // le QR code et l'URL pointaient sur localhost : une affiche imprimée qui
  // ne mène nulle part. Ni QR, ni URL, ni affiche — le message, et rien qui
  // puisse s'imprimer faux.
  if (urlIndisponible) {
    return (
      <div className="carte-board px-7 py-6 sm:px-8">
        <PastilleFiche ton="fait">Publié</PastilleFiche>
        <p
          role="alert"
          className="m-0 mt-3 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-signal-ink)]"
        >
          {urlIndisponible}
        </p>
      </div>
    );
  }

  return (
    // Plus de liseré vert en tête de carte : le board ne peint pas un état
    // sur une bande, il le dit par une pastille — un champ, une encre, et
    // le mot. « Publié » est un fait de saisie, pas un verdict.
    <div className="carte-board overflow-clip">
      <div className="grid gap-0 md:grid-cols-[auto_1fr]">
        {/* QR code */}
        <div className="flex items-center justify-center border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-8 py-8 md:border-b-0 md:border-r">
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- data-URL locale, next/image n'optimiserait rien */}
            <img
              src={qrDataUrl}
              alt={`QR code vers le registre d'accessibilité — ${urlPublique}`}
              width={180}
              height={180}
              className="rounded-[16px] bg-[color:var(--board-card)] p-3"
            />
            <a
              href={`/api/accessibilite/${slugPublic}/affiche`}
              className={
                buttonVariants({ variant: "boardClair", size: "boardSm" }) +
                " w-full justify-center"
              }
            >
              Affiche A4 ↓
            </a>
          </div>
        </div>

        {/* Actions + URL */}
        <div className="flex flex-col gap-4 px-7 py-6 sm:px-8">
          <div>
            <PastilleFiche ton="fait">Publié</PastilleFiche>
            <h3 className="board-titre m-0 mt-2.5 text-[22px]">
              Votre registre est accessible en un clic
            </h3>
            <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              Collez le QR code à l&apos;entrée ou à l&apos;accueil : les
              visiteurs scannent avec leur téléphone et accèdent à votre
              registre en 2 secondes.
            </p>
          </div>

          <div className="rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3">
            <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
              URL publique
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <a
                href={urlPublique}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[color:var(--board-blue-ink)] underline-offset-2 hover:underline"
              >
                {urlPublique}
              </a>
              <button
                type="button"
                onClick={copierUrl}
                className={
                  buttonVariants({ variant: "boardClair", size: "boardSm" }) +
                  " shrink-0 bg-[color:var(--board-card)]"
                }
              >
                {copie ? "✓ Copié" : "Copier"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={urlPublique}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: "boardClair",
                size: "boardSm",
              })}
            >
              Prévisualiser ↗
            </a>
            <button
              type="button"
              onClick={onDepublier}
              disabled={pending}
              className={buttonVariants({
                variant: "boardClair",
                size: "boardSm",
              })}
            >
              {pending ? "…" : "Retirer la publication"}
            </button>
          </div>

          {confirmation}
        </div>
      </div>
    </div>
  );
}
