import React, { useRef, useState, useEffect } from 'react';
import {
  ScrollView,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Div, Text, Button } from 'react-native-magnus';
import TextInstruction from '../components/text/instruction';
import PhotoPicker, { getImageDefault } from '../components/photoPicker';
import { DivRow } from '../components/layout';
import { isEmpty } from 'lodash';
import {
  loadModel,
  resizeImage,
  base64ImageToTensor,
  imageUriToTensor,
  rescaleImageWithPadding,
  tensorToImageUrl_thomas,
  tensorToImage64,
  tensorToUri,
} from '../utils/tf_utils';
import { getAllTestImg } from '../components/photoPicker/index';
import { isDev, timeoutifyPromise } from '../utils';
import { Tensor4D } from '@tensorflow/tfjs';
import { logError } from '../utils/index';
import { base64ToDataUri, getBase64FromUri, uriToBase64Uri } from '../utils/uriHelper';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import MySelect, { INIT_CHILD_MODE, STANDING_KID } from '../components/select';

const MODE_CHAIN = isDev() && false;

const SIZE_INPUT_MODEL = 224;
export const MEAN_VALUES = {
  kg: 10.37404983,
  cm: 82.32666807,
};

let model;

const CnnPage = () => {
  const photoPickerRef = useRef({}) as { current: any };


  const cleanTF = () => {
    model = null
    tf.disposeVariables();
    setResTf(resTfInitState)
    photoPickerRef.current
      .getImageSource()
      .then((res) => photoPickerRef.current.setImageSource(res))
      .catch((e) => console.log(e));
  }

  const [modelType, setModelType] = useState(INIT_CHILD_MODE)
  const resTfInitState = { res: null, loading: false, error: '' }
  const [resTf, setResTf] = useState<{
    res?: { height: number, weight: number };
    loading?: boolean;
    error?: string;
  }>(resTfInitState);

  useEffect(() => {
    // timeoutifyPromise(loadCNNModel)
    return () => {
      model = null
      tf.disposeVariables();
      setResTf(resTfInitState);
    }
  }, []);

  const onSelect = async (type) => {
    cleanTF()
    const standing = type === STANDING_KID;
    loadCNNModel(standing);
    setModelType(type);
  }

  const loadCNNModel = async (standing = (modelType === STANDING_KID)) => {
    const modelWeights = standing ? require('../assets/models/cnn/cnn_padded/group1-shard1of1.bin') : require('../assets/models/cnn/cnn_padded_newborn/group1-shard1of1.bin');
    const modelJson = standing ? require('../assets/models/cnn/cnn_padded/model.json') : require('../assets/models/cnn/cnn_padded_newborn/model.json');
    model = await loadModel({ modelJson, modelWeights });
  };

  const run = async () => {
    setResTf({ loading: true, error: '', res: null });
    if (!model) {
      await timeoutifyPromise(await loadCNNModel);
    }

    if (!MODE_CHAIN)
      return processTFImg(photoPickerRef.current.imageSource.uri);

    for (let i = 0; i < getAllTestImg.length; i++) {
      try {
        const img = getAllTestImg[i];
        // console.log(img);
        const assetDefault = await getImageDefault(img.uri);
        // console.log('uri', asset.uri);
        await processTFImg(assetDefault.uri);
        // processTFImg(photoPickerRef.current.imageSource.uri);
      } catch (err) {
        console.log('err getting image default', err);
      }
    }
  };

  const processTFImg = async (uri: string) => {
    timeoutifyPromise(async () => {
      try {
        console.log('will process')
        let base64;
        if (uri.startsWith('data:image/jpeg;base64')) {
          base64 = uriToBase64Uri(uri)
        }
        else {
          const { uri: resizedUri, base64: resizedBase64 } = await resizeImage(
            uri,
            SIZE_INPUT_MODEL,
          );
          base64 = resizedBase64;
        }

        const inputMatTest = await base64ImageToTensor(base64)

        const inputMat = await rescaleImageWithPadding({ image: inputMatTest, resolution: [SIZE_INPUT_MODEL, SIZE_INPUT_MODEL] })

        const tensorImage = base64ToDataUri(await tensorToImage64(inputMat));


        photoPickerRef.current.setImageSource({ uri: tensorImage, height: SIZE_INPUT_MODEL, width: SIZE_INPUT_MODEL });


        const startTime = Date.now();
        const res = model.predict(inputMat) as Tensor4D;

        // console.log(`inference done elapsed time${Date.now() - startTime}`);


        // const startTimeTfCode = Date.now();
        const resData = res.dataSync();
        const height = resData[0] + MEAN_VALUES.cm;
        const weight = resData[1] + MEAN_VALUES.kg;
        if (isDev()) console.log(`prediction is ${height} cm and  ${weight} kg `);

        // const imageUrl = await tensorToImageUrl_thomas(res);
        // console.log(`tfcode ${Date.now() - startTimeTfCode}`);
        setResTf((prev) => ({
          ...prev,
          res: { height, weight },
        }));
        // console.log(`imageUrl ${imageUrl}`);
      } catch (err) {
        setResTf((prev) => ({ ...prev, error: err ?? 'error model' }));
        console.log('erreur model !');
        console.log(err);
      } finally {
        setResTf((prev) => ({ ...prev, loading: false }));
        // if(MODE_CHAIN){
        //   model= null
        //    tf.disposeVariables();
        // }
      }
    }, 30)

  };

  const resetToDefault = () => {
    cleanTF()
  }
  return (
    <ScrollView style={styles.scrollView}>
      <SafeAreaView>
        <Div p={'lg'} >
          <Div>
            <MySelect onSelect={onSelect} />
            <TextInstruction>1. Chose a photo :</TextInstruction>
            <PhotoPicker ref={photoPickerRef} resetToDefault={resetToDefault} />
            <TextInstruction>2. Run the model:</TextInstruction>
            <DivRow justifyContent="space-around">
              <Button
                {...{ onPress: run, underlayColor: 'white' }}
                bg="white"
                w={100}
                borderWidth={1}
                borderColor="green500"
                loaderColor='green500'
                loading={resTf.loading}
                color="green500">
                Run
              </Button>

            </DivRow>
            <TextInstruction>3. CNN prediction</TextInstruction>
            <DivRow>
              {resTf.loading && <ActivityIndicator color="#5ea1ed" size="large" />
              }
              {!resTf.loading && (
                <>
                  {!isEmpty(resTf.error) && (
                    <Text>{logError(resTf.error)}</Text>
                  )}
                  {!isEmpty(resTf.res) && (
                    <Text>{`The child has an estimated weight of ${resTf.res.weight.toFixed(2)} kg and an height of ${resTf.res.height.toFixed(2)} cm`}</Text>
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

export default CnnPage;

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
});
