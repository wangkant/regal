import { describe, expect, it } from "vitest";
import { runAssistant } from "../assistant";
import type { LogItem, Speaker } from "../types";

let counter = 0;
function speech(text: string, at: number, speaker: Speaker = "WITNESS"): LogItem {
  counter += 1;
  return { id: `id-${counter}`, at, speaker, text, kind: "speech" };
}

function mark(text: string, at: number): LogItem {
  counter += 1;
  return { id: `id-${counter}`, at, speaker: "CLERK", text, kind: "mark" };
}

const T0 = Date.UTC(2026, 0, 15, 10, 0, 0);

describe("runAssistant", () => {
  it("asks for a question when the query is empty or whitespace", () => {
    expect(runAssistant("", []).answer).toBe("Please enter a question.");
    expect(runAssistant("   ", []).answer).toBe("Please enter a question.");
  });

  it("asks for a more specific question when no keywords can be extracted", () => {
    const res = runAssistant("?!.,", [speech("anything", T0)]);
    expect(res.answer).toBe("Please enter a more specific question.");
    expect(res.scenes).toEqual([]);
  });

  it("reports no matches when nothing in the log matches", () => {
    const res = runAssistant("contract", [speech("totally unrelated", T0)]);
    expect(res.answer).toBe("No relevant segments found for that query.");
    expect(res.scenes).toEqual([]);
  });

  it("matches lines by keyword tokens from the query", () => {
    const logs = [
      speech("I reviewed the contract the night before.", T0),
      speech("The weather was nice.", T0 + 10_000),
    ];
    const res = runAssistant("contract", logs);
    expect(res.answer).toContain("Matches: 1 line(s)");
    expect(res.answer).toContain("I reviewed the contract the night before.");
    expect(res.scenes).toHaveLength(1);
    expect(res.scenes[0].lineIds).toEqual([logs[0].id]);
  });

  it("expands food-related queries to restaurant keywords", () => {
    const logs = [speech("We met at the diner on Fifth.", T0)];
    const res = runAssistant("did they discuss a restaurant?", logs);
    expect(res.answer).toContain("Matches: 1 line(s)");
    expect(res.scenes).toHaveLength(1);
  });

  it("ignores mark items even when their text matches", () => {
    const logs = [mark("CONTRACT EXHIBIT MARKED", T0), speech("no relevant words here", T0 + 1000)];
    const res = runAssistant("contract", logs);
    expect(res.answer).toBe("No relevant segments found for that query.");
  });

  it("groups hits within 90 seconds into one scene and splits larger gaps", () => {
    const logs = [
      speech("contract clause one", T0),
      speech("contract clause two", T0 + 60_000),
      speech("contract clause three", T0 + 60_000 + 91_000),
    ];
    const res = runAssistant("contract", logs);
    expect(res.scenes).toHaveLength(2);
    expect(res.scenes[0].lineIds).toHaveLength(2);
    expect(res.scenes[1].lineIds).toHaveLength(1);
    expect(res.scenes[0].title).toBe("Scene 1");
    expect(res.scenes[1].title).toBe("Scene 2");
  });

  it("orders scenes chronologically even when logs are unordered", () => {
    const early = speech("contract signed early", T0);
    const late = speech("contract signed late", T0 + 600_000);
    const res = runAssistant("contract", [late, early]);
    expect(res.scenes).toHaveLength(2);
    expect(res.scenes[0].startAt).toBe(early.at);
    expect(res.scenes[1].startAt).toBe(late.at);
  });

  it("collects distinct speakers per scene", () => {
    const logs = [
      speech("the contract terms", T0, "LAWYER 1"),
      speech("objection to the contract question", T0 + 5000, "LAWYER 2"),
      speech("the contract was clear", T0 + 10_000, "LAWYER 1"),
    ];
    const res = runAssistant("contract", logs);
    expect(res.scenes).toHaveLength(1);
    expect(res.scenes[0].speakers.sort()).toEqual(["LAWYER 1", "LAWYER 2"]);
  });
});
