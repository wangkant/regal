import { describe, expect, it } from "vitest";
import { formatLegalTranscript } from "../formatTranscript";
import type { LogItem, LawyerProfile, Speaker } from "../types";

const PAGE_WIDTH = 96;
const T0 = Date.UTC(2026, 0, 15, 10, 0, 0);

let counter = 0;
function speech(text: string, at: number, speaker: Speaker = "JUDGE"): LogItem {
  counter += 1;
  return { id: `id-${counter}`, at, speaker, text, kind: "speech" };
}

function mark(text: string, at: number): LogItem {
  counter += 1;
  return { id: `id-${counter}`, at, speaker: "CLERK", text, kind: "mark" };
}

const profile: LawyerProfile = {
  fullName: "Jane Doe",
  barNumber: "CA-1234567",
  firm: "Regal LLP",
  role: "LAWYER 1",
  validThrough: "2027-01-01",
  verifiedAt: T0,
};

describe("formatLegalTranscript", () => {
  it("renders the header with defaults for an empty log", () => {
    const out = formatLegalTranscript({ logs: [], date: "2026-01-15" });
    const lines = out.split("\n");
    expect(lines[0]).toContain("REGAL — LEGAL OPERATIONS PLATFORM");
    expect(lines[0]).toContain("Page 1");
    expect(lines[1]).toBe("Proceedings Transcript (Unofficial)");
    expect(lines[2]).toContain("Case No. 24-CV-____");
    expect(lines[2]).toContain("Date: 2026-01-15");
    expect(lines[3]).toBe("Verified user: (not provided)");
    expect(lines[4]).toBe("-".repeat(PAGE_WIDTH));
  });

  it("includes the verified profile in the header", () => {
    const out = formatLegalTranscript({ logs: [], profile, date: "2026-01-15" });
    expect(out).toContain("Verified user: Jane Doe · Regal LLP · Bar CA-1234567 · Valid thru 2027-01-01 · LAWYER 1");
  });

  it("honors custom case metadata", () => {
    const out = formatLegalTranscript({
      logs: [],
      caseTitle: "SMITH v. JONES",
      caseNo: "Case No. 99-CV-0001",
      location: "Oakland, CA",
      proceeding: "Deposition",
      date: "2026-02-01",
    });
    expect(out).toContain("SMITH v. JONES");
    expect(out).toContain("Case No. 99-CV-0001");
    expect(out).toContain("Location: Oakland, CA");
    expect(out).toContain("Deposition");
  });

  it("emits numbered speech lines followed by a timestamp line", () => {
    const out = formatLegalTranscript({ logs: [speech("Order in the court.", T0)], date: "2026-01-15" });
    const lines = out.split("\n");
    const body = lines.slice(5);
    expect(body[0]).toMatch(/^ 1 {3}JUDGE {7}: Order in the court\.$/);
    expect(body[1]).toMatch(/^ 2 {15}: \[\d{1,2}.\d{2}.\d{2}[^\]]*\]$/);
  });

  it("renders mark items as centered CLERK lines", () => {
    const out = formatLegalTranscript({ logs: [mark("SESSION OPENED", T0)], date: "2026-01-15" });
    expect(out).toContain("CLERK       : — SESSION OPENED —");
  });

  it("sorts entries by timestamp regardless of input order", () => {
    const out = formatLegalTranscript({
      logs: [speech("second", T0 + 60_000, "WITNESS"), speech("first", T0, "JUDGE")],
      date: "2026-01-15",
    });
    expect(out.indexOf("first")).toBeLessThan(out.indexOf("second"));
  });

  it("wraps long speech across lines, labeling only the first", () => {
    const long = Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ");
    const out = formatLegalTranscript({ logs: [speech(long, T0, "WITNESS")], date: "2026-01-15" });
    const body = out.split("\n").slice(5);
    expect(body[0]).toContain("WITNESS");
    expect(body[1]).not.toContain("WITNESS");
    expect(body[1]).toMatch(/^ 2 {15}: word/);
  });

  it("starts a new page with a fresh header once the line limit is hit", () => {
    const logs = Array.from({ length: 4 }, (_, i) => speech(`line ${i}`, T0 + i * 1000, "JUDGE"));
    const out = formatLegalTranscript({ logs, date: "2026-01-15", pageLineLimit: 3 });
    expect(out).toContain("Page 2");
    const pages = out.split("\n\n");
    expect(pages.length).toBeGreaterThan(1);
  });

  it("keeps every line within the page width", () => {
    const long = Array.from({ length: 60 }, (_, i) => `token${i}`).join(" ");
    const out = formatLegalTranscript({ logs: [speech(long, T0), mark("A VERY LONG MARK ".repeat(10), T0 + 1)], date: "2026-01-15" });
    for (const line of out.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(PAGE_WIDTH);
    }
  });
});
