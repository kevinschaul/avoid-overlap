import RBush from 'rbush';
import seedrandom from 'seedrandom';
import defaultDebugFunc from './debug.js';
import type { DebugLabel, DebugInfo } from './debug.js';

export type { DebugLabel, DebugInfo };

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type Direction = 'up' | 'right' | 'down' | 'left';

const resolveMargin = (m?: number | Partial<Margin>): Margin => {
  if (m === undefined) return { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof m === 'number') return { top: m, right: m, bottom: m, left: m };
  return { top: m.top ?? 0, right: m.right ?? 0, bottom: m.bottom ?? 0, left: m.left ?? 0 };
};

type BodyDataGeneric = {
  priority: number;
  priorityWithinGroup: number;
  remove: boolean;
  onRemove?: (el: Element) => void;
};

type BodyDataNudge = BodyDataGeneric & {
  technique: 'nudge';
  render: (el: Element, deltaX: number, deltaY: number) => void;
  directions: Direction[];
  maxDistance?: number;
};

type BodyDataChoices = BodyDataGeneric & {
  technique: 'choices';
  choices: ((el: Element) => void)[];
  choiceBonuses?: number[];
};

type BodyDataFixed = BodyDataGeneric & {
  technique: 'fixed';
};

export type BodyData = BodyDataNudge | BodyDataChoices | BodyDataFixed;

export interface Body {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  isStatic: boolean;
  node: Element;
  data: BodyData;
}

interface CollisionCandidate {
  a: Body;
  b: Body;
}

type LabelGroupGeneric = {
  technique: 'nudge' | 'choices';
  nodes: Element[];
  margin?: number | Partial<Margin>;
  priority?: number;
  /**
   * Whether the algorithm is allowed to remove this label when it cannot be
   * placed without overlapping a higher-priority label.
   * Set to false to always show the label, even if it overlaps.
   * Default: true
   */
  remove?: boolean;
  onRemove?: (el: Element) => void;
};

type LabelGroupNudge = LabelGroupGeneric & {
  technique: 'nudge';
  render: (el: Element, deltaX: number, deltaY: number) => void;
  directions?: Direction[];
  maxDistance?: number;
};

type LabelGroupChoices = LabelGroupGeneric & {
  technique: 'choices';
  choices: ((el: Element) => void)[];
  /**
   * Optional score bonus for each choice, parallel to the `choices` array.
   * Positive values make a choice more attractive; negative values make it
   * less attractive.  Values are on the same scale as the per-label body
   * weight `(priority + 1) ^ scoreExponent`, so they can meaningfully
   * compete with showing or hiding a lower-priority label.
   *
   * Example — prefer the first direction strongly, allow others as fallbacks:
   *   choiceBonuses: [4, 1, 1, -2, -2, -2, -2, -2]
   *
   * When omitted, a small displacement penalty (-0.5) is applied to all
   * non-zero choices so that SA returns to the natural position whenever
   * the layout allows it.
   */
  choiceBonuses?: number[];
};

type LabelGroupFixed = {
  technique: 'fixed';
  nodes: Element[];
  margin?: number | Partial<Margin>;
};

export type LabelGroup = LabelGroupNudge | LabelGroupChoices | LabelGroupFixed;

export type Options = {
  includeParent?: boolean;
  /**
   * Margin inset from the parent boundary. Negative values allow labels to
   * touch (but not cross) the parent edge without a collision penalty.
   * Accepts a number (uniform) or per-side object.
   * Default: -2 (all sides)
   */
  parentMargin?: number | Partial<Margin>;
  debug?: boolean;
  /**
   * Number of simulated-annealing iterations.
   * More iterations = better results but slower.
   * Default: 10_000
   */
  iterations?: number;
  /**
   * Initial temperature for simulated annealing.
   * Higher values allow the algorithm to escape local optima early on.
   * Default: 100
   */
  temperature?: number;
  /**
   * Multiplicative cooling rate applied each iteration (must be in (0, 1)).
   * Values close to 1 cool slowly (more exploration); values closer to 0
   * cool fast (more exploitation).
   * Default: 0.995
   */
  coolingRate?: number;
  /**
   * Exponent used in the per-label score formula:
   *   score = (priority + 1) ^ scoreExponent
   * Higher values make the highest-priority labels exponentially more
   * valuable relative to lower-priority labels.
   * Default: 2  (quadratic weighting)
   */
  scoreExponent?: number;
  /**
   * Seed for the random number generator to enable deterministic results.
   * The same seed will produce identical label placements across multiple runs.
   * Default: 42 (for reproducibility)
   */
  seed?: string | number;
};

