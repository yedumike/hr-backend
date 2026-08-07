import { createWorker } from "tesseract.js";

// runs OCR on an image/PDF buffer, returns the extracted text
// this is deliberately a standalone function so it can be called
// asynchronously after the upload response has already been sent
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  // createWorker spins up a Tesseract "worker" — loads the English
  // language model and prepares the recognition engine
  const worker = await createWorker("eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    // always terminate the worker when done, whether it succeeded or failed —
    // otherwise it stays in memory, wasting resources
    await worker.terminate();
  }
}
