# TODO

## Performance: targeted collision counting in `runScored`

Currently `scoreState()` calls `getCollisions(tree)` on every SA iteration.
That function iterates **all** bodies in the tree and runs a spatial query for
each, making it O(n log n) per step and O(iterations × n log n) overall —
roughly 100–1000× slower than the greedy `run()` for typical inputs.

### The fix

Each SA iteration only moves **one** body (index `i`).  The change in
collision count is therefore local: only the collisions that involved the old
position of body `i` or the new position of body `i` can change.

Instead of recomputing the full collision set, maintain a running
`collisionCount` integer and update it incrementally:

```
// Before the move, count how many other bodies body i overlaps with
oldCollisions = countBodyCollisions(inTree[i], tree)   // O(log n)

// Apply the tree mutation (remove old, insert new) as today

// After the move, count collisions at the new position
newCollisions = countBodyCollisions(newBodyInTree, tree)  // O(log n)

// Update running total
newScore = curScore
  - oldCollisions * overlapPenalty   // remove old body's contribution
  + newCollisions * overlapPenalty   // add new body's contribution
  + (newChoice >= 0 ? bodyWeight(i)  : 0)  // label became visible
  - (oldChoice >= 0 ? bodyWeight(i)  : 0)  // label became hidden
```

`countBodyCollisions(body, tree)` is just `tree.search(body).filter(b => b !==
body).length` — one RBush spatial query, O(log n + k) where k is the number of
overlapping neighbours (typically 0–2).

### Expected impact

| | Current | After fix |
|---|---|---|
| Per-iteration cost | O(n log n) | O(log n) |
| 10 000 iters, n=50 | ~3 M ops | ~60 K ops |
| Estimated wall time | 50–200 ms | < 5 ms |

This brings `runScored` much closer to the greedy algorithm's speed while
keeping all its quality advantages.

### Caveats

- `countBodyCollisions` counts collisions from one side only (body i vs
  others).  The running total must count each pair once, so initialise it by
  summing one-sided counts and dividing by 2, or track pairs explicitly.
- Static bodies (parent boundaries) are already in the tree and will be
  included in `tree.search()` results — that is correct behaviour since a label
  outside the parent boundary should still be penalised.
