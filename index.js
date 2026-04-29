import { createApp, ref, computed } from "vue";
import { GraffitiDecentralized } from "@graffiti-garden/implementation-decentralized";
import {
  GraffitiPlugin,
  useGraffiti,
  useGraffitiSession,
  useGraffitiDiscover,
} from "@graffiti-garden/wrapper-vue";

function setup() {
  const graffiti = useGraffiti();
  const session = useGraffitiSession();

  const channel = "designftw-26";
  const historyChannel = computed(() => session.value ? `${session.value.actor}/history` : null);

  const myAdvice = ref("");
  const selectedCategory = ref("school");
  const categories = ["school", "personal", "love", "friendship", "other"];
  const revealedAdvice = ref(null);
  const currentView = ref("home");
  const receiveStatus = ref("");

  const { objects: allAdvice } = useGraffitiDiscover(
    [channel],
    { properties: { value: { properties: { type: { const: "Advice" } } } } },
    undefined,
    true
  );

  const { objects: myHistory } = useGraffitiDiscover(
    computed(() => historyChannel.value ? [historyChannel.value] : []),
    { properties: { value: { properties: { type: { const: "AdviceHistory" } } } } },
    [],
    true
  );

  const giveCount = computed(() => 
    allAdvice.value.filter(obj => obj.actor === session.value?.actor).length
  );
  const takeCount = computed(() => myHistory.value.length);
  const canTake = computed(() => giveCount.value > takeCount.value);

  const isSending = ref(false);
  async function giveAdvice() {
    isSending.value = true;
    try {
      await graffiti.post({
        value: {
          type: "Advice",
          activity: "Give",
          content: myAdvice.value,
          category: selectedCategory.value,
          published: Date.now(),
        },
        channels: [channel],
      }, session.value);
      myAdvice.value = "";
      currentView.value = "home";
    } finally {
      isSending.value = false;
    }
  }

  async function takeAdvice() {
    receiveStatus.value = "";
    const pool = allAdvice.value.filter(obj => 
      obj.value.category === selectedCategory.value && obj.actor !== session.value.actor
    );

    if (pool.length > 0) {
      const selected = pool[Math.floor(Math.random() * pool.length)];
      revealedAdvice.value = selected.value;

      await graffiti.post({
        value: {
          type: "AdviceHistory",
          activity: "Take",
          targetID: selected.id,
          published: Date.now()
        },
        channels: [historyChannel.value],
        allowed: []
      }, session.value);
    } else {
      receiveStatus.value = "No advice in this category yet. Try another one.";
    }
  }

  function openAddView() {
    currentView.value = "add";
    receiveStatus.value = "";
    revealedAdvice.value = null;
  }

  function openHomeView() {
    currentView.value = "home";
  }

  function receiveAdvice() {
    if (!canTake.value) {
      receiveStatus.value = "Leave a piece of advice to receive one.";
      return;
    }
    takeAdvice();
  }

  return {
    myAdvice,
    selectedCategory,
    categories,
    revealedAdvice,
    currentView,
    receiveStatus,
    isSending,
    giveAdvice,
    takeAdvice,
    openAddView,
    openHomeView,
    receiveAdvice,
    giveCount,
    takeCount,
    canTake
  };
}

const App = { template: "#template", setup };

createApp(App)
  .use(GraffitiPlugin, {
    graffiti: new GraffitiDecentralized(),
  })
  .mount("#app");