import { AvoidOverlapChoices, AvoidOverlapNudge } from '../src/index';
import type { LabelGroupNudge } from '../src/index';

interface TestNode {
  bounds: {
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
interface TestLabelGroupNudge extends Omit<LabelGroupNudge, 'nodes'> {
  nodes: TestNode[];
}

const svgNamespace = 'http://www.w3.org/2000/svg';

export const render = () => document.createElementNS(svgNamespace, 'svg');

export const play = async ({ canvasElement, args }) => {
  const parent = canvasElement.querySelector('svg');

  // Clear any previous contents of the svg
  parent.innerHTML = '';

  // Remove any previous debugger nodes
  document.querySelectorAll('.avoid-overlap-debugger').forEach((node) => {
    node.remove();
  });

  const avoidOverlap = {
    'nudge': new AvoidOverlapNudge(),
    'choices': new AvoidOverlapChoices(),
  }[args.options.technique];

  parent.setAttributeNS(null, 'width', args.parent.bounds.width);
  parent.setAttributeNS(null, 'height', args.parent.bounds.height);

  const labelGroups = args.labelGroups.map(
    (labelGroup: TestLabelGroupNudge) => {
      return {
        ...labelGroup,
        nodes: labelGroup.nodes.map((node) => {
          const element = document.createElementNS(svgNamespace, 'g');
          // TODO write text
          // element.setAttributeNS(null, 'data-text', node.textContent);

          element.setAttributeNS(
            null,
            'transform',
            `translate(${node.bounds.x - args.parent.bounds.x}, ${
              node.bounds.y - args.parent.bounds.y
            })`
          );

          const rect = document.createElementNS(svgNamespace, 'rect');
          rect.setAttributeNS(null, 'x', '0');
          rect.setAttributeNS(null, 'y', '0');
          rect.setAttributeNS(null, 'width', `${node.bounds.width}`);
          rect.setAttributeNS(null, 'height', `${node.bounds.height}`);
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
        render: (element: Element, dx: number, dy: number) => {
          const prevTransform =
            element.getAttributeNS(null, 'transform') || 'translate(0, 0)';
          console.log(prevTransform)
          const [x, y] = prevTransform.match(/([0-9]+)/g)!.map((d) => +d);

          element.setAttributeNS(
            null,
            'transform',
            `translate(${x + dx}, ${y + dy})`
          );
        },
      };
    }
  );

  avoidOverlap.run(parent, labelGroups, args.options);
};

export const playExportedArgs = async ({ canvasElement, args }) => {
  return await play({ canvasElement, args: JSON.parse(args.exportedArgs) });
};
