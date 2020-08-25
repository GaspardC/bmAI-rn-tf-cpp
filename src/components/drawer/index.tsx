import React, {createRef} from 'react';
import {Drawer, Button} from 'react-native-magnus';

export const drawerRef = useRef();

const Menu = () => {
  return <Drawer ref={drawerRef} />;
};
export default Menu;

export const DrawerButton = () => {
  return (
    <Button
      {...{
        underlayColor: 'green500',
        onPress: () => {
          if (drawerRef.current) {
            drawerRef.current.open();
          }
        },
      }}
      bg="white"
      borderWidth={1}
      borderColor="green500"
      color="green500">
      Run
    </Button>
  );
};
