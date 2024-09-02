import { type Context, RouterContext, hash, compare, SMTPClient } from "../deps.ts";

import { pool } from "../db.ts";
import redisClient from "../utils/connectRedis.ts";
import "jsr:@std/dotenv/load";

import { createTokens } from "../utils/jwt.ts";

export type IUser = {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
};

export const users: IUser[] = [];

const ACCESS_TOKEN_EXPIRES_IN = 10
const REFRESH_TOKEN_EXPIRES_IN = 60
const ACCESS_TOKEN_PRIVATE_KEY = Deno.env.get("ACCESS_TOKEN_PRIVATE_KEY") || "";
const NODE_ENV = Deno.env.get("NODE_ENV") || "development";
// console.log(ACCESS_TOKEN_PRIVATE_KEY);

async function loadTemplate(filePath: string): Promise<string> {
    const decoder = new TextDecoder("utf-8");
    const templateContent = await Deno.readFile(filePath);
    return decoder.decode(templateContent);
}

// Function to replace placeholders with actual data
function populateTemplate(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{\.([a-zA-Z]+)\}\}/g, (_, key) => data[key] || "");
}

//send email
// const sendEmail = async (email: string, token: string) => {
const sendEmailController = async (ctx: Context) => {
    try {
        if (!ctx.request.hasBody) {
            ctx.throw(415);
        }
        const { email } = await ctx.request.body.json();
        const mailInfo = {
            host: Deno.env.get("EMAIL_HOST"),
            port: Deno.env.get("EMAIL_PORT"),
            secure: Deno.env.get("EMAIL_SECURE"),
            from: Deno.env.get("EMAIL_FROM"),
            pasword: Deno.env.get("EMAIL_PASSWORD"),
        }
        console.log(mailInfo);

        console.log("email: ", email);

        const data = {
            Name: "John Doe",
            Email: "john.doe@example.com",
            Link: "https://example.com/more-info",
        };

        const templatePath = `${Deno.cwd()}\\src\\template\\1.html`;
        const template = await loadTemplate(templatePath);
        const htmlContent = populateTemplate(template, data);

        const client = new SMTPClient({
            connection: {
                hostname: mailInfo.host,
                port: 465,
                tls: true,
                auth: {
                    username: mailInfo.from,
                    password: mailInfo.pasword,
                },
            },
        });

        await client.send({
            from: mailInfo.from,
            to: email,
            subject: "Welcome! CoCo Market",
            content: "This is a text version of the email",
            html: htmlContent,
        });

        await client.close();


    }
    catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { status: "error", message: error.message };
        return;
    }

}
//regist ===================================================================== 
const registController = async (ctx: Context) => {
    try {

        if (!ctx.request.hasBody) {
            ctx.throw(415);
        }
        const { name, email, password } = await ctx.request.body.json();
        //validation
        if (name === '' || email === '' || password === '') {
            ctx.response.status = 400;
            ctx.response.body = {
                status: "fail",
                message: "Invalid input",
            };
            return;
        }

        //exist user check
        const connection = await pool.connect();
        const res1 = await connection.queryObject("SELECT password FROM users WHERE email = $1 LIMIT 1", email);
        // console.log(res1.rows);
        if (res1.rows.length > 0) {
            ctx.response.status = 409;
            ctx.response.body = {
                status: "fail",
                message: "User with that email already exists",
            };
            return;
        }


        //hash password 
        const hashedPassword = await hash(password);
        const userId = crypto.randomUUID();
        const role = 'GUEST';

        // insert user 
        const res2 = await connection.queryObject(
            "INSERT INTO users (id, name, email, password,role) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            userId,
            name,
            email,
            hashedPassword,
            role
        );
        connection.release();


        // console.log(res2.rows);

        const user = {
            id: res2.rows[0].id,
            name: res2.rows[0].name,
            email: res2.rows[0].email,
            avatar: '',
            createdAt: res2.rows[0].created_at
        }


        // create JWT
        // const access_token = await createTokens(userId, cookies);

        //return response
        ctx.response.status = 201;
        ctx.response.body = {
            status: "success",
            // access_token,
            user,
        };

    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { status: "error", message: error.message };
        return;
    }
};

function addDays(date, days) {
    const result = new Date(date); // 주어진 날짜로 새 Date 객체 생성
    result.setDate(result.getDate() + days); // 날짜에 days를 더함
    return result;
}

