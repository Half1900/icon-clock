import {
    configs,
    fontLibrary,
    iconDIP,
    DPR,
    fontTesting
} from './constants.js';
let prefs = {};
let fontSpecs = {};
let fontLoaded = false;
let prefsCurrent = false;
let currentFont;
let lastDarkMode;
let prefersDarkMode;
let hours;
let minutes;
let seconds;
let testHrs = 0;
let testMins = 0;
let testSecs = 0;
let canvas;
let context;
let tooltip = "uninitialized";
let lastTime = "";
let tickIntervalId = "";
chrome.runtime.onMessage.addListener(handlerOnMessage);
(async function eachScriptRun() {
    fontLoaded = false;
    currentFont = "";
    prefsCurrent = false;
    startUpTickInterval();
})();

function handlerOnMessage(message, sender, sendResponse) {

    const popupDebug = false;
    if (message.sender === "serviceworker.js") {
        //This is an improved way to do it:
        if (message.action === "newPrefs") {
            prefs = message.prefs;
            fontSpecs = fontLibrary[prefs.whichFont];
            prefsCurrent = true;
            if (popupDebug) chrome.runtime.sendMessage({
                sender: "offscreen.js",
                action: "popupDebug",
                append: false,
                debug: `offscreen.js: handlerOnMessage(): newPrefs: prefs.faceType: ${prefs.faceType}`
            }, () => {
                if (chrome.runtime.lastError) {};
            });
        }
        if (message.action === "timePlease") {
            //Get current values:
            if (message.prefs !== prefs) {
                prefs = message.prefs;
                //configs = message.configs;
                fontSpecs = fontLibrary[prefs.whichFont];
                prefsCurrent = true;
                if (popupDebug) chrome.runtime.sendMessage({
                    sender: "offscreen.js",
                    action: "popupDebug",
                    append: false,
                    debug: `offscreen.js: handlerOnMessage(): timePlease: prefs.faceType: ${prefs.faceType}`
                }, () => {
                    if (chrome.runtime.lastError) {}
                });
            } else {
                prefsCurrent = true;
            }
            (async () => {
                const imageData = await renderTime();
                sendResponse({
                    sender: "offscreen.js",
                    action: "newTimeData",
                    imageData: imageData,
                    tooltip: tooltip
                });
            })();
            return true;
        }
    }
}

function startUpTickInterval() {
    if (!tickIntervalId) {
        tickIntervalId = setInterval(handlerTickInterval, configs.tickIntervalMs);
    }
}

function handlerTickInterval() {
    let pinged = false;
    if (timeNeedsUpdating() || fontTesting) {
        (async () => {
            const imageData = await renderTime();
            chrome.runtime.sendMessage({
                sender: "offscreen.js",
                action: "newTimeData",
                imageData: imageData,
                tooltip: tooltip
            });
            pinged = true;
        })();
    }

    if (prefs.followSystemDark === true) {
        prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDarkMode !== lastDarkMode) {
            lastDarkMode = prefersDarkMode;
            chrome.runtime.sendMessage({
                sender: "offscreen.js",
                action: "systemDarkChanged",
                pref: "prefersDarkMode",
                value: prefersDarkMode
            });
            pinged = true;
        }
    }

    if (pinged === false) {
        chrome.runtime.sendMessage({
            sender: "offscreen.js",
            action: "tick"
        });
    }
}

function initCanvas() {
    if (!canvas) {
        canvas = new OffscreenCanvas(iconDIP * DPR, iconDIP * DPR);
        context = canvas.getContext("2d", {
            willReadFrequently: true
        });
        context.scale(DPR, DPR);
        context.textAlign = "center";
        context.textBaseline = "middle";
    }
}
async function updateFont() {
    if ((fontLoaded === false) || (currentFont !== prefs.whichFont)) {
        const fullFontUrl = await chrome.runtime.getURL(fontSpecs.url);
        const fontFile = new FontFace(prefs.whichFont, `url(${fullFontUrl})`, {
            weight: fontSpecs.weight
        });
        fontFile.stretch = fontSpecs.stretch;
        try {
            await fontFile.load();
        } catch (error) {
            return;
        }
        document.fonts.add(fontFile);
        context.font = `${fontSpecs.size}px ${prefs.whichFont}`;
        fontLoaded = true;
        currentFont = prefs.whichFont;
    }
}

function timeNeedsUpdating() {
    let returnValue = false;
    const now = new Date();
    now.setSeconds(0, 0);
    if (now !== lastTime) {
        lastTime = now;
        returnValue = now;
    }
    return returnValue;
}

