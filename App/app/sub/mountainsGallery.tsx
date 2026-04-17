import { Colors } from "@/constants/theme";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, Dimensions, FlatList, Image, ListRenderItemInfo, Pressable, StyleSheet, Text, View } from "react-native";
import { Mountain } from "../(tabs)/mountains";

const c = Colors.light;

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

    return(
        <View style={styles.screen}>
            {mountain !== null && <View style={styles.topRow}>
                <Pressable style={styles.button} onPress={() => {back()}}>
                    <Text style={styles.buttonText}>
                        {"Back"}
                    </Text>
                </Pressable>
                <Text style={styles.pageTitle}>
                    {mountain.name}
                </Text>
            </View>}
            <View style={styles.galleryShell}>
                <FlatList
                    horizontal
                    snapToAlignment="start"
                    snapToInterval={width}
                    data={urls}
                    renderItem={mountainImage}
                    viewabilityConfig={viewabilityConfig}
                    onViewableItemsChanged={onViewableItemsChanged}
                    style={styles.carousel}
                />
                <Text style={styles.indexLabel}>
                    {visibleIndex + 1}
                </Text>
            </View>
            {mountain !== null && <View style={styles.detailCard}>
                <Text style={styles.pageSubtitle}>
                    Mountain details
                </Text>
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
    pageSubtitle: {
        fontSize: 28,
        fontWeight: "700",
        color: c.heading,
        marginBottom: 10,
    },
    bodyText: {
        fontSize: 15,
        lineHeight: 22,
        color: c.subtitle,
    },
    galleryShell: {
        flex: 1,
        marginBottom: 16,
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
    indexLabel: {
        fontSize: 14,
        color: c.icon,
        marginTop: 10,
        textAlign: "center",
    },
    button: {
        minWidth: 76,
        minHeight: 42,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: c.tint,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: {
        color: c.onPrimary,
        fontSize: 14,
        fontWeight: "700",
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
