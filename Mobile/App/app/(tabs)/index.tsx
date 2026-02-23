import {StyleSheet, Text, View, FlatList} from 'react-native';

// mock mountain data
const dataList = [
    {
        name: "Mt. Bierstadt",
        location: "Colorado, USA",
        peak: "14,066 ft",
    },
    {
        name: "Lobuche Peak",
        location: "Himalayan Mountains, Nepal",
        peak: "20,075 ft",
    },
    {
        name: "Mt. Bierstadt",
        location: "Colorado, USA",
        peak: "14,066 ft",
    },
    {
        name: "Lobuche Peak",
        location: "Himalayan Mountains, Nepal",
        peak: "20,075 ft",
    },
    {
        name: "Mt. Bierstadt",
        location: "Colorado, USA",
        peak: "14,066 ft",
    },
    {
        name: "Lobuche Peak",
        location: "Himalayan Mountains, Nepal",
        peak: "20,075 ft",
    },
];

const Item = ({ mountain }: { mountain: { name: string; location: string; peak: string } }) => (
    <View style={[styles.item, {flexDirection: 'row', flex: 1, backgroundColor: 'powderblue'}]}>
        <View style={{flex: 5}}>
            <Text style={{fontSize: 24}}>{mountain.name}</Text>
            <Text style={{fontSize: 18}}>{mountain.location}</Text>
            <Text style={{fontSize: 18}}>{mountain.peak}</Text>
        </View>
        <View style={{flex: 3, backgroundColor: 'red'}}></View>
    </View>
);

function climbs() {

    return (
        <View style={{flex: 1}}>
            <View style={{flex: 1, backgroundColor: 'powderblue'}}>
                <Text style={styles.label}>Climbs</Text>
            </View>
            <View style={{flex: 9, padding: 10, backgroundColor: 'blue'}}>
                <Text style={styles.label}>Choose a mountain</Text>
                <FlatList
                    data={dataList}
                    renderItem={({item}) => <Item mountain={item} />}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    label: {
        textAlign: 'center',
        fontSize: 32,
    },
    item: {
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
    }
});

export default climbs;