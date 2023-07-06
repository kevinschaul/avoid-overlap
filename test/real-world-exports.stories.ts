import type { Meta, StoryObj } from '@storybook/html';

import { render, playExportedArgs } from './util';

const meta: Meta = {
  title: 'Utils/Real-world exported tests',
  argTypes: {
    exportedArgs: { control: 'text' },
    debug: { control: 'boolean' },
  },
};
export default meta;

export const NoOverlap: StoryObj = {
  render: render,
  play: playExportedArgs,
  args: {
    exportedArgs: `{
      "parent": {
        "coords": {
          "x": 83.5,
          "y": 410.5,
          "width": 960,
          "height": 460,
          "top": 410.5,
          "right": 1043.5,
          "bottom": 870.5,
          "left": 83.5
        }
      },
      "labelGroups": [
        {
          "nodes": [
            {
              "coords": {
                "x": 517.4666748046875,
                "y": 406.33331298828125,
                "width": 68.25,
                "height": 56.2166748046875,
                "top": 406.33331298828125,
                "right": 585.7166748046875,
                "bottom": 462.54998779296875,
                "left": 517.4666748046875
              }
            },
            {
              "coords": {
                "x": 888.6666870117188,
                "y": 406.33331298828125,
                "width": 67.25,
                "height": 56.2166748046875,
                "top": 406.33331298828125,
                "right": 955.9166870117188,
                "bottom": 462.54998779296875,
                "left": 888.6666870117188
              }
            },
            {
              "coords": {
                "x": 322.2833251953125,
                "y": 406.33331298828125,
                "width": 87.94999694824219,
                "height": 73.83334350585938,
                "top": 406.33331298828125,
                "right": 410.2333221435547,
                "bottom": 480.1666564941406,
                "left": 322.2833251953125
              }
            }
          ],
          "margin": {
            "top": 0,
            "right": 4,
            "bottom": 0,
            "left": 0
          },
          "nudgeStrategy": "shortest",
          "nudgeDirections": [
            "left",
            "right"
          ]
        }
      ],
      "options": {
        "technique": "nudge",
        "includeParent": false,
        "debug": false
      }
    }`,
    debug: false,
  },
};

export const Crowded: StoryObj = {
  render: render,
  play: playExportedArgs,
  args: {
    exportedArgs: `{
      "parent": {
        "coords": {
          "x": 0,
          "y": 0,
          "width": 1217,
          "height": 300.1499938964844,
          "top": 0,
          "right": 1217,
          "bottom": 300.1499938964844,
          "left": 0
        }
      },
      "labelGroups": [
        {
          "nodes": [
            {
              "coords": {
                "x": 19,
                "y": 10,
                "width": 162.5,
                "height": 24,
                "top": 10,
                "right": 181.5,
                "bottom": 34,
                "left": 19
              },
              "textContent": "Business & Industrial"
            }
          ],
          "margin": {
            "top": -2,
            "right": 0,
            "bottom": -2,
            "left": 0
          },
          "priority": 10,
          "maxDistance": 40
        },
        {
          "nodes": [],
          "margin": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          },
          "priority": 5,
          "nudgeStrategy": "ordered",
          "nudgeDirections": [
            "down"
          ]
        },
        {
          "nodes": [
            {
              "coords": {
                "x": 19,
                "y": 10,
                "width": 112.03334045410156,
                "height": 22,
                "top": 10,
                "right": 131.03334045410156,
                "bottom": 32,
                "left": 19
              },
              "textContent": "Business Services"
            },
            {
              "coords": {
                "x": 183,
                "y": 10,
                "width": 53.75,
                "height": 22,
                "top": 10,
                "right": 236.75,
                "bottom": 32,
                "left": 183
              },
              "textContent": "Industry"
            },
            {
              "coords": {
                "x": 183,
                "y": 86,
                "width": 52.23333740234375,
                "height": 22,
                "top": 86,
                "right": 235.23333740234375,
                "bottom": 108,
                "left": 183
              },
              "textContent": "Finance"
            },
            {
              "coords": {
                "x": 304,
                "y": 10,
                "width": 80.78334045410156,
                "height": 22,
                "top": 10,
                "right": 384.78334045410156,
                "bottom": 32,
                "left": 304
              },
              "textContent": "Construction"
            },
            {
              "coords": {
                "x": 304,
                "y": 79,
                "width": 43.05000305175781,
                "height": 37.43333435058594,
                "top": 79,
                "right": 347.0500030517578,
                "bottom": 116.43333435058594,
                "left": 304
              },
              "textContent": "RealEstate"
            },
            {
              "coords": {
                "x": 372,
                "y": 79,
                "width": 39.616668701171875,
                "height": 22,
                "top": 79,
                "right": 411.6166687011719,
                "bottom": 101,
                "left": 372
              },
              "textContent": "Retail"
            }
          ],
          "margin": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          },
          "priority": 1,
          "nudgeStrategy": "shortest",
          "nudgeDirections": [
            "down",
            "right"
          ]
        }
      ],
      "options": {
        "technique": "nudge",
        "includeParent": true,
        "parentMargin": {
          "top": -10,
          "right": -2,
          "bottom": -10,
          "left": 2
        },
        "debug": false
      }
    }`,
    debug: false,
  },
};
