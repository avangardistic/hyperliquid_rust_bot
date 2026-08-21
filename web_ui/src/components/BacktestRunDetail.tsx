import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { KwantLineChart } from "kwant/line";
import { useAuth } from "../context/AuthContextStore";
import { useTheme } from "../context/ThemeContextStore";
import { fetchBacktestResult } from "../api/backtest";
import { buildBacktestPerformanceSeries } from "../backtest/performance";
import { kwantTheme } from "../chart/kwantTheme";
import type {
    BacktestResultDetail,
    BacktestResult as BacktestResultType,
} from "../types";
import { num, formatPrice } from "../types";
import { formatUTC } from "../chart/utils";

const usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatUsd(value: number): string {
    return usdFormatter.format(value);
}

/** Convert a live BacktestResult into the shape BacktestResultDetail uses */
function resultToDetail(r: BacktestResultType): BacktestResultDetail {
    return {
        id: r.runId,
        runId: r.runId,
        initialEquity: r.summary.initialEquity,
        finalEquity: r.summary.finalEquity,
        grossProfit: r.summary.grossProfit,
        grossLoss: r.summary.grossLoss,
        avgWin: r.summary.avgWin,
        avgLoss: r.summary.avgLoss,
        expectancy: r.summary.expectancy,
        wins: r.summary.wins,
        losses: r.summary.losses,
        candlesLoaded: r.candlesLoaded,
        candlesProcessed: r.candlesProcessed,
        maxDrawdownAbs: r.summary.maxDrawdownAbs,
        trades: r.trades,
        equityCurve: r.equityCurve,
        snapshots: r.snapshots,
    };
}

