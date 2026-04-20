import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import MountainsGallery from "../sub/mountainsGallery";
import MountainsList from "../sub/mountainsList";

function Mountains() {

    const States = {
        List: 1,
        Gallery: 0
    };
    const [state, setState] = useState(States.List);

    useFocusEffect(useCallback(() => {
        setState(States.List);
    }, []));
    
    const [viewID, setViewID] = useState<string | null>(null);

    useEffect(() => {
    	setState((viewID !== null) ? States.Gallery : States.List);
    }, [viewID]);

    return(
        <SafeAreaView style={{flex: 1, backgroundColor: '#ECEDEE'}} edges={['top','left', 'right']}>
            {state === States.Gallery && <MountainsGallery id={viewID} back={() => setViewID(null)} />}
            {state === States.List && <MountainsList view={(id: string) => {setViewID(id)}} />}
        </SafeAreaView>
    );
}

export type Mountain = {
  uuid: string;
  name: string;
  location?: string;
  height?: number;
  description?: string;
  image_presigned_url?: string | null;
};

export default Mountains
