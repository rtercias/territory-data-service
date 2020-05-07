module.exports = function (api) {
  api.cache(true);

  const presets = [
    [
      require.resolve("@babel/preset-env"),
      {
        "targets": {
          "node": "10"
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
