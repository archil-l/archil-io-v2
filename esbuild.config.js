import { build } from "esbuild";
import { writeFileSync } from "fs";

build({
  entryPoints: ["deployment/server.js"],
  bundle: true,
  outfile: "dist/lambda-pkg/web-app-handler.js",
  platform: "node",
  format: "cjs",
  target: "node24",
  external: [
    // AWS Lambda runtime APIs
    "@aws-sdk/*",
    // Node.js built-ins
    "fs",
    "path",
    "stream",
    "util",
    "crypto",
    "os",
    "buffer",
    "events",
    "http",
    "https",
    "zlib",
  ],
  minify: true,
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
})
  .then(() => {
    // Create package.json to mark the Lambda package as CommonJS module
    writeFileSync(
      "dist/lambda-pkg/package.json",
      JSON.stringify({ type: "commonjs" }, null, 2),
    );
  })
  .catch(() => process.exit(1));
