/**
 * @format
 */

import React from 'react';
import {AppRegistry, Text} from 'react-native';
import {ThemeProvider} from 'react-native-magnus';
// import App from './src/App';
// import Menu, {DrawerButton} from './src/components/drawer';

// import App from './src/App';
import {initSentry} from './src/utils';

import {name as appName} from './app.json';
import Home from './src/pages/home';
import CNNPage from './src/pages/cnn';
initSentry();

export default function Main() {
  return (
    <ThemeProvider>
      {/* <Home /> */}
      <CNNPage />
      {/* <Menu /> */}
    </ThemeProvider>
  );
}
AppRegistry.registerComponent(appName, () => Main);
