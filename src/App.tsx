import React, { useEffect, useState } from 'react';
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
  PermissionsAndroid,
} from 'react-native';
import ImagePicker from 'react-native-image-picker';

import { Colors } from 'react-native/Libraries/NewAppScreen';

import '@tensorflow/tfjs-react-native';

import { isIos } from './utils/index';
import { downloadAssetSource } from './utils/uriHelper';
const imgTest = require('./assets/images/ball2.jpg');

const { HelloWorld } = NativeModules;

const App = () => {
  const [resTennisBallOnTest, setResTennisBallOnTest] = useState<any>('');
  const [imageDisplayed, setImageDisplayed] = useState<any>('')


  useEffect(() => {
    // console.log(Permissions);
    if (!isIos) requestReadWiteAndroidPermission();
  }, []);

  const processCppImg = (uriBoth) => {
    HelloWorld.sayHello(uriBoth)
      .then(async (res) => {
        console.log('res', res);
        const resObj = JSON.parse(res);
        setResTennisBallOnTest(resObj);
      })
      .catch((e) => {
        console.log(e);
        setResTennisBallOnTest({ error: "a problem occured during the detection" });
      });
  };

  const requestReadWiteAndroidPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'permission',
          message: 'Need access to external storage',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('You can the permission');
      } else {
        console.log('You dont have the permission');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const openPicker = () => {
    const options = { noData: true };
    ImagePicker.showImagePicker(options, (response) => {
      console.log('Response = ', response);

      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.customButton) {
        console.log('User tapped custom button: ', response.customButton);
      } else {
        const source = {
          uri: response.uri,
          uriBoth: isIos() ? response.uri : 'file://' + response.path,
        };

        // You can also display the image using data:
        // const source = { uri: 'data:image/jpeg;base64,' + response.data };
        console.log(source);
        setImageDisplayed({ uri: source.uri });
        processCppImg(source.uriBoth);
      }
    });
  };

  const runOnTheTestPhoto = async () => {
    const img = Image.resolveAssetSource(imgTest);
    const uriBoth = img.uri;
    console.log('img', img);
    let sourceFile = await downloadAssetSource(uriBoth);
    sourceFile = `file://${sourceFile}`
    console.log('sourceFile', sourceFile);
    setResTennisBallOnTest('')
    processCppImg(sourceFile);
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>bmAI Poc app</Text>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={runOnTheTestPhoto}>
              <Text>Run on the test photo</Text>
            </TouchableOpacity>
            <Image source={imageDisplayed !== '' ? imageDisplayed : imgTest} style={styles.imageTest} />
            {resTennisBallOnTest !== '' && <Text>{`Tennis ball detected :
            ${JSON.stringify(resTennisBallOnTest, null, 2)}`}</Text>}
            <TouchableOpacity
              style={styles.button}
              onPress={openPicker}>
              <Text>Run on another photo</Text>
            </TouchableOpacity>
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
  button: {
    height: 50,
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'black',
    marginVertical: 5,
    borderRadius: 5
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  imageTest: {
    width: 200, height: 200, marginVertical: 10
  },
  body: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center'
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