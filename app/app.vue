<script setup lang="ts">
const { restore } = useTheme();
onMounted(restore);
</script>

<template>
  <NuxtPage />
</template>
