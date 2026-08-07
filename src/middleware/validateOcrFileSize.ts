import { Request, Response, NextFunction } from "express";

export const validateOcrFileSize = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.file) {
    res.status(400).json({ error: "No file was uploaded" });
    return;
  }

  const FIVE_MB = 5 * 1024 * 1024;

  if (req.file.size > FIVE_MB) {
    res.status(400).json({
      error: `File size exceeds the 5MB ceiling for free OCR. Your file: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`,
    });
    return;
  }

  next();
};
