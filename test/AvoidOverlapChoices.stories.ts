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
 * Two labels compete for the same first-choice position (above the anchor).
 * The higher-priority label (priority: 2) should keep "above"; the
 * lower-priority label (priority: 1) should fall back to "below".
 * This verifies the sequential priority-ordered assignment for choices.
 */
export const PriorityBasedAssignment: StoryObj = {
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
        priority: 2,
        nodes: [
          {
            coords: { x: 80, y: 100, width: 40, height: 20 },
            textContent: 'hi-pri',
          },
        ],
        choices: [
          (element: Element) =>
            element.setAttributeNS(null, 'transform', 'translate(80, 75)'),
          (element: Element) =>
            element.setAttributeNS(null, 'transform', 'translate(80, 125)'),
        ],
      },
      {
        technique: 'choices',
        priority: 1,
        nodes: [
          {
            coords: { x: 80, y: 100, width: 40, height: 20 },
            textContent: 'lo-pri',
          },
        ],
        choices: [
          (element: Element) =>
            element.setAttributeNS(null, 'transform', 'translate(80, 75)'),
          (element: Element) =>
            element.setAttributeNS(null, 'transform', 'translate(80, 125)'),
        ],
      },
    ],
    options: {},
  },
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
        // TODO why do we need -1 instead of 0?
        top: -1,
        right: -1,
        bottom: -1,
        left: -1,
      },
    },
  },
};
