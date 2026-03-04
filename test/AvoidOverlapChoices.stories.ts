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
 * Six cities on a US map. Each city has candidate label positions ordered by
 * preference; avoidOverlap picks the first conflict-free option.
 *
 * Label: H=16 px, gap from dot: 5 px. Preferred sides reflect geography:
 *   left-coast cities prefer right-of-dot; east-coast cities prefer left-of-dot.
 *
 * Conflicts and expected outcome:
 *   Seattle  (p=3) → right       (no conflict, keeps first choice)
 *   Portland (p=2) → left        (right overlaps Seattle's label)
 *   Chicago  (p=4) → right       (isolated, keeps first choice)
 *   New York (p=4) → left        (no conflict, keeps first choice)
 *   Philadelphia (p=3) → left    (no conflict with New York)
 *   Washington   (p=2) → right   (left overlaps Philadelphia's label)
 *
 * Dot positions (not rendered) and label geometry used to engineer conflicts:
 *   Seattle    dot (80, 70): right label (85,62)-(133,78)
 *   Portland   dot (76, 80): right label (81,72)-(137,88) → y-overlap with Seattle ✓
 *   Philadelphia dot (408,110): left label (339,102)-(403,118)
 *   Washington   dot (405,124): left label (336,116)-(400,132) → y-overlap with Philly ✓
 */
export const CityLabels: StoryObj = {
  ...Default,
  args: {
    parent: {
      coords: { x: 0, y: 0, width: 520, height: 220 },
    },
    labelGroups: [
      // Pacific Northwest — two vertically close cities on the left coast
      {
        technique: 'choices',
        priority: 3,
        nodes: [
          { coords: { x: 85, y: 62, width: 48, height: 16 }, textContent: 'Seattle' },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(85, 62)'), // right
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(27, 62)'), // left
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(56, 75)'), // below
        ],
      },
      {
        technique: 'choices',
        priority: 2,
        nodes: [
          { coords: { x: 81, y: 72, width: 56, height: 16 }, textContent: 'Portland' },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(81, 72)'), // right — overlaps Seattle
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(15, 72)'), // left — clear
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(48, 85)'), // below
        ],
      },
      // Midwest — isolated, keeps first choice
      {
        technique: 'choices',
        priority: 4,
        nodes: [
          { coords: { x: 290, y: 100, width: 50, height: 16 }, textContent: 'Chicago' },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(290, 100)'), // right
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(230, 100)'), // left
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(260, 82)'), // above
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(260, 116)'), // below
        ],
      },
      // Northeast corridor — left-side preference, cascading conflict
      {
        technique: 'choices',
        priority: 4,
        nodes: [
          { coords: { x: 359, y: 82, width: 56, height: 16 }, textContent: 'New York' },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(359, 82)'), // left
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(425, 82)'), // right
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(392, 63)'), // above
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(392, 98)'), // below
        ],
      },
      {
        technique: 'choices',
        priority: 3,
        nodes: [
          {
            coords: { x: 339, y: 102, width: 64, height: 16 },
            textContent: 'Philadelphia',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(339, 102)'), // left
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(413, 102)'), // right
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(376, 83)'), // above
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(376, 118)'), // below
        ],
      },
      {
        technique: 'choices',
        priority: 2,
        nodes: [
          {
            coords: { x: 336, y: 116, width: 64, height: 16 },
            textContent: 'Washington',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(336, 116)'), // left — overlaps Philadelphia
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(410, 116)'), // right — clear
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(373, 97)'), // above
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(373, 132)'), // below
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
