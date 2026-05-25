import { useState } from "react";
import { OltMobileLayout } from "@/components/olt-mobile/OltMobileLayout";
import { splitterCalc, distanceCalc, SPLITTER_LOSS, SplitterType } from "@/lib/opticalCalc";
import { cn } from "@/lib/utils";

export default function OpticalCalculator() {
  const [tab, setTab] = useState<"splitter" | "distance">("splitter");
  const [input, setInput] = useState<string>("-5");
  const [type, setType] = useState<SplitterType>("20:80");
  const [distance, setDistance] = useState<string>("5");
  const [lossPerKm, setLossPerKm] = useState<string>("0.35");
  const [calc, setCalc] = useState(true);

  const inputDbm = parseFloat(input) || 0;
  const splitterResults = splitterCalc(inputDbm, type);
  const distResult = distanceCalc(inputDbm, parseFloat(distance) || 0, parseFloat(lossPerKm) || 0.35);

  return (
    <OltMobileLayout title="Optical Link Calculator" backTo="/m/olt">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-2 border-2 border-sky-500 rounded-lg overflow-hidden mb-4">
          {(["splitter", "distance"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn(
              "py-2.5 text-sm font-semibold uppercase",
              tab === t ? "bg-sky-50 text-sky-600" : "bg-white text-slate-500",
            )}>{t}</button>
          ))}
        </div>

        <Field label="Input Power (dBm)">
          <input type="number" value={input} onChange={(e) => setInput(e.target.value)} className="w-full px-3 py-2 border-2 border-sky-500 rounded-lg text-base focus:outline-none" />
        </Field>

        {tab === "splitter" ? (
          <Field label="Splitter Type">
            <select value={type} onChange={(e) => setType(e.target.value as SplitterType)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base bg-white dark:bg-slate-800">
              {Object.keys(SPLITTER_LOSS).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
        ) : (
          <>
            <Field label="Distance (km)">
              <input type="number" value={distance} onChange={(e) => setDistance(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
            </Field>
            <Field label="Cable Loss (dB/km)">
              <input type="number" step="0.01" value={lossPerKm} onChange={(e) => setLossPerKm(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
            </Field>
          </>
        )}

        <button onClick={() => setCalc(true)} className="w-full mt-4 py-3 bg-sky-400 hover:bg-sky-500 text-white font-semibold uppercase rounded-lg">
          Calculate
        </button>
      </div>

      {calc && (
        <div className="mt-4">
          <h3 className="text-sky-600 font-semibold mb-2">Results</h3>
          {tab === "splitter" ? (
            <div className="space-y-3">
              {splitterResults.map((r, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <span className="px-2 py-1 bg-sky-500 text-white text-xs rounded font-semibold">FBT</span>
                  <span className="text-base flex-1">Splitter Ratio: <strong>{r.label}</strong></span>
                  <span className="text-base">Output Power: <strong>{r.output} dBm</strong></span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-sm">
              <div className="flex justify-between"><span>Fiber Loss:</span><strong>{distResult.fiberLoss} dB</strong></div>
              <div className="flex justify-between"><span>Connector Loss:</span><strong>{distResult.connectorLoss} dB</strong></div>
              <div className="flex justify-between"><span>Total Loss:</span><strong>{distResult.totalLoss} dB</strong></div>
              <div className="flex justify-between text-base pt-2 border-t"><span>Output Power:</span><strong className="text-sky-600">{distResult.output} dBm</strong></div>
            </div>
          )}
        </div>
      )}
    </OltMobileLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="text-xs text-sky-600 font-medium mb-1 block">{label}</label>
      {children}
    </div>
  );
}
