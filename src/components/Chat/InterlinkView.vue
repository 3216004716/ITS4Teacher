<script setup lang="ts">
import {
  defineComponent,
  reactive,
  onMounted,
  ref,
  computed,
  nextTick,
  h,
  watch
} from "vue";
import {
  Welcome, Bubble,
  Sender,
  useXAgent,
  useXChat,
  type BubbleListProps,
  Prompts,
  type PromptsProps,
  type MessageStatus,
  type RequestFn
} from 'ant-design-x-vue';
import {
  createFromIconfontCN,
  UserOutlined,
} from '@ant-design/icons-vue';
import { Flex, message as messageAnt, Typography } from 'ant-design-vue';
import OpenAI from "openai";
import {
  CN_TOPIC_TAGS,
  EN_TOPIC_TAGS,
  PROMPT_STEPS,
  PROMPT_STEPS_CN,
  TOPIC_TAGS_COLORS
} from '../../utils/topic';
import { hexToRgba, sendToLRS } from '../../utils/tools';
import { key } from '../../store';
import { useStore } from 'vuex';
import {
  CHAT_VUEX_NAMESPACE,
  GET_CHAT_STEP,
  GET_TOPIC_TAG,
  SET_TOPIC_TAG,
  ADD_CHAT_MESSAGE,
  NOTIFY_NEW_DIALOGUE, // 新增：导入通知新对话的mutation
  GET_CHAT_MESSAGES,
  ChatMessageItem,
} from '../../store/modules/chat';
import {
  DISPLAY_ROLE_LOCAL,
  DISPLAY_ROLE_AI,
  REQUEST_ROLE_USER,
  REQUEST_ROLE_ASSISTANT
} from '../../utils/const';
import markdownit from 'markdown-it';
import { objectType } from "ant-design-vue/es/_util/type";

defineOptions({ name: 'AXPromptsFlexWrapSetup' });

const md = markdownit({ html: true, breaks: true });

const renderMarkdown = (content: string) => {
  return h(Typography, null, {
    default: () => h('div', { innerHTML: md.render(content) })
  });
};

const ChatbotSvgIcon = createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/c/font_4890170_2nweypkfbkq.js',
});
const currentStep = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_CHAT_STEP]);
const topicTag = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_TOPIC_TAG]);
const chatMessagesList = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_CHAT_MESSAGES]);

const userInput = ref("");
const chatBegin = ref(false);
const senderLoading = ref(false);
const messagesWrapper = ref();
const store = useStore(key);
const promptSteps = PROMPT_STEPS_CN;


// 状态管理
const state = reactive({
  id: 0,
  apiKey: "sk-e18179ecb5ba4eb9b9d07a287dff4edd",
});

//////////////////
// prompt管理
const [message, contextHolder] = messageAnt.useMessage();

