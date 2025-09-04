<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { Modal, Card, Button, Checkbox, Radio, message, Typography, Divider, Tag } from 'ant-design-vue';
import { DownloadOutlined, FileTextOutlined, FilePdfOutlined, FileWordOutlined } from '@ant-design/icons-vue';
import { useStore } from 'vuex';
import { key } from '../store';
import {
  CHAT_VUEX_NAMESPACE,
  GET_RESEARCH_STATE,
  RESET_RESEARCH_STATE,
  SET_CHAT_STEP,
  ADD_CHAT_MESSAGE,
  ChatMessageItem
} from '../store/modules/chat';
import {
  DISPLAY_ROLE_AI
} from '../utils/const';

// Props和Emits定义
const props = defineProps<{
  visible: boolean;
  availableCards: Array<{
    id: number;
    title: string;
    type: string;
    importance: string;
    content: string;
  }>;
}>();

const emit = defineEmits<{
  close: [];
}>();

const store = useStore(key);

// 教研状态
const researchState = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_RESEARCH_STATE]);

// 组件状态
const selectedCards = ref<number[]>([]);
const exportFormat = ref<'pdf' | 'word' | 'markdown'>('pdf');
const isExporting = ref(false);

// 教研总结数据
const researchSummary = computed(() => ({
  weakness: researchState.value.identifiedWeakness,
  insights: researchState.value.keyInsights,
  solution: researchState.value.finalSolution,
  literatureEvidence: researchState.value.literatureEvidence,
  stepSummaries: researchState.value.stepSummaries
}));

// 格式选项
const formatOptions = [
  { value: 'pdf', label: 'PDF报告', icon: FilePdfOutlined, description: '专业格式，适合打印和分享' },
  { value: 'word', label: 'Word文档', icon: FileWordOutlined, description: '可编辑格式，便于后续修改' },
  { value: 'markdown', label: 'Markdown文件', icon: FileTextOutlined, description: '纯文本格式，轻量便携' }
];

// 卡片类型颜色映射
const typeColors = {
  '陈述性知识': '#1890ff',
  '程序性知识': '#52c41a', 
  '解释性知识': '#faad14',
  '条件性知识': '#f5222d',
  '元认知知识': '#722ed1'
};

// 重要性颜色映射
const importanceColors = {
  '高': '#f5222d',
  '中': '#faad14', 
  '低': '#52c41a'
};

// 切换卡片选择状态
const toggleCardSelection = (cardId: number) => {
  const index = selectedCards.value.indexOf(cardId);
  if (index > -1) {
    selectedCards.value.splice(index, 1);
  } else {
    selectedCards.value.push(cardId);
  }
};

// 全选/取消全选
const selectAll = () => {
  if (selectedCards.value.length === props.availableCards.length) {
    selectedCards.value = [];
  } else {
    selectedCards.value = props.availableCards.map(card => card.id);
  }
};

// 按类型筛选选择
const selectByType = (type: string) => {
  const typeCardIds = props.availableCards
    .filter(card => card.type === type)
    .map(card => card.id);
  
  const allSelected = typeCardIds.every(id => selectedCards.value.includes(id));
  
  if (allSelected) {
    // 取消选择该类型的所有卡片
    selectedCards.value = selectedCards.value.filter(id => !typeCardIds.includes(id));
  } else {
    // 选择该类型的所有卡片
    const newSelections = typeCardIds.filter(id => !selectedCards.value.includes(id));
    selectedCards.value = [...selectedCards.value, ...newSelections];
  }
};

// 生成导出内容
const generateExportContent = () => {
  const selectedCardData = props.availableCards.filter(card => 
    selectedCards.value.includes(card.id)
  );

  const content = {
    title: '课堂提问专项教研报告',
    timestamp: new Date().toLocaleString('zh-CN'),
    summary: researchSummary.value,
    selectedCards: selectedCardData,
    fullProcess: {
      step1: '定位教研目标',
      step2: '解读课堂现象',
      step3: '探究课例证据',
      step4: '萃取实践知识'
    }
  };

  return content;
};

// 模拟导出功能
const exportToPDF = async (content: any) => {
  // 这里应该调用真实的PDF导出服务
  console.log('导出PDF:', content);
  await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟导出耗时
};

const exportToWord = async (content: any) => {
  // 这里应该调用真实的Word导出服务
  console.log('导出Word:', content);
  await new Promise(resolve => setTimeout(resolve, 1500));
};

