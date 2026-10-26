import { useEffect, useState, type ReactNode } from "react";
import {
  BLANK_INPUTS,
  FAO_EXAMPLE,
  TEXTURES,
  computeSoil,
  depthPhrase,
  formatInputNumber,
  formatMeasure,
  loadInputs,
  saveInputs,
  type DepthUnit,
  type Inputs,
  type MassMode,
  type SoilResult,
} from "@/lib/soil";

function parseComplete(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function SoilCalculator() {
  const [inputs, setInputs] = useState<Inputs>(FAO_EXAMPLE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadInputs();
    if (saved) setInputs(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveInputs(inputs);
  }, [inputs, ready]);

  const result = computeSoil(inputs);
  const isExample =
    inputs.wet === FAO_EXAMPLE.wet &&
    inputs.massMode === FAO_EXAMPLE.massMode &&
    inputs.other === FAO_EXAMPLE.other &&
    inputs.density === FAO_EXAMPLE.density &&
    inputs.depth === FAO_EXAMPLE.depth &&
    inputs.depthUnit === FAO_EXAMPLE.depthUnit;

  function patch(partial: Partial<Inputs>) {
    setInputs((prev) => ({ ...prev, ...partial }));
  }

  function switchMode(next: MassMode) {
    setInputs((prev) => {
      if (prev.massMode === next) return prev;
      const wet = parseComplete(prev.wet);
      const other = parseComplete(prev.other);
      const nextOther = wet != null && other != null ? formatInputNumber(wet - other) : prev.other;
      return { ...prev, massMode: next, other: nextOther };
    });
  }

  function switchDepthUnit(next: DepthUnit) {
    setInputs((prev) => {
      if (prev.depthUnit === next) return prev;
      const n = parseComplete(prev.depth);
      if (n == null) return { ...prev, depthUnit: next };
      const converted = prev.depthUnit === "m" ? n * 100 : n / 100;
      return { ...prev, depthUnit: next, depth: formatInputNumber(converted) };
    });
  }

  return (
    <div className="min-h-screen">
      <div className="h-1.5 bg-primary" />
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-2 flex items-start gap-4">
          <span
            aria-hidden
            className="relative mt-1 h-12 w-9 shrink-0 overflow-hidden rounded-sm border border-line bg-surface-2"
          >
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-accent" />
            <span className="absolute inset-x-0 top-1/3 border-t border-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">Soil water</p>
            <h1 className="font-display text-4xl leading-tight text-fg sm:text-5xl">Soil moisture</h1>
            <p className="mt-2 max-w-xl text-base text-muted">
              From an oven-dry sample to percent by weight, percent by volume, and millimetres of water.
              Holding capacity is field capacity minus the wilting point.
            </p>
          </div>
        </header>

        <div className="lg:hidden">
          <Stats result={result} unit={inputs.depthUnit} />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
          <div className="flex flex-col gap-4">
            <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl text-fg">Sample</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInputs(FAO_EXAMPLE)}
                    className={`inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold ${
                      isExample
                        ? "bg-primary text-primary-fg"
                        : "border border-line bg-surface-2 text-fg"
                    }`}
                  >
                    FAO example 9
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputs((prev) => ({ ...BLANK_INPUTS, depthUnit: prev.depthUnit }))}
                    className="inline-flex h-11 items-center rounded-md border border-line px-3 text-sm font-semibold text-fg"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {isExample && (
                <p className="mb-4 text-sm text-muted">
                  Wet sample 120 g, 20 g lost on drying, bulk density 1.2. FAO Module 2, Example 9.
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="wet"
                  label="Wet weight"
                  suffix="g"
                  value={inputs.wet}
                  onChange={(wet) => patch({ wet })}
                  hint="Soil plus water, before the oven."
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold" id="mass-mode-label">
                    Second mass
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby="mass-mode-label"
                    className="grid grid-cols-2 rounded-md bg-surface-2 p-1"
                  >
                    <ModeButton
                      checked={inputs.massMode === "lost"}
                      onClick={() => switchMode("lost")}
                    >
                      Moisture lost
                    </ModeButton>
                    <ModeButton
                      checked={inputs.massMode === "dry"}
                      onClick={() => switchMode("dry")}
                    >
                      Dry weight
                    </ModeButton>
                  </div>
                  <Field
                    id="other"
                    label={inputs.massMode === "lost" ? "Moisture lost" : "Oven-dry weight"}
                    suffix="g"
                    value={inputs.other}
                    onChange={(other) => patch({ other })}
                    hint={
                      inputs.massMode === "lost"
                        ? "Weight driven off by oven drying."
                        : "Sample after oven drying."
                    }
                    hideLabel
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
              <h2 className="mb-4 font-display text-2xl text-fg">Soil</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="density"
                  label="Bulk density, Ds"
                  suffix="g/cm³"
                  value={inputs.density}
                  onChange={(density) => patch({ density })}
                  hint="Same number in Mg/m³. Mineral soils are often 1.1–1.6."
                />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="depth" className="text-sm font-semibold">
                      Profile depth
                    </label>
                    <div role="radiogroup" aria-label="Depth unit" className="grid grid-cols-2 rounded-md bg-surface-2 p-1">
                      <ModeButton checked={inputs.depthUnit === "m"} onClick={() => switchDepthUnit("m")}>
                        m
                      </ModeButton>
                      <ModeButton checked={inputs.depthUnit === "cm"} onClick={() => switchDepthUnit("cm")}>
                        cm
                      </ModeButton>
                    </div>
                  </div>
                  <Field
                    id="depth"
                    label="Profile depth"
                    suffix={inputs.depthUnit}
                    value={inputs.depth}
                    onChange={(depth) => patch({ depth })}
                    hint="Layer the water depth applies to. 0.3 m is 30 cm."
                    hideLabel
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
              <h2 className="font-display text-2xl text-fg">Holding capacity</h2>
              <p className="mt-1 mb-4 text-sm text-muted">
                Optional. Both values are volumetric moisture: field capacity near 0.1–0.3 bar, permanent
                wilting point at 15 bar.
              </p>
              <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Illustrative textures">
                {TEXTURES.map((texture) => {
                  const active = inputs.fc === texture.fc && inputs.pwp === texture.pwp;
                  return (
                    <button
                      key={texture.id}
                      type="button"
                      onClick={() => patch({ fc: texture.fc, pwp: texture.pwp })}
                      className={`inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold ${
                        active ? "bg-accent text-accent-fg" : "border border-line bg-surface-2 text-fg"
                      }`}
                    >
                      {texture.label}
                    </button>
                  );
                })}
              </div>
              <p className="mb-4 text-sm text-muted">
                Sand, loam, and clay fill typical volumetric percentages. They are illustrations, not the FAO
                example.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="fc"
                  label="Field capacity, SMv (FC)"
                  suffix="%"
                  value={inputs.fc}
                  onChange={(fc) => patch({ fc })}
                />
                <Field
                  id="pwp"
                  label="Wilting point, SMv (PWP)"
                  suffix="%"
                  value={inputs.pwp}
                  onChange={(pwp) => patch({ pwp })}
                />
              </div>
            </section>

            <div className="hidden lg:block">
              <Formulas />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="hidden lg:block">
              <Stats result={result} unit={inputs.depthUnit} />
            </div>
            <Details result={result} unit={inputs.depthUnit} />
          </div>
        </div>

        <div className="lg:hidden">
          <Formulas />
        </div>
      </div>
    </div>
  );
}

function Stats({ result, unit }: { result: SoilResult; unit: DepthUnit }) {
  const ok = result.status === "ok";
  const smw = ok ? formatMeasure(result.smw) : "—";
  const smv = ok ? formatMeasure(result.smv) : "—";
  const depth = ok ? formatMeasure(result.waterMm) : "—";
  const perM = ok ? formatMeasure(result.mmPerM) : "—";
  const where = ok ? depthPhrase(result.depthM, unit) : "profile";

  const summary = ok
    ? `Gravimetric moisture ${smw} percent, volumetric ${smv} percent, water depth ${depth} millimetres in ${where}.`
    : result.message;

  return (
    <section className="rounded-lg border border-line bg-surface p-4 sm:p-5" aria-live="polite">
      <h2 className="mb-4 font-display text-2xl text-fg">Results</h2>
      <p className="sr-only">{summary}</p>
      <div className="grid grid-cols-3 gap-2">
        <Stat k="By weight" sym="SMw" value={smw} unit="%" tone="primary" />
        <Stat k="By volume" sym="SMv" value={smv} unit="%" tone="fg" />
        <Stat k="Water depth" sym={`${perM} mm/m`} value={depth} unit="mm" tone="accent" />
      </div>
      {ok ? (
        <p className="mt-3 text-sm text-muted">
          {depth} mm of water in {where}. That is {perM} mm for each metre of soil.
        </p>
      ) : (
        <p className={`mt-3 text-sm ${result.status === "invalid" ? "text-primary" : "text-muted"}`} role={result.status === "invalid" ? "alert" : undefined}>
          {result.message}
        </p>
      )}
      {ok && result.notes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-primary">
          {result.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({
  k,
  sym,
  value,
  unit,
  tone,
}: {
  k: string;
  sym: string;
  value: string;
  unit: string;
  tone: "primary" | "fg" | "accent";
}) {
  const color = tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent" : "text-fg";
  return (
    <div className="min-w-0 rounded-md bg-bg px-2 py-3 sm:px-3">
      <p className="text-xs text-muted sm:text-sm">{k}</p>
      <p className={`mt-2 font-display text-2xl leading-none sm:text-4xl ${color}`}>{value}</p>
      <p className="mt-2 text-xs text-muted sm:text-sm">
        {unit}
        <span className="px-1">·</span>
        {sym}
      </p>
    </div>
  );
}

function Details({ result, unit }: { result: SoilResult; unit: DepthUnit }) {
  const ok = result.status === "ok";
  return (
    <>
      <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <h2 className="mb-1 font-display text-2xl text-fg">In the profile</h2>
        <p className="mb-4 text-sm text-muted">
          The filled part is the share of soil volume that is water. Lines mark field capacity and wilting
          point when you set them.
        </p>
        <Profile
          smv={ok ? result.smv : 0}
          fc={ok && result.limits.status === "ok" ? result.limits.fc : null}
          pwp={ok && result.limits.status === "ok" ? result.limits.pwp : null}
        />
        <LimitsReadout result={result} unit={unit} />
      </section>

      <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <h2 className="mb-4 font-display text-2xl text-fg">Worked solution</h2>
        {ok ? <Steps result={result} unit={unit} /> : <p className="text-sm text-muted">The steps appear once the sample, density, and depth are valid.</p>}
      </section>
    </>
  );
}

function Profile({ smv, fc, pwp }: { smv: number; fc: number | null; pwp: number | null }) {
  const fill = Math.max(0, Math.min(100, smv));
  return (
    <div>
      <div className="flex h-64 gap-3">
        <div className="flex h-full flex-col justify-between py-0.5 text-xs text-muted">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div className="relative h-full w-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
          <div className="absolute inset-x-0 bottom-0 bg-accent transition-[height] duration-200" style={{ height: `${fill}%` }} />
          {fc != null && <Mark at={fc} dashed={false} />}
          {pwp != null && <Mark at={pwp} dashed />}
        </div>
        <ul className="flex min-w-0 flex-col justify-center gap-2 text-sm text-muted">
          <li className="flex items-center gap-2">
            <span className="inline-block size-3 shrink-0 rounded-sm bg-accent" />
            Current water
          </li>
          {fc != null && (
            <li className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-3 shrink-0 bg-primary" />
              Field capacity
            </li>
          )}
          {pwp != null && (
            <li className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-3 shrink-0 border-t border-dashed border-fg" />
              Wilting point
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Mark({ at, dashed }: { at: number; dashed: boolean }) {
  const bottom = Math.max(0, Math.min(100, at));
  return (
    <span
      className={`absolute inset-x-0 border-t-2 ${dashed ? "border-dashed border-fg" : "border-primary"}`}
      style={{ bottom: `${bottom}%` }}
    />
  );
}

function LimitsReadout({ result, unit }: { result: SoilResult; unit: DepthUnit }) {
  if (result.status !== "ok") return null;
  const limits = result.limits;
  if (limits.status === "unset") {
    return (
      <p className="mt-4 text-sm text-muted">
        Add field capacity and wilting point to get total available moisture, SM<sub>ta-v</sub>.
      </p>
    );
  }
  if (limits.status !== "ok") {
    return (
      <p className={`mt-4 text-sm ${limits.status === "invalid" ? "text-primary" : "text-muted"}`} role={limits.status === "invalid" ? "alert" : undefined}>
        {limits.message}
      </p>
    );
  }

  const where = depthPhrase(result.depthM, unit);
  let place: string;
  if (limits.place === "above-fc") {
    place = `The sample is wetter than field capacity. Water above ${formatMeasure(limits.fc)}% usually drains and is not part of holding capacity. The profile can still hold ${formatMeasure(limits.paw)}% (${formatMeasure(limits.pawMm)} mm in ${where}) between wilting point and field capacity.`;
  } else if (limits.place === "below-pwp") {
    place = `The sample is at or below the wilting point. Plant-available water in this reading is exhausted.`;
  } else {
    const used = Math.max(0, Math.min(100, limits.depletion * 100));
    place = `${formatMeasure(used)}% of holding capacity has been used. ${formatMeasure(limits.paw)}% by volume remains available — ${formatMeasure(limits.pawMm)} mm in ${where}.`;
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-sm text-muted">Water-holding capacity, SM<sub>ta-v</sub></p>
      <p className="mt-1 font-display text-3xl leading-none text-accent">
        {formatMeasure(limits.taw)}
        <span className="ml-1 font-sans text-sm font-medium text-muted">%</span>
      </p>
      <p className="mt-2 text-sm text-muted">
        {formatMeasure(limits.tawMm)} mm of available water in {where}. Field capacity {formatMeasure(limits.fc)}% minus wilting point {formatMeasure(limits.pwp)}%.
      </p>
      <RangeBar fc={limits.fc} pwp={limits.pwp} smv={result.smv} />
      <p className="mt-3 text-sm text-fg">{place}</p>
    </div>
  );
}

function RangeBar({ fc, pwp, smv }: { fc: number; pwp: number; smv: number }) {
  const span = fc - pwp;
  const raw = ((smv - pwp) / span) * 100;
  const marker = Math.max(0, Math.min(100, raw));
  const outside = smv > fc || smv < pwp;
  return (
    <div className="mt-4">
      <div className="relative h-3 rounded-full bg-surface-2">
        <div className="absolute inset-y-0 left-0 w-full rounded-full bg-accent/25" />
        <span
          className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${outside ? "bg-primary" : "bg-accent"}`}
          style={{ left: `${marker}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>PWP {formatMeasure(pwp)}%</span>
        <span>FC {formatMeasure(fc)}%</span>
      </div>
    </div>
  );
}

function Steps({ result, unit }: { result: Extract<SoilResult, { status: "ok" }>; unit: DepthUnit }) {
  const wet = formatMeasure(result.wet, 3);
  const dry = formatMeasure(result.dry, 3);
  const lost = formatMeasure(result.lost, 3);
  const ds = formatMeasure(result.density, 3);
  const smw = formatMeasure(result.smw);
  const smv = formatMeasure(result.smv);
  const mm = formatMeasure(result.waterMm);
  const perM = formatMeasure(result.mmPerM);
  const depthMm = formatMeasure(result.depthM * 1000, 1);
  const where = depthPhrase(result.depthM, unit);

  return (
    <ol className="flex flex-col gap-4">
      <li>
        <p className="text-sm font-semibold text-muted">Water lost</p>
        <p className="font-display text-lg leading-snug">
          {wet} g wet − {dry} g dry = {lost} g water
        </p>
      </li>
      <li>
        <p className="text-sm font-semibold text-muted">Soil moisture by weight</p>
        <p className="font-display text-lg leading-snug">
          SM<sub>w</sub> = ({lost} / {dry}) × 100 = {smw}%
        </p>
      </li>
      <li>
        <p className="text-sm font-semibold text-muted">Volumetric moisture</p>
        <p className="font-display text-lg leading-snug">
          SM<sub>v</sub> = {smw} × {ds} = {smv}%
        </p>
      </li>
      <li>
        <p className="text-sm font-semibold text-muted">Water depth</p>
        <p className="font-display text-lg leading-snug">
          ({smv} / 100) × {depthMm} mm = {mm} mm
        </p>
        <p className="text-sm text-muted">{perM} mm of water per metre of soil.</p>
      </li>
      {result.limits.status === "ok" && (
        <li>
          <p className="text-sm font-semibold text-muted">Water-holding capacity</p>
          <p className="font-display text-lg leading-snug">
            SM<sub>ta-v</sub> = {formatMeasure(result.limits.fc)} − {formatMeasure(result.limits.pwp)} ={" "}
            {formatMeasure(result.limits.taw)}%
          </p>
          <p className="text-sm text-muted">
            {formatMeasure(result.limits.tawMm)} mm available in {where}.
          </p>
        </li>
      )}
    </ol>
  );
}

function Formulas() {
  return (
    <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <h2 className="mb-4 font-display text-2xl text-fg">Formulas</h2>
      <div className="flex flex-col gap-4">
        <Formula
          name="Soil moisture by weight"
          eq={
            <>
              SM<sub>w</sub> = (wet weight − dry weight) / dry weight × 100
            </>
          }
          unit="%"
        />
        <Formula
          name="Volumetric moisture"
          eq={
            <>
              SM<sub>v</sub> = SM<sub>w</sub> × D<sub>s</sub>
            </>
          }
          unit="%"
          note="Density of water is taken as 1 g/cm³, so the gravimetric percent times bulk density is the volumetric percent."
        />
        <Formula
          name="Water depth"
          eq={<>mm = (SMv / 100) × depth in mm, which is SMv × 10 mm per metre</>}
          note="A volumetric moisture of 24% in one metre of soil is 240 mm of water."
        />
        <Formula
          name="Water-holding capacity"
          eq={
            <>
              SM<sub>ta-v</sub> = SM<sub>v</sub>(FC) − SM<sub>v</sub>(PWP)
            </>
          }
          unit="%"
          note="Total available moisture. Field capacity at about 0.1–0.3 bar, permanent wilting point at 15 bar."
        />
      </div>
      <dl className="mt-5 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">Ds</dt>
          <dd className="text-muted">Soil bulk density, g/cm³ or Mg/m³</dd>
        </div>
        <div>
          <dt className="font-semibold">FC</dt>
          <dd className="text-muted">Field capacity, volumetric %</dd>
        </div>
        <div>
          <dt className="font-semibold">PWP</dt>
          <dd className="text-muted">Permanent wilting point, volumetric %</dd>
        </div>
        <div>
          <dt className="font-semibold">SMta-v</dt>
          <dd className="text-muted">Total available moisture, volumetric %</dd>
        </div>
      </dl>
    </section>
  );
}

function Formula({
  name,
  eq,
  unit,
  note,
}: {
  name: string;
  eq: ReactNode;
  unit?: string;
  note?: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-muted">
        {name}
        {unit ? ` (${unit})` : ""}
      </p>
      <p className="font-display text-lg leading-snug text-fg">{eq}</p>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  suffix,
  hint,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  hint?: string;
  hideLabel?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-semibold"}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          className={`h-12 w-full rounded-md border border-line bg-bg text-lg text-fg ${suffix ? "pr-16 pl-3" : "px-3"}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

function ModeButton({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center rounded-sm px-3 text-sm font-semibold ${
        checked ? "bg-primary text-primary-fg" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}
