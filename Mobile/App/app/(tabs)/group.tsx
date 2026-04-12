import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Crown, Plus, Search, Users } from 'lucide-react-native';

import { Colors } from '@/constants/theme';
import { AppText } from './_layout';

type GroupMember = {
  id: string;
  username: string;
  elevation: number;
  profilePictureUri?: string | null;
};

type Group = {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  joined: boolean;
  members: GroupMember[];
};

const c = Colors.light;

const initialGroups: Group[] = [
  {
    id: 'summit-squad',
    name: 'Summit Squad',
    description: 'Training together for our next fundraising climb.',
    joined: true,
    memberCount: 6,
    members: [
      { id: '1', username: 'ridge_runner', elevation: 18420 },
      { id: '2', username: 'peakpatrol', elevation: 17600 },
      { id: '3', username: 'alpineamy', elevation: 16250 },
      { id: '4', username: 'stone_stepper', elevation: 14980 },
      { id: '5', username: 'trailspark', elevation: 13100 },
      { id: '6', username: 'cloudchaser', elevation: 12040 },
    ],
  },
  {
    id: 'kidney-climbers',
    name: 'Kidney Climbers',
    description: 'Supporters climbing every week to push the mission forward.',
    joined: true,
    memberCount: 5,
    members: [
      { id: '1', username: 'hopehiker', elevation: 22310 },
      { id: '2', username: 'elevate4acause', elevation: 21440 },
      { id: '3', username: 'verticalviolet', elevation: 19670 },
      { id: '4', username: 'switchbacksam', elevation: 18720 },
      { id: '5', username: 'stepbystrength', elevation: 16550 },
    ],
  },
  {
    id: 'weekend-warriors',
    name: 'Weekend Warriors',
    description: 'Casual leaderboard for members who climb on weekends.',
    joined: false,
    memberCount: 4,
    members: [
      { id: '1', username: 'campfirekate', elevation: 10880 },
      { id: '2', username: 'trailtom', elevation: 10260 },
      { id: '3', username: 'summitseeker', elevation: 9640 },
      { id: '4', username: 'highroutehenry', elevation: 9120 },
    ],
  },
];

