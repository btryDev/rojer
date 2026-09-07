"use client";

import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { demanderSignature } from "@/lib/signatures/actions";
import type { ObjetSignable } from "@prisma/client";

/**
 * Déclencheur côté admin : demande à un tiers (prestataire / contrôleur /
 * co-signataire) de signer électroniquement l'objet. Envoie un lien magique
 * + code de confirmation par email.
 *
 * **Ni le lien ni le code n'arrivent ici**, et ce composant n'affiche donc ni
 * l'un ni l'autre : la demande ne rend qu'un accusé de réception. Le code
 * remontait auparavant jusqu'ici, et un modal permettait de signer sur-le-
 * champ à la place du destinataire — le demandeur tenait les deux facteurs,
 * et la signature obtenue ne valait pas mieux qu'une case qu'il aurait cochée
 * lui-même. Le raisonnement est dans `@/lib/access-tokens/actions`, y compris
 * ce que ce retrait emporte (la copie manuelle du lien) et par quel chemin
 * cela doit revenir si le besoin est confirmé.
 *
 * Pour essayer le flux en local, le message est à lire dans
 * `/dev/boite-mail`, là où le destinataire le lirait — une page qui n'est
 * pas compilée en production (`src/lib/email/dev-outbox.ts`).
 */

/**
 * Vaut `false` dans un build de production : Next remplace `process.env.
 * NODE_ENV` à la compilation, et le bloc qui en dépend disparaît du bundle
 * client. Ce n'est pas une condition évaluée chez le visiteur.
 */
const EN_DEV = process.env.NODE_ENV !== "production";
export function DemanderSignatureForm({
  etablissementId,
  objetType,
  objetId,
  libelleDocument,
  emailDefaut,
  nomDefaut,
}: {
  etablissementId: string;
  objetType: ObjetSignable;
  objetId: string;
  libelleDocument: string;
  emailDefaut?: string;
  nomDefaut?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    null | { ok: true } | { ok: false; message: string }
  >(null);

  function onSubmit(formData: FormData) {
    const email = (formData.get("signataireEmail") ?? "").toString().trim();
    const nom = (formData.get("signataireNom") ?? "").toString().trim();
    const role = (formData.get("signataireRole") ?? "").toString().trim();
    if (!email || !nom) {
      setResult({ ok: false, message: "Nom et email requis." });
      return;
    }
    startTransition(async () => {
      try {
        await demanderSignature({
          etablissementId,
          objetType,
          objetId,
          signataireEmail: email,
          signataireNom: nom,
          signataireRole: role || undefined,
          libelleDocument,
        });
        setResult({ ok: true });
      } catch (e) {
        setResult({
          ok: false,
          message: e instanceof Error ? e.message : "Erreur inconnue.",
        });
      }
    });
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className={cn(buttonVariants({ variant: "boardClair", size: "boardSm" }))}
      >
        Demander signature
      </button>
    );
  }

  if (result && result.ok) {
    return (
      <div className="mt-3 rounded-[18px] bg-[color:var(--board-green)] p-4 text-[13px]">
        <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-green-ink)]">
          Lien envoyé
        </p>
        <p className="mt-1 text-[color:var(--board-ink)]">
          Le destinataire va recevoir un email avec le lien et son code de
          confirmation. Le code ne part qu&apos;à lui : c&apos;est ce qui rend
          sa signature indépendante de la vôtre.
        </p>
        {/* Bloc de développement. `EN_DEV` est résolu à la compilation : dans
            un build de production, ce qui suit ne figure pas dans le bundle.
            Ce n'est pas un raccourci — c'est le même lien que n'importe qui
            aurait vers une boîte mail, et le message qu'on y lit est celui du
            destinataire, pas une copie remise au demandeur. */}
        {EN_DEV && (
          <a
            href="/dev/boite-mail"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "board", size: "boardSm" }),
              "mt-3",
            )}
          >
            Lire le message (dev) ↗
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setOuvert(false);
          }}
          className="mt-3 text-[12.5px] font-semibold text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]"
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <form
      action={onSubmit}
      className="mt-3 space-y-3 rounded-[18px] bg-[color:var(--board-card)] p-4 ring-1 ring-[color:var(--board-slate-line)]"
    >
      <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        Demander une signature électronique
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label-board" htmlFor="sigNom">
            Nom du signataire *
          </label>
          <input className="champ-board"
            id="sigNom"
            name="signataireNom"
            defaultValue={nomDefaut}
            required
            maxLength={200}
            placeholder="Jean Dupond"
          />
        </div>
        <div>
          <label className="label-board" htmlFor="sigEmail">
            Email *
          </label>
          <input className="champ-board"
            id="sigEmail"
            name="signataireEmail"
            type="email"
            defaultValue={emailDefaut}
            required
            maxLength={200}
            placeholder="jean.dupond@apave.fr"
          />
        </div>
      </div>
      <div>
        <label className="label-board" htmlFor="sigRole">
          Fonction (facultatif)
        </label>
        <input className="champ-board"
          id="sigRole"
          name="signataireRole"
          maxLength={120}
          placeholder="Technicien vérificateur / Gérant / Chef d'entreprise"
        />
      </div>
      {result && !result.ok && (
        <p className="text-[13px] text-[color:var(--board-signal-ink)]">
          {result.message}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" variant="board" size="boardSm" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer le lien de signature"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setOuvert(false);
            setResult(null);
          }}
          className="text-[12.5px] font-semibold text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
