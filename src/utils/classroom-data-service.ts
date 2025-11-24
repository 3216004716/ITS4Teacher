// 课堂数据分析服务
// 用于分析课堂对话数据并生成效能分析报告

interface DialogueSegment {
  paragraphNum: number;
  sentenceContent: string;
  beginTime: number;
  endTime: number;
  role: string;
  roleName: string;
}

interface ClassroomData {
  length: number;
  videoDuration: number;
  fullText: DialogueSegment[];
}

interface ClassroomMetrics {
  totalDuration: number; // 总时长（秒）
  teacherTalkTime: number; // 教师讲话时长（秒）
  studentTalkTime: number; // 学生讲话时长（秒）
  teacherTalkRatio: number; // 教师讲话占比
  studentTalkRatio: number; // 学生讲话占比
  teacherQuestionCount: number; // 教师提问次数
  studentQuestionCount: number; // 学生提问次数
  totalInteractions: number; // 总互动次数
  averageResponseTime: number; // 平均响应时间（秒）
  studentParticipationRate: number; // 学生参与率
  dialogueTurnCount: number; // 对话轮次数
}

interface EfficiencyAnalysis {
  type: '生成型课堂' | '传授型课堂' | '失焦型课堂' | '满灌型课堂';
  label: '高效学' | '高效教' | '低效学' | '低效教';
  confidence: number; // 置信度 0-1
  metrics: ClassroomMetrics;
  reasoning: string; // 判断理由
  keyIndicators: string[]; // 关键指标
}

/**
 * 加载课堂数据
 */
export async function loadClassroomData(filePath: string = '/workspaces/ITS4Teacher/src/data/triangle1.json'): Promise<ClassroomData> {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as ClassroomData;
  } catch (error) {
    console.error('加载课堂数据失败:', error);
    throw new Error('无法加载课堂数据文件');
  }
}

/**
 * 计算课堂指标
 */
export function calculateClassroomMetrics(data: ClassroomData): ClassroomMetrics {
  const { videoDuration, fullText } = data;

  let teacherTalkTime = 0;
  let studentTalkTime = 0;
  let teacherQuestionCount = 0;
  let studentQuestionCount = 0;
  let dialogueTurnCount = 0;

  // 用于计算响应时间
  let responseTimes: number[] = [];
  let lastTeacherQuestionTime: number | null = null;

  // 统计学生发言的唯一编号（用于计算参与率）
  const studentRoles = new Set<string>();

  // 遍历所有对话片段
  fullText.forEach((segment, index) => {
    const duration = segment.endTime - segment.beginTime;
    const isTeacher = segment.role === '1' || segment.roleName === '老师';

    // 统计讲话时长
    if (isTeacher) {
      teacherTalkTime += duration;
    } else {
      studentTalkTime += duration;
      studentRoles.add(segment.role);
    }

    // 检测提问（包含问号或疑问词）
    const isQuestion = segment.sentenceContent.includes('?') ||
                       segment.sentenceContent.includes('?') ||
                       /为什么|怎么|如何|什么|哪|吗|呢/.test(segment.sentenceContent);

    if (isQuestion) {
      if (isTeacher) {
        teacherQuestionCount++;
        lastTeacherQuestionTime = segment.endTime;
      } else {
        studentQuestionCount++;
      }
    }

    // 计算响应时间（学生回答教师提问的时间间隔）
    if (!isTeacher && lastTeacherQuestionTime !== null) {
      const responseTime = segment.beginTime - lastTeacherQuestionTime;
      if (responseTime > 0 && responseTime < 30) { // 合理的响应时间范围
        responseTimes.push(responseTime);
      }
      lastTeacherQuestionTime = null;
    }

    // 统计对话轮次（角色切换）
    if (index > 0 && fullText[index - 1].role !== segment.role) {
      dialogueTurnCount++;
    }
  });

  const totalInteractions = teacherQuestionCount + studentQuestionCount;
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  // 假设班级有40名学生（可根据实际情况调整）
  const estimatedClassSize = 40;
  const studentParticipationRate = (studentRoles.size / estimatedClassSize) * 100;

  return {
    totalDuration: videoDuration,
    teacherTalkTime,
    studentTalkTime,
    teacherTalkRatio: (teacherTalkTime / videoDuration) * 100,
    studentTalkRatio: (studentTalkTime / videoDuration) * 100,
    teacherQuestionCount,
    studentQuestionCount,
    totalInteractions,
    averageResponseTime,
    studentParticipationRate,
    dialogueTurnCount
  };
}

/**
 * 分析课堂效能类型
 */
