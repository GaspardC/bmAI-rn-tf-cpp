
import * as tf from '@tensorflow/tfjs';
import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { image } from '@tensorflow/tfjs';

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
    const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY);
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

export async function tensorToImageUrl_thomas(output_maps_t: tf.Tensor4D) {
    // # Get tensor from numpy array
    // const output_maps_t = tf.compat.v1.convert_to_tensor(output_maps)

    // # Select a single channel
    const channel_t = tf.slice(output_maps_t, [0, 0, 0, 18], [1, -1, -1, 1])

    // # Get rid of extra dimensions
    const channel_t_squeeze = tf.squeeze(channel_t)
    const [B, H, W] = channel_t.shape

    // # Rescale in range 0 - 255
    const min_value_t = tf.min(channel_t)
    const max_value_t = tf.max(channel_t)
    const channel_t_squeeze_ = tf.mul(tf.div(tf.sub(channel_t_squeeze, min_value_t), tf.sub(max_value_t, min_value_t)), tf.scalar(255.))
    console.log(channel_t_squeeze_.shape)

    // # Cast to int
    const channel_t_squeeze_int = tf.cast(channel_t_squeeze_, "int32")

    // # Repeat the tensor along channel dimension
    const channel_t_ = tf.stack([channel_t_squeeze_int, channel_t_squeeze_int, channel_t_squeeze_int], 2)
    console.log(`channel_t_.shape ${channel_t_.shape}`)

    // # Add alpha channel
    const alpha_channel_t = tf.mul(tf.ones([H, W]), 255)
    // # Stack alpha channel
    const res = tf.concat([channel_t_, tf.expandDims(alpha_channel_t, 2)], 2)
    console.log(res.shape)

    const res_flatten = tf.reshape(res, [-1]);
    const data = await res_flatten.data();

    const rawImageData = {
        data,
        width: W,
        height: H,
    };

    const jpegImageData = jpeg.encode(rawImageData, 75);
    const base64Encoding = tf.util.decodeString(jpegImageData.data, 'base64');
    return base64Encoding;
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
