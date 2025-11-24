/**
 * 教研对话系统的各类 Prompt 配置
 */

// 教学策略分类
export enum TeachingStrategy {
  THINKING_STIMULATION = '思维激发策略',  // 关注课堂提问
  TEACHING_INTERACTION = '授导互动策略',  // 关注师生互动
  TECHNOLOGY_INTEGRATION = '技术融合策略' // 关注技术应用
}

// 实践性知识分类
export enum PracticalKnowledge {
  DECLARATIVE = '陈述性知识',    // 是什么
  PROCEDURAL = '程序性知识',     // 怎么做
  EXPLANATORY = '解释性知识',    // 为什么
  CONDITIONAL = '条件性知识',    // 何时何地用
  METACOGNITIVE = '元认知知识'   // 对自己认知的认知
}

// 提示类型（对话引导方向）
export enum HintType {
  PHENOMENON = '现象描述',      // 这个片段发生了什么
  DETAIL_ANALYSIS = '细节分析', // 它好/不好在哪
  EVIDENCE = '证据支持',        // 有什么证据链条支持
  MEANING = '意义阐释',         // 它为什么好/不好
  ESSENCE = '本质规律',         // 发现了什么教学规律
  FAILURE_ANALYSIS = '失效分析', // 该规律在何条件下可能失效、为何失效
  IMPROVEMENT_DETAIL = '改进细节', // 哪方面可以改进
  IMPROVEMENT_VALUE = '改进价值',  // 为何要改进
  IMPROVEMENT_EVIDENCE = '改进依据', // 改进依据是什么
  POTENTIAL_RESULT = '潜在结果'    // 改进后将发生什么
}

/**
 * 系统基础提示词
 */
export const SYSTEM_BASE_PROMPT = `你是一个专业的教研助手，专注于帮助教师提升课堂提问质量和教学策略。

核心原则：
1. 回复简洁精炼，每次回复控制在150字以内
2. 关注课堂提问的精准度、高阶思维培养和深度
3. 提供具体、可操作的教学建议
4. 结合教育理论和实践经验
5. 鼓励教师反思和改进

请给出专业、友好、简短的回复。`;

/**
 * 问题分类分析的 Prompt
 */
export const QUESTION_CLASSIFICATION_PROMPT = `请分析以下教师提出的问题，从两个维度进行分类：

**维度1：教学策略**
- 思维激发策略（关注课堂提问的效果）
- 授导互动策略（关注师生多种类型的互动）
- 技术融合策略（关注技术应用）

**维度2：实践性知识**
- 陈述性知识（是什么）
- 程序性知识（怎么做）
- 解释性知识（为什么）
- 条件性知识（何时何地用）
- 元认知知识（对自己认知的认知）

请返回JSON格式：
{
  "teachingStrategy": "策略名称",
  "practicalKnowledge": "知识类型",
  "reasoning": "分类理由（50字以内）",
  "confidence": 0.85
}

教师问题：`;

/**
 * 下一步提示类型判断的 Prompt
 */
export const NEXT_HINT_TYPE_PROMPT = `根据当前对话内容，判断应该引导教师思考的下一个方向。

可选的引导方向：
1. 现象描述 - 这个片段发生了什么？
2. 细节分析 - 它好/不好在哪？
3. 证据支持 - 有什么证据链条支持？
4. 意义阐释 - 它为什么好/不好？
5. 本质规律 - 发现了什么教学规律？
6. 失效分析 - 该教学规律在何条件下可能失效、为何会失效？
7. 改进细节 - 哪方面可以改进？
8. 改进价值 - 为何要改进？
9. 改进依据 - 改进依据是什么？
10. 潜在结果 - 改进后将发生什么？

请返回JSON格式：
{
  "hintType": "引导方向名称",
  "reasoning": "选择理由（30字以内）"
}

当前对话：`;

/**
 * 根据提示类型生成引导性问题
 */
export function generateHintQuestion(hintType: HintType): string {
  const hintQuestions: Record<HintType, string> = {
    [HintType.PHENOMENON]: '您能详细描述一下这个教学片段中发生了什么吗？',
    [HintType.DETAIL_ANALYSIS]: '您觉得这个环节的优点或不足具体体现在哪里？',
    [HintType.EVIDENCE]: '您有什么具体的数据或学生表现可以支持这个判断吗？',
    [HintType.MEANING]: '您认为为什么会出现这样的效果？背后的原因是什么？',
    [HintType.ESSENCE]: '从这个案例中，您发现了什么教学规律或原则？',
    [HintType.FAILURE_ANALYSIS]: '您觉得这个规律在什么情况下可能不适用？为什么？',
    [HintType.IMPROVEMENT_DETAIL]: '您觉得哪些方面可以进一步改进？',
    [HintType.IMPROVEMENT_VALUE]: '为什么需要进行这样的改进？它能带来什么价值？',
    [HintType.IMPROVEMENT_EVIDENCE]: '您的改进方案有什么理论或实践依据？',
    [HintType.POTENTIAL_RESULT]: '如果实施这个改进，您预期会发生什么变化？'
  };

  return hintQuestions[hintType] || '请继续分享您的想法。';
}

/**
 * 根据问题分类生成针对性回复的 Prompt
 */
export function generateResponsePrompt(
  teachingStrategy: TeachingStrategy,
  practicalKnowledge: PracticalKnowledge,
  userQuestion: string
): string {
  return `${SYSTEM_BASE_PROMPT}

**问题分类**：
- 教学策略：${teachingStrategy}
- 实践性知识：${practicalKnowledge}

**教师问题**：${userQuestion}

请基于这个分类，给出简洁专业的回复（150字以内）：`;
}

/**
 * 简短回复强化提示词
 */
export const CONCISE_RESPONSE_REMINDER = `
注意：请将回复控制在150字以内，突出重点，避免冗长。`;
