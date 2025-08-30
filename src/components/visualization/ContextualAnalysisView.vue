<script setup>
import { defineComponent, reactive, onMounted, ref, toRefs, effect, nextTick, onUnmounted } from "vue";
import * as d3 from 'd3';
import {
  MIDDLE_COLUMN_WIDTH_COEFFICIENT, BLOOM_CLASS, BLOOM_DICT,
  BLOOM_REMEMBER, BLOOM_UNDERSTAND, BLOOM_APPLY, BLOOM_ANALYZE, BLOOM_EVALUATE, BLOOM_CREATE, BLOOM_OTHERS,
} from '../../utils/const'
import { getLessonMinute, length } from '../../utils/tools'

// 引入数据
import sentimentData from '../../data/analyze_sentiment.json';
import questionChainsData from '../../data/structured_question_chains.json';
import classStructure from '../../data/class_structure.json';

// 提取chains数组
const questionChains = questionChainsData.chains || [];

// 修改引用名称
const qMap2 = ref(null);

// 添加调试输出
console.log('情感数据文件加载:', sentimentData ? '成功' : '失败',
  Array.isArray(sentimentData) ? `(${sentimentData.length}条记录)` : '');

const state = reactive({
  id: 0,
  sentimentData: [],
  // 更温和的颜色方案
  sentimentColors: {
    // '积极': '#92CC76', // 温和的橄榄绿
    // '中性': '#FAC858', // 温和的淡黄色
    // '消极': '#EF6666',  // 温和的印度红    
    '高情境化': '#92CC76', // 温和的橄榄绿
    '中情境化': '#FAC858', // 温和的淡黄色
    '无情境化': '#EF6666'  // 温和的印度红
  }
});
const sentiment2context = {
  "积极": "高情境化",
  "中性": "中情境化",
  "消极": "无情境化"
}

