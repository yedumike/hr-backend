import axios from "axios";
import FormData from "form-data";

// same required-env-var pattern we've used throughout the project
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment variables`);
  }
  return value;
}

const OCR_SPACE_API_KEY = getRequiredEnv("OCR_SPACE_API_KEY");

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const formData = new FormData();

    // We pass a generic filename so the API automatically detects the mime structure (e.g. PDF vs Image)
    formData.append("file", buffer, { filename: "upload.pdf" });
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");

    const response = await axios.post("https://ocr.space", formData, {
      headers: {
        ...formData.getHeaders(),
        apikey: OCR_SPACE_API_KEY,
      },
      timeout: 7000, // Safely exits under Vercel's strict 10s ceiling
    });

    // Catch specific error payloads returned by the engine itself
    if (response.data.IsErroredOnProcessing) {
      const errorMsg = response.data.ErrorMessage?.[0] || "OCR engine error";
      throw new Error(`OCR.space Error: ${errorMsg}`);
    }

    const parsedResults = response.data.ParsedResults;
    if (parsedResults && parsedResults.length > 0) {
      return parsedResults[0].ParsedText || "";
    }

    return "";
  } catch (error: any) {
    console.error("OCR.space Execution Failure:", error.message || error);
    throw error;
  }
}

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

// import { createWorker } from "tesseract.js";

// export async function extractTextFromImage(buffer: Buffer): Promise<string> {
//   // corePath must point to a DIRECTORY, not a specific .wasm/.js file —
//   // pointing to one specific file (what we tried before) forces Tesseract
//   // to use that exact variant regardless of what the runtime environment
//   // actually supports, which is why it kept failing on Vercel's servers
//   const worker = await createWorker("eng", 1, {
//     corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.0.0",
//     langPath: "https://tessdata.projectnaptha.com/4.0.0",
//   });

//   try {
//     const {
//       data: { text },
//     } = await worker.recognize(buffer);
//     return text;
//   } finally {
//     await worker.terminate();
//   }
// }

// import { createWorker } from "tesseract.js";

// export async function extractTextFromImage(buffer: Buffer): Promise<string> {
//   // load Tesseract's worker/core/language files from a CDN instead of
//   // local node_modules — Vercel's bundler doesn't include these files
//   // automatically since they're loaded dynamically, not via a static import
//   const worker = await createWorker("eng", 1, {
//     workerPath:
//       "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
//     corePath:
//       "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
//     langPath: "https://tessdata.projectnaptha.com/4.0.0",
//   });

//   try {
//     const {
//       data: { text },
//     } = await worker.recognize(buffer);
//     return text;
//   } finally {
//     await worker.terminate();
//   }
// }
