

// 1. detect tennis ball
// 2. ellipse
// 3. skeletton
// 4. full tf
// chose photo: chose another photo or reset

import React, { useState, useEffect } from 'react'
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
import { base64ImageToTensor, tensorToImageUrl_thomas, draw_ellipse_full_tf, resizeImage } from './utils/tf_utils';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { Tensor4D } from '@tensorflow/tfjs';
import { initSentry, isDev } from './utils/index';

const imageDefault = require('./assets/images/ball.jpg');

const { HelloWorld: CppDetectTennisBall } = NativeModules;

const RESIZE_HEIGHT = 1200;

const Home = () => {
    const [imageSource, setImageSrouce] = useState(imageDefault)
    const [tennisBallRes, setTennisBallRes] = useState<{ res?: any; loading?: boolean; error?: string }>({ res: {}, loading: false, error: '' })
    const [isLoading, setLoading] = useState(false)
    const [isTfReady, setTfReady] = useState(false);
    const [resTf, setResTf] = useState<{ loading?: boolean; error?: string; uri?: string; }>({ loading: false, error: '', uri: '' })
    const [ellipseTf, setEllipseTf] = useState<{ loading?: boolean; error?: string; uri?: string; }>({ uri: '' })

    useEffect(() => {
        const todel = { ...imageSource }
        delete todel['base64']

        console.log('imageSource', todel)
    }, [imageSource])
    useEffect(() => {
        getImageSource(imageSource).then(res => setImageSrouce(res))
    }, [])

    const openPicker = () => {
        resetToDefault({})
        const options = { noData: true, maxHeight: RESIZE_HEIGHT };
        ImagePicker.showImagePicker(options, async (response) => {
            console.log('Response = ', response);
            if (response.didCancel) {
                console.log('User cancelled image picker');
            } else if (response.error) {
                console.log('ImagePicker Error: ', response.error);
            } else if (response.customButton) {
                console.log('User tapped custom button: ', response.customButton);
            } else {
                // console.log('response is ', response);
                const image = await resizeImage(response.uri, RESIZE_HEIGHT);
                const source = {
                    path: isIos() ? image.uri : response.path,
                    ...image,
                    uriBoth: isIos() ? image.uri : 'file://' + response.path,
                };


                // You can also display the image using data:
                // const source = { uri: 'data:image/jpeg;base64,' + response.data };
                // console.log('source is ', source);
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

            const { uri: resizedUri, base64 } = await resizeImage(uri, RESIZE_HEIGHT);

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
                    let resObj = JSON.parse(res);
                    // if (isIos()) {
                    //     // resObj.resUri = resObj?.resUri?.replace('file://', '')
                    //     // resObj.resSource = uriBoth;
                    //     const resUri = await getFileUri(resObj.resUri);
                    //     resObj.resUri = resUri
                    // }
                    Object.entries(resObj).forEach(([key, value]: [string, string]) => {
                        if (key === 'sU') return;
                        resObj[key] = parseFloat(value);
                    })
                    console.log('res parsed', resObj);

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

    const getEllipse = async () => {
        // const ellipseParams = { x_c: 125, y_c: 305, a: 6, b: 5, U: [[0.10865521189821306, 0.994079496281537], [0.9940794962815371, -0.10865521189821307]] }
        // const ellipseBase64 = await draw_ellipse_full_tf({ ellipseParams, resolution: [326, 244] });
        try {
            const ellipseParams = tennisBallRes.res
            setEllipseTf(({ loading: true }))

            const ellipseBase64 = await draw_ellipse_full_tf({ ellipseParams, resolution: [imageSource.height, imageSource.width] });
            setEllipseTf(prev => ({ ...prev, uri: `data:image/jpeg;base64,${ellipseBase64}` }))
        } catch (e) {
            setEllipseTf(prev => ({ ...prev, error: e }))
        }
        finally {
            setEllipseTf(prev => ({ ...prev, loading: false }))
        }
    }

    const run = async () => {
        resetToDefault({ resetImage: false })
        if (!isTfReady) {
            await waitForTensorFlowJs()
        }
        const image = await getImageSource(imageSource)
        const img2log = { ...image };
        delete img2log['base64']
        console.log('run on image', img2log)
        await processCppImg(image.uri)
    }

    useEffect(() => {
        if (isEmpty(tennisBallRes.res)) return;
        getEllipse()
    }, [tennisBallRes])

    useEffect(() => {
        if (isEmpty(tennisBallRes.res)) return;
        getImageSource(imageSource).then(({ uri }) => {
            processTFImg(uri);
        })
    }, [tennisBallRes])

    const resetToDefault = ({ resetImage = true }: { resetImage?: boolean }) => {
        if (resetImage) getImageSource(imageDefault).then(res => setImageSrouce(res))
        setEllipseTf({ loading: false })
        setResTf({ loading: false })
        setTennisBallRes({ loading: false })
    }

    return <ScrollView style={styles.scrollView}>
        <SafeAreaView>
            <Div p={'lg'}>
                <Div>
                    <TextInstruction>1. Chose a photo :</TextInstruction>
                    <DivRow>
                        <Image {...{ source: { uri: imageSource.uri }, resizeMode: 'contain' }} h={200} w={200}></Image>
                    </DivRow>
                    <DivRow justifyContent="space-around">
                        <Button {...{ onPress: openPicker, underlayColor: 'blue100' }} bg="white" borderWidth={1} borderColor="blue500" color="blue500">Chose another one</Button>
                        <Button {...{ onPress: resetToDefault, underlayColor: 'red100' }} bg="white" borderWidth={1} borderColor="red500" color="red500" >Reset to default</Button>
                    </DivRow>
                    <TextInstruction>2. Run the algorithm:</TextInstruction>

                    <DivRow justifyContent="space-around">
                        <Button {...{ onPress: run, underlayColor: 'green500' }} bg="white" borderWidth={1} borderColor="green500" color="green500">Run</Button>

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
                    <DivRow>
                        {ellipseTf.loading && <ActivityIndicator />}
                        {!ellipseTf.loading && <>
                            {!isEmpty(ellipseTf.error) && <Text>{ellipseTf.error}</Text>}
                            {!isEmpty(ellipseTf.uri) && <Image {...{ source: { uri: ellipseTf.uri }, resizeMode: 'contain' }} h={200} w={200} />}
                        </>}
                    </DivRow>
                    <TextInstruction>5. Skeletton</TextInstruction>
                    <DivRow>
                        {resTf.loading && <ActivityIndicator />}
                        {!resTf.loading && <>
                            {!isEmpty(resTf.error) && <Text>{resTf.error}</Text>}
                            {!isEmpty(resTf.uri) && <Image {...{ source: { uri: resTf.uri }, resizeMode: 'contain' }} h={200} w={200} />}
                        </>}
                    </DivRow>
                    <TextInstruction>6. Full features tensorflow</TextInstruction>


                </Div>
            </Div>
        </SafeAreaView>
    </ScrollView>
}
export default Home


const styles = StyleSheet.create({
    scrollView: { flex: 1 }
})

const DivRow = ({ children, ...otherProps }) => <Div row justifyContent="center" my='lg' {...otherProps}>{children}</Div>

const TextInstruction = ({ children }) => <Text fontWeight="bold" fontSize="cl">{children}</Text>


const getImageSource = async (imageSource) => {
    if (imageSource.uri) return imageSource;
    const sourceFile = await getFilePath(imageDefault)
    return await resizeImage(sourceFile, RESIZE_HEIGHT);
}