import { fmt, partColour, seriesName, type ChartSeries } from "./chartData";

/** The names of a chart's series under it, each beside its colour; a series on a combo's right scale says so. With
 *  `at` (stacked bars and areas), each name has its value at that x label after it, in the chart's unit. */
export function ChartLegend({ series, at, unit }: { series: ChartSeries[]; at?: number; unit?: string }) {
  return (
    <div className="hb-legend">
      {series.map((s, k) => {
        const value = at === undefined ? null : s.data[at] ?? null;
        return (
          <span key={k} className="hb-legend-item">
            <i className="hb-legend-dot" style={{ background: partColour(k) }} />
            {seriesName(series, k)}
            {value !== null && <span className="hb-legend-value">{fmt(value, s.unit ?? unit)}</span>}
            {s.right && <span className="hb-legend-note">(right scale)</span>}
          </span>
        );
      })}
    </div>
  );
}
