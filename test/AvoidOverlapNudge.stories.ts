import type { Meta, StoryObj } from '@storybook/html';

import { render, play, labelGroupNudgeRender } from './util';

const meta: Meta = {
  title: 'AvoidOverlapNudge',
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
 * Subtitle should appear below title
 */
export const TwoSetsOfNodes: StoryObj = {
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
        technique: 'nudge',
        nodes: [
          {
            coords: {
              x: 0,
              y: 0,
              width: 80,
              height: 20,
            },
            textContent: 'A title',
          },
        ],
        priority: 10,
        render: labelGroupNudgeRender,
      },
      {
        technique: 'nudge',
        nodes: [
          {
            coords: {
              x: 0,
              y: 0,
              width: 120,
              height: 20,
            },
            textContent: 'A subtitle',
          },
        ],
        priority: 5,
        render: labelGroupNudgeRender,
      },
    ],
    options: {},
  },
};

/**
 * Square box should appear above the rectangle
 */
export const ShortestWithDirectionUp: StoryObj = {
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
        technique: 'nudge',
        nodes: [
          {
            coords: {
              x: 20,
              y: 20,
              width: 100,
              height: 10,
            },
          },
        ],
        priority: 10,
        render: labelGroupNudgeRender,
      },
      {
        technique: 'nudge',
        nodes: [
          {
            coords: {
              x: 20,
              y: 20,
              width: 10,
              height: 10,
            },
          },
        ],
        priority: 5,
        render: labelGroupNudgeRender,
        nudgeStrategy: 'shortest',
        nudgeDirections: ['up'],
      },
    ],
    options: {},
  },
};

/**
 * Square should appear to the right of the rectangle
 */
export const ShortestWithDirectionRight: StoryObj = {
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
        technique: 'nudge',
        nodes: [
          {
            coords: {
              x: 20,
              y: 20,
              width: 100,
              height: 10,
            },
          },
        ],
        render: labelGroupNudgeRender,
        priority: 10,
      },
      {
        technique: 'nudge',
        nodes: [
          {
            coords: {
              x: 20,
              y: 20,
              width: 10,
              height: 10,
            },
          },
        ],
        render: labelGroupNudgeRender,
        priority: 5,
        nudgeStrategy: 'shortest',
        nudgeDirections: ['right'],
      },
    ],
    options: {},
  },
};
