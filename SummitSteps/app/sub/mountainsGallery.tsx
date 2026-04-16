import { THEME_COLORS } from "@/constants/api";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Mountain } from "../(tabs)/mountains";

function MountainsGallery({id, back}: {id: string | null, back: Function}) {

    const [mountain, setMountain] = useState<Mountain | null>(null);

    const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        function() {
            back();
        }
    );

    useEffect(() => {
    	// get mountain data and images
        const getMountain = async () => {
            let res = await fetch('https://mountains-service-production.up.railway.app/mountains/' + id, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.status !== 200) {
                console.log('Mountain fetch failed:', res.status);
                return;
            }
            let data = await res.json();
            setMountain(data);
        };
        if (id !== null && mountain === null) {
            getMountain();
        }
    }, []);

    const [visibleIndex, setVisibleIndex] = useState(0);

    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length < 1) {
            return;
        }
        setVisibleIndex(viewableItems[0].index);
    }, []);

    const mountainImage = ({ image }) => (
        <Image style={styles.img} source={{uri: "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fstatic.vecteezy.com%2Fsystem%2Fresources%2Fpreviews%2F012%2F168%2F187%2Flarge_2x%2Fbeautiful-sunset-on-the-beach-with-palm-tree-for-travel-and-vacation-free-photo.JPG&f=1&nofb=1&ipt=17a644e042b90a73a2d8aa295d51bed71101dc75cb7c23525ba5c87435cf3371"}} />
    );

    const viewabilityConfig = {
        viewAreaCoveragePercentThreshold: 90,
        waitForInteraction: true,
    };

    return(
        <View style={{flex: 1, margin: 10}}>
            {mountain !== null && <View style={{flex: 1, flexDirection: "row", paddingBottom: 10}}>
                <TouchableOpacity style={[{flex: 1}, styles.button]} onPress={() => {back()}}>
                    <Text style={{color: THEME_COLORS.white}}>
                        {"Back"}
                    </Text>
                </TouchableOpacity>
                <Text style={[{flex: 7}, styles.label]}>
                    {mountain.name}
                </Text>
            </View>}
            <View style={{flex: 4}}>
                <FlatList
                    horizontal
                    snapToAlignment="start"
                    snapToInterval={width}
                    data={[{id: '1'}, {id: '2'}, {id: '3'}]}
                    renderItem={(image) => mountainImage(image)}
                    keyExtractor={(item) => item.id}
                    viewabilityConfig={viewabilityConfig}
                    onViewableItemsChanged={onViewableItemsChanged}
                    style={{borderRadius: 10}}
                />
                <Text>
                    {visibleIndex}
                </Text>
            </View>
            {mountain !== null && <View style={{flex: 3}}>
                <Text style={styles.small}>
                    {mountain.description}
                </Text>
            </View>}
        </View>
    );
}

const width = Dimensions.get('screen').width;

const styles = StyleSheet.create({
    label: {
        fontSize: 44,
    },
    small: {
        color: THEME_COLORS.secondary,
        fontSize: 20,
    },
    img: {
        width: width,
        height: width,
        resizeMode: 'cover',
    },
    button: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: THEME_COLORS.accent
    }
});

export default MountainsGallery
