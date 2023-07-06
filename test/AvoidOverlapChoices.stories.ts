import type { Meta, StoryObj } from '@storybook/html';

import { render, play } from './util';

const meta: Meta = {
  title: 'AvoidOverlapChoices',
  tags: ['autodocs'],
  argTypes: {},
};
export default meta;

const Default: StoryObj = {
  parameters: {
    docs: {
      story: { autoplay: true },
    },
  },
  render: render,
  play: play,
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
      technique: 'choices',
      includeParent: true,
      parentMargin: {
        // TODO why do we need -1 instead of 0?
        top: -1,
        right: -1,
        bottom: -1,
        left: -1,
      },
    },
  },
};
