import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { avoidOverlap } from '../src/index.js';

import citiesPizza from './data/cities_pizza.json';
import usTopoJson from './data/us-states-10m.json';

const meta = {
  title: 'Real-world/CityMap',
  args: {
    debug: false,
  },
  argTypes: {
    debug: { control: 'boolean' },
  },
};
export default meta;

// Matches the real component's diverging color scale
const colors = [
  '#8c510a',
  '#d8b365',
  '#f6e8c3',
  '#f5f5f5',
  '#c7eae5',
  '#5ab4ac',
  '#01665e',
];

function buildCityMap(
  container,
  citiesData,
  headline,
  legendMinLabel,
  legendMaxLabel,
  priorityCities = [],
  debug = false,
) {
  document
    .querySelectorAll('[id^="avoid-overlap-scored-debug"]')
    .forEach((n) => n.remove());
  const priorityCitiesSet = new Set(priorityCities);
  const majorCities = new Set([
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Washington, DC',
  ]);

  function getPriority(d) {
    let priority = Math.abs(d.score);
    if (priorityCitiesSet.has(d.city)) priority += 100;
    else if (majorCities.has(d.city)) priority += 50;
    return priority;
  }

  const geocodedData = citiesData
    .filter((d) => d.lng && d.lat)
    .map((d) => ({ ...d, longitude: d.lng, latitude: d.lat }));

  const mapWidth = 672;
  const mapHeight = mapWidth * 0.625;
  const radius = 7;
  const highlightStrokeWidth = 1.5;

  const us = usTopoJson;
  const nation = topojson.feature(us, us.objects.nation);
  const stateFeatures = topojson.feature(us, us.objects.states);
  const states = topojson.mesh(us, us.objects.states);

  const leftMargin = 10;
  const projection = d3
    .geoAlbersUsa()
    .scale((mapWidth - leftMargin) * 1.33)
    .translate([mapWidth / 2 + leftMargin / 2, mapHeight / 2]);

  const forcedData = geocodedData
    .map((d) => {
      const projected = projection([d.longitude, d.latitude]);
      return {
        ...d,
        x: projected?.[0] || 0,
        y: projected?.[1] || 0,
      };
    })
    .filter((d) => d.x !== 0 && d.y !== 0);

  const simulation = d3
    .forceSimulation(forcedData)
    .force('x', d3.forceX((d) => d.x).strength(0.8))
    .force('y', d3.forceY((d) => d.y).strength(0.8))
    .force('collide', d3.forceCollide(radius))
    .stop();

  for (let i = 0; i < 120; i += 1) simulation.tick();

  const colorScale = d3
    .scaleLinear()
    .domain([-100, -60, -20, 0, 20, 60, 100])
    .range(colors)
    .clamp(true);

  const path = d3.geoPath(projection);

  // ── Legend ──────────────────────────────────────────────────────────────
  const legendWidth = 170;
  const legendHeight = 13;
  const legendId = `legend-gradient-${Math.random().toString(36).slice(2, 9)}`;

  const legendSvg = d3
    .create('svg')
    .attr('viewBox', `0 0 ${legendWidth} 36`)
    .attr('width', legendWidth)
    .attr('height', 36)
    .style('display', 'block')
    .style('margin-bottom', '6px');

  const defs = legendSvg.append('defs');
  const grad = defs.append('linearGradient').attr('id', legendId);
  colors.forEach((color, i) => {
    grad
      .append('stop')
      .attr('offset', `${(i / (colors.length - 1)) * 100}%`)
      .attr('stop-color', color);
  });

  legendSvg
    .append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .attr('fill', `url(#${legendId})`);

  legendSvg
    .append('text')
    .attr('x', 0)
    .attr('y', legendHeight + 15)
    .attr('text-anchor', 'start')
    .attr('font-family', 'Franklin, Arial, Helvetica, sans-serif')
    .attr('font-size', '12px')
    .attr('fill', '#333')
    .text(legendMinLabel);

  legendSvg
    .append('text')
    .attr('x', legendWidth)
    .attr('y', legendHeight + 15)
    .attr('text-anchor', 'end')
    .attr('font-family', 'Franklin, Arial, Helvetica, sans-serif')
    .attr('font-size', '12px')
    .attr('fill', '#333')
    .text(legendMaxLabel);

  // ── Map SVG ──────────────────────────────────────────────────────────────
  const svg = d3
    .create('svg')
    .attr('width', mapWidth)
    .attr('height', mapHeight)
    .attr('viewBox', [0, 0, mapWidth, mapHeight])
    .style('background', 'white')
    .style('display', 'block')
    .style('width', '100%')
    .style('height', 'auto')
    .style('font-family', 'Franklin, Arial, Helvetica, sans-serif');

  // Nation outline
  svg
    .append('path')
    .datum(nation)
    .attr('fill', 'none')
    .attr('stroke', '#999')
    .attr('stroke-width', 0.5)
    .attr('stroke-opacity', 0.3)
    .attr('d', path);

  // State fills
  svg
    .selectAll('path.state')
    .data(stateFeatures.features)
    .join('path')
    .attr('class', 'state')
    .attr('fill', '#fafafa')
    .attr('stroke', 'none')
    .attr('d', path);

  // State borders
  svg
    .append('path')
    .datum(states)
    .attr('fill', 'none')
    .attr('stroke', '#999')
    .attr('stroke-width', 0.5)
    .attr('stroke-opacity', 0.4)
    .attr('d', path);

  // Triangle markers
  const triangleSymbol = d3
    .symbol()
    .type(d3.symbolTriangle)
    .size(radius * radius * 2.5);

  svg
    .selectAll('path.city-marker')
    .data(forcedData)
    .join('path')
    .attr('class', 'city-marker')
    .attr('transform', (d) => {
      const rotation = d.score >= 0 ? 0 : 180;
      return `translate(${d.x}, ${d.y}) rotate(${rotation})`;
    })
    .attr('d', triangleSymbol)
    .attr('fill', (d) => colorScale(d.score))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer');

  // ── Labels ───────────────────────────────────────────────────────────────
  const sortedByPriority = [...forcedData].sort(
    (a, b) => getPriority(b) - getPriority(a),
  );

  const labelData = sortedByPriority
    .filter(
      (d) => d.city !== 'Fort Wayne, IN' && d.city !== 'North Las Vegas, NV',
    )
    .slice(0, 20)
    .map((d) => ({
      ...d,
      labelText: (() => {
        const name = d.city.split(',')[0];
        if (name === 'Los Angeles') return 'L.A.';
        if (name === 'San Francisco') return 'S.F.';
        return name;
      })(),
    }));

  const labelGroup = svg.append('g').attr('class', 'labels');

  const labelNodes = labelGroup
    .selectAll('g.label')
    .data(labelData)
    .join('g')
    .attr('class', 'label')
    .style('pointer-events', 'none');

  labelNodes
    .append('text')
    .attr('font-size', '12px')
    .attr('font-family', 'Franklin, Arial, Helvetica, sans-serif')
    .attr('font-weight', '500')
    .attr('fill', '#333')
    .attr('stroke', 'white')
    .attr('stroke-width', 3)
    .attr('paint-order', 'stroke')
    .text((d) => d.labelText);

  // Hover interaction (mirrors real component)
  function handleMouseover(_event, d) {
    svg
      .selectAll('path.city-marker')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);

    svg.selectAll('.labels').style('opacity', 0);

    const cityName = (() => {
      const n = d.city.split(',')[0];
      if (n === 'Los Angeles') return 'L.A.';
      if (n === 'San Francisco') return 'S.F.';
      return n;
    })();

    svg
      .append('g')
      .attr('class', 'hover-label')
      .attr('transform', `translate(${d.x}, ${d.y - radius - 3})`)
      .style('pointer-events', 'none')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-family', 'Franklin, Arial, Helvetica, sans-serif')
      .attr('font-weight', '500')
      .attr('fill', '#333')
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .text(cityName);
  }

  function handleMouseout() {
    svg
      .selectAll('path.city-marker')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    svg.selectAll('.labels').style('opacity', 1);
    svg.selectAll('.hover-label').remove();

    // Re-highlight visible labels' markers
    labelNodes.each(function () {
      const el = d3.select(this);
      if (parseFloat(el.style('opacity') || '1') > 0) {
        const ld = el.datum();
        svg
          .selectAll('path.city-marker')
          .filter((cd) => cd.city === ld.city)
          .attr('stroke', '#000')
          .attr('stroke-width', highlightStrokeWidth);
      }
    });
  }

  svg
    .selectAll('path.city-marker')
    .on('mouseover', handleMouseover)
    .on('mouseout', handleMouseout);

  // Voronoi for larger hit targets
  const delaunay = d3.Delaunay.from(
    forcedData,
    (d) => d.x,
    (d) => d.y,
  );
  const voronoi = delaunay.voronoi([0, 0, mapWidth, mapHeight]);

  svg
    .selectAll('.voronoi-cell')
    .data(forcedData)
    .join('path')
    .attr('class', 'voronoi-cell')
    .attr('d', (_, i) => voronoi.renderCell(i))
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .style('cursor', 'pointer')
    .on('mouseover', (_event, d) => {
      const marker = svg.selectAll('path.city-marker').filter((cd) => cd === d);
      handleMouseover.call(marker.node(), _event, d);
    })
    .on('mouseout', handleMouseout);

  // ── avoid-overlap ────────────────────────────────────────────────────────
  const offset = radius;

  // Choice generators — mirror the real component's positivePositions /
  // negativePositions arrays exactly, but as avoid-overlap choice fns.
  function posUp(el, x, y, anchor) {
    el.setAttribute('transform', `translate(${x}, ${y})`);
    el.querySelector('text')?.setAttribute('text-anchor', anchor);
  }

  const positiveChoices = (d) => [
    (el) => posUp(el, d.x - offset, d.y - offset + 3, 'end'), // upper-left
    (el) => posUp(el, d.x + offset, d.y - offset + 3, 'start'), // upper-right
    (el) => posUp(el, d.x, d.y + offset + 10, 'middle'), // below
  ];

  const negativeChoices = (d) => [
    (el) => posUp(el, d.x - offset, d.y + offset + 5, 'end'), // lower-left
    (el) => posUp(el, d.x + offset, d.y + offset + 5, 'start'), // lower-right
    (el) => posUp(el, d.x, d.y - offset - 3, 'middle'), // above
  ];

  const avoidLabelGroups = labelNodes.nodes().map((node, i) => {
    const d = labelData[i];

    let choices;
    if (d.city === 'New York, NY' || d.city === 'Las Vegas, NV') {
      const pos = positiveChoices(d);
      choices = [pos[1], pos[0], pos[2]]; // right first
    } else if (d.city === 'Detroit, MI') {
      const neg = negativeChoices(d);
      choices = [neg[2], neg[0], neg[1]]; // above first
    } else if (d.city === 'Honolulu, HI') {
      const pos = positiveChoices(d);
      choices = [pos[2], pos[0], pos[1]]; // below first
    } else {
      choices = d.score >= 0 ? positiveChoices(d) : negativeChoices(d);
    }

    return {
      technique: 'choices',
      nodes: [node],
      choices,
      priority: getPriority(d),
      margin: { top: 2, right: 2, bottom: 2, left: 2 },
    };
  });

  const svgNode = svg.node();
  container.appendChild(svgNode);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const markerNodes = Array.from(
        svgNode.querySelectorAll('path.city-marker'),
      );
      const allLabelGroups = [
        {
          technique: 'fixed',
          nodes: markerNodes,
          margin: -4,
        },
        ...avoidLabelGroups,
      ];

      const options = {
        includeParent: true,
        parentMargin: { top: -5, right: -5, bottom: -5, left: -5 },
        scoreExponent: 2,
        debug,
      };
      avoidOverlap(allLabelGroups, options);

      // Highlight visible labels' markers (matches real component)
      labelNodes.each(function () {
        const el = this;
        // Nodes removed by avoid-overlap are no longer in the DOM
        if (!svgNode.contains(el)) return;
        const ld = d3.select(el).datum();
        svg
          .selectAll('path.city-marker')
          .filter((cd) => cd.city === ld.city)
          .attr('stroke', '#000')
          .attr('stroke-width', highlightStrokeWidth)
          .raise();
      });
    });
  });

  // Headline + legend above map
  const wrapper = document.createElement('div');
  wrapper.style.maxWidth = '672px';
  wrapper.style.margin = '0 auto';
  wrapper.style.fontFamily = 'Franklin, Arial, Helvetica, sans-serif';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.padding = '0 16px';

  const h3 = document.createElement('h3');
  h3.style.fontWeight = '700';
  h3.style.fontSize = '19.25px';
  h3.style.lineHeight = '23.1px';
  h3.style.color = 'rgb(42, 42, 42)';
  h3.style.marginBottom = '10px';
  h3.style.marginTop = '16px';
  h3.textContent = headline;

  const source = document.createElement('p');
  source.style.fontSize = '12.25px';
  source.style.color = 'rgb(42, 42, 42)';
  source.style.paddingTop = '12px';
  source.innerHTML =
    'Source: <a href="https://inequalities.ai/" style="color:rgb(0,136,204);text-decoration:none">Inequalities.ai</a>';

  wrapper.appendChild(h3);
  wrapper.appendChild(legendSvg.node());
  wrapper.appendChild(svgNode);
  wrapper.appendChild(source);
  container.appendChild(wrapper);
}

export const Pizza = {
  parameters: { docs: { story: { autoplay: true } } },
  render: (args) => {
    const div = document.createElement('div');
    div.style.width = '100%';
    requestAnimationFrame(() =>
      buildCityMap(
        div,
        citiesPizza,
        'The cities with the best (and worst) pizza',
        'Worst pizza',
        'Best pizza',
        [],
        args.debug,
      ),
    );
    return div;
  },
};
