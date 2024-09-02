import { type Context } from "../deps.ts";

import { verifyToken } from "../utils/jwt.ts";



const requireUser = async (ctx: Context, next: () => Promise<unknown>) => {
  const authHeader = ctx.request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const token = authHeader.split(" ")[1];
  //

  //
  const payload = await verifyToken(token);
  // console.log("payload : ", payload);
  // payload :  {
  //   iss: "https://cocomarket.me",
  //   iat: 1725167211,
  //   exp: 53979887211,
  //   sub: "356db14f-78f0-4c15-9b0f-68a04e98e89b",
  //   tokenId: "882f2d33-840a-409d-8d84-37d3072eaa47"
  // }


  await next();
}
export default requireUser;
