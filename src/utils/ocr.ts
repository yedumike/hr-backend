import axios from "axios";
import FormData from "form-data";
import { PDFDocument } from "pdf-lib";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment variables`);
  }
  return value;
}

const OCR_SPACE_API_KEY = getRequiredEnv("OCR_SPACE_API_KEY");
const MAX_PAGES = 2; // stay safely under OCR.space's 3-page free-tier limit

// if the file is a PDF with more than MAX_PAGES, returns a trimmed buffer
// containing only the first MAX_PAGES pages, plus a flag noting truncation.
// non-PDF files (images) are returned unchanged, since they're single-page by nature.
async function prepareBufferForOcr(
  buffer: Buffer,
  mimetype: string,
): Promise<{ buffer: Buffer; wasTruncated: boolean; totalPages: number }> {
  if (mimetype !== "application/pdf") {
    return { buffer, wasTruncated: false, totalPages: 1 };
  }

  const originalPdf = await PDFDocument.load(buffer);
  const totalPages = originalPdf.getPageCount();

  if (totalPages <= MAX_PAGES) {
    return { buffer, wasTruncated: false, totalPages };
  }

  // build a new PDF containing only the first MAX_PAGES pages
  const trimmedPdf = await PDFDocument.create();
  const pageIndices = Array.from({ length: MAX_PAGES }, (_, i) => i);
  const copiedPages = await trimmedPdf.copyPages(originalPdf, pageIndices);
  copiedPages.forEach((page) => trimmedPdf.addPage(page));

  const trimmedBytes = await trimmedPdf.save();

  return {
    buffer: Buffer.from(trimmedBytes),
    wasTruncated: true,
    totalPages,
  };
}

export async function extractTextFromImage(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  try {
    const {
      buffer: preparedBuffer,
      wasTruncated,
      totalPages,
    } = await prepareBufferForOcr(buffer, mimetype);

    const formData = new FormData();
    formData.append("file", preparedBuffer, {
      filename,
      contentType: mimetype,
    });
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");

    const response = await axios({
      method: "post",
      url: "/parse/image",
      baseURL: "https://api.ocr.space",
      data: formData,
      headers: {
        ...formData.getHeaders(),
        apikey: OCR_SPACE_API_KEY,
      },
      timeout: 9500,
    });

    if (response.data.IsErroredOnProcessing) {
      const errorMsg = response.data.ErrorMessage?.[0] || "OCR engine error";
      throw new Error(`OCR.space Error: ${errorMsg}`);
    }

    const parsedResults = response.data.ParsedResults;
    let text =
      parsedResults && parsedResults.length > 0
        ? parsedResults[0].ParsedText || ""
        : "";

    // append a clear note if we only processed part of the document
    if (wasTruncated) {
      text += `\n\n[Note: This document has ${totalPages} pages. Only the first ${MAX_PAGES} pages were processed for text extraction due to OCR provider limits.]`;
    }

    return text;
  } catch (error: any) {
    console.error("OCR.space Execution Failure:", error.message || error);
    throw error;
  }
}
