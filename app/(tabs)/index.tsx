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
import { Mountain, MapPin, Play, Pause, RotateCcw, CircleX, ChevronLeft} from 'lucide-react-native';
//import { Background } from '@react-navigation/elements';

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
    <TouchableOpacity style={styles.Button} onPress={onPress}>
      <Play color={theme.white} size={16} />
      <AppText style={styles.ButtonText}>Start</AppText>
    </TouchableOpacity>
  );
  //backbutton
  const BackButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity style={styles.BackButton} onPress={onPress}>
      <ChevronLeft color={theme.white} size={16} />
      <AppText style={styles.BackButtonText}>Back</AppText>
    </TouchableOpacity>
  );
//layout
function climbs() {
  const [page, setPage] = React.useState<'start' | 'MountainList'| 'Activities'> ('start');
    return (
       //header with the title "Climbs"
      <SafeAreaView style={styles.safeArea}>
      {/*Page 1- starting page ('start')*/}
      {page === 'start' && (
        <View style={{ flex: 1 }}>
        <View style={styles.headerPage1}>
          <AppText style={styles.title}>Climbs</AppText>
        </View>

        <View style={styles.container}>
            <View style={{backgroundColor: theme.secondary}}>
                <AppText style={styles.sectionTitle}>Start Your Journey to the Summit!</AppText>
            </View> 
            <View style={styles.ButtonContainer}>
              <StartButton onPress={() => setPage('MountainList')} />
            </View>
            <FlatList
            data={dataList}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({item}) => <Item mountain={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        </View>
        </View>
      )}

      {/*Page 2- list of mountains ('MountainList')*/}
      {page === 'MountainList' && (
        <View style={{ flex: 1 }}>
          <View style={styles.headerPage2}>
            <AppText style={styles.title}>Climbs</AppText>
            </View>

          {/* Back Button- move back to starting page */}
          <View style={styles.BackButtonContainer}>
            <BackButton onPress={() => setPage('start')} />
          </View>

          <AppText style={styles.label}>List of Mountains</AppText>

          <FlatList
            data={dataList}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({item}) => <Item mountain={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}
          />

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
    headerPage1: {
        marginLeft: 20,
        marginTop: -40,
    },
    headerPage2: {
      marginLeft: 20,
      marginTop: -10, 
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
        marginLeft: 10,
        marginRight: 10,
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
    //not used, but would be the left side of the mountain card (the image)
    cardLeft: {
        flex: 1,
    },
    //not used, but would be the right side of the mountain card (the text)
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
    //general button: start, pause/resume, startover, delete.
    Button: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        justifyContent: 'center',
        backgroundColor: theme.accent,
        paddingVertical: 10,
        borderRadius: 35,
        width: 80,
        height: 80,
        marginBottom: 10,
    },
    //general button text: start, pause/resume, startover, delete.
    ButtonText: {
        color: theme.white,
        fontSize: 16,
        fontWeight: 'bold',
        paddingLeft: 8,
    },
     //position of back button.
    ButtonContainer: {
      alignItems: 'center', 
    },
    //visual style of back button
    BackButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderRadius: 18,
      paddingVertical: 6,
      paddingHorizontal: 5,
      alignSelf: 'flex-start',
    },
    //position of back button.
    BackButtonContainer: {
      position: 'absolute',
      top: -50,
      left: 15,

    },
    BackButtonText: {
    color: theme.white,
    fontSize: 16,
    paddingLeft: 2,
    paddingRight: 2,
    },
});

export default climbs;
