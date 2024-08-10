import {
    configs
} from './constants.js';
let prefs = {};
let prefsCurrent = false;
chrome.runtime.onMessage.addListener(handlerOnMessage);
(async function eachPopup() {
    const response = await chrome.runtime.sendMessage({
        sender: "popup.js",
        action: "settingsPlease"
    });
    if (response.sender === "serviceworker.js" && response.action === "newPrefs") {
        const manifest = chrome.runtime.getManifest();
        prefs = response.prefs;
        document.getElementById("checkboxUseBackground").checked = prefs.useBackground;
        document.getElementById("checkboxForceDarkMode").checked = prefs.forceDarkMode;
        document.getElementById("checkboxFollowSystemDark").checked = prefs.followSystemDark;
        const {
            selectableFonts
        } = configs;
        selectableFonts.forEach((fontName, index) => {
            const inputId = `radioFont${index}`;
            const input = document.getElementById(inputId);
            const label = document.querySelector(`label[for="${inputId}"]`);
            if (input && label) {
                input.value = fontName;
                label.textContent = fontName;
                label.className = `label font ${fontName}`;
            }
        });
        document.querySelector(`input[value=${prefs.whichFont}]`).checked = true;
        if (prefs.faceType !== "analog") {
            document.getElementById("radioFaceDigital").checked = true;
            document.getElementById("fontContainer").classList.remove("disabled");
        }
        document.getElementById("checkboxUseBackground").checked = prefs.useBackground;
        document.getElementById("checkboxForceDarkMode").checked = prefs.forceDarkMode;
        document.getElementById("checkboxFollowSystemDark").checked = prefs.followSystemDark;
    }
    document.getElementById("checkboxUseBackground").addEventListener("change", handlerUpdateSettingsFromUser);
    document.getElementById("checkboxForceDarkMode").addEventListener("change", handlerUpdateSettingsFromUser);
    document.getElementById("checkboxFollowSystemDark").addEventListener("change", handlerUpdateSettingsFromUser);
    document.getElementById("fontContainer").addEventListener("change", handlerUpdateSettingsFromUser);
    document.getElementById("faceContainer").addEventListener("change", handlerUpdateSettingsFromUser);
})();

function handlerUpdateSettingsFromUser(event) {
    switch (event.target.name) {
        case "useBackground":
            chrome.runtime.sendMessage({
                sender: "popup.js",
                action: "userUpdate",
                pref: "useBackground",
                value: event.target.checked
            });
            break;
        case "forceDarkMode":
            chrome.runtime.sendMessage({
                sender: "popup.js",
                action: "userUpdate",
                pref: "forceDarkMode",
                value: event.target.checked
            });
            if ((document.getElementById("checkboxFollowSystemDark").checked === true) && (event.target.checked === true)) {
                document.getElementById("checkboxFollowSystemDark").checked = false;
                chrome.runtime.sendMessage({
                    sender: "popup.js",
                    action: "userUpdate",
                    pref: "followSystemDark",
                    value: !event.target.checked
                });
            }
            break;
        case "followSystemDark":
            chrome.runtime.sendMessage({
                sender: "popup.js",
                action: "userUpdate",
                pref: "followSystemDark",
                value: event.target.checked
            });
            if ((document.getElementById("checkboxForceDarkMode").checked === true) && (event.target.checked === true)) {
                document.getElementById("checkboxForceDarkMode").checked = false;
                chrome.runtime.sendMessage({
                    sender: "popup.js",
                    action: "userUpdate",
                    pref: "forceDarkMode",
                    value: !event.target.checked
                });
            }
            break;
        case "whichFont":
            prefs[event.target.name] = event.target.value;
            chrome.runtime.sendMessage({
                sender: "popup.js",
                action: "userUpdate",
                pref: event.target.name,
                value: event.target.value
            });
            break;
        case "faceType":
            if (event.target.value !== "analog") {
                document.getElementById("fontContainer").classList.remove("disabled");
                document.getElementById("optionUseBackground").classList.remove("disabled");
                chrome.runtime.sendMessage({
                    sender: "popup.js",
                    action: "userUpdate",
                    pref: event.target.name,
                    value: event.target.value
                });
            }
            break;
        default:
            ;
    }
}

function handlerOnMessage(message, sender, sendResponse) {
    if (message.sender === "serviceworker.js") {
        if (message.action === "newPrefs") {
            prefs = message.prefs;
            prefsCurrent = true;
        }
    }
}