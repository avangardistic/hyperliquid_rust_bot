import { describe, expect, test } from "bun:test";

import {
    automaticBacktestResolution,
    isResolutionOverrideAllowed,
} from "../src/backtest/resolution";
import { buildBacktestPerformanceSeries } from "../src/backtest/performance";
import { parseHyperliquidCandles } from "../src/api/hyperliquidCandles";
import type { IndexId, TimeFrame } from "../src/types";

const indicator = (asset: string, timeframe: TimeFrame): IndexId => [
    asset,
    { rsi: 14 },
    timeframe,
];

describe("backtest resolution", () => {
    test("finds the largest common supported base", () => {
        expect(
            automaticBacktestResolution([
                indicator("xyz:TSLA", "min3"),
                indicator("kPEPE", "min5"),
            ])
        ).toBe("min1");
        expect(
            automaticBacktestResolution([
                indicator("BTC", "min15"),
                indicator("ETH", "hour1"),
            ])
        ).toBe("min15");
    });

    test("requires an override when there are no indicators", () => {
        expect(automaticBacktestResolution([])).toBeNull();
        expect(isResolutionOverrideAllowed("month", null)).toBe(true);
    });

    test("rejects overrides coarser than automatic", () => {
        expect(isResolutionOverrideAllowed("min5", "min15")).toBe(true);
        expect(isResolutionOverrideAllowed("min15", "min15")).toBe(true);
        expect(isResolutionOverrideAllowed("hour1", "min15")).toBe(false);
    });
});

describe("Hyperliquid candles", () => {
    test("preserves case-sensitive HIP-3 and k-prefixed assets", () => {
        const candles = parseHyperliquidCandles([
            {
                t: 1,
                T: 60_001,
                s: "xyz:TSLA",
                i: "1m",
                o: "100",
                h: "102",
                l: "99",
                c: "101",
                v: "42",
                n: 12,
            },
            {
                t: 60_001,
                T: 120_001,
                s: "kPEPE",
                i: "1m",
                o: "0.01",
                h: "0.02",
                l: "0.01",
                c: "0.02",
                v: "1000",
                n: 4,
            },
        ]);

        expect(candles.map((candle) => candle.asset)).toEqual([
            "xyz:TSLA",
            "kPEPE",
        ]);
    });

    test("filters malformed candles without filling gaps", () => {
        const candles = parseHyperliquidCandles([
            {
                t: 1,
                T: 1,
                s: "xyz:TSLA",
                i: "1m",
                o: "bad",
                h: "2",
                l: "1",
                c: "1",
                v: "1",
                n: 1,
            },
        ]);
        expect(candles).toEqual([]);
    });
});

describe("backtest performance series", () => {
    test("derives realized, unrealized, and total PnL from candle-aligned equity", () => {
        const series = buildBacktestPerformanceSeries(
            [
                { ts: 2, equity: 1_010, balance: 1_008, upnl: 2 },
                { ts: 1, equity: 1_000, balance: 995, upnl: 5 },
            ],
            1_000
        );

        expect(series.equity).toEqual([
            { x: 1, y: 1_000 },
            { x: 2, y: 1_010 },
        ]);
        expect(series.unrealizedPnl).toEqual([
            { x: 1, y: 5 },
            { x: 2, y: 2 },
        ]);
        expect(series.realizedPnl).toEqual([
            { x: 1, y: -5 },
            { x: 2, y: 8 },
        ]);
        expect(series.totalPnl).toEqual([
            { x: 1, y: 0 },
            { x: 2, y: 10 },
        ]);
    });

    test("keeps the final update for duplicate timestamps and filters invalid points", () => {
        const series = buildBacktestPerformanceSeries(
            [
                { ts: 1, equity: 1_000, balance: 1_000, upnl: 0 },
                { ts: 1, equity: 990, balance: 990, upnl: 0 },
                { ts: 2, equity: Number.NaN, balance: 990, upnl: 0 },
            ],
            1_000
        );

        expect(series.equity).toEqual([{ x: 1, y: 990 }]);
        expect(series.realizedPnl).toEqual([{ x: 1, y: -10 }]);
    });
});
