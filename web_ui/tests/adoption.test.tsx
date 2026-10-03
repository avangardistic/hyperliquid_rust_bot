import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import PositionTable from "../src/components/Position";
import { formatUTC } from "../src/chart/utils";
import {
    managedTradePnl,
    tradeOriginLabel,
    type TradeInfo,
    type OpenPositionLocal,
} from "../src/types";

describe("adopted position UI", () => {
    test("renders a manual position with unknown opening history and live PnL", () => {
        const position: OpenPositionLocal = {
            openTime: null,
            size: 10,
            entryPx: 100,
            side: "long",
            fees: 0,
            funding: -0.5,
            realisedPnl: 0,
            fillType: null,
            origin: "manual",
            adoption: {
                time: 1_700_000_000_000,
                unrealizedPnl: 100,
                fundingSinceOpen: 2,
            },
        };
        const html = renderToStaticMarkup(
            <PositionTable
                position={position}
                price={110}
                lev={5}
                szDecimals={4}
                formatPrice={(price) => price.toFixed(2)}
            />
        );
        expect(html).toContain("Manual opening");
        expect(html).toContain("Adopted");
        expect(html).toContain("Opening time and prior costs");
        expect(html).toContain("Funding below is since adoption");
        expect(html).toContain("100.00$ (50.00%)");
        expect(html).not.toContain("Invalid Date");
    });

    test("new trade totals exclude PnL predating adoption; old trades still work", () => {
        const trade: TradeInfo = {
            side: "long",
            size: 10,
            pnl: 258.5,
            fees: 1,
            funding: -0.5,
            open: { time: null, price: 100, fillType: null, origin: "manual" },
            close: {
                time: 2000,
                price: 126,
                fillType: "market",
                origin: "algo",
            },
            adoption: { time: 1000, unrealizedPnl: 100, fundingSinceOpen: 2 },
        };
        expect(managedTradePnl(trade)).toBe(158.5);
        expect(formatUTC(trade.open.time)).toBe("Unknown");
        expect(tradeOriginLabel(trade.open.origin)).toBe("Manual");
        expect(tradeOriginLabel(trade.close.origin)).toBe("Algo");
        expect(managedTradePnl({ ...trade, adoption: undefined })).toBe(258.5);
        expect(tradeOriginLabel(undefined)).toBe("Unknown");
    });
});
