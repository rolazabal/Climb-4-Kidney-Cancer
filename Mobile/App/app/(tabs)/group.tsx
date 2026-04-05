

import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Colors } from "../../constants/theme";

type Group = {
  id: string;
  name: string;
  joined: boolean;
};

export default function GroupPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const theme = Colors.light;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 12,
    },
    createContainer: {
      flexDirection: "row",
      marginBottom: 16,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#ccc",
      padding: 8,
      borderRadius: 8,
      marginRight: 8,
    },
    createButton: {
      backgroundColor: theme.tint,
      paddingHorizontal: 16,
      justifyContent: "center",
      borderRadius: 8,
    },
    groupCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 12,
      borderWidth: 1,
      borderColor: "#eee",
      borderRadius: 8,
      marginBottom: 10,
    },
    groupName: {
      fontSize: 16,
    },
    joinButton: {
      backgroundColor: theme.tint,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    leaveButton: {
      backgroundColor: theme.tint,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    buttonText: {
      color: "#fff",
      fontWeight: "bold",
    },
    emptyText: {
      textAlign: "center",
      marginTop: 20,
      color: "#888",
    },
  });

  // Create a new group
  const createGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: Group = {
      id: Date.now().toString(),
      name: newGroupName,
      joined: true,
    };

    setGroups([...groups, newGroup]);
    setNewGroupName("");
  };

  // Join a group
  const joinGroup = (id: string) => {
    setGroups(groups.map(g => g.id === id ? { ...g, joined: true } : g));
  };

  // Leave a group
  const leaveGroup = (id: string) => {
    setGroups(groups.map(g => g.id === id ? { ...g, joined: false } : g));
  };

  const renderItem = ({ item }: { item: Group }) => (
    <View style={styles.groupCard}>
      <Text style={styles.groupName}>{item.name}</Text>

      {item.joined ? (
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => leaveGroup(item.id)}
        >
          <Text style={styles.buttonText}>Leave</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => joinGroup(item.id)}
        >
          <Text style={styles.buttonText}>Join</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Groups</Text>

      {/* Create Group */}
      <View style={styles.createContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter group name"
          value={newGroupName}
          onChangeText={setNewGroupName}
        />
        <TouchableOpacity style={styles.createButton} onPress={createGroup}>
          <Text style={styles.buttonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Group List */}
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No groups yet</Text>}
      />
    </View>
  );
}
