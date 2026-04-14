import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gamificationRouter from "./gamification";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gamificationRouter);

export default router;
