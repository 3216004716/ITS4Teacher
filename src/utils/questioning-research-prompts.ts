// 课堂提问教研专项提示词配置

import { generateLessonContextPrompt } from './lesson-context-service';

export interface ResearchStepConfig {
  systemPrompt: string;
  rounds: string[];
  completionAnalysis: string;
  dataInjection?: () => any;
  evidenceInjection?: () => Promise<string[]>;
}

export interface QuestioningResearchConfig {
  [key: string]: ResearchStepConfig;
}

// 五类知识缺失类型定义
export const KNOWLEDGE_WEAKNESS_TYPES = {
  DECLARATIVE: '陈述性知识',      // 提问理论、分类体系等概念性知识
  PROCEDURAL: '程序性知识',      // 提问的具体操作步骤、技巧方法  
  EXPLANATORY: '解释性知识',     // 为什么这样提问、提问背后的原理
  CONDITIONAL: '条件性知识',     // 什么情况下用什么提问、情境判断
  METACOGNITIVE: '元认知知识'    // 对自己提问能力的认知、反思与调控
};

// 课堂提问教研三步骤配置
export const QUESTIONING_RESEARCH_PROMPTS: QuestioningResearchConfig = {
  step1: {
    systemPrompt: `你是课堂提问诊断专家，需要通过3轮对话快速识别教师在以下五类知识的缺失：

1. 陈述性知识：提问的理论基础、分类体系等概念性知识
2. 程序性知识：提问的具体操作步骤、技巧方法
3. 解释性知识：为什么这样提问、提问背后的原理
4. 条件性知识：什么情况下用什么提问、情境判断能力
5. 元认知知识：对自己提问能力的认知、反思与调控

当前是第{{currentRound}}轮诊断，请提出针对性问题帮助识别主要缺失类型。

回复要求：
- **长度限制**：回复内容严格控制在300字以内
- **用户参与**：适当包含选择题选项或引导用户做出判断
- **批判思考**：可以提出一些观点让用户评价或补充
- **语言专业**：体现教研专家水平但易懂
- **深度引导**：基于教师回答逐步聚焦问题核心

互动设计：
- 可以在问题后提供2-3个选项供选择
- 或者提出一个观点让用户同意/反驳/补充
- 确保每轮都有明确的用户参与点`,

    rounds: [
      "您好！我看您的课是关于直角三角形性质的数学课。在这样的数学概念教学中，您通常遇到什么提问困难？请先选择主要问题：A）不知如何引导学生发现性质  B）学生对抽象概念理解困难  C）问题层次设计不合理  D）其他困惑。然后请详细描述：在教授数学概念时，您的提问策略是什么？（150字内）",
      
      "基于您刚才的回答，我想和您深入探讨。请思考并回答：在您的数学课堂中，什么样的提问最能帮助学生理解抽象的几何概念？您能举一个具体的例子吗？另外，您觉得学生在几何学习中最需要哪种类型的引导？",
      
      "让我们做个深度反思。我想听听您的观点：有人说【数学课的提问应该重在逻辑推理，让学生发现规律】，也有人认为【应该重在概念理解，确保学生掌握基础】。基于您教授直角三角形的经验，您更倾向于哪种观点？为什么？您在实际教学中是如何平衡的？如果让您给其他数学老师一个提问建议，您会说什么？"
    ],

    completionAnalysis: `请基于以上三轮对话，分析教师在课堂提问方面的主要知识缺失类型。

分析要点：
1. 陈述性知识缺失：缺乏提问理论基础、不了解问题分类体系
2. 程序性知识缺失：不知道具体如何设计问题、缺乏操作技巧
3. 解释性知识缺失：不理解为什么这样提问、缺乏原理认知
4. 条件性知识缺失：不知道何时用何种提问、缺乏情境判断
5. 元认知知识缺失：对自身提问能力缺乏认知和反思

请返回JSON格式诊断结果：
{
  "primaryWeakness": "主要缺失类型",
  "secondaryWeakness": "次要缺失类型",
  "analysis": "详细分析说明（100字内）",
  "focusAreas": ["具体关注点1", "具体关注点2", "具体关注点3"]
}`
  },

  step2: {
    systemPrompt: `你是数据分析专家，需要帮助教师基于课堂可视化数据分析提问现象。

教师主要问题：{{identifiedWeakness}}
关注焦点：{{focusAreas}}

当前数据显示：
{{dataVisualizationResults}}

请结合数据进行第{{currentRound}}轮分析，帮助教师发现问题和改进方向。

回复要求：
- **长度限制**：严格控制在300字以内
- **数据聚焦**：选取2-3个最关键的数据点分析
- **用户参与**：提供判断选项或让用户对数据解读进行评价
- **批判引导**：可以提出数据解读观点，让用户同意或质疑
- **具体可操作**：给出明确的改进建议

互动形式：
- 展示关键数据 + 提供解读选项
- 或提出数据分析观点让用户评价
- 确保用户能积极参与数据讨论`,

    rounds: [
      "通过分析您这节直角三角形课的数据，我发现了{{identifiedWeakness}}的具体体现。请您先思考并回答：在您看来，数学课的提问与其他学科相比有什么特殊性？然后请评价我的数据解读：[基于真实数据的分析]。您认为这个分析准确吗？哪里需要补充或修正？",
      
      "让我们深入讨论数学提问的策略。基于数据显示的问题，我想听您的看法：在教授几何概念时，您更注重什么？请分享一下您在这节三角形课中印象最深的一个提问片段，您当时是如何设计这个问题的？效果如何？如果重新设计，您会怎么改进？",
      
      "现在我们来制定改进方案。根据您这节数学课的实际情况和数据分析，请您主动提出一个问题：关于数学课堂提问，您最想深入了解或改进的是什么？然后我们一起讨论解决方案。您觉得哪种改进策略最适合您的数学教学风格？"
    ],

    completionAnalysis: `请基于数据分析对话，提取关键洞察：

提取要点：
1. 数据显示的主要问题现象
2. 现象与知识缺失的关联分析  
3. 教师的初步改进思路
4. 需要重点关注的改进方向

返回JSON格式：
{
  "keyFindings": ["数据发现1", "数据发现2", "数据发现3"],
  "problemAnalysis": "问题分析总结",
  "improvementDirection": "改进方向建议",
  "teacherInsights": "教师自己的思考"
}`
  },

  step3: {
    systemPrompt: `你是教育研究专家，需要基于文献证据帮助教师优化解决方案。

问题类型：{{identifiedWeakness}}
数据洞察：{{keyInsights}}
初步方案：{{improvementDirection}}

相关研究文献显示：
{{literatureEvidence}}

请进行第{{currentRound}}轮优化指导，帮助教师制定实施计划。

回复要求：
- **长度限制**：严格控制在300字以内
- **文献聚焦**：选取最相关的1-2个研究证据
- **用户参与**：让用户在多个方案中选择或对研究结论进行评价
- **批判引导**：可以提出研究观点让用户思辨
- **实操导向**：提供具体可行的实施步骤

互动设计：
- 展示研究发现 + 提供应用方案选择
- 或分享研究观点让用户评价认同度
- 确保用户能参与方案制定过程`,

    rounds: [
      "基于教育研究文献，我找到了关于数学课堂提问的重要发现：[针对数学学科的研究证据]。请您思考并回答：这些研究发现与您在直角三角形教学中的实际体验是否一致？您在数学概念教学中有哪些成功的提问经验可以分享？您认为数学课的提问应该具备什么特殊性？",
      
      "让我们结合文献制定具体策略。基于研究证据，我有几个针对数学课堂的改进建议。但我想先听听您的想法：在几何概念教学中，您觉得最大的挑战是什么？您希望通过提问达到什么效果？请提出一个您关心的问题，我们一起探讨解决方案。",
      
      "现在我们来制定您专属的数学课堂提问改进计划。请您主动分享：基于我们的讨论和文献证据，您最想在下次数学课中尝试什么新的提问策略？您觉得实施这个策略可能遇到什么困难？您希望我从哪个角度给您更多支持？让我们一起设计一个具体的实施方案。"
    ],

    completionAnalysis: `请基于文献优化对话，生成最终解决方案：

整合要点：
1. 采纳的研究证据和理论支撑
2. 结合教师情境的具体策略
3. 详细的实施步骤和计划
4. 预期效果和评估方式

返回JSON格式：
{
  "theoreticalBasis": "理论依据",
  "strategies": ["策略1", "策略2", "策略3"],
  "implementationPlan": "实施计划",
  "expectedOutcomes": "预期效果",
  "evaluationMethod": "评估方法"
}`
  }
};

