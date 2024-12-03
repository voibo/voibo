import CopyFilePlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { Configuration } from "webpack";

const isDev = process.env.NODE_ENV === "development";

const common: Configuration = {
  mode: isDev ? "development" : "production",
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".json"],
    extensionAlias: {
      ".js": [".js", ".ts"],
      ".cjs": [".cjs", ".cts"],
      ".mjs": [".mjs", ".mts"],
      ".jsx": [".jsx", ".tsx"],
      ".cjsx": [".cjsx", ".ctsx"],
      ".mjsx": [".mjsx", ".mtsx"],
    },
  },
  output: {
    assetModuleFilename: "assets/[name][ext]",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: "ts-loader",
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
      {
        test: /\.(ico|png|jpeg|svg|eot|woff?2?)$/,
        type: "asset/resource",
      },
    ],
  },
  devtool: isDev ? "source-map" : undefined,
};

const main: Configuration = {
  ...common,
  target: "electron-main",
  entry: {
    main: "./src/main/main.ts",
  },
  output: {
    library: {
      type: "module",
    },
    libraryTarget: "module",
    chunkFormat: "module",
  },

  plugins: [
    new CopyFilePlugin({
      patterns: [
        {
          context: "./resources",
          from: "./entitlements.mac.plist",
          to: "./entitlements.mac.plist",
        },
        {
          context: "./resources",
          from: "./icon.png",
          to: "./icon.png",
        },
      ],
    }),
  ],
  externals: {
    "@protobufjs/inquire": "node-commonjs @protobufjs/inquire",
    "@voibo/desktop-audio-capture": "module @voibo/desktop-audio-capture",
  },
  experiments: {
    outputModule: true,
  },
};

const preload: Configuration = {
  ...common,
  target: "electron-preload",
  entry: {
    preload: "./src/preload/preload.ts",
  },
};

const renderer: Configuration = {
  ...common,
  target: "web",
  entry: {
    app: "./src/renderer/index.tsx",
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: "./src/renderer/index.html",
    }),
    new CopyFilePlugin({
      patterns: [
        {
          context: "./src/renderer",
          from: "./processor/*.js",
          to: "./[name][ext]",
        },
        {
          context: "./src/renderer",
          from: "./asset/*.{png,svg}",
          to: "./asset/[name][ext]",
        },

        // wasm file of VAD
        {
          from: "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
          to: "[name][ext]",
        },
        {
          from: "node_modules/@ricky0123/vad-web/dist/*.onnx",
          to: "[name][ext]",
        },
        { from: "node_modules/onnxruntime-web/dist/*.wasm", to: "[name][ext]" },
      ],
    }),
  ],
};

export default [main, preload, renderer];
