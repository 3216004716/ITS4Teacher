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

// 修改引用名称
const qMap2 = ref(null);

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

  // 绘制弦图
  drawChordDiagram();
};

// 绘制弦图
const drawChordDiagram = () => {
  // 确保DOM元素已经挂载
  if (!qMap2.value) return;

  // 清除之前的可视化
  d3.select(qMap2.value).selectAll('*').remove();

  // 设置图表尺寸
  const width = qMap2.value.clientWidth || 700;
  const height = qMap2.value.clientHeight || 700;
  const margin = { top: 20, right: 120, bottom: 30, left: 120 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // 创建SVG容器
  const svg = d3.select(qMap2.value)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // 使用更现代的配色方案
  const modernColors = [
    "#3498db", // 蓝色
    "#9b59b6", // 紫色
    "#2ecc71", // 绿色
    "#e74c3c", // 红色
    "#f39c12", // 橙色
    "#1abc9c", // 青绿色
    "#34495e"  // 深蓝灰色
  ];

  // 创建颜色比例尺
  const color = d3.scaleOrdinal()
    .domain(d3.range(7))
    .range(modernColors);

  // 创建垂直比例尺
  const nodeScale = d3.scaleLinear()
    .domain([0, state.names.length - 1])
    .range([0, innerHeight]);

  // 增大节点半径
  const nodeRadius = Math.min(innerHeight / state.names.length * 0.5, 50);

  // 计算总连接数和每个节点的输入/输出总数
  let totalConnections = 0;
  const nodeOutgoing = new Array(state.matrix.length).fill(0);
  const nodeIncoming = new Array(state.matrix.length).fill(0);

  for (let i = 0; i < state.matrix.length; i++) {
    for (let j = 0; j < state.matrix[i].length; j++) {
      const value = state.matrix[i][j];
      totalConnections += value;
      nodeOutgoing[i] += value;
      nodeIncoming[j] += value;
    }
  }

  // 创建弦连接（先绘制弦，确保在节点下方）
  const chordsGroup = svg.append("g")
    .attr("class", "chords");

  // 箭头容器（将在弦的上方，节点的下方绘制箭头）
  const arrowsGroup = svg.append("g")
    .attr("class", "arrows");

  // 存储所有连接的引用
  const chordPaths = [];

  for (let source = 0; source < state.matrix.length; source++) {
    chordPaths[source] = [];

    for (let target = 0; target < state.matrix[source].length; target++) {
      const value = state.matrix[source][target];
      if (value > 0) {
        // 计算连接的宽度，基于连接值与总连接数的比例
        const linkWidth = Math.max(1, Math.sqrt(value / totalConnections) * 30);

        // 计算起点和终点
        const sourceY = nodeScale(source) + nodeRadius / 2;
        const targetY = nodeScale(target) + nodeRadius / 2;
        const sourceX = innerWidth / 2;

        // 创建弧路径
        const path = chordsGroup.append("path")
          .attr("class", `chord source-${source} target-${target}`)
          .attr("d", () => {
            // 计算控制点，根据方向调整曲线形状
            let controlX1, controlX2;

            if (source === target) {
              // 自循环
              const offset = nodeRadius * 3;
              return `M ${sourceX} ${sourceY} 
                      C ${sourceX + offset} ${sourceY - offset}, 
                        ${sourceX + offset} ${sourceY + offset}, 
                        ${sourceX} ${sourceY}`;
            } else {
              // 普通连接
              const distance = Math.abs(targetY - sourceY);
              const spread = Math.min(innerWidth * 0.4, distance * 1.5);
              controlX1 = source < target ? sourceX - spread : sourceX + spread;
              controlX2 = source < target ? sourceX - spread : sourceX + spread;

              return `M ${sourceX} ${sourceY} 
                      C ${controlX1} ${sourceY}, 
                        ${controlX2} ${targetY}, 
                        ${sourceX} ${targetY}`;
            }
          })
          .attr("fill", "none")
          .attr("stroke", d3.rgb(color(source)).brighter(0.3))
          .attr("stroke-width", linkWidth)
          .attr("opacity", 0.6)
          .attr("stroke-linecap", "round")
          .attr("data-source", source)
          .attr("data-target", target)
          .attr("data-value", value);

        // 存储路径引用
        chordPaths[source][target] = path;

        // 只为非自循环的连接添加箭头
        if (source !== target) {
          // 为贝塞尔曲线计算更精确的中点位置
          const distance = Math.abs(targetY - sourceY);
          const spread = Math.min(innerWidth * 0.4, distance * 1.5);

          // 计算弦的中点（贝塞尔曲线参数t=0.5的点）
          // 对于三次贝塞尔曲线，中点是由控制点和起终点共同决定的
          let middleX, middleY;

          // 计算控制点
          const controlX1 = source < target ? sourceX - spread : sourceX + spread;
          const controlY1 = sourceY;
          const controlX2 = source < target ? sourceX - spread : sourceX + spread;
          const controlY2 = targetY;

          // 参数t=0.5时的贝塞尔曲线点（三次贝塞尔曲线）
          const t = 0.5;
          const mt = 1 - t;

          // 计算贝塞尔曲线在t=0.5时的坐标点
          middleX = mt * mt * mt * sourceX + 3 * mt * mt * t * controlX1 + 3 * mt * t * t * controlX2 + t * t * t * sourceX;
          middleY = mt * mt * mt * sourceY + 3 * mt * mt * t * controlY1 + 3 * mt * t * t * controlY2 + t * t * t * targetY;

          // 修正计算中的错误 - 曲线终点应该是targetY对应的X坐标
          if (Math.abs(middleY - (sourceY + targetY) / 2) > 20) {
            // 如果计算的中点Y值偏差较大，使用简单的线性插值
            middleX = sourceX; // X坐标保持不变，因为弦是垂直排列的
            middleY = (sourceY + targetY) / 2;
          }

          // 计算箭头的角度和大小
          // 在t=0.5处的切线方向
          const tangentX = 3 * mt * mt * (controlX1 - sourceX) +
            6 * mt * t * (controlX2 - controlX1) +
            3 * t * t * (sourceX - controlX2);
          const tangentY = 3 * mt * mt * (controlY1 - sourceY) +
            6 * mt * t * (controlY2 - controlY1) +
            3 * t * t * (targetY - controlY2);

          // 从切线计算角度
          const angle = Math.atan2(tangentY, tangentX) * (180 / Math.PI);

          // 箭头大小基于线宽，但有最小和最大限制
          const arrowSize = Math.max(10, Math.min(15, linkWidth * 1));
          const arrowWidth = arrowSize * 0.8;

          // 创建箭头容器
          const arrowContainer = arrowsGroup.append("g")
            .attr("class", `arrow-container source-${source} target-${target}`)
            .attr("transform", `translate(${middleX}, ${middleY}) rotate(${angle})`);

          // 创建箭头
          arrowContainer.append("path")
            .attr("class", `arrow source-${source} target-${target}`)
            .attr("d", `M${-arrowWidth / 2},-${arrowSize / 2}L${arrowWidth / 2},0L${-arrowWidth / 2},${arrowSize / 2}Z`) // 调整的三角形比例
            .attr("fill", d3.rgb(color(source)).darker(0.2)) // 稍微深一点的颜色
            .attr("stroke", d3.rgb(color(source)).darker(0.5)) // 添加一点边框
            .attr("stroke-width", 0.5)
            .attr("opacity", 1)
            .attr("data-source", source)
            .attr("data-target", target);
        }
      }
    }
  }

  // 节点组（在弦和箭头的上方绘制节点）
  const nodesGroup = svg.append("g")
    .attr("class", "nodes");

  const nodes = nodesGroup.selectAll(".node")
    .data(state.names)
    .enter()
    .append("g")
    .attr("class", (d, i) => `node node-${i}`)
    .attr("transform", (d, i) => `translate(${innerWidth / 2}, ${nodeScale(i) + nodeRadius / 2})`)
    .style("cursor", "pointer");

  // 绘制节点圆形
  nodes.append("circle")
    .attr("r", nodeRadius)
    .attr("fill", (d, i) => color(i))
    .attr("stroke", (d, i) => d3.rgb(color(i)).darker())
    .attr("stroke-width", 2)
    .style("filter", "drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.3))")
    .on("mouseover", handleNodeMouseOver)
    .on("mouseout", handleNodeMouseOut)
    .on("click", handleNodeClick);

  // 添加节点标签
  nodes.append("text")
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-weight", "bold")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .text(d => d);

  // // 添加图表标题
  // svg.append("text")
  //   .attr("x", innerWidth / 2)
  //   .attr("y", -20)
  //   .attr("text-anchor", "middle")
  //   .style("font-size", "16px")
  //   .style("font-weight", "bold")
  //   .text("布鲁姆分类转换关系图");

  // 交互处理函数
  function handleNodeMouseOver(event, d, i) {
    const nodeIndex = parseInt(d3.select(this.parentNode).attr("class").split("node-")[1]);

    // 降低所有连接的不透明度
    chordsGroup.selectAll("path.chord")
      .transition()
      .duration(200)
      .attr("opacity", 0.1);

    arrowsGroup.selectAll(".arrow-container")
      .transition()
      .duration(200)
      .attr("opacity", 0.1);

    // 高亮与该节点相关的所有连接
    chordsGroup.selectAll(`.source-${nodeIndex}, .target-${nodeIndex}`)
      .transition()
      .duration(200)
      .attr("opacity", 0.9);

    arrowsGroup.selectAll(`.source-${nodeIndex}, .target-${nodeIndex}`)
      .transition()
      .duration(200)
      .attr("opacity", 1);

    // 放大当前节点
    d3.select(this)
      .transition()
      .duration(200)
      .attr("r", nodeRadius * 1.1)
      .style("filter", "drop-shadow(0px 3px 5px rgba(0, 0, 0, 0.4))");
  }

  function handleNodeMouseOut(event, d) {
    // 恢复所有连接的不透明度
    chordsGroup.selectAll("path.chord")
      .transition()
      .duration(200)
      .attr("opacity", 0.6);

    arrowsGroup.selectAll(".arrow-container")
      .transition()
      .duration(200)
      .attr("opacity", 1);

    // 恢复节点大小
    d3.select(this)
      .transition()
      .duration(200)
      .attr("r", nodeRadius)
      .style("filter", "drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.3))");
  }

  function handleNodeClick(event, d) {
    // 点击时的交互，可以在这里添加更多的功能
    console.log(`Clicked on node: ${d}`);
  }
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
