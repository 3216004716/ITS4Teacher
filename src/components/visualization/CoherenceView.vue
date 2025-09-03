<script setup>
import { defineComponent, reactive, onMounted, ref, toRefs, effect, nextTick, onUnmounted } from "vue";
import * as d3 from 'd3';
import {
  MIDDLE_COLUMN_WIDTH_COEFFICIENT, BLOOM_CLASS, BLOOM_DICT,
  BLOOM_REMEMBER, BLOOM_UNDERSTAND, BLOOM_APPLY, BLOOM_ANALYZE, BLOOM_EVALUATE, BLOOM_CREATE, BLOOM_OTHERS,
} from '../../utils/const'
import { getLessonMinute, length } from '../../utils/tools'

// 导入数据
import analyzeData from '../../data/analyze_sentiment.json'
import questionClassification from '../../data/question_classification.json'

// 修改引用名称
const qMap2 = ref(null);

// 添加调试输出
console.log('情感数据文件加载:', analyzeData ? '成功' : '失败',
  Array.isArray(analyzeData) ? `(${analyzeData.length}条记录)` : '');

const state = reactive({
  id: 0,
  data: [],
  matrix: [],
  names: ['其他', '记忆', '理解', '应用', '分析', '评价', '创造'], // 按照指定顺序排列
  // 创建一个索引映射，用于将BLOOM_DICT索引映射到我们想要的顺序
  indexMap: [
    BLOOM_OTHERS,    // 其他
    BLOOM_REMEMBER,  // 记忆
    BLOOM_UNDERSTAND,// 理解
    BLOOM_APPLY,     // 应用
    BLOOM_ANALYZE,   // 分析
    BLOOM_EVALUATE,  // 评价
    BLOOM_CREATE     // 创造
  ]
});

// 初始化一个7x7的矩阵，用于存储转换关系
const initMatrix = () => {
  const size = 7; // 布鲁姆分类共7种类型
  const matrix = Array(size).fill().map(() => Array(size).fill(0));
  return matrix;
};

// 处理数据
const processData = () => {
  state.data = analyzeData;

  // 初始化矩阵
  state.matrix = initMatrix();

  // 创建反向映射，将BLOOM常量映射回我们自定义的索引位置
  const reverseMap = {};
  state.indexMap.forEach((bloomIndex, customIndex) => {
    reverseMap[bloomIndex] = customIndex;
  });

  // 遍历数据，计算布鲁姆分类法之间的转换关系
  for (let i = 0; i < state.data.length - 1; i++) {
    const currentType = state.data[i].blmType;
    const nextType = state.data[i + 1].blmType;

    // 获取原始索引
    const sourceOriginalIndex = BLOOM_DICT[currentType] || BLOOM_OTHERS;
    const targetOriginalIndex = BLOOM_DICT[nextType] || BLOOM_OTHERS;

    // 转换为自定义索引
    const sourceIndex = reverseMap[sourceOriginalIndex];
    const targetIndex = reverseMap[targetOriginalIndex];

    // 增加转换计数
    state.matrix[sourceIndex][targetIndex]++;
  }

  // 创建新的可视化
  createVisualization();
};

// 创建新的可视化
const createVisualization = () => {
  // 确保DOM元素已经挂载
  if (!qMap2.value) return;

  // 清除之前的可视化
  d3.select(qMap2.value).selectAll('*').remove();

  // 创建容器
  const container = d3.select(qMap2.value)
    .style('background', '#ffffff')
    .style('padding', '5px')
    .style('display', 'flex')
    .style('justify-content', 'center')
    .style('align-items', 'center');

  // 创建主面板，包含雷达图和三何分类
  const mainPanel = container.append('div')
    .style('width', '100%')
    .style('height', '100%')
    .style('display', 'flex')
    .style('gap', '5px');

  // 绘制雷达图和三何分类
  drawRadarAndThreeHe(mainPanel);
};

