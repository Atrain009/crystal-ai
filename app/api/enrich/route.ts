import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { city, region, flags } = await req.json();

    const prompt = `
You are a hyper-competent travel agent.

City: ${city}
Region: ${region}
Flags: ${JSON.stringify(flags)}

Generate:
1. 3 highly specific restaurant recommendations
2. For each: name, vibe, what to order, why it's worth it
3. 2 unique local activity ideas beyond tourist basics

Respond ONLY as valid JSON in this format:

{
  "restaurants": [
    {
      "name": "",
      "vibe": "",
      "order": "",
      "why": ""
    }
  ],
  "activities": []
}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const data = await response.json();

    const text = data.output?.[0]?.content?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: "No AI output" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(text));

  } catch (err) {
    return NextResponse.json({ error: "Failed to enrich" }, { status: 500 });
  }
}
