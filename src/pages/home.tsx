import React, { useState, useEffect, useRef } from 'react';
import { Div, Image, Text, Button } from 'react-native-magnus';
import { logError, timeoutifyPromise } from '../utils';
import { isEmpty } from 'lodash';
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
import { Tensor4D } from '@tensorflow/tfjs';
import { DivRow } from '../components/layout';
import PhotoPicker from '../components/photoPicker';
import { RESIZE_HEIGHT } from '../components/photoPicker/index';
import TextInstruction from '../components/text/instruction';
import { isDev } from '../utils/index';
import MySelect, { INIT_CHILD_MODE, STANDING_KID, LYING_KID } from '../components/select/index';

let model;
let modelFinal;

const MEAN_VALUES = {
  [STANDING_KID]: {
    kg: 87.8125,
    cm: 12.0987654321
  },
  [LYING_KID]: {
    kg: 7.6612903226,
    cm: 70.350877193
  }
}



const { HelloWorld: CppDetectTennisBall } = NativeModules;

const Home = () => {
  const photoPickerRef = useRef({}) as { current: any };

  const [modelType, setModelType] = useState(INIT_CHILD_MODE)

  const [tennisBallRes, setTennisBallRes] = useState<{
    res?: EllipseType;
    loading?: boolean;
    error?: string;
  }>({ res: {}, loading: false, error: '' });
  const [isTfReady, setTfReady] = useState(false);
  const [resTf, setResTf] = useState<{
    loading?: boolean;
    error?: string;
    uri?: string;
    tensor4D?: tf.Tensor4D;
  }>({ loading: false, error: '', uri: '', tensor4D: null });
  const [ellipseTf, setEllipseTf] = useState<{
    loading?: boolean;
    error?: string;
    uri?: string;
    ballMask?: tf.Tensor2D;
  }>({ loading: false, error: '', uri: '', ballMask: null });

  const [resFullTf, setResFullTf] = useState<{
    loading?: boolean;
    error?: string;
    res?: string;
    features?: any;
  }>({ loading: false, error: '', res: '', features: null });

  const [resFinal, setResFinal] = useState<{
    loading?: boolean;
    error?: string;
    res?: { height: number, weight: number };
  }>({ loading: false, error: '', res: null });


  const loadModelFinal = async (standing = (modelType === STANDING_KID)) => {
    try {
      console.log(`loading model final kids ${standing ? 'standing' : 'lying'}`)
      const modelJson = standing ? require('../assets/models/openpose/post_openpose/standing/model.json') : require('../assets/models/openpose/post_openpose/lying/model.json');
      const modelWeights = standing ? require('../assets/models/openpose/post_openpose/standing/group1-shard1of1.bin') : require('../assets/models/openpose/post_openpose/lying/group1-shard1of1.bin');
      modelFinal = await loadModel({ modelJson, modelWeights, loadLayer: false });
      // console.log('modelFinal', modelFinal)
    } catch (e) {
      console.log('err loadig model final', e)
    }
    return modelFinal;
  };

  async function loadOpenPoseModel() {
    console.log('loading open pose model')
    const modelJson = require('../assets/models/openpose/frozen/model.json');
    const modelWeights = require('../assets/models/openpose/frozen/group1-shard1of1.bin');

    setTfReady(true);
    model = await loadModel({ modelJson, modelWeights, loadLayer: true });
    return model;
  }

  const processTFImg = async (uri: string) => {
    try {
      setResTf({ loading: true });
      if (!model) {
        await loadOpenPoseModel();
      }

      const { uri: resizedUri, base64 } = await resizeImage(uri, RESIZE_HEIGHT);

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
      setResTf((prev) => ({ ...prev, error: err ?? 'error model' }));
      console.log('erreur model !');
      console.log(err);
      cleanTF({ reloadModel: false });
    } finally {
      setResTf((prev) => ({ ...prev, loading: false }));
    }
  };

  const processCppImg = (uriBoth) => {

    setTennisBallRes({ loading: true });
    return timeoutifyPromise(() => new Promise((resolve, reject) => {
      CppDetectTennisBall.sayHello(uriBoth)
        .then(async (res) => {
          const resJSON = JSON.parse(res);
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
          setTennisBallRes((prev) => ({ ...prev, loading: false, res: resObj }));
          resolve(resObj);
        })
        .catch((e) => {
          console.log(e);
          setTennisBallRes((prev) => ({ ...prev, loading: false, error: e }));
          reject(e);
        });
    }), 30);
  };

  const getEllipse = async () => {
    // const ellipseParams = { x_c: 125, y_c: 305, a: 6, b: 5, U: [[0.10865521189821306, 0.994079496281537], [0.9940794962815371, -0.10865521189821307]] }
    // const ellipseBase64 = await draw_ellipse_full_tf({ ellipseParams, resolution: [326, 244] });
    try {
      if (tennisBallRes.res?.a === -1) {
        return;
      }
      const ellipseParams = tennisBallRes.res;
      setEllipseTf((prev) => ({ ...prev, loading: true }));
      const { base64: ellipseBase64, ballMask } = await draw_ellipse_full_tf({
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
      setEllipseTf((prev) => ({ ...prev, error: e }));
    } finally {
      setEllipseTf((prev) => ({ ...prev, loading: false }));
    }
  };

  const run = async () => {
    initState()

    if (isRunning()) {
      //@ts-ignore
      return alert('algorithm running wait before re-running it');
    }
    initState()
    await tf.ready()
    // if (!isTfReady) {
    //   timeoutifyPromise(await loadOpenPoseModel, 30);
    // }
    // console.log('pickerref', photoPickerRef.current);
    const image = await photoPickerRef.current.getImageSource(
      photoPickerRef.current.imageSource,
    );
    const img2log = { ...image };
    delete img2log['base64'];
    console.log('run on image', img2log);
    timeoutifyPromise(async () => await processCppImg(image.uri));
  };

  useEffect(() => {
    console.log('mounting')
    initState()
    cleanTF({ reloadModel: false })
    return () => {
      cleanTF({ reloadModel: false })
    }
  }, []);

  useEffect(() => {
    if (isEmpty(tennisBallRes.res)) return;
    getEllipse();
  }, [tennisBallRes.res]);

  useEffect(() => {
    if (isEmpty(tennisBallRes.res)) return;
    photoPickerRef.current
      .getImageSource(photoPickerRef.current.imageSource)
      .then(({ uri }) => {
        processTFImg(uri);
      });
  }, [tennisBallRes.res]);

  useEffect(() => {
    if (!resTf.tensor4D || !ellipseTf.ballMask) return;
    setResFullTf({ loading: true });
    build_features_full_tf(resTf.tensor4D, ellipseTf.ballMask)
      .then((features) => {
        setResFullTf({
          loading: false,
          res: 'features computed ✔',
          features: features,
        });
      })
      .catch((e) => {
        console.log(e);
        setResFullTf({
          loading: false,
          res: 'features not computed ✕',
          features: null,
        });
      });
  }, [resTf.tensor4D, ellipseTf.ballMask]);

  useEffect(() => {
    if (!resFullTf.features) return;
    setResFinal({ loading: true })
    timeoutifyPromise(() => (async () => {
      try {
        if (!modelFinal) modelFinal = await loadModelFinal()
        const res = modelFinal.predict(resFullTf.features) as Tensor4D;
        const resData = res.dataSync();
        const height = resData[0] + MEAN_VALUES[modelType].cm;
        const weight = resData[1] + MEAN_VALUES[modelType].kg;
        if (isDev()) console.log(`prediction is ${height} cm and  ${weight} kg `);

        // const imageUrl = await tensorToImageUrl_thomas(res);
        // console.log(`tfcode ${Date.now() - startTimeTfCode}`);
        setResFinal((prev) => ({
          ...prev,
          res: { height, weight },
        }));
        console.log('DONE')
      } catch (e) {
        console.log('error final model', e)
      }
      finally {
        setResFinal(prev => ({ ...prev, loading: false }))
        // initState()
      }
    })(), 30)



  }, [resFullTf]);

  const cleanTF = async ({ reloadModel = false, standing = (modelType === STANDING_KID) }) => {
    console.log('cleaning')
    model = null;
    modelFinal = null;
    if (reloadModel) setTfReady(false)
    tf.disposeVariables();
    // if (reloadModel) loadOpenPoseModel().then(() => {
    //   loadModelFinal(standing)
    // });

  }

  const initState = () => {
    setEllipseTf({ loading: false, error: '', uri: '', ballMask: null });
    setResTf({ loading: false, error: '', uri: '', tensor4D: null });
    setTennisBallRes({ res: {}, loading: false, error: '' });
    setResFullTf({ loading: false, res: '', error: '' });
    setResFinal({ loading: false, res: null, error: '' });
  }

  const resetToDefault = ({ resetImage = true }: { resetImage?: boolean }) => {
    if (resetImage)
      photoPickerRef.current
        .getImageSource()
        .then((res) => photoPickerRef.current.setImageSource(res))
        .catch((e) => console.log(e));
    initState()
    cleanTF({ reloadModel: true })
  };

  const isRunning = () =>
    ellipseTf.loading || resTf.loading || tennisBallRes.loading || resFullTf.loading;

  const onSelect = async (type) => {
    const standing = type === STANDING_KID;
    resetToDefault({ resetImage: false })
    cleanTF({ reloadModel: false, standing })
    setModelType(type);
  }
  return (
    <ScrollView style={styles.scrollView}>
      <SafeAreaView>
        <Div p={'lg'}>
          <Div>
            <MySelect onSelect={onSelect} />
            <TextInstruction>1. Chose a photo :</TextInstruction>
            {/* <DrawerButton /> */}

            <PhotoPicker ref={photoPickerRef} {...{ resetToDefault }} />
            <TextInstruction>2. run the algorithm:</TextInstruction>

            <DivRow justifyContent="space-around">
              <Button
                {...{ onPress: run, underlayColor: 'green500' }}
                bg="white"
                w={100}
                borderWidth={1}
                borderColor="green500"
                loaderColor='green500'
                loading={isRunning()}
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
                      {...{ source: { uri: ellipseTf.uri }, resizeMode: 'contain' }}
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
                      {...{ source: { uri: resTf.uri }, resizeMode: 'contain' }}
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
                    <Text>{logError(resFullTf.res).replace(/"/g, '')}</Text>
                  )}
                </>
              )}
            </DivRow>
            <TextInstruction>7. Final model prediction</TextInstruction>
            <DivRow>
              {resFinal.loading && <ActivityIndicator />}
              {!resFinal.loading && (
                <>
                  {!isEmpty(resFinal.error) && (
                    <Text>{logError(resFinal.error)}</Text>
                  )}
                  {!isEmpty(resFinal.res) && (
                    <Text>{`The child has an estimated weight of ${resFinal.res.weight.toFixed(2)} kg and an height of ${resFinal.res.height.toFixed(2)} cm`}</Text>
                  )}
                </>
              )}
            </DivRow>
          </Div>
        </Div>
      </SafeAreaView>
    </ScrollView>
  );
};
export default Home;

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
});
