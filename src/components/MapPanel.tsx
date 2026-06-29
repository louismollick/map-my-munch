import { MapPinOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { RestaurantResult } from "@/lib/domain";

type LeafletComponents = {
  MapContainer: typeof import("react-leaflet").MapContainer;
  TileLayer: typeof import("react-leaflet").TileLayer;
  Marker: typeof import("react-leaflet").Marker;
  Popup: typeof import("react-leaflet").Popup;
  useMap: typeof import("react-leaflet").useMap;
  divIcon: typeof import("leaflet").divIcon;
  latLngBounds: typeof import("leaflet").latLngBounds;
};

type MapPanelProps = {
  restaurants: RestaurantResult[];
};

export function MapPanel({ restaurants }: MapPanelProps) {
  const [components, setComponents] = useState<LeafletComponents | null>(null);
  const center = useMemo(() => {
    const firstExact =
      restaurants.find((restaurant) => restaurant.geocodeStatus === "exact") ||
      restaurants[0];
    return firstExact
      ? ([firstExact.lat, firstExact.lng] as [number, number])
      : ([41.9028, 12.4964] as [number, number]);
  }, [restaurants]);

  useEffect(() => {
    let mounted = true;

    async function loadMap() {
      const leaflet = await import("leaflet");
      const reactLeaflet = await import("react-leaflet");

      if (mounted) {
        setComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          useMap: reactLeaflet.useMap,
          divIcon: leaflet.divIcon,
          latLngBounds: leaflet.latLngBounds
        });
      }
    }

    void loadMap();

    return () => {
      mounted = false;
    };
  }, []);

  if (!components) {
    return <div className="map-loading">Loading map</div>;
  }

  const { MapContainer, Marker, Popup, TileLayer, divIcon } = components;
  const exactIcon = divIcon({
    className: "munch-marker munch-marker-exact",
    html: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
  const approximateIcon = divIcon({
    className: "munch-marker munch-marker-approximate",
    html: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-full min-h-[360px] w-full"
    >
      <TileLayer
        attribution="Tiles &copy; Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
      />
      <MapViewport components={components} restaurants={restaurants} />
      {restaurants.map((restaurant) => (
        <Marker
          icon={
            restaurant.geocodeStatus === "exact" ? exactIcon : approximateIcon
          }
          key={restaurant.id}
          position={[restaurant.lat, restaurant.lng]}
          title={restaurant.displayName}
        >
          <Popup>
            <div className="map-popup">
              <strong>{restaurant.displayName}</strong>
              <span>Score {restaurant.score.toFixed(1)}</span>
              {restaurant.geocodeStatus !== "exact" ? (
                <span className="popup-warning">
                  <MapPinOff size={12} /> Approximate
                </span>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function MapViewport({
  components,
  restaurants
}: {
  components: LeafletComponents;
  restaurants: RestaurantResult[];
}) {
  const map = components.useMap();

  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const frame = window.requestAnimationFrame(invalidate);
    const observer = new ResizeObserver(invalidate);
    observer.observe(map.getContainer());

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  useEffect(() => {
    if (restaurants.length === 0) {
      return;
    }

    const bounds = components.latLngBounds(
      restaurants.map((restaurant) => [restaurant.lat, restaurant.lng])
    );
    map.fitBounds(bounds, { animate: false, maxZoom: 14, padding: [48, 48] });
  }, [components, map, restaurants]);

  return null;
}
