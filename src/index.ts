import RBush from 'rbush';
import uniqWith from 'lodash/uniqWith';
import defaultDebugFunc from './debug';

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

type Options = {
  includeParent?: boolean;
  parentMargin?: Margin;
  maxAttempts?: number;
  debug?: boolean;
  debugFunc?: (rbTree: RBush<Body>, pbounds: Bounds, id: number) => void;
};

export type ScoredOptions = Options & {
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

type NudgedPosition = {
  direction: Direction;
  x: number;
  y: number;
  distance: number;
};

export interface Point {
  x: number;
  y: number;
}

const getRelativeBounds = (child: Bounds, parent: Bounds) => <Bounds>{
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

const getDistance = (a: Point, b: Point) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
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

const updateTree = (tree: RBush<Body>, body: Body, x: number, y: number) => {
  const newBody = {
    ...body,
    minX: x,
    minY: y,
    maxX: x + (body.maxX - body.minX),
    maxY: y + (body.maxY - body.minY),
  };

  // Remove the old body, comparing the nodes so that other changes to the body properties will not appear as different bodies
  tree.remove(body, (a, b) => a.node === b.node);

  tree.insert(newBody);
  return newBody;
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

const getNudgedPosition = (
  direction: Direction,
  bodyToMove: Body,
  bodyToNotMove: Body
): NudgedPosition => {
  let x = bodyToMove.minX;
  let y = bodyToMove.minY;

  if (direction === 'down') {
    x = bodyToMove.minX;
    y = bodyToNotMove.maxY + 1;
  } else if (direction === 'right') {
    x = bodyToNotMove.maxX + 1;
    y = bodyToMove.minY;
  } else if (direction === 'up') {
    x = bodyToMove.minX;
    y = bodyToNotMove.minY - (bodyToMove.maxY - bodyToMove.minY) - 1;
  } else if (direction === 'left') {
    x = bodyToNotMove.minX - (bodyToMove.maxX - bodyToMove.minX) - 1;
    y = bodyToMove.minY;
  }

  return {
    direction,
    x,
    y,
    distance: getDistance({ x, y }, { x: bodyToMove.minX, y: bodyToMove.minY }),
  };
};

/* Return the two bodies in order according to their priority values
 */
const orderBodies = (a: Body, b: Body): [Body, Body] => {
  if (b.data.priority > a.data.priority) {
    return [a, b];
  } if (a.data.priority > b.data.priority) {
    return [b, a];
  } if (b.data.priorityWithinGroup > a.data.priorityWithinGroup) {
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

const serialize = (
  parent: Element,
  labelGroups: LabelGroup[],
  options: Options
) => JSON.stringify(
    {
      parent: {
        bounds: parent.getBoundingClientRect(),
      },
      labelGroups: labelGroups.map((group) => ({
          ...group,
          nodes: group.nodes.map((node) => ({
              coords: node.getBoundingClientRect(),
              textContent: node.textContent,
            })),
        })),
      options,
    },
    null,
    2
  );

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
      return [{ minX: body.minX, minY: body.minY, maxX: body.maxX, maxY: body.maxY }];
    }
    return choices.map((choice) => {
      choice(body.node);
      const r = getRelativeBounds(body.node.getBoundingClientRect(), parentBounds);
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
  return [{ minX: body.minX, minY: body.minY, maxX: body.maxX, maxY: body.maxY }];
};

// Global id counter, incremented for each instance of an avoid overlap class
let uid = 0;

export class AvoidOverlap {
  uid: number;

  constructor() {
    this.uid = uid;
    uid += 1;
  }

  run(parent: Element, labelGroups: LabelGroup[], options: Options) {
    if (options.debug) {
      console.log(serialize(parent, labelGroups, options));
      console.log(
        '^ copy the above message into this project’s Storybook for more debugging'
      );
    }

    const tree: RBush<Body> = new RBush();
    const parentBounds = parent.getBoundingClientRect();

    const maxAttempts = options.maxAttempts || 3;
    const includeParent = options.includeParent || false;
    const parentMargin = options.parentMargin || {
      top: -2,
      right: -2,
      bottom: -2,
      left: -2,
    };

    if (includeParent) {
      addParent(tree, parent, parentBounds, parentMargin);
    }

    // Add everything to the system
    labelGroups.forEach((labelGroup) => {
      const margin = labelGroup.margin || {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      };

      const priority = labelGroup.priority || 0;

      labelGroup.nodes.forEach((node, i) => {
        const bounds = getRelativeBounds(
          node.getBoundingClientRect(),
          parentBounds
        );

        const minX = bounds.x - margin.left;
        const minY = bounds.y - margin.top;
        const maxX = bounds.x + bounds.width + margin.left + margin.right;
        const maxY = bounds.y + bounds.height + margin.top + margin.bottom;

        const initialBody = {
          minX,
          minY,
          maxX,
          maxY,
          positionHistory: [],
          isStatic: false,
          node,
        };

        const initialBodyData = {
          priority,
          priorityWithinGroup: labelGroup.nodes.length - i,
          onRemove: labelGroup.onRemove,
        };

        let body: Body | undefined;
        if (labelGroup.technique === 'nudge') {
          const bodyData = extendBodyDataNudge(initialBodyData, labelGroup);
          body = {
            ...initialBody,
            data: bodyData,
          };
        } else if (labelGroup.technique === 'choices') {
          const bodyData = extendBodyDataChoices(initialBodyData, labelGroup);
          body = { ...initialBody, data: bodyData };
        }

        if (typeof body !== 'undefined') {
          tree.insert(body!);
          savePositionHistory(body!, 'initial');
        }
      });
    });

    const handleCollision = (response: CollisionCandidate) => {
      const [bodyToMove, bodyToNotMove] = orderBodies(response.a, response.b);

      if (bodyToMove.data.technique === 'nudge') {
        if (bodyToMove.data.nudgeStrategy === 'shortest') {
          const closestPosition = bodyToMove.data.nudgeDirections
            .map((direction: Direction) =>
              getNudgedPosition(direction, bodyToMove, bodyToNotMove)
            )
            .sort(
              (a: NudgedPosition, b: NudgedPosition) => a.distance - b.distance
            )[0];

          const newX = closestPosition.x;
          const newY = closestPosition.y;
          const diffX = newX - bodyToMove.minX;
          const diffY = newY - bodyToMove.minY;

          if (bodyToMove.data.render) {
            bodyToMove.data.render(bodyToMove.node, diffX, diffY);
            const newBody = updateTree(tree, bodyToMove, newX, newY);
            savePositionHistory(newBody, 'nudge-shortest');
          }
        } else if (
          bodyToMove.data.nudgeStrategy === 'ordered' &&
          bodyToMove.data.nudgeDirections
        ) {
          // TODO only use first direction for now; extend to try others if collision remains
          const [direction] = bodyToMove.data.nudgeDirections;
          if (direction) {
            const position = getNudgedPosition(
              direction,
              bodyToMove,
              bodyToNotMove
            );
            const newX = position.x;
            const newY = position.y;
            const diffX = newX - bodyToMove.minX;
            const diffY = newY - bodyToMove.minY;

            if (bodyToMove.data.render) {
              bodyToMove.data.render(bodyToMove.node, diffX, diffY);
              const newBody = updateTree(tree, bodyToMove, newX, newY);
              savePositionHistory(newBody, `nudge-ordered, ${direction}`);
            }
          }
        }
      } else if (bodyToMove.data.technique === 'choices') {
        if (!bodyToMove.isStatic && bodyToMove.data.choices) {
          // Loop through the positioning choices, finding one that works
          bodyToMove.data.choices.some((choice) => {
            choice(bodyToMove.node);

            // Update the position of the body in the system
            const bounds = getRelativeBounds(
              bodyToMove.node.getBoundingClientRect(),
              parentBounds
            );

            const newBody = updateTree(tree, bodyToMove, bounds.x, bounds.y);
            savePositionHistory(newBody, `choice, ${choice}`);

            // Check if this position collides with anything else in the system
            const collisions = checkOne(tree, newBody);
            const stillCollides = !!collisions;
            return !stillCollides; // stop iterating when no longer colliding
          });
        }
      }
    };

    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts += 1;
      const collisions = getCollisions(tree);
      if (collisions) {
        collisions.forEach(handleCollision);
      } else {
        break;
      }
    }

    removeCollisions(tree);

    if (options.debug) {
      if (options.debugFunc) {
        options.debugFunc(tree, parentBounds, this.uid);
      } else {
        defaultDebugFunc(tree, parentBounds, this.uid);
      }
    }
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
   * are either shown at their initial position or hidden; nudge-style movement
   * is not performed here because the SA explores discrete states.
   *
   * After SA terminates the best-found configuration is applied to the DOM.
   * A greedy removal pass is run as a safety net in case any overlaps remain
   * (e.g. if SA did not fully converge).
   */
  runScored(parent: Element, labelGroups: LabelGroup[], options: ScoredOptions = {}) {
    const parentBounds = parent.getBoundingClientRect();

    const iterations  = options.iterations   ?? 10_000;
    const initTemp    = options.temperature  ?? 100;
    const coolingRate = options.coolingRate  ?? 0.995;
    const scoreExp    = options.scoreExponent ?? 2;
    const includeParent = options.includeParent ?? false;
    const parentMargin  = options.parentMargin  ?? {
      top: -2, right: -2, bottom: -2, left: -2,
    };

    if (options.debug) {
      console.log(serialize(parent, labelGroups, options));
      console.log(
        "^ copy the above message into this project's Storybook for more debugging"
      );
    }

    // ── Build spatial tree ───────────────────────────────────────────────────
    const tree: RBush<Body> = new RBush();
    if (includeParent) {
      addParent(tree, parent, parentBounds, parentMargin);
    }

    // ── Build body list ───────────────────────────────────────────────────────
    const bodies: Body[] = [];
    labelGroups.forEach((labelGroup) => {
      const margin   = labelGroup.margin   ?? { top: 0, right: 0, bottom: 0, left: 0 };
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

    // ── Pre-compute choice positions (transiently modifies DOM) ───────────────
    // For each body we get an array of bounding boxes – one per choice (or just
    // the initial box for nudge bodies).  After this loop each node is left in
    // the state of its last choice, but we correct that when we apply the
    // winning configuration at the end.
    const nudgeOffsets = options.nudgeOffsets ?? DEFAULT_NUDGE_OFFSETS;
    const allChoicePositions: ChoicePosition[][] = bodies.map((body) =>
      precomputePositions(body, parentBounds, nudgeOffsets)
    );

    // ── Per-choice score contributions ────────────────────────────────────────
    // Each choice k for body i contributes allChoiceScores[i][k] to the total
    // score in addition to the base bodyWeight.
    //
    // For 'choices' bodies the caller may supply choicePriorities — positive
    // values make a choice more attractive, negative values less so.  Values
    // live on the same scale as bodyWeight so they can outweigh showing a
    // lower-priority label (e.g. a bonus of 4 for choice 0 means SA will keep
    // an annotation in its preferred direction rather than move it to free space
    // for a label whose bodyWeight is only 4).
    //
    // When choicePriorities is absent (or for 'nudge' bodies) a small
    // displacement penalty of -0.5 is applied to all non-zero choices so that
    // SA drifts back to the natural position whenever the layout allows it.
    const defaultChoiceScore = (k: number): number => (k === 0 ? 0 : -0.5);
    const allChoiceScores: number[][] = bodies.map((body, bi) =>
      allChoicePositions[bi].map((_, k) => {
        if (body.data.technique === 'choices') {
          const cp = (body.data as BodyDataChoices).choicePriorities;
          return cp !== undefined ? (cp[k] ?? 0) : defaultChoiceScore(k);
        }
        return defaultChoiceScore(k);
      })
    );

    // ── Overlap penalty ────────────────────────────────────────────────────────
    // Must exceed the maximum achievable score (body weights + choice bonuses)
    // so that any state with at least one overlap always scores lower than any
    // overlap-free state, regardless of how large choicePriorities values are.
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
    // Two accumulators updated in O(log n) per SA step:
    //
    //   visibleScore — sum of (bodyWeight + choiceScore) for all visible bodies.
    //                  Encodes both label-visibility value and position preference
    //                  (including choicePriorities / displacement penalty).
    //   overlapCount — symmetric overlap count consistent with the incremental
    //                  update formula below (see note on getCollisions drift).
    //
    // curScore = visibleScore - overlapCount * overlapPenalty
    //
    // Overlap count initialisation: getCollisions() uses non-standard
    // deduplication incompatible with tree.search(), so we build overlapCount
    // by sequentially inserting bodies into a scratch tree: inserting body i
    // contributes 2 × (count of bodies already present that overlap i).
    // The ×2 matches the incremental formula and handles body–parent pairs.
    let visibleScore = bodies.reduce(
      (s, b, i) => s + bodyWeight(b.data.priority, scoreExp) + allChoiceScores[i][0],
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
    let curScore  = visibleScore - overlapCount * overlapPenalty;
    let bestState = [...state];
    let bestScore = curScore;

    // ── Simulated Annealing ───────────────────────────────────────────────────
    let temp = initTemp;

    for (let iter = 0; iter < iterations; iter += 1) {
      // Pick a random body to perturb
      const i         = Math.floor(Math.random() * bodies.length);
      const oldChoice = state[i];
      const nChoices  = allChoicePositions[i].length; // ≥1 for choices, 1 for nudge
      const nStates   = nChoices + 1;                  // +1 for the "hidden" state

      if (nStates >= 2) {
        // Pick a different state uniformly at random
        let newChoice: number;
        do {
          newChoice = Math.floor(Math.random() * nStates) - 1; // range: -1 .. nChoices-1
        } while (newChoice === oldChoice);

        // ── Compute delta score incrementally ─────────────────────────────────
        const w            = bodyWeight(bodies[i].data.priority, scoreExp);
        const oldBodyScore = oldChoice >= 0 ? w + allChoiceScores[i][oldChoice] : 0;
        const newBodyScore = newChoice >= 0 ? w + allChoiceScores[i][newChoice] : 0;
        const deltaScore   = newBodyScore - oldBodyScore;

        // Count overlaps the OLD position contributes (body i is still in tree;
        // search returns self too, so subtract 1).
        let oldOverlaps = 0;
        if (inTree[i]) {
          oldOverlaps = tree.search(inTree[i]!).length - 1;
          tree.remove(inTree[i]!, (a: Body, b: Body) => a.node === b.node);
        }

        // Insert new position and count its overlaps (body i is not in tree yet).
        let newBodyInTree: Body | null = null;
        let newOverlaps = 0;
        if (newChoice >= 0) {
          const pos = allChoicePositions[i][newChoice];
          newBodyInTree = { ...bodies[i], ...pos };
          newOverlaps   = tree.search(newBodyInTree).length;
          tree.insert(newBodyInTree);
        }

        // getCollisions double-counts each pair (once from each side), so scale
        // the per-body overlap counts by 2 to stay consistent.
        const newOverlapCount = overlapCount - 2 * oldOverlaps + 2 * newOverlaps;
        const newScore        = (visibleScore + deltaScore) - newOverlapCount * overlapPenalty;
        const delta           = newScore - curScore;

        if (delta > 0 || Math.random() < Math.exp(delta / temp)) {
          // Accept the move
          inTree[i]    = newBodyInTree;
          state[i]     = newChoice;
          curScore     = newScore;
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
            const pos      = allChoicePositions[i][oldChoice];
            const restored: Body = { ...bodies[i], ...pos };
            inTree[i]      = restored;
            tree.insert(restored);
          }
        }

        temp *= coolingRate;
      }
    }

    // ── Apply best state to DOM ───────────────────────────────────────────────
    for (let i = 0; i < bodies.length; i += 1) {
      const choice = bestState[i];
      const body   = bodies[i];

      if (choice < 0) {
        // Label was hidden by SA — remove it
        body.data.onRemove?.(body.node);
        body.node.remove();
      } else if (body.data.technique === 'choices') {
        // Re-apply the winning choice (DOM was left in an arbitrary state after
        // pre-computation).  Fixed obstacles have choices:[] so there is no
        // function to call — their position never changes.
        const fn = (body.data as BodyDataChoices).choices[choice];
        if (fn) fn(body.node);
      } else if (body.data.technique === 'nudge') {
        // Translate by the offset encoded in the winning synthetic position
        const winPos = allChoicePositions[i][choice];
        const diffX  = winPos.minX - body.minX;
        const diffY  = winPos.minY - body.minY;
        if (diffX !== 0 || diffY !== 0) {
          (body.data as BodyDataNudge).render(body.node, diffX, diffY);
        }
      }
    }

    // ── Safety net: greedy collision removal ──────────────────────────────────
    // Rebuild tree with the winning positions and remove any residual overlaps
    // (can occur when SA has not fully converged).
    tree.clear();
    if (includeParent) {
      addParent(tree, parent, parentBounds, parentMargin);
    }
    for (let i = 0; i < bodies.length; i += 1) {
      if (bestState[i] >= 0) {
        const pos = allChoicePositions[i][bestState[i]];
        const b: Body = { ...bodies[i], ...pos };
        savePositionHistory(b, `scored-best-choice-${bestState[i]}`);
        tree.insert(b);
      }
    }
    removeCollisions(tree);

    // ── Debug ─────────────────────────────────────────────────────────────────
    if (options.debug) {
      if (options.debugFunc) {
        options.debugFunc(tree, parentBounds, this.uid);
      } else {
        defaultDebugFunc(tree, parentBounds, this.uid);
      }
    }
  }
}
