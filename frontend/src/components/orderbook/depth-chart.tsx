"use no memo";
"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { useMarketSelector } from "@/hooks/use-market-data";

import { formatPrice, formatSize } from "@/lib/format";
import type { AggregatedBook, AggregatedLevel } from "@/types/market";

interface DepthChartProps {
  book: AggregatedBook;
}

const MARGIN = { top: 10, right: 20, bottom: 30, left: 50 };

const T = {
  bid: { line: "#00C087", area: "rgba(0,192,135,0.30)" },
  ask: { line: "#FF4D4D", area: "rgba(255,77,77,0.30)" },
  poly: "#4D9FFF",
  dflow: "#FFB830",
  mid: "rgba(255,255,255,0.4)",
  midText: "rgba(255,255,255,0.75)",
  grid: "rgba(255,255,255,0.08)",
  crosshair: "rgba(255,255,255,0.4)",
  tooltipBg: "rgba(30,30,30,0.95)",
  tooltipBorder: "rgba(255,255,255,0.2)",
  tooltipText: "#eee",
  axis: "#aaa",
};

function getCumulativeData(
  levels: AggregatedLevel[],
  side: "bid" | "ask"
): { price: number; cumulative: number }[] {
  let cumulative = 0;
  const data: { price: number; cumulative: number }[] = [];

  if (side === "bid") {
    for (const level of levels) {
      cumulative += level.totalSize;
      data.push({ price: level.price, cumulative });
    }
    data.reverse();
  } else {
    for (const level of levels) {
      cumulative += level.totalSize;
      data.push({ price: level.price, cumulative });
    }
  }

  return data;
}

function getProtocolCumulativeData(
  levels: AggregatedLevel[],
  side: "bid" | "ask",
  protocol: "polymarket" | "dflow"
): { price: number; cumulative: number }[] {
  let cumulative = 0;
  const data: { price: number; cumulative: number }[] = [];

  if (side === "bid") {
    for (const level of levels) {
      const protocolSize =
        level.protocols.find((v) => v.protocol === protocol)?.size ?? 0;
      cumulative += protocolSize;
      data.push({ price: level.price, cumulative });
    }
    data.reverse();
  } else {
    for (const level of levels) {
      const protocolSize =
        level.protocols.find((v) => v.protocol === protocol)?.size ?? 0;
      cumulative += protocolSize;
      data.push({ price: level.price, cumulative });
    }
  }

  return data;
}

