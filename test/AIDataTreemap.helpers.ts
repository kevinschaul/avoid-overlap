import * as d3 from 'd3';

// @ts-expect-error — Vite raw import
import hierarchyRaw from './data/hierarchy.csv?raw';

// ── Constants (internal only) ───────────────────────────────────────────────
const SWOOP = 24;
const SWOOP_PAD = 4;
const FONT_DOMAIN = 14;
const FONT_MAIN = 16;
const TM_PADDING = 2.8;
const TILE_FILL = '#dfe1ee'; // $indigo-10
const DOMAIN_STROKE = '#e6c300'; // highlighted domain outline
const ARROW_STROKE = '#3a403d';
const ACTIVE_CATEGORY = 'Business & Industrial';
const NON_BIZ_OPACITY = 0.55; // dim non-business tiles
const LABEL_DIM_COLOR = '#9aa0a6'; // lighter text for non-business categories

// Manually overridden arrow directions (desktop) from the real component
const ARROW_DIRECTION_OVERRIDES: Record<string, string> = {
  'coursera.org': 'top-left',
  'scribd.com': 'bottom-right',
  'journals.plos.org': 'top-right',
  'city-data.com': 'bottom-right',
  'itunes.apple.com': 'bottom-right',
  'kickstarter.com': 'bottom-right',
  'coloradovoters.info': 'top-left',
};

export const ACTIVE_DOMAINS = [
  'patents.google.com',
  'wikipedia.org',
  'scribd.com',
];

export const ACTIVE_DOMAINS_MANY = [
  'patents.google.com',
  'wikipedia.org',
  'scribd.com',
  'nytimes.com',
  'journals.plos.org',
  'latimes.com',
  'theguardian.com',
  'forbes.com',
  'washingtonpost.com',
  'coursera.org',
  'fool.com',
  'frontiersin.org',
  'instructables.com',
  'businessinsider.com',
  'kickstarter.com',
  'booking.com',
  'theatlantic.com',
  'aljazeera.com',
  'medium.com',
  'coloradovoters.info',
];

// ── Arrow geometry ─────────────────────────────────────────────────────────
type ArrowConfig = {
  anchorX: (d: any) => number;
  anchorY: (d: any) => number;
  path: string;
  textOffset: [number, number];
  textAnchor: string;
};

function getArrowConfig(
  direction: string,
  _chartWidth: number,
  _chartHeight: number,
): ArrowConfig {
  const s = SWOOP;
  const p = SWOOP_PAD;
  switch (direction) {
    case 'top-left':
      return {
        anchorX: (d) => (d.x0 + d.x1) / 2,
        anchorY: (d) => d.y0,
        path: `M ${-s} ${-s - p - 1} L ${-s + 9} ${-s - p - 1} Q 0 ${
          -s - p - 1
        } 0 ${-s + 9} L 0 ${-p - 1} L 0 ${-p}`,
        textOffset: [-s - p, -s],
        textAnchor: 'end',
      };
    case 'top-right':
      return {
        anchorX: (d) => (d.x0 + d.x1) / 2,
        anchorY: (d) => d.y0,
        path: `M ${s} ${-s - p - 1} L ${s - 9} ${-s - p - 1} Q 0 ${
          -s - p - 1
        } 0 ${-s + 9} L 0 ${-p - 1} L 0 ${-p}`,
        textOffset: [s + p, -s],
        textAnchor: 'start',
      };
    case 'bottom-left':
      return {
        anchorX: (d) => (d.x0 + d.x1) / 2,
        anchorY: (d) => d.y1,
        path: `M ${-s} ${s + p + 1} L ${-s + 9} ${s + p + 1} Q 0 ${
          s + p + 1
        } 0 ${s - 9} L 0 ${p + 1} L 0 ${p}`,
        textOffset: [-s - p, s + FONT_DOMAIN - 2],
        textAnchor: 'end',
      };
    case 'bottom-right':
      return {
        anchorX: (d) => (d.x0 + d.x1) / 2,
        anchorY: (d) => d.y1,
        path: `M ${s} ${s + p + 1} L ${s - 9} ${s + p + 1} Q 0 ${s + p + 1} 0 ${
          s - 9
        } L 0 ${p + 1} L 0 ${p}`,
        textOffset: [s + p, s + FONT_DOMAIN - 2],
        textAnchor: 'start',
      };
    case 'middle-right':
      return {
        anchorX: (d) => d.x1,
        anchorY: (d) => (d.y0 + d.y1) / 2,
        path: `M ${s + p} 0 L ${p} 0`,
        textOffset: [s + p + 4, 4],
        textAnchor: 'start',
      };
    case 'middle-left':
      return {
        anchorX: (d) => d.x0,
        anchorY: (d) => (d.y0 + d.y1) / 2,
        path: `M ${-s - p} 0 L ${-p} 0`,
        textOffset: [-s - p - 4, 4],
        textAnchor: 'end',
      };
    case 'middle-up':
      return {
        anchorX: (d) => (d.x0 + d.x1) / 2,
        anchorY: (d) => d.y0,
        path: `M 0 ${-s - p} L 0 ${-p}`,
        textOffset: [0, -s - p - 4],
        textAnchor: 'middle',
      };
    case 'middle-down':
    default:
      return {
        anchorX: (d) => (d.x0 + d.x1) / 2,
        anchorY: (d) => d.y1,
        path: `M 0 ${s - p} L 0 ${p}`,
        textOffset: [0, s + p + 4],
        textAnchor: 'middle',
      };
  }
}

