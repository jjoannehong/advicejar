import { computed, defineAsyncComponent, getCurrentInstance } from "vue";
import { useGraffitiSession } from "@graffiti-garden/wrapper-vue";
import { useAdviceJar } from "../advice-jar.js";

function setup(props) {
  const instance = getCurrentInstance();
  const session = useGraffitiSession();
  const {
    adviceEntries,
    savedAdviceEntries,
    savedAdviceIds,
    toggleSaved,
  } = useAdviceJar();
  const savedAdvice = savedAdviceEntries();

  function login() {
    instance?.proxy?.$graffiti?.login?.();
  }

  const resolvedActor = computed(() => {
    if (props.actor === "me" && session.value?.actor) {
      return session.value.actor;
    }
    return props.actor;
  });

  const givenAdvice = computed(() => {
    const a = resolvedActor.value;
    if (!a || a === "me") return [];
    return adviceEntries.value.filter((entry) => entry.actor === a);
  });

  const givenCount = computed(() => givenAdvice.value.length);

  return {
    session,
    login,
    savedAdvice,
    savedAdviceIds,
    toggleSaved,
    givenAdvice,
    givenCount,
  };
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
