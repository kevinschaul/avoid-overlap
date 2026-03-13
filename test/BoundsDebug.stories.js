const svgNS = 'http://www.w3.org/2000/svg';

const meta = {
  title: 'Debug/BoundsDebug',
  tags: ['autodocs'],
  parameters: { docs: { story: { autoplay: true } } },
};
export default meta;

function makeRect(w, h, fill = '#ddd', stroke = '#555') {
  const r = document.createElementNS(svgNS, 'rect');
  r.setAttributeNS(null, 'x', '0');
  r.setAttributeNS(null, 'y', '0');
  r.setAttributeNS(null, 'width', String(w));
  r.setAttributeNS(null, 'height', String(h));
  r.setAttributeNS(null, 'fill', fill);
  r.setAttributeNS(null, 'stroke', stroke);
  return r;
}

function makeText(content, x = 0, y = 0, dy = '0.8em') {
  const t = document.createElementNS(svgNS, 'text');
  t.setAttributeNS(null, 'x', String(x));
  t.setAttributeNS(null, 'y', String(y));
  if (dy) t.setAttributeNS(null, 'dy', dy);
  t.textContent = content;
  return t;
}

/** Draw a bounding-box outline on an SVG (in SVG user coords). */
function drawBoundsBox(svg, x, y, w, h, color, dash = '') {
  const r = document.createElementNS(svgNS, 'rect');
  r.setAttributeNS(null, 'x', String(x));
  r.setAttributeNS(null, 'y', String(y));
  r.setAttributeNS(null, 'width', String(Math.max(0, w)));
  r.setAttributeNS(null, 'height', String(Math.max(0, h)));
  r.setAttributeNS(null, 'fill', 'none');
  r.setAttributeNS(null, 'stroke', color);
  r.setAttributeNS(null, 'stroke-width', '1.5');
  if (dash) r.setAttributeNS(null, 'stroke-dasharray', dash);
  svg.appendChild(r);
}

/**
 * Measure an element with both methods, draw overlay boxes, return the data.
 */
function measure(svg, el) {
  const svgBcr = svg.getBoundingClientRect();

  const bcr = el.getBoundingClientRect();
  const bcrRel = {
    x: +(bcr.x - svgBcr.x).toFixed(2),
    y: +(bcr.y - svgBcr.y).toFixed(2),
    w: +bcr.width.toFixed(2),
    h: +bcr.height.toFixed(2),
  };

  let ctmRel = null;
  try {
    const bbox = el.getBBox();
    const ctm = el.getCTM();
    if (ctm) {
      const x = ctm.a * bbox.x + ctm.c * bbox.y + ctm.e;
      const y = ctm.b * bbox.x + ctm.d * bbox.y + ctm.f;
      const w = Math.abs(ctm.a * bbox.width + ctm.c * bbox.height);
      const h = Math.abs(ctm.b * bbox.width + ctm.d * bbox.height);
      ctmRel = {
        x: +x.toFixed(2),
        y: +y.toFixed(2),
        w: +w.toFixed(2),
        h: +h.toFixed(2),
        bboxX: +bbox.x.toFixed(2),
        bboxY: +bbox.y.toFixed(2),
      };
    }
  } catch (_) {}

  drawBoundsBox(svg, bcrRel.x, bcrRel.y, bcrRel.w, bcrRel.h, '#d86100', '4,3');
  if (ctmRel) {
    drawBoundsBox(svg, ctmRel.x, ctmRel.y, ctmRel.w, ctmRel.h, '#0f7180');
  }

  return { bcrRel, ctmRel };
}

const ROWS = [
  {
    label: 'rect only',
    build: (g) => g.appendChild(makeRect(80, 20)),
  },
  {
    label: 'rect + text dy=0.8em',
    build: (g) => {
      g.appendChild(makeRect(80, 20));
      g.appendChild(makeText('A title', 0, 0, '0.8em'));
    },
  },
  {
    label: 'rect (stroked) + text dy=0.8em',
    build: (g) => {
      g.appendChild(makeRect(80, 20, '#ddd', '#333'));
      g.appendChild(makeText('Hello world', 0, 0, '0.8em'));
    },
  },
  {
    label: 'text only (dy=0.8em)',
    build: (g) => g.appendChild(makeText('Text only', 0, 0, '0.8em')),
  },
  {
    label: 'text only (y=12)',
    build: (g) => g.appendChild(makeText('Text only', 0, 12, '')),
  },
  {
    label: 'rect + text dy=1em',
    build: (g) => {
      g.appendChild(makeRect(80, 20));
      g.appendChild(makeText('A subtitle', 0, 0, '1em'));
    },
  },
];

