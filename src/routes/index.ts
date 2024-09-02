import { Application } from "../deps.ts";
import authRouter from "./auth.routes.ts";
import userRouter from "./user.routes.ts";


function init(app: Application) {
  app.use(authRouter.prefix("/api/auth/").routes());
  app.use(userRouter.prefix("/api/user/").routes());
}

export default {
  init,
};
