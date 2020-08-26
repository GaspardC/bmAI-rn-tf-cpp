// 1. detect tennis ball
// 2. ellipse
// 3. skeletton
// 4. full tf
// chose photo: chose another photo or reset

import React, {useState, useEffect, useRef} from 'react';
import {Div, Image, Text, Button} from 'react-native-magnus';
import {logError} from '../utils';
import {isEmpty} from 'lodash';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  NativeModules,
  ActivityIndicator,
} from 'react-native';


import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

import {
  base64ImageToTensor,
  tensorToImageUrl_thomas,
  draw_ellipse_full_tf,
  resizeImage,
  EllipseType,
  build_features_full_tf,
  loadModel,
} from '../utils/tf_utils';
import {Tensor4D} from '@tensorflow/tfjs';
import {DivRow} from '../components/layout';
import PhotoPicker from '../components/photoPicker';
import {RESIZE_HEIGHT} from '../components/photoPicker/index';
import TextInstruction from '../components/text/instruction';

let model;
let modelFinal;

const loadModelFinal = async () => {
  const modelJson = require('../assets/post_openpose/standing/model.json');
  const modelWeights = require('../assets/post_openpose/standing/group1-shard1of1.bin');
  modelFinal = await loadModel({modelJson, modelWeights});
  return modelFinal;
};

const {HelloWorld: CppDetectTennisBall} = NativeModules;

