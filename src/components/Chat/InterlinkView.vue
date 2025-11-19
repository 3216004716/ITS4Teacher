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
  Sender,
  useXAgent,
  useXChat,
} from 'ant-design-x-vue';
import {
  createFromIconfontCN,
  UserOutlined,
  BulbOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons-vue';
import { Flex, message as messageAnt, Typography, Tooltip, Button, Steps } from 'ant-design-vue';
import OpenAI from "openai";
import questionChainsData from '../../data/structured_question_chains.json';
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
  NOTIFY_NEW_DIALOGUE,
  GET_CHAT_MESSAGES,
  ChatMessageItem,
} from '../../store/modules/chat';
import {
  DISPLAY_ROLE_LOCAL,
  DISPLAY_ROLE_AI,
  DISPLAY_ROLE_SUGGESTION,
  DISPLAY_ROLE_HINT,
  DISPLAY_ROLE_ROLE_SELECTOR,
  REQUEST_ROLE_USER,
  REQUEST_ROLE_ASSISTANT
} from '../../utils/const';
import markdownit from 'markdown-it';
import { objectType } from "ant-design-vue/es/_util/type";
import mermaid from 'mermaid';
// 新增：导入教研 Prompt 配置
import {
  SYSTEM_BASE_PROMPT,
  QUESTION_CLASSIFICATION_PROMPT,
  NEXT_HINT_TYPE_PROMPT,
  generateResponsePrompt,
  TeachingStrategy,
  PracticalKnowledge,
  HintType,
  generateHintQuestion
} from '../../utils/research-prompts';
import {
  AGENT_ROLES,
  getAgentRoleById,
  getDefaultAgentRole,
  ROLE_SELECTION_PROMPT,
  type AgentRole
} from '../../utils/agent-roles';
import RoleSelector from './RoleSelector.vue';

// 导入角色图标
import jiaoyuxuezheIcon from '../../assets/jiaoyuxuezhe.svg';
import jiaoxuefazhuanjiaIcon from '../../assets/jiaoxuefazhuanjia.svg';
import quyujiaoyanyuanIcon from '../../assets/quyujiaoyanyuan.svg';
import xueketongchaiIcon from '../../assets/xueketongchai.svg';
import jishuzhuanjiaIcon from '../../assets/jishuzhuanjia.svg';

// 导入文献证据数据
import { LITERATURE_PANELS, type LiteraturePanel } from '../../data/literature-evidence';

defineOptions({ name: 'AXPromptsFlexWrapSetup' });

const md = markdownit({ html: true, breaks: true });

// 初始化 Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

// 渲染带 Mermaid 的 Markdown
const renderMarkdown = (content: string) => {
  return h(Typography, null, {
    default: () => h('div', { innerHTML: md.render(content) })
  });
};

// 处理 Mermaid 代码块的渲染（在组件挂载后调用）
const renderMermaidDiagrams = async () => {
  await nextTick();
  const mermaidElements = document.querySelectorAll('.bubble-content code.language-mermaid');
  mermaidElements.forEach(async (element, index) => {
    const code = element.textContent || '';
    const id = `mermaid-diagram-${Date.now()}-${index}`;

    try {
      const { svg } = await mermaid.render(id, code);
      const pre = element.parentElement;
      if (pre && pre.tagName === 'PRE') {
        const container = document.createElement('div');
        container.className = 'mermaid-container';
        container.innerHTML = svg;
        pre.replaceWith(container);
      }
    } catch (error) {
      console.error('Mermaid rendering error:', error);
    }
  });
};

const ChatbotSvgIcon = createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/c/font_4890170_ywbb1o99s4s.js',
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

// 新增：教研步骤配置
const researchSteps = [
  { key: 1, title: '目标', description: '定位教研目标' },
  { key: 2, title: '分析', description: '深入分析问题' },
  { key: 3, title: '证据', description: '收集支持证据' },
  { key: 4, title: '总结', description: '总结与反思' }
];

// 新增：当前教研步骤和轮次
const currentResearchStep = ref(1);
const currentRound = ref(1);
const maxRounds = ref(3);

// 新增：当前选择的智能体角色
const currentAgentRole = ref<AgentRole>(getDefaultAgentRole());
const showRoleSelector = ref(false);

// 角色图标映射
const iconMap: Record<string, string> = {
  'icon-jiaoyuxuezhe': jiaoyuxuezheIcon,
  'icon-jiaoxuefazhuanjia': jiaoxuefazhuanjiaIcon,
  'icon-quyujiaoyanyuan': quyujiaoyanyuanIcon,
  'icon-xueketongchai': xueketongchaiIcon,
  'icon-jishuzhuanjia': jishuzhuanjiaIcon,
};

// 获取角色图标 URL
const getIconUrl = (iconType: string) => {
  return iconMap[iconType] || '';
};

// 新增：对话流程阶段状态
enum DialogueStage {
  OPENING = 'opening',           // AI开场白
  FIRST_QUESTION = 'first_question',  // 用户首次提问
  DIAGNOSIS = 'diagnosis',       // AI诊断并建议优化
  REFINED_QUESTION = 'refined_question', // 用户优化后的提问
  ROLE_SELECTION = 'role_selection',     // 角色选择阶段
  MULTI_TURN = 'multi_turn',     // 与专家多轮对话
  EVIDENCE = 'evidence',         // 循证阶段
  SUMMARY = 'summary'            // 总结阶段
}

const currentDialogueStage = ref<DialogueStage>(DialogueStage.OPENING);
const userQuestionCount = ref(0); // 跟踪用户提问次数

// 新增：总结模式状态
const isSelectionMode = ref(false);
const selectedMessageIds = ref<Set<number | string>>(new Set());

// 切换教研步骤
const switchResearchStep = (step: number) => {
  currentResearchStep.value = step;
  console.log('切换到步骤:', step, researchSteps[step - 1].title);
};

// 新增：根据步骤生成提示内容
const getHintContentByStep = (step: number): string[] => {
  const hintMap: Record<number, string[]> = {
    1: ['明确教学目标', '识别核心问题', '分析学生特征'],
    2: ['分析学生思维', '评估教学策略', '诊断问题原因'],
    3: ['课堂数据分析', '学生反馈收集', '文献理论支持'],
    4: ['反思改进点', '制定行动计划', '总结关键洞察']
  };
  return hintMap[step] || ['继续思考', '深入分析'];
};


// 新增：增强教研流程状态
const researchFlowMode = ref<'welcome' | 'self-inquiry' | 'ai-guided' | 'formal-research'>('welcome');
const aiGuidedStep = ref(1); // AI引导模式的子步骤 (1:效能分析, 2:回忆片段, 3:维度思考)
const userGoalClassification = ref({
  teachingStrategy: '',
  practicalKnowledge: '',
  userQuestion: ''
});

// 存储首次问题分类结果,用于生成思维导图的父节点
const initialQuestionClassification = ref<{
  teachingStrategy: string;
  practicalKnowledge: string;
} | null>(null);

// 教研上下文存储 - 保存关键信息以维持对话连贯性
interface ResearchContext {
  subject?: string;           // 学科 (如: 数学、语文、英语)
  gradeLevel?: string;        // 年级 (如: 小学三年级、初中二年级)
  lessonTopic?: string;       // 课程主题/内容 (如: 勾股定理、圆的面积)
  teachingGoal?: string;      // 教学目标
  studentCharacteristics?: string; // 学生特点
  mainIssues?: string[];      // 主要讨论的问题
  keywords?: string[];        // 关键词
  lastUpdated?: number;       // 最后更新时间戳
}

const researchContext = ref<ResearchContext>({});

// 课堂数据上下文 - 从structured_question_chains.json中提取
interface ClassroomDataContext {
  subject?: string;              // 学科 (从数据中推断)
  lessonTopic?: string;          // 课程主题 (从teachingPhase推断)
  gradeLevel?: string;           // 年级
  teachingPhases?: string[];     // 教学环节描述
  targetChainId?: number;        // 目标chain的ID (默认4)
  chainSummary?: string;         // chain的概要信息
  keyInteractions?: string[];    // 关键师生互动
  initialized?: boolean;         // 是否已初始化
}

const classroomDataContext = ref<ClassroomDataContext>({
  targetChainId: 4,
  initialized: false
});

// 已移除：用户参与度增强状态、批判性思考引导、用户主动提问功能

// 新增：问题分析结果存储
interface QuestionAnalysis {
  precision: number;  // 精准度
  higherOrder: number; // 高阶思维
  depth: number;      // 深度
  loading: boolean;   // 加载状态
}

const questionAnalysisMap = ref<Map<string, QuestionAnalysis>>(new Map());

// 获取分析结果的辅助函数
const getAnalysisForMessage = (messageKey: string | number) => {
  const keyStr = String(messageKey);
  const analysis = questionAnalysisMap.value.get(keyStr);

  if (!analysis) {
    return { precision: 0, higherOrder: 0, depth: 0, loading: true };
  }
  return analysis;
};

