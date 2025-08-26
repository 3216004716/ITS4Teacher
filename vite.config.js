import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import components from 'unplugin-vue-components/vite';
import { AntDesignXVueResolver } from 'ant-design-x-vue/resolver';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue()
  ],
  // components({
  //   resolvers: [AntDesignXVueResolver()]
  // })],
  chainWebpack: config => {
    const svgRule = config.module.rule('svg');

    svgRule.uses.clear();

    svgRule.use('vue-svg-loader').loader('vue-svg-loader');
  },
})