const methods = reactive({
  // 提取QuestionStringView中显示的所有问题
  extractDisplayedQuestions: function() {
    const allDisplayedQuestions = [];
    
    // 遍历每个教学环节
    classStructure.child.forEach((phase, phaseIndex) => {
      const beginTime = phase.beginTime || 0;
      const endTime = phaseIndex < classStructure.child.length - 1 
        ? classStructure.child[phaseIndex + 1].beginTime 
        : 3000;
      
      // 找出属于该环节的问题链
      const phaseChains = questionChains.filter(chain => 
        chain.timeline.start >= beginTime && chain.timeline.start < endTime
      );
      
      // 检查是否有第二级child
      if (phase.child && phase.child.length > 0) {
        const numChainsNeeded = phase.child.length;
        
        // 如果实际问题链数量不足，需要拆分现有问题链
        if (phaseChains.length < numChainsNeeded && phaseChains.length > 0) {
          const mainChain = phaseChains[0];
          const questionsPerChild = Math.ceil(mainChain.questions.length / numChainsNeeded);
          
          phase.child.forEach((subPhase, subIndex) => {
            const startIdx = subIndex * questionsPerChild;
            const endIdx = Math.min(startIdx + questionsPerChild, mainChain.questions.length);
            let virtualQuestions = mainChain.questions.slice(startIdx, endIdx);
            
            // 确保每个虚拟链至少有2个问题
            if (virtualQuestions.length < 2) {
              const minQuestions = Math.min(2, mainChain.questions.length);
              if (virtualQuestions.length === 0) {
                virtualQuestions = mainChain.questions.slice(0, minQuestions);
              } else if (virtualQuestions.length === 1) {
                const nextIdx = Math.min(endIdx, mainChain.questions.length - 1);
                if (nextIdx > startIdx) {
                  virtualQuestions.push(mainChain.questions[nextIdx]);
                } else if (startIdx > 0) {
                  virtualQuestions.unshift(mainChain.questions[startIdx - 1]);
                }
              }
            }
            
            // 获取这个虚拟链的所有要显示的问题（与QuestionStringView逻辑一致）
            let importantQuestions = virtualQuestions
              .filter(q => q.valueScore >= 2.0)
              .sort((a, b) => b.valueScore - a.valueScore)
              .slice(0, 5);
            
            const minQuestionsRequired = Math.min(2, virtualQuestions.length);
            if (importantQuestions.length < minQuestionsRequired) {
              importantQuestions = virtualQuestions
                .sort((a, b) => b.valueScore - a.valueScore)
                .slice(0, Math.max(minQuestionsRequired, Math.min(5, virtualQuestions.length)));
            }
            
            // 按时间排序后添加所有问题
            if (importantQuestions.length >= 2) {
              importantQuestions.sort((a, b) => a.beginTime - b.beginTime);
              allDisplayedQuestions.push(...importantQuestions);
            }
          });
        } else {
          // 有足够的问题链，按原逻辑处理
          const topChains = phaseChains
            .sort((a, b) => b.characteristics.avgValueScore - a.characteristics.avgValueScore)
            .slice(0, numChainsNeeded);
          
          topChains.forEach(chain => {
            let importantQuestions = chain.questions
              .filter(q => q.valueScore >= 2.0)
              .sort((a, b) => b.valueScore - a.valueScore)
              .slice(0, 5);
            
            const minQuestionsRequired = Math.min(2, chain.questions.length);
            if (importantQuestions.length < minQuestionsRequired) {
              importantQuestions = chain.questions
                .sort((a, b) => b.valueScore - a.valueScore)
                .slice(0, Math.max(minQuestionsRequired, Math.min(5, chain.questions.length)));
            }
            
            // 按时间排序后添加所有问题
            if (importantQuestions.length >= 2) {
              importantQuestions.sort((a, b) => a.beginTime - b.beginTime);
              allDisplayedQuestions.push(...importantQuestions);
            }
          });
        }
      }
    });
    
    console.log('QuestionStringView中显示的问题总数:', allDisplayedQuestions.length);
    return allDisplayedQuestions;
  },
  
  visTeachingProcedures() {
    console.log('开始绘制图表...');
    if (!qMap2.value) {
      console.error('qMap2元素不存在');
      return;
    }

    // 清空现有内容
    d3.select(qMap2.value).selectAll("*").remove();

    // 提取QuestionStringView中显示的问题
    const displayedQuestions = methods.extractDisplayedQuestions();
    console.log('从QuestionStringView提取的问题总数:', displayedQuestions.length);

    // 从sentimentData中找到对应的问题并获取情境化信息
    const data = displayedQuestions
      .map(question => {
        // 在sentimentData中查找匹配的问题
        const sentimentItem = sentimentData.find(item => 
          item.question === question.question && 
          Math.abs(item.beginTime - question.beginTime) < 5 // 允许5秒的时间误差
        );
        
        if (sentimentItem && sentimentItem.question_sentiment) {
          return {
            time: question.beginTime || 0,
            timeInMinutes: (question.beginTime || 0) / 60,
            score: sentimentItem.question_sentiment.score || 0,
            classification: sentimentItem.question_sentiment.classification || '中性',
            question: question.question || '',
            valueScore: question.valueScore || 0
          };
        }
        return null;
      })
      .filter(item => item !== null)
      .sort((a, b) => a.time - b.time); // 确保按时间排序

    console.log('成功匹配情境化数据的问题数:', data.length);
    console.log('数据匹配率:', (data.length / displayedQuestions.length * 100).toFixed(1) + '%');

    if (data.length === 0) {
      console.error('处理后数据为空');
      return;
    }

    state.sentimentData = data;

    // 设置图表尺寸
    const width = qMap2.value.clientWidth || 600;
    const height = qMap2.value.clientHeight || 400;
    console.log('图表尺寸:', width, height);

    if (width <= 0 || height <= 0) {
      console.error('容器尺寸无效:', width, height);
      setTimeout(() => {
        methods.visTeachingProcedures(); // 稍后重试
      }, 500);
      return;
    }

    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 创建SVG
    const svg = d3.select(qMap2.value)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // 创建图表容器
    const chart = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 创建X轴比例尺（分钟）
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.timeInMinutes) * 1.05 || 10]) // 扩展一点范围
      .range([0, innerWidth]);

    // 创建Y轴比例尺（情感分数）
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);

    // 创建X轴并添加箭头
    chart.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .call(g => {
        g.select(".domain").remove(); // 移除默认轴线

        // 添加轴线和箭头
        g.append("path")
          .attr("stroke", "currentColor")
          .attr("stroke-width", 1.5)
          .attr("d", `M0,0H${innerWidth}`)
          .attr("marker-end", "url(#arrow)");
      })
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .text("时间（分钟）");

    // 创建Y轴并添加箭头
    chart.append("g")
      .call(d3.axisLeft(yScale))
      .call(g => {
        g.select(".domain").remove(); // 移除默认轴线

        // 添加轴线和箭头
        g.append("path")
          .attr("stroke", "currentColor")
          .attr("stroke-width", 1.5)
          .attr("d", `M0,${innerHeight}V0`)
          .attr("marker-end", "url(#arrow)");
      })
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -innerHeight / 2)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .text("情境化程度");
      // .text("情感分数");

    // 为坐标轴定义箭头
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 5)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "currentColor")
      .attr("d", "M0,-5L10,0L0,5");

    // 添加标题
    // svg.append("text")
    //   .attr("x", width / 2)
    //   .attr("y", 20)
    //   .attr("text-anchor", "middle")
    //   .style("font-size", "16px")
    //   .style("font-weight", "bold")
    //   .text("课堂问题情感分析");

    // 创建提示框 - 改为添加到body
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "sentiment-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "8px")
      .style("padding", "12px")
      .style("pointer-events", "none")
      .style("z-index", 1000);

    // 定义渐变颜色的线条
    const line = d3.line()
      .x(d => xScale(d.timeInMinutes))
      .y(d => yScale(d.score))
      .curve(d3.curveMonotoneX); // 使用单调曲线，平滑但保持单调性

    // 创建渐变色定义
    const gradientId = "line-gradient";
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", innerHeight)
      .attr("x2", 0)
      .attr("y2", 0);

    // 添加渐变色停止点
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", state.sentimentColors['无情境化']);
      // .attr("stop-color", state.sentimentColors['消极']);

    gradient.append("stop")
      .attr("offset", "50%")
      .attr("stop-color", state.sentimentColors['中情境化']);
      // .attr("stop-color", state.sentimentColors['中性']);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", state.sentimentColors['高情境化']);
      // .attr("stop-color", state.sentimentColors['积极']);

    // 绘制曲线
    chart.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", `url(#${gradientId})`)
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", line);

    // 绘制散点图
    chart.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.timeInMinutes))
      .attr("cy", d => yScale(d.score))
      .attr("r", 6)
      // .attr("fill", d => state.sentimentColors[d.classification])
      .attr("fill", d => state.sentimentColors[sentiment2context[d.classification]])
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.9)
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("r", 8)
          .attr("stroke-width", 2);

        // 显示提示框
        tooltip
          .style("opacity", 1)
          .html(`
            <div style="margin-bottom:5px;font-weight:bold;">问题详情</div>
            <div style="margin-bottom:3px;">问题：${d.question.substring(0, 30)}${d.question.length > 30 ? '...' : ''}</div>
            <div style="margin-bottom:3px;">情境化水平：${sentiment2context[d.classification]}</div>
            <div style="margin-bottom:3px;">情境化分数：${d.score.toFixed(2)}</div>
            <div style="margin-bottom:3px;">价值分数：${d.valueScore ? d.valueScore.toFixed(2) : 'N/A'}</div>
            <div>时间：${d.timeInMinutes.toFixed(2)}分钟</div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("r", 6)
          .attr("stroke-width", 1.5);

        // 隐藏提示框
        tooltip.style("opacity", 0);
      });

    // 添加图例 - 放在曲线图上方并水平排列
    const legendData = Object.entries(state.sentimentColors);

    // 计算图例总宽度，用于居中定位
    const legendItemWidth = 70; // 每个图例项的宽度
    const legendTotalWidth = legendItemWidth * legendData.length;

    const legend = svg.append("g")
      .attr("transform", `translate(${margin.left + (innerWidth - legendTotalWidth) / 2}, ${margin.top - 30})`);

    legend.selectAll("rect")
      .data(legendData)
      .enter()
      .append("rect")
      .attr("x", (d, i) => i * legendItemWidth)
      .attr("y", 0)
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 3) // 圆角矩形，更现代的感觉
      .attr("fill", d => d[1]);

    legend.selectAll("text")
      .data(legendData)
      .enter()
      .append("text")
      .attr("x", (d, i) => i * legendItemWidth + 16)
      .attr("y", 4)
      .attr("dy", "0.35em") // 垂直居中对齐
      .text(d => d[0])
      .style("font-size", "12px")
      .style("alignment-baseline", "middle");

    // 添加情感分布饼图
    const pieWidth = innerWidth * 0.25;
    const pieHeight = innerHeight * 0.25;
    const pieRadius = Math.min(pieWidth, pieHeight) / 2;
    const pieX = width - pieRadius - margin.right - 20;
    const pieY = height - pieRadius - margin.bottom - 20;

    // 统计各情境化类别的数量
    const sentimentCounts = {};
    data.forEach(d => {
      const contextCategory = sentiment2context[d.classification] || d.classification;
      sentimentCounts[contextCategory] = (sentimentCounts[contextCategory] || 0) + 1;
    });

    const pieData = Object.entries(sentimentCounts).map(([key, value]) => ({
      category: key,
      value: value
    }));

    console.log('饼图数据:', pieData);

    // 创建饼图
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(pieRadius * 0.4) // 使用环形图而不是饼图，更现代
      .outerRadius(pieRadius);

    // 创建用于标签的弧线，半径略小于主弧线
    const labelArc = d3.arc()
      .innerRadius(pieRadius * 0.5)  // 稍微大于内圆半径
      .outerRadius(pieRadius * 0.8); // 稍微小于外圆半径

    const drawPie = () => {
      const pieChart = svg.append("g")
        .attr("transform", `translate(${pieX}, ${pieY})`);

      pieChart.selectAll("path")
        .data(pie(pieData))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => state.sentimentColors[d.data.category])
        .attr("stroke", "white")
        .attr("stroke-width", 2);

      // 添加饼图标题
      svg.append("text")
        .attr("x", pieX)
        .attr("y", pieY - pieRadius - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("情境化分布");

      // 添加饼图中心文字
      pieChart.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(`共${data.length}问`);

      // 判断每个扇形的角度是否足够放置标签
      const isLabelVisible = (d) => (d.endAngle - d.startAngle) > 0.4; // 约23度

      // 添加饼图标签（类型）- 只在足够大的扇形中显示
      pieChart.selectAll("text.label")
        .data(pie(pieData))
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("transform", d => {
          if (isLabelVisible(d)) {
            const centroid = labelArc.centroid(d);
            return `translate(${centroid[0]}, ${centroid[1]})`;
          } else {
            return "translate(-1000,-1000)"; // 如果扇形太小，将标签移出视野
          }
        })
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text(d => `${d.data.category}`);

      // 添加数量标签（第二行）- 只在足够大的扇形中显示
      pieChart.selectAll("text.value")
        .data(pie(pieData))
        .enter()
        .append("text")
        .attr("class", "value")
        .attr("transform", d => {
          if (isLabelVisible(d)) {
            const centroid = labelArc.centroid(d);
            return `translate(${centroid[0]}, ${centroid[1] + 12})`;
          } else {
            return "translate(-1000,-1000)"; // 如果扇形太小，将标签移出视野
          }
        })
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#333")
        .text(d => `${d.data.value}`);

      // 为太小无法显示标签的扇形添加连线和外部标签
      pieChart.selectAll("g.small-slice-label")
        .data(pie(pieData).filter(d => !isLabelVisible(d)))
        .enter()
        .append("g")
        .attr("class", "small-slice-label")
        .each(function (d) {
          const g = d3.select(this);
          const pos = arc.centroid(d);
          const angleRad = (d.startAngle + d.endAngle) / 2;
          const angleDeg = (angleRad * 180 / Math.PI) % 360;

          // 确定标签方向（左侧还是右侧）
          const isRight = angleDeg >= 270 || angleDeg <= 90;
          const labelX = isRight ? pieRadius * 1.2 : -pieRadius * 1.2;

          // 添加连接线
          g.append("line")
            .attr("x1", pos[0])
            .attr("y1", pos[1])
            .attr("x2", labelX * 0.7)
            .attr("y2", pos[1])
            .attr("stroke", "#999")
            .attr("stroke-width", 1);

          // 添加类别标签
          g.append("text")
            .attr("x", labelX)
            .attr("y", pos[1])
            .attr("dy", "-0.3em")
            .attr("text-anchor", isRight ? "start" : "end")
            .style("font-size", "10px")
            .style("font-weight", "bold")
            .text(d.data.category);

          // 添加数量标签
          g.append("text")
            .attr("x", labelX)
            .attr("y", pos[1])
            .attr("dy", "1em")
            .attr("text-anchor", isRight ? "start" : "end")
            .style("font-size", "9px")
            .text(d.data.value);
        });

    }
    // 创建饼图容器

    console.log('图表渲染完成');
  }
});

onMounted(() => {
  // 确保DOM渲染完成后再绘制
  nextTick(() => {
    methods.visTeachingProcedures();
  });

  // 窗口大小变化时重新绘制
  window.addEventListener('resize', methods.visTeachingProcedures);
});

// 在组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('resize', methods.visTeachingProcedures);
  // 移除可能残留的tooltip
  d3.selectAll('.sentiment-tooltip').remove();
});
</script>

<template>
  <div class="item" ref="qMap2">
  </div>
</template>

<style>
/* 全局样式，不使用scoped */
.sentiment-tooltip {
  position: absolute;
  z-index: 1000;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  pointer-events: none;
  font-size: 12px;
  /* box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); */
}
</style>

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

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  color: #666;
}
</style>
