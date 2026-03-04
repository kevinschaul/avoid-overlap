import type { Meta, StoryObj } from '@storybook/html';

import { render, play } from './util';

const meta: Meta = {
  title: 'AvoidOverlapAnnealing',
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
 * The canonical case where greedy (choices technique) fails but simulated
 * annealing succeeds.
 *
 * Three labels share a layout with four candidate positions:
 *
 *   pos_left   (0,80)-(60,96)
 *   pos_middle (50,80)-(110,96)  ← conflicts with both pos_left and pos_right
 *   pos_right  (100,80)-(160,96)
 *   pos_top    (0,50)-(60,66)    ← conflicts with nobody
 *
 * Choices:
 *   A (p=3): [pos_middle, pos_top]   — prefers middle
 *   B (p=2): [pos_left,   pos_middle]
 *   C (p=1): [pos_right,  pos_middle]
 *
 * Greedy (choices technique) result:
 *   A grabs pos_middle. B's first choice pos_left conflicts with A's middle
 *   (x overlap 50-60). B's only fallback is pos_middle — also blocked. C
 *   similarly can't use pos_right (x overlap 100-110 with A's middle) or
 *   pos_middle. removeCollisions() removes B and C.
 *
 * SA result (this story):
 *   SA discovers that moving A to pos_top (its second choice) lets B take
 *   pos_left and C take pos_right — all three labels visible, zero overlaps.
 *   Energy(greedy) ≫ Energy(SA) = 1 (A uses choice index 1, B and C use 0).
 */
export const GreedyFails: StoryObj = {
  ...Default,
  args: {
    parent: {
      coords: { x: 0, y: 0, width: 200, height: 140 },
    },
    labelGroups: [
      // A prefers pos_middle; SA moves it to pos_top so B and C can coexist
      {
        technique: 'annealing',
        priority: 3,
        nodes: [
          { coords: { x: 50, y: 80, width: 60, height: 16 }, textContent: 'A' },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(50, 80)'), // pos_middle
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(0, 50)'), // pos_top
        ],
      },
      // B prefers pos_left; blocked by A's middle in greedy, freed by SA
      {
        technique: 'annealing',
        priority: 2,
        nodes: [
          { coords: { x: 0, y: 80, width: 60, height: 16 }, textContent: 'B' },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(0, 80)'), // pos_left
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(50, 80)'), // pos_middle
        ],
      },
      // C prefers pos_right; blocked by A's middle in greedy, freed by SA
      {
        technique: 'annealing',
        priority: 1,
        nodes: [
          {
            coords: { x: 100, y: 80, width: 60, height: 16 },
            textContent: 'C',
          },
        ],
        choices: [
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(100, 80)'), // pos_right
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(50, 80)'), // pos_middle
        ],
      },
    ],
    options: { annealingSeed: 42 },
  },
};

/**
 * Five labels tightly clustered in the center of the canvas, each with six
 * candidate positions (N, NE, E, SE, S, SW, W, NW around the cluster center).
 * All first-choice positions collide; SA jointly optimises the assignment to
 * place every label without overlap.
 *
 * Label: 44 × 14 px.  Cluster center: (100, 100).
 * Candidate ring radius ≈ 28 px from center.
 */
export const DenseCluster: StoryObj = {
  ...Default,
  args: {
    parent: {
      coords: { x: 0, y: 0, width: 240, height: 200 },
    },
    labelGroups: [
      {
        technique: 'annealing',
        priority: 3,
        nodes: [
          {
            coords: { x: 100, y: 65, width: 44, height: 14 },
            textContent: 'Alpha',
          },
        ],
        choices: [
          // N
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(78, 65)'),
          // NE
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(108, 70)'),
          // E
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(115, 93)'),
          // SE
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(108, 116)'),
          // S
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(78, 121)'),
          // SW
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(38, 116)'),
          // W
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(31, 93)'),
          // NW
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(38, 70)'),
        ],
      },
      {
        technique: 'annealing',
        priority: 3,
        nodes: [
          {
            coords: { x: 108, y: 70, width: 44, height: 14 },
            textContent: 'Beta',
          },
        ],
        choices: [
          // NE
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(108, 70)'),
          // E
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(115, 93)'),
          // SE
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(108, 116)'),
          // S
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(78, 121)'),
          // SW
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(38, 116)'),
          // W
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(31, 93)'),
          // NW
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(38, 70)'),
          // N
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(78, 65)'),
        ],
      },
      {
        technique: 'annealing',
        priority: 2,
        nodes: [
          {
            coords: { x: 115, y: 93, width: 44, height: 14 },
            textContent: 'Gamma',
          },
        ],
        choices: [
          // E
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(115, 93)'),
          // SE
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(108, 116)'),
          // S
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(78, 121)'),
          // SW
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(38, 116)'),
          // W
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(31, 93)'),
          // NW
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(38, 70)'),
          // N
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(78, 65)'),
          // NE
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(108, 70)'),
        ],
      },
      {
        technique: 'annealing',
        priority: 2,
        nodes: [
          {
            coords: { x: 38, y: 116, width: 44, height: 14 },
            textContent: 'Delta',
          },
        ],
        choices: [
          // SW
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(38, 116)'),
          // W
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(31, 93)'),
          // NW
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(38, 70)'),
          // N
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(78, 65)'),
          // NE
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(108, 70)'),
          // E
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(115, 93)'),
          // SE
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(108, 116)'),
          // S
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(78, 121)'),
        ],
      },
      {
        technique: 'annealing',
        priority: 1,
        nodes: [
          {
            coords: { x: 31, y: 93, width: 44, height: 14 },
            textContent: 'Epsilon',
          },
        ],
        choices: [
          // W
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(31, 93)'),
          // NW
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(38, 70)'),
          // N
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(78, 65)'),
          // NE
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(108, 70)'),
          // E
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(115, 93)'),
          // SE
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(108, 116)'),
          // S
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(78, 121)'),
          // SW
          (el: Element) =>
            el.setAttributeNS(null, 'transform', 'translate(38, 116)'),
        ],
      },
    ],
    options: { annealingSeed: 42 },
  },
};
