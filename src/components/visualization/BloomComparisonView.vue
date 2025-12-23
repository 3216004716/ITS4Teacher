<script setup>
import { reactive, onMounted, onBeforeUnmount, ref, nextTick } from "vue";
import * as d3 from 'd3';
import bloomData1 from '../../data/questions_by_phases1.json';
import bloomData2 from '../../data/questions_by_phases2.json';

const container = ref(null);
const lineChartContainer = ref(null);
let resizeObserver = null;

// 布鲁姆分类颜色映射
const BLOOM_COLORS = {
  '记忆': '#3288BD',
  '理解': '#66C2A5',
  '应用': '#E6F598',
  '分析': '#FEE08B',
  '评价': '#F46D43',
  '创造': '#A50026'
};

// 布鲁姆分类列表
const BLOOM_CATEGORIES = ['记忆', '理解', '应用', '分析', '评价', '创造'];

// 为柱状图定义不同的图案类型
const BLOOM_PATTERNS = {
  '记忆': 'diagonal-lines',      // 斜线
  '理解': 'dots',                // 圆点
  '应用': 'horizontal-lines',    // 横线
  '分析': 'vertical-lines',      // 竖线
  '评价': 'crosshatch',          // 交叉线
  '创造': 'solid'                // 纯色填充
};

// 创建SVG图案定义
function createPatternDefs(svg) {
  const defs = svg.append('defs');

  // 斜线图案 - 记忆 (使用objectBoundingBox使图案相对于每个元素)
  const diagonalPattern = defs.append('pattern')
    .attr('id', 'pattern-diagonal-lines')
    .attr('patternUnits', 'objectBoundingBox')
    .attr('patternContentUnits', 'userSpaceOnUse')
    .attr('width', '100%')
    .attr('height', '100%');
  // 创建一个足够大的图案区域
  const diagonalG = diagonalPattern.append('g');
  diagonalG.append('rect')
    .attr('width', 500)
    .attr('height', 500)
    .attr('fill', BLOOM_COLORS['记忆']);
  // 绘制多条斜线覆盖整个区域
  for (let i = -500; i < 500; i += 6) {
    diagonalG.append('line')
      .attr('x1', i)
      .attr('y1', 0)
      .attr('x2', i + 500)
      .attr('y2', 500)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);
  }

  // 圆点图案 - 理解
  const dotsPattern = defs.append('pattern')
    .attr('id', 'pattern-dots')
    .attr('patternUnits', 'objectBoundingBox')
    .attr('patternContentUnits', 'userSpaceOnUse')
    .attr('width', '100%')
    .attr('height', '100%');
  const dotsG = dotsPattern.append('g');
  dotsG.append('rect')
    .attr('width', 500)
    .attr('height', 500)
    .attr('fill', BLOOM_COLORS['理解']);
  // 绘制圆点网格
  for (let x = 6; x < 500; x += 8) {
    for (let y = 6; y < 500; y += 8) {
      dotsG.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 2)
        .attr('fill', '#ffffff');
    }
  }

  // 横线图案 - 应用
  const horizontalPattern = defs.append('pattern')
    .attr('id', 'pattern-horizontal-lines')
    .attr('patternUnits', 'objectBoundingBox')
    .attr('patternContentUnits', 'userSpaceOnUse')
    .attr('width', '100%')
    .attr('height', '100%');
  const horizontalG = horizontalPattern.append('g');
  horizontalG.append('rect')
    .attr('width', 500)
    .attr('height', 500)
    .attr('fill', BLOOM_COLORS['应用']);
  for (let y = 3; y < 500; y += 6) {
    horizontalG.append('line')
      .attr('x1', 0)
      .attr('y1', y)
      .attr('x2', 500)
      .attr('y2', y)
      .attr('stroke', '#666666')
      .attr('stroke-width', 2);
  }

  // 竖线图案 - 分析
  const verticalPattern = defs.append('pattern')
    .attr('id', 'pattern-vertical-lines')
    .attr('patternUnits', 'objectBoundingBox')
    .attr('patternContentUnits', 'userSpaceOnUse')
    .attr('width', '100%')
    .attr('height', '100%');
  const verticalG = verticalPattern.append('g');
  verticalG.append('rect')
    .attr('width', 500)
    .attr('height', 500)
    .attr('fill', BLOOM_COLORS['分析']);
  for (let x = 3; x < 500; x += 6) {
    verticalG.append('line')
      .attr('x1', x)
      .attr('y1', 0)
      .attr('x2', x)
      .attr('y2', 500)
      .attr('stroke', '#996600')
      .attr('stroke-width', 2);
  }

  // 交叉线图案 - 评价
  const crosshatchPattern = defs.append('pattern')
    .attr('id', 'pattern-crosshatch')
    .attr('patternUnits', 'objectBoundingBox')
    .attr('patternContentUnits', 'userSpaceOnUse')
    .attr('width', '100%')
    .attr('height', '100%');
  const crosshatchG = crosshatchPattern.append('g');
  crosshatchG.append('rect')
    .attr('width', 500)
    .attr('height', 500)
    .attr('fill', BLOOM_COLORS['评价']);
  // 绘制交叉线
  for (let i = -500; i < 500; i += 8) {
    crosshatchG.append('line')
      .attr('x1', i)
      .attr('y1', 0)
      .attr('x2', i + 500)
      .attr('y2', 500)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);
    crosshatchG.append('line')
      .attr('x1', i + 500)
      .attr('y1', 0)
      .attr('x2', i)
      .attr('y2', 500)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);
  }
}

