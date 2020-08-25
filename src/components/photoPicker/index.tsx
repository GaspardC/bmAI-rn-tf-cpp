import React, {
  useState,
  useImperativeHandle,
  Fragment,
  useRef,
  useEffect,
  forwardRef,
} from 'react';
import {Div, Image, Text, Button} from 'react-native-magnus';
import {DivRow} from '../layout';
import ImagePicker from 'react-native-image-picker';
import {
  rotateImageIfNeeded,
  getFilePath,
  loadRemotely,
} from '../../utils/uriHelper';
import {resizeImage} from '../../utils/tf_utils';

const imageDefaultRemote = {
  uri: 'https://i.imgur.com/MlFb9rY.jpg',
  height: 0,
  width: 0,
};
export const RESIZE_HEIGHT = 700;

const PhotoPicker = forwardRef(({resetToDefault}, ref) => {
  const [imageSource, setImageSource] = useState(imageDefaultRemote);
  const [imageDefault, setImageDefault] = useState(imageDefaultRemote);

  const getImageSource = async (imageSource) => {
    console.log('image source', imageSource);
    if (imageSource?.uri != null) return imageSource;
    const sourceFile = await getFilePath(imageDefault);
    return await resizeImage(sourceFile, RESIZE_HEIGHT);
  };

  useImperativeHandle(
    ref,
    () => ({
      imageSource,
      getImageSource,
      setImageSource,
    }),
    [imageSource],
  );

  useEffect(() => {
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
    mount();
  }, []);

  const openPicker = () => {
    resetToDefault({});
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
        const logSource = {...source};
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
            {...{source: {uri: imageSource.uri}, resizeMode: 'contain'}}
            h={200}
            w={200}></Image>
        )}
      </DivRow>
      <DivRow justifyContent="space-around">
        <Button
          {...{onPress: openPicker, underlayColor: 'blue100'}}
          bg="white"
          borderWidth={1}
          borderColor="blue500"
          w="45%"
          color="blue500">
          Chose another one
        </Button>
        <Button
          {...{onPress: resetToDefault, underlayColor: 'red100'}}
          bg="white"
          borderWidth={1}
          borderColor="red500"
          w="45%"
          color="red500">
          Reset to default
        </Button>
      </DivRow>
    </Fragment>
  );
});
export default PhotoPicker;

const getImageDefault = () => {
  return loadRemotely(imageDefaultRemote.uri);
};
