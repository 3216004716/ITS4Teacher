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
import { Flex, message as messageAnt, Typography, Tooltip, Button } from 'ant-design-vue';
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
  SET_CHAT_STEP,
  ADD_CHAT_MESSAGE,
  NOTIFY_NEW_DIALOGUE, // 新增：导入通知新对话的mutation
  GET_CHAT_MESSAGES,
  ChatMessageItem,
  // 新增：课堂提问教研相关导入
  GET_RESEARCH_STATE,
  GET_CURRENT_ROUND,
  GET_IDENTIFIED_WEAKNESS,
  GET_RESEARCH_GENERATED_CARDS,
  SET_RESEARCH_ROUND,
  SET_IDENTIFIED_WEAKNESS,
  SET_KEY_INSIGHTS,
  SET_FINAL_SOLUTION,
  SET_DATA_ANALYSIS_RESULT,
  SET_LITERATURE_EVIDENCE,
  ADVANCE_RESEARCH_ROUND,
  COMPLETE_RESEARCH_STEP,
  RESET_RESEARCH_STATE,
} from '../../store/modules/chat';
import {
  DISPLAY_ROLE_LOCAL,
  DISPLAY_ROLE_AI,
  REQUEST_ROLE_USER,
  REQUEST_ROLE_ASSISTANT
} from '../../utils/const';
import markdownit from 'markdown-it';
import { objectType } from "ant-design-vue/es/_util/type";
// 新增：导入教研提示词配置
import {
  generateStepPrompt,
  getStepInfo,
  getRoundDescription,
  RESEARCH_STEPS_INFO,
  KNOWLEDGE_WEAKNESS_TYPES
} from '../../utils/questioning-research-prompts';
// 新增：导入数据服务
import {
  getCompleteDataAnalysis,
  getTargetedDataAnalysis,
  generateStepInsights,
  generateDataAnalysisReport
} from '../../utils/research-data-service';
// 新增：导入文献服务
import {
  getLiteratureByWeaknessType,
  searchLiteratureByKeywords,
  generateLiteratureReview,
  getAllTheoreticalBasis,
  getAllFrontierViews
} from '../../utils/literature-service';
// 新增：导入课程背景服务  
import {
  extractLessonContext,
  generateLessonContextPrompt,
  validateResponseRelevance
} from '../../utils/lesson-context-service';
// 新增：导入导出弹窗组件
import ResearchExportModal from '../ResearchExportModal.vue';

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

// 新增：教研状态计算属性
const researchState = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_RESEARCH_STATE]);
const currentRound = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_CURRENT_ROUND]);
const identifiedWeakness = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_IDENTIFIED_WEAKNESS]);
const availableCards = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_RESEARCH_GENERATED_CARDS]());

// 教研步骤信息
const researchSteps = computed(() => RESEARCH_STEPS_INFO);
const currentStepInfo = computed(() => getStepInfo(currentStep.value));
const currentRoundDescription = computed(() => getRoundDescription(currentStep.value, currentRound.value));

const userInput = ref("");
const chatBegin = ref(false);
const senderLoading = ref(false);
const messagesWrapper = ref();
const store = useStore(key);
const promptSteps = PROMPT_STEPS_CN;

// 新增：教研流程控制状态
const showExportModal = ref(false);
const isResearchMode = ref(true); // 是否启用教研模式
const stepTransitioning = ref(false); // 步骤切换中

// 新增：用户参与度增强状态
const showQuickReplies = ref(false);
const quickReplyOptions = ref<string[]>([]);
const lastAiMessage = ref(''); // 记录最新AI消息用于分析选项

// 新增：批判性思考引导状态
const showCriticalThinking = ref(false);
const criticalThinkingPrompt = ref('');
const criticalThinkingCount = ref(0); // 追踪批判性思考次数

// 新增：交互形式多样化管理
const interactionHistory = ref<string[]>([]); // 记录使用过的交互形式
const currentInteractionType = ref(''); // 当前交互类型

// 新增：用户主动提问功能
const showUserQuestionPrompt = ref(false);
const userQuestionSuggestions = ref<string[]>([]);


