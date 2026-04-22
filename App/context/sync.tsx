import { createContext, useContext, useState, ReactNode } from 'react';
import { PROGRESS_URL, USERS_URL } from '@/constants/api';
import * as SecureStore from "expo-secure-store";
import { useAuth } from '@/context/auth';

const SyncContext = createContext(null);

class Elevation {
    public url = PROGRESS_URL + '';
    public method = '';
    public feet: number = 0;
    public json = {};
}

class ClimbState {

}

class ClimbComplete {

}

class ClimbElevation {

}

function SyncProvider({ children }: {children: ReactNode}) {

    const queueRequest = async (request: Elevation | ClimbComplete | ClimbElevation | ClimbState) => {
        
    }

    return (
        <SyncContext.Provider value={{ queueRequest }}>
            { children }
        </SyncContext.Provider>
    );
}

export default SyncProvider;