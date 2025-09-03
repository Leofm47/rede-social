// src/screens/HomeScreen.js

import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Button, StyleSheet, Alert, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import { CommonActions } from '@react-navigation/native';


const HomeScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userLikes, setUserLikes] = useState({});
  const [userFavorites, setUserFavorites] = useState({})
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUsername, setCurrentUsername] = useState(null);
  const [newPostImageUri, setNewPostImageUri] = useState(null); // <-- Novo: URI da imagem do novo post

  useEffect(() => {
    const loadUserId = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setCurrentUserId(userData.id);
          setCurrentUsername(userData.username)
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário do AsyncStorage:', error);
      }
    };
    loadUserId();
    fetchPosts();

    // Pedir permissão para acessar a galeria de imagens
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Desculpe, precisamos de permissões de galeria para isso funcionar!');
      }
    })();
  }, [searchTerm, currentUserId]);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const response = await api.get(`/posts?q=${searchTerm}`);

      // Atualiza o estado de likes do usuário com base nos posts buscados
      // Para o feedback visual persistente, esta parte é crucial
      let initialUserLikes = {};
      let initialUserFavorites = {}
      if (currentUserId) {
        try {
          const likesResponse = await api.get(`/users/${currentUserId}/likes`, {
            headers: { Authorization: `Bearer ${await AsyncStorage.getItem('userToken')}` }
          });
          likesResponse.data.forEach(like => {
            initialUserLikes[like.post_id] = true;
          });
          const favoritesResponse = await api.get(`/users/${currentUserId}/favorites`, {
            headers: { Authorization: `Bearer ${await AsyncStorage.getItem('userToken')}` }
          })
          favoritesResponse.data.forEach(favorite => {
            initialUserFavorites[favorite.post_id] = true;
          });
        } catch (likesError) {
          console.error('Erro ao buscar likes do usuário para inicialização:', likesError.response?.data || likesError.message);
        }
      }
      setUserLikes(initialUserLikes);
      setUserFavorites(initialUserFavorites)

      setPosts(response.data);
    } catch (error) {
      console.error('Erro ao buscar posts:', error.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível carregar os posts.');
    } finally {
      setLoadingPosts(false);
    }
  };

  const pickPostImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Ajuste conforme preferir
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewPostImageUri(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    try {
      if (!newPostTitle.trim() && !newPostContent.trim()) {
        Alert.alert('Aviso', 'Digite um título ou conteúdo para criar o post.');
        return;
      }
  
      setIsSubmitting(true);
  
      const payload = {
        title: newPostTitle,
        content: newPostContent,
      };
  
      // Se tiver imagem, pode adicionar no payload (ou FormData se o backend exigir upload real)
      if (newPostImageUri) {
        payload.image_url = newPostImageUri;
      }
  
      const userToken = await AsyncStorage.getItem('userToken');
      const response = await api.post('/posts', payload, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
  
      console.log('Post criado:', response.data);
  
      // Atualiza lista
      fetchPosts();
  
      // Reseta campos
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImageUri(null);
    } catch (error) {
      console.error('Erro ao criar post:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível criar o post.');
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const handleToggleLike = async (postId) => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro', 'Você precisa estar logado para curtir posts.');
        signOut();
        return;
      }
      const response = await api.post(
        `/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const liked = response.data.liked;
      setUserLikes(prevLikes => ({
        ...prevLikes,
        [postId]: liked,
      }));

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, likes_count: liked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1) }
            : post
        )
      );

    } catch (error) {
      console.error('Erro ao curtir/descurtir:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível processar o like.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
      const response = await api.post(
        `/posts/${postId}/favorite`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
    }
  };

  const handleToggleFavorite = async (postId) => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro', 'Você precisa estar logado para favoritar posts.');
        signOut();
        return;
      }
      const response = await api.post(
        `/posts/${postId}/favorite`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const favorited = response.data.favorited;
      setUserFavorites(prevFavorites => ({
        ...prevFavorites,
        [postId]: favorited,
      }));

      Alert.alert('Sucesso', response.data.message);
    } catch (error) {
      console.error('Erro ao favoritar/desfavoritar:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível processar o favorito.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    }
  };

  const handleLogout = () => {
    console.log('HomeScreen: usuário clicou em sair')
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: signOut() }
    ]);
  };

  const renderPostItem = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        {item.profile_picture_url ? (
          <Image source={{ uri: `http://localhost:3001${item.profile_picture_url}` }} style={styles.profilePicture} />
        ) : (
          <Ionicons name="person-circle" size={40} color="#ccc" style={styles.profilePicturePlaceholder} />
        )}
        <Text style={styles.postUsername}>{item.username}</Text>
      </View>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent}>{item.content}</Text>
      {item.image_url && <Image source={{ uri: `http://localhost:3001${item.image_url}` }} style={styles.postImage} />}
      <View style={styles.postFooter}>
        <TouchableOpacity style={styles.interactionButton} onPress={() => handleToggleLike(item.id)}>
          <Ionicons
            name={userLikes[item.id] ? 'heart' : 'heart-outline'}
            size={24}
            color={userLikes[item.id] ? 'red' : '#666'}
          />
          <Text style={styles.interactionText}>{item.likes_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
          <Ionicons name="chatbubble-outline" size={24} color="#666" />
          <Text style={styles.interactionText}>{item.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={() => handleToggleFavorite(item.id)}>
          <Ionicons 
          name={userFavorites[item.id] ? 'bookmark' : 'bookmark-outline'}
          size={24}
          color={userFavorites[item.id] ? 'gold' : '#666' }
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Fórum do App</Text>
        <View style={styles.headerButtons}>
          <Text style={styles.usernameText}>{currentUsername}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
            <Ionicons name="person-circle-outline" size={30} color="white" />
          </TouchableOpacity>
          <Button title="Sair" onPress={handleLogout} />
        </View>
      </View>

      <ScrollView>
        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar posts por título ou conteúdo..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={fetchPosts}
          />
          <TouchableOpacity onPress={fetchPosts} style={styles.searchButton}>
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Seção para criar novo post */}
        <View style={styles.createPostContainer}>
          <TextInput
            style={styles.input}
            placeholder="Título do seu post"
            value={newPostTitle}
            onChangeText={setNewPostTitle}
          />
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="O que você quer compartilhar?"
            value={newPostContent}
            onChangeText={setNewPostContent}
            multiline
          />
          <TouchableOpacity onPress={pickPostImage} style={styles.imagePickerButton}>
            <Ionicons name="image-outline" size={24} color="#007bff" />
            <Text style={styles.imagePickerButtonText}>Adicionar Imagem</Text>
          </TouchableOpacity>
          {newPostImageUri && (
            <Image source={{ uri: newPostImageUri }} style={styles.previewImage} />
          )}
          <Button
            title={isSubmitting ? "Publicando..." : "Criar Post"}
            onPress={handleCreatePost}
            disabled={isSubmitting}
          />
        </View>

        {/* Lista de Posts */}
        {loadingPosts ? (
          <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPostItem}
            contentContainerStyle={styles.postList}
            ListEmptyComponent={<Text style={styles.noPostsText}>Nenhum post encontrado. Tente ajustar sua pesquisa ou seja o primeiro a postar!</Text>}
          />
        )}
    </ScrollView >
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#2563EB',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameText: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: '600',
    color: '#fff',
  },
  profileButton: {
    marginRight: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 10,
  },
  createPostContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    marginBottom: 12,
  },
  imagePickerButtonText: {
    marginLeft: 8,
    color: '#2563EB',
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  postList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePicture: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  profilePicturePlaceholder: {
    marginRight: 10,
  },
  postUsername: {
    fontWeight: '600',
    fontSize: 15,
    color: '#374151',
  },
  postTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 10,
    resizeMode: 'cover',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  interactionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#6B7280',
  },
  noPostsText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    color: '#9CA3AF',
  },
});


export default HomeScreen;