import RBush from 'rbush';
import { uniqWith } from 'lodash';

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Body {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  isStatic: boolean;
  node: Element;
  data: {
    render?: Function;
    priority: number;
    priorityWithinGroup: number;
    nudgeStrategy?: 'ordered' | 'shortest';
    nudgeDirections?: Direction[];
    choices?: Function[];
  };
}

type Direction = 'up' | 'right' | 'down' | 'left';

interface CollisionCandidate {
  a: Body;
  b: Body;
}

interface LabelGroupNudge {
  nodes: Element[];
  render: Function;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  priority?: number;
  nudgeStrategy?: 'shortest' | 'ordered';
  nudgeDirections?: Direction[];
  maxDistance?: number;
}

interface LabelGroupChoices {
  nodes: Element[];
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  priority?: number;
  choices: Function[];
}

interface OptionsNudge {
  includeParent?: boolean;
  parentMargin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  maxAttempts?: number;
}

interface Point {
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
  let ret : any[] = [];
  for (let i = 0, l = array.length; i < l; i++) {
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

const getDistance = (a: Point, b: Point) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getNudgedPosition = (
  direction: Direction,
  bodyToMove: Body,
  bodyToNotMove: Body
) => {
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

/* Avoid label collisions by nudging colliding labels
 *
 */
export const avoidOverlapNudge = (
  parent: Element,
  labelGroups: LabelGroupNudge[],
  options: OptionsNudge
) => {
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
    const parentThickness = 200;

    // Top
    tree.insert({
      minX: -parentThickness,
      minY: -parentThickness,
      maxX: parentBounds.width + parentThickness,
      maxY: parentMargin.top,
      isStatic: true,
      node: parent,
      data: {
        priority: Infinity,
        priorityWithinGroup: Infinity,
      },
    });

    // Bottom
    tree.insert({
      minX: -parentThickness,
      minY: parentBounds.height - parentMargin.bottom,
      maxX: parentBounds.width + parentThickness,
      maxY: parentBounds.height + parentThickness,
      isStatic: true,
      node: parent,
      data: {
        priority: Infinity,
        priorityWithinGroup: Infinity,
      },
    });

    // Right
    tree.insert({
      minX: parentBounds.width - parentMargin.left,
      minY: -parentThickness,
      maxX: parentBounds.width + parentThickness,
      maxY: parentBounds.height + parentThickness,
      isStatic: true,
      node: parent,
      data: {
        priority: Infinity,
        priorityWithinGroup: Infinity,
      },
    });

    // Left
    tree.insert({
      minX: -parentThickness,
      minY: -parentThickness,
      maxX: parentMargin.left,
      maxY: parentBounds.height + parentThickness,
      isStatic: true,
      node: parent,
      data: {
        priority: Infinity,
        priorityWithinGroup: Infinity,
      },
    });
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
    const nudgeStrategy = labelGroup.nudgeStrategy || 'shortest';
    const nudgeDirections = labelGroup.nudgeDirections || [
      <Direction>'down',
      <Direction>'right',
      <Direction>'up',
      <Direction>'left',
    ];
    const maxDistance = labelGroup.maxDistance || Infinity;
    const render = labelGroup.render;

    labelGroup.nodes.map((node, i) => {
      const bounds = getRelativeBounds(
        node.getBoundingClientRect(),
        parentBounds
      );

      const body = {
        minX: bounds.x - margin.left,
        minY: bounds.y - margin.top,
        maxX: bounds.x + bounds.width + margin.left + margin.right,
        maxY: bounds.y + bounds.height + margin.top + margin.bottom,

        isStatic: false,
        node,
        data: {
          priority,
          priorityWithinGroup: labelGroup.nodes.length - i,
          nudgeStrategy,
          nudgeDirections,
          maxDistance,
          render,
        },
      };
      tree.insert(body);
    });
  });

  const handleCollision = (response: CollisionCandidate) => {
    const [bodyToMove, bodyToNotMove] = orderBodies(response.a, response.b);

    if (bodyToMove.data.nudgeStrategy === 'shortest') {
      const closestPosition = [<Direction>'down', <Direction>'right']
        .map((direction) =>
          getNudgedPosition(direction, bodyToMove, bodyToNotMove)
        )
        .sort((a, b) => a.distance - b.distance)[0];

      const newX = closestPosition.x;
      const newY = closestPosition.y;
      const diffX = newX - bodyToMove.minX;
      const diffY = newY - bodyToMove.minY;

      if (bodyToMove.data.render) {
        bodyToMove.data.render(bodyToMove.node, diffX, diffY);
        updateTree(tree, bodyToMove, newX, newY);
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
          bodyToMove.data.render(bodyToMove.node, newX, newY, diffX, diffY);
          updateTree(tree, bodyToMove, newX, newY);
        }

        // TODO only break if there is no longer a collision so that other nudgeDirection values are attempted?
        break;
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
};

/* Avoid label collisions by trying different label position choices
 */
export const avoidOverlapChoices = (
  parent: Element,
  labelGroups: LabelGroupChoices[],
  options: OptionsNudge
) => {
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
    const parentThickness = 200;

    // Top
    tree.insert({
      minX: -parentThickness,
      minY: -parentThickness,
      maxX: parentBounds.width + parentThickness,
      maxY: parentMargin.top,
      isStatic: true,
      node: parent,
      data: {
        priority: Infinity,
        priorityWithinGroup: Infinity,
      },
    });

    // Bottom
    tree.insert({
      minX: -parentThickness,
      minY: parentBounds.height - parentMargin.bottom,
      maxX: parentBounds.width + parentThickness,
      maxY: parentBounds.height + parentThickness,
      isStatic: true,
      node: parent,
      data: {
        priority: Infinity,
        priorityWithinGroup: Infinity,
      },
    });

    // Right
    tree.insert({
      minX: parentBounds.width - parentMargin.left,
      minY: -parentThickness,
      maxX: parentBounds.width + parentThickness,
      maxY: parentBounds.height + parentThickness,
      isStatic: true,
      node: parent,
      data: {
        priority: Infinity,
        priorityWithinGroup: Infinity,
      },
    });

    // Left
    tree.insert({
      minX: -parentThickness,
      minY: -parentThickness,
      maxX: parentMargin.left,
      maxY: parentBounds.height + parentThickness,
      isStatic: true,
      node: parent,
      data: {
        priority: Infinity,
        priorityWithinGroup: Infinity,
      },
    });
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
    const choices = labelGroup.choices;

    labelGroup.nodes.map((node, i) => {
      const bounds = getRelativeBounds(
        node.getBoundingClientRect(),
        parentBounds
      );

      const body = {
        minX: bounds.x - margin.left,
        minY: bounds.y - margin.top,
        maxX: bounds.x + bounds.width + margin.left + margin.right,
        maxY: bounds.y + bounds.height + margin.top + margin.bottom,

        isStatic: false,
        node,
        data: {
          priority,
          priorityWithinGroup: labelGroup.nodes.length - i,
          choices,
        },
      };
      tree.insert(body);
    });
  });

  const handleCollision = (response: CollisionCandidate) => {
    const [bodyToMove, _bodyToNotMove] = orderBodies(response.a, response.b);

    if (!bodyToMove.isStatic && bodyToMove.data.choices) {
      // Loop through the positioning choices, finding one that works
      for (const choice of bodyToMove.data.choices) {
        choice(bodyToMove.node);

        // Update the position of the body in the system
        const bounds = bodyToMove.node.getBoundingClientRect();
        const newBody = updateTree(tree, bodyToMove, bounds.x, bounds.y);

        // Check if this position collides with anything else in the system
        const collisions = checkOne(tree, newBody);
        const stillCollides = !!collisions;
        if (!stillCollides) {
          break;
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
};
