<script setup lang="ts">
import { reactive, onMounted, h, computed, ref } from "vue";
import { useStore } from 'vuex';
import { key } from '../../store';
import { Card, Space, message } from 'ant-design-vue';
import { Welcome, Prompts, type PromptsProps, Sender } from 'ant-design-x-vue';
import {
  createFromIconfontCN
} from '@ant-design/icons-vue';
import { AIM_STEPS, EN_TOPIC_TAGS, PROMPT_STEPS, PROMPT_STEPS_CN } from '../../utils/topic';

defineOptions({ name: 'AXPromptsFlexWrapSetup' });
import { CHAT_VUEX_NAMESPACE, GET_CHAT_STEP, SET_CHAT_STEP, SET_TOPIC_TAG } from '../../store/modules/chat';

const ChatbotSvgIcon = createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/c/font_4890170_ywbb1o99s4s.js',
});

const store = useStore(key);
const userInput = ref("");
const senderLoading = ref(false);

const currentStep = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_CHAT_STEP]);


// 状态管理
const state = reactive({

});
const renderTitle = (icon: any, title: string) => {
  return h(Space, { align: 'start' }, () => [
    icon,
    h('span', null, title)
  ]);
};
const onMessageSubmit = (content: string) => {
  if (!content.trim()) return;
  console.log("onMessageSubmit", content);
  // onRequest({ message: content });
  // console.log("agent messages", messages.value);
}

const promptSteps = PROMPT_STEPS_CN;
// const promptSteps = PROMPT_STEPS;

const items: PromptsProps['items'] = promptSteps.map(d => {
  return {
    key: String(d.id + 1),
    label: renderTitle(h(d.icon, {
      style: { color: d.color }
    }), `${d.id}. ${d.fullName}`),
    description: d.description,
    children: d.topicTagsItems.map((tag, index) => ({
      key: `1-${index + 1}`,
      description: tag,
      stepID: d.id,
      stepName: d.name,
      topicTag: tag
    })),
  }
})

const handleItemClick = (info: any) => {
  console.log(info);
  message.success(`You clicked: ${info.data.description}, ${info.data.stepID},${info.data.stepName}`);
  store.commit(CHAT_VUEX_NAMESPACE + SET_CHAT_STEP, info.data.stepID);
  store.commit(CHAT_VUEX_NAMESPACE + SET_TOPIC_TAG, info.data.description);
}

onMounted(async () => {

});

</script>

<template>
  <Welcome :style="{
    // background: `linear-gradient(97deg, #ddebec79 0%, #c0dfd979 100%)`,
    background: `#ffffff`,
    borderRadius: '0',
    margin: '4px 4px 0 4px'
  }" :icon="h(ChatbotSvgIcon, {
    type: 'icon-robot-',
    style: {
      fontSize: '50px',
    }
  })" , title="您好！我是您的问课智能助手～" description="我可以帮助您开展个性化的教学研讨～" />
  <div class="chat-aim">
    <!-- <Card :style="{ borderRadius: 0, border: 0, margin: 0 }"> -->
    <Prompts title="请选择您想要开展的课例教研主题" :items="items" wrap :styles="{
      title: {
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '4px 0',
        marginRight: '20px',
      },
      item: {
        flex: 'auto',
        justifyContent: 'center',
        width: 'calc(45% - 6px)',
        border: '1px solid #7fc9bc',
        background: '#ffffff11',
      },
      subItem: {
        background: 'rgba(255,255,255,0.30)',
        border: '1px solid #c0dfd9',
        color: '#333',
        padding: '4px 8px',
      },
    }" @item-click="handleItemClick" />
    <!-- </Card> -->
  </div>
  <div class="chat-input" id="linkview-input">
      <!-- <Sender v-model:value="userInput" @submit="(content: string) => handleMessageSubmit(content)" -->
      <Sender v-model:value="userInput" @submit="onMessageSubmit" :loading="senderLoading">
      </Sender>
    </div>
</template>

<style lang="less" scoped>
:deep(.ant-prompts-title) {
  color: #000;
  width: 100%;
  text-align: center;
}

.chat-aim {
  width: calc(100% - 8px);
  height: calc(100% - 80px);
  margin: 0 4px 4px 4px;
  padding: 0 8px 8px 8px;
  // background: linear-gradient(97deg, #ddebec79 0%, #7fc9bc 100%);
  // background: linear-gradient(97deg, #ddebec79 0%, #c0dfd979 100%);
}

.progress {
  display: flex;
}

.progress-title {
  font-size: 14px;
  font-weight: bold;
  padding: 4px 0;
  margin-right: 20px;
}

.progress-content {
  width: calc(100% - 100px);
}
</style>
