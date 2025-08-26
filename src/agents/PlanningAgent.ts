import type { LearningPlan, TeacherPreference, QuestionProgress } from '../types';
import OpenAI from 'openai';

export class PlanningAgent {
  private seedQuestions: string[] = [];
  private teacherPreferences: TeacherPreference | null = null;
  private answers: string[] = [];
  private openai: OpenAI;
  private totalQuestions: number = 3;
  private currentQuestionIndex: number = 0;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  getCurrentProgress(): QuestionProgress {
    return {
      current: this.currentQuestionIndex + 1,
      total: this.totalQuestions,
      isCompleted: this.currentQuestionIndex >= this.totalQuestions
    };
  }

  async generateNextQuestion(): Promise<string | null> {
    if (this.currentQuestionIndex >= this.totalQuestions) {
      return null;
    }

    const question = await this.generateSeedQuestion(this.currentQuestionIndex);
    return question;
  }

  async generateSeedQuestion(currentQuestionIndex: number): Promise<string> {
    const prompt = `作为一个教研助手，我需要向教师提出问题来了解他们的教学情况。
这是第 ${currentQuestionIndex + 1} 个问题，请生成一个开放性的问题。
之前的问题是: ${this.seedQuestions.join(', ')}
之前的回答是: ${this.answers.join(', ')}
请生成一个不同于之前问题的新问题。`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
      });

      const question = response.choices[0]?.message?.content || "您能分享一下您的教学经验吗？";
      this.seedQuestions[currentQuestionIndex] = question;
      return question;
    } catch (error) {
      console.error('Error generating seed question:', error);
      return "您能分享一下您的教学经验吗？";
    }
  }

  recordAnswer(answer: string) {
    this.answers.push(answer);
    this.currentQuestionIndex++;
  }

  canProceedToNext(): boolean {
    return this.currentQuestionIndex < this.totalQuestions;
  }

  async generateLearningPlan(): Promise<LearningPlan | null> {
    if (this.answers.length < this.totalQuestions) {
      return null;
    }

    const prompt = `基于教师的以下回答，生成一个4步的个性化学习计划：
问题1：${this.seedQuestions[0]}
回答1：${this.answers[0]}
问题2：${this.seedQuestions[1]}
回答2：${this.answers[1]}
问题3：${this.seedQuestions[2]}
回答3：${this.answers[2]}

请生成一个包含4个步骤的学习计划，每个步骤包含标题和具体描述。格式如下：
{
  "steps": [
    {
      "title": "步骤标题",
      "description": "步骤描述",
      "completed": false
    },
    ...
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
      });

      const planText = response.choices[0]?.message?.content || "";
      try {
        const plan = JSON.parse(planText);
        return plan;
      } catch (error) {
        console.error('Error parsing learning plan:', error);
        return this.getFallbackPlan();
      }
    } catch (error) {
      console.error('Error generating learning plan:', error);
      return this.getFallbackPlan();
    }
  }

  private getFallbackPlan(): LearningPlan {
    return {
      steps: [
        {
          title: "教学难点分析",
          description: "深入分析您提到的教学挑战",
          completed: false
        },
        {
          title: "教学方法优化",
          description: "针对性提供教学方法改进建议",
          completed: false
        },
        {
          title: "案例学习",
          description: "分享相关的成功教学案例",
          completed: false
        },
        {
          title: "实践应用",
          description: "设计具体的教学实践方案",
          completed: false
        }
      ]
    };
  }

  updatePreferences(preferences: TeacherPreference): void {
    this.teacherPreferences = preferences;
  }
} 