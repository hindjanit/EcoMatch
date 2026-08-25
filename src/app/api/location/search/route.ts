import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
};

function labelFor(feature: PhotonFeature) {
  const p = feature.properties || {};
  const parts = [
    p.name,
    p.street,
    p.district,
    p.city,
    p.county,
    p.state,
    p.postcode,
    p.country,
  ].filter(Boolean);

  return Array.from(new Set(parts)).join(", ");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "").trim();

    if (q.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "6");
    url.searchParams.set("lang", "en");
    url.searchParams.set("lat", "28.6139");
    url.searchParams.set("lon", "77.2090");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "EcoMatch-Hackathon/1.0",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Location suggestions are temporarily unavailable." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const features = Array.isArray(data?.features) ? (data.features as PhotonFeature[]) : [];

    const suggestions = features
      .map((feature, index) => {
        const coordinates = feature.geometry?.coordinates;
        if (!coordinates || coordinates.length < 2) return null;
        const [lng, lat] = coordinates;
        const label = labelFor(feature);
        if (!label) return null;
        return {
          id: `${lat}-${lng}-${index}`,
          label,
          latitude: lat,
          longitude: lng,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Location search error:", error);
    return NextResponse.json(
      { error: "Location suggestions could not be loaded." },
      { status: 500 }
    );
  }
}
