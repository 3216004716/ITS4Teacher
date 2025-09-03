<script setup>
import { defineComponent, reactive, onMounted, ref, toRefs, effect, nextTick, h, computed } from "vue";
import HeaderView from "./HeaderView.vue";
import * as d3 from 'd3';

const qMap2 = ref();

const evidenceOptions = ['证据来源', '证据参考价值'];
const categoryOptions = ['论文信息', '理论基础', '前沿观点', '实验流程', '实验结论'];


const state = reactive({
  panels: [
    {
      key: '1',
      header: '小学数学教学中深度问题的研究——基于专家教师课堂提问的案例分析',
      evidence: {
        "证据来源": "CSSCI期刊论文",
        "证据参考价值": "该证据经过实证检验，且论文经过同行评议，参考价值较大"
      },
      paper_info: {
        "作者": "陈薇, 沈书生",
        "期刊": "课程·教材·教学法",
        "出版时间": "2019年10月"
      },
      theoretical_basis: {
        "问题引导教学": "问题是数学事件中的关键要素，引领课堂教学进程，促进教育教学发生的基础",
        "苏格拉底式追问": "通过教师不断追问，让学生从回答过程中体会问题本质",
        "四能目标培养": "强调在小学生数学学习中要培养学生提出问题的能力",
        "高阶思维触发": "深度问题是可能触发学生高阶思维的问题，促进深刻理解"
      },
      frontier_views: {
        "深度问题分类": "深度问题分为比较式、头脑风暴式和总结式三种类型",
        "问题组结构": "深度问题以问题组形式出现，由主体深度问题和若干追问配合",
        "迭代式教学": "采用多轮比较性问题逐层深入，构成迭代式教学结构",
        "锚基理论应用": "深度问题是教学对话的锚基，引导学习活动围绕中心展开"
      },
      experimental_steps: {
        "专家教师选取": "选择四位小学数学专家教师，以互逆关系为教学主题",
        "课堂录制转录": "录制16节随堂课并完整转录师生对话及有意义动作",
        "双重编码分析": "采用双重校对编码制度，筛选深度问题教学片段",
        "参数统计整理": "对深度问题类型、出现时机、教学目的等参数进行统计"
      },
      experimental_conclusions: {
        "问题类型分布规律": "不同教学环节倾向使用不同类型深度问题，体现教学序列性",
        "支持结构要素": "视觉表征是最常用支持要素，信息技术和手势姿态辅助理解",
        "问题链迭代特征": "深度问题组之间存在迭代关系，构成逻辑支撑结构",
        "间接提问效果": "追加问题是否直接指向知识并非促进理解的关键指标"
      },
      isOpen: true
    },
    {
      key: '2',
      header: '基于深度学习的教师课堂提问分析方法研究',
      evidence: {
        "证据来源": "CSSCI期刊论文",
        "证据参考价值": "该证据关注提问内容和类型的分类，参考价值中等"
      },
      paper_info: {
        "作者": "马玉慧,夏雪莹,张文慧",
        "期刊": "电化教育研究",
        "出版时间": "2021年9月"
      },
      theoretical_basis: {
        "课堂提问重要性": "课堂提问是教师课堂教学行为的关键组成部分，是师生进行课堂交互的主要方式",
        "深度学习原理": "深度学习通过多层神经元之间的信息传递，实现不同特征的提取，形成数据分层特征表示",
        "文本分类基础": "文本分类是深度学习在自然语言理解领域的主要应用场景之一"
      },
      frontier_views: {
        "提问内容分类": "将提问内容分为知识点类、题目信息类和管理类三类",
        "提问类型分类": "按认知层级分为识记型、提示型、分析型、应用型和评价型五类",
        "自动分析方法": "基于深度学习的文本分类方法可替代传统视频分析法，实现大规模应用",
        "多维度分析": "从提问内容和提问类型两个维度对教师课堂提问进行综合分析"
      },
      experimental_steps: {
        "数据收集": "收集80节初中数学课堂实录，共9090条课堂提问语料",
        "语料标注": "以句子为单位进行标注，按提问内容和类型分别标注类别",
        "数据预处理": "去除过长过短语句、打乱语料顺序，采用混合采样方式平衡数据",
        "模型训练": "采用CNN和LSTM模型进行训练，设置epochs为100轮，batch_size为64",
        "分类预测": "将待分析提问句子输入训练好的模型中进行自动分类"
      },
      experimental_conclusions: {
        "CNN模型优势": "CNN模型在提问内容和类型分类上的准确率分别达到85.17%和87.84%",
        "分类效果验证": "基于深度学习的文本分类方法可替代传统视频分析方法",
        "大规模应用可行性": "该方法能够实现教师课堂提问分析的大规模应用",
        "教育智能化推进": "深度学习技术为教育领域的智能化分析提供了有效工具"
      },
      isOpen: true
    }
  ]
});

const selectedEvidence = ref(['证据来源', '证据参考价值']);
const selectedCategories = ref(['前沿观点', '实验结论']);

const popupScroll = (e) => {
  console.log(e);
};

const togglePanel = (panel) => {
  panel.isOpen = !panel.isOpen;
};


const methods = reactive({
  visTeachingProcedures() {
    // 可以在这里添加其他逻辑
  }
});

onMounted(() => {
  methods.visTeachingProcedures();
});
</script>

