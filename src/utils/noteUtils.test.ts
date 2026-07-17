import { describe, expect, it } from "vitest";
import {
  appendLines,
  documentToNote,
  getNextDailyKey,
  moveIncompleteLines,
  moveLine,
  moveLines,
  noteToDocument,
  splitNote,
} from "./noteUtils";

describe("splitNote", () => {
  it("uses explicit newlines as item boundaries", () => {
    expect(splitNote("a visually wrapped item\nnext item")).toEqual([
      "a visually wrapped item",
      "next item",
    ]);
  });
});

describe("plaintext document conversion", () => {
  it("round-trips explicit and trailing blank lines", () => {
    const note = "first\n\nthird\n";
    expect(documentToNote(noteToDocument(note))).toBe(note);
  });

  it("keeps linked text as plaintext", () => {
    expect(
      documentToNote({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "https://example.com",
                marks: [
                  { type: "link", attrs: { href: "https://example.com" } },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe("https://example.com");
  });
});

describe("appendLines", () => {
  it("appends to populated notes without adding duplicate separators", () => {
    expect(appendLines("existing", ["moved"])).toBe("existing\nmoved");
    expect(appendLines("existing\n", ["moved"])).toBe("existing\nmoved");
  });
});

describe("getNextDailyKey", () => {
  const noteKeys = ["mon", "tue", "wed", "thu", "fri", "weekend"];

  it("moves Friday items into the current weekend", () => {
    expect(getNextDailyKey(4, noteKeys, new Date(2026, 6, 13))).toBe(
      "weekend",
    );
  });

  it("moves weekend items into the following Monday", () => {
    expect(getNextDailyKey(5, noteKeys, new Date(2026, 6, 13))).toBe(
      "7.20.2026",
    );
  });
});

describe("moveLine", () => {
  it("moves one selected line and preserves the others", () => {
    expect(moveLine("first\nsecond\nthird", "destination", 1)).toEqual({
      source: "first\nthird",
      destination: "destination\nsecond",
      moved: true,
    });
  });

  it("does not move an empty separator line", () => {
    expect(moveLine("first\n\nthird", "", 1)).toEqual({
      source: "first\n\nthird",
      destination: "",
      moved: false,
    });
  });
});

describe("moveLines", () => {
  it("moves multiple selected lines and preserves the others", () => {
    expect(
      moveLines("first\nsecond\nthird\nfourth", "destination", [1, 2]),
    ).toEqual({
      source: "first\nfourth",
      destination: "destination\nsecond\nthird",
      moved: true,
    });
  });

  it("handles non-contiguous line indices", () => {
    expect(moveLines("first\nsecond\nthird\nfourth", "", [0, 2])).toEqual({
      source: "second\nfourth",
      destination: "first\nthird",
      moved: true,
    });
  });

  it("sorts indices to maintain order in destination", () => {
    expect(moveLines("first\nsecond\nthird", "", [2, 0])).toEqual({
      source: "second",
      destination: "first\nthird",
      moved: true,
    });
  });

  it("skips empty lines in the selection", () => {
    expect(moveLines("first\n\nthird", "", [0, 1, 2])).toEqual({
      source: "",
      destination: "first\nthird",
      moved: true,
    });
  });

  it("does nothing when all selected lines are empty", () => {
    expect(moveLines("first\n\nthird", "", [1])).toEqual({
      source: "first\n\nthird",
      destination: "",
      moved: false,
    });
  });

  it("does nothing for empty selection", () => {
    expect(moveLines("first\nsecond", "", [])).toEqual({
      source: "first\nsecond",
      destination: "",
      moved: false,
    });
  });
});

describe("moveIncompleteLines", () => {
  it("keeps lines whose first character is x and moves every other line", () => {
    const source = [
      "work",
      "x mp, reply joe",
      "- tar, qa",
      "",
      " x intentionally not completed",
      "x vm, reply mazlyn",
    ].join("\n");

    expect(moveIncompleteLines(source, "already there")).toEqual({
      source: "x mp, reply joe\nx vm, reply mazlyn",
      destination:
        "already there\nwork\n- tar, qa\n\n x intentionally not completed",
      moved: true,
    });
  });

  it("does nothing when every line is completed", () => {
    expect(moveIncompleteLines("x one\nx two", "next")).toEqual({
      source: "x one\nx two",
      destination: "next",
      moved: false,
    });
  });

  it("does nothing for an empty note", () => {
    expect(moveIncompleteLines("", "next")).toEqual({
      source: "",
      destination: "next",
      moved: false,
    });
  });
});