// ── Exported utility functions ─────────────────────────────────────────────

export const ALL_DIRECTIONS = [
  'top-left',
  'bottom-right',
  'top-right',
  'bottom-left',
  'middle-right',
  'middle-left',
  'middle-up',
  'middle-down',
];

export function pickDirection(
  d: any,
  chartWidth: number,
  chartHeight: number,
): string {
  if (d.id in ARROW_DIRECTION_OVERRIDES) return ARROW_DIRECTION_OVERRIDES[d.id];
  if (d.x0 - 100 < 0) return d.y0 - 100 < 0 ? 'bottom-right' : 'top-right';
  if (chartWidth - d.x1 < 100)
    return d.y0 - 100 < 0 ? 'bottom-left' : 'top-left';
  if (d.y0 - 100 < 0) return 'bottom-left';
  if (chartHeight - d.y1 < 100) return 'top-left';
  return 'top-left';
}

export function nudgeRender(node: Element, dx: number, dy: number) {
  const m = (node.getAttribute('transform') || 'translate(0,0)').match(
    /translate\(([^,]+),\s*([^)]+)\)/,
  );
  const x = m ? parseFloat(m[1]) : 0;
  const y = m ? parseFloat(m[2]) : 0;
  node.setAttribute('transform', `translate(${x + dx},${y + dy})`);
}

export function makeChoice(
  dir: string,
  d: any,
  chartWidth: number,
  chartHeight: number,
) {
  return (node: Element) => {
    const cfg = getArrowConfig(dir, chartWidth, chartHeight);
    node.setAttribute(
      'transform',
      `translate(${cfg.anchorX(d)},${cfg.anchorY(d)})`,
    );
    const sel = d3.select(node);
    sel.select('path').attr('d', cfg.path);
    sel
      .select('text')
      .attr('text-anchor', cfg.textAnchor)
      .attr(
        'transform',
        `translate(${cfg.textOffset[0]},${cfg.textOffset[1]})`,
      );
  };
}

// ── Chart builders ─────────────────────────────────────────────────────────

export function makeContainer(): HTMLDivElement {
  const div = document.createElement('div');
  div.style.width = '100%';
  div.style.maxWidth = '960px';
  div.style.margin = '0 auto';
  return div;
}

