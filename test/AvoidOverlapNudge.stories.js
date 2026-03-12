import { render, labelGroupNudgeRender } from './util';

const meta = {
  title: 'AvoidOverlapNudge',
  tags: ['autodocs'],
  args: {
    debug: false,
  },
  argTypes: {
    debug: { control: 'boolean' },
  },
};
export default meta;

const Default = {
  parameters: {
    docs: {
      story: { autoplay: true },
    },
  },
  render,
};

/**
 * Subtitle should appear below title
 */
export const TwoSetsOfNodes = {
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
        directions: ['down'],
      },
    ],
    options: {},
  },
};

/**
 * Square box should appear above the rectangle
 */
export const ShortestWithDirectionUp = {
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

        directions: ['up'],
      },
    ],
    options: {},
  },
};

/**
 * Square should appear to the right of the rectangle
 */
export const ShortestWithDirectionRight = {
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

        directions: ['right'],
        maxDistance: 110,
      },
    ],
    options: {},
  },
};
