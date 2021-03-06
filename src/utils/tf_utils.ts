import * as tf from '@tensorflow/tfjs';
import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { image, scalar, tensor } from '@tensorflow/tfjs';
import { bundleResourceIO, decodeJpeg, fetch } from '@tensorflow/tfjs-react-native';

import { Image } from 'react-native'
import { base64ToDataUri } from './uriHelper';
// Height and width of the input features of the second model
const FEATURES_SIZE: [number, number] = [92, 92];
const LIMBS_DROP_INDEXES = [9, 13];
const N_LIMBS = 19;
const N_JOINTS = 19;
const N_RELEVANT_LIMBS = 17;
const N_RELEVANT_JOINTS = 18;



export async function resizeImage(
  imageUrl: string,
  height: number,
  width?: number,
): Promise<ImageManipulator.ImageResult> {
  const actions = [
    {
      resize: {
        height,
        ...(width && { width }),
      },
    },
  ];
  const saveOptions = {
    compress: 1.0,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  };
  const res = await ImageManipulator.manipulateAsync(
    imageUrl,
    actions,
    saveOptions,
  );
  return res;
}

export const imageUriToTensor = async (imageUri) => {
  // Load an image as a Uint8Array
  const imageUri2 = 'http://image-uri-here.example.com/image.jpg';
  const response = await fetch(imageUri2, {}, { isBinary: true });
  const imageDataArrayBuffer = await response.arrayBuffer();
  const imageData = new Uint8Array(imageDataArrayBuffer);

  // Decode image data to a tensor
  const imageTensor = decodeJpeg(imageData);
  return imageTensor;
}

