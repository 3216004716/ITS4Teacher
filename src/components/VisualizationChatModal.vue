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
import { Modal, Typography, Card, Button, Space, Divider } from 'ant-design-vue';
import OpenAI from "openai";
import { hexToRgba, sendToLRS } from '../utils/tools';
import { key } from '../store';
import { useStore } from 'vuex';
import {
  CHAT_VUEX_NAMESPACE,
  ADD_VISUALIZATION_CHAT_MESSAGE,
  SET_CURRENT_VISUALIZATION_DIALOG,
  INIT_VISUALIZATION_DIALOG,
  GET_VISUALIZATION_DIALOG_MESSAGES,
  ChatMessageItem,
} from '../store/modules/chat';
import {
  DISPLAY_ROLE_LOCAL,
  DISPLAY_ROLE_AI,
  REQUEST_ROLE_USER,
  REQUEST_ROLE_ASSISTANT
} from '../utils/const';
import markdownit from 'markdown-it';
import { getVisualizationConfig, type VisualizationPromptConfig } from '../utils/visualization-prompts';
import questionClassification from '../data/question_classification.json';

const props = defineProps<{
  visible: boolean;
  visualizationName: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const md = markdownit({ html: true, breaks: true });

const renderMarkdown = (content: string) => {
  return h(Typography, null, {
    default: () => h('div', { innerHTML: md.render(content) })
  });
};

const ChatbotSvgIcon = createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/c/font_4890170_2nweypkfbkq.js',
});

const store = useStore(key);
const userInput = ref("");
const senderLoading = ref(false);
const showPresetQuestions = ref(true);
const streamingMessage = ref(""); // 流式显示的消息
const isStreaming = ref(false);  // 是否正在流式接收
const followUpQuestions = ref<string[]>([]); // 后续追问问题
const showFollowUpQuestions = ref(false); // 是否显示后续追问

// 获取当前可视化的配置
const currentConfig = computed(() => getVisualizationConfig(props.visualizationName));

// 获取当前可视化对话的消息
const currentDialogMessages = computed(() => 
  store.getters[CHAT_VUEX_NAMESPACE + GET_VISUALIZATION_DIALOG_MESSAGES](props.visualizationName)
);

// 合并实际消息和流式消息用于显示
const displayMessages = computed(() => {
  const messages = [...currentDialogMessages.value];
  
  // 如果正在流式接收，添加临时消息
  if (isStreaming.value && streamingMessage.value) {
    messages.push({
      id: 'streaming',
      content: streamingMessage.value,
      status: DISPLAY_ROLE_AI
    });
  }
  
  return messages;
});

// 状态管理
const state = reactive({
  id: 0,
  apiKey: "sk-e18179ecb5ba4eb9b9d07a287dff4edd",
});

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

// 生成后续追问问题
const generateFollowUpQuestions = async (userQuestion: string, aiResponse: string) => {
  try {
    const completion = await ds.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: 'system',
          content: `你是一个专业的教研专家。基于用户的问题和AI的回答，生成3个简洁的后续追问问题，每个问题要：
          1. 针对${props.visualizationName}的分析深入探讨
          2. 帮助教师进一步提升教学提问能力
          3. 问题要具体、可操作、有启发性
          
          请直接返回3个问题，每行一个，不需要编号或其他格式，例如：
          这种分析结果在实际教学中如何应用？
          如何根据这些数据调整我的提问策略？
          还有哪些维度需要进一步关注？`
        },
        {
          role: REQUEST_ROLE_USER,
          content: `分析背景：${props.visualizationName}
          用户问题：${userQuestion}
          AI回答：${aiResponse}`
        }
      ]
    });

    const response = completion.choices[0].message.content || '';
    const questions = response.split('\n').filter(q => q.trim()).slice(0, 3);
    
    if (questions.length > 0) {
      followUpQuestions.value = questions;
      showFollowUpQuestions.value = true;
      console.log('生成后续追问问题:', questions);
    }
  } catch (error) {
    console.error('生成后续问题失败:', error);
  }
};

// 处理后续问题选择
const handleFollowUpQuestion = (question: string) => {
  showFollowUpQuestions.value = false;
  followUpQuestions.value = [];
  onMessageSubmit(question);
};

