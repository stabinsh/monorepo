import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";
const globals = {
  ethers: "ethers",
  lodash: "_",
  "@counterfactual/node-poc": "node",
  "socket.io-client": "io"
};

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      sourcemap: true,
      globals: globals,
    },
    {
      file: pkg.module,
      format: "es",
      sourcemap: true,
      globals: globals,
    },
    {
      file: pkg.iife,
      name: "cf",
      format: "iife",
      sourcemap: true,
      globals: globals
    }
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {})
  ],
  plugins: [
    typescript({
      typescript: require("typescript")
    }),
  ]
};
