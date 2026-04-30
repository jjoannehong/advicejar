import { createApp, defineAsyncComponent } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

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
  components: {
    Home: defineAsyncComponent(loadComponent("home")),
  },
})
  .use(router)
  .mount("#app");