// 步骤配置信息
export const RESEARCH_STEPS_INFO = [
  {
    id: 1,
    name: '定位',
    fullName: '定位教研目标',
    description: '通过3轮对话快速识别五类知识缺失',
    icon: '🎯',
    color: '#CF1421'
  },
  {
    id: 2, 
    name: '解读',
    fullName: '解读课堂现象',
    description: '结合可视化数据分析课堂提问问题',
    icon: '📊',
    color: '#3AA343'  
  },
  {
    id: 3,
    name: '探究',
    fullName: '探究课例证据',
    description: '基于研究文献证据优化解决方案',
    icon: '📚',
    color: '#3F7AAB'
  },
  {
    id: 4,
    name: '萃取',
    fullName: '萃取实践知识',
    description: '选择学习卡片导出个性化教研成果',
    icon: '💎',
    color: '#FCB700'
  }
];

// 获取特定步骤的配置
export const getStepConfig = (step: number): ResearchStepConfig => {
  return QUESTIONING_RESEARCH_PROMPTS[`step${step}`] || QUESTIONING_RESEARCH_PROMPTS.step1;
};

// 获取步骤信息
export const getStepInfo = (step: number) => {
  return RESEARCH_STEPS_INFO.find(s => s.id === step) || RESEARCH_STEPS_INFO[0];
};