// 状态管理
const state = reactive({
  id: 0,
  apiKey: "sk-e18179ecb5ba4eb9b9d07a287dff4edd",
  needCompleteStep: false, // 标记是否需要完成步骤
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

// 新增：数据分析结果获取函数（使用真实数据）
const getDataAnalysisResults = () => {
  // 获取完整数据分析
  const completeAnalysis = getCompleteDataAnalysis();
  
  // 如果已识别出问题类型，返回针对性分析
  if (identifiedWeakness.value) {
    return {
      targeted: getTargetedDataAnalysis(identifiedWeakness.value),
      insights: generateStepInsights(2, identifiedWeakness.value),
      raw: completeAnalysis
    };
  }
  
  // 否则返回通用分析
  return {
    general: generateDataAnalysisReport(completeAnalysis),
    raw: completeAnalysis
  };
};

// 新增：文献证据获取函数（使用真实文献数据）
const getLiteratureEvidence = async (problemType: string) => {
  try {
    // 根据问题类型获取针对性文献证据
    const targetedEvidence = getLiteratureByWeaknessType(problemType);
    
    // 如果针对性证据不足，补充通用证据
    if (targetedEvidence.length < 3) {
      const theoreticalBasis = getAllTheoreticalBasis().slice(0, 2);
      const frontierViews = getAllFrontierViews().slice(0, 2);
      return [...targetedEvidence, ...theoreticalBasis, ...frontierViews].slice(0, 6);
    }
    
    return targetedEvidence.slice(0, 6);
  } catch (error) {
    console.error('获取文献证据失败:', error);
    // 返回默认证据
    return [
      '问题引导教学：问题是数学事件中的关键要素，引领课堂教学进程，促进教育教学发生的基础',
      '苏格拉底式追问：通过教师不断追问，让学生从回答过程中体会问题本质',
      '高阶思维触发：深度问题是可能触发学生高阶思维的问题，促进深刻理解'
    ];
  }
};

// 新增：用户回答后的推进处理函数
const handleUserResponseProgression = async () => {
  console.log("=== 用户回答推进检查 ===");
  console.log("当前轮次:", currentRound.value, "最大轮次:", researchState.value.maxRounds);
  
  // 检查是否达到最大轮次（用户刚回答完这一轮）
  if (currentRound.value >= researchState.value.maxRounds) {
    console.log("用户完成了第", currentRound.value, "轮回答，准备完成当前步骤");
    // 标记需要在AI回复后完成步骤
    state.needCompleteStep = true;
  } else {
    console.log("用户完成了第", currentRound.value, "轮回答，推进到下一轮");
    store.commit(CHAT_VUEX_NAMESPACE + ADVANCE_RESEARCH_ROUND);
    console.log(`已推进到第${currentRound.value}轮，等待AI提问`);
  }
};

// 新增：轮次推进处理函数（修改为步骤完成处理）
const handleStepCompletion = async (aiResponse: string) => {
  if (state.needCompleteStep) {
    console.log("=== 完成当前步骤 ===");
    state.needCompleteStep = false;
    await completeCurrentStep(aiResponse);
  }
};

// 新增：完成当前步骤
const completeCurrentStep = async (aiResponse: string) => {
  stepTransitioning.value = true;
  
  try {
    // 根据步骤进行特殊处理
    if (currentStep.value === 1) {
      // 步骤1：分析诊断结果
      const weakness = await analyzeWeaknessFromResponse(aiResponse);
      store.commit(CHAT_VUEX_NAMESPACE + SET_IDENTIFIED_WEAKNESS, weakness);
    } else if (currentStep.value === 2) {
      // 步骤2：保存数据分析洞察
      const insights = await extractInsightsFromResponse(aiResponse);
      store.commit(CHAT_VUEX_NAMESPACE + SET_KEY_INSIGHTS, insights);
    } else if (currentStep.value === 3) {
      // 步骤3：获取文献证据并保存最终解决方案
      const literature = await getLiteratureEvidence(identifiedWeakness.value);
      store.commit(CHAT_VUEX_NAMESPACE + SET_LITERATURE_EVIDENCE, literature);
      
      const solution = await extractSolutionFromResponse(aiResponse);
      store.commit(CHAT_VUEX_NAMESPACE + SET_FINAL_SOLUTION, solution);
    }

    // 完成步骤并推进
    store.commit(CHAT_VUEX_NAMESPACE + COMPLETE_RESEARCH_STEP, currentStep.value);
    
    if (currentStep.value < 4) {
      // 推进到下一步骤
      store.commit(CHAT_VUEX_NAMESPACE + SET_CHAT_STEP, currentStep.value + 1);
      
      // 如果进入步骤3，预加载文献证据
      if (currentStep.value === 3 && identifiedWeakness.value) {
        try {
          const literature = await getLiteratureEvidence(identifiedWeakness.value);
          store.commit(CHAT_VUEX_NAMESPACE + SET_LITERATURE_EVIDENCE, literature);
          console.log('已为步骤3预加载文献证据:', literature.length, '条');
        } catch (error) {
          console.error('预加载文献证据失败:', error);
        }
      }
      
      // 添加步骤过渡提示
      const stepInfo = getStepInfo(currentStep.value);
      store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
        message: `🎉 恭喜！第${currentStep.value - 1}步骤（${getStepInfo(currentStep.value - 1).name}）已完成！\n\n📋 总结：已完成${researchState.value.maxRounds}轮深度对话\n\n🚀 现在进入第${currentStep.value}步骤：${stepInfo.name} - ${stepInfo.description}`,
        status: DISPLAY_ROLE_AI
      });
    } else {
      // 进入第四步骤，显示导出弹窗
      showExportModal.value = true;
      store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
        message: `🎉 恭喜！您已完成所有教研步骤。现在可以选择有价值的学习卡片并导出教研成果！`,
        status: DISPLAY_ROLE_AI
      });
    }
  } catch (error) {
    console.error('Complete step failed:', error);
  } finally {
    stepTransitioning.value = false;
  }
};

// 新增：从AI回复中分析知识缺失类型
const analyzeWeaknessFromResponse = async (response: string): Promise<string> => {
  try {
    const completion = await ds.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: 'system',
          content: `基于AI回复内容，识别教师在课堂提问方面的主要知识缺失类型。
          返回以下类型之一：陈述性知识、程序性知识、解释性知识、条件性知识、元认知知识
          只返回类型名称，不要其他内容。`
        },
        {
          role: 'user',
          content: response
        }
      ]
    });
    
    return completion.choices[0].message.content?.trim() || '程序性知识';
  } catch (error) {
    console.error('Analyze weakness failed:', error);
    return '程序性知识'; // 默认值
  }
};

// 新增：从回复中提取关键洞察
const extractInsightsFromResponse = async (response: string): Promise<string[]> => {
  try {
    const completion = await ds.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: 'system',
          content: `从AI回复中提取3个关键洞察点，每个洞察用一句话概括。
          返回JSON数组格式：["洞察1", "洞察2", "洞察3"]`
        },
        {
          role: 'user',
          content: response
        }
      ]
    });
    
    const result = completion.choices[0].message.content?.trim() || '';
    return JSON.parse(result);
  } catch (error) {
    console.error('Extract insights failed:', error);
    return ['数据分析完成', '发现关键问题', '确定改进方向'];
  }
};

