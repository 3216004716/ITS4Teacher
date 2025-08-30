<script setup>
import { defineComponent, reactive, onMounted, ref, toRefs, effect, nextTick } from "vue";
import HeaderView from "./HeaderView.vue";
// import * as Plot from "@observablehq/plot";
import * as d3 from 'd3';
// import { legend } from "@d3/color-legend"
import {
  MIDDLE_COLUMN_WIDTH_COEFFICIENT, BLOOM_CLASS, BLOOM_DICT,
  BLOOM_REMEMBER, BLOOM_UNDERSTAND, BLOOM_APPLY, BLOOM_ANALYZE, BLOOM_EVALUATE, BLOOM_CREATE, BLOOM_OTHERS,
} from '../utils/const'
import { getLessonMinute, length } from '../utils/tools'
import ClassStructureView from './visualization/ClassStructureView.vue';
import InteractionView from './visualization/InteractionView.vue';
import QuestionStringView from './visualization/QuestionStringView.vue';
import CoherenceView from './visualization/CoherenceView.vue';
import ContextualAnalysisView from './visualization/ContextualAnalysisView.vue';

const qMap2 = ref();
const classStructure = ref();
const qBloom = ref();
const qInteract = ref();
const qDistribution = ref(null);
const efficientA = 0.2

