import type RBush from 'rbush';
import type { Bounds, Body } from './index';

const COLORS = [
  '#e41a1c',
  '#377eb8',
  '#4daf4a',
  '#984ea3',
  '#ff7f00',
  '#a65628',
  '#f781bf',
  '#999999',
];

interface Pos {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface BodyState {
  body: Body;
  pos: Pos;
  prevPos: Pos | null;
  movedAtThisStep: boolean;
  color: string;
  label: string;
}

const getStateAtStep = (bodies: Body[], step: number): BodyState[] => {
  const result: BodyState[] = [];
  bodies.forEach((body, bodyI) => {
    const before = body.positionHistory.filter((e) => e.step <= step);
    if (before.length === 0) return;

    const current = before[before.length - 1];
    const movedAtThisStep = current.step === step;
    const earlier = body.positionHistory.filter((e) => e.step < step);
    const prev = movedAtThisStep && earlier.length > 0 ? earlier[earlier.length - 1] : null;

    result.push({
      body,
      pos: { minX: current.minX, minY: current.minY, maxX: current.maxX, maxY: current.maxY },
      prevPos: prev ? { minX: prev.minX, minY: prev.minY, maxX: prev.maxX, maxY: prev.maxY } : null,
      movedAtThisStep,
      color: COLORS[bodyI % COLORS.length],
      label: (body.node.textContent?.trim() || `label ${bodyI}`).slice(0, 24),
    });
  });
  return result;
};

const getStepMessage = (bodies: Body[], step: number): string => {
  for (const body of bodies) {
    for (const entry of body.positionHistory) {
      if (entry.step === step) {
        const label = body.node.textContent?.trim() || '?';
        return `"${label.slice(0, 30)}": ${entry.message}`;
      }
    }
  }
  return '';
};

const svgNS = 'http://www.w3.org/2000/svg';

const makeSvgEl = (tag: string, attrs: Record<string, string>) => {
  const el = document.createElementNS(svgNS, tag);
  Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
  return el;
};

const renderSvg = (
  svg: SVGSVGElement,
  bodies: Body[],
  step: number,
  uid: number
) => {
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // Arrow marker def
  const defs = makeSvgEl('defs', {});
  const marker = makeSvgEl('marker', {
    id: `ao-arrow-${uid}`,
    markerWidth: '8',
    markerHeight: '8',
    refX: '6',
    refY: '3',
    orient: 'auto',
  });
  marker.appendChild(makeSvgEl('path', { d: 'M0,0 L0,6 L7,3 z', fill: '#333' }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  const state = getStateAtStep(bodies, step);

  for (const s of state) {
    const g = makeSvgEl('g', {});

    // Ghost of previous position + movement arrow
    if (s.prevPos) {
      const ghost = makeSvgEl('rect', {
        x: `${s.prevPos.minX}`,
        y: `${s.prevPos.minY}`,
        width: `${s.prevPos.maxX - s.prevPos.minX}`,
        height: `${s.prevPos.maxY - s.prevPos.minY}`,
        fill: 'none',
        stroke: s.color,
        'stroke-dasharray': '4 2',
        'stroke-width': '1.5',
        opacity: '0.55',
      });
      g.appendChild(ghost);

      // Arrow from center of prev to center of current
      const cx1 = (s.prevPos.minX + s.prevPos.maxX) / 2;
      const cy1 = (s.prevPos.minY + s.prevPos.maxY) / 2;
      const cx2 = (s.pos.minX + s.pos.maxX) / 2;
      const cy2 = (s.pos.minY + s.pos.maxY) / 2;
      g.appendChild(
        makeSvgEl('line', {
          x1: `${cx1}`,
          y1: `${cy1}`,
          x2: `${cx2}`,
          y2: `${cy2}`,
          stroke: s.color,
          'stroke-width': '2',
          'marker-end': `url(#ao-arrow-${uid})`,
        })
      );
    }

    // Current bounding box
    const rect = makeSvgEl('rect', {
      x: `${s.pos.minX}`,
      y: `${s.pos.minY}`,
      width: `${s.pos.maxX - s.pos.minX}`,
      height: `${s.pos.maxY - s.pos.minY}`,
      fill: s.color,
      opacity: s.movedAtThisStep ? '0.65' : '0.25',
      stroke: s.movedAtThisStep ? '#000' : 'none',
      'stroke-width': '2',
    });
    g.appendChild(rect);

    // Label text
    const text = makeSvgEl('text', {
      x: `${s.pos.minX + 3}`,
      y: `${s.pos.minY + 13}`,
      'font-size': '11',
      fill: '#000',
    });
    text.textContent = s.label;
    g.appendChild(text);

    svg.appendChild(g);
  }
};

export const defaultDebugFunc = (
  tree: RBush<Body>,
  parentBounds: Bounds,
  uid: number
) => {
  const allBodies = tree.all();
  // Non-static bodies for the main view; all bodies contribute to step range
  const labelBodies = allBodies.filter((b) => !b.isStatic);

  const allSteps = allBodies.flatMap((b) => b.positionHistory.map((e) => e.step));
  const maxStep = allSteps.length > 0 ? Math.max(...allSteps) : 0;

  const root = document.querySelector('body');
  if (!root) return;

  // Remove any previous debug elements for this uid
  root.querySelectorAll(`.avoid-overlap-debugger-${uid}`).forEach((el) => el.remove());

  const debugClass = `avoid-overlap-debugger avoid-overlap-debugger-${uid}`;

  // SVG overlay — sits on top of the parent element, pointer-events: none
  const overlayEl = document.createElement('div');
  overlayEl.className = debugClass;
  overlayEl.style.cssText = [
    'position: absolute',
    `top: ${parentBounds.y + window.scrollY}px`,
    `left: ${parentBounds.x + window.scrollX}px`,
    'z-index: 10000',
    'pointer-events: none',
  ].join('; ');

  const svg = document.createElementNS(svgNS, 'svg') as SVGSVGElement;
  svg.setAttribute('width', `${parentBounds.width}`);
  svg.setAttribute('height', `${parentBounds.height}`);
  overlayEl.appendChild(svg);
  root.appendChild(overlayEl);

  // Control panel — fixed bottom-right corner
  const panelEl = document.createElement('div');
  panelEl.className = debugClass;
  panelEl.style.cssText = [
    'position: fixed',
    'bottom: 20px',
    'right: 20px',
    'background: #fff',
    'border: 1px solid #bbb',
    'border-radius: 6px',
    'padding: 12px 16px',
    'z-index: 10001',
    'font-family: monospace',
    'font-size: 12px',
    'box-shadow: 0 2px 10px rgba(0,0,0,0.18)',
    'min-width: 320px',
    'max-width: 420px',
  ].join('; ');

  const prevId = `ao-prev-${uid}`;
  const nextId = `ao-next-${uid}`;
  const sliderId = `ao-slider-${uid}`;
  const currentId = `ao-current-${uid}`;
  const messageId = `ao-message-${uid}`;
  const legendId = `ao-legend-${uid}`;

  panelEl.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px;">
      avoid-overlap debug
    </div>
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
      <button id="${prevId}" style="padding: 3px 9px; cursor: pointer; font-size: 13px;">&#9664;</button>
      <input type="range" id="${sliderId}" min="0" max="${maxStep}" value="0"
             style="flex: 1; cursor: pointer;">
      <button id="${nextId}" style="padding: 3px 9px; cursor: pointer; font-size: 13px;">&#9654;</button>
    </div>
    <div style="margin-bottom: 5px; color: #444;">
      Step <b id="${currentId}">0</b> of ${maxStep}
    </div>
    <div id="${messageId}"
         style="color: #555; font-style: italic; white-space: nowrap; overflow: hidden;
                text-overflow: ellipsis; margin-bottom: 8px; min-height: 1.2em;">
    </div>
    <div id="${legendId}" style="display: flex; flex-wrap: wrap; gap: 5px;"></div>
  `;

  root.appendChild(panelEl);

  // Populate legend
  const legendEl = panelEl.querySelector(`#${legendId}`)!;
  labelBodies.forEach((body, i) => {
    const lbl = (body.node.textContent?.trim() || `label ${i}`).slice(0, 18);
    const chip = document.createElement('span');
    chip.style.cssText = [
      `background: ${COLORS[i % COLORS.length]}`,
      'color: #fff',
      'padding: 2px 7px',
      'border-radius: 3px',
      'font-size: 11px',
    ].join('; ');
    chip.textContent = lbl;
    legendEl.appendChild(chip);
  });

  let currentStep = 0;

  const goToStep = (step: number) => {
    currentStep = step;

    const sliderEl = panelEl.querySelector<HTMLInputElement>(`#${sliderId}`)!;
    const currentEl = panelEl.querySelector(`#${currentId}`)!;
    const messageEl = panelEl.querySelector(`#${messageId}`)!;

    sliderEl.value = `${step}`;
    currentEl.textContent = `${step}`;
    messageEl.textContent = getStepMessage(allBodies, step);

    renderSvg(svg, labelBodies, step, uid);
  };

  panelEl.querySelector(`#${prevId}`)!.addEventListener('click', () => {
    goToStep(Math.max(0, currentStep - 1));
  });

  panelEl.querySelector(`#${nextId}`)!.addEventListener('click', () => {
    goToStep(Math.min(maxStep, currentStep + 1));
  });

  panelEl.querySelector(`#${sliderId}`)!.addEventListener('input', (e) => {
    goToStep(parseInt((e.target as HTMLInputElement).value));
  });

  // Start at the final state so the user sees the end result first
  goToStep(maxStep);
};