const getRelativeBounds = (child: Bounds, parent: Bounds) =>
  <Bounds>{
    x: child.x - parent.x,
    y: child.y - parent.y,
    width: child.width,
    height: child.height,
  };

/**
 * Returns the viewport bounding rect for an element.
 * For SVGGraphicsElement nodes, uses getBBox() + getScreenCTM() to get tight
 * visual bounds that are consistent across browsers (Firefox typographic vs
 * Chrome glyph bounds differ when using getBoundingClientRect() on SVG text).
 */
const getNodeBounds = (node: Element): DOMRect => {
  if (typeof (node as SVGGraphicsElement).getBBox === 'function') {
    const svgNode = node as SVGGraphicsElement;
    const bbox = svgNode.getBBox();
    const ctm = svgNode.getScreenCTM();
    if (ctm) {
      const x = ctm.a * bbox.x + ctm.c * bbox.y + ctm.e;
      const y = ctm.b * bbox.x + ctm.d * bbox.y + ctm.f;
      const w = ctm.a * bbox.width + ctm.c * bbox.height;
      const h = ctm.b * bbox.width + ctm.d * bbox.height;
      return new DOMRect(x, y, Math.abs(w), Math.abs(h));
    }
  }
  return node.getBoundingClientRect();
};

/** Find the first collision where at least one body can be hidden. */
const findCollision = (tree: RBush<Body>): CollisionCandidate | null => {
  const bodies = tree.all();
  for (const body of bodies) {
    if (body.isStatic) continue;
    const overlapping = tree.search(body);
    for (const candidate of overlapping) {
      if (candidate !== body) {
        // Skip pairs where both bodies must stay visible
        if (!body.data.remove && !candidate.data.remove) continue;
        return { a: body, b: candidate };
      }
    }
  }
  return null;
};

const orderBodies = (a: Body, b: Body): [Body, Body] => {
  if (b.data.priority > a.data.priority) {
    return [a, b];
  }
  if (a.data.priority > b.data.priority) {
    return [b, a];
  }
  if (b.data.priorityWithinGroup > a.data.priorityWithinGroup) {
    return [a, b];
  }
  return [b, a];
};

const removeCollisions = (tree: RBush<Body>) => {
  const maxAttempts = tree.all().length;
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts += 1;
    const collision = findCollision(tree);
    if (!collision) break;
    const [first, second] = orderBodies(collision.a, collision.b);
    // Remove the lower-priority body, falling back to the other if it can't be removed
    const bodyToRemove = first.data.remove ? first : second;
    bodyToRemove.data.onRemove?.(bodyToRemove.node);
    bodyToRemove.node.remove();
    tree.remove(bodyToRemove);
  }
};

const addParent = (
  tree: RBush<Body>,
  parent: Element,
  parentBounds: Bounds,
  parentMargin: Margin
) => {
  const t = 200; // thickness of boundary walls
  const w = parentBounds.width;
  const h = parentBounds.height;

  const sides: [number, number, number, number][] = [
    [-t, -t, w + t, parentMargin.top], // top
    [-t, h - parentMargin.bottom, w + t, h + t], // bottom
    [-t, -t, parentMargin.left, h + t], // left
    [w - parentMargin.right, -t, w + t, h + t], // right
  ];

  for (const [minX, minY, maxX, maxY] of sides) {
    tree.insert(<Body>{
      minX,
      minY,
      maxX,
      maxY,
      isStatic: true,
      node: parent,
      data: {
        technique: 'fixed',
        priority: Infinity,
        priorityWithinGroup: Infinity,
        remove: false,
      },
    });
  }
};

