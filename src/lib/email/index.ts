/**
 * Abstraction d'envoi d'email transactionnel.
 *
 * Driver par défaut en dev : `console` — logue le contenu du mail dans les
 * logs serveur (utile pour le développement et les démos locales sans avoir
 * à configurer un vrai provider).
 *
 * Pour passer en prod : implémenter un driver `resend` ou `supabase` et le
 * brancher via `EMAIL_DRIVER`. Aucune autre ligne à changer côté app.
 */

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface EmailDriver {
  send(payload: EmailPayload): Promise<void>;
}

class ConsoleEmailDriver implements EmailDriver {
  async send(payload: EmailPayload): Promise<void> {
    console.log("\n" + "─".repeat(72));
    console.log(`✉  [email:console] À : ${payload.to}`);
    console.log(`   Sujet : ${payload.subject}`);
    console.log(`   ${"─".repeat(66)}`);
    console.log(payload.text);
    console.log("─".repeat(72) + "\n");

    // Le même message est gardé pour `/dev/boite-mail`, qui évite d'aller le
    // relire dans le terminal.
    //
    // L'import est dynamique ET sous une constante de compilation, à dessein.
    // Next remplace `process.env.NODE_ENV` avant le bundler : dans un build de
    // production, la condition vaut `false`, la branche est éliminée, et le
    // module `dev-outbox` n'est pas émis du tout — vérifié sur la sortie de
    // `next build`, aucun chunk ne le porte. Ce n'est donc pas une condition
    // évaluée à l'exécution que l'on pourrait retourner, c'est du code qui
    // n'existe plus.
    //
    // Les deux autres barrières restent, et elles sont indépendantes :
    // `dev-outbox` lève à son chargement sous `NODE_ENV=production`, et
    // `getEmailDriver` ci-dessous refuse de construire ce driver en
    // production.
    if (process.env.NODE_ENV !== "production") {
      const { capturerMail } = await import("./dev-outbox");
      capturerMail(payload);
    }
  }
}

let _driver: EmailDriver | null = null;

export function getEmailDriver(): EmailDriver {
  if (_driver) return _driver;
  const driver = process.env.EMAIL_DRIVER ?? "console";
  if (driver === "console") {
    // Le driver `console` n'envoie rien : il imprime. En production, il ne
    // rend pas un service dégradé, il fait disparaître en silence des liens
    // de signature et des codes de confirmation que des destinataires
    // attendent. Un déploiement sans `EMAIL_DRIVER` avalait jusqu'ici chaque
    // message sans qu'aucune trace ne le dise. Il lève désormais au premier
    // envoi — c'est-à-dire au moment exact où le défaut a une conséquence.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "EMAIL_DRIVER vaut « console » en production : aucun mail ne partirait, " +
          "et le lien de signature n'atteindrait jamais son destinataire. " +
          "Brancher un driver d'envoi réel avant de servir ce chemin.",
      );
    }
    _driver = new ConsoleEmailDriver();
    return _driver;
  }
  throw new Error(
    `Driver email non supporté : ${driver}. Utiliser "console" ou brancher une implémentation.`,
  );
}

export async function sendMail(payload: EmailPayload): Promise<void> {
  return getEmailDriver().send(payload);
}

export function mailFrom(): string {
  return process.env.SIGNATURE_MAIL_FROM ?? "no-reply@pilote-conformite.local";
}

export function publicAppUrl(): string {
  return process.env.PUBLIC_APP_URL ?? "http://localhost:3000";
}
