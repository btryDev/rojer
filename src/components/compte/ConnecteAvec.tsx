import { signOutAction } from "@/lib/auth/actions";

/**
 * L'adresse connectée, lisible, avec la sortie (retours de test du
 * 2026-11-16) : deux comptes dans deux navigateurs, et un essai démarré sur
 * le mauvais sans que rien à l'écran ne le dise. Sur les pages où un geste
 * engage un compte (essai, abonnement, mise en place) et sur celles où l'on
 * change d'identité (activation, connexion).
 */
export function ConnecteAvec({
  email,
  className,
  sombre = false,
}: {
  email: string;
  className?: string;
  /** Sur le rail d'encre de la mise en place. */
  sombre?: boolean;
}) {
  return (
    <form
      action={signOutAction}
      data-saisie-ouverte
      className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12.5px] ${
        sombre ? "text-white/70" : "text-[color:var(--board-slate-mid)]"
      } ${className ?? ""}`}
    >
      <span>
        Connecté·e avec{" "}
        <strong className={`break-all font-semibold ${sombre ? "text-white" : "text-[color:var(--board-ink)]"}`}>{email}</strong>
      </span>
      <button
        type="submit"
        className={`underline decoration-dotted underline-offset-4 transition-colors ${
          sombre ? "decoration-white/30 hover:text-white" : "decoration-[color:var(--board-slate)] hover:text-[color:var(--board-ink)]"
        }`}
      >
        Se déconnecter
      </button>
    </form>
  );
}
