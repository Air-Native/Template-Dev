/* eslint-disable */
import { Vibration, StatusBar, Platform, Alert } from "react-native";
import Share from 'react-native-share';

const strToInt = (str) => {
    if (!str) return 1
    if (typeof str === 'string') return parseInt(str, 10);
    return str;
};

const vibration = (durationInSeconds) => {
    const duration = strToInt(durationInSeconds) * 1000
    Vibration.vibrate(duration)
};

const share = async (options) => {
    try {
        await Share.open(options)
    } catch (err) {
        console.log(err)
    }
};

const getDeviceOS = () => {
    return Platform.OS
}

const alert = (title, text) => {
    Alert.alert(title, text)
}

export default {
    vibration,
    share,
    getDeviceOS,
    alert,
};