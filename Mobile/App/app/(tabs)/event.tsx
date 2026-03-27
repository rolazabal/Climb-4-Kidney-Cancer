import { useState, useEffect, useRef, act } from 'react';
import { AppState, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';

function Event() {

	const [elapsed, setElapsed] = useState(0);
	const [active, setActive] = useState(false);

	// reference to our timer
	const timer = useRef(0);

	async function getConn() {
		let db = await SQLite.openDatabaseAsync("app", {useNewConnection: true});
		return db;
	}

	// start and stop the timer
	useEffect(() => {
		const recordTime = async (startTime: number) => {
			//console.log("record called");
			let db = await SQLite.openDatabaseAsync("app", {useNewConnection: true});
			//console.log("got connection");
			await db.execAsync(`
				CREATE TABLE IF NOT EXISTS timer (startTime INTEGER);    
			`);
			//console.log("set up table");
			let statement = await db.prepareAsync('INSERT INTO timer VALUES ($value)');
			//console.log("set up statement");
			try {
				await statement.executeAsync({ $value: startTime });
			} finally {
				await statement.finalizeAsync();
				//console.log("executed");
			}
		};

		if (active) {
			recordTime(Date.now());
			timer.current = setInterval(() => {
				setElapsed(previous => previous + 10);
			}, 10);
		} else {
			clearInterval(timer.current);
		}

		return () => {
			clearInterval(timer.current);
		};
	}, [active]);

	// reference to our current AppState
	const appState = useRef(AppState.currentState);

	// analyze appState changes on mount
	useEffect(() => {
		const readTime = async () => {
			//console.log("read called");
			let db = await SQLite.openDatabaseAsync("app", {useNewConnection: true});
			//console.log("connected");
			let row = await db.getFirstAsync('SELECT * from timer');
			//console.log(row);
			if (row !== null && row.hasOwnProperty("startTime")) {
				let newElapsed = Date.now() - row.startTime;
				setElapsed(newElapsed);
			}
		}
		// create listener for change in appState, capture new state in nextAppState
		const subscription = AppState.addEventListener('change', nextAppState => {
			if (appState.current.match(/inactive|background/) &&
			nextAppState === 'active') {
				// app went from background to foreground
				readTime();
			}
			// apply the change
			appState.current = nextAppState;
		});
		// remove the listener on unmount
		return () => {
			subscription.remove();
		};
	}, []);

	async function clearTimer() {
		let db = await getConn();
		let statement = await db.prepareAsync('DELETE FROM timer');
		try {
			await statement.executeAsync();
		} finally {
			await statement.finalizeAsync();
		}
		setElapsed(0);
	}

	return(
		<SafeAreaView style={{flex: 1}}>
			<View>
				<Text>
					Milliseconds: {elapsed}
				</Text>
				<TouchableOpacity onPress={() => setActive(!active)}>
					<Text>
						{active ? "Stop" : "Start"}
					</Text>
				</TouchableOpacity>
				{!active &&
				<TouchableOpacity onPress={() => clearTimer()}>
					<Text>
						Clear
					</Text>
				</TouchableOpacity>
				}
			</View>
		</SafeAreaView>
	);
}

export default Event;
