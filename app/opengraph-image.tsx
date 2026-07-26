import { ImageResponse } from "next/og";

export const alt = "911 Turbo — a scroll-driven walkaround of the 996 Turbo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The share card. Drawn rather than shipped as a file, so it never goes stale. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#05060a",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* ruby corner bracket, same language as the site's HUD */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderLeft: "2px solid #d1155a",
              borderTop: "2px solid #d1155a",
            }}
          />
          <div
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 22,
              letterSpacing: 8,
            }}
          >
            996.1 TURBO · 2000
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#d1155a",
              fontSize: 26,
              letterSpacing: 12,
              marginBottom: 18,
            }}
          >
            PORSCHE
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 132,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -3,
            }}
          >
            911 Turbo
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 30,
              marginTop: 22,
            }}
          >
            Scroll and the camera walks around it.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            {["#9e0b3d", "#c8102e", "#b4b8bb", "#efd000", "#12151c"].map((c) => (
              <div
                key={c}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  background: c,
                }}
              />
            ))}
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRight: "2px solid #d1155a",
              borderBottom: "2px solid #d1155a",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
