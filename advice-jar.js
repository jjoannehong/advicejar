import { computed, onScopeDispose, ref, watch } from "vue";
import { useGraffiti, useGraffitiDiscover, useGraffitiSession } from "@graffiti-garden/wrapper-vue";

export const categories = ["school", "personal", "love", "friendship", "random"];

export const ADVICE_CHANNEL = "advicejar/advice";
export const BOOKMARK_CHANNEL = "advicejar/bookmark";

const adviceDiscoverSchema = {
  type: "object",
  properties: {
    value: {
      type: "object",
      required: ["content", "category"],
      properties: {
        content: { type: "string" },
        category: { type: "string" },
      },
    },
  },
  required: ["value"],
};

const bookmarkDiscoverSchema = {
  type: "object",
  properties: {
    value: {
      type: "object",
      required: ["targetUrl"],
      properties: {
        targetUrl: { type: "string" },
      },
    },
  },
  required: ["value"],
};

const seedAdvice = [
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
];

let jarSingleton = null;

function createAdviceJar() {
  const graffiti = useGraffiti();
  const session = useGraffitiSession();
  const selectedCategory = ref(null);
  const revealedAdvice = ref(null);

  const { objects: remoteAdviceObjects, isFirstPoll: adviceFirstPoll } = useGraffitiDiscover(
    [ADVICE_CHANNEL],
    adviceDiscoverSchema,
    undefined,
    true,
  );

  const { objects: bookmarkObjects, isFirstPoll: bookmarksFirstPoll } = useGraffitiDiscover(
    [BOOKMARK_CHANNEL],
    bookmarkDiscoverSchema,
    () => session.value,
    true,
  );

  /** Keeps saved UI stable until Graffiti bookmarks sync after post/delete. */
  const optimisticSavedUrls = ref([]);
  /** User chose unsave while the bookmark post was still in flight — delete after post completes. */
  const pendingCancelSaveUrls = ref([]);

  /** True while Graffiti is finishing its first discover poll (profile lists would otherwise flash empty). */
  const isProfileAdviceLoading = computed(
    () =>
      Boolean(session.value?.actor) && (adviceFirstPoll.value || bookmarksFirstPoll.value),
  );

  const remoteAdvice = computed(() =>
    (remoteAdviceObjects.value ?? []).map((o) => ({
      id: o.url,
      url: o.url,
      content: o.value.content,
      category: o.value.category,
      actor: o.actor,
    })),
  );

  const adviceEntries = computed(() => [
    ...seedAdvice.map((s) => ({
      id: s.id,
      /** Stable bookmark target for Graffiti saves (seed tips are not posted as objects). */
      url: `seed:${s.id}`,
      content: s.content,
      category: s.category,
    })),
    ...remoteAdvice.value,
  ]);

  function poolForReceive(actor) {
    let pool =
      selectedCategory.value === "random"
        ? adviceEntries.value
        : adviceEntries.value.filter((entry) => entry.category === selectedCategory.value);
    if (actor) {
      pool = pool.filter((entry) => entry.actor !== actor);
    }
    return pool;
  }

  function receiveAdvice() {
    const actor = session.value?.actor ?? null;
    const pool = poolForReceive(actor);
    if (pool.length === 0) {
      revealedAdvice.value = null;
      return false;
    }
    revealedAdvice.value = pool[Math.floor(Math.random() * pool.length)];
    return true;
  }

  async function addAdviceForActor({ actor, content, category: cat }) {
    const sess = session.value;
    if (!sess?.actor || actor !== sess.actor) return;
    await graffiti.post(
      {
        channels: [ADVICE_CHANNEL],
        value: { content: content.trim(), category: cat },
      },
      sess,
    );
  }

  function hasContributed(actor) {
    if (!actor) return false;
    return remoteAdvice.value.some((entry) => entry.actor === actor);
  }

  const adviceCount = computed(() => adviceEntries.value.length);

  /** Raw merged bookmarks + optimistic saves (can flicker when Graffiti sync replaces arrays). */
  const savedAdviceMerge = computed(() => {
    const byUrl = new Map(
      adviceEntries.value.filter((e) => e.url).map((e) => [e.url, e]),
    );

    const merged = new Map();

    for (const b of bookmarkObjects.value ?? []) {
      const targetUrl = b.value?.targetUrl;
      if (!targetUrl) continue;
      const entry = byUrl.get(targetUrl);
      merged.set(targetUrl, {
        url: targetUrl,
        content: entry?.content ?? "This advice is no longer on the network.",
        category: entry?.category ?? "unknown",
        missing: !entry,
      });
    }

    for (const u of optimisticSavedUrls.value) {
      if (merged.has(u)) continue;
      const entry = byUrl.get(u);
      merged.set(u, {
        url: u,
        content: entry?.content ?? "…",
        category: entry?.category ?? "",
        missing: !entry,
      });
    }

    return [...merged.values()].sort((a, b) => a.url.localeCompare(b.url));
  });

  /** Profile “saved” column: debounce merge snapshots so Graffiti poll churn becomes one UI update. */
  const SAVED_MERGE_DEBOUNCE_MS = 400;
  const SAVED_MERGE_EMPTY_GUARD_MS = 350;

  const savedAdviceEntries = ref([]);
  let savedMergeApplyTimer = null;
  let savedMergeEmptyGuardTimer = null;

  function bookmarkForTarget(adviceUrl) {
    return (bookmarkObjects.value ?? []).find((b) => b.value.targetUrl === adviceUrl);
  }

  function sortSavedMergeRows(rows) {
    return [...rows].sort((a, b) => a.url.localeCompare(b.url));
  }

  function savedMergeRowsEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      const y = b[i];
      if (
        x.url !== y.url ||
        x.content !== y.content ||
        x.category !== y.category ||
        Boolean(x.missing) !== Boolean(y.missing)
      ) {
        return false;
      }
    }
    return true;
  }

  function setSavedAdviceEntriesFromMerge() {
    const sorted = sortSavedMergeRows(savedAdviceMerge.value);
    if (savedMergeRowsEqual(savedAdviceEntries.value, sorted)) return;
    savedAdviceEntries.value = sorted;
  }

  function flushSavedDisplayNow() {
    clearTimeout(savedMergeApplyTimer);
    clearTimeout(savedMergeEmptyGuardTimer);
    savedMergeApplyTimer = null;
    savedMergeEmptyGuardTimer = null;
    setSavedAdviceEntriesFromMerge();
  }

  let savedMergeWatchInitial = true;

  watch(
    savedAdviceMerge,
    () => {
      if (savedMergeWatchInitial) {
        savedMergeWatchInitial = false;
        setSavedAdviceEntriesFromMerge();
        return;
      }

      clearTimeout(savedMergeApplyTimer);
      clearTimeout(savedMergeEmptyGuardTimer);
      savedMergeEmptyGuardTimer = null;

      savedMergeApplyTimer = setTimeout(() => {
        savedMergeApplyTimer = null;
        const raw = savedAdviceMerge.value;
        if (raw.length === 0 && savedAdviceEntries.value.length > 0) {
          savedMergeEmptyGuardTimer = setTimeout(() => {
            savedMergeEmptyGuardTimer = null;
            if (savedAdviceMerge.value.length === 0 && savedAdviceEntries.value.length > 0) {
              savedAdviceEntries.value = [];
            }
          }, SAVED_MERGE_EMPTY_GUARD_MS);
          return;
        }
        const sorted = sortSavedMergeRows(raw);
        if (savedMergeRowsEqual(savedAdviceEntries.value, sorted)) return;
        savedAdviceEntries.value = sorted;
      }, SAVED_MERGE_DEBOUNCE_MS);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    clearTimeout(savedMergeApplyTimer);
    clearTimeout(savedMergeEmptyGuardTimer);
    savedMergeApplyTimer = null;
    savedMergeEmptyGuardTimer = null;
  });

  watch(
    bookmarkObjects,
    () => {
      optimisticSavedUrls.value = optimisticSavedUrls.value.filter((u) => !bookmarkForTarget(u));
    },
    { deep: true },
  );

  function isSaved(adviceUrl) {
    if (!adviceUrl) return false;
    if (optimisticSavedUrls.value.includes(adviceUrl)) return true;
    return !!bookmarkForTarget(adviceUrl);
  }

  async function toggleSaved(adviceUrl) {
    const sess = session.value;
    if (!sess?.actor || !adviceUrl) return;

    const existing = bookmarkForTarget(adviceUrl);
    if (existing) {
      optimisticSavedUrls.value = optimisticSavedUrls.value.filter((u) => u !== adviceUrl);
      pendingCancelSaveUrls.value = pendingCancelSaveUrls.value.filter((u) => u !== adviceUrl);
      await graffiti.delete(existing.url, sess);
      flushSavedDisplayNow();
      return;
    }

    if (optimisticSavedUrls.value.includes(adviceUrl)) {
      optimisticSavedUrls.value = optimisticSavedUrls.value.filter((u) => u !== adviceUrl);
      if (!pendingCancelSaveUrls.value.includes(adviceUrl)) {
        pendingCancelSaveUrls.value = [...pendingCancelSaveUrls.value, adviceUrl];
      }
      flushSavedDisplayNow();
      return;
    }

    pendingCancelSaveUrls.value = pendingCancelSaveUrls.value.filter((u) => u !== adviceUrl);
    optimisticSavedUrls.value = [...optimisticSavedUrls.value, adviceUrl];

    try {
      const posted = await graffiti.post(
        {
          channels: [BOOKMARK_CHANNEL],
          value: { targetUrl: adviceUrl },
          allowed: [sess.actor],
        },
        sess,
      );

      if (pendingCancelSaveUrls.value.includes(adviceUrl)) {
        pendingCancelSaveUrls.value = pendingCancelSaveUrls.value.filter((u) => u !== adviceUrl);
        await graffiti.delete(posted.url, sess);
        optimisticSavedUrls.value = optimisticSavedUrls.value.filter((u) => u !== adviceUrl);
        flushSavedDisplayNow();
      }
      /* If not cancelled: leave optimistic until bookmark sync (watch prunes). */
    } catch (e) {
      optimisticSavedUrls.value = optimisticSavedUrls.value.filter((u) => u !== adviceUrl);
      pendingCancelSaveUrls.value = pendingCancelSaveUrls.value.filter((u) => u !== adviceUrl);
      flushSavedDisplayNow();
      throw e;
    }
  }

  /** In-memory only — refreshing the page wipes this so undo isn't possible after reload. */
  const lastDeletion = ref(null);

  async function deleteGivenAdvice(adviceUrl) {
    const sess = session.value;
    if (!sess?.actor || !adviceUrl) return;

    const entry = adviceEntries.value.find((e) => e.url === adviceUrl);
    await graffiti.delete(adviceUrl, sess);

    if (entry) {
      lastDeletion.value = {
        kind: "given",
        content: entry.content,
        category: entry.category,
      };
    }
  }

  async function removeSavedAdvice(adviceUrl) {
    const sess = session.value?.actor;
    if (!sess || !adviceUrl) return;

    const b = bookmarkForTarget(adviceUrl);
    if (b) {
      optimisticSavedUrls.value = optimisticSavedUrls.value.filter((u) => u !== adviceUrl);
      await graffiti.delete(b.url, session.value);
      flushSavedDisplayNow();
      lastDeletion.value = { kind: "saved", adviceUrl };
      return;
    }

    if (optimisticSavedUrls.value.includes(adviceUrl)) {
      optimisticSavedUrls.value = optimisticSavedUrls.value.filter((u) => u !== adviceUrl);
      if (!pendingCancelSaveUrls.value.includes(adviceUrl)) {
        pendingCancelSaveUrls.value = [...pendingCancelSaveUrls.value, adviceUrl];
      }
      flushSavedDisplayNow();
      lastDeletion.value = { kind: "saved", adviceUrl };
    }
  }

  async function undoLastDeletion() {
    const snap = lastDeletion.value;
    if (!snap) return;
    lastDeletion.value = null;

    if (snap.kind === "given") {
      const sess = session.value;
      if (!sess?.actor) return;
      await graffiti.post(
        {
          channels: [ADVICE_CHANNEL],
          value: { content: snap.content, category: snap.category },
        },
        sess,
      );
      return;
    }

    if (snap.kind === "saved") {
      await toggleSaved(snap.adviceUrl);
    }
  }

  function dismissUndo() {
    lastDeletion.value = null;
  }

  function canPersistAdvice(entry) {
    return Boolean(entry?.url);
  }

  return {
    categories,
    selectedCategory,
    revealedAdvice,
    adviceEntries,
    receiveAdvice,
    addAdviceForActor,
    hasContributed,
    adviceCount,
    savedAdviceEntries,
    isSaved,
    toggleSaved,
    deleteGivenAdvice,
    removeSavedAdvice,
    canPersistAdvice,
    isProfileAdviceLoading,
    lastDeletion,
    undoLastDeletion,
    dismissUndo,
  };
}

/**
 * Call once from the root app setup (before child routes) so Graffiti discovery is shared.
 */
export function useAdviceJar() {
  if (!jarSingleton) {
    jarSingleton = createAdviceJar();
  }
  return jarSingleton;
}