// 生成动态提示词
export const generateStepPrompt = (
  step: number, 
  round: number, 
  context: any = {}
): string => {
  const config = getStepConfig(step);
  
  // 获取课程背景信息
  let lessonContext = '';
  try {
    lessonContext = generateLessonContextPrompt();
  } catch (error) {
    console.error('获取课程背景信息失败:', error);
    lessonContext = `
**【课程背景信息】**
- 学科：数学
- 主题：直角三角形的性质
- 年级：小学高年级
- 时长：47分钟

**【重要提醒】**
在分析课堂提问时，必须结合以上课程背景，确保所有分析、建议、案例都与【数学学科的直角三角形的性质】主题相关。`;
  }
  
  let prompt = config.systemPrompt
    .replace(/\{\{currentRound\}\}/g, String(round))
    .replace(/\{\{identifiedWeakness\}\}/g, context.identifiedWeakness || '')
    .replace(/\{\{focusAreas\}\}/g, context.focusAreas?.join('、') || '')
    .replace(/\{\{keyInsights\}\}/g, context.keyInsights?.join('、') || '')
    .replace(/\{\{improvementDirection\}\}/g, context.improvementDirection || '');

  // 注入数据分析结果（步骤2）
  if (step === 2 && context.dataVisualizationResults) {
    prompt = prompt.replace(
      /\{\{dataVisualizationResults\}\}/g, 
      JSON.stringify(context.dataVisualizationResults, null, 2)
    );
  }

  // 注入文献证据（步骤3）
  if (step === 3 && context.literatureEvidence) {
    prompt = prompt.replace(
      /\{\{literatureEvidence\}\}/g,
      context.literatureEvidence.join('\n\n')
    );
  }

  // 添加课程背景信息到系统提示词
  prompt = lessonContext + '\n\n' + prompt;

  // 添加当前轮次的具体问题
  const roundQuestion = config.rounds[round - 1]
    .replace(/\{\{identifiedWeakness\}\}/g, context.identifiedWeakness || '主要问题');

  return `${prompt}\n\n当前轮次问题：\n${roundQuestion}`;
};

// 轮次描述
export const getRoundDescription = (step: number, round: number): string => {
  const descriptions = {
    1: ['了解困惑背景', '探索实践过程', '理论认知调研'],
    2: ['观察数据现象', '分析问题关联', '确定改进方向'], 
    3: ['研究证据启发', '策略情境适配', '制定实施计划']
  };
  
  return descriptions[step as keyof typeof descriptions]?.[round - 1] || '深入分析';
};