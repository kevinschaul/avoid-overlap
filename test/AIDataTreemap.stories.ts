import type { Meta, StoryObj } from '@storybook/html-vite';
import { range } from 'd3';
import { AvoidOverlap } from '../src/index.js';
import type { LabelGroup, Options } from '../src/index.js';
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

const meta: Meta = {
  title: 'Real-world/AidataTreemap',
  args: {
    debug: false,
  },
  argTypes: {
    debug: { control: 'boolean' },
  },
};
export default meta;

export const TopSites: StoryObj = {
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
        const rectNodes = nodeDomainRectGroups.nodes() as Element[];
        const choicesGroups: LabelGroup[] = (
          nodeDomainText.nodes() as Element[]
        ).map((node, i) => {
          const d = dataDomain[i];
          const preferred = pickDirection(d, chartWidth, chartHeight);
          const ordered = [
            preferred,
            ...ALL_DIRECTIONS.filter((dir) => dir !== preferred),
          ];
          return {
            technique: 'choices' as const,
            nodes: [node],
            choices: ordered.map((dir) =>
              makeChoice(dir, d, chartWidth, chartHeight)
            ),
            priority: 1,
            margin: { top: 2, right: 4, bottom: 2, left: 4 },
            onRemove: () => rectNodes[i]?.remove(),
          };
        });

        const textNodes = nodeDomainText.nodes() as Element[];
        const rectGroups: LabelGroup[] = [
          {
            technique: 'choices',
            nodes: nodeDomainRectGroups.nodes() as Element[],
            choices: [],
            priority: 10,
            margin: { top: -2, right: -2, bottom: -2, left: -2 },
            onRemove: (el) => {
              const rectIndex = (
                nodeDomainRectGroups.nodes() as Element[]
              ).indexOf(el);
              if (rectIndex >= 0 && textNodes[rectIndex]) {
                textNodes[rectIndex].remove();
              }
            },
          },
        ];

        const nudgeGroups: LabelGroup[] = [
          {
            technique: 'nudge',
            nodes: nodeMainCategoryText.nodes() as Element[],
            render: nudgeRender,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            priority: 10,
            maxDistance: 40,
            nudgeDirections: ['down', 'right', 'up', 'left'],
          } as any,
        ];

        const avoidOverlap = new AvoidOverlap();
        const options: Options = {
          includeParent: true,
          parentMargin: { top: -10, right: -2, bottom: 0, left: -2 },
          scoreExponent: 2,
          debug: args.debug,
        };
        avoidOverlap.run(
          svgNode,
          [...rectGroups, ...choicesGroups, ...nudgeGroups],
          options
        );
      });
    });
    return div;
  },
};

export const ManySites: StoryObj = {
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
        const rectNodes = nodeDomainRectGroups.nodes() as Element[];
        const choicesGroups: LabelGroup[] = (
          nodeDomainText.nodes() as Element[]
        ).map((node, i) => {
          const d = dataDomain[i];
          const preferred = pickDirection(d, chartWidth, chartHeight);
          const ordered = [
            preferred,
            ...ALL_DIRECTIONS.filter((dir) => dir !== preferred),
          ];
          return {
            technique: 'choices' as const,
            nodes: [node],
            choices: ordered.map((dir) =>
              makeChoice(dir, d, chartWidth, chartHeight)
            ),
            priority: 1,
            margin: { top: 2, right: 4, bottom: 2, left: 4 },
            onRemove: () => rectNodes[i]?.remove(),
          };
        });

        const textNodes = nodeDomainText.nodes() as Element[];
        const rectGroups: LabelGroup[] = [
          {
            technique: 'choices',
            nodes: nodeDomainRectGroups.nodes() as Element[],
            choices: [],
            priority: 10,
            margin: { top: -2, right: -2, bottom: -2, left: -2 },
            onRemove: (el) => {
              const rectIndex = (
                nodeDomainRectGroups.nodes() as Element[]
              ).indexOf(el);
              if (rectIndex >= 0 && textNodes[rectIndex]) {
                textNodes[rectIndex].remove();
              }
            },
          },
        ];

        const nudgeGroups: LabelGroup[] = [
          {
            technique: 'nudge',
            nodes: nodeMainCategoryText.nodes() as Element[],
            render: nudgeRender,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            priority: 10,
            maxDistance: 40,
            nudgeDirections: ['down', 'right', 'up', 'left'],
          } as any,
        ];

        const avoidOverlap = new AvoidOverlap();
        const options: Options = {
          includeParent: true,
          parentMargin: { top: -10, right: -2, bottom: 0, left: -2 },
          scoreExponent: 2,
          debug: args.debug,
        };
        avoidOverlap.run(
          svgNode,
          [...rectGroups, ...choicesGroups, ...nudgeGroups],
          options
        );
      });
    });
    return div;
  },
};

export const BusinessCategoryNudge: StoryObj = {
  parameters: { docs: { story: { autoplay: true } } },
  render: (args) => {
    const div = makeContainer();
    requestAnimationFrame(() => {
      const { svgNode, nodeSubCategoryText, nodeMainCategoryText } =
        buildBusinessNudgeChart(div);

      requestAnimationFrame(() => {
        const nudgeGroups: LabelGroup[] = [
          {
            technique: 'nudge',
            nodes: nodeSubCategoryText.nodes() as Element[],
            // margin: { top: -4, right: 0, bottom: 0, left: 0 },
            render: nudgeRender,
            priority: 0,
            nudgeDirections: ['down', 'right'],
          } as any,
          {
            technique: 'nudge',
            nodes: nodeMainCategoryText.nodes() as Element[],
            margin: { top: 0, right: 0, bottom: -8, left: 0 },
            render: nudgeRender,
            priority: 10,
            nudgeDirections: ['down', 'right'],
          } as any,
        ];

        const avoidOverlap = new AvoidOverlap();
        const options: Options = {
          includeParent: true,
          parentMargin: { top: -10, right: -2, bottom: 0, left: -2 },
          nudgeOffsets: range(2, 30),
          scoreExponent: 3,
          debug: args.debug,
        };
        avoidOverlap.run(svgNode, nudgeGroups, options);
      });
    });
    return div;
  },
};
