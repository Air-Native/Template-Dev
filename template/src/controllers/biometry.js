/* eslint-disable */
import FingerprintScanner from 'react-native-fingerprint-scanner';
import { Alert, Platform } from 'react-native';

const isAvailable = async () => {
  try {
    return await FingerprintScanner.isSensorAvailable();
  } catch (err) {
    throw new Error('Sensor is not available');
  }
};

const getBiometryType = async () => {
  try {
    return await FingerprintScanner.isSensorAvailable();
  } catch (error) {
    return '';
  }
};

const launchScanner = async (question) => {
  try {
    await isAvailable();

    const params = {};
    if (Platform.OS === 'ios') {
      params.description = question;
    }
    if (Platform.OS === 'android') {
      params.title = question;
    }

    await FingerprintScanner.authenticate(params);

    return true;
  } catch (err) {
    Alert.alert('Biometry Authentication', err.message);
    return false;
  }
};

const stopScanner = async () => {
  try {
    FingerprintScanner.release();
  } catch (e) {}
};

const Biometry = { launchScanner, stopScanner, getBiometryType };

export default Biometry;
