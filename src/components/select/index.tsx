
import React, { useState } from 'react';
import { Button, Select, Div, Text } from 'react-native-magnus'
const STANDING_KID = 'Standing';
const LYING_KID = 'Lying';

const DATA_STANDING = [
    STANDING_KID,
    LYING_KID
];

const MySelect = () => {
    const [selectValue, setSelectedValue] = useState(DATA_STANDING[0]);
    const selectRef: React.RefObject<any> = React.createRef()
    const onSelect = (option) => {
        setSelectedValue(`${option} kid`)
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
            data={DATA_STANDING}
            renderItem={(item, index) => (
                <Select.Option value={item} py="md" px="xl">
                    <Text>{item}</Text>
                </Select.Option>
            )}
        ></Select.Container>
    </Div>


}

export default MySelect