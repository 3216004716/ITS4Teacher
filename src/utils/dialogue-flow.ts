/**
 * 对话流程管理
 */

export enum DialogueStage {
  OPENING = 'opening',           // AI开场白
  FIRST_QUESTION = 'first_question',  // 用户首次提问
  DIAGNOSIS = 'diagnosis',       // AI诊断并建议优化
  REFINED_QUESTION = 'refined_question', // 用户优化后的提问
  ROLE_SELECTION = 'role_selection',     // 角色选择阶段
  MULTI_TURN = 'multi_turn',     // 与专家多轮对话
  EVIDENCE = 'evidence',         // 循证阶段
  SUMMARY = 'summary'            // 总结阶段
}

/**
 * 获取当前阶段的描述
 */
export function getStageDescription(stage: DialogueStage): string {
  const descriptions: Record<DialogueStage, string> = {
    [DialogueStage.OPENING]: '欢迎阶段',
    [DialogueStage.FIRST_QUESTION]: '首次提问',
    [DialogueStage.DIAGNOSIS]: '问题诊断',
    [DialogueStage.REFINED_QUESTION]: '优化提问',
    [DialogueStage.ROLE_SELECTION]: '选择专家',
    [DialogueStage.MULTI_TURN]: '深入对话',
    [DialogueStage.EVIDENCE]: '循证分析',
    [DialogueStage.SUMMARY]: '总结反思'
  };
  return descriptions[stage] || '未知阶段';
}

/**
 * 判断是否应该触发质量分析
 */
export function shouldAnalyzeQuestion(stage: DialogueStage): boolean {
  return [
    DialogueStage.FIRST_QUESTION,
    DialogueStage.REFINED_QUESTION,
    DialogueStage.MULTI_TURN
  ].includes(stage);
}

/**
 * 判断是否应该切换教研步骤
 */
export function shouldSwitchResearchStep(stage: DialogueStage): number | null {
  const stageStepMap: Partial<Record<DialogueStage, number>> = {
    [DialogueStage.OPENING]: 1,          // 目标
    [DialogueStage.REFINED_QUESTION]: 2, // 分析
    [DialogueStage.EVIDENCE]: 3,         // 证据
    [DialogueStage.SUMMARY]: 4           // 总结
  };
  return stageStepMap[stage] || null;
}
