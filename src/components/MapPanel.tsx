import { MapPinOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { RestaurantResult } from "@/lib/domain";
import { getMarkerLetter, getMarkerTone } from "@/lib/presentation";

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

const defaultCenter = [42.5, 12.5] as [number, number];

export function MapPanel({ restaurants }: MapPanelProps) {
  const [components, setComponents] = useState<LeafletComponents | null>(null);
  const center = useMemo(() => {
    const firstExact =
      restaurants.find((restaurant) => restaurant.geocodeStatus === "exact") ||
      restaurants[0];
    return firstExact
      ? ([firstExact.lat, firstExact.lng] as [number, number])
      : defaultCenter;
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

  return (
    <div className="map-panel">
      <MapContainer
        center={center}
        zoom={restaurants.length ? 13 : 6}
        scrollWheelZoom
        className="munch-map-canvas"
      >
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />
        <MapViewport components={components} restaurants={restaurants} />
        {restaurants.map((restaurant, index) => {
          const tone = getMarkerTone(index);
          const letter = getMarkerLetter(index);

          return (
            <Marker
              icon={divIcon({
                className: "",
                html: `<div class="munch-map-marker munch-map-marker--${tone}"><span>${letter}</span></div>`,
                iconSize: [34, 46],
                iconAnchor: [17, 43],
                popupAnchor: [0, -34]
              })}
              key={restaurant.id}
              position={[restaurant.lat, restaurant.lng]}
              title={restaurant.displayName}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{restaurant.displayName}</strong>
                  {restaurant.address ? (
                    <span>{restaurant.address}</span>
                  ) : null}
                  {restaurant.geocodeStatus !== "exact" ? (
                    <span className="popup-warning">
                      <MapPinOff size={12} /> Approximate location
                    </span>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
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
      map.setView(defaultCenter, 6, { animate: false });
      return;
    }

    const bounds = components.latLngBounds(
      restaurants.map((restaurant) => [restaurant.lat, restaurant.lng])
    );
    map.fitBounds(bounds, { animate: false, maxZoom: 14, padding: [64, 64] });
  }, [components, map, restaurants]);

  return null;
}
