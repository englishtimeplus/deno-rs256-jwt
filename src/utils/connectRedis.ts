import { connectRedis } from "../deps.ts";
import "jsr:@std/dotenv/load";

if (!Deno.env.get("REDIS_HOST")) {
    throw new Error("No REDIS_HOST provided in .env file");
}
if (!Deno.env.get("REDIS_PORT")) {
    throw new Error("No REDIS_PORT provided in .env file");
}

const redisClient = await connectRedis({
    hostname: Deno.env.get("REDIS_HOST"),
    port: parseInt(Deno.env.get("REDIS_PORT") || "6379"),

});

console.log("🚀 Redis connected successfully");

export default redisClient;
