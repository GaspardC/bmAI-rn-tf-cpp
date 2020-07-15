/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
// import App from './src/App';
import {initSentry} from './src/utils';

import {name as appName} from './app.json';
initSentry();
AppRegistry.registerComponent(appName, () => App);
