module.exports = function (api) {
  api.cache(true);

  console.log('__dirname', __dirname);

  const presets = [
    [
      "@babel/preset-env",
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
