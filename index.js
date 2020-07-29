/**
 * @format
 */

import React from 'react';
import {AppRegistry} from 'react-native';
import {ThemeProvider} from 'react-native-magnus';
import App from './src/App';
import Home from './src/home';

// import App from './src/App';
import {initSentry} from './src/utils';

import {name as appName} from './app.json';
initSentry();

export default function Main() {
  return (
    <ThemeProvider>
      <Home />
    </ThemeProvider>
  );
}
AppRegistry.registerComponent(appName, () => Main);
