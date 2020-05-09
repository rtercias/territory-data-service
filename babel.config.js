module.exports = function (api) {
  api.cache(true);

  const presets = [
    [
      require.resolve("@babel/preset-env", __dirname + '/node_modules'),
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
