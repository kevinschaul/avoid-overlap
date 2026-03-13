import type { StorybookConfig } from '@storybook/html-vite';
const config: StorybookConfig = {
  stories: ['../test/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-docs'],

  framework: {
    name: '@storybook/html-vite',
    options: {},
  },

  core: {
    disableTelemetry: true,
  }
};
export default config;
