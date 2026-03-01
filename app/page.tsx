"use client";

import { useMemo, useState } from "react";

const CITY_DATA = {
  Saigon: {
    region: "South",
    activities: ["Coffee crawl in District 1", "Street food mission", "Rooftop sunset", "Spa / recovery day"],
    restaurants: ["Local bánh mì stall", "Cơm tấm spot", "Rooftop bar", "Hủ tiếu vendor"],
    packing: ["Breathable shirts", "Shorts", "Hydration plan"],
  },
  Hanoi: {
    region: "North",
    activities: ["Old Quarter walk", "Egg coffee stop", "Temple visit", "Night market"],
    restaurants: ["Phở breakfast", "Bún chả lunch", "Egg coffee café", "Street snack crawl"],
    packing: ["Light jacket", "Layer for cool mornings"],
  },
  "Ha Giang": {
    region: "North",
    activities: ["Motorbike loop day", "Ma Pi Leng pass", "Village stops", "Homestay dinner"],
    restaurants: ["Homestay meal", "Roadside noodle stop", "Tea stop"],
    packing: ["Rain jacket", "Neck buff", "Gloves", "Secure phone mount"],
  },
  "Ninh Binh": {
    region: "North",
    activities: ["Boat ride", "Bike countryside", "Hang Mua viewpoint"],
    restaurants: ["Local goat dish", "Brick Coffee", "Regional curry"],
    packing: ["Sun protection", "Comfortable shoes"],
  },
};

