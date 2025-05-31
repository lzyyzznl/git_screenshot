const path = require("path");

module.exports = {
	mode: "development",
	entry: "./src/index.js", // 这个入口对Cypress组件测试不重要
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".jsx"],
		alias: {
			"@": path.resolve(__dirname, "."),
			"~": path.resolve(__dirname, "."),
		},
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				use: {
					loader: "ts-loader",
					options: {
						transpileOnly: true,
						configFile: "tsconfig.json",
						compilerOptions: {
							jsx: "react-jsx",
						},
					},
				},
			},
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: [
							[
								"@babel/preset-react",
								{
									runtime: "automatic",
								},
							],
						],
					},
				},
			},
			{
				test: /\.less$/,
				use: ["style-loader", "css-loader", "less-loader"],
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"],
			},
		],
	},
};