export function buildTreemapChart(
  container: HTMLElement,
  activeDomains: string[] = [],
) {
  document
    .querySelectorAll('[id^="avoid-overlap-scored-debug"]')
    .forEach((n) => n.remove());

  const margin = { top: 10, right: 16, bottom: 10, left: 16 };
  const totalWidth = 960;
  const totalHeight = Math.round(totalWidth * 0.55);
  const chartWidth = totalWidth - margin.left - margin.right;
  const chartHeight = totalHeight - margin.top - margin.bottom;

  // Parse and build hierarchy
  const csvData = d3.csvParse(hierarchyRaw as unknown as string);
  const root = (
    d3
      .stratify<any>()
      .id((d) => d.name)
      .parentId((d) => d.parent)(csvData) as any
  )
    .sum((d: any) => +d.tokens || 0)
    .sort((a: any, b: any) => b.value - a.value);

  const tm = d3
    .treemap<any>()
    .size([chartWidth, chartHeight])
    .paddingInner((d: any) => (d.depth === 0 ? TM_PADDING : 0))
    .round(true)(root);

  // ── SVG scaffold ───────────────────────────────────────────────────────────
  const svgSel = d3
    .create('svg')
    .attr('width', totalWidth)
    .attr('height', totalHeight)
    .style('font-family', 'Franklin, Arial, Helvetica, sans-serif')
    .style('display', 'block');

  // Arrow marker
  svgSel
    .append('defs')
    .append('marker')
    .attr('id', 'tm-arrow')
    .attr('viewBox', '-10 -10 20 20')
    .attr('markerWidth', 10)
    .attr('markerHeight', 10)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-6.75,-6.75 L 0,0 L -6.75,6.75')
    .style('fill', 'none')
    .style('stroke', ARROW_STROKE)
    .style('stroke-width', 2);

  const g = svgSel
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const gRect = g.append('g').attr('class', 'rect');
  const gText = g.append('g').attr('class', 'text');

  const dataMainCategory: any[] = tm
    .descendants()
    .filter((d: any) => d.depth === 1 && d.id !== 'NA');

  // ── Category tiles ─────────────────────────────────────────────────────────
  gRect
    .selectAll('.node-main-category-rect')
    .data(dataMainCategory)
    .join('g')
    .attr('class', 'node-main-category-rect')
    .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
    .append('rect')
    .attr('width', (d: any) => d.x1 - d.x0)
    .attr('height', (d: any) => d.y1 - d.y0)
    .attr('rx', 5)
    .style('fill', TILE_FILL)
    .style('stroke', '#fff')
    .style('stroke-width', 1);

  // ── Category text labels (nudged by avoid-overlap) ─────────────────────────
  const nodeMainCategoryText = gText
    .selectAll<SVGTextElement, any>('.node-main-category-text')
    .data(dataMainCategory)
    .join('text')
    .attr('class', 'node-main-category-text')
    .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
    .style('font-size', `${FONT_MAIN}px`)
    .style('fill', '#1a1a1a');

  nodeMainCategoryText
    .append('tspan')
    .attr('x', 6)
    .attr('y', 2 + FONT_MAIN)
    .text((d: any) => d.id);

  // ── Domain highlight tiles ─────────────────────────────────────────────────
  const dataDomain: any[] = tm
    .descendants()
    .filter((d: any) => activeDomains.includes(d.id));

  const nodeDomainRectGroups = gRect
    .selectAll<SVGGElement, any>('.node-domain-rect')
    .data(dataDomain)
    .join('g')
    .attr('class', 'node-domain-rect')
    .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

  nodeDomainRectGroups
    .append('rect')
    .attr('width', (d: any) => d.x1 - d.x0)
    .attr('height', (d: any) => d.y1 - d.y0)
    .attr('rx', 1)
    .style('fill', '#ffdb16')
    .style('stroke', DOMAIN_STROKE)
    .style('stroke-width', 2);

  // ── Domain annotation groups (arrow + label) ───────────────────────────────
  const nodeDomainText = gText
    .selectAll<SVGGElement, any>('g.node-domain-text')
    .data(dataDomain)
    .join('g')
    .attr('class', 'node-domain-text')
    .attr('transform', (d: any) => {
      // Initial position: default direction anchor
      const dir = pickDirection(d, chartWidth, chartHeight);
      const cfg = getArrowConfig(dir, chartWidth, chartHeight);
      return `translate(${cfg.anchorX(d)},${cfg.anchorY(d)})`;
    });

  // Draw initial arrow + text using default direction
  nodeDomainText.each(function (d: any) {
    const dir = pickDirection(d, chartWidth, chartHeight);
    const cfg = getArrowConfig(dir, chartWidth, chartHeight);
    const sel = d3.select(this);

    sel
      .append('path')
      .attr('d', cfg.path)
      .attr('marker-end', 'url(#tm-arrow)')
      .style('stroke', ARROW_STROKE)
      .style('fill', 'none')
      .style('stroke-width', 2);

    sel
      .append('text')
      .text(d.id)
      .attr('text-anchor', cfg.textAnchor)
      .attr('transform', `translate(${cfg.textOffset[0]},${cfg.textOffset[1]})`)
      .style('font-size', `${FONT_DOMAIN}px`)
      .style('font-weight', 'bold')
      .style('fill', ARROW_STROKE)
      .style('stroke', 'rgba(255,255,255,0.7)')
      .style('stroke-width', 3)
      .style('paint-order', 'stroke');
  });

  // Attach SVG to DOM
  const svgNode = svgSel.node()!;
  container.appendChild(svgNode);

  return {
    svgNode,
    dataDomain,
    nodeDomainRectGroups,
    nodeDomainText,
    nodeMainCategoryText,
    chartWidth,
    chartHeight,
  };
}

