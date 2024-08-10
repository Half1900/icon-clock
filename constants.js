export const fontTesting = false;
export const iconDIP = 17;
export const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
export const configs = {
	tickIntervalMs: 500,
	tooltipType: "dynamic-static",
	staticTooltip: "",
	digitalTxtColor: "black",
	digitalBgColor: "white",
	digitalStrokeText: false,
	digitalPadZeros: true,
	selectableFonts: ["Anybody", "Imagine", "Georama"],
};

export const filePrefs = {
	rev: 100,
	debug: false,
	whichFont: configs.selectableFonts[2],
	use24hrTime: false,
	useBackground: false,
	forceDarkMode: false,
	followSystemDark: false,
	prefersDarkMode: false,
	timeZone: "",
	faceType: "digital",
};

export const fontLibrary = {
	Anybody: {
		url: "fonts/Anybody-VariableFont_wdth,wght.woff2",
		weight: 700,
		stretch: "extra-expanded",
		size: 9.5,
		xOffset: 0.5,
		yOffsetHrs: 1,
		yOffsetMins: 1,
		spacing: 0,
		swapZeros: false
	},
	Georama: {
		url: "fonts/Georama-VariableFont_wdth,wght.woff2",
		weight: 700,
		stretch: "expanded",
		size: 10,
		xOffset: 0.5,
		yOffsetHrs: -0.5,
		yOffsetMins: -1,
		spacing: 0.5,
		swapZeros: false
	},
	Imagine: {
		url: "fonts/ImagineFont.woff2",
		weight: 700,
		stretch: "normal",
		size: 13,
		xOffset: 0.35,
		yOffsetHrs: -1,
		yOffsetMins: 0,
		spacing: 0.75,
		swapZeros: false
	},
};


export const timeZones = {
	"Local/system time": "",
	"Asia/Shanghai": "Asia/Shanghai"
}
