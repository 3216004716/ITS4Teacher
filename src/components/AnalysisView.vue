<script setup>
import { defineComponent, reactive, onMounted, ref, toRefs, effect, nextTick, h } from "vue";
import HeaderView from "./HeaderView.vue";
// import * as Plot from "@observablehq/plot";
import * as d3 from 'd3';
// import { legend } from "@d3/color-legend"
import {
  MIDDLE_COLUMN_WIDTH_COEFFICIENT, BLOOM_CLASS, BLOOM_DICT,
  BLOOM_REMEMBER, BLOOM_UNDERSTAND, BLOOM_APPLY, BLOOM_ANALYZE, BLOOM_EVALUATE, BLOOM_CREATE, BLOOM_OTHERS,
} from '../utils/const'
import { getLessonMinute, length } from '../utils/tools'
import { px2remTransformer } from "ant-design-vue";
import { text } from "@observablehq/plot";

const qMap2 = ref();
const qText = ref();
const qBloom = ref();
const qPyramid = ref();
const qInteract = ref();
const qDistribution = ref(null);
const visWidthoefficient = 0.6
const legendFontSize = 20
const pcHeight = 440
const pageScale = 1

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
    // const column_width = window.innerWidth * 1
    const column_width = window.innerWidth * visWidthoefficient
    const marginTop = 10
    const marginRight = 10
    const marginBottom = 40
    const marginLeft = 130
    const stackDimension = [state.lessonTheme]

    const width = column_width - marginRight - marginLeft
    const height = 84
    const bandwidth = (height - marginTop - marginBottom) / stackDimension.length;
    // const height = bandwidth * stackDimension.length + marginTop + marginBottom


    const svgDistribution = d3.select(qDistribution.value)
      .attr("width", column_width)
      .attr("height", height)
      .attr("viewBox", [0, 0, column_width, height])
      .attr("transform", `scale(${pageScale})`)

    // 按照"每节课(theme)"，在"环节(name)"这个维度，把"时间(duration)"堆叠起来
    // 因为是按照"环节(name)"叠加，所以key是name

    const series = d3.stack()
      .keys(d3.union(state.procedures.map(d => d.name)))
      .value(([, group], key) => group.get(key).duration)
      (d3.index(state.procedures, d => d.theme, d => d.name))

    // Prepare the scales for positional and color encodings.
    const x = d3.scaleLinear()
      .domain([0, d3.sum(state.procedures, d => d.duration)])
      // .domain([0, series, d => d3.max(d, d => d[1])])
      .range([marginLeft, column_width - marginRight]);
    // .range([0, column_width]);

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
      .attr("transform", d => `translate(${x(d.x1) + (x(d.x2) - x(d.x1)) / 2}, ${bandwidth})`)
      .text(d => d.name)
      .attr("text-anchor", "middle")
      .attr("font-size", legendFontSize)

    const heightOffset = 80

    // Append the horizontal axis.
    svgDistribution.append("g")
      .attr("id", "g-xAxis")
      .attr("transform", `translate(0, ${bandwidth})`)
      .call(d3.axisBottom(x).ticks((width + 5) / 45, "s"))
      .call(g => g.selectAll(".domain").remove());
    svgDistribution.append("g")
      .attr("id", "g-xAxis-name")
      .append("text")
      .attr("transform", `translate(${0.9 * width}, ${heightOffset})`)
      .text("Time (minutes) →")
      .attr("font-size", legendFontSize)
      .attr("font-weight", 600)

    // Append the vertical axis.
    svgDistribution.append("g")
      .attr("id", "g-yAxis")
      .attr("transform", `translate(${marginLeft}, 0)`)
      .call(d3.axisLeft(y).tickSizeOuter(0))
      .attr("font-size", legendFontSize)
      .attr("font-weight", 600)
      .call(g => g.selectAll(".domain").remove());

  },
  visStackedDot() {
    const column_width = window.innerWidth * visWidthoefficient
    const marginTop = 20
    const marginRight = 10
    const marginBottom = 15
    const marginLeft = 130

    const radius = 5
    const heightOffset = 30
    let [data, maxCount] = methods.processQuestion()

    const height = 100
    const bandwidth = (height - marginTop - marginBottom) / maxCount

    const svgInteract = d3.select(qInteract.value)
      .attr("width", column_width)
      .attr("height", height)
      .attr("viewBox", [0, 0, column_width, height])
      .attr("transform", "scale(0.9)")
    // .attr("style", "max-width: 100%; height: auto;");

    const x = d3.scaleLinear()
      .domain([0, d3.sum(state.procedures, d => d.duration)])
      .range([marginLeft, column_width - marginRight]);

    const y = d3.scaleLinear()
      .domain([1, maxCount])
      .range([height - marginBottom, marginTop])
    // .padding(0.08);

    // console.log(y.domain());

    // 先画坐标轴的指标线，否则会挡住图形
    svgInteract.append("g")
      .attr("transform", `translate(${marginLeft}, 0)`)
      .call(d3.axisLeft(y).tickValues(d3.ticks(...y.domain(), 3)).tickFormat(d => d))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").clone()
        .attr("x2", column_width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1));

    svgInteract.append("text")
      // .attr("x", 3)
      .attr("text-anchor", "start")
      .attr("font-weight", "bold")
      .attr("font-size", legendFontSize)
      .text("↑ Number of Questions raised")
      .attr("transform", `translate(${marginLeft},20)`)


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
      .attr("transform", `translate(${10}, 0)`)
      // .attr("stroke", "#000")
      // .attr("stroke-width", 2)
      .attr("fill", "#EFB118")
    g_legend.append("text")
      .attr("x", legendX + 5)
      .attr("y", firstY - 14)
      // .attr("transform", `translate(${marginLeft},20)`)
      .selectAll("tspan")
      .data(["has", "response"])
      .enter()
      .append("tspan")
      .attr("x", legendX + 40)
      .attr("dy", "1em")
      .attr("font-size", legendFontSize)
      .attr("text-anchor", "middle")
      .text(d => d);

    let secondY = 55
    g_legend.append("circle")
      .attr("cx", legendX)
      .attr("cy", secondY)
      .attr("r", radius)
      .attr("transform", `translate(${10}, ${6})`)
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
      .attr("x", legendX + 86)
      .attr("dy", "1em")
      .attr("font-size", legendFontSize)
      .attr("text-anchor", "end")
      .text(d => d);
  },
  visQPyramid() {
    // Specify the chart's dimensions (except for the height).
    // const column_width = document.getElementById("pyramid").style.width/2
    const column_width = window.innerWidth * visWidthoefficient
    methods.getQuestionchain()

    const svgPyramid = d3.select(qPyramid.value)
      .attr("width", column_width)
      .attr("height", pcHeight)
      .attr("viewBox", [0, 0, column_width, pcHeight])
      .attr("transform", `scale(${pageScale})`)

    let levelProp = [0, 0, 0, 0, 0, 0, 0]
    let levelAddup = [0, 0, 0, 0, 0, 0, 0]
    // 先统计数量
    state.questionList.forEach(d => {
      // 倒序记录，以便后续动态规划求和
      levelProp[6 - BLOOM_DICT[d.bloom]]++
    });
    // 再叠加数量
    let temp = 0
    for (let i = 0; i < levelProp.length; i++) {
      temp += levelProp[i]
      levelAddup[i] = temp
    }
    // 需要先绘制最底下的三角形，再一层一层覆盖，因此顺序是相反的
    levelAddup = levelAddup.reverse()
    levelProp = levelProp.reverse()
    // console.log("add up", levelAddup);
    // console.log(levelProp);

    const triangleScale = 7
    const symbolSize = d3.scaleLinear([0, d3.max(levelAddup) * triangleScale])
    const triangles = d3.symbol()
      .type(d3.symbolTriangle)
      // .size(d => symbolSize(d * triangleScale))
      .size(symbolSize(10))

    const color = d3.scaleOrdinal()
      .domain(BLOOM_CLASS.reverse())
      .range(d3.schemeRdPu[BLOOM_CLASS.length])
      .unknown("#ccc");

    svgPyramid.append("g")
      .attr("id", "g-triangle")
      // 绘制三角形
      .selectAll("path")
      .data(levelAddup)
      .join("path")
      .attr("d", triangles)
      .attr("id", (_, i) => `triangle-${i}`)
      .attr("fill", (_, i) => color(BLOOM_CLASS[i]))

    const pyramidLeft = 240
    const pyramidTop = 30
    const coefficient = 0.8
    let pyramidName = svgPyramid.append("g")
      .attr("id", "g-text")

    let triangleAttr = []
    // 调整每一层三角形的位置和标签的位置
    for (let i = 0; i < levelAddup.length; i++) {
      let tri = d3.select(`#triangle-${i}`)
      let triBox = tri.node().getBBox()
      let { x, y, width, height } = triBox
      triangleAttr.push({
        x: x * coefficient * levelAddup[i],
        y: y * coefficient * levelAddup[i],
        width: width * coefficient * levelAddup[i],
        height: height * coefficient * levelAddup[i],
        points: [],
        leftMidPoints: [],
        rightMidPoints: [],
      })
      // console.log(tri, typeof (tri), x, y, width, height);
      // tri.attr("transform", `translate(${pyramidLeft},${15 - y})`)
      tri.attr("transform", `
        translate(${pyramidLeft},${pyramidTop - y * levelAddup[i] * coefficient}),
        scale(${coefficient * levelAddup[i]})`)

      // 层级BLOOM标签
      pyramidName.append("text")
        .text(BLOOM_CLASS[BLOOM_CLASS.length - i - 1])
        .attr("transform", `translate(${pyramidLeft / 2 - 14}, ${pyramidTop + height * levelAddup[i] * coefficient - 4})`)
    }

    // 计算每个三角形余下位置的中点
    let bottom = 0
    let xOffset = 0
    // 为了从上至下计算三角形的中点，又将levelAddup逆序排序
    triangleAttr = triangleAttr.reverse()
    // console.log(triangleAttr);
    let middlePoints = triangleAttr.map((attr, i) => {
      let { x, y, width, height } = attr
      // console.log(i, attr);
      let lx = pyramidLeft - (width / 2 + xOffset) / 2
      let rx = pyramidLeft + (width / 2 + xOffset) / 2
      let ry = (height + bottom) / 2
      bottom = height
      xOffset = Math.abs(x)
      return [lx, rx, ry]
    })

    const drawArcLine = () => {

      // C 型弧线
      for (let i = 0; i < middlePoints.length - 1; i++) {
        const current = middlePoints[i]
        const next = middlePoints[i + 1]
        const arcHeight = 60

        function calculateRectanglePoints(point1, point2, adjacentLength) {
          // point1 和 point2 是相邻的两个顶点
          // adjacentLength 是与 point1-point2 这条边相邻的另一条边的长度

          // 计算 point1 到 point2 的向量
          const vectorX = point2.x - point1.x;
          const vectorY = point2.y - point1.y;

          // 计算 point1 到 point2 的距离（这条边的长度）
          const edgeLength = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

          // 如果边长为0，返回空数组（无效输入）
          if (edgeLength === 0) return [];

          // 单位向量
          const unitX = vectorX / edgeLength;
          const unitY = vectorY / edgeLength;

          // 旋转90度的垂直向量（两种可能性）
          const perpendicularX1 = -unitY;
          const perpendicularY1 = unitX;

          const perpendicularX2 = unitY;
          const perpendicularY2 = -unitX;

          // 计算两个可能的第四个点
          const point3Option1 = {
            x: point2.x + (adjacentLength * perpendicularX1),
            y: point2.y + (adjacentLength * perpendicularY1)
          };

          const point3Option2 = {
            x: point2.x + (adjacentLength * perpendicularX2),
            y: point2.y + (adjacentLength * perpendicularY2)
          };

          // 计算两个可能的第四个点
          const point4Option1 = {
            x: point1.x + (adjacentLength * perpendicularX1),
            y: point1.y + (adjacentLength * perpendicularY1)
          };

          const point4Option2 = {
            x: point1.x + (adjacentLength * perpendicularX2),
            y: point1.y + (adjacentLength * perpendicularY2)
          };

          // 返回两个可能的长方形
          return [
            [point1, point2, point3Option1, point4Option1],
            [point1, point2, point3Option2, point4Option2]
          ];
        }

        // 绘制右边的弧形
        // 计算右边控制顶点
        const [rightPair1, rightPair2] = calculateRectanglePoints(
          { x: current[1], y: current[2] },
          { x: next[1], y: next[2] },
          arcHeight
        )
        // 创建对称路径
        const pathStr = `M${next[1]},${next[2]}  C${rightPair2[2].x},${rightPair2[2].y} ${rightPair2[3].x},${rightPair2[3].y} ${current[1]},${current[2]}`

        svgPyramid.append('path')
          .attr('d', pathStr)
          .attr('fill', 'none')
          .attr('stroke', '#888')
          .attr('stroke-width', i + 1)
          .attr('transform', `translate(${0},${pyramidTop})`)

        // 计算左边控制顶点
        const [leftPair1, leftPair2] = calculateRectanglePoints(
          { x: current[0], y: current[2] },
          { x: next[0], y: next[2] },
          arcHeight
        )
        // 创建对称路径
        const rightPathStr = `M${next[0]},${next[2]}  C${leftPair1[2].x},${leftPair1[2].y} ${leftPair1[3].x},${leftPair1[3].y} ${current[0]},${current[2]}`

        svgPyramid.append('path')
          .attr('d', rightPathStr)
          .attr('fill', 'none')
          .attr('stroke', '#4d9a23')
          .attr('stroke-width', i + 1)
          .attr('transform', `translate(${0},${pyramidTop})`)
      }
    }
    const drawArcPoint = () => {

      svgPyramid.append("g")
        .attr("id", "g-left-circles")
        .selectAll()
        // data join
        .data(middlePoints)
        .join("g")
        // 绘制矩形
        .selectAll("circle")
        .data(middlePoints)
        .join("circle")
        .attr("cx", d => d[0])
        .attr("cy", d => d[2])
        .attr("r", 3)
        .attr("fill", "#EFB118")
        .attr('transform', `translate(${0},${pyramidTop})`)

      svgPyramid.append("g")
        .attr("id", "g-right-circles")
        .selectAll()
        // data join
        .data(middlePoints)
        .join("g")
        // 绘制矩形
        .selectAll("circle")
        .data(middlePoints)
        .join("circle")
        .attr("cx", d => d[1])
        .attr("cy", d => d[2])
        .attr("r", 3)
        .attr("fill", "#EFB118")
        .attr('transform', `translate(${0},${pyramidTop})`)
    }

    drawArcLine()
    drawArcPoint()

  },
  visInteractChord() {
    const svgPyramid = d3.select(qPyramid.value)
    const chordData = [
      { source: "analytics.cluster", target: "animate", value: 2 },
      { source: "analytics.cluster", target: "vis.data", value: 8 },
      { source: "analytics.cluster", target: "util.math", value: 2 },
      { source: "analytics.cluster", target: "analytics.cluster", value: 5 },
      { source: "analytics.cluster", target: "util", value: 3 },
      { source: "analytics.cluster", target: "vis.operator", value: 1 },
      { source: "analytics.graph", target: "animate", value: 5 },
      { source: "analytics.graph", target: "vis.data", value: 14 },
      { source: "analytics.graph", target: "util", value: 5 },
      { source: "analytics.graph", target: "vis.operator", value: 6 },
      { source: "analytics.graph", target: "analytics.graph", value: 1 },
      { source: "analytics.graph", target: "util.heap", value: 2 },
      { source: "analytics.graph", target: "vis", value: 1 },
      { source: "analytics.optimization", target: "animate", value: 1 },
      { source: "analytics.optimization", target: "util", value: 2 },
      { source: "analytics.optimization", target: "vis.data", value: 1 },
      { source: "analytics.optimization", target: "scale", value: 1 },
      { source: "analytics.optimization", target: "vis.axis", value: 1 },
      { source: "analytics.optimization", target: "vis", value: 1 },
      { source: "analytics.optimization", target: "vis.operator", value: 1 }
    ]
    const innerRadius = pcHeight * 0.5 - 60;
    const outerRadius = innerRadius + 10;
    const topOffset = pcHeight / 2 * pageScale
    const leftOffset = 700

    // Compute a dense matrix from the weighted links in chordData.
    const names = d3.sort(d3.union(chordData.map(d => d.source), chordData.map(d => d.target)));
    const index = new Map(names.map((name, i) => [name, i]));
    const matrix = Array.from(index, () => new Array(names.length).fill(0));
    for (const { source, target, value } of chordData) matrix[index.get(source)][index.get(target)] += value;

    const chord = d3.chordDirected()
      .padAngle(10 / innerRadius)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const ribbon = d3.ribbonArrow()
      .radius(innerRadius - 1)
      .padAngle(1 / innerRadius);

    const colors = d3.quantize(d3.interpolateRainbow, names.length);

    // const svg = d3.create("svg")
    //     .attr("width", width)
    //     .attr("height", height)
    //     .attr("viewBox", [-width / 2, -height / 2, width, height])
    //     .attr("style", "width: 100%; height: auto; font: 10px sans-serif;");

    const chords = chord(matrix);


    const group = svgPyramid.append("g")
      .attr("id", "g-chrod")
      .selectAll()
      .data(chords.groups)
      .join("g")


    group.append("path")
      .attr("fill", d => colors[d.index])
      .attr("d", arc)
      .attr("transform", `translate(${leftOffset}, ${topOffset})`)

    group.append("text")
      .each(d => (d.angle = (d.startAngle + d.endAngle) / 2))
      .attr("dy", "0.35em")
      .attr("transform", d => `
        translate(${leftOffset}, ${topOffset})
        rotate(${(d.angle * 180 / Math.PI - 90)})
        translate(${outerRadius + 5})
        ${d.angle > Math.PI ? "rotate(180)" : ""}
        `)
      .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
      .text(d => names[d.index]);

    group.append("title")
      .text(d => `${names[d.index]}
        ${d3.sum(chords, c => (c.source.index === d.index) * c.source.value)} outgoing →
        ${d3.sum(chords, c => (c.target.index === d.index) * c.source.value)} incoming ←`)
      .attr("transform", `translate(${leftOffset}, ${topOffset})`)


    svgPyramid.append("g")
      .attr("id", "g-ribbon-arrow")
      .attr("fill-opacity", 0.75)
      .selectAll()
      .data(chords)
      .join("path")
      .style("mix-blend-mode", "multiply")
      .attr("fill", d => colors[d.target.index])
      .attr("d", ribbon)
      .attr("transform", `translate(${leftOffset}, ${topOffset})`)
      .append("title")
      .text(d => `${names[d.source.index]} → ${names[d.target.index]} ${d.source.value}`)
      .attr("transform", `translate(${leftOffset}, ${topOffset})`)

  },
  visQMap() {
    // Specify the chart's dimensions (except for the height).
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
      .attr("font-size", legendFontSize)
      .attr("font-weight", 600)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").clone()
        .attr("x2", column_width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1))
      .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", 3)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("font-size", legendFontSize)
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
      .attr("font-size", legendFontSize)
      .attr("font-weight", 600)

    // Append the vertical axis.
    // svgBloom.append("g")
    //   .attr("id", "g-yAxis")
    //   .attr("transform", `translate(${marginLeft}, 0)`)
    //   .call(d3.axisLeft(y).tickSizeOuter(0))
    //   .attr("font-size", legendFontSize)
    //   .attr("font-weight", 600)
    //   .call(g => g.selectAll(".domain").remove());

  },
  visQRectPyramid() {
    // Specify the chart's dimensions (except for the height).
    const column_width = window.innerWidth * MIDDLE_COLUMN_WIDTH_COEFFICIENT
    const marginTop = 10
    const marginRight = 10
    const marginBottom = 40
    const marginLeft = 75
    const radius = 5
    methods.getQuestionchain()

    const width = column_width - marginRight - marginLeft
    const bandwidth = 15;
    const height = bandwidth * BLOOM_CLASS.length + marginTop + marginBottom

    const svgBloom = d3.select(qPyramid.value)
      .attr("width", column_width)
      .attr("height", height)
      .attr("viewBox", [0, 0, column_width, height])

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


    // .attr("style", "max-width: 100%; height: auto;");

    // 先画坐标轴的指标线，否则会挡住图形
    svgBloom.append("g")
      .attr("transform", `translate(${marginLeft}, 0)`)
      .call(d3.axisLeft(y).tickValues(BLOOM_CLASS).tickFormat(d => d))
      .attr("font-size", legendFontSize)
      .attr("font-weight", 600)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").clone()
        .attr("x2", column_width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1))
      .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", 3)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("font-size", legendFontSize)
        .text("↑ Levels of Cognition"));

    console.log('*/*', data);
    const getPyramidWidth = d => (7 - BLOOM_DICT[d.bloom]) * 0.2 * x(1)

    svgBloom.append("g")
      .attr("id", "g-pyramid")
      .selectAll()
      // data join
      .data(data)
      .join("g")
      // 绘制矩形
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => x(d.coord[0]) - 0.5 * getPyramidWidth(d))
      .attr("y", d => y(d.bloom))
      .attr("height", y.bandwidth())
      .attr("width", d => getPyramidWidth(d))
      .attr("stroke", d => color(d.bloom))
      .attr("stroke-width", 2)
      .attr("fill", "#fff")


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
      .attr("font-size", legendFontSize)
      .attr("font-weight", 600)

    // Append the vertical axis.
    // svgBloom.append("g")
    //   .attr("id", "g-yAxis")
    //   .attr("transform", `translate(${marginLeft}, 0)`)
    //   .call(d3.axisLeft(y).tickSizeOuter(0))
    //   .attr("font-size", legendFontSize)
    //   .attr("font-weight", 600)
    //   .call(g => g.selectAll(".domain").remove());

  },

  isWithinTimeWindow(dateStr1, dateStr2, timeWindow) {

    const parseTimeString = (timeStr) => {
      const [m, s, ms] = timeStr.split(':').map(Number);
      return (m * 60 + s) * 1000 + ms;
    }
    // 将字符串转换为Date对象
    const date1 = parseTimeString(dateStr1);
    const date2 = parseTimeString(dateStr2);

    // 计算时间差(以毫秒为单位)
    const timeDiff = Math.abs(date2 - date1);

    // 转换为秒并判断是否小于20秒
    return timeDiff < timeWindow * 1000;
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
        bloom: q.bloom,
        isResponsed: q.isResponsed
      })
      max = count > max ? count : max
      count++
    })
    return [qData2vis, max]
  },
  getQuestionchain() {
    const shortTimeWindow = 35
    let qChainList = []
    let chainIndex = 0
    let currentChain = []
    let currentStartTime = ""
    for (let i = 0; i < state.questionList.length; i++) {
      let qItem = state.questionList[i]
      if (i == 0) {
        let temp = {
          ...qItem,
          startTimeInt: getLessonMinute(qItem.startTime)
        }
        currentChain.push(temp)
        currentStartTime = qItem.startTime
      }
      else {
        // console.log(currentStartTime, qItem.startTime, methods.isWithinTimeWindow(currentStartTime, qItem.startTime, shortTimeWindow))
        // 如果不在时间窗口之内，重建问题链
        if (!methods.isWithinTimeWindow(currentStartTime, qItem.startTime, shortTimeWindow)) {
          qChainList.push({
            index: chainIndex++,
            length: currentChain.length,
            startTimeInt: currentChain[0].startTimeInt,
            qChain: currentChain
          })
          currentChain = []
        }
        // 
        let temp = {
          ...qItem,
          startTimeInt: getLessonMinute(qItem.startTime)
        }
        currentChain.push(temp)
        currentStartTime = qItem.startTime
      }

    }
    qChainList.push({
      index: chainIndex++,
      length: currentChain.length,
      startTimeInt: currentChain[0].startTimeInt,
      qChain: currentChain
    })
    console.log('------485---------', qChainList);
    return qChainList
  },
  visTeachingProcedures() {
    methods.visStackedBar()
    methods.visStackedDot()
    // methods.visQMap()
    methods.visQPyramid()
    methods.visInteractChord()
  }
});

