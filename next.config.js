import createMDX from "@next/mdx";
import CopyPlugin from "copy-webpack-plugin";
import dotenv from "dotenv";

dotenv.config({ path: "./src/vault/.env.vault.catalog-comp" });

const withMDX = createMDX({
  //Markdown plugins go here
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  headers() {
    return Promise.resolve([
      {
        source: "/api/storage/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
    ]);
  },
  async redirects() {
    return [];
  },
  reactStrictMode: true,
  transpilePackages: ["next-auth"],
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  webpack: (config) => {
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: "./**/*",
            to: "../public/assets/",
            context: "./node_modules/@nucleus/assets",
          },
        ],
      }),
    );
    config.module.rules = [
      ...config.modulel.rules,
      {
        test: /\.csv$/,
        loader: "csv-loader",
        options: {
          dynamicTyping: true,
          header: true,
          skipEmptyLines: true,
        },
      },
      {
        test: /\.(xlsx)$/,
        use: {
          loader: "url-loader",
          options: {
            limit:100000,
          },
        },
      },
    ];
    config.snapshot = {
      ...config.snapshot,
      managedPaths: [],
    };
    config.watchOptions = {
      ...config.watchOptions,
      followSymlinks: true,
    };
    config.resolve = {
      ...config.resolve,
      symlinks: false,
    };

    return config;
  },
};


export default withMDX(nextConfig);