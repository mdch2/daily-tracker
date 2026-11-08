const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const escapedRoot = path
  .resolve(__dirname)
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  // Local previews, exports and native build artifacts are not application source.
  new RegExp(`${escapedRoot}[/\\\\](?:\\.tmp|dist)[/\\\\]`),
  /[/\\](?:\.cxx|\.gradle)[/\\]/,
  /[/\\]android[/\\](?:app[/\\])?build[/\\]/,
];
module.exports = config;
