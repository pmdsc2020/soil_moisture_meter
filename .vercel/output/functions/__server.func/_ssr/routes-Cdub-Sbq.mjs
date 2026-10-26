import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Cdub-Sbq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FAO_EXAMPLE = {
	wet: "120",
	massMode: "lost",
	other: "20",
	density: "1.2",
	depth: "1",
	depthUnit: "m",
	fc: "",
	pwp: ""
};
var BLANK_INPUTS = {
	wet: "",
	massMode: "lost",
	other: "",
	density: "",
	depth: "",
	depthUnit: "m",
	fc: "",
	pwp: ""
};
var TEXTURES = [
	{
		id: "sand",
		label: "Sand",
		fc: "10",
		pwp: "5"
	},
	{
		id: "loam",
		label: "Loam",
		fc: "27",
		pwp: "12"
	},
	{
		id: "clay",
		label: "Clay",
		fc: "40",
		pwp: "22"
	}
];
var STORAGE_KEY = "soil-moisture-v1";
function isInputs(value) {
	if (!value || typeof value !== "object") return false;
	const o = value;
	return typeof o.wet === "string" && typeof o.other === "string" && typeof o.density === "string" && typeof o.depth === "string" && typeof o.fc === "string" && typeof o.pwp === "string" && (o.massMode === "lost" || o.massMode === "dry") && (o.depthUnit === "m" || o.depthUnit === "cm");
}
function loadInputs() {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return isInputs(parsed) ? parsed : null;
	} catch {
		return null;
	}
}
function saveInputs(inputs) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
	} catch {}
}
function field(raw) {
	const t = raw.trim().replace(",", ".");
	if (t === "") return { kind: "empty" };
	if (/^-?\d+\.$/.test(t) || t === "-" || t === "." || t === "-.") return { kind: "partial" };
	if (!/^-?\d+(\.\d+)?$/.test(t)) return { kind: "bad" };
	const value = Number(t);
	if (!Number.isFinite(value)) return { kind: "bad" };
	return {
		kind: "ok",
		value
	};
}
function formatMeasure(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: digits,
		minimumFractionDigits: 0
	}).format(n);
}
function formatInputNumber(n) {
	if (!Number.isFinite(n)) return "";
	const rounded = Math.round(n * 1e3) / 1e3;
	return String(rounded);
}
function required(f, label) {
	if (f.kind === "empty") return { error: `Enter ${label}.` };
	if (f.kind === "partial") return { wait: `Finish the number for ${label}.` };
	if (f.kind === "bad") return { error: `${label} is not a number.` };
	return { value: f.value };
}
function computeSoil(inputs) {
	const wetF = required(field(inputs.wet), "wet weight");
	if ("error" in wetF) return {
		status: "invalid",
		message: wetF.error
	};
	if ("wait" in wetF) return {
		status: "incomplete",
		message: wetF.wait
	};
	const otherLabel = inputs.massMode === "lost" ? "moisture lost" : "dry weight";
	const otherF = required(field(inputs.other), otherLabel);
	if ("error" in otherF) return {
		status: "invalid",
		message: otherF.error
	};
	if ("wait" in otherF) return {
		status: "incomplete",
		message: otherF.wait
	};
	const densityF = required(field(inputs.density), "bulk density");
	if ("error" in densityF) return {
		status: "invalid",
		message: densityF.error
	};
	if ("wait" in densityF) return {
		status: "incomplete",
		message: densityF.wait
	};
	const depthF = required(field(inputs.depth), "profile depth");
	if ("error" in depthF) return {
		status: "invalid",
		message: depthF.error
	};
	if ("wait" in depthF) return {
		status: "incomplete",
		message: depthF.wait
	};
	const wet = wetF.value;
	const other = otherF.value;
	const density = densityF.value;
	const depthM = inputs.depthUnit === "m" ? depthF.value : depthF.value / 100;
	if (wet <= 0) return {
		status: "invalid",
		message: "Wet weight has to be greater than zero."
	};
	if (other < 0) return {
		status: "invalid",
		message: `${otherLabel[0].toUpperCase()}${otherLabel.slice(1)} cannot be negative.`
	};
	if (density <= 0) return {
		status: "invalid",
		message: "Bulk density has to be greater than zero."
	};
	if (depthM <= 0) return {
		status: "invalid",
		message: "Profile depth has to be greater than zero."
	};
	const dry = inputs.massMode === "lost" ? wet - other : other;
	const lost = inputs.massMode === "lost" ? other : wet - other;
	if (dry <= 0) return {
		status: "invalid",
		message: "Dry weight is zero or negative. Moisture lost cannot be the whole wet sample, or more."
	};
	if (lost < 0) return {
		status: "invalid",
		message: "Dry weight is heavier than the wet sample. Check the two masses."
	};
	const smw = lost / dry * 100;
	const smv = smw * density;
	const mmPerM = smv * 10;
	const waterMm = smv / 100 * depthM * 1e3;
	const notes = [];
	if (density < .8 || density > 1.8) notes.push("Bulk density is outside the 0.8–1.8 g/cm³ range common for mineral soil.");
	if (smv > 70) notes.push("Volumetric moisture is unusually high. Recheck the masses and bulk density.");
	return {
		status: "ok",
		wet,
		dry,
		lost,
		density,
		depthM,
		smw,
		smv,
		waterMm,
		mmPerM,
		notes,
		limits: computeLimits(inputs, smv, depthM)
	};
}
function computeLimits(inputs, smv, depthM) {
	const fcF = field(inputs.fc);
	const pwpF = field(inputs.pwp);
	if (fcF.kind === "empty" && pwpF.kind === "empty") return { status: "unset" };
	if (fcF.kind === "partial" || pwpF.kind === "partial") return {
		status: "incomplete",
		message: "Finish the field capacity and wilting point numbers."
	};
	if (fcF.kind === "bad" || pwpF.kind === "bad") return {
		status: "invalid",
		message: "Field capacity and wilting point need to be numbers."
	};
	if (fcF.kind === "empty" || pwpF.kind === "empty") return {
		status: "incomplete",
		message: "Enter both field capacity and permanent wilting point, as volumetric percent."
	};
	if (fcF.value < 0 || pwpF.value < 0) return {
		status: "invalid",
		message: "Field capacity and wilting point cannot be negative."
	};
	if (fcF.value <= pwpF.value) return {
		status: "invalid",
		message: "Field capacity has to be wetter than the permanent wilting point."
	};
	const fc = fcF.value;
	const pwp = pwpF.value;
	const taw = fc - pwp;
	const tawMm = taw / 100 * depthM * 1e3;
	const pawVol = Math.max(0, Math.min(smv, fc) - pwp);
	const pawMm = pawVol / 100 * depthM * 1e3;
	const depletion = (fc - smv) / taw;
	let place;
	if (smv > fc) place = "above-fc";
	else if (smv <= pwp) place = "below-pwp";
	else place = "available";
	return {
		status: "ok",
		fc,
		pwp,
		taw,
		tawMm,
		paw: pawVol,
		pawMm,
		depletion,
		place
	};
}
function depthPhrase(depthM, unit) {
	if (unit === "cm") return `${formatMeasure(depthM * 100, 1)} cm`;
	return `${formatMeasure(depthM, 3)} m`;
}
function parseComplete(raw) {
	const t = raw.trim().replace(",", ".");
	if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
	const n = Number(t);
	return Number.isFinite(n) ? n : null;
}
function SoilCalculator() {
	const [inputs, setInputs] = (0, import_react.useState)(FAO_EXAMPLE);
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const saved = loadInputs();
		if (saved) setInputs(saved);
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		saveInputs(inputs);
	}, [inputs, ready]);
	const result = computeSoil(inputs);
	const isExample = inputs.wet === FAO_EXAMPLE.wet && inputs.massMode === FAO_EXAMPLE.massMode && inputs.other === FAO_EXAMPLE.other && inputs.density === FAO_EXAMPLE.density && inputs.depth === FAO_EXAMPLE.depth && inputs.depthUnit === FAO_EXAMPLE.depthUnit;
	function patch(partial) {
		setInputs((prev) => ({
			...prev,
			...partial
		}));
	}
	function switchMode(next) {
		setInputs((prev) => {
			if (prev.massMode === next) return prev;
			const wet = parseComplete(prev.wet);
			const other = parseComplete(prev.other);
			const nextOther = wet != null && other != null ? formatInputNumber(wet - other) : prev.other;
			return {
				...prev,
				massMode: next,
				other: nextOther
			};
		});
	}
	function switchDepthUnit(next) {
		setInputs((prev) => {
			if (prev.depthUnit === next) return prev;
			const n = parseComplete(prev.depth);
			if (n == null) return {
				...prev,
				depthUnit: next
			};
			const converted = prev.depthUnit === "m" ? n * 100 : n / 100;
			return {
				...prev,
				depthUnit: next,
				depth: formatInputNumber(converted)
			};
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1.5 bg-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "mb-2 flex items-start gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						"aria-hidden": true,
						className: "relative mt-1 h-12 w-9 shrink-0 overflow-hidden rounded-sm border border-line bg-surface-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-x-0 bottom-0 h-1/2 bg-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-x-0 top-1/3 border-t border-primary" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold text-primary",
							children: "Soil water"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-4xl leading-tight text-fg sm:text-5xl",
							children: "Soil moisture"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 max-w-xl text-base text-muted",
							children: "From an oven-dry sample to percent by weight, percent by volume, and millimetres of water. Holding capacity is field capacity minus the wilting point."
						})
					] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lg:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stats, {
						result,
						unit: inputs.depthUnit
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid items-start gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: "rounded-lg border border-line bg-surface p-4 sm:p-5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-4 flex flex-wrap items-center justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "font-display text-2xl text-fg",
											children: "Sample"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setInputs(FAO_EXAMPLE),
												className: `inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold ${isExample ? "bg-primary text-primary-fg" : "border border-line bg-surface-2 text-fg"}`,
												children: "FAO example 9"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setInputs((prev) => ({
													...BLANK_INPUTS,
													depthUnit: prev.depthUnit
												})),
												className: "inline-flex h-11 items-center rounded-md border border-line px-3 text-sm font-semibold text-fg",
												children: "Clear"
											})]
										})]
									}),
									isExample && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mb-4 text-sm text-muted",
										children: "Wet sample 120 g, 20 g lost on drying, bulk density 1.2. FAO Module 2, Example 9."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid gap-4 sm:grid-cols-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											id: "wet",
											label: "Wet weight",
											suffix: "g",
											value: inputs.wet,
											onChange: (wet) => patch({ wet }),
											hint: "Soil plus water, before the oven."
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-col gap-1.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-sm font-semibold",
													id: "mass-mode-label",
													children: "Second mass"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													role: "radiogroup",
													"aria-labelledby": "mass-mode-label",
													className: "grid grid-cols-2 rounded-md bg-surface-2 p-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
														checked: inputs.massMode === "lost",
														onClick: () => switchMode("lost"),
														children: "Moisture lost"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
														checked: inputs.massMode === "dry",
														onClick: () => switchMode("dry"),
														children: "Dry weight"
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
													id: "other",
													label: inputs.massMode === "lost" ? "Moisture lost" : "Oven-dry weight",
													suffix: "g",
													value: inputs.other,
													onChange: (other) => patch({ other }),
													hint: inputs.massMode === "lost" ? "Weight driven off by oven drying." : "Sample after oven drying.",
													hideLabel: true
												})
											]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: "rounded-lg border border-line bg-surface p-4 sm:p-5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "mb-4 font-display text-2xl text-fg",
									children: "Soil"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid gap-4 sm:grid-cols-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										id: "density",
										label: "Bulk density, Ds",
										suffix: "g/cm³",
										value: inputs.density,
										onChange: (density) => patch({ density }),
										hint: "Same number in Mg/m³. Mineral soils are often 1.1–1.6."
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												htmlFor: "depth",
												className: "text-sm font-semibold",
												children: "Profile depth"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												role: "radiogroup",
												"aria-label": "Depth unit",
												className: "grid grid-cols-2 rounded-md bg-surface-2 p-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
													checked: inputs.depthUnit === "m",
													onClick: () => switchDepthUnit("m"),
													children: "m"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
													checked: inputs.depthUnit === "cm",
													onClick: () => switchDepthUnit("cm"),
													children: "cm"
												})]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											id: "depth",
											label: "Profile depth",
											suffix: inputs.depthUnit,
											value: inputs.depth,
											onChange: (depth) => patch({ depth }),
											hint: "Layer the water depth applies to. 0.3 m is 30 cm.",
											hideLabel: true
										})]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: "rounded-lg border border-line bg-surface p-4 sm:p-5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-display text-2xl text-fg",
										children: "Holding capacity"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 mb-4 text-sm text-muted",
										children: "Optional. Both values are volumetric moisture: field capacity near 0.1–0.3 bar, permanent wilting point at 15 bar."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mb-4 flex flex-wrap gap-2",
										role: "group",
										"aria-label": "Illustrative textures",
										children: TEXTURES.map((texture) => {
											const active = inputs.fc === texture.fc && inputs.pwp === texture.pwp;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => patch({
													fc: texture.fc,
													pwp: texture.pwp
												}),
												className: `inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold ${active ? "bg-accent text-accent-fg" : "border border-line bg-surface-2 text-fg"}`,
												children: texture.label
											}, texture.id);
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mb-4 text-sm text-muted",
										children: "Sand, loam, and clay fill typical volumetric percentages. They are illustrations, not the FAO example."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid gap-4 sm:grid-cols-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											id: "fc",
											label: "Field capacity, SMv (FC)",
											suffix: "%",
											value: inputs.fc,
											onChange: (fc) => patch({ fc })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											id: "pwp",
											label: "Wilting point, SMv (PWP)",
											suffix: "%",
											value: inputs.pwp,
											onChange: (pwp) => patch({ pwp })
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "hidden lg:block",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Formulas, {})
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "hidden lg:block",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stats, {
								result,
								unit: inputs.depthUnit
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Details, {
							result,
							unit: inputs.depthUnit
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lg:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Formulas, {})
				})
			]
		})]
	});
}
function Stats({ result, unit }) {
	const ok = result.status === "ok";
	const smw = ok ? formatMeasure(result.smw) : "—";
	const smv = ok ? formatMeasure(result.smv) : "—";
	const depth = ok ? formatMeasure(result.waterMm) : "—";
	const perM = ok ? formatMeasure(result.mmPerM) : "—";
	const where = ok ? depthPhrase(result.depthM, unit) : "profile";
	const summary = ok ? `Gravimetric moisture ${smw} percent, volumetric ${smv} percent, water depth ${depth} millimetres in ${where}.` : result.message;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-4 sm:p-5",
		"aria-live": "polite",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-4 font-display text-2xl text-fg",
				children: "Results"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "sr-only",
				children: summary
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-3 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "By weight",
						sym: "SMw",
						value: smw,
						unit: "%",
						tone: "primary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "By volume",
						sym: "SMv",
						value: smv,
						unit: "%",
						tone: "fg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Water depth",
						sym: `${perM} mm/m`,
						value: depth,
						unit: "mm",
						tone: "accent"
					})
				]
			}),
			ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm text-muted",
				children: [
					depth,
					" mm of water in ",
					where,
					". That is ",
					perM,
					" mm for each metre of soil."
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: `mt-3 text-sm ${result.status === "invalid" ? "text-primary" : "text-muted"}`,
				role: result.status === "invalid" ? "alert" : void 0,
				children: result.message
			}),
			ok && result.notes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 flex flex-col gap-1 text-sm text-primary",
				children: result.notes.map((note) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: note }, note))
			})
		]
	});
}
function Stat({ k, sym, value, unit, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0 rounded-md bg-bg px-2 py-3 sm:px-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted sm:text-sm",
				children: k
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: `mt-2 font-display text-2xl leading-none sm:text-4xl ${tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent" : "text-fg"}`,
				children: value
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs text-muted sm:text-sm",
				children: [
					unit,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "px-1",
						children: "·"
					}),
					sym
				]
			})
		]
	});
}
function Details({ result, unit }) {
	const ok = result.status === "ok";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-4 sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-1 font-display text-2xl text-fg",
				children: "In the profile"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-4 text-sm text-muted",
				children: "The filled part is the share of soil volume that is water. Lines mark field capacity and wilting point when you set them."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Profile, {
				smv: ok ? result.smv : 0,
				fc: ok && result.limits.status === "ok" ? result.limits.fc : null,
				pwp: ok && result.limits.status === "ok" ? result.limits.pwp : null
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LimitsReadout, {
				result,
				unit
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-4 sm:p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mb-4 font-display text-2xl text-fg",
			children: "Worked solution"
		}), ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Steps, {
			result,
			unit
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "The steps appear once the sample, density, and depth are valid."
		})]
	})] });
}
function Profile({ smv, fc, pwp }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-64 gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-full flex-col justify-between py-0.5 text-xs text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "100%" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "50%" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "0%" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative h-full w-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-x-0 bottom-0 bg-accent transition-[height] duration-200",
						style: { height: `${Math.max(0, Math.min(100, smv))}%` }
					}),
					fc != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {
						at: fc,
						dashed: false
					}),
					pwp != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {
						at: pwp,
						dashed: true
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "flex min-w-0 flex-col justify-center gap-2 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block size-3 shrink-0 rounded-sm bg-accent" }), "Current water"]
					}),
					fc != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block h-0.5 w-3 shrink-0 bg-primary" }), "Field capacity"]
					}),
					pwp != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block h-0.5 w-3 shrink-0 border-t border-dashed border-fg" }), "Wilting point"]
					})
				]
			})
		]
	}) });
}
function Mark({ at, dashed }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `absolute inset-x-0 border-t-2 ${dashed ? "border-dashed border-fg" : "border-primary"}`,
		style: { bottom: `${Math.max(0, Math.min(100, at))}%` }
	});
}
function LimitsReadout({ result, unit }) {
	if (result.status !== "ok") return null;
	const limits = result.limits;
	if (limits.status === "unset") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "mt-4 text-sm text-muted",
		children: [
			"Add field capacity and wilting point to get total available moisture, SM",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "ta-v" }),
			"."
		]
	});
	if (limits.status !== "ok") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: `mt-4 text-sm ${limits.status === "invalid" ? "text-primary" : "text-muted"}`,
		role: limits.status === "invalid" ? "alert" : void 0,
		children: limits.message
	});
	const where = depthPhrase(result.depthM, unit);
	let place;
	if (limits.place === "above-fc") place = `The sample is wetter than field capacity. Water above ${formatMeasure(limits.fc)}% usually drains and is not part of holding capacity. The profile can still hold ${formatMeasure(limits.paw)}% (${formatMeasure(limits.pawMm)} mm in ${where}) between wilting point and field capacity.`;
	else if (limits.place === "below-pwp") place = `The sample is at or below the wilting point. Plant-available water in this reading is exhausted.`;
	else place = `${formatMeasure(Math.max(0, Math.min(100, limits.depletion * 100)))}% of holding capacity has been used. ${formatMeasure(limits.paw)}% by volume remains available — ${formatMeasure(limits.pawMm)} mm in ${where}.`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4 border-t border-line pt-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: ["Water-holding capacity, SM", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "ta-v" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 font-display text-3xl leading-none text-accent",
				children: [formatMeasure(limits.taw), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "ml-1 font-sans text-sm font-medium text-muted",
					children: "%"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted",
				children: [
					formatMeasure(limits.tawMm),
					" mm of available water in ",
					where,
					". Field capacity ",
					formatMeasure(limits.fc),
					"% minus wilting point ",
					formatMeasure(limits.pwp),
					"%."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RangeBar, {
				fc: limits.fc,
				pwp: limits.pwp,
				smv: result.smv
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-fg",
				children: place
			})
		]
	});
}
function RangeBar({ fc, pwp, smv }) {
	const span = fc - pwp;
	const raw = (smv - pwp) / span * 100;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative h-3 rounded-full bg-surface-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-y-0 left-0 w-full rounded-full bg-accent/25" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${smv > fc || smv < pwp ? "bg-primary" : "bg-accent"}`,
				style: { left: `${Math.max(0, Math.min(100, raw))}%` }
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-1 flex justify-between text-xs text-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
				"PWP ",
				formatMeasure(pwp),
				"%"
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
				"FC ",
				formatMeasure(fc),
				"%"
			] })]
		})]
	});
}
function Steps({ result, unit }) {
	const wet = formatMeasure(result.wet, 3);
	const dry = formatMeasure(result.dry, 3);
	const lost = formatMeasure(result.lost, 3);
	const ds = formatMeasure(result.density, 3);
	const smw = formatMeasure(result.smw);
	const smv = formatMeasure(result.smv);
	const mm = formatMeasure(result.waterMm);
	const perM = formatMeasure(result.mmPerM);
	const depthMm = formatMeasure(result.depthM * 1e3, 1);
	const where = depthPhrase(result.depthM, unit);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold text-muted",
				children: "Water lost"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-display text-lg leading-snug",
				children: [
					wet,
					" g wet − ",
					dry,
					" g dry = ",
					lost,
					" g water"
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold text-muted",
				children: "Soil moisture by weight"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-display text-lg leading-snug",
				children: [
					"SM",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "w" }),
					" = (",
					lost,
					" / ",
					dry,
					") × 100 = ",
					smw,
					"%"
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold text-muted",
				children: "Volumetric moisture"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-display text-lg leading-snug",
				children: [
					"SM",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "v" }),
					" = ",
					smw,
					" × ",
					ds,
					" = ",
					smv,
					"%"
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-muted",
					children: "Water depth"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-display text-lg leading-snug",
					children: [
						"(",
						smv,
						" / 100) × ",
						depthMm,
						" mm = ",
						mm,
						" mm"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [perM, " mm of water per metre of soil."]
				})
			] }),
			result.limits.status === "ok" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-muted",
					children: "Water-holding capacity"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-display text-lg leading-snug",
					children: [
						"SM",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "ta-v" }),
						" = ",
						formatMeasure(result.limits.fc),
						" − ",
						formatMeasure(result.limits.pwp),
						" =",
						" ",
						formatMeasure(result.limits.taw),
						"%"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						formatMeasure(result.limits.tawMm),
						" mm available in ",
						where,
						"."
					]
				})
			] })
		]
	});
}
function Formulas() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-4 sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-4 font-display text-2xl text-fg",
				children: "Formulas"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Formula, {
						name: "Soil moisture by weight",
						eq: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							"SM",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "w" }),
							" = (wet weight − dry weight) / dry weight × 100"
						] }),
						unit: "%"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Formula, {
						name: "Volumetric moisture",
						eq: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							"SM",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "v" }),
							" = SM",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "w" }),
							" × D",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "s" })
						] }),
						unit: "%",
						note: "Density of water is taken as 1 g/cm³, so the gravimetric percent times bulk density is the volumetric percent."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Formula, {
						name: "Water depth",
						eq: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: "mm = (SMv / 100) × depth in mm, which is SMv × 10 mm per metre" }),
						note: "A volumetric moisture of 24% in one metre of soil is 240 mm of water."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Formula, {
						name: "Water-holding capacity",
						eq: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							"SM",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "ta-v" }),
							" = SM",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "v" }),
							"(FC) − SM",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "v" }),
							"(PWP)"
						] }),
						unit: "%",
						note: "Total available moisture. Field capacity at about 0.1–0.3 bar, permanent wilting point at 15 bar."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-5 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "font-semibold",
						children: "Ds"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-muted",
						children: "Soil bulk density, g/cm³ or Mg/m³"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "font-semibold",
						children: "FC"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-muted",
						children: "Field capacity, volumetric %"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "font-semibold",
						children: "PWP"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-muted",
						children: "Permanent wilting point, volumetric %"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "font-semibold",
						children: "SMta-v"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-muted",
						children: "Total available moisture, volumetric %"
					})] })
				]
			})
		]
	});
}
function Formula({ name, eq, unit, note }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm font-semibold text-muted",
			children: [name, unit ? ` (${unit})` : ""]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-lg leading-snug text-fg",
			children: eq
		}),
		note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-muted",
			children: note
		})
	] });
}
function Field({ id, label, value, onChange, suffix, hint, hideLabel }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: id,
				className: hideLabel ? "sr-only" : "text-sm font-semibold",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id,
					value,
					onChange: (event) => onChange(event.target.value),
					inputMode: "decimal",
					autoComplete: "off",
					className: `h-12 w-full rounded-md border border-line bg-bg text-lg text-fg ${suffix ? "pr-16 pl-3" : "px-3"}`
				}), suffix && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted",
					children: suffix
				})]
			}),
			hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: hint
			})
		]
	});
}
function ModeButton({ checked, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		role: "radio",
		"aria-checked": checked,
		onClick,
		className: `inline-flex h-11 items-center justify-center rounded-sm px-3 text-sm font-semibold ${checked ? "bg-primary text-primary-fg" : "text-muted"}`,
		children
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SoilCalculator, {}) });
}
//#endregion
export { Home as component };
