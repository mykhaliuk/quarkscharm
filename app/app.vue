<script setup lang="ts">
const { restore } = useTheme();
onMounted(restore);
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
