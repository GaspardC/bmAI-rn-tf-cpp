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
import { isDev } from '../utils';
import { Tensor4D } from '@tensorflow/tfjs';
import { logError } from '../utils/index';
import { base64ToDataUri, getBase64FromUri, uriToBase64Uri } from '../utils/uriHelper';

const MODE_CHAIN = isDev() && false;

const SIZE_INPUT_MODEL = 224;
const MEAN_VALUES = {
  kg: 10.37404983,
  cm: 82.32666807,
};

let model;

const CnnPage = () => {
  const photoPickerRef = useRef({}) as { current: any };

  const [resTf, setResTf] = useState<{
    res?: { height: number, weight: number };
    loading?: boolean;
    error?: string;
  }>({ res: null, loading: false, error: '' });

  useEffect(() => {
    loadCNNModel();
  }, []);

  const loadCNNModel = async () => {
    const modelWeights = require('../assets/cnn_model/group1-shard1of1.bin');
    const modelJson = require('../assets/cnn_model/model.json');
    model = await loadModel({ modelJson, modelWeights });
  };

  const run = async () => {
    setResTf({ loading: true, error: '', res: null });
    if (!model) {
      await loadCNNModel();
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
    setTimeout(async () => {
      try {

        // const { uri: resizedUri, base64 } = await resizeImage(
        //   uri,
        //   SIZE_INPUT_MODEL,
        //   SIZE_INPUT_MODEL,
        // );

        // const inputMatTest = await base64ImageToTensor(base64, true);
        // const tensorImage = base64ToDataUri(await tensorToImage64(inputMatTest));

        console.log('will process')

        // const base64 = await getBase64FromUri(uri)

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


        // console.log('rescaleImageWithPadding', inputMat)

        // const imageUrl = await tensorToUri(tensorImage);
        // const imageUrl = await tensorToUri(inputMatTest);

        // console.log('tensorToImageUrl', imageUrl)

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
    }, 1)

  };

  return (
    <ScrollView style={styles.scrollView}>
      <SafeAreaView>
        <Div p={'lg'} >
          <Div>
            <TextInstruction>1. Chose a photo :</TextInstruction>
            <PhotoPicker ref={photoPickerRef} />
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