// 新增：从回复中提取解决方案
const extractSolutionFromResponse = async (response: string): Promise<string> => {
  try {
    const completion = await ds.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: 'system',
          content: `从AI回复中提取主要的解决方案或改进建议，用一段话总结（100字内）。`
        },
        {
          role: 'user',
          content: response
        }
      ]
    });
    
    return completion.choices[0].message.content?.trim() || '制定了针对性的改进方案';
  } catch (error) {
    console.error('Extract solution failed:', error);
    return '制定了针对性的改进方案';
  }
};

const onMessageSubmit = (content: string) => {
  if (!content.trim()) return;
  console.log("=== 用户提交消息 ===", content);
  console.log("提交前 - 步骤:", currentStep.value, "轮次:", currentRound.value);
  
  // 用户手动输入时隐藏所有选择框和提示
  showQuickReplies.value = false;
  showCriticalThinking.value = false;
  showUserQuestionPrompt.value = false;
  quickReplyOptions.value = [];
  userQuestionSuggestions.value = [];
  
  // 用户回答完成后推进轮次（在AI回复之前推进）
  if (isResearchMode.value && currentStep.value <= 3) {
    handleUserResponseProgression();
  }
  
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

// 新增：教研专用AI处理函数
const handleResearchAIRequest = async (message: string, { onSuccess, onUpdate, onError }: any, isSystemInit: boolean = false) => {
  try {
    // 获取教研上下文
    const context = {
      identifiedWeakness: identifiedWeakness.value,
      keyInsights: researchState.value.keyInsights,
      improvementDirection: researchState.value.finalSolution,
      dataVisualizationResults: getDataAnalysisResults(),
      literatureEvidence: researchState.value.literatureEvidence
    };

    // 生成教研专用系统提示词
    const systemPrompt = generateStepPrompt(currentStep.value, currentRound.value, context);
    
    // 构建对话历史
    const conversationHistory = chatMessagesList.value
      .filter((msg: ChatMessageItem) => msg.status === DISPLAY_ROLE_LOCAL || msg.status === DISPLAY_ROLE_AI)
      .map((msg: ChatMessageItem) => ({
        role: msg.status === DISPLAY_ROLE_LOCAL ? REQUEST_ROLE_USER : REQUEST_ROLE_ASSISTANT,
        content: msg.content
      }));

    // 调用AI
    const completion = await ds.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: 'system', content: systemPrompt + '\n\n重要提醒：回复必须控制在300字以内，包含用户参与元素（如选择题A/B/C选项），促进用户积极思考。' },
        ...conversationHistory,
        { role: REQUEST_ROLE_USER, content: message }
      ],
      stream: true,
      max_tokens: 800, // 限制token数量，大约对应300字
      temperature: 0.7, // 适中的创造性
    });

    // 流式输出处理
    let fullContent = "";
    for await (const chunk of completion) {
      if (!chunk.choices[0].finish_reason) {
        fullContent += chunk.choices[0].delta.content || "";
        onUpdate(fullContent);
        scrollToBottom();
      } else {
        // 验证AI回复相关性
        if (!validateResponseRelevance(fullContent)) {
          console.warn("AI回复与课程背景不符，已记录问题");
        }
        
        // AI回复完成，保存到store
        store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
          message: fullContent,
          status: DISPLAY_ROLE_AI
        });

        // AI回复完成后检查是否需要完成步骤
        if (!isSystemInit) {
          console.log("=== AI回复完成 ===");
          console.log("当前步骤:", currentStep.value, "当前轮次:", currentRound.value);
          console.log("消息列表长度:", chatMessagesList.value.length);
          
          // 检查是否需要完成步骤
          await handleStepCompletion(fullContent);
          
          // 通知LearningPathView生成学习卡片
          console.log("=== 发送学习卡片生成通知 ===");
          store.commit(CHAT_VUEX_NAMESPACE + NOTIFY_NEW_DIALOGUE);
        } else {
          console.log("系统初始化消息，跳过处理");
        }

        // 解析AI回复中的选择题选项
        parseQuickReplyOptions(fullContent);
        
        // 智能选择交互形式
        if (!isSystemInit) {
          selectInteractionType(fullContent);
        }
        
        onSuccess(fullContent);
        scrollToBottom();
      }
    }
  } catch (error) {
    console.error('Research AI request failed:', error);
    onError(error instanceof Error ? error : new Error('AI请求失败'));
  }
};

// 原有的通用AI处理（保留作为备用）
const handleGeneralAIRequest = async (message: string, { onSuccess, onUpdate, onError }: any) => {
  let temp = chatMessagesList.value.map((msg: ChatMessageItem) => ({
    role: msg.status === DISPLAY_ROLE_LOCAL ? REQUEST_ROLE_USER : REQUEST_ROLE_ASSISTANT,
    content: msg.content
  }));
  
  const completion = await ds.chat.completions.create({
    messages: temp,
    model: "deepseek-chat",
    stream: true
  });

  let fullContent = "";
  for await (const chunk of completion) {
    if (!chunk.choices[0].finish_reason) {
      fullContent += chunk.choices[0].delta.content || "";
      onUpdate(fullContent);
      scrollToBottom();
    } else {
      store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
        message: fullContent,
        status: DISPLAY_ROLE_AI
      });
      
      store.commit(CHAT_VUEX_NAMESPACE + NOTIFY_NEW_DIALOGUE);
      onSuccess(fullContent);
      scrollToBottom();
    }
  }
};