// 生成带 footer 的消息列表 - 使用计算属性以响应数据变化
const messagesWithFooter = computed(() => {
  return chatMessagesList.value.map((msg: any) => {
    const { id, content, status } = msg;
    const messageText = typeof content === 'string' ? content : (content?.text || '');

    // 如果是提示框类型，返回特殊格式
    if (status === DISPLAY_ROLE_HINT) {
      return {
        key: String(id),
        role: DISPLAY_ROLE_HINT,
        content: messageText,
      };
    }

    // 如果是角色选择器类型，返回特殊格式
    if (status === DISPLAY_ROLE_ROLE_SELECTOR) {
      return {
        key: String(id),
        role: DISPLAY_ROLE_ROLE_SELECTOR,
        content: messageText,
      };
    }

    const item: any = {
      key: String(id),
      role: status === DISPLAY_ROLE_LOCAL ? DISPLAY_ROLE_LOCAL : DISPLAY_ROLE_AI,
      content: messageText,
      agentRole: msg.agentRole || null, // 记录消息所属的角色
    };

    // 如果是用户消息，添加 footer（使用函数形式）
    if (status === DISPLAY_ROLE_LOCAL) {
      item.footer = () => {
        const analysis = getAnalysisForMessage(id);

        if (analysis.loading) {
          return h('div', { class: 'question-analysis analysis-loading' }, [
            h('span', { class: 'analysis-loading-text' }, '🔄 正在分析问题质量...')
          ]);
        } else {
          return h('div', { class: 'question-analysis' }, [
            h('span', { class: 'analysis-item' }, [
              h('span', { class: 'analysis-icon' }, '🎯 '),
              h('span', { class: 'analysis-label' }, '精准：'),
              h('span', { class: 'analysis-bar' }, [
                h('span', { class: 'analysis-fill', style: { width: `${analysis.precision}%` } })
              ]),
              h('span', { class: 'analysis-value' }, String(analysis.precision))
            ]),
            h('span', { class: 'analysis-divider' }, ' │ '),
            h('span', { class: 'analysis-item' }, [
              h('span', { class: 'analysis-icon' }, '🧠 '),
              h('span', { class: 'analysis-label' }, '高阶：'),
              h('span', { class: 'analysis-bar' }, [
                h('span', { class: 'analysis-fill', style: { width: `${analysis.higherOrder}%` } })
              ]),
              h('span', { class: 'analysis-value' }, String(analysis.higherOrder))
            ]),
            h('span', { class: 'analysis-divider' }, ' │ '),
            h('span', { class: 'analysis-item' }, [
              h('span', { class: 'analysis-icon' }, '🔍 '),
              h('span', { class: 'analysis-label' }, '深度：'),
              h('span', { class: 'analysis-bar' }, [
                h('span', { class: 'analysis-fill', style: { width: `${analysis.depth}%` } })
              ]),
              h('span', { class: 'analysis-value' }, String(analysis.depth))
            ])
          ]);
        }
      };
    }

    return item;
  });
});

// 状态管理
const state = reactive({
  id: 0,
  apiKey: "sk-e18179ecb5ba4eb9b9d07a287dff4edd",
  needCompleteStep: false, // 标记是否需要完成步骤
});

//////////////////
// prompt管理
const [message, contextHolder] = messageAnt.useMessage();
// deepseek大模型接口
const ds = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-e18179ecb5ba4eb9b9d07a287dff4edd',
  dangerouslyAllowBrowser: true
});

// 新增：数据分析结果获取函数（使用真实数据）
const analyzeUserQuestion = async (messageKey: string, questionText: string) => {
  console.log(`=== 开始分析问题 ===`);
  console.log(`消息Key: ${messageKey}`);
  console.log(`问题内容: ${questionText}`);

  try {
    // 设置加载状态
    questionAnalysisMap.value.set(messageKey, {
      precision: 0,
      higherOrder: 0,
      depth: 0,
      loading: true
    });
    // 强制触发响应式更新
    questionAnalysisMap.value = new Map(questionAnalysisMap.value);
    console.log(`已设置加载状态，当前Map大小: ${questionAnalysisMap.value.size}`);

    // 获取用户的历史提问（仅用户消息）
    const previousUserQuestions = chatMessagesList.value
      .filter((msg: any) => msg.status === DISPLAY_ROLE_LOCAL)
      .map((msg: any) => {
        const content = typeof msg.content === 'string' ? msg.content : (msg.content?.text || '');
        return content;
      })
      .filter((q: string) => q !== questionText); // 排除当前问题

    // 构建历史问题上下文
    let historyContext = '';
    if (previousUserQuestions.length > 0) {
      historyContext = `\n\n**用户的历史提问记录：**\n${previousUserQuestions.map((q: string, idx: number) => `${idx + 1}. ${q}`).join('\n')}\n\n`;
    }

    // 调用 DeepSeek 分析问题
    console.log('开始调用 DeepSeek API...');
    const completion = await ds.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: 'system',
          content: `你是一个课堂提问质量分析专家。分析在人机协同教研中，教师提出的、关于“课堂提问”这一教学技能的困惑与问题。你的目标是透过这些问题本身，诊断提问教师在提问观念、设计思路与临场策略上可能存在的盲区，并提供专业的成长方向指引，并从以下三个维度评分（0-100分）：

1. 精准度（precision）：
焦点诊断： 该教研问题是否精准地定位了课堂提问困境的核心？是笼统地描述现象，还是精准地描述了具体情境、学生表现和自身行为？
归因诊断： 教师在提问中，将问题的原因归结于何处（如：归咎于学生不配合、自身能力不足、问题设计缺陷）？这种归因方式是否客观、全面？
示例： 对比“学生为什么不回答？”（笼统）与“当我提出一个需要多步推理的分析性问题后，课堂陷入沉默，我该怎么办？”（精准）。

2. 高阶思维（higherOrder）：
认知层次诊断： 该教研问题反映出提问教师正处于哪个专业反思层次？
低阶（求技巧）： 寻求现成的、可直接套用的“话术”或“技巧”（例如：“有没有万能的问题模板？”）。
中阶（求策略）： 开始关注策略和方法，寻求对某一类问题的解决方案（例如：“如何设计问题链来引导学生深度阅读？”）。
高阶（求理念）： 触及教学理念，关注学生思维发展与课堂文化建构（例如：“如何营造一个让学生敢于冒险、不怕答错的安全的提问环境？”）。
目标分析： 该问题最终追求的是解决表面麻烦，还是提升深层的教学效能？

3. 深度（depth）：
自我洞察力： 该问题是否体现出提问教师对自身教学行为的深刻检视？还是更多地向外寻找原因？
思维开放性： 问题本身是封闭的（寻求一个标准答案），还是开放的（愿意探讨多种可能性及其背后的原理）？
生成性与发展性： 对这个教研问题的探讨，能否引发出更多有价值的、关于教学本质的讨论？它是否具有促进整个教研组共同成长潜力？

请只返回JSON格式：{"precision": 数字, "higherOrder": 数字, "depth": 数字}
不要包含任何其他文字说明。`
        },
        {
          role: 'user',
          content: `${historyContext}**当前问题：**\n${questionText}`
        }
      ],
      temperature: 0.3, // 降低温度以获得更稳定的评分
    });

    const result = completion.choices[0].message.content?.trim() || '';
    console.log('API 返回原始数据:', result);

    // 尝试提取JSON（可能被markdown包裹）
    let jsonText = result;
    const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/) || result.match(/```\s*([\s\S]*?)\s*```/) || result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0].replace(/```json|```/g, '').trim();
    }

    // 解析返回的 JSON
    const scores = JSON.parse(jsonText);
    console.log('解析后的评分:', scores);

    // 更新分析结果
    const analysisResult = {
      precision: Math.min(100, Math.max(0, scores.precision || 0)),
      higherOrder: Math.min(100, Math.max(0, scores.higherOrder || 0)),
      depth: Math.min(100, Math.max(0, scores.depth || 0)),
      loading: false
    };

    questionAnalysisMap.value.set(messageKey, analysisResult);
    // 强制触发响应式更新
    questionAnalysisMap.value = new Map(questionAnalysisMap.value);
    console.log(`问题分析完成! Key: ${messageKey}`, analysisResult);
    console.log(`当前Map内容:`, Array.from(questionAnalysisMap.value.entries()));
  } catch (error) {
    console.error('问题分析失败:', error);
    // 失败时设置默认值
    questionAnalysisMap.value.set(messageKey, {
      precision: 60,
      higherOrder: 60,
      depth: 60,
      loading: false
    });
    // 强制触发响应式更新
    questionAnalysisMap.value = new Map(questionAnalysisMap.value);
    console.log(`已设置默认值，Key: ${messageKey}`);
  }
};

const onMessageSubmit = async (content: string) => {
  if (!content.trim()) return;
  console.log("=== 用户提交消息 ===", content, "当前阶段:", currentDialogueStage.value);

  const messageText = String(content);

  // 1. 添加用户消息
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: messageText,
    status: DISPLAY_ROLE_LOCAL
  });
  userInput.value = '';
  scrollToBottom();

  userQuestionCount.value++;

  try {
    senderLoading.value = true;

    // 根据对话阶段分发处理
    if (currentDialogueStage.value === DialogueStage.OPENING) {
      await handleFirstQuestion(messageText);
    } else if (currentDialogueStage.value === DialogueStage.DIAGNOSIS) {
      await handleRefinedQuestion(messageText);
    } else if (currentDialogueStage.value === DialogueStage.MULTI_TURN ||
               currentDialogueStage.value === DialogueStage.EVIDENCE ||
               currentDialogueStage.value === DialogueStage.ROLE_SELECTION) {
      // 角色选择后、证据阶段等，都使用多轮对话处理（包含质量分析）
      await handleMultiTurnDialogue(messageText);
    } else {
      await handleDefaultDialogue(messageText);
    }
  } catch (error) {
    console.error('对话处理失败:', error);
    store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
      message: "抱歉，系统出现了一些问题，请稍后再试。",
      status: DISPLAY_ROLE_AI
    });
  } finally {
    senderLoading.value = false;
    scrollToBottom();
  }
}