// 处理AI请求
const handleAIRequest = async (content: string) => {
  // 添加用户消息到store
  store.commit(CHAT_VUEX_NAMESPACE + ADD_VISUALIZATION_CHAT_MESSAGE, { 
    dialogName: props.visualizationName, 
    message: content, 
    status: DISPLAY_ROLE_LOCAL 
  });
  setContent('');
  
  senderLoading.value = true;
  isStreaming.value = true;
  streamingMessage.value = "";
  
  try {
    // 获取对话历史
    let temp = currentDialogMessages.value.map((msg: ChatMessageItem) => ({
      role: msg.status === DISPLAY_ROLE_LOCAL ? REQUEST_ROLE_USER : REQUEST_ROLE_ASSISTANT,
      content: msg.content
    }))
    
    // 添加系统提示词和统计数据
    const statsData = getVisualizationStats(props.visualizationName);
    const enhancedSystemPrompt = currentConfig.value.systemPrompt + `
    
当前可视化的具体数据：${statsData}
请结合这些具体数据进行分析和回答。`;
    
    temp.unshift({
      role: 'system',
      content: enhancedSystemPrompt
    });
    
    console.log("AI request messages:", temp);
    const completion = await ds.chat.completions.create({
      messages: temp,
      model: "deepseek-chat",
      stream: true
    });
    
    // 流式输出
    let fullContent = "";
    for await (const chunk of completion) {
      if (!chunk.choices[0].finish_reason) {
        const deltaContent = chunk.choices[0].delta.content || "";
        fullContent += deltaContent;
        streamingMessage.value = fullContent; // 实时更新流式消息
        scrollToBottom();
      } else {
        // 流式结束，添加完整消息到store
        isStreaming.value = false;
        streamingMessage.value = "";
        
        store.commit(CHAT_VUEX_NAMESPACE + ADD_VISUALIZATION_CHAT_MESSAGE, {
          dialogName: props.visualizationName,
          message: fullContent,
          status: DISPLAY_ROLE_AI
        });
        
        console.log("AI response completed:", fullContent);
        
        // 延迟通知，确保store更新完成
        nextTick(() => {
          console.log("通知LearningPathView有新的对话内容");
          store.commit(CHAT_VUEX_NAMESPACE + NOTIFY_NEW_DIALOGUE);
        });
        
        // 生成后续追问问题
        generateFollowUpQuestions(content, fullContent);
        
        scrollToBottom();
      }
    }
  } catch (error) {
    console.error('AI request failed:', error);
    // 只在确实发生错误时添加错误消息
    if (!isStreaming.value) {
      store.commit(CHAT_VUEX_NAMESPACE + ADD_VISUALIZATION_CHAT_MESSAGE, {
        dialogName: props.visualizationName,
        message: '抱歉，AI服务暂时不可用，请稍后再试。',
        status: DISPLAY_ROLE_AI
      });
    }
  } finally {
    senderLoading.value = false;
    isStreaming.value = false;
    streamingMessage.value = "";
  }
};

// 处理预设问题选择
const handlePresetQuestion = (question: string) => {
  showPresetQuestions.value = false;
  onMessageSubmit(question);
};

const onMessageSubmit = (content: string) => {
  if (!content.trim()) return;
  console.log("onMessageSubmit", content);
  showPresetQuestions.value = false; // 隐藏预设问题
  showFollowUpQuestions.value = false; // 隐藏后续问题
  
  // 直接调用AI请求
  handleAIRequest(content);
  
  // 发送到LRS
  const userID = 'user123';
  const xapiData = {
    actor: {
      name: userID,
      objectType: 'Agent',
      account: {
        homePage: 'https://app.lessonanalysis.ai',
        name: 'user-' + new Date().getTime()
      }
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/raised_question',
      display: {
        'zh-CN': '提出问题',
        'en-US': 'raised question'
      }
    },
    object: {
      objectType: 'Activity',
      id: 'https://app.lessonanalysis.ai/activities/visualization-chat-' + props.visualizationName + '-' + new Date().getTime(),
      definition: {
        type: 'http://adlnet.gov/expapi/activities/chat',
        name: {
          'zh-CN': `${props.visualizationName}对话消息`,
          'en-US': content
        },
      }
    },
    result: {
      extensions: {
        'http://example.com/result': content,
        interactionComponent: 'visualizationChat',
        visualizationName: props.visualizationName
      }
    },
    timestamp: new Date().toISOString()
  };
  sendToLRS(xapiData);
}

// 对话框内容管理
const setContent = (v: string) => {
  userInput.value = v;
}