// Agent for request - 根据模式选择处理方式
const [agent] = useXAgent({
  request: async ({ message }, { onSuccess, onUpdate, onError }) => {
    console.log("request", { message, status: DISPLAY_ROLE_LOCAL });
    
    // 只有非系统初始化消息才添加用户消息
    const messageStr = typeof message === 'string' ? message : String(message);
    const isSystemInitMessage = messageStr.includes('你是课堂提问诊断专家') || 
                               messageStr.includes('你是一个专业的教研专家') ||
                               messageStr.length > 200; // 长消息通常是系统提示词
    
    if (!isSystemInitMessage) {
      store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, { message: messageStr, status: DISPLAY_ROLE_LOCAL });
    }
    setContent('');

    // 根据是否启用教研模式选择处理方式
    if (isResearchMode.value && currentStep.value <= 3) {
      await handleResearchAIRequest(messageStr, { onSuccess, onUpdate, onError }, isSystemInitMessage);
    } else {
      await handleGeneralAIRequest(messageStr, { onSuccess, onUpdate, onError });
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
  console.log("=== InterlinkView onMounted 开始 ===");
  console.log("教研模式状态:", isResearchMode.value);
  console.log("当前步骤:", currentStep.value);
  
  // 重置教研状态
  store.commit(CHAT_VUEX_NAMESPACE + RESET_RESEARCH_STATE);
  store.commit(CHAT_VUEX_NAMESPACE + SET_CHAT_STEP, 1);
  
  // 如果启用教研模式，发送初始教研问题
  if (isResearchMode.value) {
    try {
      console.log("=== 准备教研模式初始化 ===");
      const stepInfo = getStepInfo(1);
      console.log("步骤信息:", stepInfo);
      
      const initialContext = {
        identifiedWeakness: '',
        keyInsights: [],
        improvementDirection: '',
        dataVisualizationResults: null,
        literatureEvidence: []
      };
      
      console.log("=== 生成初始提示词 ===");
      const initialPrompt = generateStepPrompt(1, 1, initialContext);
      console.log("初始提示词长度:", initialPrompt.length);
      console.log("初始提示词前200字符:", initialPrompt.substring(0, 200));
      
      // 添加欢迎消息
      store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
        message: `🎯 欢迎使用课堂提问专项教研系统！\n\n我们将通过四个步骤帮您系统性地改进课堂提问技能：\n1. ${RESEARCH_STEPS_INFO[0].name} - ${RESEARCH_STEPS_INFO[0].description}\n2. ${RESEARCH_STEPS_INFO[1].name} - ${RESEARCH_STEPS_INFO[1].description}\n3. ${RESEARCH_STEPS_INFO[2].name} - ${RESEARCH_STEPS_INFO[2].description}\n4. ${RESEARCH_STEPS_INFO[3].name} - ${RESEARCH_STEPS_INFO[3].description}\n\n现在开始第一步：${stepInfo.name}`,
        status: DISPLAY_ROLE_AI
      });
      
      console.log("=== 准备发送AI请求 ===");
      setTimeout(() => {
        try {
          console.log("=== 发送初始AI请求 ===");
          onRequest({ message: initialPrompt });
          console.log("=== AI请求已提交 ===");
        } catch (error) {
          console.error("=== AI请求发送失败 ===", error);
          // 添加错误提示消息
          store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
            message: "抱歉，AI 初始化失败，请刷新页面重试。如果问题持续，请检查网络连接。",
            status: DISPLAY_ROLE_AI
          });
        }
      }, 1000);
    } catch (error) {
      console.error("=== 教研模式初始化错误 ===", error);
      // 添加错误提示消息
      store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
        message: "系统初始化出现问题，正在尝试使用默认模式...",
        status: DISPLAY_ROLE_AI
      });
      // 降级到通用模式
      isResearchMode.value = false;
    }
  } 
  
  if (!isResearchMode.value) {
    console.log("=== 使用通用模式初始化 ===");
    // 原有的通用模式初始化
    const initialPrompt = `
      你是一个专业的教研专家，负责了解教师的教学情况。
      请你根据生成一个开放性的问题，帮助了解教师在课堂提问中存在的问题以及想要提升的能力。
      问题要简洁、专业、有针对性。
      只输出一个问题文本即可，不需要添加""包裹着文本。
      在教师用户回复这个问题后，按照"用户内容的评估反馈—提出下一个关联的问题"的顺序，继续进行对话，聚焦于教师想要提升的能力不断引导教师进行思考。
    `
    try {
      onRequest({ message: initialPrompt });
    } catch (error) {
      console.error("=== 通用模式初始化也失败 ===", error);
      store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
        message: "系统暂时无法启动，请刷新页面重试。",
        status: DISPLAY_ROLE_AI
      });
    }
  }
  
  console.log("=== InterlinkView onMounted 完成 ===");
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

  userInput.value = '';
  chatBegin.value = true;
  scrollToBottom();
};

// 新增：获取步骤详细信息的方法
const getStepFullName = (stepName: string) => {
  const step = researchSteps.value.find(s => s.name === stepName);
  return step ? step.fullName : stepName;
};

const getStepDescription = (stepName: string) => {
  const step = researchSteps.value.find(s => s.name === stepName);
  return step ? step.description : '';
};

const getStepStatusText = (stepName: string) => {
  const step = researchSteps.value.find(s => s.name === stepName);
  if (!step) return '';
  
  if (currentStep.value === step.id) {
    if (currentStep.value <= 3) {
      return `当前第${currentRound.value}/${researchState.value.maxRounds}轮：${currentRoundDescription.value}`;
    } else {
      return '准备导出教研成果';
    }
  } else if (currentStep.value > step.id) {
    return '✓ 已完成';
  } else {
    return '等待开始';
  }
};

const getStepIconColor = (stepId: number) => {
  if (currentStep.value === stepId) {
    return '#1890ff'; // 当前步骤蓝色
  } else if (currentStep.value > stepId) {
    return '#52c41a'; // 已完成步骤绿色
  } else {
    return '#d9d9d9'; // 等待步骤灰色
  }
};

