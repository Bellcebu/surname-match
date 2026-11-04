import { describe, expect, it } from "vitest";
import { joined, matchSurname, normalize, tokens } from "../src/index.js";

const accepts = (typed: string, registry: string) =>
  expect(matchSurname(typed, registry).match, `"${typed}" vs "${registry}"`).toBe(true);
const rejects = (typed: string, registry: string) =>
  expect(matchSurname(typed, registry).match, `"${typed}" vs "${registry}"`).toBe(false);

describe("normalize", () => {
  it("uppercases, strips accents and collapses spaces", () => {
    expect(normalize("  Gómez   Pérez ")).toBe("GOMEZ PEREZ");
  });

  it("folds Ñ to N so keyboards without it still match", () => {
    expect(normalize("Muñoz")).toBe("MUNOZ");
  });

  it("drops digits and symbols", () => {
    expect(normalize("Perez1!")).toBe("PEREZ");
  });
});

describe("tokens / joined", () => {
  it("splits on apostrophes, hyphens and spaces", () => {
    expect(tokens("D'Angelo-Ruiz de la Cruz")).toEqual(["D", "ANGELO", "RUIZ", "DE", "LA", "CRUZ"]);
  });

  it("joins every fragment, including one-letter ones", () => {
    expect(joined("D'ANGELO")).toBe("DANGELO");
    expect(joined("SAN MARTIN")).toBe("SANMARTIN");
  });
});

describe("matchSurname: regressions from production", () => {
  // The original bug: one-letter fragments were dropped, so D'ANGELO became
  // ANGELO and everyone typing DANGELO on a phone was rejected.
  it("accepts apostrophe surnames typed without the apostrophe", () => {
    accepts("DANGELO", "D'ANGELO");
    accepts("Dangelo", "D'ANGELO");
    accepts("D ANGELO", "D'ANGELO");
    accepts("D’Angelo", "D'ANGELO"); // typographic apostrophe from iOS keyboards
  });

  it("accepts spaced surnames typed joined, and the reverse", () => {
    accepts("SANMARTIN", "SAN MARTIN");
    accepts("San Martín", "SANMARTIN");
  });

  it("still rejects the fragment the old code produced", () => {
    rejects("ANGELO", "D'ANGELO");
  });
});

describe("matchSurname: what must match", () => {
  it.each([
    ["PEREZ", "PEREZ"],
    ["perez", "PÉREZ"],
    ["Gomez-Paz", "GOMEZ PAZ"],
    ["DELACRUZ", "DE LA CRUZ"],
    ["Mc Donald", "MCDONALD"],
    ["MUNOZ", "MUÑOZ"],
  ])("%s ~ %s", (typed, registry) => accepts(typed, registry));

  it("accepts only the first surname of a compound one", () => {
    expect(matchSurname("GARCIA", "GARCIA LOPEZ")).toEqual({ match: true, reason: "first-surname" });
  });
});

describe("matchSurname: what must be rejected", () => {
  it.each([
    ["PERES", "PEREZ"], // one-letter typo
    ["PEREZZ", "PEREZ"],
    ["LOPEZ", "GARCIA LOPEZ"], // second surname alone
    ["GARCI", "GARCIA LOPEZ"], // partial word
    ["SAN", "SAN MARTIN"], // particle alone
    ["DE LA", "DE LA CRUZ"],
  ])("%s vs %s", (typed, registry) => rejects(typed, registry));

  it("rejects empty input on either side", () => {
    expect(matchSurname("   ", "PEREZ")).toEqual({ match: false, reason: "empty" });
    expect(matchSurname("PEREZ", "")).toEqual({ match: false, reason: "empty" });
    expect(matchSurname("'-", "PEREZ")).toEqual({ match: false, reason: "empty" });
  });
});
