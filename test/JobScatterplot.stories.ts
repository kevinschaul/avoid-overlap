import type { Meta, StoryObj } from '@storybook/html';
import * as d3 from 'd3';
import { AvoidOverlap } from '../src/index.js';
import type { LabelGroup } from '../src/index.js';
import { displayRunStats } from './util';

import brookingsRaw from './data/jobs.json';

const meta: Meta = {
  title: 'Real-world/JobScatterplot',
};
export default meta;

// ── Constants mirroring the real DisplacementChart component ─────────────────
const SWOOP = 20;
const SWOOP_PAD = 4;
const FONT_SIZE = 14;

// Approximations of WP design system colors used in the real component
const COLOR_TEAL = '#1a9e96';
const COLOR_GRAY = '#c0c0c0';
const COLOR_ORANGE = '#c44b00';

type Datum = {
  occupation: string;
  employment: number;
  exposure: number;
  adapt: number;
  pct_f: number;
  vulnerability: number;
};

const data: Datum[] = (brookingsRaw as Omit<Datum, 'vulnerability'>[])
  .map((d) => ({
    ...d,
    vulnerability: Math.sqrt((1 - d.adapt) * d.exposure),
  }))
  .sort((a, b) => a.employment - b.employment);

const FEW_JOBS = [
  'Interpreters and translators',
  'Software developers',
  'Customer service representatives',
  'Registered nurses',
  'Firefighters',
  'Writers and authors',
  'Public relations specialists',
  'Retail salespersons',
  'Fast food and counter workers',
  'Secretaries and administrative assistants, except legal, medical, and executive',
];

const MANY_JOBS = [
  ...FEW_JOBS,
  'Lawyers, and judges, magistrates, and other judicial workers',
  'Accountants and auditors',
  'Cashiers',
  'Janitors and building cleaners',
  'Elementary and middle school teachers',
  'Receptionists and information clerks',
  'General and operations managers',
  'Cooks',
  'Home health and personal care aides [Modified]',
  'Web and digital interface designers',
  'Computer programmers',
  'Bookkeeping, accounting, and auditing clerks',
  'Waiters and waitresses',
  'Stockers and order fillers',
  'Postsecondary teachers',
];

const annotationLabels: Record<string, string> = {
  'Secretaries and administrative assistants, except legal, medical, and executive': 'Secretaries',
  'Fast food and counter workers': 'Fast food workers',
  'Lawyers, and judges, magistrates, and other judicial workers': 'Lawyers',
  'Elementary and middle school teachers': 'Elementary teachers',
  'Receptionists and information clerks': 'Receptionists',
  'Home health and personal care aides [Modified]': 'Home health aides',
  'Web and digital interface designers': 'Web designers',
  'Bookkeeping, accounting, and auditing clerks': 'Bookkeepers',
  'General and operations managers': 'Operations managers',
};

// ── Arrow geometry ────────────────────────────────────────────────────────────
type ArrowResult = {
  path: string;
  textOffset: [number, number];
  textAnchor: string;
  markerType?: 'start' | 'end';
};

function getArrowPath(direction: string, offset: number): ArrowResult {
  const s = SWOOP;
  const p = SWOOP_PAD + offset;
  switch (direction) {
    case 'top-left':
      return {
        path: `M ${-s} ${-s - p} L ${-s + 9} ${-s - p} Q 0 ${-s - p} 0 ${-p - s + 9} L 0 ${-p}`,
        textOffset: [-s - SWOOP_PAD, -s - p + 4],
        textAnchor: 'end',
      };
    case 'top-right':
      return {
        path: `M ${s} ${-s - p} L ${s - 9} ${-s - p} Q 0 ${-s - p} 0 ${-p - s + 9} L 0 ${-p}`,
        textOffset: [s + SWOOP_PAD, -s - p + 4],
        textAnchor: 'start',
      };
    case 'bottom-left':
      return {
        path: `M 0 ${p} L 0 ${p + s - 9} Q 0 ${s + p} ${-s + 9} ${s + p} L ${-s} ${s + p}`,
        textOffset: [-s - SWOOP_PAD, s + p + FONT_SIZE - 10],
        textAnchor: 'end',
        markerType: 'start',
      };
    case 'bottom-right':
    default:
      return {
        path: `M 0 ${p} L 0 ${p + s - 9} Q 0 ${s + p} ${s - 9} ${s + p} L ${s} ${s + p}`,
        textOffset: [s + SWOOP_PAD, s + p + FONT_SIZE - 10],
        textAnchor: 'start',
        markerType: 'start',
      };
  }
}

