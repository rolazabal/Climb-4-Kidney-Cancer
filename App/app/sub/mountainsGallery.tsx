import { MOUNTAINS_URL, THEME_COLORS } from "@/constants/api";
import { useCallback, useEffect, useState, useRef } from "react";
import { BackHandler, Dimensions, FlatList, Image, ListRenderItemInfo, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Mountain } from "../(tabs)/mountains";
import { ChevronLeft } from "lucide-react-native";

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
            let res = await fetch(MOUNTAINS_URL + '/' + id, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.status !== 200) {
                back();
                console.log('Mountain fetch failed:', res.status);
                return;
            }
            let data = await res.json();
            setMountain(data);
        };
        // get mountain images
        const getUrls = async() => {
            let res = await fetch(MOUNTAINS_URL + '/' + id + '/gallery', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.status !== 200) {
                return;
            }
            let data = await res.json();
            setUrls(data.urls);
            //console.log(data.urls);
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
        waitForInteraction: false,
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
                <TouchableOpacity style={[styles.button]} onPress={() => {back()}}>
                    <ChevronLeft size={30} color={THEME_COLORS.white} />
                </TouchableOpacity>
                <Text style={[{flex: 7, marginHorizontal: 10}, styles.label]}>
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
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center'}}>
                {urls?.map((url, index) => (
                    <TouchableOpacity onPress={() => selectIndex(index)} style={[styles.radio, {backgroundColor: (visibleIndex !== index) ? THEME_COLORS.primary : THEME_COLORS.accent}]} key={index} />
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
        width: 50,
        height: 50,
        borderRadius: '50%',
        padding: 10,
        backgroundColor: THEME_COLORS.accent
    },
    radio: {
        width: 15,
        height: 15,
        alignItems: 'center',
        margin: 10,
        borderRadius: '50%',
    }
});

export default MountainsGallery
