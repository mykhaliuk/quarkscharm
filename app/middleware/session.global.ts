export default defineNuxtRouteMiddleware((to) => {
  const { state } = useSession();
  const anonymous = state.status === 'anonymous' || state.status === 'checking';
  if (anonymous && to.path !== '/connect') return navigateTo('/connect');
  if (!anonymous && to.path === '/connect') return navigateTo('/');
  return undefined;
});
