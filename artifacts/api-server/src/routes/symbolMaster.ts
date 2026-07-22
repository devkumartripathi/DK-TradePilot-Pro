import { Router } from "express";
import { loadSymbolMaster } from "../services/symbolMasterLoader";

const router = Router();

router.get("/symbol-master/test", async (_req, res) => {
  try {
    const csv = await loadSymbolMaster();

    res.json({
      success: true,
      size: csv.length,
      preview: csv.substring(0, 300),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;