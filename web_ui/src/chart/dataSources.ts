import {
    fetchHyperliquidCandles,
    HYPERLIQUID_INTERVALS,
    type HyperliquidInterval,
} from "../api/hyperliquidCandles";
import { fromTimeFrame } from "../types";
import type { CandleData, TimeFrame } from "./types";

export const isTimeframeSupported = (tf: TimeFrame) =>
    HYPERLIQUID_INTERVALS.includes(fromTimeFrame(tf) as HyperliquidInterval);

export async function fetchCandles(
    asset: string,
    startTime: number,
    endTime: number,
    tf: TimeFrame,
    signal?: AbortSignal
): Promise<CandleData[]> {
    const interval = fromTimeFrame(tf) as HyperliquidInterval;
    const candles = await fetchHyperliquidCandles(
        asset,
        interval,
        startTime,
        endTime,
        signal
    );

    return candles.filter(
        (candle) => candle.end > startTime && candle.start < endTime
    );
}
