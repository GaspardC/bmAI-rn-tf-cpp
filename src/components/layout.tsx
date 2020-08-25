import {Div, Image, Text, Button} from 'react-native-magnus';
import React from 'react';

export const DivRow = ({children, ...otherProps}) => (
  <Div row justifyContent="center" my="lg" {...otherProps}>
    {children}
  </Div>
);
