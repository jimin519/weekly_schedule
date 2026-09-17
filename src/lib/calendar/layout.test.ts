import { describe, expect, it } from "vitest";
import { layoutOverlappingBlocks } from "./layout";

describe("layoutOverlappingBlocks", () => {
  it("assigns a single full-width column when nothing overlaps", () => {
    const result = layoutOverlappingBlocks([
      { id: "a", startMinutes: 0, endMinutes: 60 },
      { id: "b", startMinutes: 60, endMinutes: 120 },
    ]);
    expect(result.map((r) => ({ id: r.id, column: r.column, columnCount: r.columnCount }))).toEqual([
      { id: "a", column: 0, columnCount: 1 },
      { id: "b", column: 0, columnCount: 1 },
    ]);
  });

  it("splits two overlapping blocks into two columns", () => {
    const result = layoutOverlappingBlocks([
      { id: "a", startMinutes: 0, endMinutes: 90 },
      { id: "b", startMinutes: 30, endMinutes: 60 },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a.columnCount).toBe(2);
    expect(byId.b.columnCount).toBe(2);
    expect(byId.a.column).not.toBe(byId.b.column);
  });

  it("keeps transitively-overlapping chains in the same cluster width", () => {
    // A(0-60) overlaps B(30-90) overlaps C(80-120); A and C don't directly overlap
    const result = layoutOverlappingBlocks([
      { id: "a", startMinutes: 0, endMinutes: 60 },
      { id: "b", startMinutes: 30, endMinutes: 90 },
      { id: "c", startMinutes: 80, endMinutes: 120 },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a.columnCount).toBe(2);
    expect(byId.b.columnCount).toBe(2);
    expect(byId.c.columnCount).toBe(2);
    // A and C can safely reuse the same column since they don't overlap
    expect(byId.a.column).toBe(byId.c.column);
    expect(byId.b.column).not.toBe(byId.a.column);
  });

  it("treats back-to-back blocks (touching, not overlapping) as separate clusters", () => {
    const result = layoutOverlappingBlocks([
      { id: "a", startMinutes: 0, endMinutes: 60 },
      { id: "b", startMinutes: 60, endMinutes: 120 },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a.columnCount).toBe(1);
    expect(byId.b.columnCount).toBe(1);
  });
});
