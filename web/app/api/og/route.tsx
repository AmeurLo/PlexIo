import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#ffffff",
          padding: "80px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Background gradient top-right */}
        <div style={{
          position: "absolute", top: -100, right: -100,
          width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(63,175,134,0.14) 0%, transparent 65%)",
        }} />
        {/* Background gradient bottom-left */}
        <div style={{
          position: "absolute", bottom: -80, left: -80,
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30,122,110,0.10) 0%, transparent 65%)",
        }} />

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, #1E7A6E, #3FAF86)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ color: "white", fontSize: 28, fontWeight: 900 }}>D</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1c1c1c", letterSpacing: "-0.03em" }}>
            Domely
          </div>
        </div>

        {/* Headline */}
        <div style={{
          fontSize: 72, fontWeight: 900,
          color: "#1c1c1c", letterSpacing: "-0.03em",
          lineHeight: 1.0, marginBottom: 24,
        }}>
          Maximize your rental income.
        </div>
        <div style={{
          fontSize: 72, fontWeight: 900,
          background: "linear-gradient(135deg, #1E7A6E, #3FAF86)",
          backgroundClip: "text",
          color: "transparent",
          letterSpacing: "-0.03em",
          lineHeight: 1.0, marginBottom: 40,
        }}>
          Zero hassle.
        </div>

        {/* Sub */}
        <div style={{
          fontSize: 24, color: "#6d6d6d",
          lineHeight: 1.5, maxWidth: 700, marginBottom: 56,
        }}>
          Rent collection, AI advisor, auto compliance. Built for North American landlords.
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 48 }}>
          {[
            { v: "14 days", l: "Free trial, no card" },
            { v: "$0", l: "Hidden fees" },
            { v: "500h+", l: "Given back to landlords" },
            { v: "< 10 min", l: "To get started" },
          ].map((s) => (
            <div key={s.l} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{
                fontSize: 28, fontWeight: 800,
                background: "linear-gradient(135deg, #1E7A6E, #3FAF86)",
                backgroundClip: "text", color: "transparent",
              }}>{s.v}</div>
              <div style={{ fontSize: 14, color: "#6d6d6d" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
