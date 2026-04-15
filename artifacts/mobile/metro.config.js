const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Exclude Firebase temporary build directories that Metro tries to watch
// but may not exist, causing ENOENT errors.
const { blockList } = config.resolver;
const blockListArray = blockList
  ? Array.isArray(blockList)
    ? blockList
    : [blockList]
  : [];

config.resolver.blockList = [
  ...blockListArray,
  /.*_tmp_\d+.*/,
  /.*firebase.*_tmp.*/,
];

module.exports = config;
