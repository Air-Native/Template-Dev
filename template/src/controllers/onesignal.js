/* eslint-disable */
import * as Config from '../../app.json'
import OneSignal from 'react-native-onesignal'

const setup = () => {
    if (Config.onesignal) OneSignal.setAppId(Config.onesignal);
}

const getId = async () => {
    var state = await OneSignal.getDeviceState();
    if (state.isSubscribed === false) {
      OneSignal.addTrigger('prompt_ios', 'true');
    }
    return state;
}

const showPrompt = getId

export default {
    setup,
    getId,
    showPrompt
}