import { ImageResponse } from "next/og";

// Auto-wired by Next into og:image AND twitter:image for every page that
// doesn't override it. 1200×630 is the standard social-share size.
export const alt = "Autókép — AI háttércsere autós fotókhoz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The default next/og font lacks Hungarian glyphs (ő, ű, …), which would render
// as tofu boxes. Load Inter so accents come out correctly; fall back silently
// to the built-in font if the fetch ever fails.
async function loadInter(): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        "https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap",
      )
    ).text();
    const url = css.match(/src: url\((.+?)\) format/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const inter = await loadInter();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
          color: "white",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 34, opacity: 0.9 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9999,
              background: "white",
              marginRight: 16,
            }}
          />
          autokep.com
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>
            AI háttércsere
          </div>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>
            autós fotókhoz
          </div>
          <div style={{ fontSize: 38, opacity: 0.9, marginTop: 28 }}>
            Profi autós fotók másodpercek alatt
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>Autókép</div>
      </div>
    ),
    {
      ...size,
      fonts: inter
        ? [{ name: "Inter", data: inter, weight: 700, style: "normal" }]
        : undefined,
    },
  );
}