export function buildBusinessNudgeChart(container: HTMLElement) {
  document
    .querySelectorAll('[id^="avoid-overlap-scored-debug"]')
    .forEach((n) => n.remove());

  const margin = { top: 10, right: 16, bottom: 10, left: 16 };
  const totalWidth = 960;
  const totalHeight = Math.round(totalWidth * 0.55);
  const chartWidth = totalWidth - margin.left - margin.right;
  const chartHeight = totalHeight - margin.top - margin.bottom;

  const csvData = d3.csvParse(hierarchyRaw as unknown as string);
  const root = (
    d3
      .stratify<any>()
      .id((d) => d.name)
      .parentId((d) => d.parent)(csvData) as any
  )
    .sum((d: any) => +d.tokens || 0)
    .sort((a: any, b: any) => b.value - a.value);

  const tm = d3
    .treemap<any>()
    .size([chartWidth, chartHeight])
    .paddingInner((d: any) => (d.depth === 0 ? TM_PADDING : 0))
    .round(true)(root);

  const svgSel = d3
    .create('svg')
    .attr('width', totalWidth)
    .attr('height', totalHeight)
    .style('font-family', 'Franklin, Arial, Helvetica, sans-serif')
    .style('display', 'block');

  const g = svgSel
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  const gRect = g.append('g').attr('class', 'rect');
  const gText = g.append('g').attr('class', 'text');

  const dataMainCategory: any[] = tm
    .descendants()
    .filter((d: any) => d.depth === 1 && d.id !== 'NA');
  const dataBusinessSub: any[] = tm
    .descendants()
    .filter((d: any) => d.depth === 2 && d.parent?.id === ACTIVE_CATEGORY);

  // ── Main-category tiles (non-business dimmed) ──────────────────────────────
  gRect
    .selectAll('.node-main-category-rect')
    .data(dataMainCategory)
    .join('g')
    .attr('class', 'node-main-category-rect')
    .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
    .append('rect')
    .attr('width', (d: any) => d.x1 - d.x0)
    .attr('height', (d: any) => d.y1 - d.y0)
    .attr('rx', 5)
    .style('fill', TILE_FILL)
    .style('stroke', '#fff')
    .style('stroke-width', 1)
    .style('opacity', (d: any) =>
      d.id === ACTIVE_CATEGORY ? 1 : NON_BIZ_OPACITY,
    );

  // ── Business sub-category tiles ────────────────────────────────────────────
  gRect
    .selectAll('.node-sub-category-rect')
    .data(dataBusinessSub)
    .join('g')
    .attr('class', 'node-sub-category-rect')
    .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
    .append('rect')
    .attr('width', (d: any) => d.x1 - d.x0)
    .attr('height', (d: any) => d.y1 - d.y0)
    .attr('rx', 1)
    .style('fill', '#ffdb16')
    .style('stroke', DOMAIN_STROKE)
    .style('stroke-width', 2);

  // ── Main-category text (dimmed for non-business) ───────────────────────────
  const nodeMainCategoryText = gText
    .selectAll<SVGTextElement, any>('.node-main-category-text')
    .data(dataMainCategory)
    .join('text')
    .attr('class', 'node-main-category-text')
    .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
    .style('font-size', `${FONT_MAIN}px`)
    .style('font-weight', (d: any) =>
      d.id === ACTIVE_CATEGORY ? 'bold' : 'normal',
    )
    .style('fill', (d: any) =>
      d.id === ACTIVE_CATEGORY ? '#1a1a1a' : LABEL_DIM_COLOR,
    )
    .style('opacity', (d: any) =>
      d.id === ACTIVE_CATEGORY ? 1 : NON_BIZ_OPACITY,
    )
    .style('stroke', 'rgba(255,255,255,0.7)')
    .style('stroke-width', 3)
    .style('paint-order', 'stroke');

  nodeMainCategoryText
    .append('tspan')
    .attr('x', 6)
    .attr('y', 2 + FONT_MAIN)
    .text((d: any) => d.id);

  // ── Business sub-category text labels (nudged) ─────────────────────────────
  const nodeSubCategoryText = gText
    .selectAll<SVGTextElement, any>('.node-sub-category-text')
    .data(dataBusinessSub)
    .join('text')
    .attr('class', 'node-sub-category-text')
    .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
    .style('font-size', `${FONT_DOMAIN}px`)
    .style('fill', '#1a1a1a')
    .style('stroke', 'rgba(255,255,255,0.7)')
    .style('stroke-width', 3)
    .style('paint-order', 'stroke');

  nodeSubCategoryText
    .append('tspan')
    .attr('x', 6)
    .attr('y', 2 + FONT_MAIN)
    .text((d: any) => d.id);

  const svgNode = svgSel.node()!;
  container.appendChild(svgNode);

  return {
    svgNode,
    nodeSubCategoryText,
    nodeMainCategoryText,
    chartWidth,
    chartHeight,
  };
}
