import { computed, ref } from "vue";

const categories = ["school", "personal", "love", "friendship", "random"];
const selectedCategory = ref(null);
const revealedAdvice = ref(null);
const savedAdviceIds = ref([]);
const adviceEntries = ref([
  { id: 1, content: "Start the assignment with the hardest part first.", category: "school" },
  { id: 2, content: "Review your notes for 15 minutes every day.", category: "school" },
  { id: 3, content: "Ask one question in class each week.", category: "school" },
  { id: 4, content: "Done is better than perfect on first drafts.", category: "school" },
  { id: 5, content: "Take breaks before you feel burned out.", category: "personal" },
  { id: 6, content: "Keep promises you make to yourself.", category: "personal" },
  { id: 7, content: "Protect your sleep like a deadline.", category: "personal" },
  { id: 8, content: "Write down worries to clear your mind.", category: "personal" },
  { id: 9, content: "Communicate needs directly, not indirectly.", category: "love" },
  { id: 10, content: "Choose someone who respects your boundaries.", category: "love" },
  { id: 11, content: "Pay attention to consistency, not just words.", category: "love" },
  { id: 12, content: "Apologize quickly and repair with action.", category: "love" },
  { id: 13, content: "Check in with friends even when life is busy.", category: "friendship" },
  { id: 14, content: "Say what you mean before resentment builds.", category: "friendship" },
  { id: 15, content: "Celebrate your friends without comparison.", category: "friendship" },
  { id: 16, content: "Be honest kindly, not harshly.", category: "friendship" },
  { id: 17, content: "If it takes under two minutes, do it now.", category: "other" },
  { id: 18, content: "Keep your space simple enough to reset quickly.", category: "other" },
  { id: 19, content: "Small routines beat big one-time efforts.", category: "other" },
  { id: 20, content: "When stuck, take a walk and return.", category: "other" },
]);

function receiveAdvice() {
  const pool =
    selectedCategory.value === "random"
      ? adviceEntries.value
      : adviceEntries.value.filter(
          (entry) => entry.category === selectedCategory.value,
        );
  if (pool.length === 0) {
    revealedAdvice.value = null;
    return false;
  }
  revealedAdvice.value = pool[Math.floor(Math.random() * pool.length)];
  return true;
}

function addAdvice({ content, category }) {
  adviceEntries.value.push({
    id: Date.now(),
    content: content.trim(),
    category,
  });
}

function addAdviceForActor({ actor, content, category }) {
  adviceEntries.value.push({
    id: Date.now(),
    actor,
    content: content.trim(),
    category,
  });
}

function hasContributed(actor) {
  if (!actor) return false;
  return adviceEntries.value.some((entry) => entry.actor === actor);
}

function adviceCount() {
  return computed(() => adviceEntries.value.length);
}

function savedAdviceEntries() {
  return computed(() =>
    adviceEntries.value.filter((entry) => savedAdviceIds.value.includes(entry.id)),
  );
}

function isSaved(adviceId) {
  return savedAdviceIds.value.includes(adviceId);
}

function toggleSaved(adviceId) {
  if (isSaved(adviceId)) {
    savedAdviceIds.value = savedAdviceIds.value.filter((id) => id !== adviceId);
    return;
  }
  savedAdviceIds.value.push(adviceId);
}

export function useAdviceJar() {
  return {
    categories,
    selectedCategory,
    revealedAdvice,
    adviceEntries,
    receiveAdvice,
    addAdvice,
    addAdviceForActor,
    hasContributed,
    adviceCount,
    savedAdviceIds,
    savedAdviceEntries,
    isSaved,
    toggleSaved,
  };
}
