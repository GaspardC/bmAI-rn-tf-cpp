
import * as tf from '@tensorflow/tfjs';
import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { image, scalar } from '@tensorflow/tfjs';

// Height and width of the input features of the second model
const FEATURES_SIZE: [number, number] = [92, 92]
const LIMBS_DROP_INDEXES = [9, 13]
const N_LIMBS = 19
const N_RELEVANT_LIMBS = 17;
const N_RELEVANT_JOINTS = 18;

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


/**
 * Builds a set of features from the ball's mask and the output of the skeleton model using only TF functions.
 * :param heat_maps_t: intensity maps for each joint as a TF tensor.
 * :param paf_maps_t: intensity maps for each limb as a TF tensor.
 * :param ball_mask: binary mask of the detected tennis ball as a TF tensor.
 * :return: features maps with shape [batch, height, width, 3] as a TF tensor.
 * */

export async function build_features_full_tf(heat_maps_t: tf.Tensor4D, paf_maps_t: tf.Tensor4D, ball_mask: tf.Tensor2D, body_mask?) {

    // Resize the ball mask
    let ballMask: tf.Tensor4D = tf.expandDims(tf.expandDims(ball_mask, 0), 3);
    ballMask = tf.image.resizeNearestNeighbor(ballMask, FEATURES_SIZE)

    // Resize the maps
    const heat_maps = tf.image.resizeNearestNeighbor(heat_maps_t, FEATURES_SIZE)
    const paf_maps = tf.image.resizeNearestNeighbor(paf_maps_t, FEATURES_SIZE)

    // Split paf maps for each coordinate
    const [B, H, W, C] = paf_maps_t.shape;
    const true_t = tf.tensor(true, [B, H, W, Math.floor(C / 2)])
    const false_t = tf.tensor(false, [B, H, W, Math.floor(C / 2)])

    // Prepare boolean masks
    const even_indexes_t = tf.reshape(tf.stack([true_t, false_t], -1), [B, H, W, C]);
    const odd_indexes_t = tf.reshape(tf.stack([false_t, true_t], -1), [B, H, W, C]);

    // Split x and y directions
    const paf_x_maps_t = tf.reshape(await tf.booleanMaskAsync(paf_maps_t, even_indexes_t), [B, H, W, Math.floor(C / 2)])
    const paf_y_maps_t = tf.reshape(await tf.booleanMaskAsync(paf_maps_t, odd_indexes_t), [B, H, W, Math.floor(C / 2)])

    // Compute the norm of the paf maps vectors
    const paf_d_maps_t = tf.sqrt(tf.add(tf.pow(paf_x_maps_t, tf.scalar(2.)), tf.pow(paf_y_maps_t, tf.scalar(2.))))

    // Select indexes corresponding to relevant limbs
    const keep_indexes_t = tf.tile(tf.reshape(tf.tensor(new Array(N_LIMBS).fill(1).map((_, i) => i).filter(i => !LIMBS_DROP_INDEXES.includes(i))), [1, 1, 1, -1]), [B, H, W, 1])

    // Get the limbs features
    const limbs_features_t = tf.sum(tf.reshape(await tf.booleanMaskAsync(paf_d_maps_t, keep_indexes_t), [B, H, W, N_RELEVANT_LIMBS]), -1, true)

    // Get the joints features
    const joints_features_t = tf.sum(tf.slice(heat_maps_t, [0, 0, 0, 0], [-1, -1, -1, N_RELEVANT_JOINTS]), -1, true)

    // Get the ball features
    const ball_features_t = tf.cast(tf.reshape((ball_mask), [B, H, W, 1]), "float32")

    // Concatenate features along last dimension
    let features_t = tf.concat([limbs_features_t, joints_features_t, ball_features_t], -1)

    // Add body mask if available
    let body_features_t
    if (body_mask) {
        body_features_t = tf.cast(tf.reshape((body_mask), [B, H, W, 1]), "float32")
        features_t = tf.concat([features_t, body_features_t], -1)
    }

    return features_t;
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



const dummyResolution = [2448, 3264];
const dummyEllipse = { x_c: 1254.9028132992328, y_c: 3054.593350383632, a: 61.2111238178404, b: 56.25621517756661, U: [[0.10865521189821306, 0.994079496281537], [0.9940794962815371, -0.10865521189821307]] }

/**
 *  Draws the ellipse representing the tennis ball mask using only the tf library.
    :param ball_dict: dictionary containing the coordinates of the tennis ball as returned by the "detect" function.
    :param resolution: resolution of the input image.
    :return: binary mask of the tennis ball.

 * */

export const draw_ellipse_full_tf = ({ ellipseParams = dummyEllipse, resolution = dummyResolution }) => {

    console.log('drawing ellipse', ellipseParams);
    const { x_c, y_c, a, b, U } = dummyEllipse;

    const x_c_t = tf.scalar(x_c)
    const y_c_t = tf.scalar(y_c)
    const a_t = tf.scalar(a)
    const b_t = tf.scalar(b)

    let x_t = tf.linspace(0., resolution[1], resolution[1] + 1);
    let y_t = tf.linspace(0., resolution[0], resolution[0] + 1);

    //# Extract orientation of the ellipse
    const U_t = tf.tensor(U); //.as2D(2, 2);

    //Compute angle using the fact that all norms are one and projection on e1 and   e2
    const cos_a_t = tf.squeeze(tf.slice(U_t, [0, 0], [1, 1]));
    const sin_a_t = tf.squeeze(tf.slice(U_t, [1, 0], [1, 1]));

    x_t = tf.linspace(0., resolution[1] - 1, resolution[1])
    y_t = tf.linspace(0., resolution[0] - 1, resolution[0])

    const x_grid_t = tf.tile(tf.expandDims(x_t, 0), [resolution[0], 1])
    const y_grid_t = tf.tile(tf.expandDims(y_t, 1), [1, resolution[1]]);


    // Compute the distance
    const dist_tmp1 = tf.pow(tf.div(tf.add(tf.mul(tf.sub(x_grid_t, x_c_t), cos_a_t),
        tf.mul(tf.sub(y_grid_t, y_c_t), sin_a_t)), a_t), 2);
    const dist_tmp2 = tf.pow(tf.div(tf.sub(tf.mul(tf.sub(x_grid_t, x_c_t), sin_a_t),
        tf.mul(tf.sub(y_grid_t, y_c_t), cos_a_t)), b_t), 2);
    const distance_sq_t = tf.add(dist_tmp1, dist_tmp2);

    const condShape = distance_sq_t.shape as [number, number];
    const mask_t: tf.Tensor2D = tf.where(distance_sq_t.lessEqual(tf.scalar(1.0)), tf.ones(condShape), tf.zeros(condShape));
    return mask_t;

}