// 处理首次提问：先分类，再诊断
async function handleFirstQuestion(questionText: string) {
  console.log('=== 处理首次提问：分类 + 诊断 ===');

  // 步骤1：问题分类（教学策略 + 实践性知识）
  // 先添加一个加载消息
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: '正在分析您的问题类型...',
    status: DISPLAY_ROLE_AI
  });
  scrollToBottom();

  const loadingMessageIndex = chatMessagesList.value.length - 1;

  const classification = await classifyQuestionAsync(questionText);

  // 存储分类结果，用于思维导图生成
  initialQuestionClassification.value = {
    teachingStrategy: classification.teachingStrategy,
    practicalKnowledge: classification.practicalKnowledge
  };

  // 显示分类结果 - 替换掉加载消息
  const classificationMessage = `**📊 问题分类结果**

**教学策略维度**：${classification.teachingStrategy}

**实践性知识维度**：${classification.practicalKnowledge}

**分类理由**：${classification.reasoning}

---

现在让我为您分析问题的质量...`;

  await new Promise(resolve => setTimeout(resolve, 300));

  // 替换加载消息
  const loadingMsg = chatMessagesList.value[loadingMessageIndex];
  if (loadingMsg && loadingMsg.content) {
    loadingMsg.content.text = classificationMessage;
  }
  scrollToBottom();

  // 步骤2：触发质量分析
  nextTick(() => {
    const userMessages = chatMessagesList.value.filter((msg: any) => msg.status === DISPLAY_ROLE_LOCAL);
    if (userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1];
      analyzeUserQuestion(String(lastUserMessage.id), questionText);
    }
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 步骤3：获取质量分析结果
  const userMessages = chatMessagesList.value.filter((msg: any) => msg.status === DISPLAY_ROLE_LOCAL);
  const analysis = getAnalysisForMessage(userMessages[userMessages.length - 1].id);

  // 步骤4：生成诊断和优化建议
  const diagnosisPrompt = `基于以下信息，请提供问题诊断和优化建议：

**教师问题**：${questionText}

**问题分类**：
- 教学策略：${classification.teachingStrategy}
- 实践性知识：${classification.practicalKnowledge}

**质量分析**：
- 精准度：${analysis.precision}/100
- 高阶思维：${analysis.higherOrder}/100
- 深度：${analysis.depth}/100

请提供：
1. 当前问题的优缺点分析（50字内）
2. 具体优化建议，提升精准度、高阶思维水平和深度（100字内）

要求：控制在150字以内，语气专业友好。`;

  const completion = await ds.chat.completions.create({
    messages: [
      { role: 'user', content: diagnosisPrompt }
    ],
    model: "deepseek-chat",
    temperature: 0.7,
    max_tokens: 300,
  });

  const diagnosis = completion.choices[0].message.content?.trim() || '诊断生成失败。';

  await new Promise(resolve => setTimeout(resolve, 300));
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: diagnosis + '\n\n💡 **期待您的进一步思考**：\n请您结合以上建议，进一步聚焦具体问题，优化您的提问。我们一起让问题更加精准和深入！',
    status: DISPLAY_ROLE_AI
  });

  // 步骤5：更新阶段
  currentDialogueStage.value = DialogueStage.DIAGNOSIS;
  scrollToBottom();
}

// 处理优化后的提问
async function handleRefinedQuestion(questionText: string) {
  switchResearchStep(2);

  // 步骤1：触发质量分析（针对第二个问题）
  nextTick(() => {
    const userMessages = chatMessagesList.value.filter((msg: any) => msg.status === DISPLAY_ROLE_LOCAL);
    if (userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1];
      analyzeUserQuestion(String(lastUserMessage.id), questionText);
    }
  });

  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: `很好！您优化后的问题更加聚焦。让我们进入深入分析阶段。`,
    status: DISPLAY_ROLE_AI
  });
  await new Promise(resolve => setTimeout(resolve, 500));

  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: ROLE_SELECTION_PROMPT,
    status: DISPLAY_ROLE_HINT
  });

  // 添加角色选择器消息（占位符，用于在列表中定位）
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: '', // 空内容，实际由 RoleSelector 组件渲染
    status: DISPLAY_ROLE_ROLE_SELECTOR
  });

  currentDialogueStage.value = DialogueStage.ROLE_SELECTION;
  scrollToBottom();
}

// 处理多轮对话
async function handleMultiTurnDialogue(questionText: string) {
  nextTick(() => {
    const userMessages = chatMessagesList.value.filter((msg: any) => msg.status === DISPLAY_ROLE_LOCAL);
    if (userMessages.length > 0) {
      analyzeUserQuestion(String(userMessages[userMessages.length - 1].id), questionText);
    }
  });

  // 收集最近对话历史用于上下文提取
  const recentDialogue = chatMessagesList.value
    .filter((msg: any) => msg.status === DISPLAY_ROLE_LOCAL || msg.status === DISPLAY_ROLE_AI)
    .slice(-6) // 最近3轮
    .map((msg: any) => {
      const content = typeof msg.content === 'string' ? msg.content : (msg.content?.text || '');
      const role = msg.status === DISPLAY_ROLE_LOCAL ? '教师' : 'AI';
      return `${role}: ${content}`;
    })
    .join('\n');

  // 静默提取上下文(不等待完成,避免延迟响应)
  extractAndUpdateContext(recentDialogue + `\n教师: ${questionText}`).catch(err => {
    console.warn('上下文提取失败:', err);
  });

  // 构建增强的prompt,包含课堂数据上下文和教研上下文
  let enhancedPrompt = '';

  // 1. 首先添加课堂数据背景
  const classroomContext = formatClassroomDataContext();
  if (classroomContext) {
    enhancedPrompt += `${classroomContext}\n---\n\n`;
  }

  // 2. 如果有教研上下文,先提供上下文信息
  const contextInfo = formatResearchContext();
  if (contextInfo) {
    enhancedPrompt += `${contextInfo}\n---\n\n`;
  }

  enhancedPrompt += `教师的新问题：${questionText}\n\n`;

  // 添加上下文约束 - 优先使用课堂数据上下文
  const ctxSubject = classroomDataContext.value.subject || researchContext.value.subject;
  const ctxTopic = classroomDataContext.value.lessonTopic || researchContext.value.lessonTopic;

  if (ctxSubject && ctxTopic) {
    enhancedPrompt += `请继续围绕${ctxSubject}学科的"${ctxTopic}"课堂案例主题进行回复。`;
  } else {
    enhancedPrompt += `请回答这个问题`;
  }

  enhancedPrompt += `，并在回复最后简短地（20字内）提出一个引导性的追问方向。`;

  // 传入当前角色信息,保持角色icon
  await streamAIResponseWithPrompt(currentAgentRole.value.systemPrompt, enhancedPrompt, currentAgentRole.value);
}

// 默认对话
async function handleDefaultDialogue(questionText: string) {
  const systemPrompt = currentAgentRole.value?.systemPrompt || SYSTEM_BASE_PROMPT;
  await streamAIResponseWithPrompt(systemPrompt, questionText);
}

// 流式输出
async function streamAIResponseWithPrompt(systemPrompt: string, userPrompt: string, agentRole?: any) {
  try {
    const completion = await ds.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: "deepseek-chat",
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,  // 增加到2000以支持完整的角色对话
    });

    let fullContent = "";
    let aiMessageIndex = -1;

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullContent += delta;
        if (aiMessageIndex === -1) {
          const messagePayload: any = {
            message: fullContent,
            status: DISPLAY_ROLE_AI
          };
          // 如果有角色信息,添加到消息中
          if (agentRole) {
            messagePayload.agentRole = agentRole;
          }
          store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, messagePayload);
          aiMessageIndex = chatMessagesList.value.length - 1;
        } else {
          const aiMsg = chatMessagesList.value[aiMessageIndex];
          if (aiMsg && aiMsg.content) {
            aiMsg.content.text = fullContent;
          }
        }
        scrollToBottom();
      }
    }
  } catch (error) {
    console.error('流式输出失败:', error);
    // 添加错误提示消息
    const messagePayload: any = {
      message: '抱歉，回复生成过程中出现了错误，请稍后重试。',
      status: DISPLAY_ROLE_AI
    };
    if (agentRole) {
      messagePayload.agentRole = agentRole;
    }
    store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, messagePayload);
    scrollToBottom();
  }
}

// 异步分类用户问题
async function classifyQuestionAsync(questionText: string): Promise<{
  teachingStrategy: TeachingStrategy;
  practicalKnowledge: PracticalKnowledge;
  reasoning: string;
  confidence: number;
}> {
  try {
    const completion = await ds.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: QUESTION_CLASSIFICATION_PROMPT + questionText
        }
      ],
      model: "deepseek-chat",
      temperature: 0.3,
    });

    const result = completion.choices[0].message.content?.trim() || '';
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const classification = JSON.parse(jsonMatch[0]);
      return {
        teachingStrategy: classification.teachingStrategy as TeachingStrategy,
        practicalKnowledge: classification.practicalKnowledge as PracticalKnowledge,
        reasoning: classification.reasoning || '',
        confidence: classification.confidence || 0.5
      };
    }
  } catch (error) {
    console.error('问题分类解析失败:', error);
  }

  // 默认分类
  return {
    teachingStrategy: TeachingStrategy.THINKING_STIMULATION,
    practicalKnowledge: PracticalKnowledge.PROCEDURAL,
    reasoning: '默认分类',
    confidence: 0.5
  };
}

// 新增：生成问题诊断和优化建议
async function generateQuestionDiagnosis(questionText: string, analysis: QuestionAnalysis): Promise<string> {
  const diagnosisPrompt = `你是一位教研专家，请诊断以下教师提问的质量，并提供优化建议。

**教师问题**：${questionText}

**质量分析**：
- 精准度：${analysis.precision}/100
- 高阶思维：${analysis.higherOrder}/100
- 深度：${analysis.depth}/100

请提供：
1. 问题类型诊断（教学策略 + 实践性知识维度）
2. 当前问题的优缺点分析
3. 具体优化建议（提升精准度、高阶思维水平、追问深度）

要求：
- 控制在150字以内
- 语气专业友好
- 建议具体可操作`;

  try {
    const completion = await ds.chat.completions.create({
      messages: [
        { role: 'user', content: diagnosisPrompt }
      ],
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 300,
    });

    return completion.choices[0].message.content?.trim() || '问题诊断生成失败，请重试。';
  } catch (error) {
    console.error('生成诊断失败:', error);
    return '抱歉，诊断服务暂时不可用。';
  }
}

