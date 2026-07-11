export interface BannerProps {
  name: string;
  subtitle: string;
  avatarUrl: string;
  primary?: string;
  /** Subtitle text color. */
  subtitleColor?: string;
  /** Title text color. */
  nameColor?: string;
  /** Badge text under the subtitle; hidden when empty. */
  badgeText?: string;
}

export function Banner({
  name,
  subtitle,
  avatarUrl,
  primary = "#1b5def",
  subtitleColor = "#9CA3AF",
  nameColor = "#111827",
  badgeText = "Hello World!",
}: BannerProps) {
  return (
    <div
      style={{
        display: "flex",
        width: "1500px",
        height: "300px",
        position: "relative",
      }}
    >
      {/* outline border, inset from the edges */}
      <div
        style={{
          position: "absolute",
          left: 16,
          top: 16,
          right: 16,
          bottom: 16,
          border: `2px solid ${primary}`,
        }}
      />

      {/* accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 80,
          width: 8,
          height: 140,
          background: primary,
        }}
      />

      {/* avatar frame */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 80,
          top: 75,
          width: 140,
          height: 140,
          background: "#f8fafc",
          border: "4px solid white",
        }}
      >
        <img
          src={avatarUrl}
          width={140}
          height={140}
          style={{ objectFit: "cover" }}
        />
      </div>

      {/* text block */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "absolute",
          left: 270,
          top: 60,
          height: "140px",
        }}
      >
        <span
          style={{
            fontFamily: "Poppins",
            fontWeight: 500,
            fontSize: 56,
            color: nameColor,
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontFamily: "Poppins",
            fontWeight: 400,
            fontSize: 20,
            color: subtitleColor,
            letterSpacing: 1,
          }}
        >
          {subtitle}
        </span>

        {/* badge, below the subtitle — only when there's text for it */}
        {badgeText ? (
          <div
            style={{
              display: "flex",
              marginTop: 10,
              marginBottom: -20,
              paddingLeft: 20,
              paddingTop: 5,
              paddingBottom: 8,
              border: `2px solid ${primary}`,
              color: primary,
              fontFamily: "JetBrains Mono",
              fontWeight: 500,
              fontSize: 15,
              width: 140,
            }}
          >
            {badgeText}
          </div>
        ) : null}
      </div>
    </div>
  );
}
