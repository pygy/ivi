const path = require("path");
const webpack = require("webpack");

module.exports = {
  mode: "production",
  entry: "./src/index.ts",
  output: {
    library: "s",
    libraryTarget: "umd",
    filename: "ivi-svg.js",
    path: path.resolve(__dirname, "dist/unpkg"),
  },
  devtool: "source-map",
  optimization: {
    minimize: false,
  },
  externals: {
    "ivi-core": "iviCore",
    "ivi": "ivi",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre"
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.build.module.json",
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "DEBUG": "true",
      "TARGET": JSON.stringify("browser"),
    }),
  ],
  resolve: {
    extensions: [".ts", ".js"],
  },
};