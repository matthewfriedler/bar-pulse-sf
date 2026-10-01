import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";

import { STATUS_META, type Bar, type Consensus, type PlaceInfo } from "@/lib/barpulse";

const CENTER: [number, number] = [37.7990, -122.4345];

function pinIcon(bar: Bar, consensus: Consensus | undefined, active: boolean) {
  const status = STATUS_META[consensus?.status ?? "unknown"];
  const size = active ? 40 : 32;
  const label = consensus?.capacity != null ? `${consensus.capacity}` : "?";
  return L.divIcon({
    className: "",
    html: `<div class="bp-pin ${active ? "bp-pin-active" : ""}" style="width:${size}px;height:${size}px;background:${status.hex}">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapFocus({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [target, map]);
  return null;
}

interface Props {
  bars: Bar[];
  consensusByBar: Map<string, Consensus>;
  placeByBar?: Map<string, PlaceInfo>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function BarMap({ bars, consensusByBar, placeByBar, selectedId, onSelect }: Props) {
  const target = useMemo<[number, number] | null>(() => {
    const bar = bars.find((b) => b.id === selectedId);
    return bar ? [bar.lat, bar.lng] : null;
  }, [bars, selectedId]);

  return (
    <MapContainer
      center={CENTER}
      zoom={16}
      scrollWheelZoom
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />
      <MapFocus target={target} />
      {bars.map((bar) => (
        <Marker
          key={bar.id}
          position={[bar.lat, bar.lng]}
          icon={pinIcon(bar, consensusByBar.get(bar.id), bar.id === selectedId)}
          eventHandlers={{ click: () => onSelect(bar.id) }}
        >
          <Tooltip direction="top" offset={[0, -18]}>
            <span className="font-semibold">{bar.name}</span>
            <br />
            {STATUS_META[consensusByBar.get(bar.id)?.status ?? "unknown"].label}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}