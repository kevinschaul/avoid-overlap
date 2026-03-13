/**
 * Generates the parameters section of README.md from TypeDoc JSON output.
 * Run via: npm run generate-docs
 *
 * Updates the content between <!-- params-start --> and <!-- params-end -->
 * markers in README.md.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmpJson = '/tmp/avoid-overlap-docs.json';

// Generate TypeDoc JSON
execSync(
  `npx typedoc --json ${tmpJson} --entryPoints src/index.ts --tsconfig tsconfig.json --logLevel Error`,
  { cwd: root },
);

const docs = JSON.parse(readFileSync(tmpJson, 'utf8'));

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSummary(comment) {
  if (!comment?.summary) return '';
  // Join text parts and collapse single newlines (mid-paragraph wrapping) to spaces,
  // preserving intentional double-newlines (paragraph breaks).
  return comment.summary
    .map((p) => p.text)
    .join('')
    .replace(/([^\n])\n([^\n])/g, '$1 $2')
    .trim();
}

function getDefault(comment) {
  const tag = comment?.blockTags?.find((t) => t.tag === '@defaultValue');
  if (!tag) return null;
  // TypeDoc wraps defaults in ```ts\n...\n``` — extract the raw value
  const raw = tag.content.map((p) => p.text).join('');
  return raw
    .replace(/^```ts\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
}

function formatType(type) {
  if (!type) return '';
  switch (type.type) {
    case 'intrinsic':
      return `\`${type.name}\``;
    case 'literal':
      return `\`${JSON.stringify(type.value)}\``;
    case 'array': {
      // Expand known union aliases inline rather than showing the type name
      if (type.elementType?.name === 'Direction') {
        return '`"up"` \\| `"down"` \\| `"left"` \\| `"right"`';
      }
      return `\`${formatTypeInner(type.elementType)}[]\``;
    }
    case 'union':
      return type.types.map(formatType).join(' \\| ');
    case 'reference':
      if (type.name === 'Partial') return '`object`';
      if (type.name === 'Direction')
        return '`"up"` \\| `"down"` \\| `"left"` \\| `"right"`';
      return `\`${type.name}\``;
    case 'reflection':
      return '`function`';
    default:
      return `\`${type.type}\``;
  }
}

function formatTypeInner(type) {
  if (!type) return '';
  if (type.type === 'intrinsic') return type.name;
  if (type.type === 'reference') return type.name;
  if (type.type === 'reflection') return 'function';
  if (type.type === 'array') return `${formatTypeInner(type.elementType)}[]`;
  return type.type;
}

function findType(name) {
  return docs.children.find((c) => c.name === name);
}

// Get own properties from a type (not inherited)
function getOwnProps(name) {
  const t = findType(name);
  if (!t) return [];
  // Intersection type: LabelGroupNudge = LabelGroupGeneric & { ... }
  if (t.type?.type === 'intersection') {
    const reflection = t.type.types.find((x) => x.type === 'reflection');
    return reflection?.declaration?.children ?? [];
  }
  // Direct children (interface / type alias)
  return t.children ?? [];
}

function renderProp(name, prop, suffix = '') {
  const summary = getSummary(prop.comment);
  const defaultVal = getDefault(prop.comment);
  const type = formatType(prop.type);

  const desc = [
    suffix ? `*${suffix}*. ` : '',
    summary,
    defaultVal !== null ? ` Default: \`${defaultVal}\`` : '',
  ]
    .join('')
    .trim();

  return `| \`${name}\` | ${type} | ${desc} |`;
}

// ── Build params markdown ─────────────────────────────────────────────────────

const lines = [];

lines.push('| Param | Type | Description |');
lines.push('| - | - | - |');

// labelGroups
lines.push(
  '| `labelGroups` | `object[]` | An array of label groups that define how to resolve overlaps. |',
);
lines.push(
  '| `labelGroups[].technique` | `"nudge" \\| "choices" \\| "fixed"` | The overlap avoidance technique to use. `nudge` shifts labels by a small offset; `choices` picks from a list of candidate positions; `fixed` treats nodes as immovable obstacles. |',
);

// Common props from LabelGroupGeneric in logical order (skip technique)
const genericOrder = ['nodes', 'margin', 'priority', 'remove', 'onRemove'];
const genericProps = Object.fromEntries(
  getOwnProps('LabelGroupGeneric').map((p) => [p.name, p]),
);
for (const name of genericOrder) {
  if (genericProps[name])
    lines.push(renderProp(`labelGroups[].${name}`, genericProps[name]));
}

// choices-only props (skip technique)
const choicesOrder = ['choices', 'choiceBonuses'];
const choicesProps = Object.fromEntries(
  getOwnProps('LabelGroupChoices').map((p) => [p.name, p]),
);
for (const name of choicesOrder) {
  if (choicesProps[name])
    lines.push(
      renderProp(`labelGroups[].${name}`, choicesProps[name], 'choices only'),
    );
}

// nudge-only props (skip technique — already shown above)
const nudgeOrder = ['render', 'directions', 'maxDistance'];
const nudgeProps = Object.fromEntries(
  getOwnProps('LabelGroupNudge').map((p) => [p.name, p]),
);
for (const name of nudgeOrder) {
  if (nudgeProps[name])
    lines.push(
      renderProp(`labelGroups[].${name}`, nudgeProps[name], 'nudge only'),
    );
}

lines.push('| | | |');

// Options in logical order
const optionsOrder = [
  'includeParent',
  'parentMargin',
  'iterations',
  'temperature',
  'coolingRate',
  'scoreExponent',
  'seed',
  'debug',
];
const optionsProps = Object.fromEntries(
  getOwnProps('Options').map((p) => [p.name, p]),
);
for (const name of optionsOrder) {
  if (optionsProps[name])
    lines.push(renderProp(`options.${name}`, optionsProps[name]));
}

const generated = lines.join('\n');

// ── Splice into README ────────────────────────────────────────────────────────

const readmePath = join(root, 'README.md');
const readme = readFileSync(readmePath, 'utf8');

const startMarker = '<!-- params-start -->';
const endMarker = '<!-- params-end -->';

const startIdx = readme.indexOf(startMarker);
const endIdx = readme.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error(
    'Could not find <!-- params-start --> / <!-- params-end --> markers in README.md',
  );
  process.exit(1);
}

const updated =
  readme.slice(0, startIdx + startMarker.length) +
  '\n\n' +
  generated +
  '\n\n' +
  readme.slice(endIdx);

writeFileSync(readmePath, updated);
console.log('README.md params section updated.');
