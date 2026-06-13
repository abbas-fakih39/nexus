import { describe, it, expect } from "vitest";
import { formatEuro, formatDate, formatDateTime } from "./format";

describe("formatEuro", () => {
  it("formate un nombre en euros", () => {
    const out = formatEuro(12.9);
    expect(out).toContain("12,90");
    expect(out).toContain("€");
  });

  it("accepte une chaîne (Decimal sérialisé)", () => {
    expect(formatEuro("1800.5")).toContain("1 800,50"); // espace fine insécable
  });

  it("renvoie un tiret pour les valeurs vides", () => {
    expect(formatEuro(null)).toBe("—");
    expect(formatEuro(undefined)).toBe("—");
    expect(formatEuro("")).toBe("—");
  });

  it("renvoie un tiret pour une valeur non numérique", () => {
    expect(formatEuro("abc")).toBe("—");
  });
});

describe("formatDate", () => {
  it("formate une date ISO en JJ/MM/AAAA", () => {
    expect(formatDate("2026-06-07")).toBe("07/06/2026");
  });

  it("renvoie un tiret si vide ou invalide", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("pas-une-date")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("renvoie un tiret si vide", () => {
    expect(formatDateTime(undefined)).toBe("—");
  });
});