function doPreferredFormat() {
    if (fontTesting) {
        //if (++testHrs > 23) testHrs = 0;
        //if (++testMins > 59) testMins = 0;
        //if(++testSecs > 59) seconds = 0;
        const now = new Date();
        hours = now.getHours().toString().padStart(2, '0');
        minutes = now.getMinutes().toString().padStart(2, '0');
        seconds = now.getSeconds().toString().padStart(2, '0');
        //hours = testHrs.toString().padStart(2, "0");
        //minutes = testMins.toString().padStart(2, "0");
        //seconds = testSecs.toString().padStart(2,"0");
    } else {
        const now = new Date();
        const formatterOptions = {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour12: false
        };
        if (prefs.timeZone) {
            formatterOptions.timeZone = prefs.timeZone;
        }
        const formatter = new Intl.DateTimeFormat("zh-CN", formatterOptions);
        const parts = formatter.formatToParts(now);
        let dayOfWeek;
        let year;
        let month;
        let day;
        let period;
        for (const part of parts) {
            switch (part.type) {
                case "hour":
                    hours = (part.value).padStart(2,"0");
                    break;
                case "minute":
                    minutes = (part.value).padStart(2,"0");
                    break;
                case "second":
                    seconds = (part.value).padStart(2,"0");
                    break;
                case "weekday":
                    dayOfWeek = part.value;
                    break;
                case "year":
                    year = part.value;
                    break;
                case "month":
                    month = (part.value).padStart(2,"0");
                    break;
                case "day":
                    day = (part.value).padStart(2,"0");
                    break;
            }
        }
        if (!prefs.use24hrTime) {
            const hourInt = Number.parseInt(hours, 10);
            period = hourInt < 12 ? "AM" : "PM";
            hours = ((hourInt % 12) || 12).toString();
        }
        tooltip = `本地时间 : ${hours}:${minutes} ${dayOfWeek} ${year} ${month} ${day}`;
        if (configs.digitalPadZeros === true) {
            hours = new Date().getHours().toString().padStart(2, '0');
        }
    }
}
//Master function to render the time icon image data:
async function renderTime() {
 /*   if (prefsCurrent === false) {
        await getPrefs();
    }*/
    doPreferredFormat();
    initCanvas();
    if (prefs.faceType !== "analog") await drawDigital();
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const serializableImageData = {
        width: imageData.width,
        height: imageData.height,
        data: Array.from(imageData.data)
    };
    return serializableImageData;
}
async function drawDigital() {
    let prefBgColor;
    let prefTxtColor;
    const now = new Date();
    hours = now.getHours().toString().padStart(2, "0");
    minutes = now.getMinutes().toString().padStart(2, "0");
    seconds = now.getSeconds().toString().padStart(2, "0");
    await updateFont();
    const centerX = (iconDIP / 2) + fontSpecs.xOffset;
    const centerYtop = (iconDIP / 4) + fontSpecs.yOffsetHrs;
    const centerYbottom = (iconDIP * 3 / 4) + fontSpecs.yOffsetMins;
    context.letterSpacing = `${fontSpecs.spacing}px`;
    if (fontSpecs.swapZeros === true) {
        hours = hours.replace(/0/g, "O");
        minutes = minutes.replace(/0/g, "O");
        seconds = seconds.replace(/0/g, "O");
    }
    //Force or follow system dark mode:
    if ((prefs.forceDarkMode === true) || (prefs.followSystemDark === true && prefersDarkMode === true)) {
        prefBgColor = configs.digitalTxtColor;
        prefTxtColor = configs.digitalBgColor;
    }
    //Light mode:
    else {
        prefBgColor = configs.digitalBgColor;
        prefTxtColor = configs.digitalTxtColor;
    }
    //Use can request background fill:
    if (prefs.useBackground === true) {
        context.fillStyle = prefBgColor;
        context.fillRect(0, 0, iconDIP, iconDIP);
    } else {
        context.clearRect(0, 0, iconDIP, iconDIP);
    }
    //Optional stroke text:
    if (configs.digitalStrokeText === true) {
        context.strokeStyle = prefBgColor;
        context.lineWidth = 3;
        context.strokeText(seconds, centerX, centerYtop);
        //context.strokeText(minutes, centerX, centerYbottom);
    }
    //Draw top text:
    context.fillStyle = prefTxtColor;
    context.fillText(seconds, centerX, centerYtop);
    //context.fillText(minutes, centerX, centerYbottom);
}