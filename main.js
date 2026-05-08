import { createApp, defineAsyncComponent } from "vue";
import { createRouter, createWebHashHistory, useRoute } from "vue-router";
import { GraffitiDecentralized } from "@graffiti-garden/implementation-decentralized";
import { GraffitiPlugin, useGraffitiSession } from "@graffiti-garden/wrapper-vue";
import { useAdviceJar } from "./advice-jar.js";

function loadComponent(name) {
  return () => import(`./${name}/main.js`).then((m) => m.default());
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/home" },
    { path: "/home", component: loadComponent("home") },
    { path: "/profile/:actor", component: loadComponent("profile"), props: true },
    { path: "/compose", component: loadComponent("compose") },
    // Add your routes here
  ],
});

createApp({
  template: "#template",
  setup() {
    useAdviceJar();
    const session = useGraffitiSession();
    const route = useRoute();
    return { session, route };
  },
  components: {
    Home: defineAsyncComponent(loadComponent("home")),
  },
})
  .use(GraffitiPlugin, {
    graffiti: new GraffitiDecentralized(),
  })
  .use(router)
  .mount("#app");
