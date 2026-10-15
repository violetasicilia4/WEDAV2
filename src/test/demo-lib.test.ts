import { describe, expect, it } from "vitest";

import { getCountdown } from "@/lib/countdown";
import { events, gifts, categories, weddingStart } from "@/lib/demo-wedding";
import { buildIcs, parseTime, toUtcStamp } from "@/lib/ics";

describe("calendario (.ics)", () => {
  it("parsea horarios y descarta los inválidos", () => {
    expect(parseTime("17:00 hs")).toEqual({ h: 17, m: 0 });
    expect(parseTime("a confirmar")).toBeNull();
    expect(parseTime("25:00")).toBeNull();
  });

  it("convierte hora local de Buenos Aires (-03:00) a UTC", () => {
    expect(toUtcStamp("2027-03-20", { h: 17, m: 0 }, "-03:00")).toBe("20270320T200000Z");
    expect(toUtcStamp("2027-03-20", { h: 21, m: 30 }, "-03:00")).toBe("20270321T003000Z");
  });

  it("genera un VEVENT por evento con horario válido y no inventa horas de fin", () => {
    const ics = buildIcs({ events, date: weddingStart.slice(0, 10), offset: "-03:00", title: "Casamiento de Ignacio & Martina", now: new Date("2026-10-14T12:00:00Z") });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(events.length);
    expect(ics).not.toContain("DTEND");
    expect(ics).toContain("DTSTART:20270320T200000Z");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("omite un evento sin horario válido", () => {
    const ics = buildIcs({ events: [{ ...events[0]!, time: "a confirmar" }], date: "2027-03-20", offset: "-03:00", title: "x" });
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});

describe("cuenta regresiva", () => {
  const target = "2027-03-20T17:00:00-03:00";
  it("calcula días, horas y minutos", () => {
    const now = Date.parse("2027-03-18T14:30:00-03:00");
    expect(getCountdown(target, now)).toEqual({ past: false, days: 2, hours: 2, minutes: 30, seconds: 0 });
  });
  it("nunca devuelve valores negativos cuando la fecha pasó", () => {
    expect(getCountdown(target, Date.parse("2027-04-01T00:00:00-03:00"))).toEqual({ past: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
  it("trata una fecha inválida como pasada", () => {
    expect(getCountdown("no-es-fecha", Date.now()).past).toBe(true);
  });
});

describe("catálogo de regalos de la demo", () => {
  it("tiene entre 20 y 30 regalos y ninguna categoría con menos de 4", () => {
    expect(gifts.length).toBeGreaterThanOrEqual(20);
    expect(gifts.length).toBeLessThanOrEqual(30);
    for (const c of categories) expect(gifts.filter(g => g.category === c).length).toBeGreaterThanOrEqual(4);
  });
  it("no repite ids ni tiene importes inválidos", () => {
    const ids = gifts.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(gifts.every(g => g.amount > 0)).toBe(true);
  });
});
