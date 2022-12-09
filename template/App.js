/* eslint-disable */
import React, {Component} from 'react';
import {
  BackHandler,
  StyleSheet,
  View,
  Platform,
  StatusBar,
  Image,
  SafeAreaView,
  Linking,
  AppState,
} from 'react-native';

import {WebView} from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import createInvoke from 'react-native-webview-invoke/native';
import {InAppBrowser} from 'react-native-inappbrowser-reborn';
import Geolocation from '@react-native-community/geolocation';
import RNBootSplash from 'react-native-bootsplash';
import {URL} from 'react-native-url-polyfill';

import * as AppConfig from './app.json'
import Biometry from './src/controllers/biometry'
import Utils from './src/controllers/utils'
import Onesignal from './src/controllers/onesignal'
import Permissions from './src/controllers/permissions'

Onesignal.setup()

/** Contacts */
import Contacts from './src/controllers/contacts'
const enableContacts = true;

/** IN-APP Purchase */
import IAP from './src/controllers/iap'
const enableIAP = true;


const USER_AGENT = "Mozilla/5.0 (X11; Linux i686) AppleWebKit/5322 (KHTML, like Gecko) Chrome/37.0.893.0 Mobile Safari/5322";

var urlData = new URL(AppConfig.appUrl);
const hostURL = urlData.origin;

if (AppConfig.fullscreen.withoutBar || AppConfig.fullscreen.withBar) {
  StatusBar.setTranslucent(true); //если нужно чтоб приложение на android было под status bar -> true
}

if (AppConfig.fullscreen.withoutBar) {
  StatusBar.setHidden(true);
}

if (AppConfig.fullscreen.withBar) {
  StatusBar.setHidden(false);
  StatusBar.setBackgroundColor('#FFFFFF00');
}

