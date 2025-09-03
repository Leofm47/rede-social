// src/screens/ProfileScreen.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Alert, Image, TouchableOpacity, FlatList
} from 'react-native';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [favoritePosts, setFavoritePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('myPosts');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfileData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro', 'Token não encontrado.');
        signOut();
        return;
      }

      const userResponse = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setUser(userResponse.data);

      const myPostsResponse = await api.get('/users/me/posts', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setMyPosts(myPostsResponse.data);

      const favoritePostsResponse = await api.get('/users/me/favorites', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setFavoritePosts(favoritePostsResponse.data);

    } catch (error) {
      console.error('Erro perfil:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível carregar.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPostItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
      <View style={styles.postCard}>
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postContentPreview}>
          {item.content.substring(0, 100)}...
        </Text>
        <View style={styles.postStatsRow}>
          <Ionicons name="heart-outline" size={16} color="#ff4757" />
          <Text style={styles.postStatItem}>{item.likes_count}</Text>
          <Ionicons name="chatbubble-outline" size={16} color="#3742fa" style={{ marginLeft: 10 }} />
          <Text style={styles.postStatItem}>{item.comments_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ marginTop: 10 }}>Carregando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Perfil não encontrado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile', { user })} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Card de informações */}
        <View style={styles.profileInfoCard}>
          {user.profile_picture_url ? (
            <Image
              source={{ uri: `${api.defaults.baseURL.replace('/api', '')}${user.profile_picture_url}` }}
              style={styles.profilePicture}
            />
          ) : (
            <Ionicons name="person-circle" size={100} color="#ccc" style={styles.profilePicturePlaceholder} />
          )}
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.memberSince}>Membro desde {new Date(user.created_at).toLocaleDateString('pt-BR')}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'myPosts' && styles.activeTab]}
            onPress={() => setActiveTab('myPosts')}
          >
            <Text style={[styles.tabText, activeTab === 'myPosts' && styles.activeTabText]}>
              Meus Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'favorites' && styles.activeTab]}
            onPress={() => setActiveTab('favorites')}
          >
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
              Favoritos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de posts */}
        {activeTab === 'myPosts'
          ? myPosts.length > 0
            ? <FlatList data={myPosts} keyExtractor={(i) => i.id.toString()} renderItem={renderPostItem} scrollEnabled={false} />
            : <Text style={styles.noContentText}>Você ainda não fez nenhum post.</Text>
          : favoritePosts.length > 0
            ? <FlatList data={favoritePosts} keyExtractor={(i) => i.id.toString()} renderItem={renderPostItem} scrollEnabled={false} />
            : <Text style={styles.noContentText}>Você ainda não favoritou nenhum post.</Text>
        }
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
    paddingTop: 45, elevation: 3
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  editButton: { padding: 5 },

  scrollViewContent: { paddingBottom: 25 },

  // Card perfil
  profileInfoCard: {
    backgroundColor: '#fff', padding: 20, margin: 15, borderRadius: 15,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 5, elevation: 4
  },
  profilePicture: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 2, borderColor: '#007bff' },
  profilePicturePlaceholder: { marginBottom: 15 },
  username: { fontSize: 26, fontWeight: '700', color: '#222' },
  email: { fontSize: 16, color: '#666', marginBottom: 4 },
  memberSince: { fontSize: 14, color: '#999' },

  // Tabs
  tabsContainer: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 15,
    backgroundColor: '#e9ecef', borderRadius: 12, overflow: 'hidden'
  },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { backgroundColor: '#007bff' },
  tabText: { fontSize: 15, fontWeight: '500', color: '#555' },
  activeTabText: { color: '#fff', fontWeight: '700' },

  // Posts
  postCard: {
    backgroundColor: '#fff', padding: 18, borderRadius: 12, marginHorizontal: 20, marginVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 3
  },
  postTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  postContentPreview: { fontSize: 14, color: '#555', marginBottom: 10 },
  postStatsRow: { flexDirection: 'row', alignItems: 'center' },
  postStatItem: { fontSize: 13, color: '#666', marginLeft: 4 },

  noContentText: { textAlign: 'center', marginTop: 25, fontSize: 15, color: '#777' },
});

export default ProfileScreen;