const extendBodyDataNudge = (
  bodyData: BodyDataGeneric,
  labelGroup: LabelGroupNudge
): BodyDataNudge => ({
  ...bodyData,
  technique: 'nudge',
  directions: labelGroup.directions ?? ['down', 'right', 'up', 'left'],
  render: labelGroup.render,
  maxDistance: labelGroup.maxDistance,
});

const extendBodyDataChoices = (
  bodyData: BodyDataGeneric,
  labelGroup: LabelGroupChoices
): BodyDataChoices => ({
  ...bodyData,
  technique: 'choices',
  choices: labelGroup.choices,
  choiceBonuses: labelGroup.choiceBonuses,
});

// ─── Scoring helpers ──────────────────────────────────────────────────────────

/** Bounding box pre-computed for a single choice position (no DOM involvement). */
type ChoicePosition = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/**
 * Score weight for a label.
 * Using (priority + 1)^exp so that even priority-0 labels contribute,
 * and higher-priority labels are exponentially more valuable when exp > 1.
 */
const bodyWeight = (priority: number, exp: number): number =>
  (Math.max(0, priority) + 1) ** exp;

/**
 * Pre-compute the bounding-box positions for every candidate placement of a body.
 *
 * - `choices` bodies: calls each choice function, reads the DOM rect (transient
 *   DOM modification), and records the resulting bounding box.
 * - `nudge` bodies: generates positions arithmetically by shifting the initial
 *   bounding box in each allowed direction at maxDistance — no DOM calls required.
 *
 * The width/height of the body (which includes the margin) is preserved across
 * all positions so they are directly usable in the spatial tree.
 */
const DEFAULT_MAX_DISTANCE = 64;

const precomputePositions = (
  body: Body,
  parentBounds: Bounds,
): ChoicePosition[] => {
  const w = body.maxX - body.minX;
  const h = body.maxY - body.minY;

  if (body.data.technique === 'choices') {
    const { choices } = body.data as BodyDataChoices;
    if (choices.length === 0) {
      // No choice functions — treat as a fixed obstacle at its initial position.
      return [
        { minX: body.minX, minY: body.minY, maxX: body.maxX, maxY: body.maxY },
      ];
    }
    return choices.map((choice) => {
      choice(body.node);
      const r = getRelativeBounds(
        getNodeBounds(body.node),
        parentBounds
      );
      return { minX: r.x, minY: r.y, maxX: r.x + w, maxY: r.y + h };
    });
  }

  if (body.data.technique === 'nudge') {
    // Start with the initial (un-nudged) position, then add one candidate per
    // direction at maxDistance.  The compression pass later finds the true
    // minimum collision-free offset in 1 px steps.  Pure arithmetic — no DOM calls.
    const nudgeData = body.data as BodyDataNudge;
    const offset = nudgeData.maxDistance ?? DEFAULT_MAX_DISTANCE;
    const positions: ChoicePosition[] = [
      { minX: body.minX, minY: body.minY, maxX: body.maxX, maxY: body.maxY },
    ];
    nudgeData.directions.forEach((dir) => {
      const dx = dir === 'right' ? offset : dir === 'left' ? -offset : 0;
      const dy = dir === 'down' ? offset : dir === 'up' ? -offset : 0;
      positions.push({
        minX: body.minX + dx,
        minY: body.minY + dy,
        maxX: body.maxX + dx,
        maxY: body.maxY + dy,
      });
    });
    return positions;
  }

  // fixed: only the original position
  return [
    { minX: body.minX, minY: body.minY, maxX: body.maxX, maxY: body.maxY },
  ];
};

let nextUid = 0;

