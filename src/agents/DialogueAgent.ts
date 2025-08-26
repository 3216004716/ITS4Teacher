import type { LearningPlan } from '../types';

export class DialogueAgent {
  private currentPlan: LearningPlan | null = null;
  private expertRoles = ["教学专家", "学科专家"];
  private currentExpert: string = "";

  constructor() {}

  setLearningPlan(plan: LearningPlan): void {
    this.currentPlan = plan;
  }

  generateResponse(userInput: string, currentStep: number): string {
    this.currentExpert = this.expertRoles[currentStep % 2];
    
    if (!this.currentPlan) {
      return "请先生成学习计划";
    }

    const currentStepInfo = this.currentPlan.steps[currentStep];
    let response = `[${this.currentExpert}] `;

    switch (currentStep) {
      case 0:
        response += this.generateTeachingAnalysis(userInput);
        break;
      case 1:
        response += this.generateMethodOptimization(userInput);
        break;
      case 2:
        response += this.generateCaseStudy(userInput);
        break;
      case 3:
        response += this.generatePracticalApplication(userInput);
        break;
      default:
        response += `让我们来探讨${currentStepInfo.title}相关的内容...`;
    }

    return response;
  }

  private generateTeachingAnalysis(input: string): string {
    return "让我们深入分析您提到的教学难点，首先我们需要明确问题的具体表现...";
  }

  private generateMethodOptimization(input: string): string {
    return "基于您的教学场景，我建议可以尝试以下教学方法的改进...";
  }

  private generateCaseStudy(input: string): string {
    return "这里有一个与您情况类似的成功案例，我们一起来分析其中的关键点...";
  }

  private generatePracticalApplication(input: string): string {
    return "让我们根据前面的讨论，设计一个具体的教学实践方案...";
  }
} 