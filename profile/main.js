import { computed, getCurrentInstance, onScopeDispose, ref, watch } from "vue";
import { useGraffitiSession } from "@graffiti-garden/wrapper-vue";
import { useAdviceJar } from "../advice-jar.js";

function setup(props) {
  const instance = getCurrentInstance();
  const session = useGraffitiSession();
  const {
    adviceEntries,
    savedAdviceEntries,
    deleteGivenAdvice,
    removeSavedAdvice,
    isProfileAdviceLoading,
  } = useAdviceJar();
  const savedAdvice = savedAdviceEntries;

  function login() {
    instance?.proxy?.$graffiti?.login?.();
  }

  const resolvedActor = computed(() => {
    if (props.actor === "me" && session.value?.actor) {
      return session.value.actor;
    }
    return props.actor;
  });

  const givenAdviceImmediate = computed(() => {
    const a = resolvedActor.value;
    if (!a || a === "me") return [];
    return adviceEntries.value.filter((entry) => entry.actor === a);
  });

  /** Down-debounced like saved list — remote advice can briefly disappear during Graffiti sync. */
  const givenAdvice = ref([]);
  let givenAdviceDownTimer = null;

  watch(
    [givenAdviceImmediate, resolvedActor],
    ([next, actor], prev) => {
      clearTimeout(givenAdviceDownTimer);

      if (prev !== undefined && actor !== prev[1]) {
        givenAdvice.value = next;
        return;
      }

      const prevLen = givenAdvice.value.length;
      if (next.length >= prevLen) {
        givenAdvice.value = next;
        return;
      }

      givenAdviceDownTimer = setTimeout(() => {
        givenAdvice.value = givenAdviceImmediate.value;
        givenAdviceDownTimer = null;
      }, 260);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    clearTimeout(givenAdviceDownTimer);
  });

  const givenCount = computed(() => givenAdvice.value.length);

  return {
    session,
    login,
    savedAdvice,
    deleteGivenAdvice,
    removeSavedAdvice,
    givenAdvice,
    givenCount,
    isProfileAdviceLoading,
  };
}

export default async () => ({
  props: ["actor"],
  setup,
  components: {},
  template: await fetch(new URL("./index.html", import.meta.url)).then((r) =>
    r.text(),
  ),
});
