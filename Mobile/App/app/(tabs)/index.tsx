import {StyleSheet, Text, View, FlatList} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

const c = Colors.light;

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
    <View style={[styles.item, {flexDirection: 'row', flex: 1, backgroundColor: c.surface}]}>
        <View style={{flex: 5}}>
            <Text style={{fontSize: 24, color: c.heading}}>{mountain.name}</Text>
            <Text style={{fontSize: 18, color: c.subtitle}}>{mountain.location}</Text>
            <Text style={{fontSize: 18, color: c.subtitle}}>{mountain.peak}</Text>
        </View>
        <View style={{flex: 3, backgroundColor: c.surfaceMuted}}></View>
    </View>
);

function climbs() {

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: c.background}} edges={['top']}>
            <View style={{flex: 1, backgroundColor: c.background}}>
                <View style={{flex: 1, backgroundColor: c.background}}>
                    <Text style={styles.label}>Climbs</Text>
                </View>
                <View style={{flex: 9, padding: 10, backgroundColor: c.background}}>
                    <Text style={styles.label}>Choose a mountain</Text>
                    <FlatList
                        data={dataList}
                        renderItem={({item}) => <Item mountain={item} />}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    label: {
        textAlign: 'center',
        fontSize: 32,
        color: c.heading,
    },
    item: {
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
        borderRadius: 12,
    }
});

export default climbs;
