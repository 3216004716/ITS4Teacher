<script setup>
import { defineComponent, reactive, onMounted, ref, toRefs, effect, nextTick, h, computed } from "vue";
import HeaderView from "./HeaderView.vue";
import * as d3 from 'd3';

const qMap2 = ref();

const evidenceOptions = ['证据来源', '证据参考价值'];
const generalOptions = ['学科', '年级', '课型', '教材', '教学主题', '教学目标', '教学重难点', '教学过程', '教学评价'];
const personalizedOptions = ['五何问题类型', '提问覆盖性', '问题开放性', '问题针对性', '问题梯度性', '问题情境性', '问题生成性'];

// 为每个选项创建对应的值
const evidenceValues = {
  '证据来源': '优秀课例',
  '证据参考价值': '该证据来源于真实课堂实践，参考价值较大'
};

const generalValues = {
  '学科': '数学',
  '年级': '八年级',
  '课型': '习题课',
  '教材': '人教版',
  '教学主题': '勾股定理',
  '教学目标': '1.数学思考：通过用代数式、方程等表述数量关系的过程，体会模型的思想，建立符号意识。\n2.问题解决：初步学会在具体的情境中从数学的角度发现问题和提出问题，并综合运用数学知识和方法等解决简单的实际问题，增强应用意识，提高实践能力。',
  '教学重难点': '运用方程思想解决与勾股定理有关的问题，掌握利用“割”“补”图形构造直角三角形的方法。',
  '教学过程': '1.创设情境，引入新课\n2.探究新知，解决问题\n3.巩固练习，深化理解\n4.课堂小结，反思提升',
  '教学评价': '2.通过课堂练习和课后作业，巩固学生对勾股定理的理解和应用。'
};

const personalizedValues = {
  '五何问题类型': '如何、为何',
  '提问覆盖性': '覆盖多数学生',
  '问题开放性': '多数为开放性问题，有少量封闭性问题',
  '问题针对性': '所有问题围绕教学目标提出，针对性强',
  '问题梯度性': '聚焦问题解决，包含平行型和提高型',
  '问题情境性': '缺少情境性问题',
  '问题生成性': '在问题解决中，基于课堂师生互动，生成新问题激发学生思考'
};

const state = reactive({
  panels: [
    {
      key: '1',
      header: '《勾股定理的应用》——用方程思想解决问题',
      evidence: {
        '证据来源': '优秀课例',
        '证据参考价值': '该证据来源于真实课堂实践，参考价值较大'
      },
      general: {
        '学科': '数学',
        '年级': '八年级',
        '课型': '习题课',
        '教材': '人教版',
        '教学主题': '勾股定理',
        '教学目标': '1.数学思考：通过用代数式、方程等表述数量关系的过程，体会模型的思想，建立符号意识。\n2.问题解决：初步学会在具体的情境中从数学的角度发现问题和提出问题，并综合运用数学知识和方法等解决简单的实际问题，增强应用意识，提高实践能力',
        '教学重难点': '运用方程思想解决与勾股定理有关的问题，掌握利用“割”“补”图形构造直角三角形的方法',
        '教学过程': '1.创设情境，引入新课\n2.探究新知，解决问题\n3.巩固练习，深化理解\n4.课堂小结，反思提升',
        '教学评价': '2.通过课堂练习和课后作业，巩固学生对勾股定理的理解和应用。'
      },
      personalized: {
        '五何问题类型': '如何、为何',
        '提问覆盖性': '覆盖多数学生',
        '问题开放性': '多数为开放性问题，有少量封闭性问题',
        '问题针对性': '所有问题围绕教学目标提出，针对性强',
        '问题梯度性': '聚焦问题解决，包含平行型和提高型',
        '问题情境性': '缺少情境性问题',
        '问题生成性': '在问题解决中，基于课堂师生互动，生成新问题激发学生思考'
      },
      isOpen: true
    },
    {
      key: '2',
      header: '《三角形的面积》',
      evidence: {
        '证据来源': '优秀课例',
        '证据参考价值': '该证据来源于真实课堂实践，参考价值较大'
      },
      general: {
        '学科': '数学',
        '年级': '八年级',
        '课型': '新授课',
        '教材': '人教版',
        '教学主题': '三角形的面积',
        '教学目标': '让学生经历探索三角形面积计算公式的推导过程，掌握三角形的面积计算方法，能应用三角形的面积公式解决相应的实际问题',
        '教学重难点': '1.重点：探索并掌握三角形的面积计算公式\n2.难点：理解三角形的面积计算公式的推导过程',
        '教学过程': '导入新课—探究新知—迁移运用',
        '教学评价': '布置课后作业：知识技能类作业和综合实践类作业'
      },
      personalized: {
        '五何问题类型': '为何、是何、如何、若何',
        '提问覆盖性': '覆盖多数学生',
        '问题开放性': '开放性问题和封闭性问题较为平衡',
        '问题针对性': '所有问题围绕教学目标提出，针对性强',
        '问题梯度性': '探究新知环节以收敛型问题为主，迁移应用环节以提高型为主',
        '问题情境性': '在迁移应用环节，创设了情境，让学生在情境中解决问题',
        '问题生成性': '预设性问题为主，但有少量生成性问题'
      },
      isOpen: true
    }
  ]
});

const selectedEvidence = ref(['证据来源']);
const selectedGeneral = ref(['课型','教学主题',]);
const selectedPersonalized = ref(['提问覆盖性', '问题开放性',  '问题梯度性', '问题情境性']);

const popupScroll = (e) => {
  console.log(e);
};

const togglePanel = (panel) => {
  panel.isOpen = !panel.isOpen;
};

// 计算所有选中的项目及其对应的值
const selectedItemsAndValues = computed(() => {
  const items = [];

  // 添加证据要素
  selectedEvidence.value.forEach(item => {
    items.push({ category: '证据要素', item, value: evidenceValues[item] || '-' });
  });

  // 添加通用要素
  selectedGeneral.value.forEach(item => {
    items.push({ category: '教学通用要素', item, value: generalValues[item] || '-' });
  });

  // 添加个性化要素
  selectedPersonalized.value.forEach(item => {
    items.push({ category: '个性化要素', item, value: personalizedValues[item] || '-' });
  });

  return items;
});

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
        <span class="select-label">教学通用要素:</span>
        <a-checkbox-group v-model:value="selectedGeneral" name="checkboxgroup" :options="generalOptions" />
      </div>
      <div class="select-item">
        <span class="select-label">个性化要素:</span>
        <a-checkbox-group v-model:value="selectedPersonalized" name="checkboxgroup" :options="personalizedOptions" />
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
                <template v-for="(group, category) in groupBy(selectedItemsAndValues, 'category')" :key="category">
                  <tr class="category-row">
                    <td colspan="2">{{ category }}</td>
                  </tr>
                  <tr v-for="item in group" :key="item.item">
                    <td class="item-name">{{ item.item }}</td>
                    <td class="item-value">{{ item.value }}</td>
                  </tr>
                </template>

                <tr v-if="selectedItemsAndValues.length === 0">
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

.item-name {
  padding-left: 16px;
  color: #666;
}

.item-value {
  color: #333;
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