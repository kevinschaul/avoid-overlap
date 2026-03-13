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
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmpJson = join(tmpdir(), 'avoid-overlap-docs.json');

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

function formatSignature(sig) {
  if (!sig) return 'function';
  const params = (sig.parameters ?? [])
    .map((p) => `${p.name}: ${formatTypeInner(p.type)}`)
    .join(', ');
  const ret = formatTypeInner(sig.type);
  return `(${params}) => ${ret}`;
}

function resolveReference(name) {
  const t = findType(name);
  if (!t) return null;
  return t.type ?? null;
}

function formatType(type) {
  if (!type) return '';
  switch (type.type) {
    case 'intrinsic':
      return `\`${type.name}\``;
    case 'literal':
      return `\`${JSON.stringify(type.value)}\``;
    case 'array': {
      const elType = type.elementType;
      // Expand reference type aliases (e.g. Direction) inline
      if (elType?.type === 'reference') {
        const resolved = resolveReference(elType.name);
        if (resolved) return formatType({ ...resolved, _arrayOf: true });
      }
      const inner = formatTypeInner(elType);
      const needsParens = elType?.type === 'reflection';
      return needsParens ? `\`(${inner})[]\`` : `\`${inner}[]\``;
    }
    case 'union':
      return type.types.map(formatType).join(' \\| ');
    case 'reference': {
      if (type.name === 'Partial') return '`object`';
      const resolved = resolveReference(type.name);
      if (resolved) return formatType(resolved);
      return `\`${type.name}\``;
    }
    case 'reflection': {
      const sig = type.declaration?.signatures?.[0];
      return sig ? `\`${formatSignature(sig)}\`` : '`function`';
    }
    default:
      return `\`${type.type}\``;
  }
}

function formatTypeInner(type) {
  if (!type) return '';
  if (type.type === 'intrinsic') return type.name;
  if (type.type === 'reference') {
    const resolved = resolveReference(type.name);
    if (resolved) return formatTypeInner(resolved);
    return type.name;
  }
  if (type.type === 'reflection') {
    const sig = type.declaration?.signatures?.[0];
    return sig ? formatSignature(sig) : 'function';
  }
  if (type.type === 'array') {
    const inner = formatTypeInner(type.elementType);
    const needsParens = type.elementType?.type === 'reflection';
    return needsParens ? `(${inner})[]` : `${inner}[]`;
  }
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

function tableHeader() {
  return ['| Param | Type | Description |', '| - | - | - |'];
}

const sections = [];

// labelGroups — common params
{
  const lines = tableHeader();
  const techniqueProps = [
    'LabelGroupNudge',
    'LabelGroupChoices',
    'LabelGroupFixed',
  ]
    .map((name) => {
      const props = Object.fromEntries(
        getOwnProps(name).map((p) => [p.name, p]),
      );
      return props['technique'];
    })
    .filter(Boolean);
  const techniqueType = {
    type: 'union',
    types: techniqueProps.map((p) => p.type),
  };
  // Use comment from first variant (all three share the same description)
  lines.push(
    renderProp('technique', { ...techniqueProps[0], type: techniqueType }),
  );
  const genericOrder = [
    'nodes',
    'margin',
    'priority',
    'allowRemove',
    'onRemove',
  ];
  const genericProps = Object.fromEntries(
    getOwnProps('LabelGroupGeneric').map((p) => [p.name, p]),
  );
  for (const name of genericOrder) {
    if (genericProps[name]) lines.push(renderProp(name, genericProps[name]));
  }
  sections.push('#### `labelGroups` — common params\n\n' + lines.join('\n'));
}

// labelGroups — choices technique
{
  const lines = tableHeader();
  const choicesOrder = ['choices', 'choiceBonuses'];
  const choicesProps = Object.fromEntries(
    getOwnProps('LabelGroupChoices').map((p) => [p.name, p]),
  );
  for (const name of choicesOrder) {
    if (choicesProps[name]) lines.push(renderProp(name, choicesProps[name]));
  }
  sections.push(
    '#### `labelGroups` — `choices` technique\n\n' + lines.join('\n'),
  );
}

// labelGroups — nudge technique
{
  const lines = tableHeader();
  const nudgeOrder = ['render', 'directions', 'maxDistance'];
  const nudgeProps = Object.fromEntries(
    getOwnProps('LabelGroupNudge').map((p) => [p.name, p]),
  );
  for (const name of nudgeOrder) {
    if (nudgeProps[name]) lines.push(renderProp(name, nudgeProps[name]));
  }
  sections.push(
    '#### `labelGroups` — `nudge` technique\n\n' + lines.join('\n'),
  );
}

// options
{
  const lines = tableHeader();
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
    if (optionsProps[name]) lines.push(renderProp(name, optionsProps[name]));
  }
  sections.push('#### `options`\n\n' + lines.join('\n'));
}

const generated = sections.join('\n\n');

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
