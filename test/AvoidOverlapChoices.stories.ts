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
 * Realistic arrow-label scenario modelled on a map chart where triangles mark
 * data points (▲ = up trend, ▽ = down trend). Labels sit BESIDE the triangle
 * tip at the same vertical level — not above/below the whole triangle.
 *
 * Placement rules (label: 55 × 14 px, padding: 5 px, triangle height: 16 px):
 *   ▲ up tip at (ax, ay):   left-of-tip → right-of-tip → below triangle
 *   ▽ down tip at (ax, ay): right-of-tip → left-of-tip → above triangle
 *
 * Three up-arrows cluster together, each forcing the next to fall back:
 *   A ▲ (100,100) priority 3 → left-of-tip    (first pick, no conflict)
 *   B ▲ (140, 97) priority 2 → right-of-tip   (left blocked by A)
 *   C ▲ (170,103) priority 1 → below triangle (left blocked by A, right blocked by B)
 *
 * Two down-arrows cluster together:
 *   D ▽ (250,110) priority 3 → right-of-tip   (first pick, no conflict)
 *   E ▽ (290,105) priority 2 → above triangle (right and left both blocked by D)
 */
export const ArrowLabels: StoryObj = {
  ...Default,
  args: {
    parent: {
      coords: { x: 0, y: 0, width: 400, height: 200 },
    },
    labelGroups: [
      // ▲ up at (100,100), priority 3 — keeps preferred left-of-tip
      {
        technique: 'choices',
        priority: 3,
        nodes: [
          {
            coords: { x: 40, y: 93, width: 55, height: 14 },
            textContent: 'Label A',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(40, 93)'), // left-of-tip
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(105, 93)'), // right-of-tip
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(73, 121)'), // below
        ],
      },
      // ▲ up at (140,97), priority 2 — left blocked by A, falls back to right-of-tip
      {
        technique: 'choices',
        priority: 2,
        nodes: [
          {
            coords: { x: 80, y: 90, width: 55, height: 14 },
            textContent: 'Label B',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(80, 90)'), // left-of-tip — overlaps A
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(145, 90)'), // right-of-tip — clear
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(113, 118)'), // below
        ],
      },
      // ▲ up at (170,103), priority 1 — left blocked by A, right blocked by B, falls back below
      {
        technique: 'choices',
        priority: 1,
        nodes: [
          {
            coords: { x: 110, y: 96, width: 55, height: 14 },
            textContent: 'Label C',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(110, 96)'), // left-of-tip — overlaps B
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(175, 96)'), // right-of-tip — overlaps B
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(143, 124)'), // below — clear
        ],
      },
      // ▽ down at (250,110), priority 3 — keeps preferred right-of-tip
      {
        technique: 'choices',
        priority: 3,
        nodes: [
          {
            coords: { x: 255, y: 103, width: 55, height: 14 },
            textContent: 'Label D',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(255, 103)'), // right-of-tip
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(190, 103)'), // left-of-tip
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(223, 75)'), // above
        ],
      },
      // ▽ down at (290,105), priority 2 — right and left both blocked by D, falls back above
      {
        technique: 'choices',
        priority: 2,
        nodes: [
          {
            coords: { x: 295, y: 98, width: 55, height: 14 },
            textContent: 'Label E',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(295, 98)'), // right-of-tip — overlaps D
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(230, 98)'), // left-of-tip — overlaps D
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(263, 70)'), // above — clear
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
