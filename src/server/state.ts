/** A single component instance in the editor. `props` shape depends on `type`. */
export interface ComponentInstance {
  id: string;
  type: string;
  name: string;
  props: Record<string, unknown>;
}

export interface EditorState {
  components: ComponentInstance[];
}

/** The seeded default — keeps `state.json` populated on first run. */
export const SEED_STATE: EditorState = {
  components: [
    {
      id: "seed-banner",
      type: "banner",
      name: "Profile Banner",
      props: {
        name: "Owen Jerusalem",
        subtitle: "IT STUDENT | BUKSU",
        avatarUrl: "https://github.com/Wenoxxxxxx.png?size=200",
        primary: "#1b5def",
        subtitleColor: "#9CA3AF",
        nameColor: "#111827",
        badgeText: "Hello World!",
      },
    },
  ],
};
