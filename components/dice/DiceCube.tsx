"use client";

type Shade = "a" | "b" | undefined;

interface DiceCubeProps {
  index: 0 | 1;
  value: number;
  isJumping: boolean;
  transform: string;
}

/** Per-dice face shading from our-site (lighting contrast on alternating faces). */
const SHADED_FACES: Record<0 | 1, Partial<Record<number, Shade>>> = {
  0: { 2: "b", 4: "a" },
  1: { 3: "a", 5: "b" },
};

function DiceFace({ side, shade }: { side: number; shade?: Shade }) {
  const shadeClass =
    shade === "a" ? "bd-dice__face--shade-a" : shade === "b" ? "bd-dice__face--shade-b" : "";

  return (
    <div data-side={side} className={`bd-dice__face ${shadeClass}`.trim()}>
      {Array.from({ length: side }, (_, i) => (
        <div key={i} className="bd-dice__dot" />
      ))}
    </div>
  );
}

export default function DiceCube({ index, value, isJumping, transform }: DiceCubeProps) {
  const shades = SHADED_FACES[index];

  return (
    <div
      className={`bd-dice__wrapper${isJumping ? " bd-dice__wrapper--jumping" : ""}`}
      data-testid="dice"
      data-value={value}
      aria-hidden
    >
      <div className="bd-dice__tilt">
        <div className="bd-dice__cube" style={{ transform }}>
          {[1, 2, 3, 4, 5, 6].map((side) => (
            <DiceFace key={side} side={side} shade={shades[side]} />
          ))}
          <div className="bd-dice__face bd-dice__inner bd-dice__inner--x" />
          <div className="bd-dice__face bd-dice__inner bd-dice__inner--y" />
          <div className="bd-dice__face bd-dice__inner bd-dice__inner--z" />
        </div>
      </div>
    </div>
  );
}
