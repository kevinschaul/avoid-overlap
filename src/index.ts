import RBush from 'rbush';
import uniqWith from 'lodash/uniqWith';
import defaultDebugFunc from './debug';
import type { DebugLabel, DebugInfo } from './debug';

export type { DebugLabel, DebugInfo };

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface PositionHistoryEntry {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  message: string;
}

type Direction = 'up' | 'right' | 'down' | 'left';

type BodyDataGeneric = {
  priority: number;
  priorityWithinGroup: number;
  onRemove?: (el: Element) => void;
};

type BodyDataNudge = BodyDataGeneric & {
  technique: 'nudge';
  render: (el: Element, deltaX: number, deltaY: number) => void;
  nudgeStrategy: 'shortest' | 'ordered';
  nudgeDirections: Direction[];
};

type BodyDataChoices = BodyDataGeneric & {
  technique: 'choices';
  choices: ((el: Element) => void)[];
  choicePriorities?: number[];
};

type BodyDataStatic = BodyDataGeneric & {
  technique: 'static';
};

export type BodyData = BodyDataNudge | BodyDataChoices | BodyDataStatic;

export interface Body {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  positionHistory: PositionHistoryEntry[];
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
  margin: Margin;
  priority: number;
  onRemove?: (el: Element) => void;
};

type LabelGroupNudge = LabelGroupGeneric & {
  technique: 'nudge';
  render: (el: Element, deltaX: number, deltaY: number) => void;
  nudgeStrategy: 'shortest' | 'ordered';
  nudgeDirections: Direction[];
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
   *   choicePriorities: [4, 1, 1, -2, -2, -2, -2, -2]
   *
   * When omitted, a small displacement penalty (-0.5) is applied to all
   * non-zero choices so that SA returns to the natural position whenever
   * the layout allows it.
   */
  choicePriorities?: number[];
};

export type LabelGroup = LabelGroupNudge | LabelGroupChoices;

export type Options = {
  includeParent?: boolean;
  parentMargin?: Margin;
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
   * Pixel offsets used to generate synthetic nudge positions for labels that
   * use the `nudge` technique.  For each allowed nudge direction the label is
   * speculatively placed at every listed offset, giving the SA a real set of
   * positions to choose from instead of just show/hide.
   * Default: [2, 4, 8, 16, 32, 64]
   */
  nudgeOffsets?: number[];
};

export interface Point {
  x: number;
  y: number;
}

const getRelativeBounds = (child: Bounds, parent: Bounds) =>
  <Bounds>{
    x: child.x - parent.x,
    y: child.y - parent.y,
    width: child.width,
    height: child.height,
  };

const first = <T>(
  array: T[],
  callback: (_item: T, _index: number) => unknown
): any => {
  for (let i = 0, l = array.length; i < l; i += 1) {
    const value = callback(array[i], i);
    if (value) {
      return value;
    }
  }

  return null;
};

const all = <T>(
  array: T[],
  callback: (_item: T, _index: number) => unknown
): any => {
  const ret: any[] = [];
  for (let i = 0, l = array.length; i < l; i += 1) {
    const value = callback(array[i], i);
    if (value) {
      ret.push(value);
    }
  }

  return ret;
};

const checkOne = (tree: RBush<Body>, body: Body) => {
  if (body.isStatic) {
    return false;
  }

  const bodies = tree.search(body);

  const checkCollision = (candidate: Body): CollisionCandidate | undefined => {
    if (candidate !== body) {
      return {
        a: body,
        b: candidate,
      };
    }
    return undefined;
  };

  return first(bodies, checkCollision);
};

const getCollisions = (tree: RBush<Body>): CollisionCandidate[] => {
  const bodies = tree.all();
  const check = (body: Body) => checkOne(tree, body);

  const collisions = all(bodies, check);
  const uniqueCollisions = uniqWith(
    collisions,
    (a: CollisionCandidate, b: CollisionCandidate) => a.a === b.a || a.a === b.b
  );
  return uniqueCollisions;
};