function getInitials(username: string) {
  return username
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function GroupPage() {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  const filteredGroups = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return groups;

    return groups.filter((group) => {
      const inName = group.name.toLowerCase().includes(normalized);
      const inDescription = group.description?.toLowerCase().includes(normalized);
      return inName || inDescription;
    });
  }, [groups, searchQuery]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const createGroup = () => {
    const trimmedName = newGroupName.trim();
    const trimmedDescription = newGroupDescription.trim();

    if (!trimmedName) {
      Alert.alert('Group name required', 'Please enter a name before creating a group.');
      return;
    }

    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: trimmedName,
      description: trimmedDescription || undefined,
      joined: true,
      memberCount: 1,
      members: [
        {
          id: `member-${Date.now()}`,
          username: 'you',
          elevation: 0,
        },
      ],
    };

    setGroups((current) => [newGroup, ...current]);
    setSelectedGroupId(newGroup.id);
    setNewGroupName('');
    setNewGroupDescription('');
    setIsCreateModalOpen(false);
  };

  const leaveGroup = (groupId: string) => {
    setGroups((current) =>
      current.map((group) => (group.id === groupId ? { ...group, joined: false } : group))
    );
    setSelectedGroupId(null);
  };

  const renderGroupCard = ({ item }: { item: Group }) => (
    <Pressable style={styles.groupCard} onPress={() => setSelectedGroupId(item.id)}>
      <View style={styles.groupCardHeader}>
        <View style={styles.groupIcon}>
          <Users size={18} color={c.tint} />
        </View>
        <View style={styles.groupMeta}>
          <AppText style={styles.groupName}>{item.name}</AppText>
          <AppText style={styles.groupCount}>
            {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
          </AppText>
        </View>
        {item.joined ? (
          <View style={styles.joinedPill}>
            <AppText style={styles.joinedPillText}>Joined</AppText>
          </View>
        ) : null}
      </View>

      {item.description ? <AppText style={styles.groupDescription}>{item.description}</AppText> : null}
    </Pressable>
  );

  const rankedMembers = selectedGroup
    ? [...selectedGroup.members].sort((a, b) => b.elevation - a.elevation)
    : [];

  if (selectedGroup) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.screen}>
          <View style={styles.detailHeader}>
            <Pressable style={styles.backButton} onPress={() => setSelectedGroupId(null)}>
              <ChevronLeft size={18} color={c.text} />
            </Pressable>
            <View style={styles.detailHeading}>
              <AppText style={styles.title}>{selectedGroup.name}</AppText>
              <AppText style={styles.subtitle}>Group leaderboard</AppText>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.detailHero}>
              <AppText style={styles.heroStat}>{selectedGroup.memberCount}</AppText>
              <AppText style={styles.heroLabel}>Active members</AppText>
              {selectedGroup.description ? (
                <AppText style={styles.heroDescription}>{selectedGroup.description}</AppText>
              ) : null}
            </View>

            <View style={styles.leaderboardCard}>
              <View style={styles.sectionHeader}>
                <Crown size={18} color={c.tint} />
                <AppText style={styles.sectionTitle}>Leaderboard</AppText>
              </View>

              {rankedMembers.map((member, index) => (
                <View key={member.id} style={styles.memberRow}>
                  <AppText style={styles.rank}>{index + 1}</AppText>
                  {member.profilePictureUri ? (
                    <Image source={{ uri: member.profilePictureUri }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <AppText style={styles.avatarInitials}>{getInitials(member.username)}</AppText>
                    </View>
                  )}
                  <View style={styles.memberMeta}>
                    <AppText style={styles.memberName}>{member.username}</AppText>
                    <AppText style={styles.memberElevation}>
                      {member.elevation.toLocaleString()} ft climbed
                    </AppText>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              style={styles.leaveButton}
              onPress={() =>
                Alert.alert('Leave group', `Leave ${selectedGroup.name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: () => leaveGroup(selectedGroup.id),
                  },
                ])
              }>
              <AppText style={styles.leaveButtonText}>Leave group</AppText>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View>
            <AppText style={styles.title}>Groups</AppText>
            <AppText style={styles.subtitle}>Find a team or create your own climbing crew.</AppText>
          </View>
          <Pressable style={styles.addButton} onPress={() => setIsCreateModalOpen(true)}>
            <Plus size={18} color={c.onPrimary} />
          </Pressable>
        </View>

        <View style={styles.searchShell}>
          <Search size={18} color={c.icon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search group names"
            placeholderTextColor={c.subtitle}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <AppText style={styles.emptyTitle}>No groups match that search.</AppText>
              <AppText style={styles.emptySubtitle}>Try a different name or create a new group.</AppText>
            </View>
          }
        />

        <Modal
          visible={isCreateModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsCreateModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <AppText style={styles.modalTitle}>Create group</AppText>
              <AppText style={styles.modalSubtitle}>
                Add a name and an optional description for your new group.
              </AppText>

              <AppText style={styles.fieldLabel}>Group name</AppText>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex. Summit Squad"
                placeholderTextColor={c.subtitle}
                value={newGroupName}
                onChangeText={setNewGroupName}
              />

              <AppText style={styles.fieldLabel}>Description (optional)</AppText>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="What is this group about?"
                placeholderTextColor={c.subtitle}
                value={newGroupDescription}
                onChangeText={setNewGroupDescription}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setIsCreateModalOpen(false)}>
                  <AppText style={styles.secondaryButtonText}>Cancel</AppText>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={createGroup}>
                  <AppText style={styles.primaryButtonText}>Create</AppText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: c.heading,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: c.subtitle,
    maxWidth: 260,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.tint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  searchShell: {
    marginHorizontal: 18,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: c.text,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 30,
    gap: 12,
  },
  groupCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: c.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupMeta: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: c.heading,
  },
  groupCount: {
    marginTop: 3,
    fontSize: 13,
    color: c.subtitle,
  },
  joinedPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: c.surfaceWarm,
  },
  joinedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.tint,
  },
  groupDescription: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: c.text,
  },
  emptyState: {
    marginTop: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.heading,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: c.subtitle,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: c.heading,
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: c.subtitle,
  },
  fieldLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: c.heading,
  },
  modalInput: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.inputBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: c.text,
  },
  textArea: {
    minHeight: 110,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceMuted,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.tint,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.onPrimary,
  },
  detailHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeading: {
    flex: 1,
  },
  detailContent: {
    padding: 18,
    paddingBottom: 32,
  },
  detailHero: {
    backgroundColor: c.banner,
    borderRadius: 24,
    padding: 22,
    marginTop: 12,
  },
  heroStat: {
    fontSize: 38,
    fontWeight: '700',
    color: c.onPrimary,
  },
  heroLabel: {
    marginTop: 4,
    fontSize: 14,
    color: '#F4E9E4',
  },
  heroDescription: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: c.onPrimary,
  },
  leaderboardCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 22,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.heading,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: c.surfaceMuted,
  },
  rank: {
    width: 28,
    fontSize: 18,
    fontWeight: '700',
    color: c.tint,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceWarm,
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: c.tint,
  },
  memberMeta: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: c.heading,
  },
  memberElevation: {
    marginTop: 4,
    fontSize: 13,
    color: c.subtitle,
  },
  leaveButton: {
    marginTop: 22,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.error,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.error,
  },
});