// 新增：教研专用AI处理函数
// 通用AI处理
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
  request: async (params, { onSuccess, onUpdate, onError }) => {
    const message = params.message;
    const userInput = (params as any).userInput || null; // 获取用户实际输入
    const shouldShowUserMessage = (params as any).shouldShowUserMessage || false; // 是否显示用户消息

    console.log("request", { message, userInput, shouldShowUserMessage, status: DISPLAY_ROLE_LOCAL });

    // 如果需要显示用户消息且有 userInput，则添加到聊天记录
    if (shouldShowUserMessage && userInput) {
      const userInputStr = typeof userInput === 'string' ? userInput : String(userInput);
      store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
        message: userInputStr,
        status: DISPLAY_ROLE_LOCAL
      });
    }
    setContent('');

    // 使用完整的提示词发送给 AI
    const messageStr = typeof message === 'string' ? message : String(message);

    // 使用通用AI处理
    await handleGeneralAIRequest(messageStr, { onSuccess, onUpdate, onError });
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

  // 初始化课堂数据上下文
  initializeClassroomDataContext();

  // 设置初始流程模式为欢迎阶段
  researchFlowMode.value = 'welcome';

  // 发送开场白 - 直接添加到消息列表，不调用AI
  setTimeout(() => {
    store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
      message: "您好！欢迎使用问课大模型。我是您的教研助手，致力于帮助您提升课堂提问质量、优化教学策略。\n\n无论您在教学中遇到什么困惑，或是想要探讨课堂教学的改进方向，都可以随时向我提问。让我们一起开启高效的教研之旅吧！",
      status: DISPLAY_ROLE_AI
    });
    scrollToBottom();
  }, 300);

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
  // 延迟渲染 Mermaid 图表，确保 DOM 已更新
  setTimeout(() => {
    renderMermaidDiagrams();
  }, 100);
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

// 新增：处理自主提问模式
const handleSelfInquiryMode = async (userQuestion: string) => {
  console.log("=== 处理自主提问 ===", userQuestion);

  // 保存用户问题
  userGoalClassification.value.userQuestion = userQuestion;

  try {
    // 使用DeepSeek AI进行智能分类
    console.log("调用DeepSeek进行问题分类...");
    const classification = await classifyTeacherQuestion(userQuestion, ds);
    userGoalClassification.value.teachingStrategy = classification.teachingStrategy;
    userGoalClassification.value.practicalKnowledge = classification.practicalKnowledge;

    console.log("AI分类结果:", classification);

    // 生成目标定位提示词
    const goalPrompt = generateEnhancedPrompt('self-inquiry', {
      userQuestion: userQuestion
    });

    // 添加自定义系统消息，告知AI分类结果和理由
    const fullPrompt = `${goalPrompt}\n\n**AI分类结果**：\n- 教学策略维度：【${classification.teachingStrategy}】\n- 实践性知识维度：【${classification.practicalKnowledge}】\n- 分类理由：${classification.reasoning}\n- 置信度：${Math.round(classification.confidence * 100)}%\n\n请基于这个分类给出专业反馈，并询问教师这个定位是否准确。`;

    // 提交AI分析，传入用户输入和完整提示词
    onRequest({
      message: fullPrompt,           // 发送给AI的完整提示词
      userInput: userQuestion,       // 用户实际输入的内容
      shouldShowUserMessage: true    // 标记需要显示用户消息
    });
  } catch (error) {
    console.error("AI分类失败:", error);
    messageAnt.error('分类失败，请重试');
  }
};

// 新增：处理AI引导模式
const handleAIGuidedMode = async (step: number, userResponse?: string) => {
  console.log(`=== AI引导模式 Step ${step} ===`);

  if (step === 1) {
    // 第一步：课堂效能分析
    console.log("开始课堂效能分析");

    try {
      // 读取并分析真实课堂数据
      console.log("正在分析课堂数据...");
      const analysis: EfficiencyAnalysis = await performClassroomAnalysis();

      console.log("课堂效能分析完成:", analysis);

      // 生成分析报告文本
      const analysisReport = formatAnalysisReport(analysis);

      // 生成效能分析提示词
      const efficiencyPrompt = generateEnhancedPrompt('ai-guided-step1', {
        classroomData: {
          type: analysis.type,
          label: analysis.label,
          reasoning: analysis.reasoning,
          keyIndicators: analysis.keyIndicators,
          metrics: analysis.metrics
        }
      });

      // 添加可视化图表提示
      const fullPrompt = `${efficiencyPrompt}\n\n${analysisReport}\n\n📊 **可视化分析**：系统已生成课堂效能分析图表，您可以查看详细的数据指标和维度分析。`;

      onRequest({ message: fullPrompt });

      // TODO: 在合适的位置显示 ClassroomEfficiencyChart 组件
      // 可以通过添加特殊消息类型或在侧边栏显示

      // 进入下一子步骤
      aiGuidedStep.value = 2;

    } catch (error) {
      console.error("课堂数据分析失败:", error);
      messageAnt.error('课堂数据分析失败，请检查数据文件');

      // 使用备用方案
      const fallbackPrompt = "抱歉，暂时无法读取课堂数据。请您直接描述课堂中需要改进的片段或环节。";
      onRequest({ message: fallbackPrompt });
      aiGuidedStep.value = 2;
    }

  } else if (step === 2 && userResponse) {
    // 第二步：回忆改进片段
    console.log("引导回忆改进片段", userResponse);

    const recallPrompt = generateEnhancedPrompt('ai-guided-step2', {
      recalledSegment: userResponse
    });

    // 传入用户输入和完整提示词
    onRequest({
      message: recallPrompt,           // 发送给AI的完整提示词
      userInput: userResponse,         // 用户实际输入的内容
      shouldShowUserMessage: true      // 标记需要显示用户消息
    });

    // 进入下一子步骤
    aiGuidedStep.value = 3;

  } else if (step === 3 && userResponse) {
    // 第三步：维度引导与自主提问
    console.log("维度引导", userResponse);

    const dimensionPrompt = generateEnhancedPrompt('ai-guided-step3', {
      improvementNeed: userResponse
    });

    // 传入用户输入和完整提示词
    onRequest({
      message: dimensionPrompt,        // 发送给AI的完整提示词
      userInput: userResponse,         // 用户实际输入的内容
      shouldShowUserMessage: true      // 标记需要显示用户消息
    });

    // 完成AI引导，等待教师提出问题
    // 下一次用户提问将进入自主提问模式
    researchFlowMode.value = 'self-inquiry';
  }
};

// 新增：从引导模式过渡到正式教研

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

// 新增：插入提示框到对话列表
const insertHintMessage = () => {
  const hints = getHintContentByStep(currentResearchStep.value);
  const hintContent = hints.join('  •  ');

  // 添加提示框消息到store
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: hintContent,
    status: DISPLAY_ROLE_HINT
  });

  // 触发滚动
  scrollToBottom();
};

// 新增：显示角色选择器
const showRoleSelectorPrompt = () => {
  showRoleSelector.value = true;

  // 添加角色选择提示到对话列表
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: ROLE_SELECTION_PROMPT,
    status: DISPLAY_ROLE_HINT
  });

  scrollToBottom();
};

/**
 * 没用这个
 * 格式化文献证据为 Markdown 表格
 * @returns 格式化后的 Markdown 字符串
 */
const formatLiteratureEvidence = (): string => {
  let evidence = `\n\n## 📚 文献证据支持\n\n`;
  evidence += `**检索关键词**：课堂提问, 提问层次，数学学科\n\n`;
  evidence += `**检索结果**：\n\n`;

  // LITERATURE_PANELS.forEach((panel, index) => {
  LITERATURE_PANELS.forEach((panel, index) => {
    evidence += `### ${index + 1}. ${panel.header}\n\n`;

    // 论文信息
    evidence += `**论文信息**：\n\n`;
    evidence += `| 项目 | 内容 |\n`;
    evidence += `|------|------|\n`;
    Object.entries(panel.paper_info).forEach(([key, value]) => {
      evidence += `| ${key} | ${value} |\n`;
    });
    evidence += `\n`;

    // 理论基础
    evidence += `**理论基础**：\n\n`;
    evidence += `| 理论要点 | 说明 |\n`;
    evidence += `|----------|------|\n`;
    Object.entries(panel.theoretical_basis).forEach(([key, value]) => {
      evidence += `| ${key} | ${value} |\n`;
    });
    evidence += `\n`;

    // 前沿观点
    evidence += `**前沿观点**：\n\n`;
    evidence += `| 观点 | 描述 |\n`;
    evidence += `|------|------|\n`;
    Object.entries(panel.frontier_views).forEach(([key, value]) => {
      evidence += `| ${key} | ${value} |\n`;
    });
    evidence += `\n`;
  });

  evidence += `---\n`;
  evidence += `**请基于以上文献证据，为教师提供有理论支撑和实证依据的教研建议。**\n`;

  return evidence;
};

/**
 * 格式化对话链数据为结构化的 prompt 上下文
 * @param chainId 对话链的 ID
 * @returns 格式化后的字符串,包含布鲁姆分类统计和具体问题列表
 */
const formatQuestionChainContext = (chainId: number): string => {
  const chain = questionChainsData.chains.find((c: any) => c.id === chainId);

  if (!chain) {
    return '';
  }

  // 1. 统计布鲁姆分类分布
  const bloomStats: Record<string, number> = {};
  chain.questions.forEach((q: any) => {
    const blmType = q.blmType || '其他';
    bloomStats[blmType] = (bloomStats[blmType] || 0) + 1;
  });

  // 2. 统计四何分类分布
  const matStats: Record<string, number> = {};
  chain.questions.forEach((q: any) => {
    const mat = q.mat || '其他';
    matStats[mat] = (matStats[mat] || 0) + 1;
  });

  // 3. 计算平均质量分数
  const avgValueScore = chain.characteristics.avgValueScore.toFixed(2);

  // 4. 构建格式化的上下文
  let context = `\n\n## 📊 课堂提问案例数据（循证支持）\n\n`;
  context += `**教学阶段**：${chain.teachingPhase}\n\n`;

  context += `**问题链特征**：\n`;
  context += `- 总问题数：${chain.questionCount} 个\n`;
  context += `- 持续时间：${chain.duration} 秒\n`;
  context += `- 平均质量分数：${avgValueScore}/5.0\n`;
  context += `- 问题强度：${chain.characteristics.intensity.toFixed(2)} 问/分钟\n\n`;

  context += `**布鲁姆分类分布**（认知层次）：\n`;
  Object.entries(bloomStats)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .forEach(([type, count]) => {
      const percentage = ((count as number / chain.questionCount) * 100).toFixed(1);
      context += `- ${type}：${count} 个 (${percentage}%)\n`;
    });

  context += `\n**四何分类分布**（问题类型）：\n`;
  Object.entries(matStats)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .forEach(([type, count]) => {
      const percentage = ((count as number / chain.questionCount) * 100).toFixed(1);
      context += `- ${type}：${count} 个 (${percentage}%)\n`;
    });

  context += `\n**认知进阶模式**：\n`;
  const progression = chain.characteristics.bloomProgression;
  context += `- 模式类型：${progression.pattern}\n`;
  context += `- 递进次数：${progression.ascending} 次\n`;
  context += `- 递降次数：${progression.descending} 次\n`;
  context += `- 稳定次数：${progression.stable} 次\n`;
  context += `- 进阶比例：${(progression.progressionRatio * 100).toFixed(1)}%\n\n`;

  context += `**具体问题列表**：\n`;
  chain.questions.forEach((q: any, index: number) => {
    context += `${index + 1}. **${q.question}**\n`;
    context += `   - 布鲁姆层级：${q.blmType}\n`;
    context += `   - 四何类型：${q.mat}\n`;
    context += `   - 质量分数：${q.valueScore}/5.0\n`;
    if (q.answer) {
      context += `   - 学生回答：${q.answer}\n`;
    }
    if (q.feedbackType && q.feedbackType !== '无反馈') {
      context += `   - 反馈类型：${q.feedbackType}\n`;
      if (q.comment) {
        context += `   - 教师点评：${q.comment}\n`;
      }
    }
    context += `\n`;
  });

  context += `\n---\n`;
  context += `**请基于以上真实的课堂提问数据，结合布鲁姆分类理论，为教师提供循证的、有数据支持的教研建议。**\n`;

  // 添加文献证据
  context += formatLiteratureEvidence();

  return context;
};

