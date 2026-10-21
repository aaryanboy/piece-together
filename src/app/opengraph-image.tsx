import { ImageResponse } from "next/og";

export const alt = "Piece Together — multiplayer puzzle games";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 68,
          background: "linear-gradient(135deg, #0F1C2E 0%, #17283D 58%, #213A5C 100%)",
          color: "#F5EFE0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#F4B942", fontSize: 28, letterSpacing: 6 }}>
          <span style={{ width: 18, height: 18, borderRadius: 99, background: "#FF6B4A" }} />
          PLAY TOGETHER, ONLINE
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 78, fontWeight: 800, letterSpacing: -4 }}>Piece it together.</div>
          <div style={{ fontSize: 32, color: "#C1CBDA" }}>Three games. One room. Your whole crew.</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { color: "#FF6B4A", label: "JIGSAW" },
            { color: "#72C8A5", label: "SUDOKU" },
            { color: "#F4B942", label: "MINESWEEPER" },
          ].map(({ color, label }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 18px",
                border: "1px solid rgba(245,239,224,0.2)",
                borderRadius: 18,
                background: "rgba(15,28,46,0.55)",
                color: "#F5EFE0",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 99, background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