// 绘制雷达图和三何分类
const drawRadarAndThreeHe = (container) => {
  // 左侧雷达图
  const leftPanel = container.append('div')
    .style('width', '60%')
    .style('height', '100%')
    .style('background', 'white')
    .style('padding', '2px');

  // 右侧三何分类
  const rightPanel = container.append('div')
    .style('width', '40%')
    .style('height', '100%')
    .style('background', 'white')
    .style('padding', '2px');

  drawRadarChart(leftPanel);
  drawThreeHeChart(rightPanel);
};

// 绘制四何问题雷达图
const drawRadarChart = (container) => {
  const width = container.node().getBoundingClientRect().width;
  const height = container.node().getBoundingClientRect().height;
  const radius = Math.min(width, height) / 2 - 30;
  
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height);
  
  const g = svg.append('g')
    .attr('transform', `translate(${width/2},${height/2})`);
  
  // 获取四何数据
  const matStats = questionClassification.statistics.mat;
  const data = [
    { axis: '是何', value: matStats['是何'] || 0 },
    { axis: '如何', value: matStats['如何'] || 0 },
    { axis: '为何', value: matStats['为何'] || 0 },
    { axis: '若何', value: matStats['若何'] || 0 }
  ];
  
  const maxValue = Math.max(...data.map(d => d.value));
  const angleSlice = Math.PI * 2 / data.length;
  
  // 比例尺
  const rScale = d3.scaleLinear()
    .domain([0, maxValue])
    .range([0, radius]);
  
  // 绘制网格
  const levels = 5;
  for(let level = 0; level < levels; level++){
    const levelFactor = radius * ((level + 1) / levels);
    
    g.selectAll(`.level-${level}`)
      .data(data)
      .enter().append('line')
      .attr('x1', (d, i) => levelFactor * Math.cos(angleSlice * i - Math.PI/2))
      .attr('y1', (d, i) => levelFactor * Math.sin(angleSlice * i - Math.PI/2))
      .attr('x2', (d, i) => levelFactor * Math.cos(angleSlice * (i+1) - Math.PI/2))
      .attr('y2', (d, i) => levelFactor * Math.sin(angleSlice * (i+1) - Math.PI/2))
      .style('stroke', '#ddd')
      .style('stroke-width', '1px');
  }
  
  // 绘制轴线
  const axis = g.selectAll('.axis')
    .data(data)
    .enter().append('g')
    .attr('class', 'axis');
  
  axis.append('line')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', (d, i) => radius * Math.cos(angleSlice * i - Math.PI/2))
    .attr('y2', (d, i) => radius * Math.sin(angleSlice * i - Math.PI/2))
    .style('stroke', '#ccc')
    .style('stroke-width', '2px');
  
  // 绘制标签 - 分两行显示
  const labels = axis.append('g')
    .attr('transform', (d, i) => `translate(${(radius + 15) * Math.cos(angleSlice * i - Math.PI/2)}, ${(radius + 15) * Math.sin(angleSlice * i - Math.PI/2)})`);
  
  // 第一行：标签名称
  labels.append('text')
    .attr('x', 0)
    .attr('y', -6)
    .style('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('font-weight', '500')
    .text(d => d.axis);
  
  // 第二行：数值
  labels.append('text')
    .attr('x', 0)
    .attr('y', 6)
    .style('text-anchor', 'middle')
    .style('font-size', '10px')
    .style('font-weight', '400')
    .text(d => `(${d.value})`);
  
  // 绘制数据区域
  const radarLine = d3.lineRadial()
    .radius(d => rScale(d.value))
    .angle((d, i) => i * angleSlice)
    .curve(d3.curveLinearClosed);
  
  g.append('path')
    .datum(data)
    .attr('d', radarLine)
    .style('fill', '#3498db')
    .style('fill-opacity', 0.3)
    .style('stroke', '#3498db')
    .style('stroke-width', '2px');
  
  // 绘制数据点
  g.selectAll('.radar-circle')
    .data(data)
    .enter().append('circle')
    .attr('cx', (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI/2))
    .attr('cy', (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI/2))
    .attr('r', 4)
    .style('fill', '#3498db')
    .style('stroke', 'white')
    .style('stroke-width', '2px');
  
  // 标题
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 10)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('font-weight', 'bold')
    .text('四何问题分布');
};

