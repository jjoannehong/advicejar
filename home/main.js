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
    canPersistAdvice,
  } = useAdviceJar();
  const session = useGraffitiSession();
  const receiveStatus = ref("");
  const isLoading = ref(false);
  const showCategories = ref(false);
  const showAdviceModal = ref(false);
  const showDropAnimation = ref(false);
  const showLoginPrompt = ref(false);
  const justCopiedAdvice = ref(false);
  let copyResetTimer = null;

  function onClickAdd() {
    if (!session.value?.actor) {
      showLoginPrompt.value = true;
      return;
    }
    router.push("/compose");
  }

  function closeLoginPrompt() {
    showLoginPrompt.value = false;
  }

  function resetCopyState() {
    justCopiedAdvice.value = false;
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
  }

  function markCopied() {
    justCopiedAdvice.value = true;
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
      justCopiedAdvice.value = false;
      copyResetTimer = null;
    }, 1500);
  }

  async function copyAdviceToClipboard() {
    const text = revealedAdvice.value?.content;
    if (!text) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        markCopied();
        return;
      }
    } catch {
      /* fall through to execCommand fallback */
    }

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      markCopied();
    } catch {
      /* swallow — clipboard truly unavailable */
    }
    document.body.removeChild(ta);
  }

  function closeAdviceModal() {
    showAdviceModal.value = false;
    resetCopyState();
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
    resetCopyState();
  }

  function onSelectCategory(category) {
    if (isLoading.value) return;

    selectedCategory.value = category;
    showAdviceModal.value = false;
    revealedAdvice.value = null;
    receiveStatus.value = "";
    isLoading.value = true;
    resetCopyState();

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
    canPersistAdvice,
    justCopiedAdvice,
    copyAdviceToClipboard,
    showLoginPrompt,
    onClickAdd,
    closeLoginPrompt,
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