///////////////////
// 对话管理
const roles: BubbleListProps['roles'] = {
  ai: {
    placement: 'start',
    shape: 'corner',
    variant: 'outlined',
    avatar: {
      icon: h(ChatbotSvgIcon, {
        type: "icon-shuziyuangongjiedian",
        fill: "#ffffff"
      }),
      style: {
        background: 'linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
    style: {
      maxWidth: '600px',
      // background: `linear-gradient(97deg, #ddebec79 0%, #c0dfd979 100%)`,
    },
    messageRender: renderMarkdown
  },
  local: {
    placement: 'end',
    shape: 'corner',
    variant: 'filled',
    avatar: {
      icon: h(UserOutlined, {
        style: {
          color: '#ffffff',
          fontSize: '20px'
        }
      }),
      style: {
        // background: `#6E00FF`,
        background: `linear-gradient(135deg,rgba(110, 0, 255, 1) 0%, rgba(155, 77, 195, 1) 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '600px',

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

const onMessageSubmit = (content: string) => {
  if (!content.trim()) return;
  console.log("onMessageSubmit", content);
  onRequest({ message: content });
  const userID = 'user123';
  const xapiData = {
    actor: {
      name: userID,
      objectType: 'Agent',
      account: {
        homePage: 'https://app.lessonanalysis.ai',  // 应该是固定的域名URL
        name: 'user-' + new Date().getTime()  // 确保用户唯一标识
      }
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/raised_question',  // 标准xAPI动词URI
      display: {
        'zh-CN': '提出问题',
        'en-US': 'raised question'
      }
    },
    object: {
      objectType: 'Activity',
      id: 'https://app.lessonanalysis.ai/activities/chat-session-' + new Date().getTime(),  // 应为完整URI
      definition: {
        type: 'http://adlnet.gov/expapi/activities/chat',  // 活动类型
        name: {
          'zh-CN': '对话消息',
          'en-US': content
        },
      }
    },
    result: {  // 添加结果信息
      extensions: {
        'http://example.com/result': content,
        interactionComponent: 'chatView'
      }
    },
    timestamp: new Date().toISOString()
  };
  sendToLRS(xapiData);
  console.log("agent messages", messages.value);
}

// Agent for request
const [agent] = useXAgent({
  request: async ({ message }, { onSuccess, onUpdate, onError }) => {
    console.log("request", { message, status: DISPLAY_ROLE_LOCAL });
    store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, { message, status: DISPLAY_ROLE_LOCAL });
    setContent('')
    console.log('dont commit', chatMessagesList.value);

    let temp = chatMessagesList.value.map((msg: ChatMessageItem) => ({
      role: msg.status === DISPLAY_ROLE_LOCAL ? REQUEST_ROLE_USER : REQUEST_ROLE_ASSISTANT,
      content: msg.content
    }))
    console.log("temp", temp);
    const completion = await ds.chat.completions.create({
      messages: temp,
      model: "deepseek-chat",
      stream: true
    });
    // 流式输出
    // console.log("chat agent completion", completion);
    let fullContent = "";
    for await (const chunk of completion) {
      // console.log("chunk", chunk);
      if (!chunk.choices[0].finish_reason) {
        fullContent += chunk.choices[0].delta.content || "";
        onUpdate(fullContent);
        scrollToBottom();
      } else {
        store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
          message: fullContent,
          status: DISPLAY_ROLE_AI
        });
        console.log("response", {
          message: fullContent,
          status: DISPLAY_ROLE_AI
        });

        // send to lrs
        const user = 'Chat AI Agent';
        const xapiData = {
          actor: {
            name: user,
            objectType: 'Agent',
            account: {
              homePage: 'https://app.lessonanalysis.ai',  // 应该是固定的域名URL
              name: 'user-' + new Date().getTime()  // 确保用户唯一标识
            }
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/response',  // 标准xAPI动词URI
            display: {
              'zh-CN': '回复用户',
              'en-US': 'response'
            }
          },
          object: {
            objectType: 'Activity',
            id: 'https://app.lessonanalysis.ai/activities/chat-session-' + new Date().getTime(),  // 应为完整URI
            definition: {
              type: 'http://adlnet.gov/expapi/activities/chat',  // 活动类型
              name: {
                'zh-CN': '对话消息',
                'en-US': fullContent
              },
            }
          },
          result: {  // 添加结果信息
            extensions: {
              'http://example.com/result': fullContent,
              interactionComponent: 'chatView'
            }
          },
          timestamp: new Date().toISOString()
        };
        sendToLRS(xapiData);
        
        // 通知LearningPathView组件有新的对话，可以提取知识点
        store.commit(CHAT_VUEX_NAMESPACE + NOTIFY_NEW_DIALOGUE);
        console.log("已通知LearningPathView提取新知识点");
        
        onSuccess(fullContent);
        scrollToBottom();
      }
    }
  },
});

// Chat messages
const { onRequest, messages } = useXChat({
  agent: agent.value,
  requestPlaceholder: '正在生成内容...',
  requestFallback: 'Mock failed return. Please try again later.',
});


// 对话框内容管理
const setContent = (v: string) => {
  userInput.value = v;
}


onMounted(() => {
  console.log("onMounted: initial prompt");
  const initialPrompt = `
    你是一个专业的教研专家，负责了解教师的教学情况。
    请你根据生成一个开放性的问题，帮助了解教师在课堂提问中存在的问题以及想要提升的能力。
    问题要简洁、专业、有针对性。
    只输出一个问题文本即可，不需要添加""包裹着文本。
    在教师用户回复这个问题后，按照“用户内容的评估反馈—提出下一个关联的问题”的顺序，继续进行对话，聚焦于教师想要提升的能力不断引导教师进行思考。
  `
  onRequest({ message: initialPrompt });

});

// 修改滚动到底部的方法
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

// 监听消息列表变化
watch(() => chatMessagesList.value.length, () => {
  scrollToBottom();
});

// 修改消息发送处理方法
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

// 修改问题生成方法
// const generateNextQuestion = async () => {
//   try {
//     const response = await ds.chat.completions.create({
//       model: "deepseek-chat",
//       messages: [
//         {
//           role: "system" as const,
//           content: `你是一个专业的教研专家。这是第 ${state.questionProgress.current + 1} 个问题。
// 请根据用户之前的回答，生成一个开放性的问题，帮助了解教师的教学情况。
// 要求：问题要简洁、专业、有针对性。`
//         },
//         ...chatMessagesList.value.map(msg => ({
//           role: msg.status === 'local' ? 'user' as const : 'assistant' as const,
//           content: msg.message
//         }))
//       ],
//     });

//     return response.choices[0]?.message?.content || null;
//   } catch (error) {
//     console.error('Error generating next question:', error);
//     return null;
//   }
// };

// 单选处理
const handleTopicChange = (tag: string) => {
  console.log("commit topicTag", tag);
  store.commit(CHAT_VUEX_NAMESPACE + SET_TOPIC_TAG, tag);
};

async function sendChatToLRS() {
  // 获取所有对话消息
  const messages = chatMessagesList.value;
  // 组装xAPI语句数组
  const statements = messages.map((msg: any, idx: number) => {
    const isUser = msg.status === DISPLAY_ROLE_LOCAL;
    return {
      actor: {
        objectType: 'Agent',
        name: isUser ? 'User' : 'AI',
        account: {
          homePage: window.location.origin,
          name: isUser ? 'user' : 'ai'
        }
      },
      verb: {
        id: isUser
          ? 'http://adlnet.gov/expapi/verbs/answered'
          : 'http://adlnet.gov/expapi/verbs/responded',
        display: { 'zh-CN': isUser ? '回答' : '回复' }
      },
      object: {
        objectType: 'Activity',
        id: window.location.href + '#chat-' + idx,
        definition: {
          name: { 'zh-CN': '对话消息' },
          description: { 'zh-CN': msg.message || msg.content || '' }
        }
      },
      timestamp: msg.timestamp
        ? new Date(msg.timestamp).toISOString()
        : new Date().toISOString()
    };
  });
  try {
    await sendToLRS(statements);
    message.success('对话内容已成功发送到LRS');
  } catch (err) {
    const error = err as Error;
    message.error('发送到LRS失败: ' + (error.message || error));
  }
}

</script>

<template>
  <!-- <HeaderView pageTitle="AI CHAT" /> -->
  <div class="chat">
    <div class="chat-navigation">
      <div class="progress">
        <!-- <span class="progress-title">Progress</span> -->
        <span class="progress-title">教研进度</span>
        <span class="progress-content">
          <a-steps :current="currentStep" size="small"
            :items="promptSteps.map(d => { return { title: d.name } })"></a-steps>
        </span>
      </div>
      <!-- <div class="topic-tags">
        <span class="topic-tag-title">Topic</span>
        <span v-for="(tag, index) in EN_TOPIC_TAGS" :key="tag" class="topic-tag" :class="{ active: topicTag === tag }"
          :style="{
            color: topicTag === tag ? '#ffffff' : TOPIC_TAGS_COLORS[index],
            borderColor: TOPIC_TAGS_COLORS[index],
            background: hexToRgba(TOPIC_TAGS_COLORS[index], topicTag === tag ? 0.7 : 0.1)
          }" @click="handleTopicChange(tag)">
          {{ tag }}
        </span>
      </div> -->
    </div>
    <div class="chat-content">
      <div class="messages-wrapper" ref="messagesWrapper">
        <!-- <Bubble.List :roles="roles" :items="chatMessagesList.map(({ id, content, status }) => ({ -->
        <Bubble.List :roles="roles" :items="messages.map(({ id, message, status }) => ({
          key: String(id),
          // loading: status === 'loading',
          role: status === DISPLAY_ROLE_LOCAL ? DISPLAY_ROLE_LOCAL : DISPLAY_ROLE_AI,
          content: message,
        })).slice(1)" />
      </div>
    </div>

    <div class="chat-input" id="linkview-input">
      <Sender v-model:value="userInput" @submit="onMessageSubmit" :loading="senderLoading">
        {{ userInput }}
      </Sender>
    </div>
  </div>
</template>

<style scoped>
.chat {
  /* 减去头部高度 */
  height: calc(100vh - 68px);
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  /* 防止出现双滚动条 */
}

.chat-navigation {
  margin: 4px;
  padding: 10px;
  position: sticky;
  top: 0;
  z-index: 10;
  width: calc(100% - 8px);
  /* background: linear-gradient(97deg, #ddebec79 0%, #c0dfd979 100%); */
}

.topic-tags {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 14px;
}

.topic-tag-title {
  font-weight: bold;
  padding: 4px 0;
}

.topic-tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  background: #fff;
}

.progress {
  display: flex;
  margin-bottom: 12px;
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

.chat-content {
  flex: 1;
  width: calc(100% - 8px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  scroll-behavior: smooth;
  margin: 0 4px 4px 4px;
  /* 滚动条美化 */
  scrollbar-width: thin;
  scrollbar-color: #bdbdbd #ffffff;
}

/* Chrome/Safari/Edge 滚动条美化 */
.chat-content::-webkit-scrollbar {
  width: 8px;
  background: transparent;
  opacity: 0;
  transition: opacity 0.3s;
}

.chat-content:hover::-webkit-scrollbar,
.chat-content:active::-webkit-scrollbar,
.chat-content:focus::-webkit-scrollbar {
  opacity: 1;
  background: #f0f0f0;
}

.chat-content::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.chat-content:hover::-webkit-scrollbar-thumb {
  opacity: 1;
}

.messages-wrapper {
  width: 100%;
  flex: 1;
  /* 不要设置 overflow-y 和 scroll-behavior */
  padding: 10px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* background: linear-gradient(97deg, #ddebec79 0%, #c0dfd979 100%); */
}

:deep(.ant-x-bubble-list) {
  width: 100%;
  height: 100%;
  padding: 0;
  position: relative;
}

:deep(.ant-x-bubble) {
  max-width: 80%;
  margin: 12px 0;
}

:deep(.ant-x-bubble-content) {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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