const savePositionHistory = (body: Body, message: string) => {
  body.positionHistory.push({
    minX: body.minX,
    minY: body.minY,
    maxX: body.maxX,
    maxY: body.maxY,
    message,
  });
};

/* Return the two bodies in order according to their priority values
 */
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
    const collisions = getCollisions(tree);
    if (!collisions.length) {
      break;
    }
    const [bodyToMove] = orderBodies(collisions[0].a, collisions[0].b);
    bodyToMove.data.onRemove?.(bodyToMove.node);
    bodyToMove.node.remove();
    tree.remove(bodyToMove);
  }
};

const addParent = (
  tree: RBush<Body>,
  parent: Element,
  parentBounds: Bounds,
  parentMargin: Margin
) => {
  const parentThickness = 200;

  const top = <Body>{
    minX: -parentThickness,
    minY: -parentThickness,
    maxX: parentBounds.width + parentThickness,
    maxY: parentMargin.top,
    positionHistory: [],
    isStatic: true,
    node: parent,
    data: {
      technique: 'static',
      priority: Infinity,
      priorityWithinGroup: Infinity,
    },
  };

  const bottom = <Body>{
    minX: -parentThickness,
    minY: parentBounds.height - parentMargin.bottom,
    maxX: parentBounds.width + parentThickness,
    maxY: parentBounds.height + parentThickness,
    positionHistory: [],
    isStatic: true,
    node: parent,
    data: {
      technique: 'static',
      priority: Infinity,
      priorityWithinGroup: Infinity,
    },
  };

  const right = <Body>{
    minX: parentBounds.width - parentMargin.right,
    minY: -parentThickness,
    maxX: parentBounds.width + parentThickness,
    maxY: parentBounds.height + parentThickness,
    positionHistory: [],
    isStatic: true,
    node: parent,
    data: {
      technique: 'static',
      priority: Infinity,
      priorityWithinGroup: Infinity,
    },
  };

  const left = <Body>{
    minX: -parentThickness,
    minY: -parentThickness,
    maxX: parentMargin.left,
    maxY: parentBounds.height + parentThickness,
    positionHistory: [],
    isStatic: true,
    node: parent,
    data: {
      technique: 'static',
      priority: Infinity,
      priorityWithinGroup: Infinity,
    },
  };

  tree.insert(top);
  tree.insert(bottom);
  tree.insert(left);
  tree.insert(right);
  savePositionHistory(top, 'initial');
  savePositionHistory(bottom, 'initial');
  savePositionHistory(left, 'initial');
  savePositionHistory(right, 'initial');
};

const extendBodyDataNudge = (
  bodyData: BodyDataGeneric,
  labelGroup: LabelGroupNudge
): BodyDataNudge => ({
  ...bodyData,
  technique: 'nudge',
  nudgeStrategy: labelGroup.nudgeStrategy || 'shortest',
  nudgeDirections: labelGroup.nudgeDirections || [
    <Direction>'down',
    <Direction>'right',
    <Direction>'up',
    <Direction>'left',
  ],
  render: labelGroup.render,
});

