import type { GeocodeResult } from "../domain";

export type GeocodeClient = {
  geocodePlace(place: string): Promise<GeocodeResult>;
  geocodeRestaurant(
    name: string,
    place: string,
    addressHint?: string
  ): Promise<GeocodeResult>;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

type GoogleGeocodeResponse = {
  status: string;
  results: Array<{
    formatted_address?: string;
    place_id?: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      location_type?: string;
    };
  }>;
};

export function createGoogleGeocodeClient(): GeocodeClient {
  const apiKey = requireEnv("GOOGLE_MAPS_API_KEY");

  async function geocode(
    query: string,
    fallback?: GeocodeResult
  ): Promise<GeocodeResult> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Google geocode failed: ${response.status} ${await response.text()}`
      );
    }

    const data = (await response.json()) as GoogleGeocodeResponse;
    const result = data.results[0];

    if (!result) {
      if (fallback) {
        return {
          ...fallback,
          status: "unmapped",
          warning:
            "Could not confidently geocode restaurant; using approximate place coordinates."
        };
      }

      throw new Error(`No geocode result for ${query}`);
    }

    const locationType = result.geometry.location_type;
    const exact =
      locationType === "ROOFTOP" || locationType === "RANGE_INTERPOLATED";

    return {
      formattedAddress: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      placeId: result.place_id,
      status: exact ? "exact" : "approximate",
      warning: exact ? undefined : "Google returned an approximate location."
    };
  }

  return {
    geocodePlace(place) {
      return geocode(place);
    },
    geocodeRestaurant(name, place, addressHint) {
      const query = [name, addressHint, place].filter(Boolean).join(", ");
      return geocode(query);
    }
  };
}
