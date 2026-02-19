import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {};
export default withNextIntl(withBundleAnalyzer(nextConfig));
