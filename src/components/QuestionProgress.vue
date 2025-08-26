<template>
  <div class="question-progress">
    <div class="progress-info">
      <span class="progress-text">{{ isCompleted ? '所有问题已完成' : '正在进行问题收集' }}</span>
      <span class="progress-count">{{ progress.current }}/{{ total }}</span>
    </div>
    <a-progress 
      :percent="progress.percent" 
      :show-info="false"
      :stroke-color="{
        '0%': isCompleted ? '#52c41a' : '#1890ff',
        '100%': isCompleted ? '#95de64' : '#69c0ff'
      }"
      :stroke-width="4"
      :status="isCompleted ? 'success' : 'active'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Progress } from 'ant-design-vue';
import type { QuestionProgress } from '../types';

const props = defineProps<{
  progress: QuestionProgress;
}>();

const { total, isCompleted } = props.progress;

const progressPercent = computed(() => {
  // 计算进度百分比，从0开始
  return (props.progress.current / total) * 100;
});

const getStepLabel = (step: number) => {
  if (step === 1) return 'First';
  if (step === total) return 'Last';
  return 'Second';
};
</script>

<style scoped>
.question-progress {
  width: 100%;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 4px;
  margin: 8px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
}

.progress-count {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
}

:deep(.ant-progress) {
  line-height: 1;
}

:deep(.ant-progress-bg) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style> 