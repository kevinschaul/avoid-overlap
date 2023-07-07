# avoid-overlap

Utilities for chart-makers to avoid text overlaps in their graphics. The utilities were build with [D3.js](https://github.com/d3/d3) and [React](https://react.dev/) in mind but likely work with other frameworks.

## Two techniques to avoid overlaps: Nudge and Choices

Labeling charts, maps and other graphics is more art than science, but there are some general rules we can follow to achieve good results programmatically. This library provides two label-avoidance techniques: `nudge` and `choices`.

The `nudge` technique resolves overlaps by simply nudging labels away from each other until they no longer collide. You can limit the nudging to specific directions and distances. This technique works well if the thing you’re labeling is an area rather than a specific point.

The following images, from [a Washington Post graphic](https://www.washingtonpost.com/technology/interactive/2023/ai-chatbot-learning/), demonstrate the `nudge` technique. The labels were passed to `avoid-overlap`, specifying that nudging the labels either down or to the right would work.

| Before | After |
|--------|-------|
| ![Chart with labels overlapping](assets/example-nudge-0.png) | ![Same chart with the overlapping labels nudged so they no longer collide](assets/example-nudge-1.png) |

The `choices` technique resolves overlaps by trying a series of positions provided by the user until it finds a combination that works. This technique works well if some number of different positions might work, for example if you are using a leader line or arrow.

In the following example, the labels were passed to `avoid-overlap` with a list of functions that could draw the label and an arrow in different positions: to the top left, top middle, top right, bottom left, bottom middle and bottom right. The library tries these positions until it finds a combination that works.

| Before | After |
|--------|-------|
| ![Chart with labels overlapping](assets/example-choices-0.png) | ![Same chart with the overlapping labels rendered using one of the provided choices so they no longer collide](assets/example-choices-1.png) |

## Installation

```bash
npm install --save avoid-overlap
```

## Usage

This library provides the class `AvoidOverlap`, which provides the function `.run()`. Each page should use just one `AvoidOverlap` instance.

```js
import { avoidOverlap } from 'avoid-overlap';

// Create an avoid-overlap instance
const avoidOverlap = new AvoidOverlap();

// Place your labels here

// Then, run the avoid overlapper
avoidOverlap.run(/* args here, see table below */);
```

### run(parent, labelGroups, options)

Perform the label avoidance.

Call this after you have positioned all of your labels.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| parent | `Element` | | The parent element, that contains all labels. This can be a `div`, an `svg`, etc. |
| labelGroups | `object[]` | | An array of label groups that define how to resolve overlaps |
| options | `object` | | Global options |
| [options.includeParent] | `boolean` | `false` | Whether to consider the parent as part of the bounds |
| [options.parentMargin] | `object` | `{ top: 0, right: 0, bottom: 0, left: 0 }` | How much extra spacing to consider for collisions with the parent |
| [options.maxAttempts] | `number` | 3 | How many iterations to try finding collisions before giving up |

## Examples

### Example using technique: `nudge`

```js
import { AvoidOverlap } from 'avoid-overlap';
import { select, selectAll } from 'd3-selection';

const parent = select('.chart');
const headers = selectAll('.label-header');
const subheads = selectAll('.label-subhead');

const avoidOverlap = new AvoidOverlap();

avoidOverlap.run(
  parent,
  [
    {
      technique: 'nudge',
      nodes: headers.nodes(),
      render: () => {},
      priority: 1,
    },
    {
      technique: 'nudge',
      nodes: subheads.nodes(),
      priority: 2,
      render: (node, dx, dy) => {
        // Apply the nudge to the node
        const selected = select(node);
        const [x, y] = selected
          .attr('transform')
          .match(/([0-9]+)/g)
          .map((d) => +d);

        select(node).attr('transform', `translate(${x + dx}, ${y + dy})`);
      },
    },
  ],
  {
    includeParent: true,
  }
);
```

### Example using technique: `choices`

```js
import { avoidOverlap } from 'avoid-overlap';
import { select, selectAll } from 'd3-selection';

const parent = select('.chart');
const arrows = selectAll('.label-arrow');

const arrowTop = (node) => {
  /* Draw the arrow at the top */
};
const arrowBottom = (node) => {
  /* Draw the arrow at the bottom */
};

const avoidOverlap = new AvoidOverlap();
avoidOverlap.run(
  parent,
  [
    {
      technique: 'choices',
      nodes: headers.nodes(),
      choices: [arrowTop, arrowBottom],
      priority: 1,
    },
  ],
  {
    includeParent: true,
  }
);
```

## Development

```bash
npm run dev
```

Development should happen on feature branches, which should be PR-ed into the main branch.

Releasing happens using the [release-please](https://github.com/marketplace/actions/release-please-action) GitHub action. The action handles versioning, changelogs and publishing the package to npm.
