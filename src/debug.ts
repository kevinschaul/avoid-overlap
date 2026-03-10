import type RBush from 'rbush';
import type { Bounds, Body } from './index';

export interface ScoredDebugLabel {
  text: string;
  technique: string;
  priority: number;
  weight: number;
  bestChoice: number;    // -1 = hidden
  choiceScore: number;
  totalContribution: number;
  nChoices: number;
}

export interface ScoredDebugInfo {
  uid: number;
  labels: ScoredDebugLabel[];
  bestScore: number;
  maxPossibleScore: number;
  applyOriginal: () => void;
  applyFinal: () => void;
}

const scale = (domain: number[], range: number[], value: number): number => {
  const result =
    range[0] +
    ((range[1] - range[0]) / (domain[1] - domain[0])) * (value - domain[0]);
  if (Number.isNaN(result)) {
    return range[0];
  }
  return result;
};

export default function defaultDebugFunc(
  tree: RBush<Body>,
  parentBounds: Bounds,
  uid: number
) {
  const bodies = tree.all();

  // TODO build a unique class name so we can support multiple instances on the same page
  const debugClassName = `avoid-overlap-debugger avoid-overlap-debugger-${uid}`;
  const root = document.querySelector('body');

  if (root) {
    let debugEl = root.querySelector(`.${debugClassName}`);
    if (!debugEl) {
      debugEl = document.createElement('div');
      root.append(debugEl);
    }

    const colors = [
      '#e41a1c',
      '#377eb8',
      '#4daf4a',
      '#984ea3',
      '#ff7f00',
      '#ffff33',
      '#a65628',
      '#f781bf',
      '#999999',
    ];

    // TODO rewrite this by actually creating nodes, adding attributes, etc.
    debugEl.outerHTML = `
          <div class="${debugClassName}" style="position: absolute; top:${
      parentBounds.y + window.scrollY
    }px; left:${parentBounds.x + window.scrollX}px; z-index: 10000;">
            <svg width="${parentBounds.width}" height="${parentBounds.height}">
              ${bodies
                .map((body, bodyI) => {
                  const nPositions = body.positionHistory.length;
                  const color = colors[bodyI % colors.length];

                  return `<g data-text="${body.node.textContent}">
                  ${body.positionHistory
                    .map((position, positionI) => {
                      const opacity = scale(
                        [nPositions - 1, 0],
                        [0.7, 0.4],
                        positionI
                      );
                      return `
                    <path d="
                        M${position.minX},${position.minY}
                        L${position.maxX},${position.minY}
                        L${position.maxX},${position.maxY}
                        L${position.minX},${position.maxY}
                        Z
                      "
                      style="stroke: #000; fill: ${color}; opacity: ${opacity};"
                      />
                    <text x=${position.minX + 2} y=${
                        position.minY + 13
                      } style="font-size: 14px">${bodyI}:${positionI}</text>
                  `;
                    })
                    .join('')}</g>`;
                })
                .join('')}
            </svg>
          </div>
        `;
  }
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function defaultScoredDebugFunc(info: ScoredDebugInfo) {
  const panelId = `avoid-overlap-scored-debug-${info.uid}`;
  let existing = document.getElementById(panelId);
  if (existing) existing.remove();

  // ── Top bar (collapsed by default) ──────────────────────────────────────
  const bar = document.createElement('div');
  bar.id = panelId;
  bar.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:100000',
    'background:#1a1a2e', 'color:#e0e0e0', 'font-family:monospace',
    'font-size:12px', 'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
  ].join(';');

  // Header row — always visible
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 12px;';

  const btnStyle = (active: boolean) => [
    'padding:2px 10px', 'border:1px solid #555', 'border-radius:3px',
    'cursor:pointer', 'font-family:monospace', 'font-size:11px',
    active ? 'background:#4a90d9;color:#fff' : 'background:#2a2a3e;color:#ccc',
  ].join(';');

  const makeBtn = (label: string, onClick: () => void, active = false) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = btnStyle(active);
    btn.addEventListener('click', onClick);
    return btn;
  };

  let btnOriginal: HTMLButtonElement;
  let btnFinal: HTMLButtonElement;

  const setActive = (which: 'original' | 'final') => {
    btnOriginal.style.cssText = btnStyle(which === 'original');
    btnFinal.style.cssText = btnStyle(which === 'final');
  };

  btnOriginal = makeBtn('Original', () => {
    info.applyOriginal();
    setActive('original');
  }) as HTMLButtonElement;
  btnFinal = makeBtn('Final', () => {
    info.applyFinal();
    setActive('final');
  }, true) as HTMLButtonElement;

  // Score summary (inline in header)
  const summary = document.createElement('span');
  summary.style.cssText = 'font-size:12px;font-weight:bold;margin-left:8px;';
  summary.textContent = `Score: ${info.bestScore.toFixed(1)} / ${info.maxPossibleScore.toFixed(1)}`;

  // Expand/collapse toggle
  const expandBtn = document.createElement('button');
  expandBtn.textContent = '\u25BC';
  expandBtn.style.cssText = [
    'margin-left:auto', 'padding:2px 8px', 'border:1px solid #555',
    'border-radius:3px', 'cursor:pointer', 'font-size:11px',
    'background:#2a2a3e', 'color:#ccc',
  ].join(';');

  header.append(btnOriginal, btnFinal, summary, expandBtn);
  bar.append(header);

  // Expandable detail section
  const detail = document.createElement('div');
  detail.style.cssText = 'display:none;padding:4px 12px 8px;max-height:50vh;overflow:auto;';

  const table = document.createElement('table');
  table.style.cssText = 'border-collapse:collapse;width:100%;';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>${
    ['Label', 'Tech', 'Pri', 'Weight', 'Choice', 'Bonus', 'Total']
      .map(h => `<th style="text-align:left;padding:2px 6px;border-bottom:1px solid #444;color:#999;font-size:11px">${h}</th>`)
      .join('')
  }</tr>`;
  table.append(thead);

  const tbody = document.createElement('tbody');
  info.labels.forEach(label => {
    const hidden = label.bestChoice < 0;
    const tr = document.createElement('tr');
    tr.style.cssText = hidden ? 'color:#666;' : '';

    const textDisplay = hidden
      ? `<s>${escapeHtml(label.text)}</s>`
      : escapeHtml(label.text);
    const choiceDisplay = hidden
      ? 'hidden'
      : `${label.bestChoice}/${label.nChoices}`;
    const bonusDisplay = hidden ? '-' : label.choiceScore.toFixed(1);
    const totalDisplay = label.totalContribution.toFixed(1);

    tr.innerHTML = [
      `<td style="padding:2px 6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(label.text)}">${textDisplay}</td>`,
      `<td style="padding:2px 6px">${label.technique}</td>`,
      `<td style="padding:2px 6px">${label.priority}</td>`,
      `<td style="padding:2px 6px">${label.weight.toFixed(1)}</td>`,
      `<td style="padding:2px 6px">${choiceDisplay}</td>`,
      `<td style="padding:2px 6px">${bonusDisplay}</td>`,
      `<td style="padding:2px 6px">${totalDisplay}</td>`,
    ].join('');
    tbody.append(tr);
  });
  table.append(tbody);
  detail.append(table);
  bar.append(detail);

  let expanded = false;
  expandBtn.addEventListener('click', () => {
    expanded = !expanded;
    detail.style.display = expanded ? 'block' : 'none';
    expandBtn.textContent = expanded ? '\u25B2' : '\u25BC';
  });

  document.body.append(bar);
}
