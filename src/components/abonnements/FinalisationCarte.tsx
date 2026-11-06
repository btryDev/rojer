"use client";
// Au retour de la page de Stripe : appliquer la formule choisie, dès
// l'ouverture (le webhook le fait aussi, si l'onglet a été fermé). L'action
// redirige ; si elle échoue avant (réseau, déploiement), la page le dit au
// lieu de rester sur « se met en place ».

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { finaliserCarteAction } from "@/lib/abonnements/actions";

const estRedirection = (e: unknown) => String((e as { digest?: unknown } | null)?.digest ?? "").startsWith("NEXT_REDIRECT");

export function FinalisationCarte({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const lance = useRef(false);
  useEffect(() => {
    if (lance.current) return;
    lance.current = true;
    finaliserCarteAction(sessionId).catch((e: unknown) => {
      if (!estRedirection(e)) router.replace("/compte/abonnement?stripe=indisponible");
    });
  }, [sessionId, router]);
  return (
    <p role="status" className="m-0 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
      Carte enregistrée : votre abonnement se met en place…
    </p>
  );
}