const ALL_DIRECTIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

// ── Main build function ───────────────────────────────────────────────────────
function buildScatterplot(container: HTMLElement, jobs = FEW_JOBS) {
  const margin = { top: 30, right: 80, bottom: 50, left: 80 };
  const totalWidth = Math.min(container.clientWidth || 800, 800);
  const totalHeight = Math.round(totalWidth * 0.7);
  const chartWidth = totalWidth - margin.left - margin.right;
  const chartHeight = totalHeight - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain(d3.extent(data, (d) => d.exposure) as [number, number]).range([0, chartWidth]);
  const y = d3.scaleLinear().domain(d3.extent(data, (d) => d.adapt) as [number, number]).range([chartHeight, 0]);
  const r = d3.scaleSqrt().domain(d3.extent(data, (d) => d.employment) as [number, number]).range([2, 20]);

  const colorScale = d3.scaleLinear<string>()
    .domain([0, 0.3, 0.6])
    .range([COLOR_TEAL, COLOR_GRAY, COLOR_ORANGE])
    .clamp(true);

  const svg = d3.create('svg')
    .attr('width', totalWidth)
    .attr('height', totalHeight)
    .style('font-family', 'Franklin, Arial, Helvetica, sans-serif')
    .style('display', 'block')
    .style('overflow', 'visible');

  // Arrow markers
  const defs = svg.append('defs');

  defs.append('marker')
    .attr('id', 'ds-arrow-end')
    .attr('viewBox', '-10 -10 20 20')
    .attr('markerWidth', 10)
    .attr('markerHeight', 10)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-6.75,-6.75 L 0,0 L -6.75,6.75')
    .style('fill', 'none')
    .style('stroke', 'black')
    .style('stroke-width', 2);

  defs.append('marker')
    .attr('id', 'ds-arrow-start')
    .attr('viewBox', '-10 -10 20 20')
    .attr('markerWidth', 10)
    .attr('markerHeight', 10)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M 6.75,-6.75 L 0,0 L 6.75,6.75')
    .style('fill', 'none')
    .style('stroke', 'black')
    .style('stroke-width', 2);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // X axis ticks (also used as fixed obstacles for avoid-overlap)
  const xAxisG = g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${chartHeight + 10})`);

  const xTickData = [0, 0.2, 0.4, 0.6, 0.8];
  const xTickNodes = xAxisG.selectAll('.tick')
    .data(xTickData)
    .join('g')
    .attr('class', 'tick')
    .attr('transform', (d) => `translate(${x(d)},0)`);

  xTickNodes.append('line').attr('y2', 6).attr('stroke', '#ccc').attr('shape-rendering', 'crispEdges');
  xTickNodes.append('text').attr('y', 20).attr('text-anchor', 'middle').attr('fill', '#999').attr('font-size', 12).text((d) => d);

  // Y axis ticks
  const yAxisG = g.append('g').attr('class', 'y-axis').attr('transform', 'translate(-10,0)');
  [0, 0.25, 0.5, 0.75, 1].forEach((val) => {
    yAxisG.append('line').attr('x1', 0).attr('x2', -6).attr('y1', y(val)).attr('y2', y(val)).attr('stroke', '#ccc');
    yAxisG.append('text').attr('x', -10).attr('y', y(val) + 4).attr('text-anchor', 'end').attr('fill', '#999').attr('font-size', 12).text(val);
  });

  // Axis labels
  g.append('text').attr('x', chartWidth / 2).attr('y', chartHeight + 46).attr('text-anchor', 'middle').attr('fill', '#666').attr('font-size', 12).text('Exposure →');
  g.append('text').attr('transform', `translate(-60,${chartHeight / 2}) rotate(-90)`).attr('text-anchor', 'middle').attr('fill', '#666').attr('font-size', 12).text('Adaptability →');

  // Job circles layer
  const gJobs = g.append('g').attr('class', 'jobs');
  const gAnnotations = g.append('g').attr('class', 'annotations');

  // Draw circles
  gJobs.selectAll('circle')
    .data(data, (d: any) => d.occupation)
    .join('circle')
    .attr('cx', (d) => x(d.exposure))
    .attr('cy', (d) => y(d.adapt))
    .attr('r', (d) => r(d.employment))
    .attr('fill', (d) => colorScale(d.vulnerability))
    .attr('fill-opacity', 0.7)
    .attr('stroke', (d) => jobs.includes(d.occupation) ? 'black' : colorScale(d.vulnerability))
    .attr('stroke-width', (d) => jobs.includes(d.occupation) ? 1.5 : 1)
    .attr('stroke-opacity', 0.9);

  // Annotation groups
  const annotationData = data.filter((d) => jobs.includes(d.occupation));

  const annotationNodes = gAnnotations.selectAll<SVGGElement, Datum>('g.annotation')
    .data(annotationData, (d) => d.occupation)
    .join('g')
    .attr('class', 'annotation')
    .style('pointer-events', 'none');

  function drawArrow(node: SVGGElement, d: Datum, direction: string) {
    const offset = r(d.employment) + 2;
    const arrow = getArrowPath(direction, offset);

    node.setAttribute('transform', `translate(${x(d.exposure)},${y(d.adapt)})`);

    const sel = d3.select(node);
    sel.selectAll('path').data([d]).join('path')
      .attr('d', arrow.path)
      .attr('marker-end', arrow.markerType === 'start' ? null : 'url(#ds-arrow-end)')
      .attr('marker-start', arrow.markerType === 'start' ? 'url(#ds-arrow-start)' : null)
      .style('stroke', 'black')
      .style('fill', 'none')
      .style('stroke-width', 1.5);

    sel.selectAll('text').data([d]).join('text')
      .text(annotationLabels[d.occupation] ?? d.occupation)
      .attr('text-anchor', arrow.textAnchor)
      .attr('transform', `translate(${arrow.textOffset[0]},${arrow.textOffset[1]})`)
      .style('font-size', `${FONT_SIZE}px`)
      .style('fill', 'black')
      .style('stroke', 'white')
      .style('stroke-width', 4)
      .style('stroke-linejoin', 'round')
      .style('paint-order', 'stroke');
  }

  // Initial draw with first direction
  annotationNodes.each(function (d) {
    drawArrow(this, d, ALL_DIRECTIONS[0]);
  });

  // Attach to DOM before running avoid-overlap
  const svgNode = svg.node()!;
  container.appendChild(svgNode);

  // ── avoid-overlap ─────────────────────────────────────────────────────────
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const makeChoice = (direction: string, d: Datum) => (node: Element) => {
        drawArrow(node as SVGGElement, d, direction);
      };

      const nodeGroups: LabelGroup[] = (annotationNodes.nodes() as SVGGElement[]).map((node, i) => {
        const d = annotationData[i];
        return {
          technique: 'choices' as const,
          nodes: [node],
          choices: ALL_DIRECTIONS.map((dir) => makeChoice(dir, d)),
          priority: 1,
        };
      });

      // X-axis ticks as fixed obstacles
      const fixedTicks: LabelGroup = {
        technique: 'choices',
        nodes: xTickNodes.nodes() as Element[],
        choices: [],
        priority: 10,
      };

      const avoidOverlap = new AvoidOverlap();
      const stats = avoidOverlap.run(svgNode, [fixedTicks, ...nodeGroups], {
        includeParent: true,
        parentMargin: { top: -10, right: -2, bottom: 0, left: -2 },
      });
      displayRunStats(stats, container);
    });
  });
}

// ── Stories ───────────────────────────────────────────────────────────────────
const storyDefaults = {
  parameters: { docs: { story: { autoplay: true } } },
  render: () => {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.maxWidth = '800px';
    div.style.margin = '0 auto';
    div.style.fontFamily = 'Franklin, Arial, Helvetica, sans-serif';
    return div;
  },
};

export const Default: StoryObj = {
  ...storyDefaults,
  play: async ({ canvasElement }) => {
    const div = canvasElement.querySelector('div') as HTMLElement;
    div.innerHTML = '';
    buildScatterplot(div, FEW_JOBS);
  },
};

export const ManyLabels: StoryObj = {
  ...storyDefaults,
  play: async ({ canvasElement }) => {
    const div = canvasElement.querySelector('div') as HTMLElement;
    div.innerHTML = '';
    buildScatterplot(div, MANY_JOBS);
  },
};
