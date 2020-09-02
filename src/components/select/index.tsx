
import React, { useState } from 'react';
import { Button, Select, Div, Text } from 'react-native-magnus'

export const STANDING_KID = 'Standing';
export const LYING_KID = 'Lying';

export const DATA_STANDING = [
    STANDING_KID,
    LYING_KID
];
export const INIT_CHILD_MODE = DATA_STANDING[0]

const MySelect = ({ onSelect: onSelectProps }) => {
    const [selectValue, setSelectedValue] = useState(INIT_CHILD_MODE);
    const selectRef: React.RefObject<any> = React.createRef()
    const onSelect = (option) => {
        setSelectedValue(`${option} kid`)
        onSelectProps(option)
    }

    return <Div>
        <Button
            flex={1}
            block
            borderWidth={1}
            my='xl'
            bg="white"
            color="gray900"
            borderColor="gray300"
            {...{
                onPress: () => {
                    if (selectRef.current) {
                        selectRef.current.open();
                    }
                }
            }}
        >
            {selectValue ?? 'Select'}
        </Button>
        <Select.Container
            onSelect={onSelect}
            ref={selectRef}
            value={selectValue}
            title="Is the kid standing or lying ?"
            mt="md"
            pb="2xl"
            mb="2xl"
            message="This is the long message used to set some context"
            roundedTop="xl"
            footer={<Div row justifyContent='center' ><Button
                {...{ onPress: () => selectRef.current.close() }}
                mt="lg"
                w={300}
                h={40}
                ml="md"
                px="xl"
                py="lg"
                bg="green500"
                rounded="circle"
                color="white"
                shadow={2}
            >
                choisir
              </Button></Div>}
            data={DATA_STANDING}
            renderItem={(item, index) => (
                <Select.Option value={item} py="md" px="xl">
                    <Text>{item}</Text>
                </Select.Option>
            )}
        ></Select.Container>
    </Div >


}

export default MySelect