import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import serverless from "serverless-http";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

const routerHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
    : await import("../dist/server/index.js"),
});

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // In production, redirect asset requests to CloudFront
  const cloudfrontUrl = process.env.CLOUDFRONT_URL;
  if (cloudfrontUrl) {
    app.use("/assets", (req, res) => {
      res.redirect(302, `${cloudfrontUrl}/assets${req.path}`);
    });
    app.use("/favicon.ico", (req, res) => {
      res.redirect(302, `${cloudfrontUrl}/favicon.ico`);
    });
    app.use("/logo-dark.png", (req, res) => {
      res.redirect(302, `${cloudfrontUrl}/logo-dark.png`);
    });
    app.use("/logo-light.png", (req, res) => {
      res.redirect(302, `${cloudfrontUrl}/logo-light.png`);
    });
  } else {
    // Fallback to local assets if CloudFront URL is not available
    app.use(
      "/assets",
      express.static("build/client/assets", { immutable: true, maxAge: "1y" })
    );
    app.use(express.static("build/client", { maxAge: "1h" }));
  }
}

app.use(morgan("tiny"));

// handle SSR requests
app.use(routerHandler);

export const handler = serverless(app);
