"use strict";
// Visualization Critique and Redesign - ORR station usage
//
// Redesign of ORR's regional "train board": one region (East of England),
// a frozen set of 15 stations, two financial years per station.
// Panel 1: dumbbell chart of 2023-24 vs 2024-25 entries and exits.
// Panel 2: aligned diverging bars for the change (absolute or percentage).
//
// Data: ../site-relative data/station-usage-comparison.csv, prepared from
// ORR Table 1415 by scripts/prepare_data.py (see notes/validation.md).
const COLOR_PREV = "#8a8fa3"; // 2023-24
const COLOR_CURR = "#1f4e79"; // 2024-25
const COLOR_UP = "#1f4e79"; // increase
const COLOR_DOWN = "#b04a4a"; // decrease
const COLOR_INK = "#1a1a2e";
const COLOR_MUTED = "#5a5f73";
const COLOR_FAINT = "#8a8fa3";
const COLOR_GRID = "#e4e6ee";
const MARGIN = { top: 74, right: 48, bottom: 46, left: 168 };
const ROW_HEIGHT = 34;
const MIN_WIDTH = 660;
const LEVEL_PANEL_SHARE = 0.52;
const PANEL_GAP = 48;
// bars reach at most ~77% of the change panel so end labels always fit
const CHANGE_DOMAIN_PADDING = 1.3;
let data = [];
let sortMode = "usage";
let metric = "absolute";
const chartNode = document.getElementById("chart");
const statusNode = document.getElementById("chart-status");
function fmtMillions(value) {
    return (value / 1e6).toFixed(2);
}
function fmtChangeAbsolute(value) {
    const sign = value >= 0 ? "+" : "";
    return sign + (value / 1e6).toFixed(2);
}
function fmtPercent(value) {
    if (!Number.isFinite(value))
        return "n/a";
    const sign = value >= 0 ? "+" : "";
    return sign + value.toFixed(1) + "%";
}
function fmtAxisMillions(value) {
    return d3.format(".0f")(value / 1e6);
}
function stationLabel(row) {
    return row.quality_note ? row.station_name + " *" : row.station_name;
}
function changeValue(row) {
    return metric === "absolute" ? row.absolute_change : row.percent_change;
}
function sortedRows() {
    const rows = [...data];
    if (sortMode === "usage") {
        rows.sort((a, b) => b.entries_exits_2024_25 - a.entries_exits_2024_25);
    }
    else {
        rows.sort((a, b) => Math.abs(changeValue(b)) - Math.abs(changeValue(a)));
    }
    return rows;
}
function render() {
    if (data.length === 0) {
        statusNode.textContent = "No station data available.";
        statusNode.classList.remove("error");
        statusNode.hidden = false;
        return;
    }
    const rows = sortedRows();
    const width = Math.max(MIN_WIDTH, chartNode.clientWidth);
    const height = MARGIN.top + rows.length * ROW_HEIGHT + MARGIN.bottom;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const levelWidth = innerWidth * LEVEL_PANEL_SHARE;
    const changeLeft = MARGIN.left + levelWidth + PANEL_GAP;
    const changeWidth = innerWidth - levelWidth - PANEL_GAP;
    const levelMax = d3.max(rows, (d) => d.entries_exits_2024_25) ?? 1;
    const xLevel = d3
        .scaleLinear()
        .domain([0, levelMax])
        .range([0, levelWidth])
        .nice();
    const changeMax = (d3.max(rows, (d) => Math.abs(changeValue(d))) ?? 1) *
        CHANGE_DOMAIN_PADDING;
    const xChange = d3
        .scaleLinear()
        .domain([-changeMax, changeMax])
        .range([0, changeWidth]);
    const xChangeZero = xChange(0) + changeLeft;
    const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "Dumbbell chart comparing station usage in 2023-24 and 2024-25 " +
        "with an aligned panel showing the change, for 15 East of " +
        "England stations.");
    // ---- panel titles and legend ------------------------------------
    svg.append("text")
        .attr("x", MARGIN.left)
        .attr("y", 24)
        .attr("font-size", 13)
        .attr("font-weight", 700)
        .attr("fill", COLOR_INK)
        .text("Entries and exits (millions)");
    svg.append("text")
        .attr("x", changeLeft)
        .attr("y", 24)
        .attr("font-size", 13)
        .attr("font-weight", 700)
        .attr("fill", COLOR_INK)
        .text(metric === "absolute"
        ? "Change (millions)"
        : "Change (percentage)");
    const legend = svg.append("g").attr("transform", `translate(${MARGIN.left}, 52)`);
    legend.append("circle").attr("cx", 6).attr("cy", -4).attr("r", 5).attr("fill", COLOR_PREV);
    legend.append("text").attr("x", 16).attr("y", 0).attr("font-size", 12).attr("fill", COLOR_MUTED)
        .text("2023-24");
    legend.append("circle").attr("cx", 90).attr("cy", -4).attr("r", 5).attr("fill", COLOR_CURR);
    legend.append("text").attr("x", 100).attr("y", 0).attr("font-size", 12).attr("fill", COLOR_MUTED)
        .text("2024-25");
    const plotTop = MARGIN.top - 12;
    const plotBottom = MARGIN.top + rows.length * ROW_HEIGHT;
    // ---- level panel grid and axis ----------------------------------
    const levelTicks = xLevel.ticks(6);
    const levelGrid = svg.append("g");
    for (const t of levelTicks) {
        levelGrid
            .append("line")
            .attr("x1", MARGIN.left + xLevel(t))
            .attr("x2", MARGIN.left + xLevel(t))
            .attr("y1", plotTop)
            .attr("y2", plotBottom)
            .attr("stroke", t === 0 ? "#c9cdda" : COLOR_GRID);
        levelGrid
            .append("text")
            .attr("x", MARGIN.left + xLevel(t))
            .attr("y", plotBottom + 18)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("fill", COLOR_FAINT)
            .text(fmtAxisMillions(t));
    }
    levelGrid
        .append("text")
        .attr("x", MARGIN.left + levelWidth)
        .attr("y", plotBottom + 34)
        .attr("text-anchor", "end")
        .attr("font-size", 11)
        .attr("fill", COLOR_FAINT)
        .text("million entries and exits");
    // ---- change panel grid and axis ---------------------------------
    const changeTicks = xChange.ticks(4).filter((t) => Math.abs(t) > 1e-9);
    const changeGrid = svg.append("g");
    for (const t of changeTicks) {
        changeGrid
            .append("line")
            .attr("x1", changeLeft + xChange(t))
            .attr("x2", changeLeft + xChange(t))
            .attr("y1", plotTop)
            .attr("y2", plotBottom)
            .attr("stroke", COLOR_GRID);
    }
    changeGrid
        .append("line")
        .attr("x1", xChangeZero)
        .attr("x2", xChangeZero)
        .attr("y1", plotTop)
        .attr("y2", plotBottom)
        .attr("stroke", "#b9bdc9")
        .attr("stroke-width", 1.25);
    changeGrid
        .append("text")
        .attr("x", xChangeZero)
        .attr("y", plotBottom + 18)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("fill", COLOR_FAINT)
        .text("0");
    changeGrid
        .append("text")
        .attr("x", changeLeft + changeWidth)
        .attr("y", plotBottom + 34)
        .attr("text-anchor", "end")
        .attr("font-size", 11)
        .attr("fill", COLOR_FAINT)
        .text(metric === "absolute" ? "million entries and exits" : "percent change");
    for (const t of changeTicks) {
        const label = metric === "absolute" ? fmtChangeAbsolute(t) : fmtPercent(t);
        changeGrid
            .append("text")
            .attr("x", changeLeft + xChange(t))
            .attr("y", plotBottom + 18)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("fill", COLOR_FAINT)
            .text(label);
    }
    // ---- one group per station --------------------------------------
    const rowGroups = svg
        .selectAll("g.station")
        .data(rows)
        .join("g")
        .attr("class", "station")
        .attr("transform", (_d, i) => `translate(0, ${MARGIN.top + i * ROW_HEIGHT + ROW_HEIGHT / 2})`);
    rowGroups
        .append("text")
        .attr("x", MARGIN.left - 12)
        .attr("y", 4)
        .attr("text-anchor", "end")
        .attr("font-size", (d) => (d.station_name.length > 24 ? 11 : 13))
        .attr("fill", COLOR_INK)
        .text((d) => stationLabel(d));
    // dumbbell: track between the two years, then both dots
    rowGroups
        .append("line")
        .attr("x1", (d) => MARGIN.left + xLevel(d.entries_exits_2023_24))
        .attr("x2", (d) => MARGIN.left + xLevel(d.entries_exits_2024_25))
        .attr("stroke", "#c9cdda")
        .attr("stroke-width", 4)
        .attr("stroke-linecap", "round");
    rowGroups
        .append("circle")
        .attr("cx", (d) => MARGIN.left + xLevel(d.entries_exits_2023_24))
        .attr("r", 5)
        .attr("fill", COLOR_PREV);
    rowGroups
        .append("circle")
        .attr("cx", (d) => MARGIN.left + xLevel(d.entries_exits_2024_25))
        .attr("r", 5.5)
        .attr("fill", COLOR_CURR);
    // direct value labels, kept inside the panel; when the dots nearly
    // coincide the previous-year label moves above the track
    const textWidth = (text, bold) => text.length * (bold ? 6.6 : 6.1);
    rowGroups.each(function (d) {
        const group = d3.select(this);
        const xPrev = MARGIN.left + xLevel(d.entries_exits_2023_24);
        const xCurr = MARGIN.left + xLevel(d.entries_exits_2024_25);
        const grew = d.entries_exits_2024_25 >= d.entries_exits_2023_24;
        const prevLabel = fmtMillions(d.entries_exits_2023_24);
        const currLabel = fmtMillions(d.entries_exits_2024_25);
        const tight = Math.abs(xCurr - xPrev) < 34;
        const placeLabel = (text, x, side, fill, bold, above, clearDotX) => {
            const w = textWidth(text, bold);
            let anchor = side === 1 ? "start" : "end";
            let lx = side === 1 ? x + 9 : x - 9;
            if (side === 1 && lx + w > MARGIN.left + levelWidth) {
                // flip to the left of the dot, staying clear of the other
                // year's dot when it sits between the label and the panel edge
                anchor = "end";
                lx = Math.min(x - 9, clearDotX ?? x - 9);
            }
            group
                .append("text")
                .attr("x", lx)
                .attr("y", above ? -8 : 4)
                .attr("text-anchor", anchor)
                .attr("font-size", bold ? 11.5 : 11)
                .attr("font-weight", bold ? 700 : 400)
                .attr("fill", fill)
                .text(text);
        };
        if (grew) {
            placeLabel(prevLabel, xPrev, -1, COLOR_FAINT, false, tight);
            placeLabel(currLabel, xCurr, 1, COLOR_CURR, true, false, xPrev - 8);
        }
        else {
            placeLabel(currLabel, xCurr, -1, COLOR_CURR, true, false);
            placeLabel(prevLabel, xPrev, 1, COLOR_FAINT, false, tight);
        }
    });
    // change bars; stations without a defined percentage (zero or missing
    // baseline) get no bar in the percentage view
    rowGroups
        .append("rect")
        .attr("x", (d) => Number.isFinite(changeValue(d))
        ? changeLeft + Math.min(xChange(changeValue(d)), xChange(0))
        : xChangeZero)
        .attr("y", -9)
        .attr("width", (d) => Number.isFinite(changeValue(d))
        ? Math.max(1.5, Math.abs(xChange(changeValue(d)) - xChange(0)))
        : 0)
        .attr("height", 18)
        .attr("fill", (d) => changeValue(d) >= 0 ? COLOR_UP : COLOR_DOWN);
    rowGroups.each(function (d) {
        const value = changeValue(d);
        const label = metric === "absolute" ? fmtChangeAbsolute(value) : fmtPercent(value);
        const group = d3.select(this);
        if (!Number.isFinite(value)) {
            group
                .append("text")
                .attr("x", xChangeZero + 8)
                .attr("y", 4)
                .attr("text-anchor", "start")
                .attr("font-size", 11.5)
                .attr("font-weight", 700)
                .attr("fill", COLOR_FAINT)
                .text(label);
            return;
        }
        const positive = value >= 0;
        const xEnd = changeLeft + xChange(value);
        const labelWidth = label.length * 6.6;
        const panelRight = changeLeft + changeWidth;
        let x;
        let anchor;
        let fill = positive ? COLOR_UP : COLOR_DOWN;
        if (positive) {
            if (xEnd + 8 + labelWidth <= panelRight) {
                x = xEnd + 8;
                anchor = "start";
            }
            else {
                x = xEnd - 8;
                anchor = "end";
                fill = "#ffffff";
            }
        }
        else {
            if (xEnd - 8 - labelWidth >= changeLeft) {
                x = xEnd - 8;
                anchor = "end";
            }
            else {
                x = xEnd + 8;
                anchor = "start";
                fill = "#ffffff";
            }
        }
        group
            .append("text")
            .attr("x", x)
            .attr("y", 4)
            .attr("text-anchor", anchor)
            .attr("font-size", 11.5)
            .attr("font-weight", 700)
            .attr("fill", fill)
            .text(label);
    });
    // per-row description for assistive technology (and hover)
    rowGroups
        .append("title")
        .text((d) => {
        const change = metric === "absolute"
            ? fmtChangeAbsolute(d.absolute_change) + " million"
            : fmtPercent(d.percent_change);
        const note = d.quality_note ? " Note: " + d.quality_note : "";
        return (`${d.station_name}: ${fmtMillions(d.entries_exits_2023_24)} million ` +
            `entries and exits in 2023-24, ${fmtMillions(d.entries_exits_2024_25)} million in 2024-25, ` +
            `change ${change}.${note}`);
    });
    chartNode.replaceChildren(svg.node());
    statusNode.hidden = true;
}
function renderFootnotes() {
    const holder = document.getElementById("chart-footnotes");
    holder.replaceChildren();
    const flagged = data.filter((d) => d.quality_note !== "");
    if (flagged.length === 0)
        return;
    for (const row of flagged) {
        const p = document.createElement("p");
        const ref = document.createElement("span");
        ref.className = "note-ref";
        ref.textContent = "* ";
        p.appendChild(ref);
        p.appendChild(document.createTextNode(`${row.station_name} — ${row.quality_note}`));
        holder.appendChild(p);
    }
}
function setPressed(ids) {
    for (const [id, pressed] of Object.entries(ids)) {
        const button = document.getElementById(id);
        if (button)
            button.setAttribute("aria-pressed", String(pressed));
    }
}
async function main() {
    try {
        const loaded = await d3.csv("data/station-usage-comparison.csv", (row) => {
            const parsed = {
                station_id: (row.station_id ?? "").trim(),
                station_name: (row.station_name ?? "").trim(),
                region: (row.region ?? "").trim(),
                entries_exits_2023_24: Number(row.entries_exits_2023_24),
                entries_exits_2024_25: Number(row.entries_exits_2024_25),
                absolute_change: Number(row.absolute_change),
                percent_change: row.percent_change == null ||
                    row.percent_change.trim() === ""
                    ? NaN
                    : Number(row.percent_change),
                quality_note: (row.quality_note ?? "").trim(),
            };
            if (!parsed.station_id ||
                Number.isNaN(parsed.entries_exits_2023_24) ||
                Number.isNaN(parsed.entries_exits_2024_25)) {
                throw new Error(`Unparseable CSV row for "${row.station_name ?? "?"}"`);
            }
            return parsed;
        });
        data = loaded;
        renderFootnotes();
        render();
    }
    catch (error) {
        statusNode.classList.add("error");
        statusNode.hidden = false;
        statusNode.textContent =
            "Could not load station usage data. " +
                (error instanceof Error ? error.message : String(error));
        return;
    }
    document.getElementById("sort-usage")?.addEventListener("click", () => {
        sortMode = "usage";
        setPressed({ "sort-usage": true, "sort-change": false });
        render();
    });
    document.getElementById("sort-change")?.addEventListener("click", () => {
        sortMode = "change";
        setPressed({ "sort-usage": false, "sort-change": true });
        render();
    });
    document.getElementById("metric-absolute")?.addEventListener("click", () => {
        metric = "absolute";
        setPressed({ "metric-absolute": true, "metric-percent": false });
        render();
    });
    document.getElementById("metric-percent")?.addEventListener("click", () => {
        metric = "percent";
        setPressed({ "metric-absolute": false, "metric-percent": true });
        render();
    });
    let resizeTimer;
    window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(render, 150);
    });
}
void main();
//# sourceMappingURL=individual-project.js.map