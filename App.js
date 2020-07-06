/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useState} from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  NativeModules,
} from 'react-native';
import ImagePicker from 'react-native-image-picker';

import {Header, Colors} from 'react-native/Libraries/NewAppScreen';
import {
  Asset,
  Constants,
  FileSystem,
  Permissions,
} from 'react-native-unimodules';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import {
  fetch,
  decodeJpeg,
  bundleResourceIO,
} from '@tensorflow/tfjs-react-native';
import {resizeImage, base64ImageToTensor} from './src/utils';

const {HelloWorld} = NativeModules;

const App = () => {
  const [resTennisBall, setResTennisBall] = useState('');
  const [imgPicked, setImagePicked] = useState('');

  const [isTfReady, setTfReady] = useState(false);
  const [imageRes, setImageRes] = useState(null);
  const [imageUri, setImageUri] = useState('');

  useEffect(() => {
    // console.log(Permissions);
  }, []);

  const processCppImg = (uri) => {
    HelloWorld.sayHello(uri)
      .then((res) => {
        console.log('res', res);
        setResTennisBall(JSON.parse(res));
      })
      .catch((e) => {
        console.log(e);
      });
  };

  const processImg = (uri) => {
    async function waitForTensorFlowJs() {
      await tf.ready();
      setTfReady(true);
    }
  };

  const openPicker = () => {
    const options = {noData: true};
    ImagePicker.showImagePicker(options, (response) => {
      console.log('Response = ', response);

      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.customButton) {
        console.log('User tapped custom button: ', response.customButton);
      } else {
        const source = {uri: response.uri};

        // You can also display the image using data:
        // const source = { uri: 'data:image/jpeg;base64,' + response.data };

        setImagePicked(response.uri);
        processCppImg(response.uri);
        // HelloWorld.sayHello(response.uri).then((res) => setHello(res));

        // async function waitForTensorFlowJs() {
        //   await tf.ready();
        //   setTfReady(true);
        // }
        setImageUri(response.uri);
        // waitForTensorFlowJs().then(() => processImg(response.uri));
      }
    });
  };
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <Header />
          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Step One</Text>
            </View>
            <TouchableOpacity onPress={() => openPicker()}>
              <Text>Take Photo</Text>
            </TouchableOpacity>
            {imgPicked != null && (
              <Image source={{uri: imgPicked, width: 200, height: 200}} />
            )}
            {resTennisBall?.resUri != null && (
              <Image
                resizeMode="contain"
                style={{marginTop: 10}}
                source={{uri: resTennisBall.resUri, width: 200, height: 200}}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});

export default App;