// 新增：解析AI回复中的选择题选项
const parseQuickReplyOptions = (aiMessage: string) => {
  lastAiMessage.value = aiMessage;
  const options: string[] = [];
  
  // 提取 A）B）C）D）格式的选项
  const optionRegex = /[A-Z]）([^A-Z）]+?)(?=[A-Z]）|$)/g;
  let match;
  
  while ((match = optionRegex.exec(aiMessage)) !== null) {
    const optionText = match[1]?.trim();
    if (optionText && optionText.length > 0 && optionText.length < 50) {
      options.push(match[0].trim()); // 包含A）前缀的完整选项
    }
  }
  
  // 如果找到选项，显示快速回复
  if (options.length >= 2) {
    quickReplyOptions.value = options.slice(0, 4); // 最多4个选项
    showQuickReplies.value = true;
    console.log('解析到选择题选项:', options);
  } else {
    // 如果没有选项，检查是否有其他互动元素
    const hasInteraction = aiMessage.includes('您认为') || 
                          aiMessage.includes('您觉得') || 
                          aiMessage.includes('您的看法');
    
    if (hasInteraction) {
      // 提供通用的互动选项
      quickReplyOptions.value = [
        '完全同意您的观点',
        '部分同意，但有保留',
        '不太认同，我的看法是...',
        '需要更多信息才能判断'
      ];
      showQuickReplies.value = true;
    } else {
      showQuickReplies.value = false;
    }
  }
  
  // 不再自动隐藏快速回复选项，让用户手动控制
};

// 新增：处理快速回复选择
const handleQuickReply = (option: string) => {
  console.log("=== 用户选择快速回复 ===", option);
  console.log("选择前 - 步骤:", currentStep.value, "轮次:", currentRound.value);
  
  showQuickReplies.value = false;
  quickReplyOptions.value = [];
  
  // 用户选择完成后推进轮次（在AI回复之前推进）
  if (isResearchMode.value && currentStep.value <= 3) {
    handleUserResponseProgression();
  }
  
  // 直接提交选择的回复
  onRequest({ message: option });
};

// 新增：触发批判性思考引导
const triggerCriticalThinking = (aiMessage: string) => {
  const criticalPrompts = [
    '🤔 反思一下：您完全认同我刚才的观点吗？是否有不同的角度或考虑？',
    '🎯 换个角度思考：如果是您的同事，他们可能会对这个建议有什么不同看法？',
    '📚 深度思辨：这个观点在您的教学实践中是否存在例外情况？',
    '💭 批判性分析：您觉得我的分析是否有遗漏或偏颇的地方？',
    '🔍 质疑与探讨：有没有相反的证据或经验与我的观点不符？'
  ];
  
  criticalThinkingPrompt.value = criticalPrompts[Math.floor(Math.random() * criticalPrompts.length)];
  criticalThinkingCount.value++;
  
  setTimeout(() => {
    showCriticalThinking.value = true;
  }, 8000); // 8秒后显示批判性思考提示，给用户更多阅读和思考时间
  
  // 不再自动隐藏，让用户手动控制
};

// 新增：处理批判性思考回复
const handleCriticalThinking = (response: 'agree' | 'disagree' | 'neutral') => {
  console.log("=== 用户选择批判性思考回复 ===", response);
  console.log("选择前 - 步骤:", currentStep.value, "轮次:", currentRound.value);
  
  showCriticalThinking.value = false;
  
  // 用户选择完成后推进轮次（在AI回复之前推进）
  if (isResearchMode.value && currentStep.value <= 3) {
    handleUserResponseProgression();
  }
  
  const responses = {
    agree: '我基本认同您的观点，没有太多补充。',
    disagree: '我有不同的看法和考虑...',
    neutral: '让我再思考一下，可能需要更多信息。'
  };
  
  onRequest({ message: responses[response] });
};

// 新增：智能选择交互形式
const selectInteractionType = (aiMessage: string) => {
  const availableTypes = ['quickReply', 'criticalThinking', 'reflection', 'comparison', 'userQuestion'];
  const step = currentStep.value;
  const round = currentRound.value;
  
  // 根据步骤和轮次优先选择交互类型
  let preferredType = '';
  
  if (step === 1) {
    // 第1步：诊断缺失 - 选择题→用户提问→批判思考
    preferredType = round === 1 ? 'quickReply' : round === 2 ? 'userQuestion' : 'criticalThinking';
  } else if (step === 2) {
    // 第2步：数据分析 - 对比→用户提问→反思
    preferredType = round === 1 ? 'comparison' : round === 2 ? 'userQuestion' : 'reflection';
  } else if (step === 3) {
    // 第3步：文献证据 - 批判→用户提问→对比
    preferredType = round === 1 ? 'criticalThinking' : round === 2 ? 'userQuestion' : 'comparison';
  }
  
  // 避免连续使用相同类型
  const lastType = interactionHistory.value[interactionHistory.value.length - 1];
  if (lastType === preferredType && availableTypes.length > 1) {
    preferredType = availableTypes.filter(t => t !== lastType)[Math.floor(Math.random() * (availableTypes.length - 1))];
  }
  
  // 记录使用的交互类型
  interactionHistory.value.push(preferredType);
  currentInteractionType.value = preferredType;
  
  // 根据类型触发相应的交互
  switch (preferredType) {
    case 'criticalThinking':
      if (criticalThinkingCount.value < 3) {
        triggerCriticalThinking(aiMessage);
      }
      break;
    case 'reflection':
      triggerReflectionMode(aiMessage);
      break;
    case 'comparison':
      triggerComparisonMode(aiMessage);
      break;
    case 'userQuestion':
      triggerUserQuestionMode();
      break;
    default:
      // quickReply 已经在 parseQuickReplyOptions 中处理
      break;
  }
  
  console.log(`选择交互类型: ${preferredType}, 步骤: ${step}, 轮次: ${round}`);
};

