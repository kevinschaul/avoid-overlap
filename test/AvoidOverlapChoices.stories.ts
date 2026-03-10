import type { Meta, StoryObj } from '@storybook/html-vite';

import { render } from './util';

const meta: Meta = {
  title: 'AvoidOverlapChoices',
  tags: ['autodocs'],
  args: {
    debug: false,
  },
  argTypes: {
    debug: { control: 'boolean' },
  },
};
export default meta;

const Default: StoryObj = {
  parameters: {
    docs: {
      story: { autoplay: true },
    },
  },
  render,
};

/**
 * Square should appear at top left corner
 */
export const AvoidViewboxBounds: StoryObj = {
  ...Default,
  args: {
    parent: {
      coords: {
        x: 0,
        y: 0,
        width: 200,
        height: 200,
      },
    },
    labelGroups: [
      {
        technique: 'choices',
        nodes: [
          {
            coords: {
              x: 0,
              y: 0,
              width: 10,
              height: 10,
            },
          },
        ],
        choices: [
          (element: Element) =>
            element.setAttributeNS(null, 'transform', 'translate(-20, -20)'),
          (element: Element) =>
            element.setAttributeNS(null, 'transform', 'translate(0, 0)'),
        ],
      },
    ],
    options: {
      includeParent: true,
      parentMargin: {
        // Negative margins so that labels touching (but not crossing) the
        // parent edge are not treated as collisions by the spatial tree.
        top: -1,
        right: -1,
        bottom: -1,
        left: -1,
      },
    },
  },
};