const Home = () => {
  const photoPickerRef = useRef({}) as {current: any};

  const [tennisBallRes, setTennisBallRes] = useState<{
    res?: EllipseType;
    loading?: boolean;
    error?: string;
  }>({res: {}, loading: false, error: ''});
  const [isTfReady, setTfReady] = useState(false);
  const [resTf, setResTf] = useState<{
    loading?: boolean;
    error?: string;
    uri?: string;
    tensor4D?: tf.Tensor4D;
  }>({loading: false, error: '', uri: '', tensor4D: null});
  const [ellipseTf, setEllipseTf] = useState<{
    loading?: boolean;
    error?: string;
    uri?: string;
    ballMask?: tf.Tensor2D;
  }>({loading: false, error: '', uri: '', ballMask: null});

  const [resFullTf, setResFullTf] = useState<{
    loading?: boolean;
    error?: string;
    res?: string;
    features?: any;
  }>({loading: false, error: '', res: '', features: null});

  const [resFinal, setResFinal] = useState<{
    loading?: boolean;
    error?: string;
    res?: string;
  }>({loading: false, error: '', res: ''});

  async function loadOpenPoseModel() {
    const modelJson = require('../assets/model/frozen/model.json');
    const modelWeights = require('../assets/model/frozen/group1-shard1of1.bin');
    model = await loadModel({modelJson, modelWeights});

    setTfReady(true);
    return model;
  }

  const processTFImg = async (uri: string) => {
    try {
      setResTf({loading: true});
      if (!isTfReady || !model) {
        await loadOpenPoseModel();
      }

      const {uri: resizedUri, base64} = await resizeImage(uri, RESIZE_HEIGHT);

      const inputMat = await base64ImageToTensor(base64);
      const startTime = Date.now();
      const res = model.predict(inputMat) as Tensor4D;

      // console.log(`inference done elapsed time${Date.now() - startTime}`);

      // const imageUrl = await tensorToImageUrl(res);
      // const startTimeTfCode = Date.now();

      const imageUrl = await tensorToImageUrl_thomas(res);
      // console.log(`tfcode ${Date.now() - startTimeTfCode}`);
      setResTf((prev) => ({
        ...prev,
        uri: `data:image/jpeg;base64,${imageUrl}`,
        tensor4D: res,
      }));
      // console.log(`imageUrl ${imageUrl}`);
    } catch (err) {
      setResTf((prev) => ({...prev, error: err ?? 'error model'}));
      console.log('erreur model !');
      console.log(err);
    } finally {
      setResTf((prev) => ({...prev, loading: false}));
      tf.disposeVariables();
    }
  };

  const processCppImg = (uriBoth) => {
    setTennisBallRes({loading: true});
    return new Promise((resolve, reject) => {
      CppDetectTennisBall.sayHello(uriBoth)
        .then(async (res) => {
          const resJSON = JSON.parse(res);
          // if (isIos()) {
          //     // resObj.resUri = resObj?.resUri?.replace('file://', '')
          //     // resObj.resSource = uriBoth;
          //     const resUri = await getFileUri(resObj.resUri);
          //     resObj.resUri = resUri
          // }
          const resObj: EllipseType = {};
          Object.entries(resJSON).forEach(([key, value]: [string, string]) => {
            if (key === 'sU') return;
            resObj[key] = parseFloat(value);
          });
          console.log('res parsed', resObj);
          //@ts-ignore
          resObj.sU = JSON.parse(resJSON.sU);
          if (resObj.x_mean === -1) {
            //@ts-ignore
            alert('no ellipse found');
          }
          setTennisBallRes((prev) => ({...prev, loading: false, res: resObj}));
          resolve(resObj);
        })
        .catch((e) => {
          console.log(e);
          setTennisBallRes((prev) => ({...prev, loading: false, error: e}));
          reject(e);
        });
    });
  };

  const getEllipse = async () => {
    // const ellipseParams = { x_c: 125, y_c: 305, a: 6, b: 5, U: [[0.10865521189821306, 0.994079496281537], [0.9940794962815371, -0.10865521189821307]] }
    // const ellipseBase64 = await draw_ellipse_full_tf({ ellipseParams, resolution: [326, 244] });
    try {
      if (tennisBallRes.res?.a === -1) {
        return;
      }
      const ellipseParams = tennisBallRes.res;
      setEllipseTf((prev) => ({...prev, loading: true}));
      const {base64: ellipseBase64, ballMask} = await draw_ellipse_full_tf({
        ellipseParams,
        resolution: [
          photoPickerRef.current.imageSource.height,
          photoPickerRef.current.imageSource.width,
        ],
      });
      setEllipseTf((prev) => ({
        ...prev,
        uri: `data:image/jpeg;base64,${ellipseBase64}`,
        ballMask,
      }));
    } catch (e) {
      setEllipseTf((prev) => ({...prev, error: e}));
    } finally {
      setEllipseTf((prev) => ({...prev, loading: false}));
    }
  };

  const run = async () => {
    if (isrunning()) {
      //@ts-ignore
      return alert('algorithm running wait before re-running it');
    }
    resetToDefault({resetImage: false});
    if (!isTfReady) {
      await loadOpenPoseModel();
    }
    console.log('pickerref', photoPickerRef.current);
    const image = await photoPickerRef.current.getImageSource(
      photoPickerRef.current.imageSource,
    );
    const img2log = {...image};
    delete img2log['base64'];
    console.log('run on image', img2log);
    await processCppImg(image.uri);
  };

  useEffect(() => {
    loadOpenPoseModel().then(() => {
      loadModelFinal();
    });
  }, []);

  useEffect(() => {
    if (isEmpty(tennisBallRes.res)) return;
    getEllipse();
  }, [tennisBallRes.res]);

  useEffect(() => {
    if (isEmpty(tennisBallRes.res)) return;
    photoPickerRef.current
      .getImageSource(photoPickerRef.current.imageSource)
      .then(({uri}) => {
        processTFImg(uri);
      });
  }, [tennisBallRes.res]);

  useEffect(() => {
    if (!resTf.tensor4D || !ellipseTf.ballMask) return;
    setResFullTf({loading: true});
    build_features_full_tf(resTf.tensor4D, ellipseTf.ballMask)
      .then((features) => {
        setResFullTf({
          loading: false,
          res: 'features computed ✅',
          features: features,
        });
      })
      .catch((e) => {
        console.log(e);
        setResFullTf({
          loading: false,
          res: 'features NOT computed',
          features: null,
        });
      });
  }, [resTf.tensor4D, ellipseTf.ballMask]);

  useEffect(() => {
    if (!resFullTf.features) return;
    const res = model.predict(resFullTf.features) as Tensor4D;
    res.print()


  }, [resFullTf]);

  const resetToDefault = ({resetImage = true}: {resetImage?: boolean}) => {
    if (resetImage)
      photoPickerRef.current
        .getImageSource()
        .then((res) => photoPickerRef.current.setImageSource(res))
        .catch((e) => console.log(e));
    setEllipseTf({loading: false, error: '', uri: '', ballMask: null});
    setResTf({loading: false, error: '', uri: '', tensor4D: null});
    setTennisBallRes({res: {}, loading: false, error: ''});
    setResFullTf({loading: false, res: '', error: ''});
  };

  const isrunning = () =>
    ellipseTf.loading || resTf.loading || tennisBallRes.loading;

  return (
    <ScrollView style={styles.scrollView}>
      <SafeAreaView>
        <Div p={'lg'}>
          <Div>
            <TextInstruction>1. Chose a photo :</TextInstruction>
            {/* <DrawerButton /> */}

            <PhotoPicker ref={photoPickerRef} {...{resetToDefault}} />
            <TextInstruction>2. run the algorithm:</TextInstruction>

            <DivRow justifyContent="space-around">
              <Button
                {...{onPress: run, underlayColor: 'green500'}}
                bg="white"
                borderWidth={1}
                borderColor="green500"
                color="green500">
                run
              </Button>
            </DivRow>
            <TextInstruction>3. Tennis ball detection</TextInstruction>
            <DivRow>
              {tennisBallRes.loading && <ActivityIndicator />}
              {!tennisBallRes.loading && tennisBallRes.res?.a !== -1 && (
                <>
                  {!isEmpty(tennisBallRes.error) && (
                    <Text>{logError(tennisBallRes.error)}</Text>
                  )}
                  {!isEmpty(tennisBallRes.res) && (
                    <Text>{JSON.stringify(tennisBallRes.res)}</Text>
                  )}
                </>
              )}
              {tennisBallRes.res?.a === -1 && <Text>No tennis ball found</Text>}
            </DivRow>
            <TextInstruction>4. Ellipse mask tennis ball</TextInstruction>
            <DivRow>
              {ellipseTf.loading && <ActivityIndicator />}
              {!ellipseTf.loading && tennisBallRes.res?.a !== -1 && (
                <>
                  {!isEmpty(ellipseTf.error) && (
                    <Text>{logError(ellipseTf.error)}</Text>
                  )}
                  {!isEmpty(ellipseTf.uri) && (
                    <Image
                      {...{source: {uri: ellipseTf.uri}, resizeMode: 'contain'}}
                      h={200}
                      w={200}
                    />
                  )}
                </>
              )}
              {tennisBallRes.res?.a === -1 && <Text>No tennis ball found</Text>}
            </DivRow>
            <TextInstruction>5. Skeletton</TextInstruction>
            <DivRow>
              {resTf.loading && <ActivityIndicator />}
              {!resTf.loading && (
                <>
                  {!isEmpty(resTf.error) && (
                    <Text>{logError(resTf.error)}</Text>
                  )}
                  {!isEmpty(resTf.uri) && (
                    <Image
                      {...{source: {uri: resTf.uri}, resizeMode: 'contain'}}
                      h={200}
                      w={200}
                    />
                  )}
                </>
              )}
            </DivRow>
            <TextInstruction>6. Full features tensorflow</TextInstruction>
            <DivRow>
              {resFullTf.loading && <ActivityIndicator />}
              {!resFullTf.loading && (
                <>
                  {!isEmpty(resFullTf.error) && (
                    <Text>{logError(resFullTf.error)}</Text>
                  )}
                  {!isEmpty(resFullTf.res) && (
                    <Text>{logError(resFullTf.res)}</Text>
                  )}
                </>
              )}
            </DivRow>
            <TextInstruction>7. Final model prediction</TextInstruction>
          </Div>
        </Div>
      </SafeAreaView>
    </ScrollView>
  );
};
export default Home;

const styles = StyleSheet.create({
  scrollView: {flex: 1},
});