onMounted(() => {
  methods.visTeachingProcedures();
});


</script>

<template>
  <HeaderView pageTitle="QUESTIONS LEVELS" />
  <div class="vis" ref="qMap2">
    <div class="analysis-row">
      <div class="vis-component"><svg width="800" height="400" id="distribution" ref="qDistribution"></svg></div>
      <div class="vis-component"><svg width="800" height="400" id="interact" ref="qInteract"></svg></div>
      <div class="vis-component" id="qText-container">
        <div id="qText" ref="qText">{{ state.currentQ }}</div>
      </div>
      <div class="vis-component"><svg width="800" height="400" id="pyramid" ref="qPyramid"></svg></div>
    </div>
  </div>
</template>

<style scoped>
.vis {
  width: calc(100%- 10px);
  height: calc(100vh - 68px);
  /* 减去头部高度 */
  border-left: #d3d3d3 1px solid;
  border-bottom: #d3d3d3 1px solid;
  border-right: #d3d3d3 1px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  /* justify-content: center; */
}
.analysis-row{
  display: flex;
  flex-direction: column;
  height: 100%;
}

.vis-component {
  flex: 0 0 auto;
  /* flex-grow，flex-shrink，flex-basis */
  /* min-width: 0;
  min-height: 0; */
  display: flex;
  /* align-items: stretch; */
  justify-content: center;
  margin-top: 4px;
  background: linear-gradient(62deg, #fbac7e23 0%, #f7cf6841 100%);
}
#qText-container{
  flex:1 1 0;
  min-height: 0;
}

.vis-component:first-child {
  margin-top: 0;
}

.vis-component>* {
  width: calc(100% - 10px) !important;
  /* height: calc(100% - 10px) !important; */
  /* display: block; */
}


#pyramid {
  /* border: #888 1px solid; */
  flex: auto;
  padding: 0;
  /* background: linear-gradient(62deg, #fbac7e23 0%, #f7cf6841 100%); */
}


#qText {
  width: 100%;
  margin: 8px;
  background: #f7f7f7;
  border: #888 1px solid;
  border-radius: 4px;
  padding: 8px;
}
</style>