export async function base64ImageToTensor(
  base64: string,
  normalize?: boolean,
): Promise<tf.Tensor4D> {
  const rawImageData = tf.util.encodeString(base64, 'base64');
  const TO_UINT8ARRAY = true;
  const { width, height, data } = jpeg.decode(rawImageData); //TO_UINT8ARRAY
  // Drop the alpha channel info
  const buffer = new Float32Array(width * height * 3);
  let offset = 0; // offset into original data
  const divNorm = normalize ? 255 : 1;
  for (let i = 0; i < buffer.length; i += 3) {
    buffer[i] = data[offset] / divNorm;
    buffer[i + 1] = data[offset + 1] / divNorm;
    buffer[i + 2] = data[offset + 2] / divNorm;
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

export async function build_features_full_tf(
  skeleton_maps: tf.Tensor4D,
  ball_mask: tf.Tensor2D,
  body_mask?,
) {
  // # Split the skeleton maps in limbs and joints maps
  let heat_maps_t = tf.slice(
    skeleton_maps,
    [0, 0, 0, 0],
    [-1, -1, -1, N_JOINTS],
  );
  let paf_maps_t = tf.slice(
    skeleton_maps,
    [0, 0, 0, N_JOINTS],
    [-1, -1, -1, N_JOINTS * 2],
  );

  // Resize the ball mask
  let ballMask: tf.Tensor4D = tf.expandDims(tf.expandDims(ball_mask, 0), 3);
  ballMask = tf.image.resizeNearestNeighbor(ballMask, FEATURES_SIZE);

  // Resize the maps
  heat_maps_t = tf.image.resizeNearestNeighbor(heat_maps_t, FEATURES_SIZE);
  paf_maps_t = tf.image.resizeNearestNeighbor(paf_maps_t, FEATURES_SIZE);

  // Split paf maps for each coordinate
  const [B, H, W, C] = paf_maps_t.shape;
  const true_t = tf.ones([B, H, W, Math.floor(C / 2)], 'bool');
  const false_t = tf.zeros([B, H, W, Math.floor(C / 2)], 'bool');

  // Prepare boolean masks
  const even_indexes_t = tf.reshape(tf.stack([true_t, false_t], -1), [
    B,
    H,
    W,
    C,
  ]);
  const odd_indexes_t = tf.reshape(tf.stack([false_t, true_t], -1), [
    B,
    H,
    W,
    C,
  ]);

  // Split x and y directions
  const paf_x_maps_t = tf.reshape(
    await tf.booleanMaskAsync(paf_maps_t, even_indexes_t),
    [B, H, W, Math.floor(C / 2)],
  );
  const paf_y_maps_t = tf.reshape(
    await tf.booleanMaskAsync(paf_maps_t, odd_indexes_t),
    [B, H, W, Math.floor(C / 2)],
  );

  // Compute the norm of the paf maps vectors
  const paf_d_maps_t = tf.sqrt(
    tf.add(
      tf.pow(paf_x_maps_t, tf.scalar(2)),
      tf.pow(paf_y_maps_t, tf.scalar(2)),
    ),
  );

  // Select indexes corresponding to relevant limbs
  const keep_indexes_t = tf.tile(
    tf.reshape(
      tf.tensor(
        new Array(N_LIMBS)
          .fill(1)
          .map((_, i) => i)
          .map((i) => !LIMBS_DROP_INDEXES.includes(i)),
      ),
      [1, 1, 1, -1],
    ),
    [B, H, W, 1],
  );

  // Get the limbs features
  const limbs_features_t = tf.sum(
    tf.reshape(await tf.booleanMaskAsync(paf_d_maps_t, keep_indexes_t), [
      B,
      H,
      W,
      N_RELEVANT_LIMBS,
    ]),
    -1,
    true,
  );

  // Get the joints features
  const joints_features_t = tf.sum(
    tf.slice(heat_maps_t, [0, 0, 0, 0], [-1, -1, -1, N_RELEVANT_JOINTS]),
    -1,
    true,
  );

  // Get the ball features
  const ball_mask_t = tf.expandDims(tf.expandDims(ballMask, 0), 3);
  const ball_features_t = tf.cast(
    tf.reshape(ball_mask_t, [B, H, W, 1]),
    'float32',
  );

  // Concatenate features along last dimension
  let features_t = tf.concat(
    [limbs_features_t, joints_features_t, ball_features_t],
    -1,
  );

  // Add body mask if available
  let body_features_t;
  if (body_mask) {
    body_features_t = tf.cast(tf.reshape(body_mask, [B, H, W, 1]), 'float32');
    features_t = tf.concat([features_t, body_features_t], -1);
  }
  // return { base64: await tensorToImage64(features_t), features_t }
  return features_t;
}

export const tensorToUri = async (tensor: tf.Tensor) => {
  return base64ToDataUri(await toBase64(tensor));
}

export const tensorToImage64 = async (inputTensor: tf.Tensor) => {

  const channel_t = inputTensor.rank > 3 ? tf.squeeze(inputTensor) : inputTensor
  const [H, W] = channel_t.shape;

  const res = tf.tidy(() => {
    // # Get rid of extra dimensions

    // # Rescale in range 0 - 255
    const min_value_t = tf.min(inputTensor);
    const max_value_t = tf.max(inputTensor);




    const channel_t_squeeze_ = tf.mul(
      tf.div(tf.sub(channel_t, min_value_t), tf.sub(max_value_t, min_value_t)),
      tf.scalar(255),
    );
    // console.log(channel_t_squeeze_.shape)

    // # Cast to int
    const channel_t_squeeze_int = tf.cast(channel_t_squeeze_, 'int32');

    // # Repeat the tensor along channel dimension
    const channel_t_ = channel_t_squeeze_int.shape.length === 2 ? tf.stack(
      [channel_t_squeeze_int, channel_t_squeeze_int, channel_t_squeeze_int],
      2,
    ) : channel_t_squeeze_int;

    // # Add alpha channel
    const alpha_channel_t = tf.mul(tf.ones([H, W]), 255);

    // # Stack alpha channel
    const res = tf.concat([channel_t_, tf.expandDims(alpha_channel_t, 2)], 2);
    return res;
  });

  return await toBase64(res, W, H);
};


export async function tensorToImageUrl_thomas(output_maps_t: tf.Tensor4D) {
  // # Get tensor from numpy array
  // const output_maps_t = tf.compat.v1.convert_to_tensor(output_maps)

  // # Select a single channel
  const channel_t = tf.slice(output_maps_t, [0, 0, 0, 18], [1, -1, -1, 1]);
  const channel_t_squeeze = tf.squeeze(channel_t);

  return await tensorToImage64(channel_t_squeeze);
}

const toBase64 = async (inputTensor, inputW = null, inputH = null) => {

  const tensor = inputTensor.rank > 3 ? tf.squeeze(inputTensor) : inputTensor;
  const [nW, nH] = tensor.shape;
  const W = inputW ?? nW;
  const H = inputH ?? nH;

  const res_flatten = tf.reshape(tensor, [-1]);
  const data = await res_flatten.data();

  const rawImageData = {
    data,
    width: W,
    height: H,
  };

  const jpegImageData = jpeg.encode(rawImageData, 100);
  const base64Encoding = tf.util.decodeString(jpegImageData.data, 'base64');
  return base64Encoding;
};

export async function tensorToImageUrl(
  imageTensor: tf.Tensor4D,
): Promise<string> {
  const [batch, height, width, dim] = imageTensor.shape;
  const tfSquezze = tf.squeeze(imageTensor);
  const imagesTf = tf.unstack(tfSquezze, 2);
  const image18 = imagesTf[18];

  const buffer = await image18.data();
  const frameData = new Uint8Array(width * height * 4);
  let offset = 0;
  for (let i = 0; i < frameData.length; i += 4) {
    const val = Math.round(buffer[offset] * 255);
    frameData[i] = val;
    frameData[i + 1] = val;
    frameData[i + 2] = val;
    frameData[i + 3] = 0xff;
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
const dummyEllipse = {
  x_mean: 1254.9028132992328,
  y_mean: 3054.593350383632,
  a: 61.2111238178404,
  b: 56.25621517756661,
  sU: [
    0.10865521189821306,
    0.994079496281537,
    0.9940794962815371,
    -0.10865521189821307,
  ],
};
export type EllipseType = Partial<typeof dummyEllipse>;
/**
 *  Draws the ellipse representing the tennis ball mask using only the tf library.
    :param ball_dict: dictionary containing the coordinates of the tennis ball as returned by the "detect" function.
    :param resolution: resolution of the input image.
    :return: binary mask of the tennis ball.

 * */

export const draw_ellipse_full_tf = async ({ ellipseParams, resolution }) => {
  const mask_t = tf.tidy(() => {
    const { x_mean: x_c, y_mean: y_c, a, b, sU: U } = ellipseParams;
    // console.log('x_c, y_c, a, b, U, resolution', x_c, y_c, a, b, U, resolution);
    const x_c_t = tf.scalar(x_c);
    const y_c_t = tf.scalar(y_c);
    const a_t = tf.scalar(a);
    const b_t = tf.scalar(b);

    let x_t = tf.linspace(0, resolution[1], resolution[1] + 1);
    let y_t = tf.linspace(0, resolution[0], resolution[0] + 1);

    //# Extract orientation of the ellipse
    // const U_t = tf.tensor(U); //.as2D(2, 2);
    const U_t = tf.tensor(U).as2D(2, 2);

    // console.log('U_t', U_t);

    //Compute angle using the fact that all norms are one and projection on e1 and   e2
    const cos_a_t = tf.squeeze(tf.slice(U_t, [0, 0], [1, 1]));
    const sin_a_t = tf.squeeze(tf.slice(U_t, [1, 0], [1, 1]));

    x_t = tf.linspace(0, resolution[1] - 1, resolution[1]);
    y_t = tf.linspace(0, resolution[0] - 1, resolution[0]);

    const x_grid_t = tf.tile(tf.expandDims(x_t, 0), [resolution[0], 1]);
    const y_grid_t = tf.tile(tf.expandDims(y_t, 1), [1, resolution[1]]);

    // Compute the distance
    const dist_tmp1 = tf.pow(
      tf.div(
        tf.add(
          tf.mul(tf.sub(x_grid_t, x_c_t), cos_a_t),
          tf.mul(tf.sub(y_grid_t, y_c_t), sin_a_t),
        ),
        a_t,
      ),
      2,
    );
    const dist_tmp2 = tf.pow(
      tf.div(
        tf.sub(
          tf.mul(tf.sub(x_grid_t, x_c_t), sin_a_t),
          tf.mul(tf.sub(y_grid_t, y_c_t), cos_a_t),
        ),
        b_t,
      ),
      2,
    );
    const distance_sq_t = tf.add(dist_tmp1, dist_tmp2);

    const condShape = distance_sq_t.shape as [number, number];
    const mask_t: tf.Tensor2D = tf.where(
      distance_sq_t.lessEqual(tf.scalar(1.0)),
      tf.ones(condShape),
      tf.zeros(condShape),
    );
    // console.log(` mask_t min_value_t ${tf.min(mask_t)}`)
    // console.log(` mask_t max_value_t ${tf.max(mask_t)}`)
    return mask_t;
  });

  return { base64: await tensorToImage64(mask_t), ballMask: mask_t };
};

export const loadModel = async ({
  modelJson,
  modelWeights,
  loadLayer = false,
}) => {
  try {
    await tf.ready();
    // console.log('tf ready');

    const startTimeModel = Date.now();
    const tfLoader = loadLayer ? tf.loadGraphModel : tf.loadLayersModel;
    const model = await tfLoader(bundleResourceIO(modelJson, modelWeights));
    console.log(`loading model in ${Date.now() - startTimeModel}`);
    return model;
  } catch (err) {
    console.log('error loading model', err);
  }
};


/**
 * Rescales an image with padding using tensorflow functionalities.
 * */

export const rescaleImageWithPadding = ({ image, resolution }: { image: tf.Tensor, resolution: [number, number] }) => {

  const inputImage = image.rank === 4 ? tf.squeeze(image) : image
  const [H, W, C] = inputImage.shape;
  const dim = Math.max(H, W);
  const vertical_pad_up = Math.floor((dim - H) / 2);
  const vertical_pad_down = dim - H - vertical_pad_up
  const horizontal_pad_left = Math.floor((dim - W) / 2)
  const horizontal_pad_right = dim - W - horizontal_pad_left
  const image_t = inputImage; //tf.convert_to_tensor(image)
  const paddings_t: [number, number][] = [[vertical_pad_up, vertical_pad_down], [horizontal_pad_left, horizontal_pad_right], [0, 0]]
  const padded_image_t = tf.pad(image_t, paddings_t)

  const padded_image_t_expanded: tf.Tensor4D = tf.expandDims(padded_image_t, 0)
  const padded_image_t_resized = tf.image.resizeNearestNeighbor(padded_image_t_expanded, resolution)
  return padded_image_t_resized;
}