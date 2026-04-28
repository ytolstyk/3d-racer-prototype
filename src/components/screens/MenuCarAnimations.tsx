import { useState, useEffect, useRef } from "react";

interface CarInstance {
  id: number;
  direction: "ltr" | "rtl";
  top: number;
  duration: number;
  color: string;
  scale: number;
}

const COLORS = [
  "#e84040",
  "#ff6b6b",
  "#ff9f43", // reds / oranges
  "#ffd23f",
  "#f9ca24", // yellows
  "#4d96ff",
  "#48dbfb",
  "#0abde3", // blues / cyan
  "#4ecb71",
  "#1dd1a1",
  "#a3cb38", // greens
  "#c97bff",
  "#ff6b9d",
  "#ff9ff3", // purples / pinks
  "#ffffff",
  "#eeeeee", // white / light grey
];
let _nextId = 0;

function CarSvg({ car, onDone }: { car: CarInstance; onDone: () => void }) {
  const w = Math.round(56 * car.scale);
  const h = Math.round(28 * car.scale);
  return (
    <div
      style={{
        position: "absolute",
        top: `${car.top}%`,
        left: 0,
        animation: `${car.direction === "ltr" ? "menuCarLtr" : "menuCarRtl"} ${car.duration}s linear forwards`,
        willChange: "transform",
      }}
      onAnimationEnd={onDone}
    >
      <svg
        viewBox="0 0 56 28"
        width={w}
        height={h}
        style={{
          display: "block",
          transform: car.direction === "rtl" ? "scaleX(-1)" : undefined,
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.65))",
        }}
      >
        {/* Body */}
        <rect x="2" y="8" width="52" height="12" rx="4" fill={car.color} />
        {/* Roof */}
        <rect
          x="14"
          y="4"
          width="24"
          height="14"
          rx="4"
          fill={car.color}
          opacity="0.82"
        />
        {/* Windshield */}
        <rect
          x="16"
          y="5"
          width="20"
          height="7"
          rx="3"
          fill="rgba(180,220,255,0.5)"
        />
        {/* Wheels */}
        <rect x="4" y="4" width="8" height="5" rx="2" fill="#1a1a1a" />
        <rect x="4" y="19" width="8" height="5" rx="2" fill="#1a1a1a" />
        <rect x="44" y="4" width="8" height="5" rx="2" fill="#1a1a1a" />
        <rect x="44" y="19" width="8" height="5" rx="2" fill="#1a1a1a" />
        {/* Headlights */}
        <rect
          x="51"
          y="10"
          width="3"
          height="3"
          rx="1"
          fill="rgba(255,255,180,0.95)"
        />
        <rect
          x="51"
          y="15"
          width="3"
          height="3"
          rx="1"
          fill="rgba(255,255,180,0.95)"
        />
        {/* Center stripe */}
        <rect
          x="14"
          y="13"
          width="28"
          height="2"
          rx="1"
          fill="rgba(255,255,255,0.18)"
        />
      </svg>
    </div>
  );
}

export function MenuCarAnimations() {
  const [cars, setCars] = useState<CarInstance[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleNext = () => {
      const delay = 1000 + Math.random() * 1000; // 4.5–12 s between spawns
      timerRef.current = setTimeout(() => {
        setCars((prev) => [
          ...prev,
          {
            id: _nextId++,
            direction: Math.random() < 0.5 ? "ltr" : "rtl",
            top: 12 + Math.random() * 72,
            duration: 1.0 + Math.random() * 1.5,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            scale: 0.5 + Math.random() * 2.4,
          },
        ]);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const remove = (id: number) =>
    setCars((prev) => prev.filter((c) => c.id !== id));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {cars.map((car) => (
        <CarSvg key={car.id} car={car} onDone={() => remove(car.id)} />
      ))}
    </div>
  );
}
