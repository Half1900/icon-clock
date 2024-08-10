import {
    filePrefs,
    configs,
    timeZones
} from './constants.js';
let prefs = {};
chrome.runtime.onInstalled.addListener(handlerInitializer);
chrome.runtime.onStartup.addListener(handlerInitializer);
chrome.runtime.onMessage.addListener(handlerOnMessage);

(function eachScriptStartup() {
    handlerInitializer();
})();
async function handlerInitializer() {
    const popupDebug = false;
    await initPrefs();
    if (popupDebug) chrome.runtime.sendMessage({
        sender: "serviceworker.js",
        action: "popupDebug",
        append: false
    });
    await manageOffscreenDoc();
    await initAlarm();
    await updateTime();
}

async function handlerOnMessage(message, sender, onResponse) {
    let commandRecognized = false;
    if ((message.sender === "offscreen.js") && (message.action === "tick")) {
        commandRecognized = true;
    }

    if (message.action === "settingsPlease") {
        commandRecognized = true;
        onResponse({
            sender: "serviceworker.js",
            action: "newPrefs",
            prefs: prefs
        });
    }

    if ((message.sender === "offscreen.js") && (message.action === "newTimeData")) {
        commandRecognized = true;
        updateIcon(message.imageData);
    }


    if ((message.sender === "popup.js") && (message.action === "userUpdate")) {
        commandRecognized = true;
        prefs[message.pref] = message.value;
        await updateStoredPrefs();
        await updateTime();
    }

    if ((message.sender === "offscreen.js") && (message.action === "systemDarkChanged")) {
        commandRecognized = true;
        prefs[message.pref] = message.value;
        await updateStoredPrefs();
        await updateTime();
    }

}
async function initPrefs() {
    const localDebug = false;
    const popupDebug = false;
    prefs = filePrefs;
    const result = await chrome.storage.local.get(["prefs"]);
    const storedPrefs = result.prefs;
    let storedPrefsNeedUpdating = false;
    if (storedPrefs === undefined) {
        storedPrefsNeedUpdating = true;
        prefs = filePrefs;
        if (popupDebug) chrome.runtime.sendMessage({
            sender: "serviceworker.js",
            action: "popupDebug",
            append: false
        });
    } else {
        if ((typeof storedPrefs.rev === "undefined") || (storedPrefs.rev < filePrefs.rev)) {
            storedPrefsNeedUpdating = true;
            prefs = filePrefs;
            if (popupDebug) chrome.runtime.sendMessage({
                sender: "serviceworker.js",
                action: "popupDebug",
                append: false
            });
        }

        else {
            //DEBUG:
            if (typeof storedPrefs.debug !== "boolean") {
                storedPrefsNeedUpdating = true;
                prefs.debug = filePrefs.debug;
            } else {
                prefs.debug = storedPrefs.debug;
            }
            //FONT CHOICE:
            if (typeof storedPrefs.whichFont !== "string" || !configs.selectableFonts.includes(storedPrefs.whichFont)) {
                storedPrefsNeedUpdating = true;
                prefs.whichFont = "Anybody";
            } else {
                prefs.whichFont = storedPrefs.whichFont;
            }
            //24HR TIME:
            if (typeof storedPrefs.use24hrTime !== "boolean") {
                storedPrefsNeedUpdating = true;
                prefs.use24hrTime = filePrefs.use24hrTime;
            } else {
                prefs.use24hrTime = storedPrefs.use24hrTime;
            }
            //USE BACKGROUND:
            if (typeof storedPrefs.useBackground !== "boolean") {
                storedPrefsNeedUpdating = true;
                prefs.useBackground = filePrefs.useBackground;
            } else {
                prefs.useBackground = storedPrefs.useBackground;
            }

            if ((typeof storedPrefs.forceDarkMode !== "boolean") || (typeof storedPrefs.followSystemDark !== "boolean")) {
                prefs.forceDarkMode = filePrefs.forceDarkMode;
                prefs.followSystemDark = !prefs.forceDarkMode;
                storedPrefsNeedUpdating = true;
            } else {
                prefs.forceDarkMode = storedPrefs.forceDarkMode;
                if (prefs.forceDarkMode === storedPrefs.followSystemDark) {
                    prefs.followSystemDark = !prefs.forceDarkMode;
                    storedPrefsNeedUpdating = true;
                }
            }
            if (typeof storedPrefs.timeZone !== "string" || !Object.values(timeZones).includes(storedPrefs.timeZone)) {
                prefs.timeZone = filePrefs.timeZone;
                storedPrefsNeedUpdating = true;
            } else {
                prefs.timeZone = storedPrefs.timeZone;
            }
            //ANALOG:
            if (typeof storedPrefs.faceType !== "string" || !["analog", "digital"].includes(storedPrefs.faceType)) {
                prefs.faceType = filePrefs.faceType;
                storedPrefsNeedUpdating = true;
            } else {
                prefs.faceType = storedPrefs.faceType;
            }
        }
    }
    if (storedPrefsNeedUpdating === true) {
        await updateStoredPrefs();
    }
}
async function initAlarm() {
    const alarmRunning = await chrome.alarms.get("every30sec");
    if (!alarmRunning) {
        chrome.alarms.create("every30sec", {
            periodInMinutes: 0.5
        });
    }
    return alarmRunning;
}
let creating;
async function manageOffscreenDoc() {
    const offscreenUrl = chrome.runtime.getURL("offscreen.html");
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
        documentUrls: [offscreenUrl]
    });
    if (existingContexts.length > 0) {
        return;
    }
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: "offscreen.html",
            reasons: ["DOM_PARSER"],
            justification: "To periodically generate action icon for a toolbar clock extension using custom font, without a content script.",
        });
        await creating;
        creating = null;
    }
}
async function updateStoredPrefs() {
    await chrome.storage.local.set({
        prefs: prefs
    });
    chrome.runtime.sendMessage({
        sender: "serviceWorker.js",
        action: "newPrefs",
        prefs: prefs
    });
}
async function updateIcon(receivedData) {
    const reconstructedImageData = new ImageData(new Uint8ClampedArray(receivedData.data), receivedData.width, receivedData.height);
    chrome.action.setIcon({
        imageData: reconstructedImageData
    });
}


async function updateTime() {
    await manageOffscreenDoc();
    const response = await chrome.runtime.sendMessage({
        sender: "serviceworker.js",
        action: "timePlease",
        prefs: prefs
    });
    if (chrome.runtime.lastError) {
        return;
    }
    if (response && response.action === "newTimeData" && response.imageData && response.tooltip) {
        updateIcon(response.imageData);
    }
}

function updateBadgeTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const timeString = `${hours}${minutes}`;
    chrome.action.setBadgeText({
        text: timeString
    });
    chrome.action.setBadgeBackgroundColor({
        color: "#BB33FF"
    })
}
 
updateBadgeTime();// 初始设置时间 
setInterval(updateBadgeTime, 100);// 每秒更新一次时间