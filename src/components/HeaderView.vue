<script setup>
// import { defineComponent, defineProps, reactive, onMounted, ref, toRefs } from "vue";

// 用于<script setup>里
const props = defineProps(["pageTitle"])

// export default defineComponent({
//   props: ["pageTitle"],
//   setup(props) {
//   console.log(123, props);
//     return {
//       props
//       // ...toRefs(state),
//       // ...toRefs(methods),
//     }
//   }
// })
</script>

<template>
  <div class="header">
    <p>{{ props.pageTitle }}</p>
  </div>
</template>

<style lang="less" scoped>
.container {
  border: #d3d3d3 1px solid;
  border-radius: 4px;
  width: 100%;
}

.header {
  vertical-align: center;
  width: 100%;
  background: #ececec;
  border: #d3d3d3 1px solid;
  font-weight: 500;

  p {
    color: #555;
    font-size: 12px;
    font-weight: bold;
    margin: 0;
    padding: 6px;
  }
}
</style>
