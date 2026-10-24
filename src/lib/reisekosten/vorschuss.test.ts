import { describe, expect, it } from "vitest";
import { verteileVorschuesse } from "./freigaben";

const v = (status: "beantragt" | "genehmigt", mitarbeiter_id: string, vorgesetzter_id: string | null) => ({
  status,
  mitarbeiter_id,
  mitarbeiter: { vorgesetzter_id },
});

describe("verteileVorschuesse", () => {
  const liste = [v("beantragt", "ma1", "chef"), v("beantragt", "ma2", "andere"), v("genehmigt", "ma3", "chef"), v("beantragt", "chef", null)];

  it("Führungskraft genehmigt nur ihr Team, nie sich selbst", () => {
    const a = verteileVorschuesse(liste, "chef", "freigeber");
    expect(a.genehmigen.map((x) => x.mitarbeiter_id)).toEqual(["ma1"]);
    expect(a.auszahlen).toEqual([]);
  });

  it("Buchhaltung zahlt genehmigte aus", () => {
    const a = verteileVorschuesse(liste, "bh", "buchhaltung");
    expect(a.auszahlen.map((x) => x.mitarbeiter_id)).toEqual(["ma3"]);
    expect(a.genehmigen).toEqual([]);
  });

  it("Admin genehmigt alle fremden Anträge", () => {
    expect(verteileVorschuesse(liste, "admin", "admin").genehmigen).toHaveLength(3);
  });
});
