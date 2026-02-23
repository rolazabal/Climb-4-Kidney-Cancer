import React, { ReactNode, use } from 'react';
import { AppText } from './_layout';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// install 'lucide-react-native' and 'react-native-svg' first
import { Mountain, MapPin, Play, Pause, RotateCcw, CircleX} from 'lucide-react-native';
import { Background } from '@react-navigation/elements';

// colors
const theme = {
  primary: 'rgb(51, 51, 51)',
  secondary: 'rgb(224, 222, 222)',
  accent: 'rgb(205, 88, 56)',
  white: '#FFFFFF',
  background: 'rgb(128, 128, 128)', // Approximate replacement for gray-500
};

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

interface Mountain {
    name: string;
    location: string;
    peak: string;
}
//how one mountain card looks.
const Item = ({mountain}: {mountain: Mountain}) => (
  <TouchableOpacity style={styles.MountainCard}>
    <View style={[styles.cardBorder]}>
        <View style={{
          width: 60,
          height: 60,
          backgroundColor: theme.accent,
          borderRadius: 12,
          marginRight: 12,
        }}/>
        <View style={{flex: 1}}>
            <AppText style={styles.MountainName}>{mountain.name}</AppText>

            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 3}}>
            <MapPin color={theme.background} size={12} style={{marginRight: 3, marginBottom: -3}}/>

            <AppText style={styles.MountainLocation}>{mountain.location}</AppText>
            </View>
            <AppText style={styles.MountainPeak}>{mountain.peak}</AppText>
        </View>
      </View>
  </TouchableOpacity>
);
//start button.
const StartButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity style={styles.startButton} onPress={onPress}>
      <Play color={theme.white} size={16} />
      <AppText style={styles.startButtonText}>Start</AppText>
    </TouchableOpacity>
  );
//layout
function climbs() {
  const [page, setPage] = React.useState<'start' | 'MountainList'| 'Activities'> ('start');
    return (
       //header with the title "Climbs"
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <AppText style={styles.title}>Climbs</AppText>
        </View>
      {/*Page 1- starting page*/}
      {page === 'start' && (
        <View style={styles.container}>
            <View style={{backgroundColor: theme.secondary}}>
                <AppText style={styles.sectionTitle}>Start Your Journey to the Summit!</AppText>
            </View> 
            <View style={{flex: 1, paddingHorizontal: 10, paddingTop: 5, backgroundColor: theme.secondary}}> 
              <StartButton onPress={() => setPage('MountainList')} />
                <AppText style={styles.label}>List of Mountains</AppText>
                <FlatList
                    data={dataList}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({item}) => <Item mountain={item} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 4 }}
                />
            </View>
        </View>
      )}
      </SafeAreaView>
    );
    }


const styles = StyleSheet.create({
  //area above to ensure content doesn’t get covered by the dynamic island (IOS).
  //background color of the entire screen
    safeArea: {
        flex: 1,
        backgroundColor: theme.secondary,
    },
    //Space around: "Climbs" title at the top of the screen
    header: {
        alignItems: 'flex-start',
        marginBottom: 5,
        marginTop: -30,
        marginLeft: 20,
    },
    // Size, weight, color: "Climbs" title at the top of the screen
    title: {
        fontSize: 25,
        fontWeight: 'bold',
        color: theme.primary,  
    },
     //size, weight, color: "Start Your Journey to the Summit!" section title above the mountain cards
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.primary,
        marginBottom: 12,
        marginLeft: 20,
    },
    //size, color: "List of Mountains" label below the title
    subtitle: {
        fontSize: 18,
        color: theme.secondary,
        marginTop: 4,  
    },
    //"List of Mountains" label above the mountain cards
    label: {
        textAlign: 'center',
        fontSize: 15,
        paddingBottom: 10,
        paddingTop: 10,
    },
    //border for the mountain cards
    cardBorder: {
        padding: 5,
        marginHorizontal: 5,
        flexDirection: 'row', 
        flex: 1,
    },
    //border on all sides. (not used)
    container: {
        flex: 1,
        backgroundColor: theme.secondary,
    },
    //padding: space between the edge (left right) of the screen and the mountain cards.
    listContainer:{
        flex: 1,
        paddingHorizontal: 5,
    },
    //The mountain cards themselves.
    MountainCard:{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: theme.white,
        borderRadius: 12,
        paddingHorizontal: 5,
        paddingVertical: 4,
        //ios
        shadowColor: 'rgb(115, 115, 115)',
        shadowOpacity: 0.5,
        shadowRadius: 2.0,
        shadowOffset: { width: 0, height: 3},  
        //android
        elevation: 3,
    },
    //not used, but would be the left side of the mountain card (the text)
    cardLeft: {
        flex: 1,
    },
    //not used, but would be the right side of the mountain card (the image)
    cardRight: {
      marginLeft: 10,
    },
    MountainName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.primary,
    },
    MountainLocation: {
        fontSize: 14,
        color: theme.background,
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    MountainPeak:{
        fontSize: 14,
        color: theme.background,
        marginTop: 4,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.accent,
        paddingVertical: 10,
        borderRadius: 8,
    },
    startButtonText: {
        color: theme.white,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});

export default climbs;