// 绘制三何分类图
const drawThreeHeChart = (container) => {
  const width = container.node().getBoundingClientRect().width;
  const height = container.node().getBoundingClientRect().height;
  const margin = { top: 25, right: 10, bottom: 35, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height);
  
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // 重新统计三何数据
  const threeHeCount = { '由何': 0, '又何': 0, '然何': 0 };
  let totalValidQuestions = 0;
  
  questionClassification.questions.forEach(q => {
    if (q.three && q.three !== '无') {
      threeHeCount[q.three] = (threeHeCount[q.three] || 0) + 1;
      totalValidQuestions++;
    }
  });
  
  console.log('重新统计的三何数据:', threeHeCount);
  const data = Object.entries(threeHeCount).map(([key, value]) => ({
    type: key,
    count: value,
    percentage: totalValidQuestions > 0 ? (value / totalValidQuestions * 100).toFixed(1) : '0.0'
  }));
  
  // 比例尺
  const xScale = d3.scaleBand()
    .domain(data.map(d => d.type))
    .range([0, innerWidth])
    .padding(0.3);
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .range([innerHeight, 0]);
  
  // 颜色
  const colorScale = d3.scaleOrdinal()
    .domain(['由何', '又何', '然何'])
    .range(['#2ecc71', '#e74c3c', '#f39c12']);
  
  // 绘制条形图
  g.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d.type))
    .attr('y', d => yScale(d.count))
    .attr('width', xScale.bandwidth())
    .attr('height', d => innerHeight - yScale(d.count))
    .attr('fill', d => colorScale(d.type))
    .attr('opacity', 0.8);
  
  // 添加数值标签
  g.selectAll('.label')
    .data(data)
    .enter().append('text')
    .attr('x', d => xScale(d.type) + xScale.bandwidth() / 2)
    .attr('y', d => yScale(d.count) - 5)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .text(d => `${d.count}`);
  
  // X轴
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale));
  
  // Y轴
  g.append('g')
    .call(d3.axisLeft(yScale));
  
  // 标题
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 10)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('font-weight', 'bold')
    .text('三何问题分类');
  
  // 添加说明文字
  // const legend = svg.append('g')
  //   .attr('transform', `translate(${margin.left}, ${height - 10})`);
  
  // legend.append('text')
  //   .attr('x', 0)
  //   .attr('y', 0)
  //   .style('font-size', '11px')
  //   .style('fill', '#666')
  //   .text('由何:情境融合 | 又何:关联延伸 | 然何:深度挖掘');
};

const methods = reactive({
  visTeachingProcedures() {
    processData();
  }
});

onMounted(() => {
  // 确保DOM渲染完成后再绘制
  nextTick(() => {
    // 先处理数据再绘制图表
    processData();
  });

  // 窗口大小变化时重新绘制
  window.addEventListener('resize', () => {
    processData();
  });
});

// 组件卸载时清理
onUnmounted(() => {
  // 移除tooltip
  d3.selectAll('.matrix-tooltip').remove();
  
  // 移除事件监听
  window.removeEventListener('resize', processData);
});
</script>

<template>
  <div class="item" ref="qMap2">
  </div>
</template>

<style scoped>
.item {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: auto;
}

.title {
  margin-top: 10px;
  text-align: center;
  color: #333;
}

#bloom {
  border: #888 1px solid;
}

#qText {
  width: 100%;
  height: 8vh;
  margin: 8px;
  background: #f7f7f7;
  border: #888 1px solid;
  border-radius: 4px;
  padding: 8px;
}
</style>