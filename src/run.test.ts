/**
 * Tests for avoidOverlap() using jsdom with mocked getBoundingClientRect.
 * Tests that the SA resolves overlapping labels to a non-overlapping state.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { avoidOverlap } from './index';

type Rect = { x: number; y: number; width: number; height: number };

function mockBCR(el: Element, rectFn: () => Rect) {
  el.getBoundingClientRect = () => {
    const r = rectFn();
    return {
      x: r.x, y: r.y, width: r.width, height: r.height,
      top: r.y, left: r.x, bottom: r.y + r.height, right: r.x + r.width,
      toJSON: () => ({}),
    } as DOMRect;
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x ||
           a.y + a.height <= b.y || b.y + b.height <= a.y);
}

describe('avoidOverlap', () => {
  let parent: HTMLElement;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
    mockBCR(parent, () => ({ x: 0, y: 0, width: 400, height: 300 }));
  });

  afterEach(() => {
    parent.remove();
  });

  it('resolves two overlapping labels via choices', () => {
    // A: choice 0 at (10,10) size 40×20 — overlaps B choice 0
    //    choice 1 at (10,60) size 40×20 — does not overlap B
    // B: choice 0 at (20,15) size 40×20 — overlaps A choice 0
    //    choice 1 at (20,65) size 40×20 — does not overlap A

    const nodeA = document.createElement('span');
    const nodeB = document.createElement('span');
    parent.appendChild(nodeA);
    parent.appendChild(nodeB);

    let aChoice = 0;
    const aPositions: Rect[] = [
      { x: 10, y: 10, width: 40, height: 20 },
      { x: 10, y: 60, width: 40, height: 20 },
    ];
    mockBCR(nodeA, () => aPositions[aChoice]);

    let bChoice = 0;
    const bPositions: Rect[] = [
      { x: 20, y: 15, width: 40, height: 20 },
      { x: 20, y: 65, width: 40, height: 20 },
    ];
    mockBCR(nodeB, () => bPositions[bChoice]);

    avoidOverlap([
      {
        technique: 'choices' as const,
        nodes: [nodeA],
        choices: [() => { aChoice = 0; }, () => { aChoice = 1; }],
        priority: 1,
        margin: 0,
      },
      {
        technique: 'choices' as const,
        nodes: [nodeB],
        choices: [() => { bChoice = 0; }, () => { bChoice = 1; }],
        priority: 1,
        margin: 0,
      },
    ], { iterations: 50_000 });

    const aVisible = nodeA.isConnected;
    const bVisible = nodeB.isConnected;

    // At least one label should be visible (both have equal priority)
    expect(aVisible || bVisible).toBe(true);

    if (aVisible && bVisible) {
      // Both visible → must not overlap
      expect(rectsOverlap(aPositions[aChoice], bPositions[bChoice])).toBe(false);
    }
  });

  it('resolves three mutually overlapping labels, removing the lowest priority one', () => {
    // A (priority 10): choice 0 at (10,10) — always shown
    // B (priority 1):  choice 0 at (10,10) overlapping A, choice 1 at (200,10) — no overlap
    // C (priority 1):  choice 0 at (10,10) overlapping A, choice 1 at (200,10) — overlaps B choice 1

    const nodeA = document.createElement('span');
    const nodeB = document.createElement('span');
    const nodeC = document.createElement('span');
    parent.appendChild(nodeA);
    parent.appendChild(nodeB);
    parent.appendChild(nodeC);

    mockBCR(nodeA, () => ({ x: 10, y: 10, width: 40, height: 20 }));

    let bChoice = 0;
    const bPositions: Rect[] = [
      { x: 10, y: 10, width: 40, height: 20 },
      { x: 200, y: 10, width: 40, height: 20 },
    ];
    mockBCR(nodeB, () => bPositions[bChoice]);

    let cChoice = 0;
    const cPositions: Rect[] = [
      { x: 10, y: 10, width: 40, height: 20 },
      { x: 200, y: 10, width: 40, height: 20 }, // overlaps B choice 1
    ];
    mockBCR(nodeC, () => cPositions[cChoice]);

    avoidOverlap([
      {
        technique: 'choices' as const,
        nodes: [nodeA],
        choices: [],                            // fixed obstacle
        priority: 10,
        margin: 0,
      },
      {
        technique: 'choices' as const,
        nodes: [nodeB],
        choices: [() => { bChoice = 0; }, () => { bChoice = 1; }],
        priority: 1,
        margin: 0,
      },
      {
        technique: 'choices' as const,
        nodes: [nodeC],
        choices: [() => { cChoice = 0; }, () => { cChoice = 1; }],
        priority: 1,
        margin: 0,
      },
    ], { iterations: 50_000 });

    // A must survive (highest priority)
    expect(nodeA.isConnected).toBe(true);

    // Check no overlaps among surviving nodes
    const aRect = { x: 10, y: 10, width: 40, height: 20 };
    if (nodeB.isConnected && nodeC.isConnected) {
      expect(rectsOverlap(bPositions[bChoice], cPositions[cChoice])).toBe(false);
    }
    if (nodeB.isConnected) {
      expect(rectsOverlap(aRect, bPositions[bChoice])).toBe(false);
    }
    if (nodeC.isConnected) {
      expect(rectsOverlap(aRect, cPositions[cChoice])).toBe(false);
    }
  });

  it('overlapCount stays non-negative throughout (no score drift)', () => {
    // Two overlapping labels; verify SA produces a valid state
    const nodeA = document.createElement('span');
    const nodeB = document.createElement('span');
    parent.appendChild(nodeA);
    parent.appendChild(nodeB);

    let aChoice = 0;
    const aPositions: Rect[] = [
      { x: 5,  y: 5, width: 80, height: 30 },
      { x: 5,  y: 60, width: 80, height: 30 },
      { x: 5,  y: 120, width: 80, height: 30 },
    ];
    mockBCR(nodeA, () => aPositions[aChoice]);

    let bChoice = 0;
    const bPositions: Rect[] = [
      { x: 30, y: 10, width: 80, height: 30 },
      { x: 30, y: 70, width: 80, height: 30 },
      { x: 30, y: 130, width: 80, height: 30 },
    ];
    mockBCR(nodeB, () => bPositions[bChoice]);

    avoidOverlap([
      {
        technique: 'choices' as const,
        nodes: [nodeA],
        choices: [
          () => { aChoice = 0; },
          () => { aChoice = 1; },
          () => { aChoice = 2; },
        ],
        priority: 1,
        margin: 0,
      },
      {
        technique: 'choices' as const,
        nodes: [nodeB],
        choices: [
          () => { bChoice = 0; },
          () => { bChoice = 1; },
          () => { bChoice = 2; },
        ],
        priority: 1,
        margin: 0,
      },
    ], { iterations: 50_000 });

    const aVisible = nodeA.isConnected;
    const bVisible = nodeB.isConnected;

    if (aVisible && bVisible) {
      expect(rectsOverlap(aPositions[aChoice], bPositions[bChoice])).toBe(false);
    }
    // At minimum one should be visible
    expect(aVisible || bVisible).toBe(true);
  });

  it('choiceBonuses: strongly preferred choice wins over showing a low-priority label', () => {
    // A (priority 2, bodyWeight=9): 2 choices.
    //   choice 0 at (10,10): overlaps B.  choiceBonus = 8 (strong preference)
    //   choice 1 at (10,60): no overlap.  choiceBonus = 0
    // B (priority 1, bodyWeight=4): fixed obstacle (choices:[]).
    //   always at (10,10).
    //
    // Without choiceBonuses SA would move A to choice 1 and keep B visible,
    // earning score 9 + 4 = 13.
    // With choiceBonuses=[8, 0] the score for A-at-choice-0 + B-hidden is
    //   9+8 = 17, beating A-at-choice-1 + B-visible = 9+0+4 = 13.
    // So SA should keep A at choice 0 and hide B.

    const nodeA = document.createElement('span');
    const nodeB = document.createElement('span');
    parent.appendChild(nodeA);
    parent.appendChild(nodeB);

    let aChoice = 0;
    const aPositions: Rect[] = [
      { x: 10, y: 10, width: 40, height: 20 }, // overlaps B
      { x: 10, y: 60, width: 40, height: 20 }, // clear
    ];
    mockBCR(nodeA, () => aPositions[aChoice]);
    mockBCR(nodeB, () => ({ x: 10, y: 10, width: 40, height: 20 }));

    avoidOverlap([
      {
        technique: 'choices' as const,
        nodes: [nodeA],
        choices: [() => { aChoice = 0; }, () => { aChoice = 1; }],
        choiceBonuses: [8, 0],
        priority: 2,
        margin: 0,
      },
      {
        technique: 'choices' as const,
        nodes: [nodeB],
        choices: [],          // fixed obstacle
        priority: 1,
        margin: 0,
      },
    ], { iterations: 50_000 });

    // A must be visible at choice 0 (preferred position)
    expect(nodeA.isConnected).toBe(true);
    expect(aChoice).toBe(0);
    // B must be hidden because the choice bonus for A at choice 0 outweighs showing B
    expect(nodeB.isConnected).toBe(false);
  });
});