const INJECTED_JAVASCRIPT = `(function() {
  const meta = document.createElement('meta'); meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'); meta.setAttribute('name', 'viewport'); document.getElementsByTagName('head')[0].appendChild(meta);
})();`;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      iapEnabled: enableIAP === true, // set TRUE if need in-app purchases
      contactsEnabled: enableContacts === true, //set TRUE if need native contacts
      isConnected: true,
      isAvailable: null,
      watchID: null,
      firstLoad: true,
      bgColor: '#FFF',
      appState: AppState.currentState,
      currentURL: AppConfig.appUrl,
      canGoBack: false
    };
  }

  componentDidMount() {
    if (this.state.iapEnabled) {
      IAP.connect()
    }

    Linking.addEventListener('url', ({url}) => {
      if (this.webview) {
        this.webview.injectJavaScript(
          `window.location.href = "${url.replace(
            AppConfig.appSchema,
            'https://',
          )}"`,
        );
      }
    });

    this.appStateChecker = AppState.addEventListener('change', newState => {
      if (
        this.state.appState.match(/inactive|background/) &&
        newState === 'active'
      ) {
        this.triggerEvent('loaded_from_background');
      }

      this.setState({
        appState: newState,
      });
    });

    BackHandler.addEventListener('hardwareBackPress', this.backAction);

    this.invoke.define('biometrycScan', Biometry.launchScanner);
    this.invoke.define('stopScaner', Biometry.stopScanner);
    this.invoke.define('scannerType', Biometry.getBiometryType);

    this.invoke.define('vibration', Utils.vibration);
    this.invoke.define('share', Utils.share);
    this.invoke.define('getDeviceOS', Utils.getDeviceOS);
    this.invoke.define('alertWord', Utils.alert);

    this.invoke.define('oneSignalGetId', Onesignal.getId);
    this.invoke.define('showPrompt', Onesignal.showPrompt);
  
    this.invoke.define('startLocationTracking', this.startLocationTracking);
    this.invoke.define('stopLocationTracking', this.stopLocationTracking);
    this.invoke.define('setStatusBarColor', this.setStatusBarColor);


    this.invoke.define('getPermissionsUser', Permissions.requestPermission);

    if (this.state.contactsEnabled) {
      this.invoke.define('getContacts', Contacts.getContacts);
    }

    if (this.state.iapEnabled) {
      this.invoke.define('requestPurchase', IAP.requestPurchase);
      this.invoke.define('restorePurchase', IAP.restore);
      this.invoke.define('findPurchase', IAP.findPurchase);
    }

    NetInfo.addEventListener(state => {
      this.setState({
        isConnected: state.isConnected,
      });
      this.render();
    });
  }

  componentWillUnmount() {
    if (this.state.iapEnabled) {
      IAP.disconnect()
    }
    this.appStateChecker.remove();
  }

  /** Status Bar Settings */
  setStatusBarColor = (
    color = '#000000',
    animated = true,
    barStyle = 'default',
    barAnimated = true,
  ) => {
    /** Возвможные стили бара 'default', 'dark-content', 'light-content' */
    //console.log(barStyle);
    StatusBar.setBarStyle(barStyle, barAnimated);
    //StatusBar.setNetworkActivityIndicatorVisible();
    if (Platform.OS !== 'ios') {
      //ios не поддерживает изменения цвета

      if (color === undefined || color === null) {
        color = '#ffffff';
      }

      if (animated === undefined || animated === null) {
        animated = true;
      }

      StatusBar.setBackgroundColor(color, animated);
    } else if (color !== '#000000' && color !== null && color !== undefined) {
      this.setState({
        bgColor: color,
      });
    }
  };

  /** Status Bar Settings End */

  /** Geodata Settings */
  geoSuccess = position => {
    this.publishState('current_position', {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });

    this.publishState('speed', position.coords.speed); // Скорость движения
    this.publishState('heading', position.coords.heading); // Направление
    this.publishState('altitude', position.coords.altitude); // Высота
  };

  geoError = error => {
    this.publishState('current_position', "");
    //Alert.alert('Geo Error:', `${JSON.stringify(error)}`);
    /** Нужно придумать что-то для вывода ошибок, а то бесит через алёрты это делать
     * Может быть тригерить евент "Ошибка" и в стэйт передавать инфо о ошибке.
     */
  };

  startLocationTracking = (
    hightAccuracy = true,
    distance = 5,
    maximumAge = 30,
  ) => {
    /** Перестраховка значений по умолчнанию */
    if (hightAccuracy === null || hightAccuracy === undefined) {
      hightAccuracy = true;
    }
    if (distance === null || distance === undefined) {
      distance = 5;
    }
    if (maximumAge === null || maximumAge === undefined) {
      maximumAge = 30;
    }

    Geolocation.getCurrentPosition(this.geoSuccess, this.geoError, {
      enableHighAccuracy: hightAccuracy, // Если true - GPS, иначе WIFI
    });
    /** watchID это уникальный ID геосессии, по нему можно прекратить геосессию */
    let watchID = Geolocation.watchPosition(this.geoSuccess, this.geoError, {
      enableHighAccuracy: hightAccuracy, // Если true - GPS, иначе WIFI
      distanceFilter: distance, //Дистанция после изменения которой снова можно запрашивать геолокация ( вроде в метрах )
      maximumAge: maximumAge, //Время жизни кэша позиции в миллисекундах
    });

    this.setState({
      watchID: watchID,
    });
  };

  stopLocationTracking = () => {
    if (this.state.watchID !== null) {
      Geolocation.clearWatch(this.state.watchID); //Работает как очистка interval
    }

    this.setState({
      watchID: null,
    });
  };

  /** End geodata settings */


  backAction = e => {
    if ( this.webview && this.state.canGoBack ) this.webview.goBack();
    this.triggerEvent('back_button');
    return true;
  };

  invoke = createInvoke(() => this.webview);

  /** Извлекаем прямо из бабла функции, тут же можно прописать загрузку файлов в bubble */
  canUploadFile = this.invoke.bind('canUploadFile');
  uploadFile = this.invoke.bind('uploadFile');


  getBubbleFun = (functionName) => {
    return this.invoke.bind(functionName)
  }

  publishState = (...args) => {
    const fun = this.getBubbleFun('publishState')
    if (typeof fun === 'function') fun(...args)
  }

  triggerEvent = (...args) => {
    const fun = this.getBubbleFun('triggerEvent')
    if (typeof fun === 'function') fun(...args)
  }

  checkInitialUrl = () => {
    Linking.getInitialURL().then(url => {
      if (url) {
        this.webview.injectJavaScript(
          `window.location.href = "${url.replace(
            AppConfig.appSchema,
            'https://',
          )}"`,
        );
      }
    });
  }

  hideBootsplash = () => {
    if (!this.state.firstLoad) return

    RNBootSplash.hide();
    this.setState({
      firstLoad: false,
    });
  }

  loadEndFunction = () => {
    this.hideBootsplash()
    /** Функции для выполнения при полной загрузке страницы в WebView. Скорее всего RN Loader будет отключаться отсюда */
    if (Platform.OS !== 'ios') Permissions.requestAllPermissions()

    this.checkInitialUrl()

    this.publishState('platform_os', Platform.OS); //Возвращаем операционку
  };

  onContentProcessDidTerminate = () => this.webview.reload();

  handleWebViewNavigationStateChange = navState => {
    const {url} = navState;
    this.setState({
      canGoBack: navState.canGoBack
    });
    if (!url) return;

    if (
      url.indexOf(hostURL) === -1 &&
      url.indexOf(AppConfig.appSchema) === -1 &&
      url.indexOf('auth') === -1
    ) {
      this.webview.stopLoading();
      InAppBrowser.isAvailable().then(available => {
        if (available) {
          InAppBrowser.open(url, {
            modalPresentationStyle: 'fullScreen',
          });
        } else {
          Linking.canOpenURL(url).then(canOpen => {
            if (canOpen) Linking.openURL(url);
          });
        }
      });
    } else {
      this.setState({
        currentURL: url,
      });
    }
  };

  render() {
    if (this.state.isConnected) {
      if (AppConfig.fullscreen.withoutBar || AppConfig.fullscreen.withBar) {
        return (
          <View
            style={{
              ...styles.safeareastyle,
              backgroundColor: this.state.bgColor,
            }}>
            <WebView
              useWebKit
              injectedJavaScript={INJECTED_JAVASCRIPT}
              ref={ref => (this.webview = ref)}
              onContentProcessDidTerminate={this.onContentProcessDidTerminate}
              onNavigationStateChange={this.handleWebViewNavigationStateChange}
              decelerationRate={'normal'}
              onMessage={this.invoke.listener}
              allowsBackForwardNavigationGestures={true}
              allowsInlineMediaPlayback={true}
              startInLoadingState={true}
              sharedCookiesEnabled={true}
              userAgent={USER_AGENT}
              renderLoading={() => {
                return (
                  <View
                    style={{
                      backgroundColor: AppConfig.bootSplashSettings.color, //Bootsplash color
                      height: '100%',
                      width: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Image
                      style={{
                        width: AppConfig.bootSplashSettings.size,
                        height: AppConfig.bootSplashSettings.size,
                      }}
                      source={require('./sources/boot.png')} //Bootsplash image
                    />
                  </View>
                );
              }}
              source={{
                uri: AppConfig.appUrl,
              }}
              onLoadEnd={this.loadEndFunction}
            />
          </View>
        );
      } else {
        return (
          <SafeAreaView
            style={{
              ...styles.safeareastyle,
              backgroundColor: this.state.bgColor,
            }}>
            <WebView
              useWebKit
              injectedJavaScript={INJECTED_JAVASCRIPT}
              ref={ref => (this.webview = ref)}
              onContentProcessDidTerminate={this.onContentProcessDidTerminate}
              onNavigationStateChange={this.handleWebViewNavigationStateChange}
              decelerationRate={'normal'}
              onMessage={this.invoke.listener}
              allowsBackForwardNavigationGestures={true}
              allowsInlineMediaPlayback={true}
              startInLoadingState={true}
              sharedCookiesEnabled={true}
              userAgent={USER_AGENT}
              renderLoading={() => {
                return (
                  <View
                    style={{
                      backgroundColor: AppConfig.bootSplashSettings.color, //Bootsplash color
                      height: '100%',
                      width: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Image
                      style={{
                        width: AppConfig.bootSplashSettings.size,
                        height: AppConfig.bootSplashSettings.size,
                      }}
                      source={require('./sources/boot.png')} //Bootsplash image
                    />
                  </View>
                );
              }}
              source={{
                uri: AppConfig.appUrl,
              }}
              onLoadEnd={this.loadEndFunction}
            />
          </SafeAreaView>
        );
      }
    } else {
      if (AppConfig.fullscreen.withoutBar || AppConfig.fullscreen.withBar) {
        return (
          <View style={styles.containerNoInternet}>
            <Image
              source={require('./sources/no_internet.png')}
              style={styles.imagestyle}
              onLoadEnd={this.firstLoadEnd()}
            />
          </View>
        );
      } else {
        this.setStatusBarColor();
        return (
          <SafeAreaView style={styles.containerNoInternet}>
            <Image
              source={require('./sources/no_internet.png')}
              style={styles.imagestyle}
              onLoadEnd={this.firstLoadEnd()}
            />
          </SafeAreaView>
        );
      }
    }
  }
}

const styles = StyleSheet.create({
  safeareastyle: {
    flex: 1,
  },
  imagestyle: {
    resizeMode: 'contain',
    width: '100%',
  },
});

export default App;
