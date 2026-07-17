import { describe, expect, it } from "vitest";
import { createMoveHistory, type MoveHistoryEntry } from "./moveHistory";

function move(from: string, to: string): MoveHistoryEntry {
  return {
    sourceKey: from,
    destinationKey: to,
    beforeSource: `item-at-${from}`,
    beforeDestination: "",
    afterSource: "",
    afterDestination: `item-at-${from}`,
  };
}

describe("createMoveHistory", () => {
  it("rewinds an arbitrary chain of moves before falling through to editor undo", () => {
    const history = createMoveHistory();
    history.recordMove(move("mon", "tue"));
    history.recordMove(move("tue", "wed"));
    history.recordMove(move("wed", "thu"));

    expect(history.undo(true)?.sourceKey).toBe("wed");
    expect(history.undo(true)?.sourceKey).toBe("tue");
    expect(history.undo(true)?.sourceKey).toBe("mon");
    expect(history.undo(true)).toBeNull();
  });

  it("lets TipTap handle undo after a text edit, then resumes move undo", () => {
    const history = createMoveHistory();
    history.recordMove(move("mon", "tue"));
    history.recordEdit();

    expect(history.undo(true)).toBeNull();
    expect(history.undo(false)?.sourceKey).toBe("mon");
  });

  it("redoes moves in original order after undoing them", () => {
    const history = createMoveHistory();
    history.recordMove(move("mon", "tue"));
    history.recordMove(move("tue", "wed"));

    history.undo(false);
    history.undo(false);

    expect(history.redo(false)?.destinationKey).toBe("tue");
    expect(history.redo(false)?.destinationKey).toBe("wed");
    expect(history.redo(false)).toBeNull();
  });

  it("clears move redo when the user edits", () => {
    const history = createMoveHistory();
    history.recordMove(move("mon", "tue"));
    history.undo(false);
    history.recordEdit();

    expect(history.redo(false)).toBeNull();
  });

  it("records completed-item moves the same as any other move", () => {
    const history = createMoveHistory();
    const completed: MoveHistoryEntry = {
      sourceKey: "mon",
      destinationKey: "tue",
      beforeSource: "x done",
      beforeDestination: "",
      afterSource: "",
      afterDestination: "x done",
    };

    history.recordMove(completed);
    expect(history.undo(false)).toEqual(completed);
  });
});