// 新增：处理角色选择
const handleRoleSelection = async (role: AgentRole) => {
  currentAgentRole.value = role;
  // 不关闭角色选择器
  // showRoleSelector.value = false;

  console.log('已选择角色:', role.title);

  // 收集用户在选择角色前的所有提问
  const userQuestionsBeforeSelection = chatMessagesList.value
    .filter((msg: any) => msg.status === DISPLAY_ROLE_LOCAL)
    .map((msg: any) => {
      const content = typeof msg.content === 'string' ? msg.content : (msg.content?.text || '');
      return content;
    });

  console.log('用户历史问题:', userQuestionsBeforeSelection);

  // 提取并更新教研上下文
  const recentDialogue = chatMessagesList.value
    .filter((msg: any) => msg.status === DISPLAY_ROLE_LOCAL || msg.status === DISPLAY_ROLE_AI)
    .slice(-8) // 最近4轮
    .map((msg: any) => {
      const content = typeof msg.content === 'string' ? msg.content : (msg.content?.text || '');
      const role = msg.status === DISPLAY_ROLE_LOCAL ? '教师' : 'AI';
      return `${role}: ${content}`;
    })
    .join('\n');

  await extractAndUpdateContext(recentDialogue);

  // 格式化当前教研上下文
  const contextInfo = formatResearchContext();

  // 获取 id=4 的对话链数据（课堂提问案例）
  const questionChainContext = formatQuestionChainContext(4);

  // 合并用户问题 + 课堂数据上下文 + 教研上下文 + 对话链数据到一个 prompt 中
  let combinedQuestions = '';

  // 1. 首先添加课堂数据背景(最优先)
  const classroomContext = formatClassroomDataContext();
  if (classroomContext) {
    combinedQuestions += `${classroomContext}\n---\n\n`;
  }

  // 2. 添加结构化的教研上下文
  if (contextInfo) {
    combinedQuestions += `${contextInfo}\n---\n\n`;
  }

  if (userQuestionsBeforeSelection.length > 0) {
    combinedQuestions += `用户的问题是：\n${userQuestionsBeforeSelection.join('\n')}`;
  } else {
    combinedQuestions = '请问您想探讨什么教学问题？';
  }

  // 添加对话链数据作为循证支持
  combinedQuestions += questionChainContext;

  // 添加上下文保持提示 - 使用课堂数据上下文
  const ctxSubject = classroomDataContext.value.subject || researchContext.value.subject;
  const ctxTopic = classroomDataContext.value.lessonTopic || researchContext.value.lessonTopic;

  if (ctxSubject && ctxTopic) {
    combinedQuestions += `\n\n**重要提示**：本次教研讨论基于${ctxSubject}学科的"${ctxTopic}"课堂案例，请务必围绕这个主题进行回复，不要跳到其他学科或话题。`;
  }

  console.log('合并后的 prompt:', combinedQuestions);

  // 使用角色的系统提示词 + 合并的用户问题 + 对话链数据生成回复
  try {
    senderLoading.value = true;

    const completion = await ds.chat.completions.create({
      messages: [
        { role: 'system', content: role.systemPrompt },
        { role: 'user', content: combinedQuestions }
      ],
      model: "deepseek-chat",
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,  // 增加到2000以支持完整的角色对话
    });

    let fullContent = "";
    let aiMessageIndex = -1;

    // 首先添加角色介绍
    store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
      message: `您好！我是**${role.title}**（${role.name}），${role.description}。`,
      status: DISPLAY_ROLE_AI,
      agentRole: role
    });
    scrollToBottom();

    await new Promise(resolve => setTimeout(resolve, 300));

    // 然后流式输出对用户问题的回答
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullContent += delta;
        if (aiMessageIndex === -1) {
          store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
            message: fullContent,
            status: DISPLAY_ROLE_AI,
            agentRole: role
          });
          aiMessageIndex = chatMessagesList.value.length - 1;
        } else {
          const aiMsg = chatMessagesList.value[aiMessageIndex];
          if (aiMsg && aiMsg.content) {
            aiMsg.content.text = fullContent;
          }
        }
        scrollToBottom();
      }
    }
  } catch (error) {
    console.error('角色回复失败:', error);
    store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
      message: `很高兴与您交流教学问题，请问您想探讨什么？`,
      status: DISPLAY_ROLE_AI,
      agentRole: currentAgentRole.value
    });
  } finally {
    senderLoading.value = false;
  }

  // 更新对话阶段为多轮对话
  currentDialogueStage.value = DialogueStage.MULTI_TURN;
  console.log('对话阶段更新为: MULTI_TURN');

  scrollToBottom();
};

// 新增：处理循证按钮点击
const handleEvidenceClick = async () => {
  console.log('=== 循证按钮点击 ===');

  // 1. 切换到证据步骤
  switchResearchStep(3);
  currentDialogueStage.value = DialogueStage.EVIDENCE;

  // 2. 添加加载消息 - 使用当前角色icon
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: '正在为您整理相关文献和研究证据...',
    status: DISPLAY_ROLE_AI,
    agentRole: currentAgentRole.value
  });

  scrollToBottom();
  const loadingMessageIndex = chatMessagesList.value.length - 1;

  // 3. 模拟获取文献数据（实际应该从PortraitView获取）
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. 生成文献表格
  const literatureTable = generateLiteratureTable();

  // 5. 替换加载消息为文献表格
  const loadingMsg = chatMessagesList.value[loadingMessageIndex];
  if (loadingMsg && loadingMsg.content) {
    loadingMsg.content.text = literatureTable;
  }

  scrollToBottom();

  // 6. AI解释文献
  await new Promise(resolve => setTimeout(resolve, 500));

  const explanation = await generateEvidenceExplanation();
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: explanation,
    status: DISPLAY_ROLE_AI,
    agentRole: currentAgentRole.value
  });

  scrollToBottom();
};

// 新增：处理总结按钮点击
const handleSummaryClick = () => {
  console.log('=== 总结按钮点击 ===');

  // 1. 切换到总结步骤
  switchResearchStep(4);
  currentDialogueStage.value = DialogueStage.SUMMARY;

  // 2. 进入选择模式
  isSelectionMode.value = true;
  selectedMessageIds.value.clear();

  // 3. 添加提示消息
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: '✅ **选择模式已激活**\n\n请勾选您想要总结的对话内容，选择完成后点击下方"生成总结"按钮。',
    status: DISPLAY_ROLE_HINT
  });

  scrollToBottom();
};

// 新增：切换消息选择状态
const toggleMessageSelection = (messageId: number | string) => {
  if (selectedMessageIds.value.has(messageId)) {
    selectedMessageIds.value.delete(messageId);
  } else {
    selectedMessageIds.value.add(messageId);
  }
  // 强制触发响应式更新
  selectedMessageIds.value = new Set(selectedMessageIds.value);
};

// 新增：生成总结
const generateSummary = async () => {
  if (selectedMessageIds.value.size === 0) {
    store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
      message: '请至少选择一条对话内容后再生成总结。',
      status: DISPLAY_ROLE_HINT
    });
    return;
  }

  console.log('=== 生成总结 ===', selectedMessageIds.value);

  // 1. 退出选择模式
  isSelectionMode.value = false;

  // 2. 收集选中的消息内容
  const selectedMessages = chatMessagesList.value
    .filter((msg: any) => selectedMessageIds.value.has(msg.id))
    .map((msg: any) => {
      const content = typeof msg.content === 'string' ? msg.content : (msg.content?.text || '');
      const role = msg.status === DISPLAY_ROLE_LOCAL ? '教师' : 'AI';
      return `**${role}**: ${content}`;
    })
    .join('\n\n');

  // 3. 显示加载消息
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: '正在为您生成总结和思维导图...',
    status: DISPLAY_ROLE_AI
  });

  scrollToBottom();
  const loadingMessageIndex = chatMessagesList.value.length - 1;

  // 4. 生成AI总结
  const summaryPrompt = `请基于以下对话内容，生成一份简洁的总结（150字以内），并提炼3-5个关键要点：

${selectedMessages}

总结格式：
### 对话总结
[总结内容]

### 关键要点
1. [要点1]
2. [要点2]
3. [要点3]`;

  try {
    const completion = await ds.chat.completions.create({
      messages: [
        { role: 'system', content: currentAgentRole.value.systemPrompt },
        { role: 'user', content: summaryPrompt }
      ],
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 400,
    });

    const summary = completion.choices[0].message.content?.trim() || '总结生成失败。';

    await new Promise(resolve => setTimeout(resolve, 500));

    // 替换加载消息为总结内容
    const loadingMsg = chatMessagesList.value[loadingMessageIndex];
    if (loadingMsg && loadingMsg.content) {
      loadingMsg.content.text = summary;
    }

    scrollToBottom();

    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. 生成思维导图（Markdown格式）- 传入初始问题分类
    const mindMap = await generateMindMap(selectedMessages, initialQuestionClassification.value);
    store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
      message: mindMap,
      status: DISPLAY_ROLE_AI
    });

  } catch (error) {
    console.error('生成总结失败:', error);
    // 替换加载消息为错误消息
    const loadingMsg = chatMessagesList.value[loadingMessageIndex];
    if (loadingMsg && loadingMsg.content) {
      loadingMsg.content.text = '抱歉，总结生成失败，请重试。';
    }
  }

  scrollToBottom();
  selectedMessageIds.value.clear();
};

