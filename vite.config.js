import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import components from 'unplugin-vue-components/vite';
import { AntDesignXVueResolver } from 'ant-design-x-vue/resolver';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',  // 设置基础路径为根路径
  plugins: [
    vue()
  ],
  // components({
  //   resolvers: [AntDesignXVueResolver()]
  // })],
  build: {
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  },
  chainWebpack: config => {
    const svgRule = config.module.rule('svg');

    svgRule.uses.clear();

    svgRule.use('vue-svg-loader').loader('vue-svg-loader');
  },
})
