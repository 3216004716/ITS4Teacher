<script setup>
import { defineComponent, reactive, onMounted, ref, toRefs, effect } from "vue";
import HeaderView from "./HeaderView.vue";
import * as echarts from "echarts";
import "../style.css"


const qMap = ref(null);
const efficientA = 0.2
let _levelChart;
let _abilityChart;
let _actionChart;
let option;

const state = reactive({
  id: 0,
  data: {
    "name": "flare",
    "children": [
      {
        "name": "analytics",
        "children": [
          {
            "name": "cluster",
            "children": [
              {
                "name": "AgglomerativeCluster",
                "value": 3938
              },
              {
                "name": "CommunityStructure",
                "value": 3812
              },
              {
                "name": "HierarchicalCluster",
                "value": 6714
              },
              {
                "name": "MergeEdge",
                "value": 743
              }
            ]
          },
          {
            "name": "graph",
            "children": [
              {
                "name": "BetweennessCentrality",
                "value": 3534
              },
              {
                "name": "LinkDistance",
                "value": 5731
              },
              {
                "name": "MaxFlowMinCut",
                "value": 7840
              },
              {
                "name": "ShortestPaths",
                "value": 5914
              },
              {
                "name": "SpanningTree",
                "value": 3416
              }
            ]
          },
          {
            "name": "optimization",
            "children": [
              {
                "name": "AspectRatioBanker",
                "value": 7074
              }
            ]
          }
        ]
      },
      {
        "name": "animate",
        "children": [
          {
            "name": "Easing",
            "value": 17010
          },
          {
            "name": "FunctionSequence",
            "value": 5842
          },
          {
            "name": "interpolate",
            "children": [
              {
                "name": "ArrayInterpolator",
                "value": 1983
              },
              {
                "name": "ColorInterpolator",
                "value": 2047
              },
              {
                "name": "DateInterpolator",
                "value": 1375
              },
              {
                "name": "Interpolator",
                "value": 8746
              },
              {
                "name": "MatrixInterpolator",
                "value": 2202
              },
              {
                "name": "NumberInterpolator",
                "value": 1382
              },
              {
                "name": "ObjectInterpolator",
                "value": 1629
              },
              {
                "name": "PointInterpolator",
                "value": 1675
              },
              {
                "name": "RectangleInterpolator",
                "value": 2042
              }
            ]
          },
          {
            "name": "ISchedulable",
            "value": 1041
          },
          {
            "name": "Parallel",
            "value": 5176
          },
          {
            "name": "Pause",
            "value": 449
          },
          {
            "name": "Scheduler",
            "value": 5593
          },
          {
            "name": "Sequence",
            "value": 5534
          },
          {
            "name": "Transition",
            "value": 9201
          },
          {
            "name": "Transitioner",
            "value": 19975
          },
          {
            "name": "TransitionEvent",
            "value": 1116
          },
          {
            "name": "Tween",
            "value": 6006
          }
        ]
      },
      {
        "name": "data",
        "children": [
          {
            "name": "converters",
            "children": [
              {
                "name": "Converters",
                "value": 721
              },
              {
                "name": "DelimitedTextConverter",
                "value": 4294
              },
              {
                "name": "GraphMLConverter",
                "value": 9800
              },
              {
                "name": "IDataConverter",
                "value": 1314
              },
              {
                "name": "JSONConverter",
                "value": 2220
              }
            ]
          },
          {
            "name": "DataField",
            "value": 1759
          },
          {
            "name": "DataSchema",
            "value": 2165
          },
          {
            "name": "DataSet",
            "value": 586
          },
          {
            "name": "DataSource",
            "value": 3331
          },
          {
            "name": "DataTable",
            "value": 772
          },
          {
            "name": "DataUtil",
            "value": 3322
          }
        ]
      },
    ]
  }
});
const methods = reactive({
  totalChartDraw() {
    _levelChart && _levelChart.dispose();
    option = {
      xAxis: {
        scale: true
      },
      yAxis: {
        scale: true
      },
      series: [
        // {
        //   type: 'effectScatter',
        //   symbolSize: 20,
        //   data: [
        //     [172.7, 105.2],
        //     [153.4, 42]
        //   ]
        // },
        {
          type: 'scatter',
          // prettier-ignore
          data: [[161.2, 51.6, 16],
          [170.0, 59.0, 30],
          [172.5, 55.2, 30],
          [147.2, 49.8, 30],
          [159.5, 50.6, 30],
          [174.0, 54.5, 30],
          [154.4, 46.2, 30],
          [162.1, 53.6, 30],
          [168.9, 62.3, 30],
          [167.6, 58.3, 16],
          [167.6, 61.0, 26],
          [168.3, 54.8, 16],
          [156.0, 52.7, 26],
          [162.0, 54.7, 26],
          [151.1, 48.7, 16],
          [164.0, 55.7, 26],
          [170.0, 69.4, 26],
          [163.2, 59.8, 26],
          [161.4, 63.4, 26],
          [159.0, 48.6, 26],
          [161.0, 53.6, 16],
          [171.8, 56.2, 4],
          [166.8, 56.6, 4],
          [159.5, 47.6, 4],
          [162.2, 50.2, 4],
          [172.7, 62.0, 16],
          [162.8, 58.0, 16],
          [158.2, 46.4, 16],
          [167.6, 57.8, 16],
          [170.5, 64.5, 20],
          [160.0, 59.5, 20],
          [166.4, 55.0, 20],
          [170.2, 55.9, 20],
          [167.6, 65.9, 20],
          [160.0, 55.9, 20],
          [177.8, 60.0, 20]
          ],
          // data的第三列
          symbolSize: _ => _[2]
        }
      ]
    };
    _levelChart = echarts.init(qMap.value, null, {
      width: efficientA * window.innerWidth,
      height: efficientA * window.innerHeight,
    });

    _levelChart && _levelChart.setOption(option);
  },
  hierarchyDraw() {
    _abilityChart && _abilityChart.dispose();
    option = {
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove'
      },
      series: [
        {
          type: 'tree',
          data: [state.data],
          left: '2%',
          right: '2%',
          top: '20%',
          bottom: '8%',
          symbol: 'rect',
          // symbol: 'emptyCircle',
          orient: 'BT',
          expandAndCollapse: true,
          label: {
            position: 'bottom',
            rotate: 90,
            verticalAlign: 'middle',
            align: 'right'
          },
          leaves: {
            label: {
              position: 'top',
              rotate: 90,
              verticalAlign: 'middle',
              align: 'left'
            }
          },
          emphasis: {
            focus: 'descendant'
          },
          animationDurationUpdate: 750
        }
      ]
    };
    _abilityChart = echarts.init(totalAbility.value, null, {
      width: efficientA * window.innerWidth,
      height: efficientA * window.innerHeight,
    });

    _abilityChart && _abilityChart.setOption(option);
  },


});

onMounted(() => {
  methods.totalChartDraw();
  // methods.hierarchyDraw();
});


</script>

<template>
  <HeaderView pageTitle="QUESTIONS LEVELS">
  </HeaderView>
  <div class="vis" ref="qMap"></div>
</template>

<style scoped>
.vis{
  height:96.4%;
  border-left: #d3d3d3 1px solid;
  border-bottom: #d3d3d3 1px solid;
  border-right: #d3d3d3 1px solid;
}
</style>
