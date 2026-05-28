import type { Request, Response } from '@playwright/test';

export interface PerfRecord {
  url: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  responseSizeBytes: number | null;
  contentType: string | null;
  assertions: Record<string, string>;
}

export interface Recorder {
  onRequest(request: Request, startTime: number): void;
  onResponse(response: Response, endTime: number): void;
  records: PerfRecord[];
}

const CAPTURED_HEADERS = ['x-request-id', 'x-trace-id', 'cache-control', 'etag'];

export function createRecorder(): Recorder {
  const records: PerfRecord[] = [];
  const requestTimings = new WeakMap<Request, number>();

  return {
    records,
    onRequest(request: Request, startTime: number): void {
      requestTimings.set(request, startTime);
    },
    onResponse(response: Response, endTime: number): void {
      const request = response.request();
      const startTime = requestTimings.get(request);
      if (startTime === undefined) return;

      const headers = response.headers();
      const contentLength = headers['content-length'];
      const assertions: Record<string, string> = {};
      for (const header of CAPTURED_HEADERS) {
        if (headers[header]) assertions[header] = headers[header];
      }

      records.push({
        url: request.url(),
        method: request.method(),
        statusCode: response.status(),
        responseTimeMs: endTime - startTime,
        responseSizeBytes: contentLength ? parseInt(contentLength, 10) : null,
        contentType: headers['content-type'] ?? null,
        assertions,
      });
    },
  };
}
