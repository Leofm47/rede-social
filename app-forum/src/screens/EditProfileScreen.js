// src/screens/EditProfileScreen.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert,
  ScrollView, Image, TouchableOpacity, Platform, ActivityIndicator
} from 'react-native';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const EditProfileScreen = ({ route, navigation }) => {
  const { user: initialUser } = route.params;
  const { signOut } = useContext(AuthContext);

  const [username, setUsername] = useState(initialUser.username);
  const [email, setEmail] = useState(initialUser.email);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState(initialUser.profile_picture_url);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pedir permissão para acessar a galeria
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão Negada', 'Precisamos de acesso à galeria!');
        }
      }
    })();
  }, []);

  // Escolher imagem
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
      setProfilePictureUrl(result.assets[0].uri);
    }
  };

  // Atualizar perfil
  const handleUpdateProfile = async () => {
    if (newPassword && newPassword !== confirmNewPassword) {
      Alert.alert('Erro', 'A nova senha e a confirmação não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro', 'Você não está logado.');
        signOut();
        return;
      }

      const updateData = {
        username: username !== initialUser.username ? username : undefined,
        email: email !== initialUser.email ? email : undefined,
        profile_picture_url: profilePictureUrl !== initialUser.profile_picture_url ? profilePictureUrl : undefined,
      };

      if (newPassword) {
        updateData.old_password = oldPassword;
        updateData.new_password = newPassword;
      }

      const filteredData = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined)
      );

      if (Object.keys(filteredData).length === 0) {
        Alert.alert('Aviso', 'Nenhuma alteração detectada.');
        setIsSubmitting(false);
        return;
      }

      const response = await api.put('/users/me', filteredData, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      Alert.alert('Sucesso', response.data.message);
      navigation.goBack();

    } catch (error) {
      console.error('Erro ao atualizar perfil:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao atualizar perfil.');
      if (error.response?.status === 401) {
        signOut();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deletar conta
  const handleDeleteProfile = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert("Erro", "Você não está logado.");
        signOut();
        return;
      }

      await api.delete('/users/me', {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      signOut();

    } catch (error) {
      console.error('Erro ao deletar conta:', error.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível deletar sua conta.');
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Confirmação",
      "Tem certeza que deseja deletar sua conta? Essa ação é irreversível.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Deletar", style: "destructive", onPress: handleDeleteProfile }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollView}>
        {/* Foto de perfil */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {profilePictureUrl ? (
            <Image source={{ uri: profilePictureUrl }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-circle-outline" size={120} color="#bbb" />
          )}
          <Text style={styles.changePhoto}>Trocar foto</Text>
        </TouchableOpacity>

        {/* Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Nome de usuário"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <Text style={styles.sectionTitle}>Alterar Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Senha atual"
          value={oldPassword}
          onChangeText={setOldPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Nova senha"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmar nova senha"
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          secureTextEntry
        />

        {isSubmitting ? (
          <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 15 }} />
        ) : (
          <Button title="Salvar Alterações" onPress={handleUpdateProfile} />
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
          <Text style={styles.deleteText}>Deletar Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#007bff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    padding: 20,
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  changePhoto: {
    color: '#007bff',
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#333',
  },
  deleteButton: {
    marginTop: 24,
    backgroundColor: '#ff4d4d',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