const exportToMarkdown = async (content: any) => {
  // 这里应该调用真实的Markdown导出服务
  const markdown = `# ${content.title}
  
**生成时间**: ${content.timestamp}

## 教研总结

### 问题诊断
- **识别问题**: ${content.summary.weakness}

### 关键洞察
${content.summary.insights.map((insight: string, index: number) => `${index + 1}. ${insight}`).join('\n')}

### 解决方案
${content.summary.solution}

### 文献支持
${content.summary.literatureEvidence.map((evidence: string, index: number) => `${index + 1}. ${evidence}`).join('\n')}

## 学习卡片

${content.selectedCards.map((card: any) => `### ${card.title}
**类型**: ${card.type} | **重要性**: ${card.importance}

${card.content}
`).join('\n')}

---
*本报告由课堂提问专项教研系统生成*`;

  console.log('导出Markdown:', markdown);
  
  // 创建并下载文件
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `课堂提问教研报告_${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
};

// 处理导出
const handleExport = async () => {
  if (selectedCards.value.length === 0) {
    message.warning('请至少选择一张学习卡片');
    return;
  }

  isExporting.value = true;

  try {
    const content = generateExportContent();
    
    switch (exportFormat.value) {
      case 'pdf':
        await exportToPDF(content);
        message.success('PDF报告导出成功！');
        break;
      case 'word':
        await exportToWord(content);
        message.success('Word文档导出成功！');
        break;
      case 'markdown':
        await exportToMarkdown(content);
        message.success('Markdown文件导出成功！');
        break;
    }

    // 完成教研周期
    completeResearchCycle();
  } catch (error) {
    console.error('导出失败:', error);
    message.error('导出失败，请重试');
  } finally {
    isExporting.value = false;
  }
};

// 完成教研周期
const completeResearchCycle = () => {
  // 添加完成消息
  store.commit(CHAT_VUEX_NAMESPACE + ADD_CHAT_MESSAGE, {
    message: `🎉 恭喜！您已完成本轮课堂提问专项教研。\n\n✅ 诊断了${researchSummary.value.weakness}问题\n✅ 分析了${researchSummary.value.insights.length}个关键洞察\n✅ 制定了针对性解决方案\n✅ 萃取了${selectedCards.value.length}张学习卡片\n\n您可以随时开始新的教研旅程！`,
    status: DISPLAY_ROLE_AI
  });

  // 重置教研状态
  store.commit(CHAT_VUEX_NAMESPACE + RESET_RESEARCH_STATE);
  store.commit(CHAT_VUEX_NAMESPACE + SET_CHAT_STEP, 1);

  // 关闭弹窗
  emit('close');
  
  message.success('本轮教研完成！系统已重置，可开始新的教研。', 3);
};

// 处理关闭
const handleClose = () => {
  emit('close');
};

// 统计信息
const selectedCardsInfo = computed(() => {
  const byType = selectedCards.value.reduce((acc, cardId) => {
    const card = props.availableCards.find(c => c.id === cardId);
    if (card) {
      acc[card.type] = (acc[card.type] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    total: selectedCards.value.length,
    byType
  };
});
</script>

<template>
  <Modal
    :open="visible"
    title="🎯 教研成果萃取与导出"
    width="1000px"
    :maskClosable="false"
    @cancel="handleClose"
    :footer="null"
    :destroyOnClose="false"
  >
    <div class="export-modal-content">
      <!-- 教研总结区域 -->
      <Card title="📊 本次教研总结" size="small" class="summary-card">
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">问题诊断</div>
            <div class="summary-value primary">
              <Tag :color="typeColors[researchSummary.weakness] || 'blue'">
                {{ researchSummary.weakness }}
              </Tag>
            </div>
          </div>
          
          <div class="summary-item" v-if="researchSummary.insights.length > 0">
            <div class="summary-label">关键洞察</div>
            <div class="summary-value">
              <ul class="insights-list">
                <li v-for="insight in researchSummary.insights.slice(0, 3)" :key="insight">
                  {{ insight }}
                </li>
              </ul>
            </div>
          </div>
          
          <div class="summary-item" v-if="researchSummary.solution">
            <div class="summary-label">解决方案</div>
            <div class="summary-value">
              <Typography.Paragraph :ellipsis="{ rows: 2, expandable: true }">
                {{ researchSummary.solution }}
              </Typography.Paragraph>
            </div>
          </div>
          
          <div class="summary-item" v-if="researchSummary.literatureEvidence.length > 0">
            <div class="summary-label">文献支持</div>
            <div class="summary-value">
              <Tag v-for="evidence in researchSummary.literatureEvidence.slice(0, 2)" 
                   :key="evidence.slice(0, 20)"
                   color="green">
                {{ evidence.split('：')[0] }}
              </Tag>
            </div>
          </div>
        </div>
      </Card>

      <Divider />

      <!-- 学习卡片选择区域 -->
      <Card size="small" class="cards-section">
        <template #title>
          <div class="cards-header">
            <span>📚 选择有价值的学习卡片</span>
            <div class="selection-info">
              已选择 {{ selectedCardsInfo.total }}/{{ availableCards.length }} 张
            </div>
          </div>
        </template>
        
        <template #extra>
          <div class="card-controls">
            <Button size="small" @click="selectAll">
              {{ selectedCards.length === availableCards.length ? '取消全选' : '全选' }}
            </Button>
          </div>
        </template>

        <!-- 按类型快速选择 -->
        <div class="type-selector">
          <div class="type-selector-label">按类型选择：</div>
          <div class="type-tags">
            <Tag 
              v-for="type in Object.keys(typeColors)" 
              :key="type"
              :color="typeColors[type]"
              class="type-tag"
              @click="selectByType(type)"
            >
              {{ type }} ({{ availableCards.filter(c => c.type === type).length }})
            </Tag>
          </div>
        </div>

        <!-- 卡片网格 -->
        <div class="cards-grid">
          <div 
            v-for="card in availableCards" 
            :key="card.id"
            class="selectable-card"
            :class="{ selected: selectedCards.includes(card.id) }"
            @click="toggleCardSelection(card.id)"
          >
            <div class="card-header">
              <Checkbox 
                :checked="selectedCards.includes(card.id)"
                @click.stop
                @change="toggleCardSelection(card.id)"
              />
              <div class="card-title">{{ card.title }}</div>
              <div class="card-badges">
                <Tag :color="typeColors[card.type]" size="small">{{ card.type }}</Tag>
                <Tag :color="importanceColors[card.importance]" size="small">{{ card.importance }}</Tag>
              </div>
            </div>
            <div class="card-content">
              <Typography.Paragraph :ellipsis="{ rows: 3, expandable: true }">
                {{ card.content }}
              </Typography.Paragraph>
            </div>
          </div>
        </div>
      </Card>

      <Divider />

      <!-- 导出选项 -->
      <Card title="📄 选择导出格式" size="small" class="export-options">
        <Radio.Group v-model:value="exportFormat" class="format-options">
          <div class="format-grid">
            <div 
              v-for="option in formatOptions" 
              :key="option.value"
              class="format-option"
              :class="{ selected: exportFormat === option.value }"
              @click="exportFormat = option.value"
            >
              <Radio :value="option.value" @click.stop>
                <div class="format-content">
                  <component :is="option.icon" class="format-icon" />
                  <div class="format-info">
                    <div class="format-label">{{ option.label }}</div>
                    <div class="format-desc">{{ option.description }}</div>
                  </div>
                </div>
              </Radio>
            </div>
          </div>
        </Radio.Group>
      </Card>

      <!-- 操作按钮 -->
      <div class="modal-footer">
        <div class="footer-info">
          <span v-if="selectedCardsInfo.total > 0">
            将导出 {{ selectedCardsInfo.total }} 张学习卡片
            <template v-if="Object.keys(selectedCardsInfo.byType).length > 0">
              （{{ Object.entries(selectedCardsInfo.byType).map(([type, count]) => `${type}${count}张`).join('、') }}）
            </template>
          </span>
        </div>
        <div class="footer-buttons">
          <Button @click="handleClose">稍后导出</Button>
          <Button 
            type="primary" 
            :loading="isExporting"
            :disabled="selectedCards.length === 0"
            @click="handleExport"
          >
            <DownloadOutlined />
            {{ isExporting ? '导出中...' : '导出并完成教研' }}
          </Button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.export-modal-content {
  max-height: 70vh;
  overflow-y: auto;
}

.summary-card {
  margin-bottom: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label {
  font-size: 12px;
  color: #666;
  font-weight: 600;
}

.summary-value {
  font-size: 13px;
}

.summary-value.primary {
  font-weight: 600;
}

.insights-list {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #555;
}

.insights-list li {
  margin-bottom: 4px;
  line-height: 1.4;
}

.cards-section {
  margin-bottom: 16px;
}

.cards-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.selection-info {
  font-size: 12px;
  color: #1890ff;
  font-weight: 600;
}

.card-controls {
  display: flex;
  gap: 8px;
}

.type-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
}

.type-selector-label {
  font-size: 13px;
  color: #666;
  font-weight: 600;
  white-space: nowrap;
}

.type-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.type-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.type-tag:hover {
  opacity: 0.8;
  transform: scale(1.05);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.selectable-card {
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
  background: #fff;
}

.selectable-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  transform: translateY(-2px);
}

.selectable-card.selected {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.05);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.card-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.card-badges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.card-content {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.export-options {
  margin-bottom: 16px;
}

.format-options .ant-radio-group {
  width: 100%;
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.format-option {
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.format-option:hover {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.05);
}

.format-option.selected {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.1);
}

.format-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.format-icon {
  font-size: 24px;
  color: #1890ff;
}

.format-info {
  flex: 1;
}

.format-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.format-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.footer-info {
  font-size: 13px;
  color: #666;
}

.footer-buttons {
  display: flex;
  gap: 12px;
}
</style>