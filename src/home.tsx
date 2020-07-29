

// 1. detect tennis ball
// 2. ellipse
// 3. skeletton
// 4. full tf
// chose photo: chose another photo or reset

import React, { useState } from 'react'
import { Div, Image, Text, Button } from 'react-native-magnus';
import { isIos } from './utils';
import { isEmpty } from 'lodash'
import {
    SafeAreaView,
    StyleSheet,
    ScrollView,
    View,
    TouchableOpacity,
    StatusBar,
    NativeModules,
    PermissionsAndroid,
    ActivityIndicator,
    Switch
} from 'react-native';
import ImagePicker from 'react-native-image-picker';

import { Colors } from 'react-native/Libraries/NewAppScreen';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

import { downloadAssetSource, getFilePath, getFileUri } from './utils/uriHelper';
import { resizeImage, base64ImageToTensor, tensorToImageUrl_thomas, draw_ellipse_full_tf } from './utils/tf_utils';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { Tensor4D } from '@tensorflow/tfjs';
import { initSentry, isDev } from './utils/index';

const imageDefault = require('./assets/images/ball2.jpg');

const { HelloWorld: CppDetectTennisBall } = NativeModules;

const Home = () => {
    const [imageSource, setImageSrouce] = useState(imageDefault)
    const [tennisBallRes, setTennisBallRes] = useState<{ res?: any; loading?: boolean; error?: string }>({ res: {}, loading: false, error: '' })
    const [isLoading, setLoading] = useState(false)
    const [isTfReady, setTfReady] = useState(false);
    const [resTf, setResTf] = useState<{ loading?: boolean; error?: string; uri?: string; }>({ loading: false, error: '', uri: '' })

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
                setImageSrouce(source)
                // run(source)
            }
        });
    };

    async function waitForTensorFlowJs() {
        await tf.ready();
        setTfReady(true);
    }

    const processTFImg = async (uri: string) => {
        try {
            setResTf({ loading: true })
            if (!isTfReady) {
                await waitForTensorFlowJs()
            }

            const modelJson = require('./assets/model/frozen/model.json');
            const modelWeights = require('./assets/model/frozen/group1-shard1of1.bin');

            const startTimeModel = Date.now();
            const model = await tf.loadGraphModel(
                bundleResourceIO(modelJson, modelWeights),
            );

            console.log(`loading model in ${Date.now() - startTimeModel}`);

            const { uri: resizedUri, base64 } = await resizeImage(uri, 368);

            const inputMat = await base64ImageToTensor(base64);
            const startTime = Date.now();
            const res = model.predict(inputMat) as Tensor4D;

            // console.log(`inference done elapsed time${Date.now() - startTime}`);

            // const imageUrl = await tensorToImageUrl(res);
            // const startTimeTfCode = Date.now();

            const imageUrl = await tensorToImageUrl_thomas(res);
            // console.log(`tfcode ${Date.now() - startTimeTfCode}`);
            setResTf(prev => ({ ...prev, uri: `data:image/jpeg;base64,${imageUrl}` }))
            console.log(`imageUrl ${imageUrl}`);
        } catch (err) {
            setResTf(prev => ({ ...prev, error: err ?? 'error model' }))
            console.log('erreur model !');
            console.log(err);
        }
        finally {
            setResTf(prev => ({ ...prev, loading: false }))
        }
    }

    const processCppImg = (uriBoth) => {
        setTennisBallRes({ loading: true });
        return new Promise((resolve, reject) => {
            CppDetectTennisBall.sayHello(uriBoth)
                .then(async (res) => {
                    console.log('res', res);
                    let resObj = JSON.parse(res);
                    if (isIos()) {
                        // resObj.resUri = resObj?.resUri?.replace('file://', '')
                        // resObj.resSource = uriBoth;
                        const resUri = await getFileUri(resObj.resUri);
                        resObj.resUri = resUri
                    }
                    resObj.sU = JSON.parse(resObj.sU);
                    setTennisBallRes(prev => ({ ...prev, loading: false, res: resObj }));
                    resolve(resObj)
                })
                .catch((e) => {
                    console.log(e);
                    setTennisBallRes(prev => ({ ...prev, loading: false, error: e }));
                    reject(e)
                });
        })
    };

    const run = async () => {
        const imageUri = await getImageSourceUri(imageSource)
        await processCppImg(imageUri)
        processTFImg(imageUri);
    }

    return <ScrollView style={styles.scrollView}>
        <Div p={'lg'}>
            <Div>
                <TextInstruction>1. Chose an image :</TextInstruction>
                <DivRow>
                    <Image source={imageSource.uri ? { uri: imageSource.uri } : imageSource} h={200} w={200} resizeMode="contain"></Image>
                </DivRow>
                <DivRow justifyContent="space-around">
                    <Button onPress={openPicker} bg="white" borderWidth={1} borderColor="blue500" color="blue500" underlayColor="blue100">Chose another one</Button>
                    <Button onPress={() => { setImageSrouce(imageDefault) }} bg="white" borderWidth={1} borderColor="red500" color="red500" underlayColor="red100">Reset to default</Button>
                </DivRow>
                <TextInstruction>2. Run the algorithm:</TextInstruction>

                <DivRow justifyContent="space-around">
                    <Button onPress={run} bg="white" borderWidth={1} borderColor="green500" color="green500" underlayColor="green500">Run</Button>

                </DivRow>
                <TextInstruction>3. Tennis ball detection</TextInstruction>
                <DivRow>
                    {tennisBallRes.loading && <ActivityIndicator />}
                    {!tennisBallRes.loading && <>
                        {!isEmpty(tennisBallRes.error) && <Text>{tennisBallRes.error}</Text>}
                        {!isEmpty(tennisBallRes.res) && <Text>{JSON.stringify(tennisBallRes.res)}</Text>}
                    </>}
                </DivRow>
                <TextInstruction>4. Ellipse mask tennis ball</TextInstruction>
                <TextInstruction>5. Skeletton</TextInstruction>
                <DivRow>
                    {resTf.loading && <ActivityIndicator />}
                    {!resTf.loading && <>
                        {!isEmpty(resTf.error) && <Text>{resTf.error}</Text>}
                        {!isEmpty(resTf.uri) && <Image source={{ uri: resTf.uri }} h={200} w={200} resizeMode="contain" />}
                    </>}
                </DivRow>
                <TextInstruction>6. Full features tensorflow</TextInstruction>


            </Div>
        </Div>
    </ScrollView>
}
export default Home


const styles = StyleSheet.create({
    scrollView: { flex: 1 }
})

const DivRow = ({ children, ...otherProps }) => <Div row justifyContent="center" my='lg' {...otherProps}>{children}</Div>

const TextInstruction = ({ children }) => <Text fontWeight="bold" fontSize="cl">{children}</Text>


const getImageSourceUri = async (imageSource) => {
    if (imageSource.uri) return imageSource.uri;
    const sourceFile = await getFilePath(imageDefault)
    const { uri, base64 } = await resizeImage(sourceFile, 368);
    return uri;
}