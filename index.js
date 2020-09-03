/* eslint-disable prettier/prettier */
/**
 * @format
 */

import React, { useState } from 'react';
import 'react-native-gesture-handler';
import { AppRegistry, Image } from 'react-native';
import { ThemeProvider } from 'react-native-magnus';
import { initSentry } from './src/utils';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

const appName = require('./app.json')?.name;
import Home from './src/pages/home';
import CNNPage from './src/pages/cnn';
import { Button, Text, Icon } from 'react-native-magnus';
import useCachedResources from './src/hooks/useCachedResources';
initSentry();

const ROUTES = {
  HOME: 'OpenPose models',
  CNN: 'CNN models',
};
const Stack = createStackNavigator();

const SwitchButton = ({ navigation, route }) => {
  // const [isCnnPage, setIsCnnPage] = useState(true);
  const onPress = () => {
    console.log(route);

    navigation.reset({
      index: 0,
      routes: [{ name: route.name === ROUTES.HOME ? ROUTES.CNN : ROUTES.HOME }],
    });
    // setIsCnnPage(!isCnnPage)
  };

  return (
    <Button
      bg="blue100"
      h={40}
      w={40}
      ml={10}
      mb={10}
      rounded="circle"
      {...{ onPress }}>
      <Icon fontSize={'xl'} name="swap" color="blue400" />
    </Button>
  );
};

export default function Main() {
  const areFontsLoaded = useCachedResources();

  return (
    <ThemeProvider>
      <NavigationContainer>
        {!areFontsLoaded && (
          <Image
            resizeMode="contain"
            style={{ height: '100%', width: '100%' }}
            source={require('./src/assets/images/splash.png')}></Image>
        )}
        {areFontsLoaded && <NavigationContent />}
      </NavigationContainer>
    </ThemeProvider>
  );
}

const NavigationContent = () => {
  const optionsFunc = ({ navigation, route }) => ({
    headerLeft: () => SwitchButton({ navigation, route }),
  });
  return (
    <Stack.Navigator>
      <Stack.Screen
        name={ROUTES.CNN}
        component={CNNPage}
        options={optionsFunc}
      />
      <Stack.Screen name={ROUTES.HOME} component={Home} options={optionsFunc} />
    </Stack.Navigator>
  );
};
AppRegistry.registerComponent(appName, () => Main);
