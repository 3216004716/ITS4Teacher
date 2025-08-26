<script setup lang="ts">
import { reactive, onMounted, ref, nextTick, h, computed } from "vue";
import { Sender, useXAgent, useXChat, type BubbleListProps,  } from 'ant-design-x-vue';
import {
  createFromIconfontCN,
  UserOutlined,
  BulbOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  SmileOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';
import { message as messageAnt } from 'ant-design-vue';
import OpenAI from "openai";
import HeaderView from "./HeaderView.vue";
import AimView from "./Chat/AimView.vue";
import InterlinkView from "./Chat/InterlinkView.vue";

import { useStore } from 'vuex';
import { key } from '../store'
defineOptions({ name: 'AXPromptsFlexWrapSetup' });
import { GET_CHAT_STEP, SET_CHAT_STEP, CHAT_VUEX_NAMESPACE, ADD_CHAT_MESSAGE } from '../store/modules/chat';
import { CHAT_STEP_INTERCONNECT, } from '../utils/const';
const ChatbotSvgIcon = createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/c/font_4890170_2nweypkfbkq.js',
});

const store = useStore(key);
const charRef = ref();
const userInput = ref("");
const chatBegin = ref(false);
const senderLoading = ref(false);
const messagesWrapper = ref();
// const selectedTopicTag = computed(() => common.topic);

const currentStep = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_CHAT_STEP]);

// 状态管理
const state = reactive({
  id: 0,
  apiKey: "sk-e18179ecb5ba4eb9b9d07a287dff4edd",
  lessonTheme: "语文新授课",
  questionProgress: {
    current: 0,
    total: 3,
    isCompleted: false,
    percent: 0
  },


  selectedTopicTag: null as string | null,
});

//////////////////
// prompt管理
const [message, contextHolder] = messageAnt.useMessage();

///////////////////
// 对话管理
const roles: BubbleListProps['roles'] = {
  ai: {
    placement: 'start',
    avatar: {
      icon: h(ChatbotSvgIcon, {
        type: "icon-shuziyuangongjiedian",
        fill: "#ffffff"
      }),
      style: {
        background: '#97D7F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
    style: {
      maxWidth: '600px',
    },
  },
  local: {
    placement: 'end',
    avatar: { 
      icon: h(UserOutlined, {
        style: {
          color: '#ffffff',
          fontSize: '20px'
        }
      }), 
      style: { 
        background: '#87d068',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      } 
    },
  },
};
// deepseek大模型接口
const ds = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-e18179ecb5ba4eb9b9d07a287dff4edd',
  dangerouslyAllowBrowser: true
});

