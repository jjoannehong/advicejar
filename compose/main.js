import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAdviceJar } from "../advice-jar.js";

function setup() {
  const router = useRouter();
  const { categories, addAdvice } = useAdviceJar();

  const content = ref("");
  const category = ref(categories[0]);

  function submitAdvice() {
    if (!content.value.trim()) return;
    addAdvice({
      content: content.value,
      category: category.value,
    });
    router.push("/home");
  }

  return { content, category, categories, submitAdvice };
}

export default async () => ({
  setup,
  template: await fetch(new URL("./index.html", import.meta.url)).then((r) =>
    r.text(),
  ),
});