//login =======================================================================
const loginController = async (ctx: Context) => {
    try {
        // const { email, password }: { email: string; password: string } = await ctx.request.body().value;
        if (!ctx.request.hasBody) {
            ctx.throw(415);
        }
        const { email, password }: { email: string; password: string } = await ctx.request.body.json();

        // //validation
        if (email === '' || password === '') {

            ctx.response.status = 400;
            ctx.response.body = {
                status: "fail",
                message: "Invalid input",
            };
            return;
        }
        const connection = await pool.connect();
        const user = await connection.queryObject("SELECT id,name,avatar,password FROM users WHERE email = $1 AND deleted_at is null", email);
        if (user.rows.length === 0) {
            ctx.response.status = 401;
            ctx.response.body = {
                status: "fail",
                message: "Invalid email or password.",
            };
            return;
        }
        const userId = user.rows[0].id;
        const name = user.rows[0].name;
        const avatar = user.rows[0].avatar;

        const dbPassword = user.rows[0].password;
        const isMatch = await compare(password, dbPassword);

        if (!isMatch) {
            ctx.response.status = 401;
            ctx.response.body = {
                status: "fail",
                message: "Invalid email or password..",
            };
            return;
        }
        if (ACCESS_TOKEN_PRIVATE_KEY === undefined || ACCESS_TOKEN_PRIVATE_KEY === '') {
            ctx.response.status = 500;
            ctx.response.body = {
                status: "error",
                message: "Internal server error. ACCESS_TOKEN_PRIVATE_KEY is not defined.",
            };
            return;
        }

        const access_uuid = crypto.randomUUID();
        const refresh_uuid = crypto.randomUUID();
        const accessTokenExpiresIn = 7; // 7 days
        const refreshTokenExpiresIn = 30; // 30 days

        let access_token = await createTokens(userId, access_uuid, accessTokenExpiresIn);
        let refresh_token = await createTokens(userId, refresh_uuid, refreshTokenExpiresIn);


        const ACCESS_TOKEN_EXPIRES_IN = 10;
        const REFRESH_TOKEN_EXPIRES_IN = 60;
        //redis set
        await Promise.all([
            redisClient.set(access_uuid, userId, {
                ex: ACCESS_TOKEN_EXPIRES_IN * 60,
            }),
            redisClient.set(refresh_uuid, userId, {
                ex: REFRESH_TOKEN_EXPIRES_IN * 60,
            }),
        ]);

        //cookies set
        // ctx.cookies.set("access_token", access_token, {
        //     expires: new Date(Date.now() + 600000), // Expires in 10 minutes,
        //     maxAge: ACCESS_TOKEN_EXPIRES_IN * 60,
        //     httpOnly: true,
        //     secure: NODE_ENV === 'production', // Set to true in production,
        //     sameSite: 'Lax'
        // });
        // ctx.cookies.set("refresh_token", refresh_token, {
        //     expires: new Date(Date.now() + 3600000), // Expires in 1 hour,
        //     maxAge: REFRESH_TOKEN_EXPIRES_IN * 60,
        //     httpOnly: true,
        //     secure: NODE_ENV === 'production', // Set to true in production,
        //     sameSite: 'Lax'
        // });

        const userInfo = {
            id: userId,
            name: name,
            email: email,
            avatar: avatar,
        }

        ctx.response.status = 200;
        ctx.response.body = {
            status: "success",
            userInfo,
            access_token,
            refresh_token,
            access_uuid,
            refresh_uuid,
        };


    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { status: "error", message: error.message };
        return;
    }
};

const logoutController = async (ctx: Context) => {
    try {
        if (!ctx.request.hasBody) {
            ctx.throw(415);
        }
        const { access_token, refresh_token } = await ctx.request.body.json();
        //validation
        if (access_token === '' || refresh_token === '') {
            ctx.response.status = 400;
            ctx.response.body = {
                status: "fail",
                message: "Invalid input",
            };
            return;
        }

        //delete redis
        await Promise.all([
            redisClient.del(access_token),
            redisClient.del(refresh_token),
        ]);

        //cookies delete
        ctx.cookies.delete("access_token");
        ctx.cookies.delete("refresh_token");

        ctx.response.status = 200;
        ctx.response.body = {
            status: "success",
            message: "logout success",
        };

    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { status: "error", message: error.message };
        return;
    }
};

function generateRandomCode(): string {
    const min = 100000; // 최소값 (6자리)
    const max = 999999; // 최대값 (6자리)
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

const forgetController = async (ctx: Context) => {
    try {

        if (!ctx.request.hasBody) {
            ctx.throw(415);
        }
        const { email } = await ctx.request.body.json();

        //validation
        if (email === '') {
            ctx.response.status = 400;
            ctx.response.body = {
                status: "fail",
                message: "Invalid input",
            };
            return;
        }
        const connection = await pool.connect();
        const user = await connection.queryObject("SELECT id,name FROM users WHERE email = $1 AND deleted_at is null", email);
        if (user.rows.length === 0) {
            ctx.response.status = 401;
            ctx.response.body = {
                status: "fail",
                message: "Invalid email.",
            };
            return;
        }
        const userId = user.rows[0].id;
        const name = user.rows[0].name;
        const randomCode = generateRandomCode();
        //TODO send email
        //send email

        const mailInfo = {
            from: "info@cocomarket.me",
            to: email,
            name: name,
            userId: userId,
            template: 2,
        }


        const res = await fetch(`http://localhost:8080/send-email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(mailInfo),
        });
        console.log(res);
        const result = await res.json();
        console.log(result);


        ctx.response.status = 200;
        ctx.response.body = {
            status: "success",
            message: "Check your email.",
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { status: "error", message: error.message };
        return;
    }
};

export const resetController = async (ctx: Context) => {
    try {


        if (!ctx.request.hasBody) {
            ctx.throw(415);
        }
        const { email, token, password } = await ctx.request.body.json();

        //validation
        if (email === '' || token === '' || password === '') {
            ctx.response.status = 400;
            ctx.response.body = {
                status: "fail",
                message: "Invalid input",
            };
            return;
        }
        const connection = await pool.connect();
        const user = await connection.queryObject("SELECT id FROM users WHERE email = $1 AND deleted_at is null", email);
        if (user.rows.length === 0) {
            ctx.response.status = 401;
            ctx.response.body = {
                status: "fail",
                message: "Invalid email.",
            };
            return;
        }
        const userId = user.rows[0].id;
        //TODO check token
        const hashedPassword = await hash(password);
        await connection.queryObject("UPDATE users SET password = $1 WHERE id = $2", hashedPassword, userId);
        ctx.response.status = 200;
        ctx.response.body = {
            status: "success",
            message: "Password reset success.",
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { status: "error", message: error.message };
        return;
    }
};

export default {
    registController,
    loginController,
    logoutController,
    forgetController,
    resetController,
    sendEmailController,
};
