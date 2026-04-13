import { useEffect, useState } from "react";
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Mountain } from "../(tabs)/mountains";

function MountainsGallery({id, back}: {id: string | null, back: Function}) {

    const [mountain, setMountain] = useState<Mountain | null>(null);

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

    return(
        <View style={{flex: 1}}>
            {mountain !== null && <View>
                <View style={{flexDirection: "row"}}>
                    <TouchableOpacity onPress={() => {back()}}>
                        <Text>
                            Back
                        </Text>
                    </TouchableOpacity>
                    <Text>
                        {mountain.name}
                    </Text>
                </View>
                <View>
                    <FlatList
                        horizontal
                        data={mountain.image_presigned_url}
                        renderItem={({item}) => <Image style={styles.img} source={{uri: item}} />}
                    />
                </View>
                <View>
                    <Text>
                        {mountain.description}
                    </Text>
                </View>
            </View>}
        </View>
    );
}

const {width, height} = Dimensions.get('screen');

const styles = StyleSheet.create({
    img: {
        width: width,
        height: width,
        resizeMode: 'stretch',
    },
});

export default MountainsGallery
