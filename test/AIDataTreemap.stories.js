import { avoidOverlap } from '../src/index.js';
import {
  buildTreemapChart,
  buildBusinessNudgeChart,
  nudgeRender,
  makeChoice,
  pickDirection,
  makeContainer,
  ALL_DIRECTIONS,
  ACTIVE_DOMAINS,
  ACTIVE_DOMAINS_MANY,
} from './AIDataTreemap.helpers.js';

const meta = {
  title: 'Real-world/AidataTreemap',
  args: {
    debug: false,
  },
  argTypes: {
    debug: { control: 'boolean' },
  },
};
export default meta;

export const TopSites = {
  parameters: { docs: { story: { autoplay: true } } },
  render: (args) => {
    const div = makeContainer();
    requestAnimationFrame(() => {
      const {
        svgNode,
        dataDomain,
        nodeDomainRectGroups,
        nodeDomainText,
        nodeMainCategoryText,
        chartWidth,
        chartHeight,
      } = buildTreemapChart(div, ACTIVE_DOMAINS);

      requestAnimationFrame(() => {
        const rectNodes = nodeDomainRectGroups.nodes();
        const choicesGroups = nodeDomainText.nodes().map((node, i) => {
          const d = dataDomain[i];
          const preferred = pickDirection(d, chartWidth, chartHeight);
          const ordered = [
            preferred,
            ...ALL_DIRECTIONS.filter((dir) => dir !== preferred),
          ];
          return {
            technique: 'choices',
            nodes: [node],
            choices: ordered.map((dir) =>
              makeChoice(dir, d, chartWidth, chartHeight),
            ),
            priority: 1,
            margin: { top: 2, right: 4, bottom: 2, left: 4 },
            onRemove: () => rectNodes[i]?.remove(),
          };
        });

        const textNodes = nodeDomainText.nodes();
        const rectGroups = [
          {
            technique: 'choices',
            nodes: nodeDomainRectGroups.nodes(),
            choices: [],
            priority: 10,
            margin: { top: -2, right: -2, bottom: -2, left: -2 },
            onRemove: (el) => {
              const rectIndex = nodeDomainRectGroups.nodes().indexOf(el);
              if (rectIndex >= 0 && textNodes[rectIndex]) {
                textNodes[rectIndex].remove();
              }
            },
          },
        ];

        const nudgeGroups = [
          {
            technique: 'nudge',
            nodes: nodeMainCategoryText.nodes(),
            render: nudgeRender,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            priority: 10,
            maxDistance: 40,
            directions: ['down', 'right', 'up', 'left'],
          },
        ];

        avoidOverlap(
          svgNode,
          [...rectGroups, ...choicesGroups, ...nudgeGroups],
          {
            includeParent: true,
            parentMargin: { top: -10, right: -2, bottom: 0, left: -2 },
            scoreExponent: 2,
            debug: args.debug,
          },
        );
      });
    });
    return div;
  },
};

export const ManySites = {
  parameters: { docs: { story: { autoplay: true } } },
  render: (args) => {
    const div = makeContainer();
    requestAnimationFrame(() => {
      const {
        svgNode,
        dataDomain,
        nodeDomainRectGroups,
        nodeDomainText,
        nodeMainCategoryText,
        chartWidth,
        chartHeight,
      } = buildTreemapChart(div, ACTIVE_DOMAINS_MANY);

      requestAnimationFrame(() => {
        const rectNodes = nodeDomainRectGroups.nodes();
        const choicesGroups = nodeDomainText.nodes().map((node, i) => {
          const d = dataDomain[i];
          const preferred = pickDirection(d, chartWidth, chartHeight);
          const ordered = [
            preferred,
            ...ALL_DIRECTIONS.filter((dir) => dir !== preferred),
          ];
          return {
            technique: 'choices',
            nodes: [node],
            choices: ordered.map((dir) =>
              makeChoice(dir, d, chartWidth, chartHeight),
            ),
            priority: 1,
            margin: { top: 2, right: 4, bottom: 2, left: 4 },
            onRemove: () => rectNodes[i]?.remove(),
          };
        });

        const textNodes = nodeDomainText.nodes();
        const rectGroups = [
          {
            technique: 'choices',
            nodes: nodeDomainRectGroups.nodes(),
            choices: [],
            priority: 10,
            margin: { top: -2, right: -2, bottom: -2, left: -2 },
            onRemove: (el) => {
              const rectIndex = nodeDomainRectGroups.nodes().indexOf(el);
              if (rectIndex >= 0 && textNodes[rectIndex]) {
                textNodes[rectIndex].remove();
              }
            },
          },
        ];

        const nudgeGroups = [
          {
            technique: 'nudge',
            nodes: nodeMainCategoryText.nodes(),
            render: nudgeRender,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            priority: 10,
            maxDistance: 40,
            directions: ['down', 'right', 'up', 'left'],
          },
        ];

        avoidOverlap(
          svgNode,
          [...rectGroups, ...choicesGroups, ...nudgeGroups],
          {
            includeParent: true,
            parentMargin: { top: -10, right: -2, bottom: 0, left: -2 },
            scoreExponent: 2,
            debug: args.debug,
          },
        );
      });
    });
    return div;
  },
};

export const BusinessCategoryNudge = {
  parameters: { docs: { story: { autoplay: true } } },
  render: (args) => {
    const div = makeContainer();
    requestAnimationFrame(() => {
      const { svgNode, nodeSubCategoryText, nodeMainCategoryText } =
        buildBusinessNudgeChart(div);

      requestAnimationFrame(() => {
        const nudgeGroups = [
          {
            technique: 'nudge',
            nodes: nodeSubCategoryText.nodes(),
            margin: { right: 4, bottom: 4 },
            render: nudgeRender,
            priority: 0,
            directions: ['down', 'right'],
            maxDistance: 30,
          },
          {
            technique: 'nudge',
            nodes: nodeMainCategoryText.nodes(),
            margin: 0,
            render: nudgeRender,
            priority: 10,
            directions: ['down', 'right'],
            maxDistance: 30,
          },
        ];

        avoidOverlap(svgNode, nudgeGroups, {
          includeParent: true,
          parentMargin: { top: -10, right: -2, bottom: 0, left: -2 },
          scoreExponent: 3,
          debug: args.debug,
        });
      });
    });
    return div;
  },
};