// 获取柱状图的填充样式
function getBarFill(category) {
  const patternType = BLOOM_PATTERNS[category];
  if (patternType === 'solid') {
    return BLOOM_COLORS[category];
  }
  return `url(#pattern-${patternType})`;
}

// 三维水平变化数据（来自 quality.png）
const QUALITY_DATA = {
  labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11'],
  准度: [35, 75, 75, 85, 60, 65, 77, 85, 85, 70, 85],
  层次: [40, 80, 70, 75, 70, 75, 90, 80, 90, 80, 90],
  深度: [30, 70, 65, 80, 75, 70, 88, 75, 80, 78, 88]
};

// 三维水平折线图颜色
const LINE_COLORS = {
  '准度': '#8BC34A',  // 绿色
  '层次': '#FF9800',  // 橙色
  '深度': '#03A9F4'   // 蓝色
};

// 统计单个环节的布鲁姆分类计数
function countBloomByPhase(phase) {
  const bloomCounts = { '记忆': 0, '理解': 0, '应用': 0, '分析': 0, '评价': 0, '创造': 0 };
  if (phase.questions && Array.isArray(phase.questions)) {
    phase.questions.forEach(question => {
      const blmType = question.blmType;
      if (bloomCounts.hasOwnProperty(blmType)) {
        bloomCounts[blmType]++;
      }
    });
  }
  return bloomCounts;
}

// 获取某个数据集的最大布鲁姆分类计数
function getMaxBloomCount(phases) {
  let maxCount = 0;
  phases.forEach(phase => {
    const bloomCounts = countBloomByPhase(phase);
    BLOOM_CATEGORIES.forEach(cat => {
      if (bloomCounts[cat] > maxCount) {
        maxCount = bloomCounts[cat];
      }
    });
  });
  return maxCount;
}

