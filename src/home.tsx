

// 1. detect tennis ball
// 2. ellipse
// 3. skeletton
// 4. full tf
// chose photo: chose another photo or reset

import React from 'react'
import { ScrollView, StyleSheet } from 'react-native';
import { Div, Image, Text, Button } from 'react-native-magnus';
import { useState } from 'react';
const imageDefault = require('./assets/images/ball2.jpg');

const Home = () => {
    const [imageSource, setImageSrouce] = useState(imageDefault)
    return <ScrollView style={styles.scrollView}>
        <Div p={'lg'}>
            <Div>
                <TextInstruction>1. Chose an image :</TextInstruction>
                <DivRow>
                    <Image source={imageSource} h={200} w={200} resizeMode="contain"></Image>
                </DivRow>
                <DivRow justifyContent="space-around">
                    <Button bg="white" borderWidth={1} borderColor="blue500" color="blue500" underlayColor="blue100">Chose another one</Button>
                    <Button bg="white" borderWidth={1} borderColor="red500" color="red500" underlayColor="red100">Reset to default</Button>
                </DivRow>
                <TextInstruction>2. Run the algorithm:</TextInstruction>

                <DivRow justifyContent="space-around">
                    <Button bg="white" borderWidth={1} borderColor="green500" color="green500" underlayColor="green500">Run</Button>

                </DivRow>
                <TextInstruction>3. Tennis ball detection</TextInstruction>
                <TextInstruction>4. Ellipse mask tennis ball</TextInstruction>
                <TextInstruction>5. Skeletton</TextInstruction>
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