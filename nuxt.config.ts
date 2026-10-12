export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  components: [{ path: '~/components', pathPrefix: false }],
  devtools: { enabled: true },
  css: [
    '~/../assets/css/tokens.css',
    '~/../assets/css/theme-light.css',
    '~/../assets/css/theme-dark.css',
    '~/../assets/css/typography.css',
    '~/../assets/css/base.css',
  ],
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&display=swap',
        },
      ],
      script: [
        {
          innerHTML:
            "try{var t=JSON.parse(localStorage.getItem('qc.theme'));if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}",
        },
      ],
    },
  },
});
