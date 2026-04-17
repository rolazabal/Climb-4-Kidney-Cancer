import { THEME_COLORS } from "@/constants/api";
import { useCallback, useEffect, useState, useRef } from "react";
import { BackHandler, Dimensions, FlatList, Image, ListRenderItemInfo, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Mountain } from "../(tabs)/mountains";

function MountainsGallery({id, back}: {id: string | null, back: Function}) {

    const [mountain, setMountain] = useState<Mountain | null>(null);
    const [urls, setUrls] = useState<string[] | null>(null);

    const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        function() {
            back();
        }
    );

    useEffect(() => {
    	// get mountain data
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
        // get mountain images
        const getUrls = async() => {
            let res = await fetch('https://mountains-service-production.up.railway.app/mountains/' + id + '/gallery', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.status !== 200) {
                return;
            }
            let data = await res.json();
            setUrls(data.urls);
            console.log(data.urls);
        }
        if (id !== null && mountain === null) {
            getMountain();
            getUrls();
        }
    }, []);

    // image picker stuff
    const [visibleIndex, setVisibleIndex] = useState(0);

    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length < 1) {
            return;
        }
        setVisibleIndex(viewableItems[0].index);
    }, []);

    const mountainImage = (info: ListRenderItemInfo<string>) => (
        <Image style={styles.img} source={{uri: info.item}} />
    );

    const viewabilityConfig = {
        viewAreaCoveragePercentThreshold: 90,
        waitForInteraction: true,
    };

    const listRef = useRef<FlatList | null>(null);

    function selectIndex(index: number) {
        if (listRef.current === null) {
            return;
        }
        listRef.current.scrollToOffset({offset: index * width, animated: true});
    }

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
            <View style={{flex: 8}}>
                <FlatList
                    ref={listRef}
                    horizontal
                    snapToAlignment="start"
                    snapToInterval={width}
                    data={urls}
                    renderItem={mountainImage}
                    viewabilityConfig={viewabilityConfig}
                    onViewableItemsChanged={onViewableItemsChanged}
                    style={{borderRadius: 10}}
                />
            </View>
            <View style={{flex: 1, flexDirection: 'row', paddingHorizontal: 30}}>
                {urls?.map((url, index) => (
                    index === visibleIndex ? 
                        <TouchableOpacity onPress={() => selectIndex(index)} style={[styles.radio, {backgroundColor: 'red'}]} key={index}></TouchableOpacity>
                    : 
                        <TouchableOpacity onPress={() => selectIndex(index)} style={[styles.radio, {backgroundColor: 'blue'}]} key={index}></TouchableOpacity>
                ))}
            </View>
            {mountain !== null && <View style={{flex: 5}}>
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
    },
    radio: {
        flex: 1,
        borderRadius: 20
    }
});

export default MountainsGallery