export default function BacktestRunDetail() {
    const { runId } = useParams<{ runId: string }>();
    const { token } = useAuth();
    const { theme } = useTheme();
    const nav = useNavigate();
    const location = useLocation();

    // If navigated from BacktestResult with state, use it directly
    const passedResult = (location.state as { result?: BacktestResultType })
        ?.result;

    const [detail, setDetail] = useState<BacktestResultDetail | null>(
        passedResult ? resultToDetail(passedResult) : null
    );
    const [loading, setLoading] = useState(!passedResult);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Skip fetch if we already have data from router state
        if (passedResult || !runId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchBacktestResult(token, runId)
            .then((data) => {
                if (!cancelled) setDetail(data);
            })
            .catch((e) => {
                if (!cancelled)
                    setError(
                        e instanceof Error ? e.message : "Failed to load result"
                    );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [token, runId, passedResult]);

    const chartTheme = useMemo(() => kwantTheme(theme), [theme]);
    const performance = useMemo(
        () =>
            buildBacktestPerformanceSeries(
                detail?.equityCurve ?? [],
                detail?.initialEquity ?? 0
            ),
        [detail]
    );

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-app-text/50 text-sm">
                    Loading run detail...
                </p>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
                <p className="text-accent-danger-soft text-sm">
                    {error ?? "Result not found."}
                </p>
                <button
                    className="border-line-subtle text-app-text/70 hover:text-app-text cursor-pointer rounded border px-3 py-1 text-xs transition-colors"
                    onClick={() => nav(-1)}
                >
                    Go back
                </button>
            </div>
        );
    }

    const netPnl = detail.finalEquity - detail.initialEquity;
    const returnPct =
        detail.initialEquity === 0 ? 0 : (netPnl / detail.initialEquity) * 100;
    const totalTrades = detail.trades.length;
    const winRate = totalTrades === 0 ? 0 : (detail.wins / totalTrades) * 100;
    const profitFactor =
        detail.grossLoss === 0
            ? detail.grossProfit > 0
                ? null
                : 0
            : detail.grossProfit / Math.abs(detail.grossLoss);
    const lastPoint = detail.equityCurve.at(-1);
    const latestRealizedPnl = performance.realizedPnl.at(-1)?.y ?? 0;
    const latestUnrealizedPnl = performance.unrealizedPnl.at(-1)?.y ?? 0;

    return (
        <div className="bg-ink-10 flex flex-1 flex-col p-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <button
                    className="border-line-subtle text-app-text/70 hover:text-app-text cursor-pointer rounded border px-3 py-1 text-xs transition-colors"
                    onClick={() => nav(-1)}
                >
                    Back
                </button>
                <h1 className="text-lg font-bold tracking-widest">
                    BACKTEST RUN
                </h1>
                <span className="text-app-text/40 font-mono text-xs">
                    {detail.runId}
                </span>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
                <div className="border-line-subtle bg-ink-80 rounded border p-3">
                    <p className="text-app-text/45 text-[10px] tracking-wider uppercase">
                        Net PnL
                    </p>
                    <p
                        className={`mt-1 text-lg font-semibold ${
                            netPnl >= 0
                                ? "text-accent-success"
                                : "text-accent-danger-soft"
                        }`}
                    >
                        {formatUsd(netPnl)}
                    </p>
                </div>
                <div className="border-line-subtle bg-ink-80 rounded border p-3">
                    <p className="text-app-text/45 text-[10px] tracking-wider uppercase">
                        Return
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                        {returnPct >= 0 ? "+" : ""}
                        {num(returnPct, 2)}%
                    </p>
                </div>
                <div className="border-line-subtle bg-ink-80 rounded border p-3">
                    <p className="text-app-text/45 text-[10px] tracking-wider uppercase">
                        Final Equity
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                        {formatUsd(detail.finalEquity)}
                    </p>
                </div>
                <div className="border-line-subtle bg-ink-80 rounded border p-3">
                    <p className="text-app-text/45 text-[10px] tracking-wider uppercase">
                        Max Drawdown
                    </p>
                    <p className="text-accent-danger-soft mt-1 text-lg font-semibold">
                        {formatUsd(-Math.abs(detail.maxDrawdownAbs))}
                    </p>
                </div>
                <div className="border-line-subtle bg-ink-80 rounded border p-3">
                    <p className="text-app-text/45 text-[10px] tracking-wider uppercase">
                        Trades
                    </p>
                    <p className="mt-1 text-lg font-semibold">{totalTrades}</p>
                </div>
                <div className="border-line-subtle bg-ink-80 rounded border p-3">
                    <p className="text-app-text/45 text-[10px] tracking-wider uppercase">
                        Win Rate
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                        {num(winRate, 2)}%
                    </p>
                </div>
                <div className="border-line-subtle bg-ink-80 rounded border p-3">
                    <p className="text-app-text/45 text-[10px] tracking-wider uppercase">
                        Profit Factor
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                        {profitFactor === null ? "∞" : num(profitFactor, 2)}
                    </p>
                </div>
                <div className="border-line-subtle bg-ink-80 rounded border p-3">
                    <p className="text-app-text/45 text-[10px] tracking-wider uppercase">
                        Candles
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                        {detail.candlesProcessed}
                    </p>
                    <p className="text-app-text/40 text-[10px]">
                        {detail.candlesLoaded} loaded
                    </p>
                </div>
            </div>

            {/* Candle-aligned performance charts */}
            {detail.equityCurve.length > 0 && (
                <section className="border-line-subtle bg-ink-80 mt-4 rounded border p-3">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
                        <div>
                            <p className="text-app-text/45 text-[10px] tracking-[0.2em] uppercase">
                                Performance
                            </p>
                            <h2 className="text-app-text mt-1 text-base font-semibold">
                                Candle-aligned account history
                            </h2>
                        </div>
                        <div className="text-app-text/45 text-right text-[10px]">
                            <p>{performance.equity.length} points</p>
                            {lastPoint && (
                                <p>Last mark {formatUTC(lastPoint.ts)}</p>
                            )}
                        </div>
                    </div>

                    <div className="border-line-subtle overflow-hidden rounded border">
                        <KwantLineChart
                            data={performance.equity}
                            dataKey={`${detail.runId}:equity`}
                            title="Account Equity"
                            name={formatUsd(
                                lastPoint?.equity ?? detail.finalEquity
                            )}
                            ariaLabel="Backtest account equity over time"
                            width="100%"
                            height={300}
                            xAxis={{ scale: "time", label: "UTC" }}
                            yAxis={{ label: "Equity", formatter: formatUsd }}
                            colorMode={{ type: "solid", color: "#ff8904" }}
                            areaFill={{ opacity: 0.12 }}
                            maxPoints={5_000}
                            theme={chartTheme}
                            timeZone="UTC"
                        />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <div className="border-line-subtle overflow-hidden rounded border">
                            <KwantLineChart
                                data={performance.unrealizedPnl}
                                dataKey={`${detail.runId}:upnl`}
                                title="Unrealized PnL"
                                name={formatUsd(latestUnrealizedPnl)}
                                ariaLabel="Backtest unrealized profit and loss over time"
                                variant="pnl"
                                width="100%"
                                height={250}
                                xAxis={{ scale: "time", label: "UTC" }}
                                yAxis={{ label: "uPnL", formatter: formatUsd }}
                                maxPoints={5_000}
                                theme={chartTheme}
                                timeZone="UTC"
                            />
                        </div>
                        <div className="border-line-subtle overflow-hidden rounded border">
                            <KwantLineChart
                                data={performance.realizedPnl}
                                dataKey={`${detail.runId}:realized-pnl`}
                                title="Realized PnL"
                                name={formatUsd(latestRealizedPnl)}
                                ariaLabel="Backtest realized profit and loss over time"
                                variant="pnl"
                                width="100%"
                                height={250}
                                xAxis={{ scale: "time", label: "UTC" }}
                                yAxis={{ label: "PnL", formatter: formatUsd }}
                                maxPoints={5_000}
                                theme={chartTheme}
                                timeZone="UTC"
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* Trades table */}
            <div className="z-3 mt-4 min-h-0 flex-1 overflow-auto">
                <p className="text-app-text/50 mb-2 text-xs uppercase">
                    Trades ({detail.trades.length})
                </p>
                <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="text-app-text/60 border-line-subtle border-b uppercase">
                        <tr>
                            <th className="py-2 pr-4 text-left">Side</th>
                            <th className="py-2 pr-4 text-right">Open</th>
                            <th className="py-2 pr-4 text-right">Close</th>
                            <th className="py-2 pr-4 text-right">PnL</th>
                            <th className="py-2 pr-4 text-right">Size</th>
                            <th className="py-2 pr-4 text-right">Fee</th>
                            <th className="py-2 pr-4 text-right">Funding</th>
                            <th className="py-2 text-right">
                                Open Time - Close Time
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {detail.trades.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="text-app-text/45 p-3 text-center"
                                >
                                    No trades in this run.
                                </td>
                            </tr>
                        ) : (
                            detail.trades.map((trade, idx) => (
                                <tr
                                    key={idx}
                                    className="border-line-subtle border-b last:border-b-0"
                                >
                                    <td
                                        className={`py-2 pr-4 font-semibold uppercase ${
                                            trade.side === "long"
                                                ? "text-accent-success-strong"
                                                : "text-accent-danger"
                                        }`}
                                    >
                                        {trade.side}
                                    </td>
                                    <td className="py-2 pr-4 text-right">
                                        {formatPrice(trade.open.price)}
                                    </td>
                                    <td className="py-2 pr-4 text-right">
                                        {formatPrice(trade.close.price)}
                                    </td>
                                    <td
                                        className={`py-2 pr-4 text-right ${
                                            trade.pnl >= 0
                                                ? "text-accent-success"
                                                : "text-accent-danger-soft"
                                        }`}
                                    >
                                        {num(trade.pnl, 2)}$
                                    </td>
                                    <td className="py-2 pr-4 text-right">
                                        {num(trade.size, 4)}
                                    </td>
                                    <td className="py-2 pr-4 text-right">
                                        {num(trade.fees, 4)}$
                                    </td>
                                    <td className="py-2 pr-4 text-right">
                                        {num(trade.funding, 4)}$
                                    </td>
                                    <td className="py-2 text-right">
                                        {formatUTC(trade.open.time)} -{" "}
                                        {formatUTC(trade.close.time)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Snapshots count */}
            {detail.snapshots.length > 0 && (
                <div className="border-line-subtle bg-ink-80 mt-4 rounded border p-3">
                    <p className="text-app-text/50 text-xs uppercase">
                        Snapshots ({detail.snapshots.length}) — indicators &
                        position state per event
                    </p>
                </div>
            )}
        </div>
    );
}