// 取消选择模式
const cancelSelection = () => {
  isSelectionMode.value = false;
  selectedMessageIds.value.clear();

  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: '已取消选择模式。',
    status: DISPLAY_ROLE_HINT
  });

  scrollToBottom();
};

// 生成思维导图（Mermaid格式的Markdown）- 使用AI生成结构化内容
async function generateMindMap(
  selectedMessages: string,
  classification: { teachingStrategy: string; practicalKnowledge: string } | null
): Promise<string> {
  try {
    // 构建父节点标题
    const parentNodeTitle = classification
      ? `${classification.teachingStrategy}-${classification.practicalKnowledge}`
      : '教研对话';

    const prompt = `基于以下教研对话内容，生成一个结构化的思维导图。

**问题分类**：${classification ? `教学策略【${classification.teachingStrategy}】+ 实践性知识【${classification.practicalKnowledge}】` : '未分类'}

**对话内容**：
${selectedMessages}

**要求**：
1. 使用"${parentNodeTitle}"作为父节点（根节点），这是根据初始问题分类确定的
2. 从对话内容中提取3-5个核心主题作为一级子节点，从父节点延伸
3. 每个核心主题下提取2-4个关键要点作为二级节点
4. 使用简洁的关键词和短语（每个节点5-8字）
5. 体现对话的逻辑层次和内在联系
6. 输出格式为Mermaid的graph LR语法（左右布局）

**输出格式示例**：
\`\`\`mermaid
graph LR
    Root["${parentNodeTitle}"] --> A[核心主题1]
    Root --> B[核心主题2]
    Root --> C[核心主题3]
    A --> A1[要点1]
    A --> A2[要点2]
    B --> B1[要点1]
    C --> C1[要点1]
\`\`\`

**注意**：
- 请直接输出Mermaid代码，不要其他解释文字
- 节点ID使用Root作为根节点，然后使用字母（A, B, C...）
- 节点文本使用中文，父节点必须是"${parentNodeTitle}"`;

    const completion = await ds.chat.completions.create({
      messages: [
        { role: 'system', content: '你是一位擅长知识结构化和思维导图设计的专家，能够从对话中提取关键信息并构建清晰的层次结构。' },
        { role: 'user', content: prompt }
      ],
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 800,
    });

    const mermaidCode = completion.choices[0].message.content?.trim() || '';

    // 确保返回的是完整的Mermaid代码块
    let formattedCode = mermaidCode;
    if (!formattedCode.includes('```mermaid')) {
      formattedCode = `\`\`\`mermaid\n${formattedCode}\n\`\`\``;
    }

    // 确保使用 graph LR（左右布局）
    formattedCode = formattedCode.replace(/graph\s+TD/gi, 'graph LR');

    return `### 思维导图\n\n${formattedCode}\n\n*注：思维导图使用Mermaid语法生成，从左到右展示对话的知识结构*`;
  } catch (error) {
    console.error('生成思维导图失败:', error);
    // 返回备用的简单思维导图 - 使用父节点
    const parentNodeTitle = classification
      ? `${classification.teachingStrategy}-${classification.practicalKnowledge}`
      : '教研对话';

    return `### 思维导图

\`\`\`mermaid
graph LR
    Root["${parentNodeTitle}"] --> B[问题诊断]
    Root --> C[深入分析]
    Root --> D[改进方案]
    B --> B1[精准度]
    B --> B2[深度]
    C --> C1[策略]
    C --> C2[方法]
    D --> D1[建议]
    D --> D2[步骤]
\`\`\`

*注：思维导图使用Mermaid语法生成，从左到右展示对话的知识结构*`;
  }
}

// 生成文献表格（Markdown格式）
// 循证用的这个
function generateLiteratureTable(): string {
  let table = `### 📚 相关研究文献\n\n`;
  table += `**检索关键词**：课堂提问, 提问层次, 数学学科\n\n`;
  table += `**检索结果**：\n\n`;

  // LITERATURE_PANELS.forEach((panel, index) => {
  LITERATURE_PANELS.forEach((panel, index) => {
    table += `${panel.header}\n\n`;
    // table += `#### ${index + 1}. ${panel.header}\n\n`;

    // 论文信息表格
    table += `**论文信息**：\n\n`;
    table += `| 项目 | 内容 |\n`;
    table += `|------|------|\n`;
    Object.entries(panel.paper_info).forEach(([key, value]) => {
      table += `| ${key} | ${value} |\n`;
    });
    table += `\n`;

    // 理论基础表格
    table += `**理论基础**：\n\n`;
    table += `| 理论要点 | 说明 |\n`;
    table += `|----------|------|\n`;
    Object.entries(panel.theoretical_basis).forEach(([key, value]) => {
      table += `| ${key} | ${value} |\n`;
    });
    table += `\n`;

    // 前沿观点表格
    table += `**前沿观点**：\n\n`;
    table += `| 观点 | 描述 |\n`;
    table += `|------|------|\n`;
    Object.entries(panel.frontier_views).forEach(([key, value]) => {
      table += `| ${key} | ${value} |\n`;
    });
    table += `\n`;
  });

  return table;
}

// 提取并更新教研上下文
async function extractAndUpdateContext(recentMessages: string): Promise<void> {
  const extractPrompt = `请从以下对话中提取关键教研信息，以JSON格式返回：

对话内容：
${recentMessages}

请提取：
1. subject: 学科名称（如：数学、语文、英语等）
2. gradeLevel: 年级（如：小学三年级、初中二年级等）
3. lessonTopic: 具体课程主题或知识点（如：勾股定理、圆的面积计算等）
4. teachingGoal: 教学目标（简短概括）
5. studentCharacteristics: 学生特点或学情（如有提及）
6. keywords: 关键词数组（3-5个）

只返回JSON对象，不要其他解释。如果某个字段未提及，设为空字符串或空数组。

示例格式：
{
  "subject": "数学",
  "gradeLevel": "小学三年级",
  "lessonTopic": "勾股定理的应用",
  "teachingGoal": "理解勾股定理并能应用于实际问题",
  "studentCharacteristics": "学生对抽象概念理解有困难",
  "keywords": ["勾股定理", "直角三角形", "问题链", "认知梯度"]
}`;

  try {
    const completion = await ds.chat.completions.create({
      messages: [
        { role: 'system', content: '你是一位教研专家，擅长从对话中提取关键教学信息。' },
        { role: 'user', content: extractPrompt }
      ],
      model: "deepseek-chat",
      temperature: 0.3,  // 降低温度以获得更准确的提取
      max_tokens: 500,
    });

    const responseText = completion.choices[0].message.content?.trim() || '{}';
    // 尝试解析JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);

      // 更新上下文，保留非空值
      if (extracted.subject) researchContext.value.subject = extracted.subject;
      if (extracted.gradeLevel) researchContext.value.gradeLevel = extracted.gradeLevel;
      if (extracted.lessonTopic) researchContext.value.lessonTopic = extracted.lessonTopic;
      if (extracted.teachingGoal) researchContext.value.teachingGoal = extracted.teachingGoal;
      if (extracted.studentCharacteristics) researchContext.value.studentCharacteristics = extracted.studentCharacteristics;
      if (extracted.keywords && extracted.keywords.length > 0) {
        researchContext.value.keywords = extracted.keywords;
      }

      researchContext.value.lastUpdated = Date.now();

      console.log('教研上下文已更新:', researchContext.value);
    }
  } catch (error) {
    console.error('提取上下文失败:', error);
  }
}

// 格式化教研上下文为文本
function formatResearchContext(): string {
  const ctx = researchContext.value;
  if (!ctx.subject && !ctx.lessonTopic) {
    return '';
  }

  let contextText = '**当前教研上下文**：\n';
  if (ctx.subject) contextText += `- 学科：${ctx.subject}\n`;
  if (ctx.gradeLevel) contextText += `- 年级：${ctx.gradeLevel}\n`;
  if (ctx.lessonTopic) contextText += `- 课程主题：${ctx.lessonTopic}\n`;
  if (ctx.teachingGoal) contextText += `- 教学目标：${ctx.teachingGoal}\n`;
  if (ctx.studentCharacteristics) contextText += `- 学生特点：${ctx.studentCharacteristics}\n`;
  if (ctx.keywords && ctx.keywords.length > 0) {
    contextText += `- 关键词：${ctx.keywords.join('、')}\n`;
  }

  return contextText;
}

