export default async () => ({
  props: ["saved"],
  emits: ["toggle-save"],
  template: await fetch(new URL("./index.html", import.meta.url)).then((r) =>
    r.text(),
  ),
});
