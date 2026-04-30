import { defineAsyncComponent, ref } from "vue";
import { useAdviceJar } from "../advice-jar.js";

function setup() {
  const {
    categories,
    selectedCategory,
    revealedAdvice,
    receiveAdvice,
    isSaved,
    toggleSaved,
  } = useAdviceJar();
  const receiveStatus = ref("");
  const isLoading = ref(false);
  const showCategories = ref(false);
  const showAdviceModal = ref(false);

  function closeAdviceModal() {
    showAdviceModal.value = false;
  }

  function onReceiveAdvice() {
    if (isLoading.value) return;

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
