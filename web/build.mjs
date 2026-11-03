// Bundles the Desktop half into ../desktop/plugin.js. React and the plugin SDK come from Hermes at runtime;
// everything else is inlined, and the stylesheet is imported as text.
import { build } from "esbuild";

const result = await build({
  entryPoints: ["src/plugin.tsx"],
  outfile: "../desktop/plugin.js",
  bundle: true,
  format: "esm",
  jsx: "automatic",
  target: "es2022",
  external: ["react", "react/jsx-runtime", "@hermes/plugin-sdk"],
  loader: { ".css": "text" },
  legalComments: "none",
  metafile: true,
  logLevel: "info",
});

// Hermes gives plugins only react, react/jsx-runtime and its SDK. A library pulled in from node_modules (react-dom,
// say) would ship a second copy inside the bundle, so the build refuses anything outside src/.
const outside = Object.keys(result.metafile.inputs).filter((path) => !path.startsWith("src/"));
if (outside.length) {
  console.error(`Bundled code from outside src/: ${outside.join(", ")}`);
  process.exit(1);
}
