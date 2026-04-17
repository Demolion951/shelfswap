import { ImageResponse } from "next/og";

/**
 * iOS / PWA home-screen icon — ShelfSwap monogram on brand background.
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
            width: 120,
            height: 120,
            borderRadius: 28,
            background: "rgba(248,245,240,0.08)",
            boxShadow: "inset 0 0 0 2px rgba(248,245,240,0.12)",
          }}
        >
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: -4,
              color: "#f8f5f0",
              fontFamily:
                "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
              lineHeight: 1,
            }}
          >
            SS
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