const state = reactive({
  id: 0,
  currentQ: "你认为英雄应该具有什么样的品质？",
  procedures: [
    {
      index: 0,
      theme: "语文新授课",
      name: "导入",
      duration: 5
    },
    {
      index: 1,
      theme: "语文新授课",
      name: "讲授",
      duration: 20
    },
    {
      index: 2,
      theme: "语文新授课",
      name: "练习",
      duration: 12
    },
    {
      index: 3,
      theme: "语文新授课",
      name: "总结",
      duration: 8
    },
  ],
  lessonTheme: "语文新授课",
  questionList: [
    {
      content: "从表格中你能获得哪些数学信息？",
      _4mat: "是何",
      bloom: "分析",
      isResponsed: true,
      feedback: "",
      startTime: "01:30:00"
    },
    {
      content: "好的，你能具体的给小朋友说说他几分钟画了多少个字母吗？",
      _4mat: "如何",
      bloom: "应用",
      isResponsed: true,
      feedback: "鼓励性",
      startTime: "13:25:25"
    },
    {
      content: "好，我们来看一下这个小朋友是用什么方法来比较？",
      _4mat: "如何",
      bloom: "理解",
      isResponsed: true,
      feedback: "",
      startTime: "16:25:25"
    },
    {
      content: "小巧每分钟到底发送多少个字呢？",
      _4mat: "是何",
      bloom: "记忆",
      isResponsed: true,
      feedback: "评价性",
      startTime: "16:37:25"
    },
    {
      content: "现在谁发送的最快？",
      _4mat: "是何",
      bloom: "分析",
      isResponsed: true,
      feedback: "",
      startTime: "17:00:25"
    },
    {
      content: "你们俩是怎么交流的？",
      _4mat: "如何",
      bloom: "理解",
      isResponsed: true,
      feedback: "",
      startTime: "17:12:25"
    },
    {
      content: "那刚才你算过吗？",
      _4mat: "其他",
      bloom: "应用",
      isResponsed: false,
      feedback: "",
      startTime: "17:30:25"
    },
    {
      content: "好，有没有比较方法不一样的？",
      _4mat: "如何",
      bloom: "其他",
      isResponsed: true,
      feedback: "",
      startTime: "18:35:25"
    },
    {
      content: "你是怎么比较的？",
      _4mat: "如何",
      bloom: "分析",
      isResponsed: true,
      feedback: "鼓励性",
      startTime: "26:25:25"
    },
    {
      content: "你的比较方法和他一样吗？",
      _4mat: "如何",
      bloom: "评价",
      isResponsed: true,
      feedback: "指导性",
      startTime: "26:40:25"
    },
    {
      content: "能不计算直接比较吗？",
      _4mat: "如何",
      bloom: "创造",
      isResponsed: true,
      feedback: "指导性",
      startTime: "26:55:25"
    },
    {
      content: "需要算什么？",
      _4mat: "其他",
      bloom: "应用",
      isResponsed: true,
      feedback: "指导性",
      startTime: "26:55:25"
    },
  ],
});
const methods = reactive({
  visStackedBar() {
    // Specify the chart’s dimensions (except for the height).
    const column_width = window.innerWidth * MIDDLE_COLUMN_WIDTH_COEFFICIENT
    const marginTop = 10
    const marginRight = 10
    const marginBottom = 40
    const marginLeft = 75
    const stackDimension = [state.lessonTheme]

    // 按照"每节课(theme)"，在"环节(name)"这个维度，把"时间(duration)"堆叠起来
    // 因为是按照"环节(name)"叠加，所以key是name

    const series = d3.stack()
      .keys(d3.union(state.procedures.map(d => d.name)))
      .value(([, group], key) => group.get(key).duration)
      (d3.index(state.procedures, d => d.theme, d => d.name))

    const width = column_width - marginRight - marginLeft
    const bandwidth = 25;
    const height = bandwidth * stackDimension.length + marginTop + marginBottom

    // Prepare the scales for positional and color encodings.
    const x = d3.scaleLinear()
      .domain([0, d3.sum(state.procedures, d => d.duration)])
      // .domain([0, series, d => d3.max(d, d => d[1])])
      .range([marginLeft, column_width - marginRight]);

    const y = d3.scaleBand()
      .domain(stackDimension)
      .range([marginTop, height - marginBottom])
      .padding(0.08);

    // 多行堆叠
    // const y = d3.scaleBand()
    //   .domain(d3.groupSort(data, D => -d3.sum(D, d => d.population), d => d.state)) // 要多行堆叠的话，要传的是一个数组：["CA", "TX", "FL", "NY", "IL", "PA", "OH", "GA", "NC", "MI"]
    //   .range([marginTop, height - marginBottom])
    //   .padding(0.08);

    const color = d3.scaleOrdinal()
      .domain(series.map(d => d.key))
      .range(d3.schemeGnBu[series.length])
      .unknown("#ccc");

    const svgDistribution = d3.select(qDistribution.value)
      .attr("width", column_width)
      .attr("height", height)
      .attr("viewBox", [0, 0, column_width, height])
      .attr("style", "max-width: 100%; height: auto;");

    svgDistribution.append("g")
      .attr("id", "g-rect")
      .selectAll()
      // data join
      .data(series)
      .join("g")
      .attr("fill", d => color(d.key))
      // 绘制矩形
      .selectAll("rect")
      .data(D => D.map(d => (d.key = D.key, d)))
      .join("rect")
      .attr("x", d => x(d[0]))
      .attr("y", d => y(d.data[0]))
      .attr("height", y.bandwidth())
      .attr("width", d => x(d[1]) - x(d[0]))
    // 添加文本标签
    svgDistribution.append("g")
      .attr("id", "g-label")
      .selectAll("text")
      .data(series.map(d => {
        return {
          x1: d[0][0],
          x2: d[0][1],
          theme: state.lessonTheme,
          name: d.key
        }
      }))
      .join("text")
      .attr("transform", d => `translate(${x(d.x1) + (x(d.x2) - x(d.x1)) / 2}, ${15 + y(d.theme)})`)
      .text(d => d.name)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)


    // Append the horizontal axis.
    svgDistribution.append("g")
      .attr("id", "g-xAxis")
      .attr("transform", `translate(0, ${35})`)
      .call(d3.axisBottom(x).ticks((width + 5) / 45, "s"))
      .call(g => g.selectAll(".domain").remove());
    svgDistribution.append("g")
      .attr("id", "g-xAxis-name")
      .append("text")
      .attr("transform", `translate(${0.95 * width}, ${65})`)
      .text("Time (minutes) →")
      .attr("font-size", 12)
      .attr("font-weight", 600)

    // Append the vertical axis.
    svgDistribution.append("g")
      .attr("id", "g-yAxis")
      .attr("transform", `translate(${marginLeft}, 0)`)
      .call(d3.axisLeft(y).tickSizeOuter(0))
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .call(g => g.selectAll(".domain").remove());

  },
  visStackedDot() {
    const column_width = window.innerWidth * MIDDLE_COLUMN_WIDTH_COEFFICIENT
    const marginTop = 20
    const marginRight = 10
    const marginBottom = 15
    const marginLeft = 75

    const radius = 5
    const bandwidth = 12;
    let [data, maxCount] = methods.processQuestion()
    const height = bandwidth * maxCount + marginTop + marginBottom

    const svgInteract = d3.select(qInteract.value)
      .attr("width", column_width)
      .attr("height", height)
      .attr("viewBox", [0, 0, column_width, height])
      .attr("style", "max-width: 100%; height: auto;");

    const x = d3.scaleLinear()
      .domain([0, d3.sum(state.procedures, d => d.duration)])
      .range([marginLeft, column_width - marginRight]);

    const y = d3.scaleLinear()
      .domain([1, maxCount])
      .range([height - marginBottom, marginTop])
    // .padding(0.08);

    console.log(y.domain());

    // 先画坐标轴的指标线，否则会挡住图形
    svgInteract.append("g")
      .attr("transform", `translate(${marginLeft}, 0)`)
      .call(d3.axisLeft(y).tickValues(d3.ticks(...y.domain(), 3)).tickFormat(d => d))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").clone()
        .attr("x2", column_width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1))
      .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", 3)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("font-size", 12)
        .text("↑ Number of Questions raised"));

    // svgInteract Q的点
    svgInteract.append("g")
      .attr("id", "g-circles")
      .selectAll()
      // data join
      .data(data)
      .join("g")
      // 绘制矩形
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => x(d.coord[0]) + radius + 2)
      .attr("cy", d => y(d.coord[1]))
      .attr("r", radius)
      // .attr("stroke", "#000")
      // .attr("stroke-width", 2)
      .attr("fill", d => d.isResponsed ? "#EFB118" : "#4269D0")

    methods.visDotLegend(svgInteract, radius)

  },
  visDotLegend(svg, radius) {
    // legend
    const g_legend = svg.append("g")
      .attr("id", "g-legend")
    let legendX = 7
    let firstY = 16
    g_legend.append("circle")
      .attr("cx", legendX)
      .attr("cy", firstY)
      .attr("r", radius)
      // .attr("stroke", "#000")
      // .attr("stroke-width", 2)
      .attr("fill", "#EFB118")
    g_legend.append("text")
      .attr("x", legendX + 5)
      .attr("y", firstY - 8)
      // .attr("transform", `translate(${marginLeft},20)`)
      .selectAll("tspan")
      .data(["has", "response"])
      .enter()
      .append("tspan")
      .attr("x", legendX + 20)
      .attr("dy", "1em")
      .attr("font-size", 12)
      .attr("text-anchor", "middle")
      .text(d => d);

    let secondY = 55
    g_legend.append("circle")
      .attr("cx", legendX)
      .attr("cy", secondY)
      .attr("r", radius)
      // .attr("stroke", "#000")
      // .attr("stroke-width", 2)
      .attr("fill", "#4269D0")
    g_legend.append("text")
      .attr("x", legendX + 45)
      .attr("y", secondY - 8)
      // .attr("transform", `translate(${marginLeft},20)`)
      .selectAll("tspan")
      .data(["has no", "response"])
      .enter()
      .append("tspan")
      .attr("x", legendX + 46)
      .attr("dy", "1em")
      .attr("font-size", 12)
      .attr("text-anchor", "end")
      .text(d => d);
  },
  visQMap() {
    // Specify the chart’s dimensions (except for the height).
    const column_width = window.innerWidth * MIDDLE_COLUMN_WIDTH_COEFFICIENT
    const marginTop = 10
    const marginRight = 10
    const marginBottom = 40
    const marginLeft = 75
    const radius = 5

    const width = column_width - marginRight - marginLeft
    const bandwidth = 40;
    const height = bandwidth * BLOOM_CLASS.length + marginTop + marginBottom

    // Prepare the scales for positional and color encodings.
    const x = d3.scaleLinear()
      .domain([0, d3.sum(state.procedures, d => d.duration)])
      .range([marginLeft, column_width - marginRight]);

    const y = d3.scaleBand()
      .domain(BLOOM_CLASS.reverse())
      .range([marginTop, height - marginBottom])
      .padding(0.08);

    let [data, maxCount] = methods.processQuestion()
    const mapCoord = state.questionList.map((d, i) => {
      return [
        x(data[i].coord[0]),
        y(d.bloom) + marginTop + 1.5 * radius
      ]
    })

    const color = d3.scaleOrdinal()
      .domain(BLOOM_CLASS.reverse())
      // .range(d3.schemeSpectral[BLOOM_CLASS.length])
      .range(d3.schemeRdPu[BLOOM_CLASS.length])
      .unknown("#ccc");

    const line = d3.line()
      .curve(d3.curveStepAfter)
      .x(d => d[0])
      .y(d => d[1])

    const svgBloom = d3.select(qBloom.value)
      .attr("width", column_width)
      .attr("height", height)
      .attr("viewBox", [0, 0, column_width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // 先画坐标轴的指标线，否则会挡住图形
    svgBloom.append("g")
      .attr("transform", `translate(${marginLeft}, 0)`)
      .call(d3.axisLeft(y).tickValues(BLOOM_CLASS).tickFormat(d => d))
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").clone()
        .attr("x2", column_width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1))
      .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", 3)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("font-size", 12)
        .text("↑ Levels of Cognition"));

    const l = length(line(mapCoord));
    svgBloom.append("path")
      .datum(mapCoord)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("stroke-dasharray", `0,${l}`)
      .attr("d", line)
      .transition()
      .duration(5000)
      .ease(d3.easeLinear)
      .attr("stroke-dasharray", `${l},${l}`);

    svgBloom.append("g")
      .attr("id", "g-circle")
      .selectAll()
      // data join
      .data(state.questionList)
      .join("g")
      // .attr("fill", d => color(d.key))
      // 绘制矩形
      .selectAll("circle")
      .data(state.questionList)
      .join("circle")
      .attr("cx", (d, i) => x(data[i].coord[0]))
      .attr("cy", d => y(d.bloom) + marginTop + 1.5 * radius)
      .attr("r", radius)
      .attr("stroke", d => color(d.bloom))
      .attr("stroke-width", 2)
      .attr("fill", "#fff")
      .attr("width", d => x(d[1]) - x(d[0]))

    svgBloom.append("path")

    // Append the horizontal axis.
    svgBloom.append("g")
      .attr("id", "g-xAxis")
      .attr("transform", `translate(0, ${height - marginBottom})`)
      .call(d3.axisBottom(x).ticks((width + 10) / 45, "s"))
      .call(g => g.selectAll(".domain").remove());
    svgBloom.append("g")
      .attr("id", "g-xAxis-name")
      .append("text")
      .attr("transform", `translate(${0.95 * width}, ${height - 8})`)
      .text("Time (minutes) →")
      .attr("font-size", 12)
      .attr("font-weight", 600)

    // Append the vertical axis.
    // svgBloom.append("g")
    //   .attr("id", "g-yAxis")
    //   .attr("transform", `translate(${marginLeft}, 0)`)
    //   .call(d3.axisLeft(y).tickSizeOuter(0))
    //   .attr("font-size", 12)
    //   .attr("font-weight", 600)
    //   .call(g => g.selectAll(".domain").remove());

  },
  processQuestion() {
    let qData2vis = []
    let count = 0
    let currentTime = -1
    let max = 0
    state.questionList.forEach((q) => {
      let time = getLessonMinute(q.startTime)
      if (currentTime != time) {
        currentTime = time
        count = 1
      }
      qData2vis.push({
        coord: [time, count],
        isResponsed: q.isResponsed
      })
      max = count > max ? count : max
      count++
    })
    return [qData2vis, max]
  },
  visTeachingProcedures() {
    // Specify the chart’s dimensions (except for the height).
    methods.visStackedBar()
    methods.visStackedDot()
    methods.visQMap()

  }
});

