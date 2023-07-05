function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _define_property(target, key, source[key]);
        });
    }
    return target;
}
function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _object_spread_props(target, source) {
    source = source != null ? source : {};
    if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
        ownKeys(Object(source)).forEach(function(key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
    }
    return target;
}
import RBush from 'rbush';
import uniqWith from 'lodash/uniqWith.js';
import { defaultDebugFunc } from './debug';
const getRelativeBounds = (child, parent)=>{
    return {
        x: child.x - parent.x,
        y: child.y - parent.y,
        width: child.width,
        height: child.height
    };
};
const first = (array, callback)=>{
    for(let i = 0, l = array.length; i < l; i++){
        const value = callback(array[i], i);
        if (value) {
            return value;
        }
    }
    return null;
};
const all = (array, callback)=>{
    let ret = [];
    for(let i = 0, l = array.length; i < l; i++){
        const value = callback(array[i], i);
        if (value) {
            ret.push(value);
        }
    }
    return ret;
};
const checkOne = (tree, body)=>{
    if (body.isStatic) {
        return false;
    }
    const bodies = tree.search(body);
    const checkCollision = (candidate)=>{
        if (candidate !== body) {
            return {
                a: body,
                b: candidate
            };
        }
    };
    return first(bodies, checkCollision);
};
const getCollisions = (tree)=>{
    const bodies = tree.all();
    const check = (body)=>{
        return checkOne(tree, body);
    };
    const collisions = all(bodies, check);
    const uniqueCollisions = uniqWith(collisions, (a, b)=>{
        return a.a === b.a || a.a === b.b;
    });
    return uniqueCollisions;
};
const updateTree = (tree, body, x, y)=>{
    const newBody = _object_spread_props(_object_spread({}, body), {
        minX: x,
        minY: y,
        maxX: x + (body.maxX - body.minX),
        maxY: y + (body.maxY - body.minY)
    });
    // Remove the old body, comparing the nodes so that other changes to the body properties will not appear as different bodies
    tree.remove(body, (a, b)=>a.node === b.node);
    tree.insert(newBody);
    return newBody;
};
const savePositionHistory = (body, message)=>{
    body.positionHistory.push({
        minX: body.minX,
        minY: body.minY,
        maxX: body.maxX,
        maxY: body.maxY,
        message
    });
};
const getDistance = (a, b)=>{
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};
const getNudgedPosition = (direction, bodyToMove, bodyToNotMove)=>{
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
        distance: getDistance({
            x,
            y
        }, {
            x: bodyToMove.minX,
            y: bodyToMove.minY
        })
    };
};
/* Return the two bodies in order according to their priority values
 */ const orderBodies = (a, b)=>{
    if (b.data.priority > a.data.priority) {
        return [
            a,
            b
        ];
    } else if (a.data.priority > b.data.priority) {
        return [
            b,
            a
        ];
    } else if (b.data.priorityWithinGroup > a.data.priorityWithinGroup) {
        return [
            a,
            b
        ];
    } else {
        return [
            b,
            a
        ];
    }
};
const removeCollisions = (tree)=>{
    let attempts = 0;
    let hasCollisions = true;
    while(hasCollisions && attempts <= 5){
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
const addParent = (tree, parent, parentBounds, parentMargin)=>{
    const parentThickness = 200;
    const top = {
        minX: -parentThickness,
        minY: -parentThickness,
        maxX: parentBounds.width + parentThickness,
        maxY: parentMargin.top,
        positionHistory: [],
        isStatic: true,
        node: parent,
        data: {
            priority: Infinity,
            priorityWithinGroup: Infinity
        }
    };
    const bottom = {
        minX: -parentThickness,
        minY: parentBounds.height - parentMargin.bottom,
        maxX: parentBounds.width + parentThickness,
        maxY: parentBounds.height + parentThickness,
        positionHistory: [],
        isStatic: true,
        node: parent,
        data: {
            priority: Infinity,
            priorityWithinGroup: Infinity
        }
    };
    const right = {
        minX: parentBounds.width - parentMargin.left,
        minY: -parentThickness,
        maxX: parentBounds.width + parentThickness,
        maxY: parentBounds.height + parentThickness,
        positionHistory: [],
        isStatic: true,
        node: parent,
        data: {
            priority: Infinity,
            priorityWithinGroup: Infinity
        }
    };
    const left = {
        minX: -parentThickness,
        minY: -parentThickness,
        maxX: parentMargin.left,
        maxY: parentBounds.height + parentThickness,
        positionHistory: [],
        isStatic: true,
        node: parent,
        data: {
            priority: Infinity,
            priorityWithinGroup: Infinity
        }
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
const serialize = (parent, labelGroups, options)=>{
    return JSON.stringify({
        parent: {
            bounds: parent.getBoundingClientRect()
        },
        labelGroups: labelGroups.map((group)=>{
            return _object_spread_props(_object_spread({}, group), {
                nodes: group.nodes.map((node)=>{
                    return {
                        bounds: node.getBoundingClientRect(),
                        textContent: node.textContent
                    };
                })
            });
        }),
        options: options
    }, null, 2);
};
// Global id counter, incremented for each instance of an avoid overlap class
let uid = 0;
/* Avoid label collisions by nudging colliding labels
 *
 */ export class AvoidOverlapNudge {
    run(parent, labelGroups, options) {
        if (options.debug) {
            console.log(serialize(parent, labelGroups, options));
            console.log('^ copy the above message into this project’s Storybook for more debugging');
        }
        const tree = new RBush();
        const parentBounds = parent.getBoundingClientRect();
        const maxAttempts = options.maxAttempts || 3;
        const includeParent = options.includeParent || false;
        const parentMargin = options.parentMargin || {
            top: -2,
            right: -2,
            bottom: -2,
            left: -2
        };
        if (includeParent) {
            addParent(tree, parent, parentBounds, parentMargin);
        }
        // Add everything to the system
        labelGroups.map((labelGroup)=>{
            const margin = labelGroup.margin || {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            };
            const priority = labelGroup.priority || 0;
            const nudgeStrategy = labelGroup.nudgeStrategy || 'shortest';
            const nudgeDirections = labelGroup.nudgeDirections || [
                'down',
                'right',
                'up',
                'left'
            ];
            const maxDistance = labelGroup.maxDistance || Infinity;
            const render = labelGroup.render;
            labelGroup.nodes.map((node, i)=>{
                const bounds = getRelativeBounds(node.getBoundingClientRect(), parentBounds);
                const minX = bounds.x - margin.left;
                const minY = bounds.y - margin.top;
                const maxX = bounds.x + bounds.width + margin.left + margin.right;
                const maxY = bounds.y + bounds.height + margin.top + margin.bottom;
                const body = {
                    minX,
                    minY,
                    maxX,
                    maxY,
                    positionHistory: [],
                    isStatic: false,
                    node,
                    data: {
                        priority,
                        priorityWithinGroup: labelGroup.nodes.length - i,
                        nudgeStrategy,
                        nudgeDirections,
                        maxDistance,
                        render
                    }
                };
                tree.insert(body);
                savePositionHistory(body, 'initial');
            });
        });
        const handleCollision = (response)=>{
            // TODO better type handling here. Can we assume `bodyToMove` is a DynamicBody?
            const [bodyToMove, bodyToNotMove] = orderBodies(response.a, response.b);
            if (bodyToMove.data.nudgeStrategy === 'shortest') {
                const closestPosition = bodyToMove.data.nudgeDirections.map((direction)=>getNudgedPosition(direction, bodyToMove, bodyToNotMove)).sort((a, b)=>a.distance - b.distance)[0];
                const newX = closestPosition.x;
                const newY = closestPosition.y;
                const diffX = newX - bodyToMove.minX;
                const diffY = newY - bodyToMove.minY;
                if (bodyToMove.data.render) {
                    bodyToMove.data.render(bodyToMove.node, diffX, diffY);
                    const newBody = updateTree(tree, bodyToMove, newX, newY);
                    savePositionHistory(newBody, 'nudge-shortest');
                }
            } else if (bodyToMove.data.nudgeStrategy === 'ordered' && bodyToMove.data.nudgeDirections) {
                for (const direction of bodyToMove.data.nudgeDirections){
                    const position = getNudgedPosition(direction, bodyToMove, bodyToNotMove);
                    const newX = position.x;
                    const newY = position.y;
                    const diffX = newX - bodyToMove.minX;
                    const diffY = newY - bodyToMove.minY;
                    if (bodyToMove.data.render) {
                        bodyToMove.data.render(bodyToMove.node, diffX, diffY);
                        const newBody = updateTree(tree, bodyToMove, newX, newY);
                        savePositionHistory(newBody, `nudge-ordered, ${direction}`);
                    }
                    break;
                }
            }
        };
        let attempts = 0;
        while(attempts < maxAttempts){
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
    constructor(){
        _define_property(this, "uid", void 0);
        this.uid = uid++;
    }
}
/* Avoid label collisions by trying different label position choices
 */ export class AvoidOverlapChoices {
    run(parent, labelGroups, options) {
        const tree = new RBush();
        const parentBounds = parent.getBoundingClientRect();
        const maxAttempts = options.maxAttempts || 3;
        const includeParent = options.includeParent || false;
        const parentMargin = options.parentMargin || {
            top: -2,
            right: -2,
            bottom: -2,
            left: -2
        };
        if (includeParent) {
            addParent(tree, parent, parentBounds, parentMargin);
        }
        // Add everything to the system
        labelGroups.map((labelGroup)=>{
            const margin = labelGroup.margin || {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            };
            const priority = labelGroup.priority || 0;
            const choices = labelGroup.choices;
            labelGroup.nodes.map((node, i)=>{
                const bounds = getRelativeBounds(node.getBoundingClientRect(), parentBounds);
                const body = {
                    minX: bounds.x - margin.left,
                    minY: bounds.y - margin.top,
                    maxX: bounds.x + bounds.width + margin.left + margin.right,
                    maxY: bounds.y + bounds.height + margin.top + margin.bottom,
                    positionHistory: [],
                    isStatic: false,
                    node,
                    data: {
                        priority,
                        priorityWithinGroup: labelGroup.nodes.length - i,
                        choices
                    }
                };
                tree.insert(body);
                savePositionHistory(body, 'initial');
            });
        });
        const handleCollision = (response)=>{
            const [bodyToMove, _bodyToNotMove] = orderBodies(response.a, response.b);
            if (!bodyToMove.isStatic && bodyToMove.data.choices) {
                // Loop through the positioning choices, finding one that works
                for (const choice of bodyToMove.data.choices){
                    choice(bodyToMove.node);
                    // Update the position of the body in the system
                    const bounds = bodyToMove.node.getBoundingClientRect();
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
        };
        let attempts = 0;
        while(attempts < maxAttempts){
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
    constructor(){
        _define_property(this, "uid", void 0);
        this.uid = uid++;
    }
}
