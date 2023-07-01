# avoid-overlap

Functions to help avoid text annotation/label overlaps

This API is very likely to change!

## Installation

    npm install avoid-overlap

## Usage

This module exports two types of overlap avoider functions, depending on how you want overlaps to be resolved: nudge or choices.

In both cases, you'll pass in the parent Element, an array of label groups that define how to resolve overlaps, and global options.

### `avoidOverlapNudge()`

Use this when you want any overlapping labels to be nudged in a certain direction. This can be helpful if the thing you're labeling is large. The lower-priority label will be nudged until it no longer overlaps.

```js
import { avoidOverlapNudge } from 'avoid-overlap';
import { select, selectAll } from 'd3-selection';

const parent = select('.chart');
const headers = selectAll('.label-header');
const subheads = selectAll('.label-subhead');

avoidOverlapNudge(
  parent,
  [
    {
      nodes: headers.nodes(),
      render: () => {},
      priority: 1,
    },
    {
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

#### Options

| option | type | default | description |
+--------+------+---------+-------------+
| includeParent | boolean | `false` | Whether to consider the parent as part of the bounds |
| parentMargin | object | `{ top: 0, right: 0, bottom: 0, left: 0 }` | How much extra spacing to consider for collisions with the parent |
| maxAttempts | number | 3 | How many iterations to try finding collisions before giving up |

### `avoidOverlapChoices()`

Use this when you have a few valid choices for positining labels. This can be helpful for drawing arrows, for example, when you could put the label above or below the thing you're labeling.

```js
import { avoidOverlapChoices } from 'avoid-overlap';
import { select, selectAll } from 'd3-selection';

const parent = select('.chart');
const arrows = selectAll('.label-arrow');

const arrowTop = (node) => {
  /* TODO draw the arrow at the top */
};
const arrowBottom = (node) => {
  /* TODO draw the arrow at the bottom */
};

avoidOverlapChoices(
  parent,
  [
    {
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

#### Options

TODO list these

## Development

Development should happen on feature branches, which should be PR-ed into the main branch.

Releasing happens using the [release-please](https://github.com/marketplace/actions/release-please-action) GitHub action. The action handles versioning, changelogs and publishing the package to npm.
