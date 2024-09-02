import { create, verify, getNumericDate, Payload, Header } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import "jsr:@std/dotenv/load";

const secretKey = Deno.env.get("ACCESS_TOKEN_PRIVATE_KEY") || "";
if (!secretKey) {
    throw new Error("ACCESS_TOKEN_PRIVATE_KEY is required");
}
const encoder = new TextEncoder()
var keyBuf = encoder.encode(secretKey);

var key = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign", "verify"],
)

const header: Header = {
    alg: "HS256",
    typ: "JWT",
    foo: "bar"  // custom header
};
function addDays(date, days) {
    const result = new Date(date); // 주어진 날짜로 새 Date 객체 생성
    result.setDate(result.getDate() + days); // 날짜에 days를 더함
    return result;
}

export async function createTokens(userId: string, tokenId: string, expDay: number) {
    const issuer = "https://cocomarket.me"  //발급자
    const iat = getNumericDate(new Date());  //발급시간
    const day7 = addDays(new Date(), expDay);
    const exp = getNumericDate(day7);  //만료시간

    const payload: Payload = {
        iss: issuer,
        iat: iat,
        exp: exp,
        sub: userId,  //user id
        tokenId: tokenId, //token
    };
    const token = await create(header, payload, key)

    return token;
}

export async function verifyToken(jwt: string) {
    try {
        const payload = await verify(jwt, key);
        return payload;
    }
    catch (_e) {
        const e: Error = _e;
        console.log(e.message);
    }
}