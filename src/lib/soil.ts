export type MassMode = "lost" | "dry";
export type DepthUnit = "m" | "cm";

export type Inputs = {
  wet: string;
  massMode: MassMode;
  other: string;
  density: string;
  depth: string;
  depthUnit: DepthUnit;
  fc: string;
  pwp: string;
};

export const FAO_EXAMPLE: Inputs = {
  wet: "120",
  massMode: "lost",
  other: "20",
  density: "1.2",
  depth: "1",
  depthUnit: "m",
  fc: "",
  pwp: "",
};

export const BLANK_INPUTS: Inputs = {
  wet: "",
  massMode: "lost",
  other: "",
  density: "",
  depth: "",
  depthUnit: "m",
  fc: "",
  pwp: "",
};

export const TEXTURES = [
  { id: "sand", label: "Sand", fc: "10", pwp: "5" },
  { id: "loam", label: "Loam", fc: "27", pwp: "12" },
  { id: "clay", label: "Clay", fc: "40", pwp: "22" },
] as const;

const STORAGE_KEY = "soil-moisture-v1";

export function isInputs(value: unknown): value is Inputs {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.wet === "string" &&
    typeof o.other === "string" &&
    typeof o.density === "string" &&
    typeof o.depth === "string" &&
    typeof o.fc === "string" &&
    typeof o.pwp === "string" &&
    (o.massMode === "lost" || o.massMode === "dry") &&
    (o.depthUnit === "m" || o.depthUnit === "cm")
  );
}

export function loadInputs(): Inputs | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isInputs(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveInputs(inputs: Inputs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  } catch {
    /* ignore quota / private mode */
  }
}

type Field =
  | { kind: "empty" }
  | { kind: "partial" }
  | { kind: "bad" }
  | { kind: "ok"; value: number };

function field(raw: string): Field {
  const t = raw.trim().replace(",", ".");
  if (t === "") return { kind: "empty" };
  if (/^-?\d+\.$/.test(t) || t === "-" || t === "." || t === "-.") return { kind: "partial" };
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { kind: "bad" };
  const value = Number(t);
  if (!Number.isFinite(value)) return { kind: "bad" };
  return { kind: "ok", value };
}

