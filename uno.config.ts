import {
	defineConfig,
	presetWind3,
	presetIcons,
	presetTypography,
} from "unocss";

export default defineConfig({
	presets: [
		presetWind3(),
		presetIcons({
			scale: 1.2,
			warn: true,
		}),
		presetTypography(),
	],
	theme: {
		colors: {
			primary: {
				50: "#eff6ff",
				500: "#3b82f6",
				600: "#2563eb",
				700: "#1d4ed8",
			},
		},
	},
	shortcuts: {
		btn: "px-4 py-2 rounded bg-primary-500 text-white hover:bg-primary-600 cursor-pointer transition-colors",
		"btn-secondary":
			"px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors",
		input:
			"px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500",
		card: "bg-white border border-gray-200 rounded-lg shadow-sm p-4",
	},
	safelist: [
		"i-mdi-record",
		"i-mdi-stop",
		"i-mdi-pause",
		"i-mdi-play",
		"i-mdi-download",
		"i-mdi-pencil",
		"i-mdi-marker",
		"i-mdi-eraser",
	],
});
