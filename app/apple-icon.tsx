import { ImageResponse } from "next/og";

/**
 * iOS / PWA home-screen icon — open book on brand background.
 * Location: app/apple-icon.tsx
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6b4f3a",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 112,
            height: 112,
          }}
        >
          {/* Open book mark-up via flex (ImageResponse-friendly) */}
          <div style={{ display: "flex", alignItems: "stretch", height: 88, gap: 0 }}>
            <div
              style={{
                width: 44,
                height: 88,
                background: "#f8f5f0",
                borderRadius: "6px 0 0 6px",
                boxShadow: "inset 0 0 0 2px rgba(90,64,48,0.12)",
              }}
            />
            <div
              style={{
                width: 6,
                height: 88,
                background: "#5a4030",
                marginLeft: -1,
                marginRight: -1,
              }}
            />
            <div
              style={{
                width: 44,
                height: 88,
                background: "#ebe3d9",
                borderRadius: "0 6px 6px 0",
                boxShadow: "inset 0 0 0 2px rgba(90,64,48,0.08)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
