import type RBush from 'rbush';
import type { Bounds, Body } from './index';

const scale = (domain: number[], range: number[], value: number): number => {
  const result =
    range[0] +
    ((range[1] - range[0]) / (domain[1] - domain[0])) * (value - domain[0]);
  if (isNaN(result)) {
    return range[0];
  } else {
    return result;
  }
};

export const defaultDebugFunc = (
  tree: RBush<Body>,
  parentBounds: Bounds,
  uid: number
) => {
  const bodies = tree.all();

  // TODO build a unique class name so we can support multiple instances on the same page
  const debugClassName = `avoid-overlap-debugger avoid-overlap-debugger-${uid}`;
  const root = document.querySelector('body');

  if (root) {
    let debugEl = root.querySelector(`.${debugClassName}`);
    if (!debugEl) {
      debugEl = document.createElement('div');
      root.append(debugEl);
    }

    const colors = [
      '#e41a1c',
      '#377eb8',
      '#4daf4a',
      '#984ea3',
      '#ff7f00',
      '#ffff33',
      '#a65628',
      '#f781bf',
      '#999999',
    ];

    // TODO rewrite this by actually creating nodes, adding attributes, etc.
    debugEl.outerHTML = `
          <div class="${debugClassName}" style="position: absolute; top:${
      parentBounds.y + window.scrollY
    }px; left:${parentBounds.x + window.scrollX}px; z-index: 10000;">
            <svg width="${parentBounds.width}" height="${parentBounds.height}">
              ${bodies
                .map((body, bodyI) => {
                  const nPositions = body.positionHistory.length;
                  const color = colors[bodyI % colors.length];

                  return `<g data-text="${body.node.textContent}">
                  ${body.positionHistory
                    .map((position, positionI) => {
                      const opacity = scale(
                        [nPositions - 1, 0],
                        [0.7, 0.4],
                        positionI
                      );
                      return `
                    <path d="
                        M${position.minX},${position.minY}
                        L${position.maxX},${position.minY}
                        L${position.maxX},${position.maxY}
                        L${position.minX},${position.maxY}
                        Z
                      "
                      style="stroke: #000; fill: ${color}; opacity: ${opacity};"
                      />
                    <text x=${position.minX + 2} y=${
                        position.minY + 13
                      } style="font-size: 14px">${bodyI}:${positionI}</text>
                  `;
                    })
                    .join('')}</g>`;
                })
                .join('')}
            </svg>
          </div>
        `;
  }
};
