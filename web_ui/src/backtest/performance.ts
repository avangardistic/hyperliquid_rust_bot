import type { LinePoint } from "kwant/line";

import type { EquityPoint } from "../types";

export interface BacktestPerformanceSeries {
    equity: LinePoint[];
    unrealizedPnl: LinePoint[];
    realizedPnl: LinePoint[];
    totalPnl: LinePoint[];
}

/**
 * Convert the candle-aligned account curve into chart-ready series.
 * Duplicate timestamps can occur when an end-of-run force close updates the
 * final candle; the later point is authoritative.
 */
export function buildBacktestPerformanceSeries(
    curve: readonly EquityPoint[],
    initialEquity: number
): BacktestPerformanceSeries {
    const pointsByTimestamp = new Map<number, EquityPoint>();

    for (const point of curve) {
        if (
            Number.isFinite(point.ts) &&
            Number.isFinite(point.equity) &&
            Number.isFinite(point.balance) &&
            Number.isFinite(point.upnl)
        ) {
            pointsByTimestamp.set(point.ts, point);
        }
    }

    const points = [...pointsByTimestamp.values()].sort(
        (left, right) => left.ts - right.ts
    );

    return {
        equity: points.map((point) => ({ x: point.ts, y: point.equity })),
        unrealizedPnl: points.map((point) => ({
            x: point.ts,
            y: point.upnl,
        })),
        realizedPnl: points.map((point) => ({
            x: point.ts,
            y: point.balance - initialEquity,
        })),
        totalPnl: points.map((point) => ({
            x: point.ts,
            y: point.equity - initialEquity,
        })),
    };
}