/**
 * Run a global score-maximising label placement using simulated annealing.
 *
 * Each label is assigned a score of `(priority + 1) ^ scoreExponent`.
 * The algorithm searches for the configuration of label positions/visibility
 * that maximises the total score while keeping all visible labels
 * non-overlapping.  Removing (hiding) a label loses its score contribution,
 * so the algorithm naturally prefers keeping high-priority labels visible.
 *
 * Labels that use the `choices` technique can be placed at any of their
 * pre-defined positions, or hidden.  Labels that use the `nudge` technique
 * are placed at one of several synthetic offset positions (controlled by
 * `directions`), or hidden.
 *
 * After SA terminates the best-found configuration is applied to the DOM.
 * A greedy removal pass is run as a safety net in case any overlaps remain
 * (e.g. if SA did not fully converge).
 *
 * Returns a DebugInfo object when `options.debug` is true, otherwise undefined.
 */
export function avoidOverlap(
  parent: Element,
  labelGroups: LabelGroup[],
  options: Options = {}
): DebugInfo | undefined {
  const uid = nextUid++;
  const parentBounds = parent.getBoundingClientRect();

  const iterations = options.iterations ?? 10_000;
  const initTemp = options.temperature ?? 100;
  const coolingRate = options.coolingRate ?? 0.995;
  const scoreExp = options.scoreExponent ?? 2;
  const includeParent = options.includeParent ?? false;
  const parentMargin = resolveMargin(options.parentMargin ?? -2);

  // Create a random function: use provided seed or default to 42 for deterministic results
  const random = seedrandom(options.seed ?? 42);

  // ── Build spatial tree ───────────────────────────────────────────────────
  const tree: RBush<Body> = new RBush();
  if (includeParent) {
    addParent(tree, parent, parentBounds, parentMargin);
  }

  // ── Insert fixed label groups as obstacles ────────────────────────────────
  const staticBodies: Body[] = [];
  labelGroups.forEach((labelGroup) => {
    if (labelGroup.technique !== 'fixed') return;
    const margin = resolveMargin(labelGroup.margin);
    labelGroup.nodes.forEach((node) => {
      const b = getRelativeBounds(getNodeBounds(node), parentBounds);
      const body: Body = {
        minX: b.x - margin.left,
        minY: b.y - margin.top,
        maxX: b.x + b.width + margin.right,
        maxY: b.y + b.height + margin.bottom,
        isStatic: true,
        node,
        data: { technique: 'fixed', priority: Infinity, priorityWithinGroup: Infinity, remove: false },
      };
      staticBodies.push(body);
      tree.insert(body);
    });
  });

  // ── Build body list ───────────────────────────────────────────────────────
  const bodies: Body[] = [];
  labelGroups.forEach((labelGroup) => {
    if (labelGroup.technique === 'fixed') return;
    const margin = resolveMargin(labelGroup.margin);
    const priority = labelGroup.priority ?? 0;

    labelGroup.nodes.forEach((node, i) => {
      const b = getRelativeBounds(getNodeBounds(node), parentBounds);

      const baseData: BodyDataGeneric = {
        priority,
        priorityWithinGroup: labelGroup.nodes.length - i,
        remove: labelGroup.remove ?? true,
        onRemove: labelGroup.onRemove,
      };

      const data: BodyData =
        labelGroup.technique === 'nudge'
          ? extendBodyDataNudge(baseData, labelGroup)
          : extendBodyDataChoices(baseData, labelGroup);

      const body: Body = {
        minX: b.x - margin.left,
        minY: b.y - margin.top,
        maxX: b.x + b.width + margin.right,
        maxY: b.y + b.height + margin.bottom,
        isStatic: false,
        node,
        data,
      };
      bodies.push(body);
    });
  });

  if (!bodies.length) return undefined;

  // ── Save original transforms for debug toggling ──────────────────────────
  const debugOriginalTransforms = options.debug
    ? bodies.map((b) => b.node.getAttribute('transform') || '')
    : [];

  // ── Pre-compute choice positions (transiently modifies DOM) ───────────────
  const allChoicePositions: ChoicePosition[][] = bodies.map((body) =>
    precomputePositions(body, parentBounds)
  );

  // ── Per-choice score contributions ────────────────────────────────────────
  const defaultChoiceScore = (k: number): number => (k === 0 ? 0 : -0.5);
  const allChoiceScores: number[][] = bodies.map((body, bi) =>
    allChoicePositions[bi].map((_, k) => {
      if (body.data.technique === 'choices') {
        const cb = (body.data as BodyDataChoices).choiceBonuses;
        return cb !== undefined ? cb[k] ?? 0 : defaultChoiceScore(k);
      }
      // Nudge: scale the displacement penalty by bodyWeight so resistance to
      // nudging is proportional to priority.
      return k === 0 ? 0 : -0.5 * bodyWeight(body.data.priority, scoreExp);
    })
  );

  // ── Overlap penalty ────────────────────────────────────────────────────────
  const totalMaxScore = bodies.reduce((s, b, i) => {
    const maxChoiceBonus = allChoiceScores[i].length
      ? Math.max(0, ...allChoiceScores[i])
      : 0;
    return s + bodyWeight(b.data.priority, scoreExp) + maxChoiceBonus;
  }, 0);
  const overlapPenalty = totalMaxScore + 1;

  // ── SA state ───────────────────────────────────────────────────────────────
  // state[i]: -1 = hidden, 0..N-1 = index into allChoicePositions[i]
  // inTree[i]: the Body object currently inserted in the tree for body i,
  //            or null if body i is hidden.
  const inTree: (Body | null)[] = new Array(bodies.length).fill(null);

  // Initialise: every label visible at choice 0
  const state: number[] = bodies.map((body, i) => {
    const pos = allChoicePositions[i][0];
    const b: Body = { ...body, ...pos };
    tree.insert(b);
    inTree[i] = b;
    return 0;
  });

  // ── Incremental score tracking ────────────────────────────────────────────
  let visibleScore = bodies.reduce(
    (s, b, i) =>
      s + bodyWeight(b.data.priority, scoreExp) + allChoiceScores[i][0],
    0
  );
  // Count initial overlaps incrementally: insert bodies one by one and count
  // how many existing items each new body overlaps.  Multiplied by 2 to match
  // the convention used in the SA loop's incremental tracking.
  let overlapCount = 0;
  {
    const countTree: RBush<Body> = new RBush();
    if (includeParent) {
      addParent(countTree, parent, parentBounds, parentMargin);
    }
    for (let i = 0; i < bodies.length; i += 1) {
      if (inTree[i]) {
        overlapCount += 2 * countTree.search(inTree[i]!).length;
        countTree.insert(inTree[i]!);
      }
    }
  }
  let curScore = visibleScore - overlapCount * overlapPenalty;
  let bestState = [...state];
  let bestScore = curScore;

  // ── Simulated Annealing ───────────────────────────────────────────────────
  let temp = initTemp;

  for (let iter = 0; iter < iterations; iter += 1) {
    // Pick a random body to perturb
    const i = Math.floor(random() * bodies.length);
    const oldChoice = state[i];
    const nChoices = allChoicePositions[i].length; // ≥1 for choices, 1 for nudge
    const canRemove = bodies[i].data.remove;
    const nStates = canRemove ? nChoices + 1 : nChoices; // hidden state only if removable

    if (nStates >= 2) {
      // Pick a different state uniformly at random
      let newChoice: number;
      do {
        // When removable: range -1..nChoices-1 (includes hidden=-1)
        // When not removable: range 0..nChoices-1 (positions only)
        newChoice = canRemove
          ? Math.floor(random() * nStates) - 1
          : Math.floor(random() * nStates);
      } while (newChoice === oldChoice);

      // ── Compute delta score incrementally ─────────────────────────────────
      const w = bodyWeight(bodies[i].data.priority, scoreExp);
      const oldBodyScore =
        oldChoice >= 0 ? w + allChoiceScores[i][oldChoice] : 0;
      const newBodyScore =
        newChoice >= 0 ? w + allChoiceScores[i][newChoice] : 0;
      const deltaScore = newBodyScore - oldBodyScore;

      let oldOverlaps = 0;
      if (inTree[i]) {
        oldOverlaps = tree.search(inTree[i]!).length - 1;
        tree.remove(inTree[i]!, (a: Body, b: Body) => a.node === b.node);
      }

      let newBodyInTree: Body | null = null;
      let newOverlaps = 0;
      if (newChoice >= 0) {
        const pos = allChoicePositions[i][newChoice];
        newBodyInTree = { ...bodies[i], ...pos };
        newOverlaps = tree.search(newBodyInTree).length;
        tree.insert(newBodyInTree);
      }

      const newOverlapCount =
        overlapCount - 2 * oldOverlaps + 2 * newOverlaps;
      const newScore =
        visibleScore + deltaScore - newOverlapCount * overlapPenalty;
      const delta = newScore - curScore;

      if (delta > 0 || random() < Math.exp(delta / temp)) {
        // Accept the move
        inTree[i] = newBodyInTree;
        state[i] = newChoice;
        curScore = newScore;
        visibleScore += deltaScore;
        overlapCount = newOverlapCount;

        if (curScore > bestScore) {
          bestScore = curScore;
          bestState = [...state];
        }
      } else {
        // Reject — revert tree to previous state
        if (newBodyInTree) {
          tree.remove(newBodyInTree, (a: Body, b: Body) => a.node === b.node);
        }
        if (oldChoice >= 0) {
          const pos = allChoicePositions[i][oldChoice];
          const restored: Body = { ...bodies[i], ...pos };
          inTree[i] = restored;
          tree.insert(restored);
        }
      }

      temp *= coolingRate;
    }
  }

  // ── Post-SA nudge compression pass ────────────────────────────────────────
  // Build a spatial tree reflecting the SA best state, then for each nudge
  // body that was displaced scan from offset=0 upward to find the minimum
  // collision-free nudge, preserving SA's global decisions (show/hide,
  // direction) while minimising the actual displacement.
  const finalTree: RBush<Body> = new RBush();
  if (includeParent) addParent(finalTree, parent, parentBounds, parentMargin);
  for (const sb of staticBodies) finalTree.insert(sb);
  for (let i = 0; i < bodies.length; i++) {
    if (bestState[i] >= 0) {
      finalTree.insert({ ...bodies[i], ...allChoicePositions[i][bestState[i]] });
    }
  }

  const compressedDeltas = new Map<number, { dx: number; dy: number }>();

  const nudgeOrder = bodies
    .map((_, i) => i)
    .filter(i => bodies[i].data.technique === 'nudge' && bestState[i] > 0)
    .sort((a, b) => bodies[b].data.priority - bodies[a].data.priority);

  for (const i of nudgeOrder) {
    const origPos = allChoicePositions[i][0];
    const saPos   = allChoicePositions[i][bestState[i]];
    const rawDx   = saPos.minX - origPos.minX;
    const rawDy   = saPos.minY - origPos.minY;
    const maxOff  = Math.abs(rawDx !== 0 ? rawDx : rawDy);
    const signX   = Math.sign(rawDx);
    const signY   = Math.sign(rawDy);
    const w       = origPos.maxX - origPos.minX;
    const h       = origPos.maxY - origPos.minY;

    // Remove from finalTree so we don't self-collide during scan
    const saBody = { ...bodies[i], ...saPos };
    finalTree.remove(saBody, (a: Body, b: Body) => a.node === b.node);

    let minOff = maxOff;
    for (let off = 0; off <= maxOff; off++) {
      const tx = origPos.minX + signX * off;
      const ty = origPos.minY + signY * off;
      if (finalTree.search({ minX: tx, minY: ty, maxX: tx + w, maxY: ty + h }).length === 0) {
        minOff = off;
        break;
      }
    }

    const cx = origPos.minX + signX * minOff;
    const cy = origPos.minY + signY * minOff;
    compressedDeltas.set(i, { dx: cx - origPos.minX, dy: cy - origPos.minY });

    // Re-insert at compressed position so later bodies compress around it
    finalTree.insert({ ...bodies[i], minX: cx, minY: cy, maxX: cx + w, maxY: cy + h });
  }

  // ── Apply best state to DOM ───────────────────────────────────────────────
  const applyFinalState = () => {
    for (let i = 0; i < bodies.length; i += 1) {
      const choice = bestState[i];
      const body = bodies[i];

      if (choice < 0) {
        body.data.onRemove?.(body.node);
        if (options.debug) {
          // In debug mode, hide via display:none so we can toggle back
          (body.node as HTMLElement).style.display = 'none';
        } else {
          body.node.remove();
        }
      } else {
        if (options.debug) {
          (body.node as HTMLElement).style.display = '';
        }
        if (body.data.technique === 'choices') {
          const fn = (body.data as BodyDataChoices).choices[choice];
          if (fn) fn(body.node);
        } else if (body.data.technique === 'nudge') {
          // Restore original transform first, then apply the SA-determined offset
          if (options.debug) {
            body.node.setAttribute('transform', debugOriginalTransforms[i]);
          }
          const winPos = allChoicePositions[i][choice];
          const compressed = compressedDeltas.get(i);
          const diffX = compressed ? compressed.dx : winPos.minX - body.minX;
          const diffY = compressed ? compressed.dy : winPos.minY - body.minY;
          if (diffX !== 0 || diffY !== 0) {
            (body.data as BodyDataNudge).render(body.node, diffX, diffY);
          }
        }
      }
    }
  };

  applyFinalState();

  // ── Safety net: greedy collision removal ──────────────────────────────────
  // Skip nodes already removed from the DOM (e.g. by onRemove side effects).
  tree.clear();
  if (includeParent) {
    addParent(tree, parent, parentBounds, parentMargin);
  }
  for (const sb of staticBodies) {
    tree.insert(sb);
  }
  for (let i = 0; i < bodies.length; i += 1) {
    if (bestState[i] >= 0 && bodies[i].node.isConnected) {
      const pos = allChoicePositions[i][bestState[i]];
      const b: Body = { ...bodies[i], ...pos };
      tree.insert(b);
    }
  }
  removeCollisions(tree);

  // ── Debug ─────────────────────────────────────────────────────────────────
  if (options.debug) {
    const debugLabels: DebugLabel[] = bodies.map((body, i) => {
      const w = bodyWeight(body.data.priority, scoreExp);
      const ch = bestState[i];
      const cs = ch >= 0 ? allChoiceScores[i][ch] : 0;
      return {
        text: body.node.textContent || '',
        technique: body.data.technique,
        priority: body.data.priority,
        weight: w,
        bestChoice: ch,
        choiceScore: cs,
        totalContribution: ch >= 0 ? w + cs : 0,
        nChoices: allChoicePositions[i].length,
      };
    });

    const maxPossibleScore = bodies.reduce((s, b, i) => {
      const maxBonus = allChoiceScores[i].length
        ? Math.max(0, ...allChoiceScores[i])
        : 0;
      return s + bodyWeight(b.data.priority, scoreExp) + maxBonus;
    }, 0);

    const applyOriginal = () => {
      bodies.forEach((body, i) => {
        (body.node as HTMLElement).style.display = '';
        if (body.data.technique === 'choices') {
          // Restore by calling the first choice (natural position)
          const fn = (body.data as BodyDataChoices).choices[0];
          if (fn) fn(body.node);
        } else {
          // Nudge: restore the saved transform
          body.node.setAttribute('transform', debugOriginalTransforms[i]);
        }
      });
    };

    const debugInfo: DebugInfo = {
      uid,
      labels: debugLabels,
      bestScore,
      maxPossibleScore,
      applyOriginal,
      applyFinal: applyFinalState,
    };

    defaultDebugFunc(debugInfo);
    return debugInfo;
  }

  return undefined;
}
