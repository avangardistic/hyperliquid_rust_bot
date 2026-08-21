import { TIMEFRAME_CAMELCASE, TF_TO_MS } from "../types";
import type { IndexId, TimeFrame } from "../types";

const TIMEFRAMES = Object.values(TIMEFRAME_CAMELCASE) as TimeFrame[];

export function automaticBacktestResolution(
    indicators: IndexId[]
): TimeFrame | null {
    if (indicators.length === 0) return null;

    return (
        [...TIMEFRAMES]
            .reverse()
            .find((candidate) =>
                indicators.every(
                    ([, , tf]) => TF_TO_MS[tf] % TF_TO_MS[candidate] === 0
                )
            ) ?? null
    );
}

export function isResolutionOverrideAllowed(
    resolution: TimeFrame,
    automatic: TimeFrame | null
): boolean {
    return automatic === null || TF_TO_MS[resolution] <= TF_TO_MS[automatic];
}
