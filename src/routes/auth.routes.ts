import { Router } from "../deps.ts";
import authController from "../controllers/auth.controller.ts";
import requireUser from "../middleware/requireUser.ts";

const router = new Router();

router.post("/regist", authController.registController);
router.post("/login", authController.loginController);
router.post("/logout", authController.logoutController);

router.post<string>("/forgot-password", authController.forgetController);
router.post<string>("/reset-password", authController.resetController);

router.post("/send-email", authController.sendEmailController);


// router.post<string>("/regist", authController.signUpUserController);
// router.post<string>("/login", authController.loginUserController);

// router.post<string>("/logout", authController.logoutController);

// router.get<string>("/refresh-token", authController.refreshAccessTokenController);


export default router;
