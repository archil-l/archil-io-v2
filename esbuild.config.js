import { build } from "esbuild";

build({
  entryPoints: ["deployment/server.js"],
  bundle: true,
  outfile: "dist/lambda-pkg/web-app-handler.js",
  platform: "node",
  format: "esm",
  target: "node24",
  external: [
    // AWS Lambda runtime APIs
    "@aws-sdk/*",
  ],
  minify: true,
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
}).catch(() => process.exit(1));