// 获取可视化统计数据
const getVisualizationStats = (visualizationName: string) => {
  const stats = {
    '问题类型分析': () => {
      // 重新统计四何问题
      const matStats = {};
      const threeHeStats = { '由何': 0, '又何': 0, '然何': 0 };
      let totalQuestions = 0;
      
      questionClassification.questions.forEach(q => {
        // 统计四何问题
        if (q.mat) {
          matStats[q.mat] = (matStats[q.mat] || 0) + 1;
          totalQuestions++;
        }
        // 统计三何问题
        if (q.three && q.three !== '无') {
          threeHeStats[q.three] = (threeHeStats[q.three] || 0) + 1;
        }
      });
      
      return `四何问题统计：${JSON.stringify(matStats)}，三何问题统计：${JSON.stringify(threeHeStats)}，总问题数：${totalQuestions}`;
    },
    '课堂结构分析': () => {
      const totalTime = questionClassification.questions.length > 0 ? 
        Math.max(...questionClassification.questions.map(q => q.beginTime || 0)) : 0;
      return `课堂总时长：${Math.round(totalTime/60)}分钟，问题节点数：${questionClassification.questions.length}`;
    },
    '问题链整体分析': () => {
      const timeDistribution = questionClassification.questions.map(q => q.beginTime || 0);
      const avgInterval = timeDistribution.length > 1 ? 
        (Math.max(...timeDistribution) - Math.min(...timeDistribution)) / (timeDistribution.length - 1) : 0;
      return `问题总数：${questionClassification.questions.length}，平均间隔：${Math.round(avgInterval)}秒`;
    },
    '问题情境化分析': () => {
      const contextualCount = questionClassification.questions.filter(q => 
        q.three && q.three !== '无').length;
      const contextualRate = questionClassification.questions.length > 0 ? 
        (contextualCount / questionClassification.questions.length * 100).toFixed(1) : 0;
      return `情境化问题：${contextualCount}个，情境化率：${contextualRate}%`;
    }
  };
  
  return stats[visualizationName]?.() || '暂无统计数据';
};

// 重置预设问题显示状态
const resetPresetQuestions = () => {
  if (currentDialogMessages.value.length === 0) {
    showPresetQuestions.value = true;
  }
};

// 监听对话打开，初始化对话
watch(() => props.visible, (newValue) => {
  if (newValue && props.visualizationName) {
    console.log('Opening dialog for:', props.visualizationName);
    
    // 初始化或设置当前对话
    store.commit(CHAT_VUEX_NAMESPACE + INIT_VISUALIZATION_DIALOG, props.visualizationName);
    store.commit(CHAT_VUEX_NAMESPACE + SET_CURRENT_VISUALIZATION_DIALOG, props.visualizationName);
    
    // 重置预设问题显示状态
    resetPresetQuestions();
    
    nextTick(() => {
      console.log('Current dialog messages count:', currentDialogMessages.value.length);
      
      // 如果是新对话，添加欢迎消息
      if (currentDialogMessages.value.length === 0) {
        console.log('Adding welcome message');
        store.commit(CHAT_VUEX_NAMESPACE + ADD_VISUALIZATION_CHAT_MESSAGE, {
          dialogName: props.visualizationName,
          message: currentConfig.value.welcomeMessage,
          status: DISPLAY_ROLE_AI
        });
      }
    });
  }
});

