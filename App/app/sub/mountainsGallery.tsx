import { MOUNTAINS_URL } from "@/constants/api";
import { Colors } from "@/constants/theme";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Dimensions, FlatList, Image, ListRenderItemInfo, Pressable, StyleSheet, Text, View, ViewToken } from "react-native";
import { Mountain } from "../(tabs)/mountains";
import { ChevronLeft } from "lucide-react-native";

const c = Colors.light;

function MountainsGallery({id, back}: {id: string | null, back: Function}) {

    const [mountain, setMountain] = useState<Mountain | null>(null);
    const [urls, setUrls] = useState<string[] | null>(null);
    const [visibleIndex, setVisibleIndex] = useState(0);

    const handleBack = useCallback(() => {
        back();
        return true;
    }, [back]);

    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
        return () => subscription.remove();
    }, [handleBack]);

    useEffect(() => {
        if (id === null) {
            return;
        }

        setMountain(null);
        setUrls(null);
        setVisibleIndex(0);

    	// get mountain data
        const getMountain = async () => {
            let res = await fetch(MOUNTAINS_URL + '/' + id, {
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
        getMountain();
        getUrls();
    }, [id]);

    const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length < 1) {
            return;
        }
        setVisibleIndex(viewableItems[0].index ?? 0);
    },
    []
);

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
        <View style={styles.screen}>
            {mountain !== null && <View style={styles.topRow}>
                <Pressable style={styles.button} onPress={() => {back()}}>
                    <ChevronLeft size={24} color={c.onPrimary} />
                </Pressable>
                <Text style={styles.pageTitle}>
                    {mountain.name}
                </Text>
            </View>}
            <View style={styles.galleryShell}>
                <FlatList
                    ref={listRef}
                    horizontal
                    snapToAlignment="start"
                    snapToInterval={width}
                    data={urls}
                    renderItem={mountainImage}
                    viewabilityConfig={viewabilityConfig}
                    onViewableItemsChanged={onViewableItemsChanged}
                    style={styles.carousel}
                />
            </View>
            <View style={styles.dotRow}>
                {urls?.map((url, index) => (
                    <Pressable onPress={() => selectIndex(index)} style={[styles.radio, visibleIndex === index && styles.radioActive]} key={index} />
                ))}
            </View>
            {mountain !== null && <View style={styles.detailCard}>
                <Text style={styles.sectionTitle}>Mountain details</Text>
                <Text style={styles.bodyText}>
                    {mountain.description}
                </Text>
            </View>}
        </View>
    );
}

const width = Dimensions.get('screen').width;

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: c.background,
        padding: 16,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    pageTitle: {
        flex: 1,
        fontSize: 44,
        fontWeight: "700",
        color: c.heading,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: c.heading,
        marginBottom: 10,
    },
    bodyText: {
        color: c.subtitle,
        fontSize: 15,
        lineHeight: 22,
    },
    galleryShell: {
        marginBottom: 12,
    },
    carousel: {
        borderRadius: 14,
    },
    img: {
        width: width,
        height: width,
        resizeMode: 'cover',
        borderRadius: 14,
    },
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.tint,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    dotRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    radio: {
        width: 10,
        height: 10,
        alignItems: 'center',
        margin: 6,
        borderRadius: 5,
        backgroundColor: c.surfaceMuted,
    },
    radioActive: {
        backgroundColor: c.tint,
    },
    detailCard: {
        backgroundColor: c.surface,
        borderRadius: 14,
        padding: 14,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
});

export default MountainsGallery
