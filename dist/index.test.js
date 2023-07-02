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
import { avoidOverlapChoices, avoidOverlapNudge } from './index';
class CustomElement extends HTMLElement {
    getAttribute(qualifiedName) {
        if (qualifiedName === 'transform') {
            return `translate(${this.bbox.x}, ${this.bbox.y})`;
        } else {
            return super.getAttribute(qualifiedName);
        }
    }
    setAttribute(qualifiedName, value) {
        if (qualifiedName === 'transform') {
            const match = value.match(/([0-9]+)/g);
            if (match) {
                this.bbox.x = +match[0];
                this.bbox.y = +match[1];
            }
        } else {
            return super.setAttribute(qualifiedName, value);
        }
    }
    setBoundingClientRect(bbox) {
        this.bbox = bbox;
    }
    getBoundingClientRect() {
        return {
            x: this.bbox.x,
            y: this.bbox.y,
            width: this.bbox.width,
            height: this.bbox.height
        };
    }
    constructor(bbox){
        super();
        this.bbox = bbox;
    }
}
window.customElements.define('custom-element', CustomElement);
test('nudge works with two sets of nodes', ()=>{
    const nodesTitle = [
        {
            x: 0,
            y: 0,
            width: 10,
            height: 10
        },
        {
            x: 40,
            y: 0,
            width: 10,
            height: 10
        }
    ].map((d)=>new CustomElement(d));
    const nodesSubtitle = [
        {
            x: 0,
            y: 0,
            width: 10,
            height: 10
        },
        {
            x: 40,
            y: 0,
            width: 10,
            height: 10
        }
    ].map((d)=>new CustomElement(d));
    const parentNode = new CustomElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
    });
    const nudge = (node, diffX, diffY)=>{
        const previousBounds = node.getBoundingClientRect();
        node.setBoundingClientRect({
            x: previousBounds.x + diffX,
            y: previousBounds.y + diffY,
            width: previousBounds.width,
            height: previousBounds.height
        });
    };
    avoidOverlapNudge(parentNode, [
        {
            nodes: nodesTitle,
            render: nudge,
            priority: 10
        },
        {
            nodes: nodesSubtitle,
            render: nudge,
            priority: 5
        }
    ], {});
    expect(nodesTitle[0].getBoundingClientRect()).toEqual({
        x: 0,
        y: 0,
        width: 10,
        height: 10
    });
    expect(nodesSubtitle[0].getBoundingClientRect()).toEqual({
        x: 0,
        y: 11,
        width: 10,
        height: 10
    });
    expect(nodesTitle[1].getBoundingClientRect()).toEqual({
        x: 40,
        y: 0,
        width: 10,
        height: 10
    });
    expect(nodesSubtitle[1].getBoundingClientRect()).toEqual({
        x: 40,
        y: 11,
        width: 10,
        height: 10
    });
});
test('nudge shortest with directions', ()=>{
    const nodesTitle = [
        {
            x: 0,
            y: 0,
            width: 10,
            height: 10
        },
        {
            x: 40,
            y: 0,
            width: 10,
            height: 10
        }
    ].map((d)=>new CustomElement(d));
    const nodesSubtitle = [
        {
            x: 0,
            y: 0,
            width: 10,
            height: 10
        },
        {
            x: 40,
            y: 0,
            width: 10,
            height: 10
        }
    ].map((d)=>new CustomElement(d));
    const parentNode = new CustomElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
    });
    const nudge = (node, diffX, diffY)=>{
        const previousBounds = node.getBoundingClientRect();
        node.setBoundingClientRect({
            x: previousBounds.x + diffX,
            y: previousBounds.y + diffY,
            width: previousBounds.width,
            height: previousBounds.height
        });
    };
    avoidOverlapNudge(parentNode, [
        {
            nodes: nodesTitle,
            render: nudge,
            priority: 10,
            nudgeStrategy: 'shortest',
            nudgeDirections: [
                'up',
                'left'
            ]
        },
        {
            nodes: nodesSubtitle,
            render: nudge,
            priority: 5,
            nudgeStrategy: 'shortest',
            nudgeDirections: [
                'up',
                'left'
            ]
        }
    ], {});
    expect(nodesTitle[0].getBoundingClientRect()).toEqual({
        x: 0,
        y: 0,
        width: 10,
        height: 10
    });
    expect(nodesSubtitle[0].getBoundingClientRect()).toEqual({
        x: 0,
        y: -11,
        width: 10,
        height: 10
    });
    expect(nodesTitle[1].getBoundingClientRect()).toEqual({
        x: 40,
        y: 0,
        width: 10,
        height: 10
    });
    expect(nodesSubtitle[1].getBoundingClientRect()).toEqual({
        x: 40,
        y: -11,
        width: 10,
        height: 10
    });
});
test('choices avoids viewbox bounds', ()=>{
    const nodes = [
        {
            x: 0,
            y: 0,
            width: 10,
            height: 10
        }
    ].map((d)=>new CustomElement(d));
    const parentNode = new CustomElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
    });
    avoidOverlapChoices(parentNode, [
        {
            nodes: nodes,
            choices: [
                (d)=>{
                    const bbox = d.getBoundingClientRect();
                    d.setBoundingClientRect(_object_spread_props(_object_spread({}, bbox), {
                        y: bbox.y + 10,
                        x: bbox.x + 10
                    }));
                }
            ]
        }
    ], {
        includeParent: true,
        parentMargin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        }
    });
    expect(nodes[0].getBoundingClientRect()).toEqual({
        x: 10,
        y: 10,
        width: 10,
        height: 10
    });
});
