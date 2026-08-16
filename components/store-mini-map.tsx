"use client";

import { useEffect, useRef, useState } from "react";
import { Map, Navigation } from "lucide-react";
import Link from "next/link";
import { buildNaverDirectionsUrl } from "@/lib/map-features";

type StoreMiniMapProps = {
  store: {
    id: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    totalWins: number;
  };
};

export function StoreMiniMap({ store }: StoreMiniMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{
    setCenter: (center: unknown) => void;
    destroy?: () => void;
  } | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const directionsUrl = buildNaverDirectionsUrl(store);
  const mainMapUrl =
    store.latitude && store.longitude
      ? `/?lat=${store.latitude}&lng=${store.longitude}&storeId=${encodeURIComponent(store.id)}`
      : "/";

  /* ── Phase 1: poll for window.naver.maps (identical to MapHome) ── */
  useEffect(() => {
    const checkMap = () => {
      if (typeof window !== "undefined" && window.naver?.maps) {
        setIsMapLoaded(true);
        return true;
      }
      return false;
    };

    if (checkMap()) return;

    const interval = setInterval(() => {
      if (checkMap()) clearInterval(interval);
    }, 100);

    const timer = setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  /* ── Phase 2: create map (identical guard pattern to MapHome L372-438) ── */
  useEffect(() => {
    if (!isMapLoaded || !mapContainerRef.current || !window.naver?.maps || mapInstanceRef.current) return;
    if (!store.latitude || !store.longitude) return;

    mapContainerRef.current.innerHTML = "";

    const center = new window.naver.maps.LatLng(store.latitude, store.longitude);
    const map = new window.naver.maps.Map(mapContainerRef.current, {
      center,
      zoom: 16,
      scaleControl: false,
      logoControl: false,
      mapDataControl: false,
      zoomControl: false,
      draggable: true,
      pinchZoom: true,
      scrollWheel: false,
    });
    mapInstanceRef.current = map;

    const markerContent = `<div style="display:flex;flex-direction:column;align-items:center"><div style="display:flex;align-items:center;gap:4px;border:3px solid white;border-radius:999px;padding:6px 12px;background:#0F8A5F;color:white;font-size:13px;font-weight:900;box-shadow:0 4px 14px rgba(0,0,0,.3)">📍 ${store.name}</div><div style="width:3px;height:8px;background:#0F8A5F"></div></div>`;

    new window.naver.maps.Marker({
      position: center,
      map,
      title: store.name,
      icon: {
        content: markerContent,
        anchor: new window.naver.maps.Point(45, 36),
      },
    });

    const syncMapSize = () => {
      if (mapInstanceRef.current && window.naver?.maps) {
        window.naver.maps.Event.trigger(mapInstanceRef.current, "resize");
        mapInstanceRef.current.setCenter(center);
      }
    };

    syncMapSize();
    const rafId = requestAnimationFrame(syncMapSize);
    const timer1 = setTimeout(syncMapSize, 100);
    const timer2 = setTimeout(syncMapSize, 400);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => syncMapSize());
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver?.disconnect();
      try {
        if (mapInstanceRef.current && typeof mapInstanceRef.current.destroy === "function") {
          mapInstanceRef.current.destroy();
        }
      } catch {}
      mapInstanceRef.current = null;
    };
  }, [isMapLoaded, store.latitude, store.longitude, store.name]);

  if (!store.latitude || !store.longitude) {
    return null;
  }

  return (
    <section className="mt-5 rounded-2xl border border-[#DFE4DF] bg-white p-4 shadow-xs" aria-label="판매점 지도 위치">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-black text-[#0F8A5F]">위치 안내</p>
          <h2 className="text-[18px] font-black text-[#17211C]">지도 상 위치</h2>
        </div>
        <Link
          href={mainMapUrl}
          className="pressable inline-flex items-center gap-1 text-[13px] font-extrabold text-[#0F8A5F] hover:underline"
        >
          <Map size={15} />
          큰 지도로 이동 ➔
        </Link>
      </div>

      {/* MINI MAP CONTAINER */}
      <div className="relative h-48 w-full overflow-hidden rounded-xl border border-[#DCE2DD] bg-[#EAEFEA]">
        <div ref={mapContainerRef} className="h-full w-full" />
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F4F6F4] text-[13px] font-bold text-[#68736D]">
            지도를 불러오는 중...
          </div>
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Link
          href={mainMapUrl}
          className="pressable flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-[#D7DED8] bg-white px-2 text-[14px] font-extrabold text-[#17211C] shadow-xs hover:bg-[#F6F8F6]"
        >
          <Map size={17} className="shrink-0 text-[#0F8A5F]" />
          <span className="truncate">메인 지도로 보기</span>
        </Link>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-[#0F8A5F] px-2 text-[14px] font-extrabold text-white shadow-xs hover:bg-[#0c724e]"
        >
          <Navigation size={17} className="shrink-0" />
          <span className="truncate">네이버 길찾기</span>
        </a>
      </div>
    </section>
  );
}