const extendBodyDataChoices = (
  bodyData: BodyDataGeneric,
  labelGroup: LabelGroupChoices
): BodyDataChoices => ({
  ...bodyData,
  technique: 'choices',
  choices: labelGroup.choices,
  choicePriorities: labelGroup.choicePriorities,
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
 *   bounding box in each allowed nudge direction at every listed offset —
 *   no DOM calls required.
 *
 * The width/height of the body (which includes the margin) is preserved across
 * all positions so they are directly usable in the spatial tree.
 */
const DEFAULT_NUDGE_OFFSETS = [2, 4, 8, 16, 32, 64];

const precomputePositions = (
  body: Body,
  parentBounds: Bounds,
  nudgeOffsets: number[] = DEFAULT_NUDGE_OFFSETS
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
        body.node.getBoundingClientRect(),
        parentBounds
      );
      return { minX: r.x, minY: r.y, maxX: r.x + w, maxY: r.y + h };
    });
  }

  if (body.data.technique === 'nudge') {
    // Start with the initial (un-nudged) position, then add a candidate for
    // each direction × offset combination.  Pure arithmetic — no DOM calls.
    const positions: ChoicePosition[] = [
      { minX: body.minX, minY: body.minY, maxX: body.maxX, maxY: body.maxY },
    ];
    const dirs = (body.data as BodyDataNudge).nudgeDirections;
    dirs.forEach((dir) => {
      nudgeOffsets.forEach((offset) => {
        let dx = 0;
        if (dir === 'right') dx = offset;
        else if (dir === 'left') dx = -offset;
        let dy = 0;
        if (dir === 'down') dy = offset;
        else if (dir === 'up') dy = -offset;
        positions.push({
          minX: body.minX + dx,
          minY: body.minY + dy,
          maxX: body.maxX + dx,
          maxY: body.maxY + dy,
        });
      });
    });
    return positions;
  }

  // static: only the original position
  return [
    { minX: body.minX, minY: body.minY, maxX: body.maxX, maxY: body.maxY },
  ];
};

// Global id counter, incremented for each instance of an avoid overlap class
let uid = 0;

export class AvoidOverlap {
  uid: number;

