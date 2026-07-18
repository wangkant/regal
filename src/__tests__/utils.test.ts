import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDaysISO,
  clampText,
  fmtDateISO,
  fmtTime,
  padLeft,
  padRight,
  speakerInitial,
  uuid,
  wrapText,
} from "../utils";

describe("uuid", () => {
  it("returns RFC 4122 formatted ids", () => {
    expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("returns unique values across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuid()));
    expect(ids.size).toBe(100);
  });
});

describe("clampText", () => {
  it("collapses runs of whitespace to single spaces", () => {
    expect(clampText("a   b\t\nc")).toBe("a b c");
  });

  it("trims leading and trailing whitespace", () => {
    expect(clampText("  hello  ")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(clampText("")).toBe("");
  });
});

describe("fmtTime", () => {
  it("formats a timestamp as a time string containing digits", () => {
    const s = fmtTime(Date.UTC(2026, 0, 15, 12, 34, 56));
    // Locale-dependent output; only assert general shape.
    expect(s).toMatch(/\d{1,2}.\d{2}.\d{2}/);
  });
});

describe("fmtDateISO", () => {
  it("formats a local date as YYYY-MM-DD with zero padding", () => {
    const t = new Date(2026, 0, 5).getTime(); // local Jan 5, 2026
    expect(fmtDateISO(t)).toBe("2026-01-05");
  });
});

describe("addDaysISO", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds days relative to today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 10)); // local Jun 10, 2026
    expect(addDaysISO(0)).toBe("2026-06-10");
    expect(addDaysISO(5)).toBe("2026-06-15");
  });

  it("rolls over month boundaries", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 30)); // local Jan 30, 2026
    expect(addDaysISO(3)).toBe("2026-02-02");
  });
});

describe("speakerInitial", () => {
  it("maps each speaker to its initial", () => {
    expect(speakerInitial("LAWYER 1")).toBe("L1");
    expect(speakerInitial("LAWYER 2")).toBe("L2");
    expect(speakerInitial("JUDGE")).toBe("J");
    expect(speakerInitial("WITNESS")).toBe("W");
    expect(speakerInitial("CLERK")).toBe("C");
  });
});

describe("padLeft / padRight", () => {
  it("pads numbers and strings on the left", () => {
    expect(padLeft(7, 3)).toBe("  7");
    expect(padLeft("ab", 4)).toBe("  ab");
  });

  it("pads strings on the right", () => {
    expect(padRight("ab", 5)).toBe("ab   ");
  });

  it("does not truncate values longer than the width", () => {
    expect(padLeft("abcdef", 3)).toBe("abcdef");
    expect(padRight("abcdef", 3)).toBe("abcdef");
  });
});

describe("wrapText", () => {
  it("keeps short text on one line", () => {
    expect(wrapText("hello world", 40)).toEqual(["hello world"]);
  });

  it("wraps long text into lines within the width", () => {
    const lines = wrapText("the quick brown fox jumps over the lazy dog", 15);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(15);
    }
    expect(lines.join(" ")).toBe("the quick brown fox jumps over the lazy dog");
  });

  it("returns an empty array for empty input", () => {
    expect(wrapText("", 10)).toEqual([]);
  });
});
