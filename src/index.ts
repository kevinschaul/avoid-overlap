import RBush from 'rbush';
import uniqWith from 'lodash/uniqWith.js';
import { defaultDebugFunc } from './debug.js';

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

type Direction = 'up' | 'right' | 'down' | 'left';

interface CollisionCandidate {
  a: Body;
  b: Body;
}

type LabelGroupGeneric = {
  technique: 'nudge' | 'choices';
  nodes: Element[];
  margin: Margin;
  priority: number;
};

type LabelGroupNudge = LabelGroupGeneric & {
  technique: 'nudge';
  render: Function;
  nudgeStrategy: 'shortest' | 'ordered';
  nudgeDirections: Direction[];
};

type LabelGroupChoices = LabelGroupGeneric & {
  technique: 'choices';
  choices: Function[];
};

export type LabelGroup = LabelGroupNudge | LabelGroupChoices;

type BodyDataGeneric = {
  priority: number;
  priorityWithinGroup: number;
};

type BodyDataNudge = BodyDataGeneric & {
  technique: 'nudge';
  render: Function;
  nudgeStrategy: 'shortest' | 'ordered';
  nudgeDirections: Direction[];
};

type BodyDataChoices = BodyDataGeneric & {
  technique: 'choices';
  choices: Function[];
};

type BodyDataStatic = BodyDataGeneric & {
  technique: 'static';
};

export type BodyData = BodyDataNudge | BodyDataChoices | BodyDataStatic;

type Options = {
  includeParent?: boolean;
  parentMargin?: Margin;
  maxAttempts?: number;
  debug?: boolean;
  debugFunc?: Function;
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

const getRelativeBounds = (child: Bounds, parent: Bounds) => {
  return <Bounds>{
    x: child.x - parent.x,
    y: child.y - parent.y,
    width: child.width,
    height: child.height,
  };
};

const first = <T>(
  array: T[],
  callback: (item: T, index: number) => unknown
): any => {
  for (let i = 0, l = array.length; i < l; i++) {
    const value = callback(array[i], i);
    if (value) {
      return value;
    }
  }

  return null;
};

const all = <T>(
  array: T[],
  callback: (item: T, index: number) => unknown
): any => {
  let ret: any[] = [];
  for (let i = 0, l = array.length; i < l; i++) {
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
  };

  return first(bodies, checkCollision);
};

const getCollisions = (tree: RBush<Body>): CollisionCandidate[] => {
  const bodies = tree.all();
  const check = (body: Body) => {
    return checkOne(tree, body);
  };

  const collisions = all(bodies, check);
  const uniqueCollisions = uniqWith(
    collisions,
    (a: CollisionCandidate, b: CollisionCandidate) => {
      return a.a === b.a || a.a === b.b;
    }
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
  } else if (a.data.priority > b.data.priority) {
    return [b, a];
  } else if (b.data.priorityWithinGroup > a.data.priorityWithinGroup) {
    return [a, b];
  } else {
    return [b, a];
  }
};

const removeCollisions = (tree: RBush<Body>) => {
  let attempts = 0;
  let hasCollisions = true;
  while (hasCollisions && attempts <= 5) {
    attempts++;
    const collisions = getCollisions(tree);
    if (collisions.length) {
      const response = collisions[0];
      const [bodyToMove, _bodyToNotMove] = orderBodies(response.a, response.b);
      bodyToMove.node.remove();
      tree.remove(bodyToMove);
    } else {
      break;
    }
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
) => {
  return JSON.stringify(
    {
      parent: {
        bounds: parent.getBoundingClientRect(),
      },
      labelGroups: labelGroups.map((group) => {
        return {
          ...group,
          nodes: group.nodes.map((node) => {
            return {
              coords: node.getBoundingClientRect(),
              textContent: node.textContent,
            };
          }),
        };
      }),
      options: options,
    },
    null,
    2
  );
};

const extendBodyDataNudge = (
  bodyData: BodyDataGeneric,
  labelGroup: LabelGroupNudge
): BodyDataNudge => {
  return {
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
  };
};

const extendBodyDataChoices = (
  bodyData: BodyDataGeneric,
  labelGroup: LabelGroupChoices
): BodyDataChoices => {
  return {
    ...bodyData,
    technique: 'choices',
    choices: labelGroup.choices,
  };
};

// Global id counter, incremented for each instance of an avoid overlap class
let uid = 0;

export class AvoidOverlap {
  uid: number;

  constructor() {
    this.uid = uid++;
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
    labelGroups.map((labelGroup) => {
      const margin = labelGroup.margin || {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      };

      const priority = labelGroup.priority || 0;

      labelGroup.nodes.map((node, i) => {
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
        };

        let body: Body | undefined = undefined;
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
          for (const direction of bodyToMove.data.nudgeDirections) {
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

            // TODO only break if there is no longer a collision so that other nudgeDirections values are attempted?
            break;
          }
        }
      } else if (bodyToMove.data.technique === 'choices') {
        if (!bodyToMove.isStatic && bodyToMove.data.choices) {
          // Loop through the positioning choices, finding one that works
          for (const choice of bodyToMove.data.choices) {
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
            if (!stillCollides) {
              break;
            }
          }
        }
      }
    };

    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts++;
      const collisions = getCollisions(tree);
      if (collisions) {
        collisions.map(handleCollision);
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
}
