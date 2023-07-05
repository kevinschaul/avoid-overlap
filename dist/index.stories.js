function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
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
import { AvoidOverlapNudge } from './index';
const svgNamespace = 'http://www.w3.org/2000/svg';
const meta = {
    title: 'AvoidOverlapNudge',
    argTypes: {
        exportedArgs: {
            control: 'text'
        },
        debug: {
            control: 'boolean'
        }
    }
};
export default meta;
const render = ()=>document.createElementNS(svgNamespace, 'svg');
const play = function() {
    var _ref = _async_to_generator(function*({ canvasElement , args  }) {
        const parent = canvasElement.querySelector('svg');
        // Clear any previous contents of the svg
        parent.innerHTML = '';
        // Remove any previous debugger nodes
        document.querySelectorAll('.avoid-overlap-debugger').forEach((node)=>{
            node.remove();
        });
        const avoidOverlapNudge = new AvoidOverlapNudge();
        const exportedArgs = JSON.parse(args.exportedArgs);
        parent.setAttributeNS(null, 'width', exportedArgs.parent.bounds.width);
        parent.setAttributeNS(null, 'height', exportedArgs.parent.bounds.height);
        const labelGroups = exportedArgs.labelGroups.map((labelGroup)=>{
            return _object_spread_props(_object_spread({}, labelGroup), {
                nodes: labelGroup.nodes.map((node)=>{
                    const element = document.createElementNS(svgNamespace, 'rect');
                    element.setAttributeNS(null, 'data-text', node.textContent);
                    element.setAttributeNS(null, 'x', `${node.bounds.x - exportedArgs.parent.bounds.x}`);
                    element.setAttributeNS(null, 'y', `${node.bounds.y - exportedArgs.parent.bounds.y}`);
                    element.setAttributeNS(null, 'width', `${node.bounds.width}`);
                    element.setAttributeNS(null, 'height', `${node.bounds.height}`);
                    element.setAttributeNS(null, 'fill', '#ccc');
                    element.setAttributeNS(null, 'stroke', '#333');
                    parent.append(element);
                    return element;
                }),
                render: (element, dx, dy)=>{
                    const prevX = +(element.getAttributeNS(null, 'x') || 0);
                    const prevY = +(element.getAttributeNS(null, 'y') || 0);
                    element.setAttributeNS(null, 'x', `${prevX + dx}`);
                    element.setAttributeNS(null, 'y', `${prevY + dy}`);
                }
            });
        });
        avoidOverlapNudge.run(parent, labelGroups, exportedArgs.options);
    });
    return function play(_) {
        return _ref.apply(this, arguments);
    };
}();
export const Default = {
    render: render,
    play: play,
    args: {
        exportedArgs: `{
      "parent": {
        "bounds": {
          "x": 83.5,
          "y": 410.5,
          "width": 960,
          "height": 460,
          "top": 410.5,
          "right": 1043.5,
          "bottom": 870.5,
          "left": 83.5
        }
      },
      "labelGroups": [
        {
          "nodes": [
            {
              "bounds": {
                "x": 517.4666748046875,
                "y": 406.33331298828125,
                "width": 68.25,
                "height": 56.2166748046875,
                "top": 406.33331298828125,
                "right": 585.7166748046875,
                "bottom": 462.54998779296875,
                "left": 517.4666748046875
              }
            },
            {
              "bounds": {
                "x": 888.6666870117188,
                "y": 406.33331298828125,
                "width": 67.25,
                "height": 56.2166748046875,
                "top": 406.33331298828125,
                "right": 955.9166870117188,
                "bottom": 462.54998779296875,
                "left": 888.6666870117188
              }
            },
            {
              "bounds": {
                "x": 322.2833251953125,
                "y": 406.33331298828125,
                "width": 87.94999694824219,
                "height": 73.83334350585938,
                "top": 406.33331298828125,
                "right": 410.2333221435547,
                "bottom": 480.1666564941406,
                "left": 322.2833251953125
              }
            }
          ],
          "margin": {
            "top": 0,
            "right": 4,
            "bottom": 0,
            "left": 0
          },
          "nudgeStrategy": "shortest",
          "nudgeDirections": [
            "left",
            "right"
          ]
        }
      ],
      "options": {
        "includeParent": false,
        "debug": false
      }
    }`,
        debug: false
    }
};
export const Crowded = {
    render: render,
    play: play,
    args: {
        exportedArgs: `{
      "parent": {
        "bounds": {
          "x": 0,
          "y": 0,
          "width": 1217,
          "height": 300.1499938964844,
          "top": 0,
          "right": 1217,
          "bottom": 300.1499938964844,
          "left": 0
        }
      },
      "labelGroups": [
        {
          "nodes": [
            {
              "bounds": {
                "x": 19,
                "y": 10,
                "width": 162.5,
                "height": 24,
                "top": 10,
                "right": 181.5,
                "bottom": 34,
                "left": 19
              },
              "textContent": "Business & Industrial"
            }
          ],
          "margin": {
            "top": -2,
            "right": 0,
            "bottom": -2,
            "left": 0
          },
          "priority": 10,
          "maxDistance": 40
        },
        {
          "nodes": [],
          "margin": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          },
          "priority": 5,
          "nudgeStrategy": "ordered",
          "nudgeDirections": [
            "down"
          ]
        },
        {
          "nodes": [
            {
              "bounds": {
                "x": 19,
                "y": 10,
                "width": 112.03334045410156,
                "height": 22,
                "top": 10,
                "right": 131.03334045410156,
                "bottom": 32,
                "left": 19
              },
              "textContent": "Business Services"
            },
            {
              "bounds": {
                "x": 183,
                "y": 10,
                "width": 53.75,
                "height": 22,
                "top": 10,
                "right": 236.75,
                "bottom": 32,
                "left": 183
              },
              "textContent": "Industry"
            },
            {
              "bounds": {
                "x": 183,
                "y": 86,
                "width": 52.23333740234375,
                "height": 22,
                "top": 86,
                "right": 235.23333740234375,
                "bottom": 108,
                "left": 183
              },
              "textContent": "Finance"
            },
            {
              "bounds": {
                "x": 304,
                "y": 10,
                "width": 80.78334045410156,
                "height": 22,
                "top": 10,
                "right": 384.78334045410156,
                "bottom": 32,
                "left": 304
              },
              "textContent": "Construction"
            },
            {
              "bounds": {
                "x": 304,
                "y": 79,
                "width": 43.05000305175781,
                "height": 37.43333435058594,
                "top": 79,
                "right": 347.0500030517578,
                "bottom": 116.43333435058594,
                "left": 304
              },
              "textContent": "RealEstate"
            },
            {
              "bounds": {
                "x": 372,
                "y": 79,
                "width": 39.616668701171875,
                "height": 22,
                "top": 79,
                "right": 411.6166687011719,
                "bottom": 101,
                "left": 372
              },
              "textContent": "Retail"
            }
          ],
          "margin": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          },
          "priority": 1,
          "nudgeStrategy": "shortest",
          "nudgeDirections": [
            "down",
            "right"
          ]
        }
      ],
      "options": {
        "includeParent": true,
        "parentMargin": {
          "top": -10,
          "right": -2,
          "bottom": -10,
          "left": 2
        },
        "debug": false
      }
    }`,
        debug: false
    }
};
