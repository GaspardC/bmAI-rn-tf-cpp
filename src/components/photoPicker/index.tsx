import React, {
  useState,
  useImperativeHandle,
  Fragment,
  useEffect,
  forwardRef,
} from 'react';
import { Image, Button } from 'react-native-magnus';
import { DivRow } from '../layout';
import ImagePicker from 'react-native-image-picker';
import {
  rotateImageIfNeeded,
  getFilePath,
  loadRemotely,
} from '../../utils/uriHelper';
import { resizeImage } from '../../utils/tf_utils';
import { isDev } from '../../utils/index';

const TEST_IMGS = [
  'https://firebasestorage.googleapis.com/v0/b/gasp-26943.appspot.com/o/ball.jpg?alt=media&token=ede33521-cf9a-4f01-99a0-3d02cd5789ad',
  'https://firebasestorage.googleapis.com/v0/b/gasp-26943.appspot.com/o/bmai_02010513310.jpg?alt=media&token=bc395c98-82b1-4879-b125-bf6065c28ba2',
  'https://firebasestorage.googleapis.com/v0/b/gasp-26943.appspot.com/o/bmai_02010513315-F_0.jpg?alt=media&token=5f26e625-c273-461f-b06d-77baa579b28e',
  'https://firebasestorage.googleapis.com/v0/b/gasp-26943.appspot.com/o/bmai_02010513319-F_0.jpg?alt=media&token=e0b50e4b-5865-4450-9cdd-faed7e2f8f69',
  'https://firebasestorage.googleapis.com/v0/b/gasp-26943.appspot.com/o/bmai_02010513320-F_0.jpg?alt=media&token=206095d8-7ccc-468a-a292-bd8315aa28ec',
  'https://firebasestorage.googleapis.com/v0/b/gasp-26943.appspot.com/o/bmai_02010513336-F_0.jpg?alt=media&token=3e0e32c9-534f-4d82-aefb-a6104a4bccee',
  'https://firebasestorage.googleapis.com/v0/b/gasp-26943.appspot.com/o/bmai_02010513337-F_0.jpg?alt=media&token=74b77411-aa47-4bcb-99d0-4416716f04cc',
  'https://firebasestorage.googleapis.com/v0/b/gasp-26943.appspot.com/o/bmai_02010513318-F_0.jpg?alt=media&token=6cfb2867-e3b4-49a8-84f8-af651309c8a8',
  'https://firebasestorage.googleapis.com/v0/b/gasp-26943.appspot.com/o/bmai_02010513317-F_0.jpg?alt=media&token=8ee3815a-f557-4a50-9454-3dc22777efb9',
];

export const imageDefaultRemote = {
  uri: 'https://firebasestorage.googleapis.com/v0/b/gasp-26943.appspot.com/o/bmai_child_censored.png?alt=media&token=151411f2-d983-4ab0-9991-58cdc98a9c3c',//'https://i.imgur.com/MlFb9rY.jpg',
  height: 0,
  width: 0,
};

export const getAllTestImg = TEST_IMGS.map((url) => ({
  uri: url,
  height: 0,
  width: 0,
}));
export const RESIZE_HEIGHT = 700;

const PhotoPicker = forwardRef(({ resetToDefault: resetToDefaultProps }: any, ref) => {
  const [imageSource, setImageSource] = useState(imageDefaultRemote);
  const [imageDefault, setImageDefault] = useState(imageDefaultRemote);

  const getImageSource = async (imageSourceProps?) => {
    const imageSource = imageSourceProps ?? await getImageDefault();
    // console.log('image source', imageSource);
    if (imageSource?.uri != null) return imageSource;
    const sourceFile = await getFilePath(imageDefault);
    return await resizeImage(sourceFile, RESIZE_HEIGHT);
  };

  const mount = async () => {
    const imageLoaded = await getImageDefault();
    //@ts-ignore
    setImageDefault(imageLoaded);

    getImageSource(imageLoaded)
      .then((res) => {
        setImageSource(res);
      })
      .catch((e) => console.log(e));
  };

  const resetToDefault = resetToDefaultProps ? resetToDefaultProps : mount;

  useImperativeHandle(
    ref,
    () => ({
      imageSource,
      getImageSource,
      setImageSource,
      resetToDefault: mount,
    }),
    [imageSource],
  );

  useEffect(() => {
    mount();
  }, []);

  const openPicker = () => {
    resetToDefault ? resetToDefault({}) : mount();
    const options = {
      noData: true,
      maxHeight: RESIZE_HEIGHT,
      maxWidth: RESIZE_HEIGHT,
    };
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
        const image = await rotateImageIfNeeded(
          await resizeImage(response.uri, RESIZE_HEIGHT),
        );
        const source = {
          path: image.uri, //isIos() ? image.uri : response.path,
          ...image,
          uriBoth: image.uri, // isIos() ? image.uri : 'file://' + response.path,
        };

        // You can also display the image using data:
        // const source = { uri: 'data:image/jpeg;base64,' + response.data };
        const logSource = { ...source };
        delete logSource['base64'];
        console.log('source is ', logSource);

        setImageSource(source);
        // run(source)
      }
    });
  };

  return (
    <Fragment>
      <DivRow>
        {imageSource?.uri != null && (
          <Image
            {...{ source: { uri: imageSource.uri }, resizeMode: 'contain' }}
            h={200}
            w={200}></Image>
        )}
      </DivRow>
      <DivRow justifyContent="space-around">
        <Button
          {...{ onPress: openPicker, underlayColor: 'blue100' }}
          bg="white"
          borderWidth={1}
          borderColor="blue500"
          w="45%"
          color="blue500">
          Chose another one
        </Button>
        <Button
          {...{ onPress: resetToDefault, underlayColor: 'red100' }}
          bg="white"
          borderWidth={1}
          borderColor="red500"
          w="45%"
          color="red500">
          Reset
        </Button>
      </DivRow>
    </Fragment>
  );
});
export default PhotoPicker;

export const getImageDefault = (uri?) => {
  return loadRemotely(uri ? uri : imageDefaultRemote.uri);
};