export function formatMeasure(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatInputNumber(n: number): string {
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}

export type LimitsResult =
  | { status: "unset" }
  | { status: "incomplete" | "invalid"; message: string }
  | {
      status: "ok";
      fc: number;
      pwp: number;
      taw: number;
      tawMm: number;
      paw: number;
      pawMm: number;
      depletion: number;
      place: "above-fc" | "available" | "below-pwp";
    };

export type SoilResult =
  | { status: "incomplete" | "invalid"; message: string }
  | {
      status: "ok";
      wet: number;
      dry: number;
      lost: number;
      density: number;
      depthM: number;
      smw: number;
      smv: number;
      waterMm: number;
      mmPerM: number;
      notes: string[];
      limits: LimitsResult;
    };

function required(f: Field, label: string): { error: string } | { value: number } | { wait: string } {
  if (f.kind === "empty") return { error: `Enter ${label}.` };
  if (f.kind === "partial") return { wait: `Finish the number for ${label}.` };
  if (f.kind === "bad") return { error: `${label} is not a number.` };
  return { value: f.value };
}

export function computeSoil(inputs: Inputs): SoilResult {
  const wetF = required(field(inputs.wet), "wet weight");
  if ("error" in wetF) return { status: "invalid", message: wetF.error };
  if ("wait" in wetF) return { status: "incomplete", message: wetF.wait };

  const otherLabel = inputs.massMode === "lost" ? "moisture lost" : "dry weight";
  const otherF = required(field(inputs.other), otherLabel);
  if ("error" in otherF) return { status: "invalid", message: otherF.error };
  if ("wait" in otherF) return { status: "incomplete", message: otherF.wait };

  const densityF = required(field(inputs.density), "bulk density");
  if ("error" in densityF) return { status: "invalid", message: densityF.error };
  if ("wait" in densityF) return { status: "incomplete", message: densityF.wait };

  const depthF = required(field(inputs.depth), "profile depth");
  if ("error" in depthF) return { status: "invalid", message: depthF.error };
  if ("wait" in depthF) return { status: "incomplete", message: depthF.wait };

  const wet = wetF.value;
  const other = otherF.value;
  const density = densityF.value;
  const depthM = inputs.depthUnit === "m" ? depthF.value : depthF.value / 100;

  if (wet <= 0) return { status: "invalid", message: "Wet weight has to be greater than zero." };
  if (other < 0) return { status: "invalid", message: `${otherLabel[0]!.toUpperCase()}${otherLabel.slice(1)} cannot be negative.` };
  if (density <= 0) return { status: "invalid", message: "Bulk density has to be greater than zero." };
  if (depthM <= 0) return { status: "invalid", message: "Profile depth has to be greater than zero." };

  const dry = inputs.massMode === "lost" ? wet - other : other;
  const lost = inputs.massMode === "lost" ? other : wet - other;

  if (dry <= 0) {
    return {
      status: "invalid",
      message: "Dry weight is zero or negative. Moisture lost cannot be the whole wet sample, or more.",
    };
  }
  if (lost < 0) {
    return {
      status: "invalid",
      message: "Dry weight is heavier than the wet sample. Check the two masses.",
    };
  }

  const smw = (lost / dry) * 100;
  const smv = smw * density;
  const mmPerM = smv * 10;
  const waterMm = (smv / 100) * depthM * 1000;

  const notes: string[] = [];
  if (density < 0.8 || density > 1.8) {
    notes.push("Bulk density is outside the 0.8–1.8 g/cm³ range common for mineral soil.");
  }
  if (smv > 70) {
    notes.push("Volumetric moisture is unusually high. Recheck the masses and bulk density.");
  }

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
    limits: computeLimits(inputs, smv, depthM),
  };
}

function computeLimits(inputs: Inputs, smv: number, depthM: number): LimitsResult {
  const fcF = field(inputs.fc);
  const pwpF = field(inputs.pwp);
  if (fcF.kind === "empty" && pwpF.kind === "empty") return { status: "unset" };

  if (fcF.kind === "partial" || pwpF.kind === "partial") {
    return { status: "incomplete", message: "Finish the field capacity and wilting point numbers." };
  }
  if (fcF.kind === "bad" || pwpF.kind === "bad") {
    return { status: "invalid", message: "Field capacity and wilting point need to be numbers." };
  }
  if (fcF.kind === "empty" || pwpF.kind === "empty") {
    return {
      status: "incomplete",
      message: "Enter both field capacity and permanent wilting point, as volumetric percent.",
    };
  }
  if (fcF.value < 0 || pwpF.value < 0) {
    return { status: "invalid", message: "Field capacity and wilting point cannot be negative." };
  }
  if (fcF.value <= pwpF.value) {
    return {
      status: "invalid",
      message: "Field capacity has to be wetter than the permanent wilting point.",
    };
  }

  const fc = fcF.value;
  const pwp = pwpF.value;
  const taw = fc - pwp;
  const tawMm = (taw / 100) * depthM * 1000;
  const pawVol = Math.max(0, Math.min(smv, fc) - pwp);
  const pawMm = (pawVol / 100) * depthM * 1000;
  const depletion = (fc - smv) / taw;

  let place: "above-fc" | "available" | "below-pwp";
  if (smv > fc) place = "above-fc";
  else if (smv <= pwp) place = "below-pwp";
  else place = "available";

  return { status: "ok", fc, pwp, taw, tawMm, paw: pawVol, pawMm, depletion, place };
}

export function depthPhrase(depthM: number, unit: DepthUnit): string {
  if (unit === "cm") return `${formatMeasure(depthM * 100, 1)} cm`;
  return `${formatMeasure(depthM, 3)} m`;
}
