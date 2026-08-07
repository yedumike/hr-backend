// import { createWorker } from "tesseract.js";

// // runs OCR on an image/PDF buffer, returns the extracted text
// // this is deliberately a standalone function so it can be called
// // asynchronously after the upload response has already been sent
// export async function extractTextFromImage(buffer: Buffer): Promise<string> {
//   // createWorker spins up a Tesseract "worker" — loads the English
//   // language model and prepares the recognition engine
//   const worker = await createWorker("eng");

//   try {
//     const {
//       data: { text },
//     } = await worker.recognize(buffer);
//     return text;
//   } finally {
//     // always terminate the worker when done, whether it succeeded or failed —
//     // otherwise it stays in memory, wasting resources
//     await worker.terminate();
//   }
// }

import { createWorker } from "tesseract.js";

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  // load Tesseract's worker/core/language files from a CDN instead of
  // local node_modules — Vercel's bundler doesn't include these files
  // automatically since they're loaded dynamically, not via a static import
  const worker = await createWorker("eng", 1, {
    workerPath:
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
    corePath:
      "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}
