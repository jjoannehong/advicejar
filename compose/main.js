import { ref } from "vue";
import { useRouter } from "vue-router";
import { useGraffitiSession } from "@graffiti-garden/wrapper-vue";
import { useAdviceJar } from "../advice-jar.js";

function setup() {
  const router = useRouter();
  const session = useGraffitiSession();
  const { categories, addAdviceForActor } = useAdviceJar();

  const content = ref("");
  const category = ref(categories[0]);
  const composeStatus = ref("");
  const isBouncing = ref(false);
  const isFading = ref(false);

  async function submitAdvice() {
    if (isBouncing.value) return;
    if (!session.value?.actor) {
      composeStatus.value = "Log in to submit advice.";
      return;
    }
    if (!content.value.trim()) return;
    try {
      await addAdviceForActor({
        actor: session.value.actor,
        content: content.value,
        category: category.value,
      });
    } catch (e) {
      console.error(e);
      composeStatus.value = "Could not post advice. Try again.";
      return;
    }
    composeStatus.value = "";
    isBouncing.value = true;
    window.setTimeout(() => {
      isFading.value = true;
    }, 380);
    window.setTimeout(() => {
      router.push("/home?dropAdvice=1");
    }, 700);
  }

  return {
    content,
    category,
    categories,
    submitAdvice,
    session,
    composeStatus,
    isBouncing,
    isFading,
  };
}

export default async () => ({
  setup,
  template: await fetch(new URL("./index.html", import.meta.url)).then((r) =>
    r.text(),
  ),
});
