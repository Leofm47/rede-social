import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert, Image, TouchableOpacity, FlatList
} from 'react-native';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const { signOut } = useContext(AuthContext);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    fetchPostAndComments();
  }, [postId]);

  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      const postResponse = await api.get(`/posts/${postId}`);
      setPost(postResponse.data);

      const commentsResponse = await api.get(`/comments/${postId}`);
      setComments(commentsResponse.data);
    } catch (error) {
      console.error('Erro ao buscar post/comentários:', error.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível carregar o post.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async () => {
    if (!newCommentContent.trim()) {
      Alert.alert('Erro', 'O comentário não pode ser vazio.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro de Autenticação', 'Você precisa estar logado para comentar.');
        signOut();
        return;
      }

      await api.post(
        `/comments/${postId}`,
        { content: newCommentContent },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      setNewCommentContent('');
      fetchPostAndComments();
    } catch (error) {
      console.error('Erro ao comentar:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Ocorreu um erro ao comentar.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Carregando post...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Post não encontrado.</Text>
      </View>
    );
  }

  const renderCommentItem = ({ item }) => (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        {item.profile_picture_url ? (
          <Image source={{ uri: `http://localhost:3001${item.profile_picture_url}` }} style={styles.commentProfilePicture} />
        ) : (
          <Ionicons name="person-circle" size={32} color="#D1D5DB" style={styles.commentProfilePicturePlaceholder} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.commentUsername}>{item.username}</Text>
          <Text style={styles.commentTimestamp}>
            {new Date(item.created_at).toLocaleString('pt-BR')}
          </Text>
        </View>
      </View>
      <Text style={styles.commentContent}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Post</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Post */}
        <View style={styles.postDetailCard}>
          <View style={styles.postHeader}>
            {post.profile_picture_url ? (
              <Image source={{ uri: `http://localhost:3001${post.profile_picture_url}` }} style={styles.profilePicture} />
            ) : (
              <Ionicons name="person-circle" size={40} color="#D1D5DB" />
            )}
            <Text style={styles.postUsername}>{post.username}</Text>
          </View>
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postContent}>{post.content}</Text>
          {post.image_url && <Image source={{ uri: `http://localhost:3001${post.image_url}` }} style={styles.postImage} />}
          <View style={styles.postStatsContainer}>
            <Text style={styles.postStats}>{post.likes_count} Curtidas</Text>
            <Text style={styles.postStats}>{post.comments_count} Comentários</Text>
          </View>
        </View>

        {/* Comentários */}
        <Text style={styles.commentsTitle}>Comentários</Text>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCommentItem}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.noCommentsText}>Nenhum comentário ainda.</Text>}
        />

        {/* Adicionar Comentário */}
        <View style={styles.addCommentContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Escreva um comentário..."
            placeholderTextColor="#9CA3AF"
            value={newCommentContent}
            onChangeText={setNewCommentContent}
            multiline
          />
          <TouchableOpacity
            style={[styles.commentButton, isSubmittingComment && { opacity: 0.6 }]}
            onPress={handleCreateComment}
            disabled={isSubmittingComment}
          >
            <Text style={styles.commentButtonText}>
              {isSubmittingComment ? 'Enviando...' : 'Comentar'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
    paddingTop: 44, // safe area iOS
  },
  backButton: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

  scrollViewContent: { paddingBottom: 20 },
  postDetailCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  profilePicture: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  postUsername: { fontWeight: '600', fontSize: 15, color: '#374151' },
  postTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  postContent: { fontSize: 15, lineHeight: 22, color: '#4B5563', marginBottom: 10 },
  postImage: { width: '100%', height: 220, borderRadius: 10, marginTop: 10 },
  postStatsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    justifyContent: 'space-around',
  },
  postStats: { fontSize: 13, color: '#6B7280' },

  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    color: '#111827',
  },
  commentCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  commentProfilePicture: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  commentUsername: { fontWeight: '600', fontSize: 14, color: '#374151' },
  commentTimestamp: { fontSize: 12, color: '#9CA3AF' },
  commentContent: { fontSize: 14, color: '#4B5563', marginTop: 4, marginLeft: 40 },

  addCommentContainer: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    fontSize: 14,
    color: '#111827',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  commentButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  commentButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  noCommentsText: { textAlign: 'center', color: '#6B7280', marginVertical: 10 },
});

export default PostDetailScreen;
