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
 * Realistic arrow-label scenario: up arrows prefer top-right → top-left →
 * bottom; down arrows prefer bottom-left → bottom-right → top.
 *
 * Points A and B are close together (both up), competing for top positions.
 * Points C and D are close together (both down), competing for bottom positions.
 * Point E is isolated.
 *
 * Expected outcome with priority-ordered assignment:
 * - A (priority 3) → top-right ✓  (first pick)
 * - B (priority 2) → bottom       (top-right and top-left both blocked by A)
 * - C (priority 2) → bottom-left ✓ (first pick)
 * - D (priority 1) → bottom-right  (bottom-left blocked by C)
 * - E (priority 2) → top-right ✓  (isolated, no conflict)
 */
export const ArrowLabels: StoryObj = {
  ...Default,
  args: {
    parent: {
      coords: { x: 0, y: 0, width: 400, height: 200 },
    },
    labelGroups: [
      // Up arrow at x=60, highest priority — keeps preferred top-right position
      {
        technique: 'choices',
        priority: 3,
        nodes: [
          {
            coords: { x: 60, y: 80, width: 60, height: 16 },
            textContent: 'Label A',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(60, 80)'), // top-right
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(0, 80)'), // top-left
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(30, 104)'), // bottom
        ],
      },
      // Up arrow at x=110, close to A — top-right and top-left both blocked by A
      {
        technique: 'choices',
        priority: 2,
        nodes: [
          {
            coords: { x: 110, y: 75, width: 60, height: 16 },
            textContent: 'Label B',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(110, 75)'), // top-right — overlaps A
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(50, 75)'), // top-left — overlaps A
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(80, 99)'), // bottom — clear
        ],
      },
      // Down arrow at x=200, gets first pick of bottom positions
      {
        technique: 'choices',
        priority: 2,
        nodes: [
          {
            coords: { x: 140, y: 109, width: 60, height: 16 },
            textContent: 'Label C',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(140, 109)'), // bottom-left
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(200, 109)'), // bottom-right
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(170, 85)'), // top
        ],
      },
      // Down arrow at x=245, close to C — bottom-left blocked, falls back to bottom-right
      {
        technique: 'choices',
        priority: 1,
        nodes: [
          {
            coords: { x: 185, y: 104, width: 60, height: 16 },
            textContent: 'Label D',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(185, 104)'), // bottom-left — overlaps C
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(245, 104)'), // bottom-right — clear
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(215, 80)'), // top
        ],
      },
      // Up arrow at x=330, isolated — keeps top-right without conflict
      {
        technique: 'choices',
        priority: 2,
        nodes: [
          {
            coords: { x: 330, y: 70, width: 60, height: 16 },
            textContent: 'Label E',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(330, 70)'), // top-right
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(270, 70)'), // top-left
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(300, 94)'), // bottom
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