const scrollToBottom = () => {
  nextTick(() => {
    const chatContent = document.querySelector('.chat-content');
    if (chatContent) {
      chatContent.scrollTo({
        top: chatContent.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
};

// 智能体管理
const [planningAgentX] = useXAgent<XAgentMessage>({
  request: async (info, callbacks) => {
    // senderLoading.value = true

    const { message, messages = [] } = info;
    const { onSuccess, onError } = callbacks;

    try {
      const systemPrompt = `你是一个专业的教研专家，负责了解教师的教学情况。
当前是第 ${state.questionProgress.current + 1} 个问题。

提问要求：
1. 如果是第一个问题，重点了解教师的教研需求
2. 如果是第二个问题，重点了解教师教学中存在的问题
3. 如果是第三个问题，重点了解教师的教研目标

注意事项：
- 问题要开放性，避免是/否类型的封闭式提问
- 问题要简洁明了，容易理解
- 如果不是第一个问题，需要基于用户之前的回答进行提问，保证逻辑连贯
- 每个问题都要体现专业性，引导教师深入思考`;

      // 构建消息历史
      const chatHistory = state.messages
        .filter(msg => msg.status === 'local' || msg.status === 'response')
        .map(msg => ({
          role: msg.status === 'local' ? 'user' as const : 'assistant' as const,
          content: msg.message
        }));

      const userMessage = typeof message === 'string' ? message : message?.message || "请生成教研问题";

      console.log('Sending request to AI:', {
        systemPrompt,
        chatHistory,
        userMessage
      });

      const response = await ds.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: userMessage }
        ],
      });

      console.log('AI Response:', response);

      const question = response.choices[0]?.message?.content;
      if (question) {
        const messageObj = {
          message: question,
          status: 'response' as CustomMessageStatus
        };
        console.log('Sending success message:', messageObj);
        onSuccess(messageObj);
      } else {
        throw new Error("生成问题失败");
      }
    } catch (error) {
      console.error('Error in planning agent:', error);
      onError(error instanceof Error ? error : new Error("生成问题时出现错误"));
    }
  }
});


// 使用 useXChat 管理对话
const {
  onRequest: onPlanningRequest,
  messages: planningMessages,
} = useXChat<XAgentMessage>({
  agent: planningAgentX.value,
  requestPlaceholder: { message: '正在生成问题...', status: 'loading' },
  requestFallback: { message: '生成问题失败，请重试。', status: 'error' },
});

const handleMessageSubmit = async (content: string) => {
  console.log("handleMessageSubmit", content);
  if (!content.trim()) return;
  // 提交用户提问
  const userMessage = {
    id: String(state.id++),
    message: content,
    status: 'local'
  };
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, { message: content, status: 'local' });

  // try {
  //   if (!state.learningPlan) {
  //     await handleSeedQuestionAnswer(content);
  //   } else {
  //     const dialogueMessage = {
  //       message: content,
  //       status: 'local' as ChatMessageItem
  //     };
  //     await onDialogueRequest(dialogueMessage);
  //     const latestMessage = dialogueMessages.value[dialogueMessages.value.length - 1];
  //     if (latestMessage && latestMessage.message) {
  //       store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
  //         id: String(state.id++),
  //         message: latestMessage.message,
  //         status: 'response' as ChatMessageItem
  //       });

  //     }
  //     if (state.questionProgress.current === state.questionProgress.total) {
  //       await onFeedbackRequest({ message: content, status: 'local' });
  //       const feedbackMessage = feedbackMessages.value[feedbackMessages.value.length - 1];
  //       if (feedbackMessage && feedbackMessage.message) {
  //         chatMessagesList.value.push({
  //           id: String(state.id++),
  //           message: feedbackMessage.message,
  //           status: 'response'
  //         });
  //       }
  //     }
  //   }
  // } catch (error) {
  //   console.error('Error handling message:', error);
  //   chatMessagesList.value.push({
  //     id: String(state.id++),
  //     message: '抱歉，处理消息时出现错误。',
  //     status: 'error'
  //   });
  //   console.log("messages", chatMessagesList.value);
  // }
  userInput.value = '';
  chatBegin.value = true;
  scrollToBottom();
};

// 对话框内容管理
const setContent = (v: string) => {
  userInput.value = v;
}

// const items = messages.value.map(({ message, id }) => ({
//   // key is required, used to identify the message
//   key: id,
//   content: message,
// }));

onMounted(async () => {
  try {
    await nextTick();


    await nextTick();
    scrollToBottom();
  } catch (error) {

    await nextTick();
    scrollToBottom();
  }
});


</script>

<template>
  <HeaderView pageTitle="人机协同教研" />
  <div id="chat" class="vis">
    <div class="chat-steps">
      <div v-show="currentStep === 0" class="chat-aim">
        <AimView />
      </div>
      <div v-show="currentStep > 0" class="chat-deep">
        <InterlinkView />
      </div>
    </div>
    <!-- <div class="chat-input" v-show="currentStep > 0">
      <Sender v-model:value="userInput" @submit="(content: string) => handleMessageSubmit(content)"
        :loading="senderLoading">
      </Sender>
    </div> -->
  </div>
</template>

<style scoped>
.vis {
  /* 减去头部高度 */
  height: calc(100vh - 68px);
  width: 100%;
  border-left: #d3d3d3 1px solid;
  border-bottom: #d3d3d3 1px solid;
  border-right: #d3d3d3 1px solid;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  /* 防止出现双滚动条 */
}

.chat {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1 1 auto;
}

.chat-steps {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1;
  width: 100%;
}

.chat-input {
  width: 100%;
  padding: 20px;
  background: white;
  border-top: 1px solid #e8e8e8;
  position: sticky;
  bottom: 0;
}

:deep(.ant-x-sender) {
  width: 100%;
  max-width: none;
  border-radius: 8px;
}
</style>