// 新增：触发用户主动提问模式  
const triggerUserQuestionMode = () => {
  // 直接使用导入的函数
  const suggestions = [
    '在直角三角形性质教学中，如何设计启发性问题？',
    '这节数学课的提问策略如何优化？',
    '数学学科的提问有什么特殊性？',
    '如何在几何概念教学中提高学生参与度？',
    '小学高年级的提问难度是否合适？'
  ];
  
  userQuestionSuggestions.value = [
    ...suggestions,
    '我想了解其他数学老师是如何处理这类问题的？',
    '这种提问策略在其他几何概念教学中也适用吗？',
    '学生理解困难时，我应该如何调整提问？'
  ];
  
  setTimeout(() => {
    showUserQuestionPrompt.value = true;
  }, 5000);
};

// 新增：处理用户主动提问
const handleUserQuestion = (question: string) => {
  showUserQuestionPrompt.value = false;
  userQuestionSuggestions.value = [];
  
  // 用户提问时推进轮次
  if (isResearchMode.value && currentStep.value <= 3) {
    handleUserResponseProgression();
  }
  
  // 添加特殊标识，告诉AI这是用户主动提问
  const userQuestionMessage = `【用户主动提问】${question}`;
  onRequest({ message: userQuestionMessage });
};

// 新增：触发反思模式
const triggerReflectionMode = (aiMessage: string) => {
  const reflectionPrompts = [
    '💭 请花一分钟思考：这个观点与您之前的理解有什么差异？',
    '🔄 回顾一下：您在实际教学中是否有类似的经历？',
    '📝 自我检视：这个分析让您想到了什么？',
    '🎯 深入思考：如果您是学生，会如何看待这种提问方式？'
  ];
  
  setTimeout(() => {
    store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
      message: reflectionPrompts[Math.floor(Math.random() * reflectionPrompts.length)],
      status: DISPLAY_ROLE_AI
    });
    scrollToBottom();
  }, 6000); // 6秒后显示反思提示，给用户充分阅读时间
};

// 新增：触发对比模式
const triggerComparisonMode = (aiMessage: string) => {
  const comparisonPrompts = [
    '⚖️ 对比思考：传统的提问方式与我刚才的建议，您更倾向于哪种？为什么？',
    '🔀 多角度分析：专家教师和新手教师在这个问题上可能有什么不同做法？',
    '📊 效果对比：您觉得这种方法与您现在的做法相比，哪个更有效？',
    '🎪 情境对比：这个策略在不同的教学情境下效果会一样吗？'
  ];
  
  setTimeout(() => {
    store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
      message: comparisonPrompts[Math.floor(Math.random() * comparisonPrompts.length)],
      status: DISPLAY_ROLE_AI
    });
    scrollToBottom();
  }, 7000); // 7秒后显示对比提示，给用户更长的思考时间
};

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
        <span class="progress-title">教研进度</span>
        <span class="progress-content">
          <div class="enhanced-steps">
            <div 
              v-for="(step, index) in researchSteps" 
              :key="step.id"
              class="step-item"
              :class="{
                'step-current': currentStep === step.id,
                'step-completed': currentStep > step.id,
                'step-waiting': currentStep < step.id
              }"
            >
              <Tooltip placement="top" :mouseEnterDelay="0.3">
                <template #title>
                  <div class="step-tooltip">
                    <div class="tooltip-title">{{ step.fullName }}</div>
                    <div class="tooltip-desc">{{ step.description }}</div>
                    <div class="tooltip-status" v-if="getStepStatusText(step.name)">
                      {{ getStepStatusText(step.name) }}
                    </div>
                  </div>
                </template>
                <div class="step-content">
                  <div class="step-icon" :style="{ backgroundColor: getStepIconColor(step.id) }">
                    <span class="step-number">{{ index + 1 }}</span>
                  </div>
                  <div class="step-info">
                    <div class="step-name">{{ step.name }}</div>
                    <div class="step-progress" v-if="currentStep === step.id && step.id <= 3">
                      第{{currentRound}}/3轮
                    </div>
                  </div>
                </div>
              </Tooltip>
              
              <!-- 连接线 -->
              <div v-if="index < researchSteps.length - 1" class="step-connector"
                   :class="{ 'connector-active': currentStep > step.id }">
              </div>
            </div>
          </div>
        </span>
      </div>
      
      <!-- 轮次进度显示 -->
      <div class="round-progress" v-if="isResearchMode && currentStep <= 3">
        <div class="round-info">
          <span class="round-text">第{{currentRound}}/{{researchState.maxRounds}}轮</span>
          <span class="round-desc">{{ currentRoundDescription }}</span>
        </div>
        <div class="round-dots">
          <span 
            v-for="i in researchState.maxRounds" 
            :key="i"
            class="round-dot"
            :class="{ active: i <= currentRound, completed: i < currentRound }"
          ></span>
        </div>
      </div>

      <!-- 上下文提示 -->
      <div class="context-hint" v-if="isResearchMode && identifiedWeakness">
        <div class="hint-content">
          <span class="hint-icon">💡</span>
          <span class="hint-text">
            已识别问题类型：<strong>{{ identifiedWeakness }}</strong>
            <span v-if="currentStep === 2">，正在基于数据分析</span>
            <span v-if="currentStep === 3">，正在结合文献优化</span>
          </span>
        </div>
      </div>
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

    <!-- 快速回复选项 -->
    <div class="quick-replies" v-if="showQuickReplies && quickReplyOptions.length > 0">
      <div class="quick-replies-header">
        <span class="quick-replies-title">💡 快速回复</span>
        <Button type="text" size="small" @click="showQuickReplies = false">收起</Button>
      </div>
      <div class="quick-replies-grid">
        <Button 
          v-for="(option, index) in quickReplyOptions" 
          :key="index"
          type="default"
          size="small"
          class="quick-reply-btn"
          @click="handleQuickReply(option)"
        >
          {{ option }}
        </Button>
      </div>
      <div class="quick-replies-tip">
        💬 请慢慢思考后再选择。您可以点击选项快速回复，或在下方输入框中详细回答。
      </div>
    </div>

    <!-- 批判性思考引导 -->
    <div class="critical-thinking" v-if="showCriticalThinking">
      <div class="critical-header">
        <span class="critical-icon">🤔</span>
        <span class="critical-title">批判性思考</span>
        <Button type="text" size="small" @click="showCriticalThinking = false">跳过</Button>
      </div>
      <div class="critical-content">
        <div class="critical-prompt">{{ criticalThinkingPrompt }}</div>
        <div class="critical-options">
          <Button 
            size="small" 
            type="default"
            class="critical-btn agree"
            @click="handleCriticalThinking('agree')"
          >
            👍 认同观点
          </Button>
          <Button 
            size="small" 
            type="default"
            class="critical-btn disagree"
            @click="handleCriticalThinking('disagree')"
          >
            🤨 有不同看法
          </Button>
          <Button 
            size="small" 
            type="default"
            class="critical-btn neutral"
            @click="handleCriticalThinking('neutral')"
          >
            🤷‍♂️ 需要再思考
          </Button>
        </div>
        <div class="critical-tip">
          🕐 请慢慢思考，选择框将保持显示直到您做出选择或点击"跳过"
        </div>
      </div>
    </div>

    <!-- 用户主动提问引导 -->
    <div class="user-question-prompt" v-if="showUserQuestionPrompt">
      <div class="user-question-header">
        <span class="question-icon">❓</span>
        <span class="question-title">您来提问</span>
        <Button type="text" size="small" @click="showUserQuestionPrompt = false">收起</Button>
      </div>
      <div class="user-question-content">
        <div class="question-intro">
          💭 现在轮到您主动提问了！关于这节数学课的提问，您有什么想深入了解的？
        </div>
        <div class="question-suggestions">
          <div class="suggestion-label">💡 建议问题：</div>
          <div class="suggestion-grid">
            <Button 
              v-for="(suggestion, index) in userQuestionSuggestions" 
              :key="index"
              size="small"
              type="dashed"
              class="suggestion-btn"
              @click="handleUserQuestion(suggestion)"
            >
              {{ suggestion }}
            </Button>
          </div>
        </div>
        <div class="question-tip">
          ✨ 您也可以在下方输入框中提出自己的问题
        </div>
      </div>
    </div>

    <div class="chat-input" id="linkview-input">
      <Sender v-model:value="userInput" @submit="onMessageSubmit" :loading="senderLoading">
        {{ userInput }}
      </Sender>
    </div>

    <!-- 导出弹窗 -->
    <ResearchExportModal 
      :visible="showExportModal"
      :availableCards="availableCards"
      @close="showExportModal = false"
    />
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
  margin: 2px;
  padding: 8px;
  position: sticky;
  top: 0;
  z-index: 10;
  width: calc(100% - 4px);
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
  margin-bottom: 8px;
  align-items: center;
}

