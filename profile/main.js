import { defineAsyncComponent } from "vue";
import { useAdviceJar } from "../advice-jar.js";

function setup() {
  const { savedAdviceEntries, savedAdviceIds, toggleSaved } = useAdviceJar();
  const savedAdvice = savedAdviceEntries();

  return { savedAdvice, savedAdviceIds, toggleSaved };
}

export default async () => ({
  props: ["actor"],
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
