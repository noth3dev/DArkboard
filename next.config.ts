import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable React Strict Mode to fix Ctrl+Z (Undo) issues with Yjs collaboration
  // Strict Mode causes double-mounting which breaks undo history in collaborative editors
  reactStrictMode: false,
};

export default nextConfig;
