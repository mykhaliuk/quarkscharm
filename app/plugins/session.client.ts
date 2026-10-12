export default defineNuxtPlugin(async () => {
  await useSession().restore();
});
