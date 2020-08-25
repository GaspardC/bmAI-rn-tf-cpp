import React, {useRef, useState} from 'react';
import {ScrollView, SafeAreaView, StyleSheet} from 'react-native';
import {Div, Image, Text, Button} from 'react-native-magnus';
import TextInstruction from '../components/text/instruction';
import PhotoPicker from '../components/photoPicker';
import {DivRow} from '../components/layout';
import {isEmpty} from 'lodash';

const CnnPage = () => {
  const photoPickerRef = useRef({});

  const [tennisBallRes, setTennisBallRes] = useState<{
    res?: EllipseType;
    loading?: boolean;
    error?: string;
  }>({res: {}, loading: false, error: ''});

  const resetToDefault = () => {};
  const run = () => {};

  return (
    <ScrollView style={styles.scrollView}>
      <SafeAreaView>
        <Div p={'lg'}>
          <Div>
            <TextInstruction>1. Chose a photo :</TextInstruction>
            <PhotoPicker ref={photoPickerRef} {...{resetToDefault}} />
            <TextInstruction>2. Run the algorithm:</TextInstruction>

            {/* <DivRow justifyContent="space-around">
              <Button
                {...{onPress: run, underlayColor: 'green500'}}
                bg="white"
                borderWidth={1}
                borderColor="green500"
                color="green500">
                Run
              </Button>
            </DivRow>
            <TextInstruction>3. Tennis ball detection</TextInstruction> */}
            {/* <DivRow>
              {tennisBallRes.loading && <ActivityIndicator />}
              {!tennisBallRes.loading && tennisBallRes.res?.a !== -1 && (
                <>
                  {!isEmpty(tennisBallRes.error) && (
                    <Text>{logError(tennisBallRes.error)}</Text>
                  )}
                  {!isEmpty(tennisBallRes.res) && (
                    <Text>{JSON.stringify(tennisBallRes.res)}</Text>
                  )}
                </>
              )}
              {tennisBallRes.res?.a === -1 && <Text>No tennis ball found</Text>}
            </DivRow> */}
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
