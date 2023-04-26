import { avoidOverlapChoices, avoidOverlapNudge } from './index';

interface CustomElement {
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface CustomDOMRect extends DOMRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

class CustomElement extends HTMLElement {
  constructor(bbox: any) {
    super();
    this.bbox = bbox;
  }

  getAttribute(qualifiedName: string): string | null {
    if (qualifiedName === 'transform') {
      return `translate(${this.bbox.x}, ${this.bbox.y})`;
    } else {
      return super.getAttribute(qualifiedName);
    }
  }

  setAttribute(qualifiedName: string, value: string): void {
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

  setBoundingClientRect(bbox: any) {
    this.bbox = bbox;
  }

  getBoundingClientRect() {
    return <CustomDOMRect>{
      x: this.bbox.x,
      y: this.bbox.y,
      width: this.bbox.width,
      height: this.bbox.height,
    };
  }
}
window.customElements.define('custom-element', CustomElement);

test('nudge works with two sets of nodes', () => {
  const nodesTitle = [
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 40, y: 0, width: 10, height: 10 },
  ].map((d) => new CustomElement(d));

  const nodesSubtitle = [
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 40, y: 0, width: 10, height: 10 },
  ].map((d) => new CustomElement(d));

  const parentNode = new CustomElement({ x: 0, y: 0, width: 100, height: 100 });

  const nudge = (
    node: CustomElement,
    diffX: number,
    diffY: number
  ) => {
    const previousBounds = node.getBoundingClientRect();
    node.setBoundingClientRect({
      x: previousBounds.x + diffX,
      y: previousBounds.y + diffY,
      width: previousBounds.width,
      height: previousBounds.height,
    });
  };

  avoidOverlapNudge(
    parentNode,
    [
      {
        nodes: nodesTitle,
        render: nudge,
        priority: 10,
      },
      {
        nodes: nodesSubtitle,
        render: nudge,
        priority: 5,
      },
    ],
    {}
  );

  expect(nodesTitle[0].getBoundingClientRect()).toEqual({
    x: 0,
    y: 0,
    width: 10,
    height: 10,
  });

  expect(nodesSubtitle[0].getBoundingClientRect()).toEqual({
    x: 0,
    y: 11,
    width: 10,
    height: 10,
  });

  expect(nodesTitle[1].getBoundingClientRect()).toEqual({
    x: 40,
    y: 0,
    width: 10,
    height: 10,
  });

  expect(nodesSubtitle[1].getBoundingClientRect()).toEqual({
    x: 40,
    y: 11,
    width: 10,
    height: 10,
  });
});

test('choices avoids viewbox bounds', () => {
  const nodes = [{ x: 0, y: 0, width: 10, height: 10 }].map(
    (d) => new CustomElement(d)
  );
  const parentNode = new CustomElement({ x: 0, y: 0, width: 100, height: 100 });

  avoidOverlapChoices(
    parentNode,
    [
      {
        nodes: nodes,
        choices: [
          (d: CustomElement) => {
            const bbox = d.getBoundingClientRect();
            d.setBoundingClientRect({
              ...bbox,
              y: bbox.y + 10,
              x: bbox.x + 10,
            });
          },
        ],
      },
    ],
    {
      includeParent: true,
      parentMargin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    }
  );

  expect(nodes[0].getBoundingClientRect()).toEqual({
    x: 10,
    y: 10,
    width: 10,
    height: 10,
  });
});
