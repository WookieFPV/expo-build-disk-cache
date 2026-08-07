import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs"],
	clean: true,
	splitting: true,
	dts: false,
	platform: "node",
	target: "node18",
});
