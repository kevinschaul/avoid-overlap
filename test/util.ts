import { AvoidOverlap } from '../src/index';
import type { LabelGroup } from '../src/index';

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

export const render = () => document.createElementNS(svgNamespace, 'svg');

export const play = async ({ canvasElement, args }) => {
  const parent = canvasElement.querySelector('svg');
  const parentBounds = parent.getBoundingClientRect();

  // Clear any previous contents of the svg
  parent.innerHTML = '';

  // Remove any previous debugger nodes
  document.querySelectorAll('.avoid-overlap-debugger').forEach((node) => {
    node.remove();
  });

  parent.setAttributeNS(null, 'width', args.parent.coords.width);
  parent.setAttributeNS(null, 'height', args.parent.coords.height);

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

  const avoidOverlap = new AvoidOverlap();
  avoidOverlap.run(parent, labelGroups, args.options);
};

export const playExportedArgs = async ({ canvasElement, args }) => {
  // Parse `exportedArgs` into an object
  const parsed = JSON.parse(args.exportedArgs);
  parsed.labelGroups = parsed.labelGroups.map((d: LabelGroup) => ({
    // Override the render function for each label group
    ...d,
    render: labelGroupNudgeRender
  }))

  return await play({ canvasElement, args: parsed });
};

export const labelGroupNudgeRender = (element: Element, dx: number, dy: number) => {
  const prevTransform =
    element.getAttributeNS(null, 'transform') || 'translate(0, 0)';
  const [x, y] = prevTransform.match(/([0-9]+)/g)!.map((d) => +d);

  element.setAttributeNS(null, 'transform', `translate(${x + dx}, ${y + dy})`);
};