export function DepthChart({ book }: DepthChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 224 });
  const viewMode = useMarketSelector((s) => s.viewMode);
  const isHoveringRef = useRef(false);
  const lastPointerRef = useRef<{ mx: number; my: number } | null>(null);
  const updateTooltipRef = useRef<((mx: number, my: number) => void) | null>(null);

  const chartData = useMemo(() => ({
    bidData:   getCumulativeData(book.bids, "bid"),
    askData:   getCumulativeData(book.asks, "ask"),
    polyBids:  getProtocolCumulativeData(book.bids, "bid", "polymarket"),
    polyAsks:  getProtocolCumulativeData(book.asks, "ask", "polymarket"),
    dflowBids: getProtocolCumulativeData(book.bids, "bid", "dflow"),
    dflowAsks: getProtocolCumulativeData(book.asks, "ask", "dflow"),
  }), [book.bids, book.asks]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height: Math.max(height, 200) });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const renderChart = useCallback(() => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current) return;

    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const { bidData, askData, polyBids, polyAsks, dflowBids, dflowAsks } = chartData;

    if (bidData.length === 0 && askData.length === 0) return;

    const allPrices = [...bidData, ...askData].map((d) => d.price);
    const allCumulative = [...bidData, ...askData].map((d) => d.cumulative);

    const priceExtent = d3.extent(allPrices) as [number, number];
    const padding = (priceExtent[1] - priceExtent[0]) * 0.05 || 0.05;

    const xScale = d3
      .scaleLinear()
      .domain([priceExtent[0] - padding, priceExtent[1] + padding])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(allCumulative) ?? 1])
      .nice()
      .range([innerHeight, 0]);

    g.append("g")
      .selectAll("line")
      .data(yScale.ticks(5))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", T.grid);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale).ticks(6).tickFormat((d) => formatPrice(d as number))
      )
      .selectAll("text")
      .attr("fill", T.axis)
      .attr("font-size", "11px")
      .attr("font-family", "var(--font-fira-code)");

    g.append("g")
      .call(
        d3.axisLeft(yScale).ticks(5).tickFormat((d) => formatSize(d as number))
      )
      .selectAll("text")
      .attr("fill", T.axis)
      .attr("font-size", "11px")
      .attr("font-family", "var(--font-fira-code)");

    g.selectAll(".domain").attr("stroke", T.grid);
    g.selectAll(".tick line").attr("stroke", T.grid);

    const areaGen = d3
      .area<{ price: number; cumulative: number }>()
      .x((d) => xScale(d.price))
      .y0(innerHeight)
      .y1((d) => yScale(d.cumulative))
      .curve(d3.curveStepAfter);

    const lineGen = d3
      .line<{ price: number; cumulative: number }>()
      .x((d) => xScale(d.price))
      .y((d) => yScale(d.cumulative))
      .curve(d3.curveStepAfter);

    if (viewMode === "combined") {
      if (polyBids.length > 0) {
        g.append("path").datum(polyBids).attr("d", areaGen)
          .attr("fill", T.poly).attr("fill-opacity", 0.15);
      }
      if (polyAsks.length > 0) {
        g.append("path").datum(polyAsks).attr("d", areaGen)
          .attr("fill", T.poly).attr("fill-opacity", 0.15);
      }
      if (dflowBids.length > 0) {
        g.append("path").datum(dflowBids).attr("d", areaGen)
          .attr("fill", T.dflow).attr("fill-opacity", 0.15);
      }
      if (dflowAsks.length > 0) {
        g.append("path").datum(dflowAsks).attr("d", areaGen)
          .attr("fill", T.dflow).attr("fill-opacity", 0.15);
      }

      if (bidData.length > 0) {
        g.append("path").datum(bidData).attr("d", areaGen)
          .attr("fill", T.bid.area);
        g.append("path").datum(bidData).attr("d", lineGen)
          .attr("fill", "none").attr("stroke", T.bid.line).attr("stroke-width", 2.5);
      }
      if (askData.length > 0) {
        g.append("path").datum(askData).attr("d", areaGen)
          .attr("fill", T.ask.area);
        g.append("path").datum(askData).attr("d", lineGen)
          .attr("fill", "none").attr("stroke", T.ask.line).attr("stroke-width", 2.5);
      }
    } else {
      const venueBids = viewMode === "polymarket" ? polyBids : dflowBids;
      const venueAsks = viewMode === "polymarket" ? polyAsks : dflowAsks;

      if (venueBids.length > 0) {
        g.append("path").datum(venueBids).attr("d", areaGen)
          .attr("fill", T.bid.area);
        g.append("path").datum(venueBids).attr("d", lineGen)
          .attr("fill", "none").attr("stroke", T.bid.line).attr("stroke-width", 2.5);
      }
      if (venueAsks.length > 0) {
        g.append("path").datum(venueAsks).attr("d", areaGen)
          .attr("fill", T.ask.area);
        g.append("path").datum(venueAsks).attr("d", lineGen)
          .attr("fill", "none").attr("stroke", T.ask.line).attr("stroke-width", 2.5);
      }
    }

    if (book.midPrice > 0) {
      const midX = xScale(book.midPrice);
      g.append("line")
        .attr("x1", midX).attr("x2", midX)
        .attr("y1", 0).attr("y2", innerHeight)
        .attr("stroke", T.mid)
        .attr("stroke-dasharray", "4,4");

      g.append("text")
        .attr("x", midX).attr("y", -2)
        .attr("text-anchor", "middle")
        .attr("fill", T.midText)
        .attr("font-size", "10px")
        .attr("font-family", "var(--font-fira-code)")
        .text(`Mid: ${formatPrice(book.midPrice)}`);
    }

    const crosshairGroup = g.append("g").style("display", "none");

    crosshairGroup.append("line")
      .attr("class", "crosshair-x")
      .attr("y1", 0).attr("y2", innerHeight)
      .attr("stroke", T.crosshair).attr("stroke-dasharray", "2,2");

    crosshairGroup.append("line")
      .attr("class", "crosshair-y")
      .attr("x1", 0).attr("x2", innerWidth)
      .attr("stroke", T.crosshair).attr("stroke-dasharray", "2,2");

    const tooltipGroup = g.append("g").style("display", "none");
    const tooltipRect = tooltipGroup.append("rect")
      .attr("fill", T.tooltipBg).attr("rx", 6).attr("ry", 6)
      .attr("stroke", T.tooltipBorder).attr("stroke-width", 1);
    const tooltipText = tooltipGroup.append("text")
      .attr("fill", T.tooltipText).attr("font-size", 11)
      .attr("font-family", "var(--font-fira-code)");

    const updateTooltip = (mx: number, my: number) => {
      const price = xScale.invert(mx);

      crosshairGroup.style("display", null);
      crosshairGroup.select(".crosshair-x").attr("x1", mx).attr("x2", mx);
      crosshairGroup.select(".crosshair-y").attr("y1", my).attr("y2", my);

      const bidMatch = findNearest(bidData, price);
      const askMatch = findNearest(askData, price);

      const lines = [
        `Price: ${formatPrice(price)}`,
        bidMatch !== null ? `Bids: ${formatSize(bidMatch)}` : null,
        askMatch !== null ? `Asks: ${formatSize(askMatch)}` : null,
      ].filter(Boolean) as string[];

      tooltipGroup.style("display", null);
      tooltipText.selectAll("tspan").remove();
      lines.forEach((line, i) => {
        tooltipText.append("tspan").attr("x", 6).attr("dy", i === 0 ? 14 : 14).text(line);
      });

      const textBBox = (tooltipText.node() as SVGTextElement)?.getBBox();
      const tw = (textBBox?.width ?? 80) + 12;
      const th = (textBBox?.height ?? 30) + 8;

      let tx = mx + 10;
      let ty = my - th - 5;
      if (tx + tw > innerWidth) tx = mx - tw - 10;
      if (ty < 0) ty = my + 10;

      tooltipRect.attr("x", tx).attr("y", ty).attr("width", tw).attr("height", th);
      tooltipText.attr("transform", `translate(${tx}, ${ty})`);
    };

    updateTooltipRef.current = updateTooltip;

    g.append("rect")
      .attr("width", innerWidth).attr("height", innerHeight)
      .attr("fill", "none").attr("pointer-events", "all")
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event);
        lastPointerRef.current = { mx, my };
        isHoveringRef.current = true;
        updateTooltip(mx, my);
      })
      .on("mouseleave", () => {
        isHoveringRef.current = false;
        lastPointerRef.current = null;
        crosshairGroup.style("display", "none");
        tooltipGroup.style("display", "none");
      });
  }, [chartData, dimensions, viewMode, book.midPrice]);

  useEffect(() => {
    renderChart();
    if (isHoveringRef.current && lastPointerRef.current && updateTooltipRef.current) {
      if (svgRef.current?.matches(":hover")) {
        updateTooltipRef.current(lastPointerRef.current.mx, lastPointerRef.current.my);
      } else {
        isHoveringRef.current = false;
        lastPointerRef.current = null;
      }
    }
  }, [renderChart]);

  const isCombined = viewMode === "combined";

  return (
    <div className="flex h-full flex-col gap-2">
      <div ref={containerRef} className="w-full flex-1 min-h-0">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
        />
      </div>
      <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-sm bg-bid/60" />
          Bids
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-sm bg-ask/60" />
          Asks
        </span>
        {isCombined && (
          <>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm opacity-60" style={{ backgroundColor: T.poly }} />
              Polymarket
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm opacity-60" style={{ backgroundColor: T.dflow }} />
              DFlow
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function findNearest(
  data: { price: number; cumulative: number }[],
  price: number
): number | null {
  if (data.length === 0) return null;

  let closest = data[0];
  let minDist = Math.abs(data[0].price - price);
  for (const d of data) {
    const dist = Math.abs(d.price - price);
    if (dist < minDist) {
      minDist = dist;
      closest = d;
    }
  }
  return closest.cumulative;
}
