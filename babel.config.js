module.exports = function (api) {
  api.cache(true);

  const presets = [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "6.10"
        }
      }
    ]
  ];
  const plugins = [];

  return {
    presets,
    plugins
  };
}