const methods = reactive({
  resizeTimer: null,

  drawBloomComparison() {
    // 加载两个数据集
    const data1 = bloomData1;
    const data2 = bloomData2;

    if (!data1 || !data1.phases || !data2 || !data2.phases) {
      console.log('等待布鲁姆分类数据加载...');
      return;
    }

    try {
      if (!container.value) {
        console.error('容器元素不存在');
        return;
      }

      // 清空容器
      d3.select(container.value).selectAll('*').remove();

      // 获取容器尺寸
      const containerWidth = container.value.clientWidth || 1600;
      const containerHeight = container.value.clientHeight || 700;

      // 创建主SVG
      const svg = d3.select(container.value)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('background', '#ffffff');

      // 创建图案定义
      createPatternDefs(svg);

      // 绘制总标题
      svg.append('text')
        .attr('x', containerWidth / 2)
        .attr('y', 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '22px')
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        // .text('AIED模式支持的问课研究前后教师课堂提问的布鲁姆分类分布对比');
        .text('课堂提问特征：基于布鲁姆分类的认知结构优化对比');

      // 绘制图例（标题下方）
      this.drawLegend(svg, containerWidth, 65);

      // 绘制两个并排的柱状图
      const chartMargin = { top: 130, right: 30, bottom: 60, left: 70 };
      const chartGap = 60; // 两个图表之间的间距
      const chartWidth = (containerWidth - chartMargin.left - chartMargin.right - chartGap) / 2;
      const chartHeight = containerHeight - chartMargin.top - chartMargin.bottom;

      // 计算两个数据集的全局最大值，确保Y轴比例一致
      const globalMaxCount = Math.max(getMaxBloomCount(data1.phases), getMaxBloomCount(data2.phases));

      // 绘制数据集1的柱状图（左侧）
      this.drawSingleChart(svg, data1, chartMargin.left, chartMargin.top, chartWidth, chartHeight, '第一次课', globalMaxCount);

      // 绘制数据集2的柱状图（右侧）
      this.drawSingleChart(svg, data2, chartMargin.left + chartWidth + chartGap, chartMargin.top, chartWidth, chartHeight, '第二次课', globalMaxCount);

    } catch (error) {
      console.error('绘制布鲁姆分类对比图时出错:', error);
    }
  },

  // 绘制单个柱状图
  drawSingleChart(svg, data, offsetX, offsetY, width, height, title, globalMaxCount) {
    // 创建图表组
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${offsetX},${offsetY})`);

    // 绘制子标题
    chartGroup.append('text')
      .attr('x', width / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(title);

    // 统计每个环节的 bloomCounts
    const phases = data.phases.map(phase => ({
      ...phase,
      bloomCounts: countBloomByPhase(phase)
    }));

    // 创建比例尺
    const xScale = d3.scaleBand()
      .domain(phases.map(p => p.phaseName))
      .range([0, width])
      .padding(0.3);

    // 使用全局最大值设置y轴，确保两个图表比例一致
    const yScale = d3.scaleLinear()
      .domain([0, globalMaxCount + 1])
      .range([height, 0])
      .nice();

    // 绘制Y轴
    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d3.format('d'));

    chartGroup.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('font-size', '14px')
      .attr('fill', '#333');

    // Y轴标签
    chartGroup.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('fill', '#333')
      .text('问题数量');


    // 为每个教学环节绘制分组柱状图
    phases.forEach((phase) => {
      const phaseX = xScale(phase.phaseName);
      const barWidth = xScale.bandwidth() / BLOOM_CATEGORIES.length;

      BLOOM_CATEGORIES.forEach((category, catIndex) => {
        const count = phase.bloomCounts[category];
        const barHeight = height - yScale(count);
        const barX = phaseX + catIndex * barWidth;

        // 绘制柱子（使用图案填充）
        const bar = chartGroup.append('rect')
          .attr('x', barX)
          .attr('y', yScale(count))
          .attr('width', barWidth * 0.85)
          .attr('height', barHeight)
          .attr('fill', getBarFill(category))
          .attr('opacity', 0.9)
          .attr('stroke', '#333')
          .attr('stroke-width', 1)
          .style('cursor', 'pointer');

        // 添加交互效果
        bar.on('mouseover', function (event) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('opacity', 1)
            .attr('stroke-width', 2);

          methods.showTooltip(event, phase.phaseName, category, count, title);
        })
          .on('mouseout', function () {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('opacity', 0.9)
              .attr('stroke-width', 1);

            methods.hideTooltip();
          });

        // 在柱子上方显示数值
        if (count > 0) {
          chartGroup.append('text')
            .attr('x', barX + barWidth * 0.425)
            .attr('y', yScale(count) - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('fill', '#333')
            .attr('font-weight', 'bold')
            .style('pointer-events', 'none')
            .text(count);
        }
      });
    });

    // 绘制X轴
    const xAxis = d3.axisBottom(xScale);

    chartGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '14px')
      .attr('fill', '#333')
      .attr('transform', `translate(0,5)`)
      .attr('text-anchor', 'middle');

  },

  // 绘制图例
  drawLegend(svg, containerWidth, legendY) {
    const bloomLegendWidth = 90;
    const bloomLegendX = (containerWidth - BLOOM_CATEGORIES.length * bloomLegendWidth) / 2;

    const bloomLegendGroup = svg.append('g')
      .attr('class', 'bloom-legend')
      .attr('transform', `translate(${bloomLegendX}, ${legendY})`);

    BLOOM_CATEGORIES.forEach((category, index) => {
      const xPos = index * bloomLegendWidth;

      const legendItem = bloomLegendGroup.append('g')
        .attr('class', 'legend-item')
        .attr('transform', `translate(${xPos}, 0)`);

      // 绘制颜色方块（使用图案填充）
      legendItem.append('rect')
        .attr('x', 0)
        .attr('y', -8)
        .attr('width', 20)
        .attr('height', 20)
        .attr('fill', getBarFill(category))
        .attr('stroke', '#333')
        .attr('stroke-width', 1);

      // 添加标签
      legendItem.append('text')
        .attr('x', 24)
        .attr('y', 8)
        .attr('font-size', '16px')
        .attr('fill', '#333')
        .text(category);
    });
  },

  // 绘制三维水平变化折线图
  drawQualityLineChart() {
    try {
      if (!lineChartContainer.value) {
        console.error('折线图容器元素不存在');
        return;
      }

      // 清空容器
      d3.select(lineChartContainer.value).selectAll('*').remove();

      // 获取容器尺寸
      const containerWidth = lineChartContainer.value.clientWidth || 1200;
      const containerHeight = lineChartContainer.value.clientHeight || 400;

      const margin = { top: 100, right: 80, bottom: 60, left: 70 };
      const width = containerWidth - margin.left - margin.right;
      const height = containerHeight - margin.top - margin.bottom;

      // 创建主SVG
      const svg = d3.select(lineChartContainer.value)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('background', '#ffffff');

      // 绘制标题
      svg.append('text')
        .attr('x', containerWidth / 2)
        .attr('y', 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '22px')
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        .text('教研提问水平：人机协同交互中的三维能力进阶轨迹');
        // .text('问课系统支持下人机协同教研过程中提问的三维水平变化');

      // 绘制图例（标题下方）
      const legendItems = ['准度', '层次', '深度'];
      const legendGroup = svg.append('g')
        .attr('transform', `translate(${containerWidth / 2 - 140}, 65)`);

      legendItems.forEach((item, index) => {
        const xOffset = index * 95;

        // 绘制线段和标记
        legendGroup.append('line')
          .attr('x1', xOffset)
          .attr('y1', 0)
          .attr('x2', xOffset + 24)
          .attr('y2', 0)
          .attr('stroke', LINE_COLORS[item])
          .attr('stroke-width', 2);

        // 绘制标记点
        if (item === '准度') {
          legendGroup.append('path')
            .attr('d', d3.symbol().type(d3.symbolCross).size(100))
            .attr('transform', `translate(${xOffset + 12}, 0)`)
            .attr('fill', LINE_COLORS[item]);
        } else if (item === '层次') {
          legendGroup.append('path')
            .attr('d', d3.symbol().type(d3.symbolTriangle).size(100))
            .attr('transform', `translate(${xOffset + 12}, 0)`)
            .attr('fill', LINE_COLORS[item]);
        } else {
          legendGroup.append('circle')
            .attr('cx', xOffset + 12)
            .attr('cy', 0)
            .attr('r', 5)
            .attr('fill', LINE_COLORS[item]);
        }

        // 添加文字
        legendGroup.append('text')
          .attr('x', xOffset + 32)
          .attr('y', 5)
          .attr('font-size', '16px')
          .attr('fill', '#333')
          .text(item);
      });

      // 创建图表区域
      const chartGroup = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      // X比例尺
      const xScale = d3.scalePoint()
        .domain(QUALITY_DATA.labels)
        .range([0, width])
        .padding(0.5);

      // Y比例尺
      const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

      // 绘制网格线
      chartGroup.append('g')
        .attr('class', 'grid')
        .selectAll('line')
        .data([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
        .enter()
        .append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 1);

      // 绘制Y轴
      const yAxis = d3.axisLeft(yScale)
        .ticks(10)
        .tickFormat(d => d);

      chartGroup.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .selectAll('text')
        .attr('font-size', '14px')
        .attr('fill', '#333');

      // Y轴标签
      chartGroup.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('fill', '#333')
        .text('提问水平');

      // 绘制X轴
      const xAxis = d3.axisBottom(xScale);

      chartGroup.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height})`)
        .call(xAxis)
        .selectAll('text')
        .attr('font-size', '14px')
        .attr('fill', '#333');

      // 绘制折线
      const dimensions = ['准度', '层次', '深度'];
      const symbolTypes = {
        '准度': d3.symbolCross,
        '层次': d3.symbolTriangle,
        '深度': d3.symbolCircle
      };

      dimensions.forEach(dim => {
        const lineData = QUALITY_DATA.labels.map((label, i) => ({
          x: label,
          y: QUALITY_DATA[dim][i]
        }));

        // 创建线生成器
        const lineGenerator = d3.line()
          .x(d => xScale(d.x))
          .y(d => yScale(d.y))
          .curve(d3.curveMonotoneX);

        // 绘制线
        chartGroup.append('path')
          .datum(lineData)
          .attr('fill', 'none')
          .attr('stroke', LINE_COLORS[dim])
          .attr('stroke-width', 2)
          .attr('d', lineGenerator);

        // 绘制数据点和标签
        lineData.forEach(d => {
          if (dim === '准度') {
            chartGroup.append('path')
              .attr('d', d3.symbol().type(d3.symbolCross).size(100))
              .attr('transform', `translate(${xScale(d.x)}, ${yScale(d.y)})`)
              .attr('fill', LINE_COLORS[dim])
              .style('cursor', 'pointer')
              .on('mouseover', function (event) {
                methods.showLineTooltip(event, d.x, dim, d.y);
              })
              .on('mouseout', function () {
                methods.hideTooltip();
              });
          } else if (dim === '层次') {
            chartGroup.append('path')
              .attr('d', d3.symbol().type(d3.symbolTriangle).size(100))
              .attr('transform', `translate(${xScale(d.x)}, ${yScale(d.y)})`)
              .attr('fill', LINE_COLORS[dim])
              .style('cursor', 'pointer')
              .on('mouseover', function (event) {
                methods.showLineTooltip(event, d.x, dim, d.y);
              })
              .on('mouseout', function () {
                methods.hideTooltip();
              });
          } else {
            chartGroup.append('circle')
              .attr('cx', xScale(d.x))
              .attr('cy', yScale(d.y))
              .attr('r', 5)
              .attr('fill', LINE_COLORS[dim])
              .style('cursor', 'pointer')
              .on('mouseover', function (event) {
                methods.showLineTooltip(event, d.x, dim, d.y);
              })
              .on('mouseout', function () {
                methods.hideTooltip();
              });
          }

        });
      });

      // 创建标签层，确保标签在曲线和符号上方
      const labelLayer = chartGroup.append('g').attr('class', 'label-layer');

      // 收集所有数据点的标签位置，用于处理重叠
      const allLabels = [];
      dimensions.forEach((dim, dimIndex) => {
        QUALITY_DATA.labels.forEach((label, i) => {
          allLabels.push({
            x: label,
            y: QUALITY_DATA[dim][i],
            dim: dim,
            dimIndex: dimIndex,
            xPos: xScale(label),
            yPos: yScale(QUALITY_DATA[dim][i])
          });
        });
      });

      // 按x位置分组，处理同一x位置的标签重叠
      const labelsByX = {};
      allLabels.forEach(label => {
        if (!labelsByX[label.x]) {
          labelsByX[label.x] = [];
        }
        labelsByX[label.x].push(label);
      });

      // 标签高度
      const labelHeight = 16;

      // 为每个位置的标签计算偏移，避免重叠
      Object.keys(labelsByX).forEach(x => {
        const labels = labelsByX[x];
        // 按yPos排序（从小到大，即从上到下）
        labels.sort((a, b) => a.yPos - b.yPos);

        // 计算每个标签的最终Y位置（在符号右侧，可能需要垂直错开）
        for (let i = 0; i < labels.length; i++) {
          // 基础位置与数据点同高
          let finalY = labels[i].yPos + 5;

          // 检查与之前标签是否重叠
          for (let j = 0; j < i; j++) {
            const prevLabelY = labels[j].finalY;
            // 如果当前标签与之前标签重叠，往下移动
            if (Math.abs(finalY - prevLabelY) < labelHeight) {
              finalY = prevLabelY + labelHeight;
            }
          }

          labels[i].finalY = finalY;
        }
      });

      // 绘制所有数据标签（在标签层中，确保在曲线上方）
      allLabels.forEach(label => {
        const labelX = label.xPos + 12; // 在符号右侧
        const labelY = label.finalY - 2;

        // 先绘制背景矩形
        labelLayer.append('rect')
          .attr('x', labelX - 2)
          .attr('y', labelY - 12)
          .attr('width', 26)
          .attr('height', 15)
          .attr('fill', 'rgba(255, 255, 255, 0.8)')
          .attr('rx', 2)
          .style('pointer-events', 'none');

        // 绘制数据标签
        labelLayer.append('text')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'start')
          .attr('font-size', '14px')
          .attr('fill', '#333')
          .attr('font-weight', 'bold')
          .style('pointer-events', 'none')
          .text(label.y);
      });

    } catch (error) {
      console.error('绘制三维水平变化折线图时出错:', error);
    }
  },

  // 显示折线图工具提示
  showLineTooltip(event, question, dimension, value) {
    const tooltip = d3.select('body')
      .selectAll('#bloom-tooltip')
      .data([1])
      .join('div')
      .attr('id', 'bloom-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.9)')
      .style('color', 'white')
      .style('padding', '12px')
      .style('border-radius', '6px')
      .style('font-size', '13px')
      .style('z-index', '1000')
      .style('pointer-events', 'none');

    tooltip.html(`
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">
        ${question}
      </div>
      <div>
        <span style="display: inline-block; width: 12px; height: 12px; background: ${LINE_COLORS[dimension]}; margin-right: 5px;"></span>
        <strong>${dimension}:</strong> ${value}
      </div>
    `);

    const [x, y] = d3.pointer(event, document.body);
    tooltip
      .style('left', (x + 10) + 'px')
      .style('top', (y - 10) + 'px')
      .style('opacity', 0)
      .transition()
      .duration(200)
      .style('opacity', 1);
  },

  // 显示工具提示
  showTooltip(event, phaseName, category, count, dataset) {
    const tooltip = d3.select('body')
      .selectAll('#bloom-tooltip')
      .data([1])
      .join('div')
      .attr('id', 'bloom-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.9)')
      .style('color', 'white')
      .style('padding', '12px')
      .style('border-radius', '6px')
      .style('font-size', '13px')
      .style('z-index', '1000')
      .style('pointer-events', 'none');

    tooltip.html(`
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">
        ${phaseName} - ${dataset}
      </div>
      <div>
        <span style="display: inline-block; width: 12px; height: 12px; background: ${BLOOM_COLORS[category]}; margin-right: 5px;"></span>
        <strong>${category}:</strong> ${count} 个问题
      </div>
    `);

    const [x, y] = d3.pointer(event, document.body);
    tooltip
      .style('left', (x + 10) + 'px')
      .style('top', (y - 10) + 'px')
      .style('opacity', 0)
      .transition()
      .duration(200)
      .style('opacity', 1);
  },

  // 隐藏工具提示
  hideTooltip() {
    d3.select('#bloom-tooltip')
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove();
  }
});

