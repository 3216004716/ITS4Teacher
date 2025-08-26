import { createApp } from 'vue'
import Antd from 'ant-design-vue';
import { store, key } from './store'
// import { Store } from 'vuex';
// import './style.css'
import App from './App.vue'
import 'ant-design-vue/dist/reset.css';
import VueVideoPlayer from "vue-video-player";

createApp(App).use(store,key).use(Antd).use(VueVideoPlayer).mount('#app')
