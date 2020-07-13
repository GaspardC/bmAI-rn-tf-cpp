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
  Switch
} from 'react-native';
import ImagePicker from 'react-native-image-picker';

import { Colors } from 'react-native/Libraries/NewAppScreen';
import { isIos } from './utils';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

import { downloadAssetSource } from './utils/uriHelper';
import { resizeImage, base64ImageToTensor, tensorToImageUrl_thomas } from './utils/tf_utils';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { Tensor4D } from '@tensorflow/tfjs';
const imgTest = require('./assets/images/ball2.jpg');

const { HelloWorld } = NativeModules;

const App = () => {
  const [resJSON, setResJSON] = useState<any>('');
  const [imageDisplayed, setImageDisplayed] = useState<any>('')

  async function waitForTensorFlowJs() {
    await tf.ready();
    setTfReady(true);
  }

  useEffect(() => {
    if (!isIos) requestReadWiteAndroidPermission();
  }, []);

  const processCppImg = (uriBoth) => {
    HelloWorld.sayHello(uriBoth)
      .then(async (res) => {
        console.log('res', res);
        const resObj = JSON.parse(res);
        setResJSON(resObj);
      })
      .catch((e) => {
        console.log(e);
        setResJSON({ error: "a problem occured during the detection" });
      });
  };

  const processTFImg = async (uri: string) => {
    try {
      if (!isTfReady) {
        //@ts-ignore
        alert('Tensorflow not ready yet');
        return waitForTensorFlowJs()
      }

      const modelJson = require('./src/assets/model/frozen/model.json');
      const modelWeights = require('./src/assets/model/frozen/group1-shard1of1.bin');

      const startTimeModel = Date.now();
      const model = await tf.loadGraphModel(
        bundleResourceIO(modelJson, modelWeights),
      );

      console.log(`loading model in ${Date.now() - startTimeModel}`);

      const { uri: resizedUri, base64 } = await resizeImage(uri, 368);

      const inputMat = await base64ImageToTensor(base64);
      const startTime = Date.now();
      const res = model.predict(inputMat) as Tensor4D;

      console.log(`inference done elapsed time${Date.now() - startTime}`);
      // alert(`inference done elapsed time${Date.now() - startTime}`);

      // const imageUrl = await tensorToImageUrl(res);
      const startTimeTfCode = Date.now();

      const imageUrl = await tensorToImageUrl_thomas(res);
      console.log(`tfcode ${Date.now() - startTimeTfCode}`);

      setImageDisplayed({ uri: imageUrl });
      console.log(`imageUrl ${imageUrl}`);
    } catch (err) {
      console.log('erreur model !');
      console.log(err);
    }
  }


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
        setResJSON('')
        isModeTf ? processTFImg(source.uriBoth) : processCppImg(source.uriBoth);
      }
    });
  };


  const runOnTheTestPhoto = async () => {
    const img = Image.resolveAssetSource(imgTest);
    const uriBoth = img.uri;
    console.log('img', img);
    let sourceFile = await downloadAssetSource(uriBoth) as string;
    sourceFile = `file://${sourceFile}`
    console.log('sourceFile', sourceFile);
    setImageDisplayed('');
    setResJSON('')
    isModeTf ? processTFImg(sourceFile) : processCppImg(sourceFile);
  }

  const [isModeTf, setModeTf] = useState(false)
  const [isTfReady, setTfReady] = useState(false);


  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{`bmAI Poc app detection on the : ${isModeTf ? 'skeletton' : 'tennis ball'}`}</Text>
            </View>
            <Switch
              style={{ margin: 10 }}
              trackColor={{ true: "#767577", false: "#81b0ff" }}
              thumbColor={!isModeTf ? "#f5dd4b" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={() => {
                setModeTf(!isModeTf); if (!isModeTf) waitForTensorFlowJs()
              }}
              value={isModeTf}
            />
            {isModeTf && <Text style={{ textAlign: 'center', margin: 10 }}>{`tensorflow is ${isTfReady ? 'ready !' : 'NOT ready'}`}</Text>}

            <TouchableOpacity
              style={styles.button}
              onPress={runOnTheTestPhoto}>
              <Text>Run on the test photo</Text>
            </TouchableOpacity>
            <Image resizeMode="contain" source={imageDisplayed !== '' ? imageDisplayed : imgTest} style={styles.imageTest} />
            {resJSON !== '' && <Text>{`Results :
            ${JSON.stringify(resJSON, null, 2)}`}
            </Text>}
            {resJSON !== '' && isIos() && <Image resizeMode="contain" source={{ uri: resJSON.resUri, width: 200, height: 200 }} style={styles.imageTest} />
            }
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
    textAlign: 'center',
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