function buildStory(container) {
  container.style.fontFamily = 'monospace';
  container.style.fontSize = '13px';
  container.style.padding = '12px';

  // Legend
  const legend = document.createElement('p');
  legend.style.margin = '0 0 10px';
  legend.innerHTML =
    '<span style="color:#d86100">■ dashed = getBoundingClientRect()</span>' +
    '&nbsp;&nbsp;&nbsp;' +
    '<span style="color:#0f7180">■ solid = getCTM()+getBBox()</span>';
  container.appendChild(legend);

  // Outer flex layout: SVG previews | table
  const flex = document.createElement('div');
  flex.style.display = 'flex';
  flex.style.gap = '24px';
  flex.style.alignItems = 'flex-start';
  container.appendChild(flex);

  // SVG panel
  const ROW_H = 50;
  const SVG_W = 150;
  const SVG_H = ROWS.length * ROW_H + 10;

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttributeNS(null, 'width', SVG_W);
  svg.setAttributeNS(null, 'height', SVG_H);
  svg.style.border = '1px solid #ddd';
  svg.style.flexShrink = '0';
  svg.style.fontFamily = 'Arial, sans-serif';
  svg.style.fontSize = '13px';
  flex.appendChild(svg);

  // Table panel
  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '13px';
  flex.appendChild(table);

  // Table header
  const thead = document.createElement('thead');
  table.appendChild(thead);
  const headerRow = document.createElement('tr');
  thead.appendChild(headerRow);

  for (const col of [
    'Element',
    'method',
    'x',
    'y',
    'w',
    'h',
    'bbox.x',
    'bbox.y',
  ]) {
    const th = document.createElement('th');
    th.textContent = col;
    th.style.padding = '4px 10px';
    th.style.borderBottom = '2px solid #aaa';
    th.style.textAlign =
      col === 'Element' || col === 'method' ? 'left' : 'right';
    headerRow.appendChild(th);
  }

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  // Build SVG elements
  const groups = ROWS.map(({ label, build }, i) => {
    const y = 10 + i * ROW_H;
    const g = document.createElementNS(svgNS, 'g');
    g.setAttributeNS(null, 'transform', `translate(10, ${y})`);
    build(g);
    svg.appendChild(g);
    return { g, label, rowIndex: i };
  });

  // Measure after layout and populate table
  requestAnimationFrame(() => {
    groups.forEach(({ g, label, rowIndex }, i) => {
      const { bcrRel, ctmRel } = measure(svg, g);
      const isEven = rowIndex % 2 === 0;
      const bg = isEven ? '#f9f9f9' : '#fff';

      const fmt = (v) => (v == null ? '—' : v.toFixed(2));

      const addRow = (method, data, color) => {
        const tr = document.createElement('tr');
        tr.style.background = bg;
        tbody.appendChild(tr);

        const cells = [
          method === 'BCR' ? label : '',
          method,
          fmt(data?.x),
          fmt(data?.y),
          fmt(data?.w),
          fmt(data?.h),
          data?.bboxX != null ? fmt(data.bboxX) : '—',
          data?.bboxY != null ? fmt(data.bboxY) : '—',
        ];

        cells.forEach((val, ci) => {
          const td = document.createElement('td');
          td.textContent = val;
          td.style.padding = '3px 10px';
          td.style.color = ci === 0 ? '#555' : color;
          td.style.textAlign = ci <= 1 ? 'left' : 'right';
          if (ci === 0) td.style.color = '#333';
          if (ci === 1) td.style.fontWeight = 'bold';
          tr.appendChild(td);
        });
      };

      addRow('BCR', bcrRel, '#d86100');
      addRow('CTM', ctmRel, '#0f7180');

      // Separator between element groups
      if (i < groups.length - 1) {
        const sep = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 8;
        td.style.padding = '0';
        td.style.borderBottom = '1px solid #ddd';
        sep.appendChild(td);
        tbody.appendChild(sep);
      }
    });
  });
}

export const ElementBounds = {
  parameters: {
    docs: {
      description: {
        story:
          'Compare `getBoundingClientRect()` vs `getCTM()+getBBox()` for various SVG element types. ' +
          'Useful for checking cross-browser consistency. ' +
          'Each row shows one element type with two overlaid bounding-box outlines: ' +
          '**orange dashed** = `getBoundingClientRect()` relative to SVG, ' +
          '**teal solid** = `getCTM()+getBBox()` in SVG user units.',
      },
    },
  },
  render: () => {
    const div = document.createElement('div');
    requestAnimationFrame(() => buildStory(div));
    return div;
  },
};
