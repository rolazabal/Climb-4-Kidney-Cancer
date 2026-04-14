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
                        data={[1]}
                        renderItem={({item}) => <Image style={styles.img} source={{uri: "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fstatic.vecteezy.com%2Fsystem%2Fresources%2Fpreviews%2F012%2F168%2F187%2Flarge_2x%2Fbeautiful-sunset-on-the-beach-with-palm-tree-for-travel-and-vacation-free-photo.JPG&f=1&nofb=1&ipt=17a644e042b90a73a2d8aa295d51bed71101dc75cb7c23525ba5c87435cf3371"}} />}
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