function mapsSearchUrl(q: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

type Prefs = {
  budget: "low" | "mid" | "high";
  dietary: string;
  vibe: string;
  contentStyle: string;
};

export default function Home() {
  const [segments, setSegments] = useState([{ city: "Saigon", start: "", end: "" }]);
  const [results, setResults] = useState<any>(null);

  // AI state (cached by city+prefs)
  const [aiData, setAiData] = useState<Record<string, any>>({});
  const [loadingCity, setLoadingCity] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<Prefs>({
    budget: "mid",
    dietary: "",
    vibe: "street food, cafes, scenic views",
    contentStyle: "vlog-friendly",
  });

  function addSegment() {
    setSegments([...segments, { city: "Hanoi", start: "", end: "" }]);
  }

  function updateSegment(index: number, field: string, value: string) {
    const updated = [...segments];
    (updated[index] as any)[field] = value;
    setSegments(updated);
  }

  function generatePlan() {
    const packingSet = new Set([
      "Passport",
      "Wallet",
      "Phone + charger",
      "Power bank",
      "Travel adapter",
      "Toiletries",
      "Med kit",
    ]);

    const cityPlans: any[] = [];

    segments.forEach((seg) => {
      if (!seg.start || !seg.end) return;

      const cityData = (CITY_DATA as any)[seg.city];
      cityData.packing.forEach((item: string) => packingSet.add(item));

      cityPlans.push({
        city: seg.city,
        start: seg.start,
        end: seg.end,
        region: cityData.region,
        activities: cityData.activities,
        restaurants: cityData.restaurants,
      });
    });

    setResults({
      packing: Array.from(packingSet),
      cities: cityPlans,
    });
  }

  const prefsKey = useMemo(() => JSON.stringify(prefs), [prefs]);

  async function enrichCity(cityObj: any, force = false) {
    const cacheKey = `${cityObj.city}::${prefsKey}`;
    if (!force && aiData[cacheKey]) return; // client-side cache

    setLoadingCity(cityObj.city);

    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: cityObj.city,
          region: cityObj.region,
          flags: {}, // you can add flags later
          prefs,
        }),
      });

      const data = await res.json();

      setAiData((prev) => ({
        ...prev,
        [cacheKey]: { ...data, _status: res.status },
      }));
    } catch (e: any) {
      setAiData((prev) => ({
        ...prev,
        [cacheKey]: { restaurants: [], activities: [], error: "Network error calling /api/enrich" },
      }));
    } finally {
      setLoadingCity(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight">Trip Architect</h1>
          <p className="text-slate-600 mt-3">
            Enter cities and dates. Get packing + city suggestions. Then AI-enrich restaurants & activities.
          </p>
        </div>

        {/* Preferences */}
        <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100 mb-8">
          <div className="font-medium mb-4">Preferences (used for AI enrich)</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">Budget</div>
              <select
                value={prefs.budget}
                onChange={(e) => setPrefs({ ...prefs, budget: e.target.value as Prefs["budget"] })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
              >
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">Dietary notes</div>
              <input
                value={prefs.dietary}
                onChange={(e) => setPrefs({ ...prefs, dietary: e.target.value })}
                placeholder="e.g. no pork, vegetarian-friendly"
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
              />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">Vibe</div>
              <input
                value={prefs.vibe}
                onChange={(e) => setPrefs({ ...prefs, vibe: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
              />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">Content style</div>
              <input
                value={prefs.contentStyle}
                onChange={(e) => setPrefs({ ...prefs, contentStyle: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
              />
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3">
            Tip: Changing prefs changes the AI cache key, so you’ll get new recommendations.
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-white shadow-sm rounded-2xl p-8 border border-slate-100 mb-10">
          <div className="space-y-6">
            {segments.map((seg, i) => (
              <div key={i} className="grid md:grid-cols-3 gap-4">
                <select
                  value={seg.city}
                  onChange={(e) => updateSegment(i, "city", e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2"
                >
                  {Object.keys(CITY_DATA).map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={seg.start}
                  onChange={(e) => updateSegment(i, "start", e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2"
                />

                <input
                  type="date"
                  value={seg.end}
                  onChange={(e) => updateSegment(i, "end", e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2"
                />
              </div>
            ))}

            <div className="flex gap-4 pt-4">
              <button
                onClick={addSegment}
                className="px-5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
              >
                + Add Segment
              </button>

              <button
                onClick={generatePlan}
                className="px-6 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                Generate Plan
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-10">
            {/* Packing */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-semibold mb-4">Smart Packing List</h2>
              <ul className="grid md:grid-cols-2 gap-2 text-slate-700">
                {results.packing.map((item: string, i: number) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            {/* City Plans */}
            {results.cities.map((city: any, i: number) => {
              const key = `${city.city}::${prefsKey}`;
              const ai = aiData[key];

              return (
                <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-1">{city.city}</h2>
                      <p className="text-sm text-slate-500 mb-3">{city.start} → {city.end}</p>
                    </div>

                    <a
                      href={mapsSearchUrl(`${city.city}, Vietnam`)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50 transition"
                    >
                      Open map
                    </a>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-medium mb-2">Activities</h3>
                      <ul className="space-y-1 text-slate-700">
                        {city.activities.map((a: string, j: number) => (
                          <li key={j}>• {a}</li>
                        ))}
                      </ul>

                      {ai?.activities?.length ? (
                        <>
                          <h4 className="mt-5 font-medium text-sm text-slate-500">AI Activities</h4>
                          <ul className="space-y-1 text-slate-700">
                            {ai.activities.map((a: string, j: number) => (
                              <li key={j}>• {a}</li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Restaurants</h3>
                      <ul className="space-y-1 text-slate-700">
                        {city.restaurants.map((r: string, j: number) => (
                          <li key={j}>• {r}</li>
                        ))}
                      </ul>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => enrichCity(city, false)}
                          disabled={loadingCity === city.city}
                          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-sm disabled:opacity-60"
                        >
                          {loadingCity === city.city ? "Enhancing…" : ai ? "AI Enriched ✓" : "AI Enrich"}
                        </button>

                        <button
                          onClick={() => enrichCity(city, true)}
                          disabled={loadingCity === city.city}
                          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-sm disabled:opacity-60"
                        >
                          Regenerate
                        </button>
                      </div>

                      {ai?.error ? (
                        <div className="mt-4 text-sm text-rose-600">
                          {ai.error} {ai._status ? `(HTTP ${ai._status})` : ""}
                        </div>
                      ) : null}

                      {ai?.restaurants?.length ? (
                        <>
                          <h4 className="mt-5 font-medium text-sm text-slate-500">AI Restaurants</h4>
                          <ul className="space-y-3 text-slate-700">
                            {ai.restaurants.map((r: any, j: number) => (
                              <li key={j} className="rounded-xl border border-slate-100 p-3">
                                <div className="font-medium">{r.name}</div>
                                <div className="text-sm text-slate-600">{r.vibe}</div>
                                <div className="text-sm italic">Order: {r.order}</div>
                                <div className="text-sm text-slate-500">{r.why}</div>
                                <a
                                  className="text-xs underline text-slate-600 hover:text-slate-900"
                                  href={mapsSearchUrl(`${r.name} ${city.city} Vietnam`)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Search on Maps
                                </a>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}

                      {ai?.meta?.cached ? (
                        <div className="mt-3 text-xs text-slate-400">Loaded from cache</div>
                      ) : null}
                      {ai?.meta?.fallback ? (
                        <div className="mt-1 text-xs text-slate-400">Fallback used (AI error)</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