// 初始化课堂数据上下文 - 从structured_question_chains.json提取
function initializeClassroomDataContext() {
  if (classroomDataContext.value.initialized) {
    return; // 已初始化,跳过
  }

  try {
    const targetId = classroomDataContext.value.targetChainId || 4;
    const targetChain = questionChainsData.chains.find((chain: any) => chain.id === targetId);

    if (!targetChain) {
      console.warn(`未找到ID为${targetId}的chain数据`);
      return;
    }

    // 提取教学环节描述
    const teachingPhase = targetChain.teachingPhase || '';

    // 提取关键师生互动 (前3个问题)
    const keyInteractions = targetChain.questions
      .slice(0, 3)
      .map((q: any, index: number) => {
        const interaction = `问题${index + 1}: ${q.question}`;
        if (q.answer) {
          return `${interaction}\n学生回答: ${q.answer}`;
        }
        if (q.comment) {
          return `${interaction}\n教师点评: ${q.comment}`;
        }
        return interaction;
      });

    // 从问题内容中推断学科和主题
    const allQuestions = targetChain.questions.map((q: any) => q.question).join(' ');

    // 简单的关键词匹配推断学科
    let subject = '数学'; // 默认
    if (allQuestions.includes('直角三角形') || allQuestions.includes('勾股定理') ||
        allQuestions.includes('平方') || allQuestions.includes('斜边')) {
      subject = '数学';
      classroomDataContext.value.lessonTopic = '勾股定理';
      classroomDataContext.value.gradeLevel = '初中';
    }

    // 构建概要信息
    const chainSummary = `本节课共${targetChain.questionCount}个问题，持续${targetChain.duration}秒，主题为"${targetChain.primaryTopic}"，主要认知层级为"${targetChain.primaryBloomLevel}"`;

    // 更新上下文
    classroomDataContext.value = {
      ...classroomDataContext.value,
      subject,
      teachingPhases: [teachingPhase],
      keyInteractions,
      chainSummary,
      initialized: true
    };

    // 同时更新researchContext以保持一致性
    researchContext.value.subject = subject;
    researchContext.value.lessonTopic = classroomDataContext.value.lessonTopic;
    researchContext.value.gradeLevel = classroomDataContext.value.gradeLevel;

    console.log('课堂数据上下文已初始化:', classroomDataContext.value);
  } catch (error) {
    console.error('初始化课堂数据上下文失败:', error);
  }
}

// 格式化课堂数据上下文为文本
function formatClassroomDataContext(): string {
  const ctx = classroomDataContext.value;
  if (!ctx.initialized) {
    return '';
  }

  let contextText = '**课堂数据背景**：\n';
  if (ctx.subject) contextText += `- 学科：${ctx.subject}\n`;
  if (ctx.gradeLevel) contextText += `- 年级：${ctx.gradeLevel}\n`;
  if (ctx.lessonTopic) contextText += `- 课程主题：${ctx.lessonTopic}\n`;
  if (ctx.chainSummary) contextText += `- 课堂情况：${ctx.chainSummary}\n`;
  if (ctx.teachingPhases && ctx.teachingPhases.length > 0) {
    contextText += `- 教学环节：${ctx.teachingPhases[0]}\n`;
  }

  return contextText;
}

// 生成证据解释
async function generateEvidenceExplanation(): Promise<string> {
  // 1. 收集对话历史上下文
  const recentDialogue = chatMessagesList.value
    .filter((msg: any) => msg.status === DISPLAY_ROLE_LOCAL || msg.status === DISPLAY_ROLE_AI)
    .map((msg: any) => {
      const content = typeof msg.content === 'string' ? msg.content : (msg.content?.text || '');
      const role = msg.status === DISPLAY_ROLE_LOCAL ? '教师' : currentAgentRole.value?.title || 'AI';
      return `**${role}**: ${content}`;
    })
    .slice(-8) // 取最近4轮对话(8条消息),增加上下文长度
    .join('\n\n');

  // 2. 提取并更新教研上下文
  await extractAndUpdateContext(recentDialogue);

  // 3. 格式化当前教研上下文
  const contextInfo = formatResearchContext();

  // 4. 构建文献上下文
  let literatureContext = '以下是相关的研究文献：\n\n';

  LITERATURE_PANELS.forEach((panel, index) => {
    literatureContext += `${index + 1}. **${panel.header}**\n`;
    literatureContext += `   - 作者: ${panel.paper_info.作者}\n`;
    literatureContext += `   - 期刊: ${panel.paper_info.期刊}\n`;
    literatureContext += `   - 理论基础: ${Object.keys(panel.theoretical_basis).join(', ')}\n`;
    literatureContext += `   - 前沿观点: ${Object.keys(panel.frontier_views).join(', ')}\n\n`;
  });

  // 5. 构建完整的prompt,包含结构化上下文
  const prompt = `${contextInfo}

---

**最近对话内容**：
${recentDialogue}

---

${literatureContext}

基于上述教研上下文、对话内容和研究文献，请：
1. **务必围绕当前学科(${researchContext.value.subject || '未指定'})和课程主题(${researchContext.value.lessonTopic || '未指定'})展开**
2. 解释这些文献研究如何为当前的${researchContext.value.subject || '教学'}教研讨论提供理论支持
3. 结合${researchContext.value.lessonTopic || '当前主题'}的教学实际，说明理论如何指导实践
4. 控制在180-220字，确保与对话主题完全连贯一致

**重要**：必须紧扣学科和课程主题，不要跳脱到其他学科或话题！`;

  try {
    const completion = await ds.chat.completions.create({
      messages: [
        { role: 'system', content: currentAgentRole.value?.systemPrompt || '你是一位教育研究专家，擅长解读教育文献并提供实践指导。' },
        { role: 'user', content: prompt }
      ],
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 400,
    });

    return completion.choices[0].message.content?.trim() || '文献解释生成失败。';
  } catch (error) {
    console.error('生成文献解释失败:', error);
    return '根据文献研究，这些证据为我们的讨论提供了坚实的理论基础。深度问题研究强调问题组结构和迭代式教学，而基于深度学习的分析方法为大规模课堂提问研究提供了技术支持，两者共同推动了课堂提问教学的理论发展和实践创新。';
  }
}

</script>

<template>
  <div class="chat">
    <!-- 1. 教研进度条 -->
    <div class="research-progress-bar">
      <div class="progress-container">
        <span class="progress-title">教研进度</span>
        <div class="progress-steps-wrapper">
          <Steps :current="currentResearchStep - 1" size="small" class="research-steps">
            <Steps.Step
              v-for="step in researchSteps"
              :key="step.key"
              :title="step.title"
              :description="step.description"
              @click="switchResearchStep(step.key)"
              class="clickable-step"
            />
          </Steps>
        </div>
      </div>
    </div>

    <!-- 2. 对话列表 -->
    <div class="chat-content">
      <div class="messages-wrapper" ref="messagesWrapper">
        <!-- 自定义渲染消息列表 -->
        <template v-for="item in messagesWithFooter" :key="item.key">
          <!-- AI 气泡框 (左侧蓝色) -->
          <div v-if="item.role === 'ai'" class="message-item message-ai" :class="{ 'selectable': isSelectionMode }">
            <!-- 选择模式下的复选框 -->
            <input
              v-if="isSelectionMode"
              type="checkbox"
              class="message-checkbox"
              :checked="selectedMessageIds.has(item.key)"
              @change="toggleMessageSelection(item.key)"
            />
            <div class="message-avatar avatar-ai" :class="{ 'avatar-with-role': item.agentRole }" :title="item.agentRole ? item.agentRole.title : '系统助手'">
              <!-- 如果消息有 agentRole，显示角色图标；否则显示机器人图标 -->
              <template v-if="item.agentRole">
                <img :src="getIconUrl(item.agentRole.iconType)" :alt="item.agentRole.title" class="agent-role-icon" />
              </template>
              <template v-else>
                <ChatbotSvgIcon type="icon-shuziyuangongjiedian" />
              </template>
            </div>
            <div class="message-bubble bubble-ai">
              <div class="bubble-content" v-html="md.render(item.content)"></div>
            </div>
          </div>

          <!-- 用户气泡框 (右侧紫色) -->
          <div v-else-if="item.role === 'local'" class="message-item message-user" :class="{ 'selectable': isSelectionMode }">
            <div class="message-bubble bubble-user">
              <div class="bubble-content">{{ item.content }}</div>
              <!-- 问题分析指标 -->
              <div v-if="item.footer" class="message-footer">
                <component :is="item.footer" />
              </div>
            </div>
            <div class="message-avatar avatar-user">
              <UserOutlined />
            </div>
            <!-- 选择模式下的复选框 -->
            <input
              v-if="isSelectionMode"
              type="checkbox"
              class="message-checkbox"
              :checked="selectedMessageIds.has(item.key)"
              @change="toggleMessageSelection(item.key)"
            />
          </div>

          <!-- 提示框 (居中圆角矩形) -->
          <div v-else-if="item.role === 'hint'" class="message-item message-hint">
            <div class="hint-bubble">
              <BulbOutlined class="hint-icon" />
              <span class="hint-text" v-html="md.render(item.content)"></span>
            </div>
          </div>

          <!-- 角色选择器 (插入在消息列表中) -->
          <div v-else-if="item.role === 'role_selector'" class="message-item message-role-selector">
            <RoleSelector @select="handleRoleSelection" />
          </div>
        </template>
      </div>
    </div>

    <!-- 3. 输入框 -->
    <div class="chat-input" id="linkview-input">
      <!-- 选择模式下的操作按钮 -->
      <div v-if="isSelectionMode" class="selection-actions">
        <div class="selection-info">
          已选择 <span class="selection-count">{{ selectedMessageIds.size }}</span> 条对话
        </div>
        <div class="selection-buttons">
          <Button type="primary" @click="generateSummary" :disabled="selectedMessageIds.size === 0">
            生成总结
          </Button>
          <Button @click="cancelSelection">
            取消
          </Button>
        </div>
      </div>

      <!-- 正常输入模式 -->
      <div v-else class="input-wrapper">
        <div class="action-buttons">
          <Button
            type="text"
            class="action-button hint-button"
            @click="insertHintMessage"
            :title="'插入提示'"
          >
            <BulbOutlined class="bulb-icon" />
          </Button>
          <Button
            type="text"
            class="action-button evidence-button"
            @click="handleEvidenceClick"
            :title="'查看循证支持'"
            :disabled="currentResearchStep < 2"
          >
            <FileTextOutlined class="evidence-icon" />
          </Button>
          <Button
            type="text"
            class="action-button summary-button"
            @click="handleSummaryClick"
            :title="'生成总结'"
            :disabled="currentResearchStep < 3"
          >
            <CheckSquareOutlined class="summary-icon" />
          </Button>
        </div>
        <Sender
          v-model:value="userInput"
          @submit="onMessageSubmit"
          :loading="senderLoading"
          class="message-sender"
        >
          {{ userInput }}
        </Sender>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.chat {
  height: calc(100vh - 68px);
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: white;
}

/* ========== 1. 教研进度条样式 ========== */
.research-progress-bar {
  background: white;
  padding: 16px 20px;
  border-bottom: 2px solid #e8e8e8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 20px;
}

.progress-title {
  font-size: 15px;
  font-weight: 600;
  color: #595959;
  white-space: nowrap;
  flex-shrink: 0;
}

