import { ImageResponse } from "next/og";

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
          backgroundColor: "#0A0A0F",
          backgroundImage: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "999px",
            backgroundColor: "#0A0A0F",
            border: "6px solid #A78BFA",
          }}
        />
      </div>
    ),
    size,
  );
}
