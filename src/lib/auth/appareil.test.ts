import { describe, expect, it } from "vitest";
import { decrireAppareil } from "./appareil";

describe("decrireAppareil", () => {
  it.each([
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0", "Firefox sur Windows"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15", "Safari sur Mac"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1", "Safari sur iPhone"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0", "Edge sur Windows"],
    ["Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", "Chrome sur Android"],
  ])("%s → %s", (ua, attendu) => {
    expect(decrireAppareil(ua)).toBe(attendu);
  });

  it("sans user-agent, ou inconnu", () => {
    expect(decrireAppareil(null)).toBe("Appareil inconnu");
    expect(decrireAppareil("curl/8.4")).toBe("Appareil inconnu");
  });
});
