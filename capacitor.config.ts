import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ci.untrtci.mobile",
  appName: "UNTRTCI",
  webDir: "dist",
  android: { allowMixedContent: false },
};

export default config;
