import { avoidOverlap } from '../src/index';
import type { LabelGroup, Options } from '../src/index';

interface TestNode {
  coords: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  textContent: string;
}
interface TestLabelGroup extends Omit<LabelGroup, 'nodes'> {
  nodes: TestNode[];
}

const svgNamespace = 'http://www.w3.org/2000/svg';

function buildSimpleStory(parent: SVGElement, args: any) {
  parent.innerHTML = '';
  document.querySelectorAll('[id^="avoid-overlap-scored-debug"]').forEach((n) => n.remove());

  parent.setAttributeNS(null, 'width', args.parent.coords.width);
  parent.setAttributeNS(null, 'height', args.parent.coords.height);

  const parentBounds = parent.getBoundingClientRect();
  const xOffset = parentBounds.x - args.parent.coords.x;
  const yOffset = parentBounds.y - args.parent.coords.y;

  const labelGroups = args.labelGroups.map(
    (labelGroup: TestLabelGroup) => {
      const newLabelGroup = {
        ...labelGroup,
        nodes: labelGroup.nodes.map((node) => {
          const element = document.createElementNS(svgNamespace, 'g');

          element.setAttributeNS(
            null,
            'transform',
            `translate(${xOffset + node.coords.x - parentBounds.x}, ${
              yOffset + node.coords.y - parentBounds.y
            })`
          );

          const rect = document.createElementNS(svgNamespace, 'rect');
          rect.setAttributeNS(null, 'x', '0');
          rect.setAttributeNS(null, 'y', '0');
          rect.setAttributeNS(null, 'width', `${node.coords.width}`);
          rect.setAttributeNS(null, 'height', `${node.coords.height}`);
          rect.setAttributeNS(null, 'fill', '#ccc');
          rect.setAttributeNS(null, 'stroke', '#333');
          element.append(rect);

          if (node.textContent) {
            const text = document.createElementNS(svgNamespace, 'text');
            text.setAttributeNS(null, 'x', '0');
            text.setAttributeNS(null, 'y', '0');
            text.setAttributeNS(null, 'dy', '0.8em');
            text.innerHTML = node.textContent;
            element.append(text);
          }

          parent.append(element);
          return element;
        }),
      };

      return newLabelGroup;
    }
  );

  const runOptions: Options = { ...args.options, ...args.scoredOptions, debug: args.debug ?? false };
  avoidOverlap(labelGroups, runOptions);
}

export const render = (args: any) => {
  const parent = document.createElementNS(svgNamespace, 'svg');
  // Wait for DOM attachment so getBoundingClientRect works
  requestAnimationFrame(() => buildSimpleStory(parent, args));
  return parent;
};

export const labelGroupNudgeRender = (element: Element, dx: number, dy: number) => {
  const prevTransform =
    element.getAttributeNS(null, 'transform') || 'translate(0, 0)';
  const [x, y] = prevTransform.match(/-?[0-9]+\.?[0-9]*/g)!.map((d) => +d);

  element.setAttributeNS(null, 'transform', `translate(${x + dx}, ${y + dy})`);
};
