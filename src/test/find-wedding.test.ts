import { describe, expect, it } from "vitest";
import { demoWeddings, formatWeddingDate } from "@/lib/encontrar/data";
import {
  checkQuery,
  matchWeddings,
  normalize,
  queryTokens,
  searchWeddings,
  SearchError,
} from "@/lib/encontrar/search";

const ids = (q: string) => matchWeddings(queryTokens(q)).map((w) => w.id);

describe("Encontrá tu casamiento: búsqueda", () => {
  it("normaliza mayúsculas, tildes, signos y espacios", () => {
    expect(normalize("  SOFÍA   &  Tomás ")).toBe("sofia tomas");
  });

  it("encuentra por los nombres de la pareja", () => {
    expect(ids("Ignacio y Martina")).toEqual(["demo-ignacio-martina"]);
    expect(ids("Camila")).toEqual(["demo-camila-lucas"]);
  });

  it("no depende del orden de los nombres", () => {
    expect(ids("Martina Ignacio")).toEqual(ids("Ignacio & Martina"));
    expect(ids("lucas y camila")).toEqual(["demo-camila-lucas"]);
  });

  it("tolera mayúsculas, tildes y espacios extra", () => {
    expect(ids("  SOFIA   tomas ")).toEqual(["demo-sofia-tomas"]);
    expect(ids("sofía")).toEqual(["demo-sofia-tomas"]);
  });

  it("acepta el comienzo de un nombre", () => {
    expect(ids("mart")).toEqual(["demo-ignacio-martina"]);
  });

  it("exige que todas las palabras coincidan con la misma pareja", () => {
    expect(ids("Ignacio Lucas")).toEqual([]);
    expect(ids("Zacarías")).toEqual([]);
  });

  it("valida la consulta antes de buscar", () => {
    expect(checkQuery("")).toEqual({ ok: false, reason: "empty" });
    expect(checkQuery("   ")).toEqual({ ok: false, reason: "empty" });
    expect(checkQuery(" y ")).toEqual({ ok: false, reason: "empty" });
    expect(checkQuery("a")).toEqual({ ok: false, reason: "short" });
    expect(checkQuery("Ana").ok).toBe(true);
  });

  it("searchWeddings resuelve resultados, vacío y error simulado", async () => {
    expect((await searchWeddings("Julieta", { latencyMs: 0 })).map((w) => w.id)).toEqual([
      "demo-julieta-franco",
    ]);
    expect(await searchWeddings("Nadie Conocido", { latencyMs: 0 })).toEqual([]);
    await expect(searchWeddings("error", { latencyMs: 0 })).rejects.toBeInstanceOf(SearchError);
  });
});

describe("Encontrá tu casamiento: datos de demostración", () => {
  it("cada evento tiene identificador único y una portada propia asignada", () => {
    expect(demoWeddings.length).toBeGreaterThanOrEqual(20);
    expect(new Set(demoWeddings.map((w) => w.id)).size).toBe(demoWeddings.length);
    expect(demoWeddings.every((w) => w.cover && w.coverAlt)).toBe(true);
  });

  it("da formato a la fecha y tolera su ausencia", () => {
    expect(formatWeddingDate("2027-03-20")).toBe("20 de marzo de 2027");
    expect(formatWeddingDate(null)).toBeNull();
  });
});
