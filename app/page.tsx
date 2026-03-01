"use client";

import { useState } from "react";

const CITY_DATA = {
  Saigon: {
    region: "South",
    activities: [
      "Coffee crawl in District 1",
      "Street food mission",
      "Rooftop sunset",
      "Spa / recovery day"
    ],
    restaurants: [
      "Local bánh mì stall",
      "Cơm tấm spot",
      "Rooftop bar",
      "Hủ tiếu vendor"
    ],
    packing: ["Breathable shirts", "Shorts", "Hydration plan"]
  },
  Hanoi: {
    region: "North",
    activities: [
      "Old Quarter walk",
      "Egg coffee stop",
      "Temple visit",
      "Night market"
    ],
    restaurants: [
      "Phở breakfast",
      "Bún chả lunch",
      "Egg coffee café",
      "Street snack crawl"
    ],
    packing: ["Light jacket", "Layer for cool mornings"]
  },
  "Ha Giang": {
    region: "North",
    activities: [
      "Motorbike loop day",
      "Ma Pi Leng pass",
      "Village stops",
      "Homestay dinner"
    ],
    restaurants: [
      "Homestay meal",
      "Roadside noodle stop",
      "Tea stop"
    ],
    packing: ["Rain jacket", "Neck buff", "Gloves", "Secure phone mount"]
  },
  "Ninh Binh": {
    region: "North",
    activities: [
      "Boat ride",
      "Bike countryside",
      "Hang Mua viewpoint"
    ],
    restaurants: [
      "Local goat dish",
      "Brick Coffee",
      "Regional curry"
    ],
    packing: ["Sun protection", "Comfortable shoes"]
  }
};

export default function Home() {
  const [segments, setSegments] = useState([{ city: "Saigon", start: "", end: "" }]);
  const [results, setResults] = useState<any>(null);
  const [aiData, setAiData] = useState<any>({});
  const [loadingCity, setLoadingCity] = useState<string | null>(null);

  function addSegment() {
    setSegments([...segments, { city: "Hanoi", start: "", end: "" }]);
  }

  function updateSegment(index: number, field: string, value: string) {
    const updated = [...segments];
    (updated[index] as any)[field] = value;
    setSegments(updated);
  }

  function generatePlan() {
    let packingSet = new Set([
      "Passport",
      "Wallet",
      "Phone + charger",
      "Power bank",
      "Travel adapter",
      "Toiletries",
      "Med kit"
    ]);

    let cityPlans: any[] = [];

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
        restaurants: cityData.restaurants
      });
    });

    setResults({
      packing: Array.from(packingSet),
      cities: cityPlans
    });
  }

  async function enrichCity(cityObj: any) {
    setLoadingCity(cityObj.city);

    const res = await fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: cityObj.city,
        region: cityObj.region,
        flags: {}
      })
    });

    const data = await res.json();

    setAiData((prev: any) => ({
      ...prev,
      [cityObj.city]: data
    }));

    setLoadingCity(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight">
            Trip Architect
          </h1>
          <p className="text-slate-600 mt-3">
            Enter cities and dates. Get intelligent packing, activities, and restaurant suggestions.
          </p>
        </div>

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

        {results && (
          <div className="space-y-10">

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-semibold mb-4">Smart Packing List</h2>
              <ul className="grid md:grid-cols-2 gap-2 text-slate-700">
                {results.packing.map((item: string, i: number) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            {results.cities.map((city: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <h2 className="text-xl font-semibold mb-1">
                  {city.city}
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  {city.start} → {city.end}
                </p>

                <div className="grid md:grid-cols-2 gap-8">

                  <div>
                    <h3 className="font-medium mb-2">Activities</h3>
                    <ul className="space-y-1 text-slate-700">
                      {city.activities.map((a: string, j: number) => (
                        <li key={j}>• {a}</li>
                      ))}
                    </ul>

                    {aiData[city.city]?.activities && (
                      <>
                        <h4 className="mt-4 font-medium text-sm text-slate-500">
                          AI Recommended Activities
                        </h4>
                        <ul className="space-y-1 text-slate-700">
                          {aiData[city.city].activities.map((a: string, j: number) => (
                            <li key={j}>• {a}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Restaurants</h3>
                    <ul className="space-y-1 text-slate-700">
                      {city.restaurants.map((r: string, j: number) => (
                        <li key={j}>• {r}</li>
                      ))}
                    </ul>

                    <button
                      onClick={() => enrichCity(city)}
                      className="mt-4 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-sm"
                    >
                      {loadingCity === city.city ? "Enhancing..." : "AI Enrich"}
                    </button>

                    {aiData[city.city]?.restaurants && (
                      <>
                        <h4 className="mt-4 font-medium text-sm text-slate-500">
                          AI Recommended Restaurants
                        </h4>
                        <ul className="space-y-2 text-slate-700">
                          {aiData[city.city].restaurants.map((r: any, j: number) => (
                            <li key={j}>
                              <div className="font-medium">{r.name}</div>
                              <div className="text-sm">{r.vibe}</div>
                              <div className="text-sm italic">Order: {r.order}</div>
                              <div className="text-sm text-slate-500">{r.why}</div>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}