.progress-steps-wrapper {
  flex: 1;
  min-width: 0;
}

.progress-round {
  font-size: 13px;
  color: #1890ff;
  font-weight: 500;
  padding: 4px 12px;
  background: linear-gradient(90deg, #e6f7ff 0%, #bae7ff 100%);
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.research-steps {
  width: 100%;
}

/* 步骤样式优化 */
:deep(.ant-steps-item) {
  cursor: pointer;
  transition: all 0.3s;
}

:deep(.ant-steps-item:hover .ant-steps-item-icon) {
  border-color: #1890ff !important;
  transform: scale(1.1);
}

:deep(.ant-steps-item:hover .ant-steps-item-title) {
  color: #1890ff !important;
}

:deep(.ant-steps-item-title) {
  font-size: 14px !important;
  font-weight: 600 !important;
}

:deep(.ant-steps-item-description) {
  font-size: 12px !important;
  color: #8c8c8c !important;
}

:deep(.ant-steps-item-process .ant-steps-item-icon) {
  background: #1890ff !important;
  border-color: #1890ff !important;
}

:deep(.ant-steps-item-finish .ant-steps-item-icon) {
  background: #52c41a !important;
  border-color: #52c41a !important;
}

:deep(.ant-steps-item-finish .ant-steps-item-icon .ant-steps-icon) {
  color: white !important;
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

/* ========== 2. 对话列表样式 ========== */
.chat-content {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
  padding: 16px 0;
  background: white;
  scrollbar-width: thin;
  scrollbar-color: #bdbdbd white;
}

.chat-content::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}

.chat-content::-webkit-scrollbar-thumb {
  background: #ffffff;
  border-radius: 3px;
}

.chat-content:hover::-webkit-scrollbar-thumb {
  background: #999;
}

.messages-wrapper {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 消息项通用样式 */
.message-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  animation: messageSlideIn 0.3s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* AI 消息样式（左侧蓝色）*/
.message-ai {
  justify-content: flex-start;
}

.avatar-ai {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(102, 166, 255, 0.3);
}

.avatar-ai svg {
  font-size: 20px;
  color: white;
}

/* 选择角色后的头像样式 - 白色背景+蓝色边框 */
.avatar-with-role {
  background: white !important;
  border: 1px solid #667eea !important;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3) !important;
}

/* 角色图标样式 */
.agent-role-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.role-avatar-text {
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.bubble-ai {
  max-width: 70%;
  background: white;
  border-radius: 0 16px 16px 16px;
  padding: 14px 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8f4ff;
}

/* 用户消息样式（右侧紫色）*/
.message-user {
  justify-content: flex-end;
}

.avatar-user {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(110, 0, 255, 1) 0%, rgba(155, 77, 195, 1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(110, 0, 255, 0.3);
  color: white;
  font-size: 20px;
}

.bubble-user {
  max-width: 70%;
  background: white;
  color: #262626;
  border: 1px solid #9c4dc344;
  border-radius: 16px 0 16px 16px;
  padding: 14px 18px;
  box-shadow: 0 2px 12px rgba(110, 0, 255, 0.15);
}

.bubble-content {
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;

  /* 表格样式 */
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 13px;
  }

  :deep(table th),
  :deep(table td) {
    border: 1px solid #e0e0e0;
    padding: 8px 12px;
    text-align: left;
  }

  :deep(table th) {
    background-color: #f5f5f5;
    font-weight: 600;
    color: #333;
  }

  /* 第一列不换行，完整显示 */
  :deep(table td:first-child),
  :deep(table th:first-child) {
    white-space: nowrap;
    min-width: max-content;
    font-weight: 500;
  }

  /* 第二列可以换行 */
  :deep(table td:nth-child(2)),
  :deep(table th:nth-child(2)) {
    word-wrap: break-word;
    word-break: break-word;
  }

  :deep(table tr:hover) {
    background-color: #fafafa;
  }
}

/* Mermaid 图表容器样式 */
.mermaid-container {
  margin: 16px 0;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 600px;
}

.mermaid-container svg {
  max-width: 100%;
  height: auto;
  min-width: 600px; /* 确保左右布局有足够的宽度 */
}

/* 提示框样式（居中圆角矩形）*/
.message-hint {
  justify-content: center;
  padding: 8px 0;
}

.hint-bubble {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(90deg, #fffbe6 0%, #fff7e6 100%);
  border: 1px solid #ffe58f;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(250, 173, 20, 0.15);
  max-width: 100%;
}

.hint-icon {
  font-size: 18px;
  color: #faad14;
}

.hint-text {
  font-size: 13px;
  color: #d46b08;
  font-weight: 500;
  line-height: 1.4;

  :deep(p) {
    margin: 6px 0 6px 0 !important;
    line-height: 1.4;
  }
}

/* 角色选择器样式 */
.message-role-selector {
  justify-content: center;
  width: 100%;
  padding: 20px 0;
}

/* 选择模式样式 */
.selectable {
  cursor: pointer;
  transition: all 0.2s;
}

.selectable:hover {
  background: #f5f5f5;
  border-radius: 8px;
}

.message-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  margin: 0 8px;
  accent-color: #1890ff;
}

/* ========== 3. 输入框样式 ========== */
.chat-input {
  width: 100%;
  padding: 16px 20px;
  background: white;
  border-top: 2px solid #e8e8e8;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

.input-wrapper {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.hint-button {
  background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%);
  border: 1px solid #ffe58f;
}

.hint-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #ffd666 0%, #ffc53d 100%);
  border-color: #faad14;
  transform: scale(1.05);
}

.evidence-button {
  background: linear-gradient(135deg, #e6f4ff 0%, #bae7ff 100%);
  border: 1px solid #91d5ff;
}

.evidence-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #69c0ff 0%, #40a9ff 100%);
  border-color: #1890ff;
  transform: scale(1.05);
}

.summary-button {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border: 1px solid #b7eb8f;
}

.summary-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #95de64 0%, #73d13d 100%);
  border-color: #52c41a;
  transform: scale(1.05);
}

.action-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.bulb-icon {
  font-size: 20px;
  color: #faad14;
  transition: color 0.3s;
}

.hint-button:hover:not(:disabled) .bulb-icon {
  color: #d48806;
}

.evidence-icon {
  font-size: 20px;
  color: #1890ff;
  transition: color 0.3s;
}

.evidence-button:hover:not(:disabled) .evidence-icon {
  color: #096dd9;
}

.summary-icon {
  font-size: 20px;
  color: #52c41a;
  transition: color 0.3s;
}

.summary-button:hover:not(:disabled) .summary-icon {
  color: #389e0d;
}

.message-sender {
  flex: 1;
}

/* 选择模式操作栏 */
.selection-actions {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%);
  border: 1px solid #91d5ff;
  border-radius: 12px;
}

.selection-info {
  font-size: 14px;
  color: #262626;
  font-weight: 500;
}

.selection-count {
  color: #1890ff;
  font-weight: 600;
  font-size: 16px;
}

.selection-buttons {
  display: flex;
  gap: 12px;
}

:deep(.ant-x-sender) {
  width: 100%;
  border-radius: 24px;
  border: 2px solid #d9d9d9;
  transition: all 0.3s;
}

:deep(.ant-x-sender:hover) {
  border-color: #1890ff;
}

:deep(.ant-x-sender:focus-within) {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}


/* ========== 4. 问题分析指标样式 ========== */
.message-footer {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  width: 100%;
}

.question-analysis {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(90deg, #f0f5ff 0%, #e6f4ff 100%);
  border-radius: 8px;
  font-size: 12px;
  border: 1px solid #d9d9d9;
  width: fit-content;
}

.analysis-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.analysis-icon {
  font-size: 14px;
}

.analysis-label {
  font-weight: 600;
  color: #262626;
}

.analysis-bar {
  display: inline-block;
  width: 50px;
  height: 10px;
  background: #e8e8e8;
  border-radius: 5px;
  overflow: hidden;
}

.analysis-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #1890ff 0%, #52c41a 100%);
  border-radius: 5px;
  transition: width 0.5s ease;
}

.analysis-value {
  font-weight: 600;
  color: #1890ff;
  min-width: 20px;
  text-align: right;
}

.analysis-divider {
  color: #d9d9d9;
  margin: 0 4px;
}

.analysis-loading {
  justify-content: center;
  background: #f5f5f5;
  animation: pulse 1.5s ease-in-out infinite;
}

.analysis-loading-text {
  font-size: 12px;
  color: #8c8c8c;
  font-style: italic;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* ========== 5. 响应式调整 ========== */
@media (max-width: 768px) {
  .research-progress-bar {
    padding: 12px 16px;
  }

  .progress-title {
    font-size: 14px;
  }

  .progress-round {
    font-size: 12px;
    padding: 3px 10px;
  }

  .messages-wrapper {
    padding: 0 12px;
  }

  .message-item {
    gap: 8px;
  }

  .avatar-ai,
  .avatar-user {
    width: 36px;
    height: 36px;
  }

  .avatar-ai svg {
    font-size: 18px;
  }

  .avatar-user {
    font-size: 18px;
  }

  .bubble-ai,
  .bubble-user {
    max-width: 75%;
    padding: 12px 14px;
  }

  .bubble-content {
    font-size: 13px;
  }

  .hint-bubble {
    padding: 8px 16px;
    max-width: 85%;
  }

  .hint-icon {
    font-size: 16px;
  }

  .hint-text {
    font-size: 12px;
    p {
      margin: 6px 0 6px 0;    
}
  }

  .chat-input {
    padding: 12px 16px;
  }

  .hint-button {
    width: 36px;
    height: 36px;
  }

  .bulb-icon {
    font-size: 18px;
  }

  .question-analysis {
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 10px;
    font-size: 11px;
  }

  .analysis-bar {
    width: 40px;
    height: 8px;
  }

  .analysis-icon {
    font-size: 12px;
  }

  .analysis-divider {
    display: none;
  }

  :deep(.ant-steps-item-title) {
    font-size: 12px !important;
  }

  :deep(.ant-steps-item-description) {
    font-size: 11px !important;
  }
}
</style>
