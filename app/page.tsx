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
        activities: cityData.activities,
        restaurants: cityData.restaurants
      });
    });

    setResults({
      packing: Array.from(packingSet),
      cities: cityPlans
    });
  }

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1>Trip Architect</h1>
      <p>Enter cities and dates. Get smart packing + suggestions.</p>

      {segments.map((seg, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <select
            value={seg.city}
            onChange={(e) => updateSegment(i, "city", e.target.value)}
          >
            {Object.keys(CITY_DATA).map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>

          <input
            type="date"
            value={seg.start}
            onChange={(e) => updateSegment(i, "start", e.target.value)}
            style={{ marginLeft: 10 }}
          />

          <input
            type="date"
            value={seg.end}
            onChange={(e) => updateSegment(i, "end", e.target.value)}
            style={{ marginLeft: 10 }}
          />
        </div>
      ))}

      <button onClick={addSegment}>+ Add Segment</button>
      <button onClick={generatePlan} style={{ marginLeft: 10 }}>
        Generate Plan
      </button>

      {results && (
        <div style={{ marginTop: 40 }}>
          <h2>Smart Packing List</h2>
          <ul>
            {results.packing.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          {results.cities.map((city: any, i: number) => (
            <div key={i} style={{ marginTop: 30 }}>
              <h2>
                {city.city} ({city.start} → {city.end})
              </h2>

              <strong>Activities</strong>
              <ul>
                {city.activities.map((a: string, j: number) => (
                  <li key={j}>{a}</li>
                ))}
              </ul>

              <strong>Restaurants</strong>
              <ul>
                {city.restaurants.map((r: string, j: number) => (
                  <li key={j}>{r}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
