export const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

export const HYPERLIQUID_INTERVALS = [
    "1m",
    "3m",
    "5m",
    "15m",
    "30m",
    "1h",
    "2h",
    "4h",
    "12h",
    "1d",
    "3d",
    "1w",
    "1M",
] as const;

export type HyperliquidInterval = (typeof HYPERLIQUID_INTERVALS)[number];

export interface HyperliquidCandle {
    open: number;
    high: number;
    low: number;
    close: number;
    start: number;
    end: number;
    volume: number;
    trades: number;
    asset: string;
    interval: HyperliquidInterval;
}

interface CandleSnapshotResponse {
    t: number;
    T: number;
    s: string;
    i: HyperliquidInterval;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    n: number;
}

export function parseHyperliquidCandles(input: unknown): HyperliquidCandle[] {
    if (!Array.isArray(input)) {
        throw new Error("Hyperliquid returned an invalid candle response");
    }

    const parsed: HyperliquidCandle[] = [];
    for (const raw of input as CandleSnapshotResponse[]) {
        const candle: HyperliquidCandle = {
            open: Number(raw.o),
            high: Number(raw.h),
            low: Number(raw.l),
            close: Number(raw.c),
            start: Number(raw.t),
            end: Number(raw.T),
            volume: Number(raw.v),
            trades: Number(raw.n),
            asset: raw.s,
            interval: raw.i,
        };
        const numeric = [
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.start,
            candle.end,
            candle.volume,
            candle.trades,
        ];
        if (
            numeric.every(Number.isFinite) &&
            candle.end > candle.start &&
            candle.asset.length > 0 &&
            HYPERLIQUID_INTERVALS.includes(candle.interval)
        ) {
            parsed.push(candle);
        }
    }

    return parsed.sort((a, b) => a.start - b.start);
}

export async function fetchHyperliquidCandles(
    coin: string,
    interval: HyperliquidInterval,
    startTime: number,
    endTime: number,
    signal?: AbortSignal
): Promise<HyperliquidCandle[]> {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
            type: "candleSnapshot",
            req: { coin, interval, startTime, endTime },
        }),
    });

    if (!response.ok) {
        throw new Error(
            `Hyperliquid ${interval} candles failed (${response.status})`
        );
    }

    return parseHyperliquidCandles(await response.json());
}
