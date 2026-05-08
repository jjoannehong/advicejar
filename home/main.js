import { defineAsyncComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGraffitiSession } from "@graffiti-garden/wrapper-vue";
import { useAdviceJar } from "../advice-jar.js";

function setup() {
  const route = useRoute();
  const router = useRouter();
  const {
    categories,
    selectedCategory,
    revealedAdvice,
    receiveAdvice,
    isSaved,
    toggleSaved,
    hasContributed,
  } = useAdviceJar();
  const session = useGraffitiSession();
  const receiveStatus = ref("");
  const isLoading = ref(false);
  const showCategories = ref(false);
  const showAdviceModal = ref(false);
  const showDropAnimation = ref(false);

  function closeAdviceModal() {
    showAdviceModal.value = false;
  }

  function playDropAnimation() {
    showDropAnimation.value = true;
    window.setTimeout(() => {
      showDropAnimation.value = false;
    }, 720);
  }

  function onReceiveAdvice() {
    if (isLoading.value) return;

    if (!session.value?.actor) {
      receiveStatus.value = "Log in and contribute one advice first.";
      return;
    }

    if (!hasContributed(session.value.actor)) {
      receiveStatus.value = "Contribute one advice before receiving.";
      return;
    }

    if (showCategories.value) {
      receiveStatus.value = "Select a category";
      return;
    }

    showCategories.value = true;
    showAdviceModal.value = false;
    revealedAdvice.value = null;
    selectedCategory.value = null;
    receiveStatus.value = "";
  }

  function onSelectCategory(category) {
    if (isLoading.value) return;

    selectedCategory.value = category;
    showAdviceModal.value = false;
    revealedAdvice.value = null;
    receiveStatus.value = "";
    isLoading.value = true;

    window.setTimeout(() => {
      const ok = receiveAdvice();
      isLoading.value = false;
      receiveStatus.value = ok ? "" : "No advice in this category yet.";
      showAdviceModal.value = ok;
      showCategories.value = false;
      selectedCategory.value = null;
    }, 850);
  }

  onMounted(() => {
    if (route.query.dropAdvice === "1") {
      playDropAnimation();
      router.replace("/home");
    }
  });

  return {
    categories,
    selectedCategory,
    revealedAdvice,
    receiveStatus,
    onReceiveAdvice,
    isSaved,
    toggleSaved,
    isLoading,
    showCategories,
    showAdviceModal,
    closeAdviceModal,
    onSelectCategory,
    session,
    showDropAnimation,
  };
}

export default async () => ({
  setup,
  components: {
    SaveAdvice: defineAsyncComponent(() =>
      import("../save-advice/main.js").then((m) => m.default()),
    ),
  },
  template: await fetch(new URL("./index.html", import.meta.url)).then((r) =>
    r.text(),
  ),
});
