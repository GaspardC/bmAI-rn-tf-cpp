import React, {useRef, useState} from 'react';
import {ScrollView, SafeAreaView, StyleSheet} from 'react-native';
import {Div, Image, Text, Button} from 'react-native-magnus';
import TextInstruction from '../components/text/instruction';
import PhotoPicker from '../components/photoPicker';
import {DivRow} from '../components/layout';
import {isEmpty} from 'lodash';
import {
  loadModel,
  resizeImage,
  base64ImageToTensor,
  tensorToImageUrl_thomas,
} from '../utils/tf_utils';

const CnnPage = () => {
  const photoPickerRef = useRef({});

  const [resTf, setResTf] = useState<{
    res?: EllipseType;
    loading?: boolean;
    error?: string;
  }>({res: {}, loading: false, error: ''});

  const resetToDefault = () => {};
  const run = () => {};

  const processTFImg = async (uri: string) => {
    try {
      setResTf({loading: true});
      if (!isTfReady || !model) {
        const modelJson = require('../assets/cnn_model/group1-shard1of1.bin');
        const modelWeights = require('../assets/cnn_model/model.json');
        await loadModel({modelJson, modelWeights});
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

  return (
    <ScrollView style={styles.scrollView}>
      <SafeAreaView>
        <Div p={'lg'}>
          <Div>
            <TextInstruction>1. Chose a photo :</TextInstruction>
            <PhotoPicker ref={photoPickerRef} {...{resetToDefault}} />
            <TextInstruction>2. Run the model:</TextInstruction>
            <DivRow justifyContent="space-around">
              <Button
                {...{onPress: run, underlayColor: 'green500'}}
                bg="white"
                borderWidth={1}
                borderColor="green500"
                color="green500">
                Run
              </Button>
            </DivRow>
            <TextInstruction>3. Cnn prediction</TextInstruction>
            <DivRow>
              {resTf.loading && <ActivityIndicator />}
              {!resTf.loading && resTf.res?.a !== -1 && (
                <>
                  {!isEmpty(resTf.error) && (
                    <Text>{logError(resTf.error)}</Text>
                  )}
                  {!isEmpty(resTf.res) && (
                    <Text>{JSON.stringify(resTf.res)}</Text>
                  )}
                </>
              )}
              {resTf.res?.a === -1 && <Text>No res</Text>}
            </DivRow>
          </Div>
        </Div>
      </SafeAreaView>
    </ScrollView>
  );
};

export default CnnPage;

const styles = StyleSheet.create({
  scrollView: {flex: 1},
});
