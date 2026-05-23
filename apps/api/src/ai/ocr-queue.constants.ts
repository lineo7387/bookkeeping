export const OCR_QUEUE_NAME = 'ocr-tasks';
export const OCR_JOB_NAME = 'process-receipt';

export interface OcrJobData {
  taskId: string;
  ledgerId: string;
  userId: string;
  storageKey: string;
  mimeType: string;
}