  constructor() {
    this.uid = uid;
    uid += 1;
  }

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
   * `nudgeOffsets`), or hidden.
   *
   * After SA terminates the best-found configuration is applied to the DOM.
   * A greedy removal pass is run as a safety net in case any overlaps remain
   * (e.g. if SA did not fully converge).
   */
  run(parent: Element, labelGroups: LabelGroup[], options: Options = {}) {
    const parentBounds = parent.getBoundingClientRect();

    const iterations = options.iterations ?? 10_000;
    const initTemp = options.temperature ?? 100;
    const coolingRate = options.coolingRate ?? 0.995;
    const scoreExp = options.scoreExponent ?? 2;
    const includeParent = options.includeParent ?? false;
    const parentMargin = options.parentMargin ?? {
      top: -2,
      right: -2,
      bottom: -2,
      left: -2,
    };

    // ── Build spatial tree ───────────────────────────────────────────────────
    const tree: RBush<Body> = new RBush();
    if (includeParent) {
      addParent(tree, parent, parentBounds, parentMargin);
    }

    // ── Build body list ───────────────────────────────────────────────────────
    const bodies: Body[] = [];
    labelGroups.forEach((labelGroup) => {
      const margin = labelGroup.margin ?? {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      };
      const priority = labelGroup.priority ?? 0;

      labelGroup.nodes.forEach((node, i) => {
        const b = getRelativeBounds(node.getBoundingClientRect(), parentBounds);

        const baseData: BodyDataGeneric = {
          priority,
          priorityWithinGroup: labelGroup.nodes.length - i,
          onRemove: labelGroup.onRemove,
        };

        const data: BodyData =
          labelGroup.technique === 'nudge'
            ? extendBodyDataNudge(baseData, labelGroup)
            : extendBodyDataChoices(baseData, labelGroup);

        const body: Body = {
          minX: b.x - margin.left,
          minY: b.y - margin.top,
          maxX: b.x + b.width + margin.left + margin.right,
          maxY: b.y + b.height + margin.top + margin.bottom,
          positionHistory: [],
          isStatic: false,
          node,
          data,
        };
        savePositionHistory(body, 'initial');
        bodies.push(body);
      });
    });

    if (!bodies.length) return;

    // ── Save original transforms for debug toggling ──────────────────────────
    const debugOriginalTransforms = options.debug
      ? bodies.map((b) => b.node.getAttribute('transform') || '')
      : [];

    // ── Pre-compute choice positions (transiently modifies DOM) ───────────────
    const nudgeOffsets = options.nudgeOffsets ?? DEFAULT_NUDGE_OFFSETS;
    const allChoicePositions: ChoicePosition[][] = bodies.map((body) =>
      precomputePositions(body, parentBounds, nudgeOffsets)
    );

    // ── Per-choice score contributions ────────────────────────────────────────
    const defaultChoiceScore = (k: number): number => (k === 0 ? 0 : -0.5);
    const allChoiceScores: number[][] = bodies.map((body, bi) =>
      allChoicePositions[bi].map((_, k) => {
        if (body.data.technique === 'choices') {
          const cp = (body.data as BodyDataChoices).choicePriorities;
          return cp !== undefined ? cp[k] ?? 0 : defaultChoiceScore(k);
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
    let overlapCount = 0;
    {
      const initTree: RBush<Body> = new RBush();
      if (includeParent) {
        addParent(initTree, parent, parentBounds, parentMargin);
      }
      for (let i = 0; i < bodies.length; i += 1) {
        if (inTree[i]) {
          overlapCount += 2 * initTree.search(inTree[i]!).length;
          initTree.insert(inTree[i]!);
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
      const i = Math.floor(Math.random() * bodies.length);
      const oldChoice = state[i];
      const nChoices = allChoicePositions[i].length; // ≥1 for choices, 1 for nudge
      const nStates = nChoices + 1; // +1 for the "hidden" state

      if (nStates >= 2) {
        // Pick a different state uniformly at random
        let newChoice: number;
        do {
          newChoice = Math.floor(Math.random() * nStates) - 1; // range: -1 .. nChoices-1
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

        if (delta > 0 || Math.random() < Math.exp(delta / temp)) {
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

    // ── Apply best state to DOM ───────────────────────────────────────────────
    const applyFinalState = () => {
      for (let i = 0; i < bodies.length; i += 1) {
        const choice = bestState[i];
        const body = bodies[i];

        if (choice < 0) {
          if (options.debug) {
            // In debug mode, hide via display:none so we can toggle back
            (body.node as HTMLElement).style.display = 'none';
          } else {
            body.data.onRemove?.(body.node);
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
            const diffX = winPos.minX - body.minX;
            const diffY = winPos.minY - body.minY;
            if (diffX !== 0 || diffY !== 0) {
              (body.data as BodyDataNudge).render(body.node, diffX, diffY);
            }
          }
        }
      }
    };

    applyFinalState();

    // ── Safety net: greedy collision removal ──────────────────────────────────
    tree.clear();
    if (includeParent) {
      addParent(tree, parent, parentBounds, parentMargin);
    }
    for (let i = 0; i < bodies.length; i += 1) {
      if (bestState[i] >= 0) {
        const pos = allChoicePositions[i][bestState[i]];
        const b: Body = { ...bodies[i], ...pos };
        savePositionHistory(b, `best-choice-${bestState[i]}`);
        tree.insert(b);
      }
    }
    if (!options.debug) {
      removeCollisions(tree);
    }

    // ── Debug ─────────────────────────────────────────────────────────────────
    if (options.debug) {
      // Build per-label score breakdown
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
          // eslint-disable-next-line no-param-reassign
          (body.node as HTMLElement).style.display = '';
          if (body.data.technique === 'choices') {
            // Restore by calling the first choice (natural position)
            const fn = (body.data as BodyDataChoices).choices[0];
            if (fn) fn(body.node);
          } else {
            // Nudge / static: restore the saved transform
            body.node.setAttribute('transform', debugOriginalTransforms[i]);
          }
        });
      };

      const debugInfo: DebugInfo = {
        uid: this.uid,
        labels: debugLabels,
        bestScore,
        maxPossibleScore,
        applyOriginal,
        applyFinal: applyFinalState,
      };

      defaultDebugFunc(debugInfo);
    }
  }
}
