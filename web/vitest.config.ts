import { defineConfig } from "vitest/config";

export default defineConfig({
  // A stylesheet imported with "?raw" is read as text (a plain .css import stays empty, as it is only text for the
  // bundler), so a test can put the real styles on the page and check what they do (core/testing.tsx: withStyles).
  test: { environment: "jsdom", css: { include: [/\?raw$/] } },
});
