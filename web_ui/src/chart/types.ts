import type { TimeFrame } from "../types";

export type { TimeFrame };

export interface CandleData {
    open: number;
    high: number;
    low: number;
    close: number;
    start: number;
    end: number;
    volume: number;
    trades: number;
    asset: string;
    interval: string;
}