onMounted(() => {
  methods.visTeachingProcedures();
});


</script>

<template>
  <HeaderView pageTitle="课堂提问分析" />
  <div class="vis" ref="qMap2">
    <div class="visualization-grid">
      <div class="visualization-item">
        <span>课堂结构分析</span>
        <ClassStructureView />
      </div>
      <div class="visualization-item">
        <span>问题连贯性分析</span>
        <CoherenceView />
      </div>
      <div class="visualization-item">
        <!-- <span>师生互动分析</span> -->
        <span>师生互动分析</span>
        <QuestionStringView />
      </div>
      <div class="visualization-item">
        <!-- <span>语言情感分析</span> -->
        <span>问题情境化分析</span>
        <ContextualAnalysisView />
      </div>
    </div>
  </div>
</template>

<style scoped>
.vis {
  height: calc(100% - 28px);
  flex: 1;
  border-left: #d3d3d3 1px solid;
  border-bottom: #d3d3d3 1px solid;
  border-right: #d3d3d3 1px solid;
  padding: 4px;
  overflow: hidden;
}

.visualization-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 4px;
  width: 100%;
  height: 100%;
  border-radius: 4px;

}

.visualization-item {
  border: 1px solid #eaeaea;
  border-radius: 4px;
  /* background-color: #ffffff; */
  /* box-shadow: 0 0 4px rgba(0, 0, 0, 0.05); */
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
span{
  padding: 4px;
  border-radius: 4px 4px 0 0;
  background-color: transparent;
  /* border: 1px solid #eaeaea; */
  font-size: 12px;
  font-weight: 600;
  color: #333;
  width: 100%;
  text-align: center;
  /* box-sizing: border-box; */
}

</style>