<template>
  <HeaderView pageTitle="课堂证据资料" />
  <div class="item" ref="qMap2">
    <div class="select-container">
      <div class="select-item">
        <span class="select-label">证据要素:</span>
        <a-checkbox-group v-model:value="selectedEvidence" name="checkboxgroup" :options="evidenceOptions" />
      </div>
      <div class="select-item">
        <span class="select-label">研究内容:</span>
        <a-checkbox-group v-model:value="selectedCategories" name="checkboxgroup" :options="categoryOptions" />
      </div>
    </div>

    <div class="collapse-container">
      <div v-for="panel in state.panels" :key="panel.key" class="panel">
        <div class="panel-header" @click="togglePanel(panel)">
          <div class="arrow" :class="{ 'arrow-down': panel.isOpen, 'arrow-right': !panel.isOpen }"></div>
          <div class="header-text">{{ panel.header }}</div>
        </div>
        <transition name="slide">
          <div v-if="panel.isOpen" class="panel-content">
            <table class="data-table">
              <tbody>
                <!-- 证据要素 -->
                <template v-if="selectedEvidence.length > 0">
                  <tr class="category-row">
                    <td colspan="2">证据要素</td>
                  </tr>
                  <tr v-for="item in selectedEvidence" :key="`evidence_${item}`">
                    <td class="item-name">{{ item }}</td>
                    <td class="item-value">{{ panel.evidence[item] || '-' }}</td>
                  </tr>
                </template>

                <!-- 选中的其他类别 -->
                <template v-for="category in selectedCategories" :key="category">
                  <tr class="category-row">
                    <td colspan="2">{{ category }}</td>
                  </tr>
                  <template v-if="category === '论文信息' && panel.paper_info">
                    <tr v-for="(value, key) in panel.paper_info" :key="`paper_${key}`">
                      <td class="item-name">{{ key }}</td>
                      <td class="item-value">{{ value }}</td>
                    </tr>
                  </template>
                  <template v-if="category === '理论基础' && panel.theoretical_basis">
                    <tr v-for="(value, key) in panel.theoretical_basis" :key="`theory_${key}`">
                      <td class="item-name">{{ key }}</td>
                      <td class="item-value">{{ value }}</td>
                    </tr>
                  </template>
                  <template v-if="category === '前沿观点' && panel.frontier_views">
                    <tr v-for="(value, key) in panel.frontier_views" :key="`frontier_${key}`">
                      <td class="item-name">{{ key }}</td>
                      <td class="item-value">{{ value }}</td>
                    </tr>
                  </template>
                  <template v-if="category === '实验流程' && panel.experimental_steps">
                    <tr v-for="(value, key) in panel.experimental_steps" :key="`steps_${key}`">
                      <td class="item-name">{{ key }}</td>
                      <td class="item-value">{{ value }}</td>
                    </tr>
                  </template>
                  <template v-if="category === '实验结论' && panel.experimental_conclusions">
                    <tr v-for="(value, key) in panel.experimental_conclusions" :key="`conclusions_${key}`">
                      <td class="item-name">{{ key }}</td>
                      <td class="item-value">{{ value }}</td>
                    </tr>
                  </template>
                </template>

                <!-- 没有选择任何项目时的提示 -->
                <tr v-if="selectedEvidence.length === 0 && selectedCategories.length === 0">
                  <td colspan="2" class="no-data">请在上方选择要查看的项目</td>
                </tr>
              </tbody>
            </table>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
// 辅助函数：按类别对数组进行分组
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const category = item[key];
    if (!result[category]) {
      result[category] = [];
    }
    result[category].push(item);
    return result;
  }, {});
}
</script>

<style scoped>
.item {
  width: 100%;
  height: calc(100% - 28px);
  /* 减去头部高度 */
  border-left: #d3d3d3 1px solid;
  border-bottom: #d3d3d3 1px solid;
  border-right: #d3d3d3 1px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  font-size: 12px;
  overflow-y: scroll;
  scrollbar-color: #ececec transparent;
  scrollbar-width: thin;
  overflow-x: hidden;
}

.select-container {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-items: top;
  justify-content: left;
  width: 100%;
  margin-top: 4px;
}

.select-item {
  display: flex;
  align-items: top;
  justify-content: left;
  width: 100%;
}

.select-label {
  font-size: 12px;
  margin-right: 8px;
  flex-shrink: 0;
  padding-top: 4px;
}

:deep(.ant-checkbox-group-item) {
  span {
    font-size: 12px;
    padding: 2px;
  }
}

.collapse-container {
  width: 100%;
  margin-top: 8px;
  border-radius: 4px;
  border: 1px solid #eaeaea;
  overflow: hidden;
  flex-shrink: 0;
}

/* 确保内容会撑开并产生滚动 */
.panel-content {
  padding: 8px;
  background-color: #fff;
  overflow: visible;
  width: 100%;
}

.panel {
  border-bottom: 1px solid #eaeaea;
}

.panel:last-child {
  border-bottom: none;
}

.panel-header {
  padding: 8px;
  background-color: #fafafa;
  cursor: pointer;
  display: flex;
  align-items: center;
  user-select: none;
  border-bottom: 1px solid #eaeaea;
}

.panel-header:hover {
  color: #1890ff;
}

.arrow {
  margin-right: 8px;
  width: 0;
  height: 0;
  transition: transform 0.3s;
}

.arrow-down {
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #666;
}

.arrow-right {
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 5px solid #666;
}

/* 数据表格样式 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-table th,
.data-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #eaeaea;
}

.data-table th {
  background-color: #fafafa;
  font-weight: 500;
}

.category-row {
  background-color: #f0f5ff;
  font-weight: 500;
}

.category-row td {
  border-left: 3px solid #1890ff;
  color: #1890ff;
}

.item-name {
  padding-left: 16px;
  color: #666;
}

.item-value {
  color: #333;
  white-space: pre-wrap;
  line-height: 1.6;
  max-width: 400px;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 20px 0;
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.5s ease;
}

.slide-enter-from {
  opacity: 1;
}

.slide-leave-to {
  opacity: 0;
}
</style>