.progress-title {
  font-size: 13px;
  font-weight: bold;
  padding: 2px 0;
  margin-right: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.progress-content {
  flex: 1;
  min-width: 0;
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

/* 新增：教研模式样式 */
.round-progress {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(24, 144, 255, 0.05);
  border-radius: 4px;
  border-left: 3px solid #1890ff;
}

.round-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.round-text {
  font-size: 13px;
  font-weight: 600;
  color: #1890ff;
}

.round-desc {
  font-size: 11px;
  color: #666;
}

.round-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.round-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d9d9d9;
  transition: all 0.3s;
}

.round-dot.active {
  background: #1890ff;
  transform: scale(1.2);
}

.round-dot.completed {
  background: #52c41a;
}

.context-hint {
  margin-top: 6px;
  padding: 4px 10px;
  background: linear-gradient(90deg, #fff7e6 0%, #fff2e6 100%);
  border-radius: 4px;
  border-left: 3px solid #faad14;
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hint-icon {
  font-size: 14px;
}

.hint-text {
  font-size: 12px;
  color: #d46b08;
  line-height: 1.4;
}

.hint-text strong {
  color: #ad4e00;
  font-weight: 600;
}

/* 步骤过渡动画 */
.step-transitioning {
  opacity: 0.6;
  transition: opacity 0.3s;
}

/* 增强现有步骤样式 */
:deep(.ant-steps-item-process .ant-steps-item-icon) {
  background-color: #1890ff;
  border-color: #1890ff;
}

:deep(.ant-steps-item-finish .ant-steps-item-icon) {
  background-color: #52c41a;
  border-color: #52c41a;
}

:deep(.ant-steps-item-description) {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

/* 步骤标题样式 */
.step-title-wrapper {
  cursor: pointer;
  position: relative;
}

.step-title-wrapper:hover {
  color: #1890ff;
}

/* Tooltip样式 */
.step-tooltip {
  max-width: 280px;
  padding: 4px 0;
}

.tooltip-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
  line-height: 1.3;
}

.tooltip-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 8px;
  line-height: 1.4;
}

.tooltip-status {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  border-left: 3px solid #52c41a;
  line-height: 1.3;
}

/* 增强步骤整体样式 */
:deep(.ant-steps-item-title) {
  font-size: 13px !important;
  line-height: 1.2 !important;
  margin-bottom: 2px !important;
}

:deep(.ant-steps-item-icon) {
  width: 24px !important;
  height: 24px !important;
  line-height: 24px !important;
  font-size: 12px !important;
}

:deep(.ant-steps-small .ant-steps-item-icon) {
  width: 20px !important;
  height: 20px !important;
  line-height: 20px !important;
}

/* 当前步骤高亮效果 */
:deep(.ant-steps-item-process .ant-steps-item-title) {
  color: #1890ff !important;
  font-weight: 600 !important;
}

:deep(.ant-steps-item-finish .ant-steps-item-title) {
  color: #52c41a !important;
  font-weight: 500 !important;
}

/* 新增：自定义步骤样式 */
.enhanced-steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  overflow: hidden;
  padding: 2px 0;
}

.step-item {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.step-content {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 6px;
  transition: all 0.3s;
}

.step-content:hover {
  background: rgba(24, 144, 255, 0.05);
}

.step-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s;
  border: 2px solid;
}

.step-current .step-icon {
  border-color: #1890ff;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.2);
}

.step-completed .step-icon {
  border-color: #52c41a;
  color: #fff;
}

.step-waiting .step-icon {
  border-color: #d9d9d9;
  color: #999;
  background-color: #f5f5f5 !important;
}

.step-number {
  font-size: 12px;
  font-weight: 600;
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-name {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.step-current .step-name {
  color: #1890ff;
}

.step-completed .step-name {
  color: #52c41a;
}

.step-waiting .step-name {
  color: #999;
}

.step-progress {
  font-size: 10px;
  color: #666;
  line-height: 1.1;
}

.step-connector {
  flex: 1;
  height: 1px;
  background: #e8e8e8;
  margin: 0 4px;
  min-width: 12px;
  max-width: 40px;
  transition: background 0.3s;
}

.step-connector.connector-active {
  background: #52c41a;
}

/* 新增：快速回复样式 */
.quick-replies {
  margin: 0 4px 8px 4px;
  padding: 12px;
  background: linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%);
  border-radius: 8px;
  border: 1px solid #91d5ff;
  animation: slideDown 0.3s ease;
}

.quick-replies-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.quick-replies-title {
  font-size: 13px;
  font-weight: 600;
  color: #1890ff;
}

.quick-replies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.quick-reply-btn {
  text-align: left;
  height: auto;
  min-height: 36px;
  padding: 8px 12px;
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.3;
  border-radius: 6px;
  border: 1px solid #91d5ff;
  background: #fff;
  transition: all 0.3s;
  font-size: 12px;
}

.quick-reply-btn:hover {
  border-color: #40a9ff;
  background: #f0f8ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 169, 255, 0.2);
}

.quick-replies-tip {
  font-size: 11px;
  color: #666;
  text-align: center;
  font-style: italic;
  margin-top: 4px;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 新增：批判性思考样式 */
.critical-thinking {
  margin: 0 4px 8px 4px;
  padding: 12px;
  background: linear-gradient(135deg, #fff1f0 0%, #ffebe6 100%);
  border-radius: 8px;
  border: 1px solid #ffadd2;
  animation: slideDown 0.4s ease;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.1);
}

.critical-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.critical-icon {
  font-size: 16px;
}

.critical-title {
  font-size: 13px;
  font-weight: 600;
  color: #cf1322;
  margin-left: 6px;
}

.critical-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.critical-prompt {
  font-size: 13px;
  color: #8c8c8c;
  line-height: 1.4;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  border-left: 3px solid #ff7875;
}

.critical-options {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.critical-btn {
  border-radius: 6px;
  font-size: 12px;
  transition: all 0.3s;
  padding: 4px 12px;
  height: auto;
  min-height: 32px;
}

.critical-btn.agree {
  border-color: #52c41a;
  color: #389e0d;
}

.critical-btn.agree:hover {
  background: #f6ffed;
  border-color: #389e0d;
}

.critical-btn.disagree {
  border-color: #ff7875;
  color: #cf1322;
}

.critical-btn.disagree:hover {
  background: #fff1f0;
  border-color: #cf1322;
}

.critical-btn.neutral {
  border-color: #faad14;
  color: #d48806;
}

.critical-btn.neutral:hover {
  background: #fff7e6;
  border-color: #d48806;
}

.critical-tip {
  font-size: 11px;
  color: #8c8c8c;
  text-align: center;
  font-style: italic;
  margin-top: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

/* 新增：用户主动提问样式 */
.user-question-prompt {
  margin: 0 4px 8px 4px;
  padding: 12px;
  background: linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%);
  border-radius: 8px;
  border: 1px solid #d3adf7;
  animation: slideDown 0.4s ease;
  box-shadow: 0 2px 8px rgba(114, 46, 209, 0.1);
}

.user-question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.question-icon {
  font-size: 16px;
}

.question-title {
  font-size: 13px;
  font-weight: 600;
  color: #531dab;
  margin-left: 6px;
}

.user-question-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-intro {
  font-size: 13px;
  color: #722ed1;
  line-height: 1.4;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  border-left: 3px solid #b37feb;
}

.question-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-label {
  font-size: 12px;
  color: #722ed1;
  font-weight: 600;
}

.suggestion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px;
}

.suggestion-btn {
  text-align: left;
  height: auto;
  min-height: 36px;
  padding: 8px 12px;
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.3;
  border-radius: 6px;
  border: 1px dashed #b37feb;
  background: #fff;
  color: #722ed1;
  transition: all 0.3s;
  font-size: 12px;
}

.suggestion-btn:hover {
  border-color: #9254de;
  background: #f9f0ff;
  border-style: solid;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(146, 84, 222, 0.2);
}

.question-tip {
  font-size: 11px;
  color: #722ed1;
  text-align: center;
  font-style: italic;
  margin-top: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .progress-content {
    width: 100%;
  }
  
  .enhanced-steps {
    gap: 0;
    padding: 2px 0;
  }
  
  .step-content {
    gap: 6px;
    padding: 3px 6px;
  }
  
  .step-icon {
    width: 24px;
    height: 24px;
  }
  
  .step-name {
    font-size: 11px;
  }
  
  .step-progress {
    font-size: 9px;
  }
  
  .step-connector {
    min-width: 12px;
    margin: 0 6px;
  }
  
  .step-tooltip {
    max-width: 240px;
  }
  
  .tooltip-title {
    font-size: 13px;
  }
  
  .tooltip-desc {
    font-size: 11px;
  }
  
  :deep(.ant-steps-item-title) {
    font-size: 11px !important;
  }
}
</style>