export function analyzeClassroomEfficiency(metrics: ClassroomMetrics): EfficiencyAnalysis {
  const {
    teacherTalkRatio,
    studentTalkRatio,
    teacherQuestionCount,
    studentQuestionCount,
    studentParticipationRate,
    dialogueTurnCount,
    averageResponseTime
  } = metrics;

  // 计算各维度得分
  const studentEngagementScore = (studentTalkRatio / 50) * 0.3 +
                                 (studentParticipationRate / 100) * 0.4 +
                                 (studentQuestionCount / 10) * 0.3;

  const teachingEffectivenessScore = (teacherQuestionCount / 30) * 0.4 +
                                     (dialogueTurnCount / 100) * 0.3 +
                                     (teacherTalkRatio < 70 ? 1 : 0.5) * 0.3;

  // 判断课堂类型
  let type: EfficiencyAnalysis['type'];
  let label: EfficiencyAnalysis['label'];
  let reasoning: string;
  let keyIndicators: string[];
  let confidence: number;

  // 生成型课堂：学生参与度高，互动质量高
  if (studentEngagementScore > 0.7 && dialogueTurnCount > 80 && studentQuestionCount > 5) {
    type = '生成型课堂';
    label = '高效学';
    confidence = studentEngagementScore;
    reasoning = `学生深度参与、主动建构知识。学生讲话占比${studentTalkRatio.toFixed(1)}%，参与率${studentParticipationRate.toFixed(1)}%，学生提问${studentQuestionCount}次，对话轮次${dialogueTurnCount}次，体现出高度的思维活跃性。`;
    keyIndicators = [
      `学生讲话占比: ${studentTalkRatio.toFixed(1)}%（较高）`,
      `学生参与率: ${studentParticipationRate.toFixed(1)}%`,
      `学生提问次数: ${studentQuestionCount}次（主动探究）`,
      `对话轮次: ${dialogueTurnCount}次（互动频繁）`
    ];
  }
  // 传授型课堂：教师讲授为主，但组织有效
  else if (teacherTalkRatio > 60 && teacherQuestionCount > 15 && teacherTalkRatio < 85) {
    type = '传授型课堂';
    label = '高效教';
    confidence = teachingEffectivenessScore;
    reasoning = `教师讲授清晰、知识传递有效。教师讲话占比${teacherTalkRatio.toFixed(1)}%，提问${teacherQuestionCount}次，对话轮次${dialogueTurnCount}次，教师引导得当，学生接受良好。`;
    keyIndicators = [
      `教师讲话占比: ${teacherTalkRatio.toFixed(1)}%（讲授为主）`,
      `教师提问次数: ${teacherQuestionCount}次（引导充分）`,
      `对话轮次: ${dialogueTurnCount}次（互动适中）`,
      `学生参与率: ${studentParticipationRate.toFixed(1)}%（接受良好）`
    ];
  }
  // 失焦型课堂：学生参与度低，互动质量差
  else if (studentEngagementScore < 0.4 && studentQuestionCount < 3) {
    type = '失焦型课堂';
    label = '低效学';
    confidence = 1 - studentEngagementScore;
    reasoning = `学生参与度低、注意力分散。学生讲话占比仅${studentTalkRatio.toFixed(1)}%，参与率${studentParticipationRate.toFixed(1)}%，学生提问仅${studentQuestionCount}次，互动流于形式。`;
    keyIndicators = [
      `学生讲话占比: ${studentTalkRatio.toFixed(1)}%（极低）`,
      `学生参与率: ${studentParticipationRate.toFixed(1)}%（被动）`,
      `学生提问次数: ${studentQuestionCount}次（缺乏主动性）`,
      `对话轮次: ${dialogueTurnCount}次（互动不足）`
    ];
  }
  // 满灌型课堂：教师讲话过多，学生缺乏思考时间
  else {
    type = '满灌型课堂';
    label = '低效教';
    confidence = teacherTalkRatio / 100;
    reasoning = `教师满堂灌、学生被动接受。教师讲话占比高达${teacherTalkRatio.toFixed(1)}%，学生讲话仅${studentTalkRatio.toFixed(1)}%，平均响应时间${averageResponseTime.toFixed(1)}秒，学生缺乏充分思考时间。`;
    keyIndicators = [
      `教师讲话占比: ${teacherTalkRatio.toFixed(1)}%（过高）`,
      `学生讲话占比: ${studentTalkRatio.toFixed(1)}%（过低）`,
      `平均响应时间: ${averageResponseTime.toFixed(1)}秒（思考不足）`,
      `对话轮次: ${dialogueTurnCount}次（互动机会少）`
    ];
  }

  return {
    type,
    label,
    confidence,
    metrics,
    reasoning,
    keyIndicators
  };
}

/**
 * 完整的课堂效能分析流程
 */
export async function performClassroomAnalysis(filePath?: string): Promise<EfficiencyAnalysis> {
  const data = await loadClassroomData(filePath);
  const metrics = calculateClassroomMetrics(data);
  const analysis = analyzeClassroomEfficiency(metrics);
  return analysis;
}

/**
 * 格式化分析结果为可读文本
 */
export function formatAnalysisReport(analysis: EfficiencyAnalysis): string {
  const { type, label, metrics, reasoning, keyIndicators } = analysis;

  return `
📊 **课堂效能分析结果**

基于课堂数据分析，这节课呈现出【${type}（${label}）】的特征。

**关键数据指标：**
${keyIndicators.map(indicator => `- ${indicator}`).join('\n')}

**判断依据：**
${reasoning}

**详细指标：**
- 课程总时长: ${Math.floor(metrics.totalDuration / 60)}分${metrics.totalDuration % 60}秒
- 教师讲话时长: ${Math.floor(metrics.teacherTalkTime / 60)}分${metrics.teacherTalkTime % 60}秒 (${metrics.teacherTalkRatio.toFixed(1)}%)
- 学生讲话时长: ${Math.floor(metrics.studentTalkTime / 60)}分${metrics.studentTalkTime % 60}秒 (${metrics.studentTalkRatio.toFixed(1)}%)
- 教师提问次数: ${metrics.teacherQuestionCount}次
- 学生提问次数: ${metrics.studentQuestionCount}次
- 总对话轮次: ${metrics.dialogueTurnCount}次
- 学生参与率: ${metrics.studentParticipationRate.toFixed(1)}%
- 平均响应时间: ${metrics.averageResponseTime.toFixed(1)}秒
  `.trim();
}
