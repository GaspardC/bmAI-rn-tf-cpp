
import * as tf from '@tensorflow/tfjs';
import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Platform } from 'react-native';

export function toDataUri(base64: string): string {
    return `data:image/jpeg;base64,${base64}`;
}

export async function resizeImage(
    imageUrl: string, width: number): Promise<ImageManipulator.ImageResult> {
    const actions = [{
        resize: {
            width,
        },
    }];
    const saveOptions = {
        compress: 0.75,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
    };
    const res =
        await ImageManipulator.manipulateAsync(imageUrl, actions, saveOptions);
    return res;
}

export async function base64ImageToTensor(base64: string):
    Promise<tf.Tensor4D> {
    const rawImageData = tf.util.encodeString(base64, 'base64');
    const TO_UINT8ARRAY = true;
    const { width, height, data } = jpeg.decode(rawImageData);
    // Drop the alpha channel info
    const buffer = new Float32Array(width * height * 3);
    let offset = 0;  // offset into original data
    for (let i = 0; i < buffer.length; i += 3) {
        buffer[i] = data[offset];
        buffer[i + 1] = data[offset + 1];
        buffer[i + 2] = data[offset + 2];
        offset += 4;
    }
    return tf.tensor4d(buffer, [1, height, width, 3]);
}

export async function tensorToImageUrl(imageTensor: tf.Tensor4D):
    Promise<string> {
    const [batch, height, width, dim] = imageTensor.shape;
    const tfSquezze = tf.squeeze(imageTensor)
    const imagesTf = tf.unstack(tfSquezze, 2)
    const image18 = imagesTf[18];
    const buffer = await image18.data();
    const frameData = new Uint8Array(width * height * 4);

    let offset = 0;
    for (let i = 0; i < frameData.length; i += 4) {
        const val = Math.round(buffer[offset] * 255)
        frameData[i] = val;
        frameData[i + 1] = val;
        frameData[i + 2] = val;
        frameData[i + 3] = 0xFF;
        offset += 1;
    }

    const rawImageData = {
        data: frameData,
        width,
        height,
    };
    const jpegImageData = jpeg.encode(rawImageData, 75);
    const base64Encoding = tf.util.decodeString(jpegImageData.data, 'base64');
    return base64Encoding;
}


export const isIos = () => Platform.OS === 'ios'