// 修改滚动到底部的方法
const scrollToBottom = () => {
  nextTick(() => {
    const chatContent = document.querySelector('.visualization-chat-content');
    if (chatContent) {
      chatContent.scrollTo({
        top: chatContent.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
};

// 监听消息列表变化
watch(() => currentDialogMessages.value.length, () => {
  scrollToBottom();
});

// 处理关闭
const handleClose = () => {
  emit('close');
};

</script>

<template>
  <Modal
    :open="visible"
    :title="`${visualizationName} - 智能对话`"
    width="800px"
    height="600px"
    @cancel="handleClose"
    :footer="null"
    :destroyOnClose="false"
  >
    <div class="visualization-chat">
      <div class="visualization-chat-content">
        <div class="messages-wrapper">
          <!-- 预设问题选择 -->
          <div v-if="showPresetQuestions && currentDialogMessages.length <= 1" class="preset-questions">
            <Card title="💡 建议问题" size="small" class="preset-card">
              <template #extra>
                <Button type="text" size="small" @click="showPresetQuestions = false">隐藏</Button>
              </template>
              <div class="questions-grid">
                <Button 
                  v-for="(question, index) in currentConfig.presetQuestions" 
                  :key="index"
                  type="default"
                  size="small"
                  class="question-button"
                  @click="handlePresetQuestion(question)"
                >
                  {{ question }}
                </Button>
              </div>
              <Divider style="margin: 12px 0;" />
              <p class="tip">💡 您也可以直接在下方输入框中提出自己的问题</p>
            </Card>
          </div>

          <!-- 对话消息 -->
          <Bubble.List 
            :roles="roles" 
            :items="displayMessages.map((msg, index) => ({
              key: msg.id === 'streaming' ? 'streaming' : String(index),
              role: msg.status === DISPLAY_ROLE_LOCAL ? DISPLAY_ROLE_LOCAL : DISPLAY_ROLE_AI,
              content: msg.content,
              loading: msg.id === 'streaming', // 流式消息显示加载状态
            }))" 
          />

          <!-- 后续追问问题 -->
          <div v-if="showFollowUpQuestions && followUpQuestions.length > 0" class="follow-up-questions">
            <Card title="🤔 深入探讨" size="small" class="follow-up-card">
              <template #extra>
                <Button type="text" size="small" @click="showFollowUpQuestions = false">隐藏</Button>
              </template>
              <div class="follow-up-grid">
                <Button 
                  v-for="(question, index) in followUpQuestions" 
                  :key="index"
                  type="default"
                  size="small"
                  class="follow-up-button"
                  @click="handleFollowUpQuestion(question)"
                >
                  {{ question }}
                </Button>
              </div>
              <p class="follow-tip">💡 点击选择感兴趣的问题继续深入讨论</p>
            </Card>
          </div>
        </div>
      </div>

      <div class="visualization-chat-input">
        <Sender 
          v-model:value="userInput" 
          @submit="onMessageSubmit" 
          :loading="senderLoading"
          placeholder="请输入您的问题..."
        >
          {{ userInput }}
        </Sender>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.visualization-chat {
  height: 650px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.visualization-chat-content {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  scroll-behavior: smooth;
  margin-bottom: 16px;
  /* 滚动条美化 */
  scrollbar-width: thin;
  scrollbar-color: #bdbdbd #ffffff;
}

/* Chrome/Safari/Edge 滚动条美化 */
.visualization-chat-content::-webkit-scrollbar {
  width: 8px;
  background: transparent;
  opacity: 0;
  transition: opacity 0.3s;
}

.visualization-chat-content:hover::-webkit-scrollbar,
.visualization-chat-content:active::-webkit-scrollbar,
.visualization-chat-content:focus::-webkit-scrollbar {
  opacity: 1;
  background: #f0f0f0;
}

.visualization-chat-content::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.visualization-chat-content:hover::-webkit-scrollbar-thumb {
  opacity: 1;
}

.messages-wrapper {
  width: 100%;
  flex: 1;
  padding: 10px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.visualization-chat-input {
  width: 100%;
  background: white;
  border-top: 1px solid #e8e8e8;
  padding-top: 16px;
}

:deep(.ant-x-sender) {
  width: 100%;
  max-width: none;
  border-radius: 8px;
}

.preset-questions {
  width: 100%;
  margin-bottom: 16px;
}

.preset-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.questions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

.question-button {
  text-align: left;
  height: auto;
  min-height: 36px;
  padding: 8px 12px;
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.4;
  border-radius: 8px;
  background: white;
  border: 1px solid #e8e8e8;
  transition: all 0.3s;
  font-size: 13px;
}

.question-button:hover {
  border-color: #1890ff;
  background: #f0f8ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.tip {
  margin: 0;
  font-size: 12px;
  color: #666;
  text-align: center;
  font-style: italic;
}

.follow-up-questions {
  width: 100%;
  margin-top: 16px;
  margin-bottom: 16px;
}

.follow-up-card {
  background: linear-gradient(135deg, #fff7e6 0%, #fff2e6 100%);
  border: 1px solid #ffd591;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(255, 149, 107, 0.1);
}

.follow-up-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

.follow-up-button {
  text-align: left;
  height: auto;
  min-height: 32px;
  padding: 6px 10px;
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.3;
  border-radius: 6px;
  background: white;
  border: 1px solid #ffd591;
  transition: all 0.3s;
  font-size: 12px;
  color: #d46b08;
}

.follow-up-button:hover {
  border-color: #fa8c16;
  background: #fff7e6;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(250, 140, 22, 0.2);
}

.follow-tip {
  margin: 0;
  font-size: 11px;
  color: #d46b08;
  text-align: center;
  font-style: italic;
}
</style>