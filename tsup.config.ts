import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/api/index.ts"],
	format: ["cjs"],
	clean: true,
	splitting: true,
	dts: true,
	platform: "node",
	target: "node18",
});
