import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tutorRouter from "./tutor";
import gamificationRouter from "./gamification";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tutorRouter);
router.use(gamificationRouter);

export default router;
