import React from 'react';
import {Text} from 'react-native-magnus';

const TextInstruction = ({children}) => (
  <Text fontWeight="bold" fontSize="cl">
    {children}
  </Text>
);

export default TextInstruction;
