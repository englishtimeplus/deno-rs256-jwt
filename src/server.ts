import { Application, Router, logger, oakCors } from "./deps.ts";
import type { Context } from "./deps.ts";
import appRouter from "./routes/index.ts";

const app = new Application();
const router = new Router();

// Middleware Logger
// app.use(logger.default.logger);
// app.use(logger.default.responseTime);

app.use(oakCors({
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  headers: "Content-Type,Authorization",
  // preflightContinue: false,
  // optionsSuccessStatus: 204,
})); // Enable CORS for All Routes

// Logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

// Hello World!
// app.use((ctx) => {
//   ctx.response.body = "Hello World!";
// });

// Health checker
router.get<string>("/api/healthchecker", (ctx: Context) => {
  ctx.response.status = 200;
  ctx.response.body = {
    status: "success",
    message:
      "Welcome to JWT Authentication in Deno with Asymmetric Cryptography",
  };
});

//database connection




appRouter.init(app);
app.use(router.routes());
app.use(router.allowedMethods());


app.addEventListener("listen", ({ port, secure }) => {
  console.info(
    `🚀 Server started on ${secure ? "https://" : "http://"}localhost:${port}`
  );
});

const port = 8000;
app.listen({ port });
