import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent directory must not
  // change how this project builds.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