onMounted(() => {
  nextTick(() => {
    methods.drawBloomComparison();
    methods.drawQualityLineChart();
  });

  // 使用 ResizeObserver 监听容器大小变化
  if (container.value) {
    resizeObserver = new ResizeObserver(() => {
      if (methods.resizeTimer) {
        clearTimeout(methods.resizeTimer);
      }
      methods.resizeTimer = setTimeout(() => {
        methods.drawBloomComparison();
        methods.drawQualityLineChart();
      }, 150);
    });
    resizeObserver.observe(container.value);
  }
});

onBeforeUnmount(() => {
  // 清理 ResizeObserver
  if (resizeObserver && container.value) {
    resizeObserver.unobserve(container.value);
    resizeObserver.disconnect();
  }
  // 清理定时器
  if (methods.resizeTimer) {
    clearTimeout(methods.resizeTimer);
  }
});
</script>

<template>
  <div class="bloom-comparison-wrapper">
    <div class="bloom-comparison-container" ref="container">
      <!-- 柱状图将通过D3.js渲染到这里 -->
    </div>
    <div class="quality-line-chart-container" ref="lineChartContainer">
      <!-- 折线图将通过D3.js渲染到这里 -->
    </div>
  </div>
</template>

<style scoped>
.bloom-comparison-wrapper {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  overflow: auto;
  box-sizing: border-box;
}

.bloom-comparison-container {
  flex: 1;
  min-height: 350px;
  width: 100%;
  position: relative;
  background: #ffffff;
  border-radius: 4px;
  box-sizing: border-box;
}

.quality-line-chart-container {
  flex: 1;
  min-height: 350px;
  width: 80%;
  position: relative;
  background: #ffffff;
  border-radius: 4px;
  box-sizing: border-box;
}

/* 坐标轴样式 */
:deep(.x-axis path),
:deep(.y-axis path),
:deep(.x-axis line),
:deep(.y-axis line) {
  stroke: #666;
  stroke-width: 1;
}

:deep(.x-axis text),
:deep(.y-axis text) {
  fill: #333;
  font-size: 14px;
}

/* 工具提示样式 */
:deep(#bloom-tooltip) {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  font-family: 'Microsoft YaHei', sans-serif;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .bloom-comparison-wrapper {
    padding: 2px;
  }
}
</style>
