"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ApproxMap.module.css";

interface Props {
  lat?: number | null;
  lng?: number | null;
  city: string;
  province: string;
}

export default function ApproxMap({ lat, lng, city, province }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Resolve coordinates — use stored ones, or geocode city+province
      let resolvedLat = lat;
      let resolvedLng = lng;

      if (!resolvedLat || !resolvedLng) {
        try {
          const query   = encodeURIComponent(`${city}, ${province}, South Africa`);
          const res     = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const results = await res.json();
          if (results.length > 0) {
            resolvedLat = parseFloat(results[0].lat);
            resolvedLng = parseFloat(results[0].lon);
          }
        } catch {
          // geocode failed — show error state
        }
      }

      if (cancelled) return;
      if (!resolvedLat || !resolvedLng) { setStatus("error"); return; }
      if (!mapRef.current || instanceRef.current) return;

      const L = await import("leaflet");
      if (cancelled) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(mapRef.current, {
        center:           [resolvedLat, resolvedLng],
        zoom:             12,
        zoomControl:      false,
        scrollWheelZoom:  false,
        dragging:         false,
        doubleClickZoom:  false,
        boxZoom:          false,
        keyboard:         false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      // ~2 km fuzzy circle
      L.circle([resolvedLat, resolvedLng], {
        radius:      2000,
        color:       "#f5a800",
        fillColor:   "#f5a800",
        fillOpacity: 0.18,
        weight:      2,
        opacity:     0.6,
      }).addTo(map);

      instanceRef.current = map;
      setStatus("ready");
    }

    init();
    return () => {
      cancelled = true;
      instanceRef.current?.remove();
      instanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.wrap}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {status === "loading" && <div className={styles.placeholder} />}
      {status === "error"   && (
        <div className={styles.errorState}>
          <span>📍</span>
          <span>{city}, {province}</span>
        </div>
      )}

      <div
        ref={mapRef}
        className={styles.map}
        style={{ visibility: status === "ready" ? "visible" : "hidden" }}
      />

      {status === "ready" && (
        <>
          <div className={styles.badge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {city}, {province}
          </div>
          <div className={styles.disclaimer}>Approximate location · exact address shared after booking</div>
        </>
      )}
    </div>
  );
}
