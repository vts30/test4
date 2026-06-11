import type { PerfRecord } from './recorder';

export interface ObservationRecord extends PerfRecord {
  metricName: string;
}

export interface Queue {
  enqueue(records: ObservationRecord[]): void;
  drain(): ObservationRecord[];
  size(): number;
}

let instance: Queue | null = null;

export function getQueue(): Queue {
  if (instance) return instance;

  const buffer: ObservationRecord[] = [];

  instance = {
    enqueue(records: ObservationRecord[]): void {
      buffer.push(...records);
    },
    drain(): ObservationRecord[] {
      return buffer.splice(0, buffer.length);
    },
    size(): number {
      return buffer.length;
    },
  };

  return instance;
}
