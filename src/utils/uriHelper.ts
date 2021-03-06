import RNFS from 'react-native-fs';
import { Asset } from 'expo-asset';
import AssetUtils from 'expo-asset-utils';
import * as ImageManipulator from 'expo-image-manipulator';
import { RESIZE_HEIGHT } from '../components/photoPicker/index';
import { resizeImage } from './tf_utils';

function getFilename(source_uri) {
  try {
    let filePortion = '';
    if (source_uri.lastIndexOf('?') != -1) {
      filePortion = source_uri.substring(
        source_uri.lastIndexOf('/'),
        source_uri.lastIndexOf('?'),
      );
    } else {
      filePortion = source_uri.substring(source_uri.lastIndexOf('/'));
    }
    if (RNFS) {
      return RNFS.DocumentDirectoryPath + filePortion;
    } else {
      console.error('RNFS is null filePortion is: ' + filePortion);
      return '';
    }
  } catch (e) {
    console.log(e);
  }
}

export const loadRemotely = async (uri): Promise<InstanceType<typeof Asset>> => {
  const { uri: resizedUri, base64, width, height } = await resizeImage(uri, RESIZE_HEIGHT);
  return AssetUtils.resolveAsync(resizedUri);
};

export const getBase64FromUri = uri => AssetUtils.base64forImageUriAsync(uri)

export const getFilePath = async (image) => {
  const asset = Asset.fromModule(image);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri;
  return uri;
};

export const getFileUri = async (path): Promise<string> => {
  const asset = Asset.fromURI(path);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const localUri = asset.localUri;
  return localUri;
};

export async function downloadAssetSource(uri) {
  return new Promise((resolve, reject) => {
    const filename = getFilename(uri);
    RNFS.exists(filename)
      .then((itExists) => {
        if (itExists) {
          RNFS.unlink(filename)
            .then(() => { })
            .catch((err) => {
              console.error(err);
              reject('Unable to unlink file at: ' + filename);
            });
        }
        const ret = RNFS.downloadFile({
          fromUrl: uri,
          toFile: filename,
        });

        ret.promise
          .then((res) => {
            console.log('statusCode is: ' + res.statusCode);
            if (res.statusCode === 200) {
              resolve(filename);
            } else {
              reject(
                'File at ' +
                filename +
                ' not downloaded.  Status code: ' +
                res.statusCode,
              );
            }
          })
          .catch((err) => {
            console.error(err);
            reject('File at ' + filename + ' not downloaded');
          });
      })
      .catch((err) => {
        console.error(err);
        reject('File at ' + filename + ' not downloaded');
      });
  });
}

export const rotateImageIfNeeded = async (image) => {
  if (image.width < image.height) return image;
  const manipResult = await ImageManipulator.manipulateAsync(
    image.localUri || image.uri,
    [{ rotate: 90 }, { flip: ImageManipulator.FlipType.Vertical }],
  );
  return manipResult;
};


export function base64ToDataUri(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}

export const uriToBase64Uri = base64Uri => base64Uri.replace('data:image/jpeg;base64', '')