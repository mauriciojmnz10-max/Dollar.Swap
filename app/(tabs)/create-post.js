import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { publicationsService, storageService, authService } from '../../src/services/supabase';
import LoadingSpinner from '../../src/components/LoadingSpinner';

const ZONES = ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Mérida', 'San Cristóbal'];
const DENOMINATIONS = ['$20', '$50', '$100', '$20 y $50', '$20 y $100', '$50 y $100', 'Mixto'];
const TRADE_TYPES = [{ label: 'Comprar USD', value: 'BUY' }, { label: 'Vender USD', value: 'SELL' }];

export default function CreatePostScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ tradeType: 'SELL', amount: '', rate: '', denominations: '', zone: '', photo: null, photoUri: null });
  const [errors, setErrors] = useState({});
  const [cameraPermission, setCameraPermission] = useState(null);

  useEffect(() => { loadUser(); checkCameraPermissions(); }, []);

  const loadUser = async () => {
    const { user, error } = await authService.getCurrentUser();
    if (user) setUser(user);
    else { Alert.alert('Error', 'Debes iniciar sesión'); navigation.replace('login'); }
  };

  const checkCameraPermissions = async () => {
    if (Platform.OS === 'web') return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    if (status !== 'granted') Alert.alert('Permiso de cámara requerido', 'Necesitamos acceso a tu cámara para tomar fotos de los billetes.');
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') return Alert.alert('Info', 'La cámara no está disponible en la web');
    if (cameraPermission !== true) { await checkCameraPermissions(); if (cameraPermission !== true) return; }
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8, exif: false, base64: false });
      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, photo: result.assets[0], photoUri: result.assets[0].uri }));
        setErrors(prev => ({ ...prev, photo: null }));
      }
    } catch (error) { Alert.alert('Error', 'No se pudo tomar la foto'); }
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') return Alert.alert('Info', 'Seleccionar imágenes no está disponible en la web');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8, exif: false, base64: false });
      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, photo: result.assets[0], photoUri: result.assets[0].uri }));
        setErrors(prev => ({ ...prev, photo: null }));
      }
    } catch (error) { Alert.alert('Error', 'No se pudo seleccionar la imagen'); }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Monto en USD debe ser mayor a 0';
    if (!formData.rate || parseFloat(formData.rate) <= 0) newErrors.rate = 'Tasa en Bs debe ser mayor a 0';
    if (!formData.denominations) newErrors.denominations = 'Selecciona las denominaciones';
    if (!formData.zone) newErrors.zone = 'Selecciona una zona';
    if (!formData.photo) newErrors.photo = 'Debes tomar una foto de los billetes';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) { Alert.alert('Error', 'Por favor completa todos los campos requeridos'); return; }
    if (!user) { Alert.alert('Error', 'Usuario no autenticado'); return; }
    setSubmitting(true);
    try {
      const { url, error: uploadError } = await storageService.uploadBillPhoto(formData.photo.uri, user.id);
      if (uploadError) throw new Error('Error al subir la foto: ' + uploadError.message);
      const publicationData = { user_id: user.id, trade_type: formData.tradeType, amount_used: parseFloat(formData.amount), rate_bs: parseFloat(formData.rate), denominations: formData.denominations, bills_photo_url: url, zone_location: formData.zone, status: 'ACTIVE' };
      const { data, error } = await publicationsService.create(publicationData);
      if (error) throw new Error('Error al crear la publicación: ' + error.message);
      Alert.alert('¡Éxito!', 'Tu publicación ha sido creada correctamente', [{ text: 'Ver publicaciones', onPress: () => navigation.navigate('home') }]);
      setFormData({ tradeType: 'SELL', amount: '', rate: '', denominations: '', zone: '', photo: null, photoUri: null });
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'No se pudo crear la publicación');
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}><Text style={styles.headerTitle}>Nueva Publicación</Text><Text style={styles.headerSubtitle}>Completa la información para publicar tu oferta</Text></View>
      <View style={styles.section}><Text style={styles.label}>Tipo de operación *</Text><View style={styles.tradeTypeContainer}>{TRADE_TYPES.map((type) => (<TouchableOpacity key={type.value} style={[styles.tradeTypeButton, formData.tradeType === type.value && styles.tradeTypeButtonActive]} onPress={() => setFormData(prev => ({ ...prev, tradeType: type.value }))}><Text style={[styles.tradeTypeText, formData.tradeType === type.value && styles.tradeTypeTextActive]}>{type.label}</Text></TouchableOpacity>))}</View></View>
      <View style={styles.section}><Text style={styles.label}>Monto en USD *</Text><View style={styles.inputContainer}><Text style={styles.inputPrefix}>$</Text><TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={formData.amount} onChangeText={(text) => { setFormData(prev => ({ ...prev, amount: text })); setErrors(prev => ({ ...prev, amount: null })); }} /></View>{errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}</View>
      <View style={styles.section}><Text style={styles.label}>Tasa en Bs *</Text><View style={styles.inputContainer}><Text style={styles.inputPrefix}>Bs.</Text><TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={formData.rate} onChangeText={(text) => { setFormData(prev => ({ ...prev, rate: text })); setErrors(prev => ({ ...prev, rate: null })); }} /></View>{errors.rate && <Text style={styles.errorText}>{errors.rate}</Text>}</View>
      <View style={styles.section}><Text style={styles.label}>Denominaciones *</Text><View style={styles.pickerContainer}><Picker selectedValue={formData.denominations} onValueChange={(itemValue) => { setFormData(prev => ({ ...prev, denominations: itemValue })); setErrors(prev => ({ ...prev, denominations: null })); }} style={styles.picker}><Picker.Item label="Seleccionar denominación" value="" />{DENOMINATIONS.map((denom) => (<Picker.Item key={denom} label={denom} value={denom} />))}</Picker></View>{errors.denominations && <Text style={styles.errorText}>{errors.denominations}</Text>}</View>
      <View style={styles.section}><Text style={styles.label}>Zona de encuentro *</Text><View style={styles.pickerContainer}><Picker selectedValue={formData.zone} onValueChange={(itemValue) => { setFormData(prev => ({ ...prev, zone: itemValue })); setErrors(prev => ({ ...prev, zone: null })); }} style={styles.picker}><Picker.Item label="Seleccionar zona" value="" />{ZONES.map((zone) => (<Picker.Item key={zone} label={zone} value={zone} />))}</Picker></View>{errors.zone && <Text style={styles.errorText}>{errors.zone}</Text>}</View>
      <View style={styles.section}><Text style={styles.label}>Foto de los billetes *</Text><View style={styles.photoContainer}>{formData.photoUri ? (<View style={styles.photoPreview}><Image source={{ uri: formData.photoUri }} style={styles.photoImage} resizeMode="cover" /><TouchableOpacity style={styles.removePhotoButton} onPress={() => { setFormData(prev => ({ ...prev, photo: null, photoUri: null })); setErrors(prev => ({ ...prev, photo: null })); }}><Ionicons name="close-circle" size={24} color="#EF4444" /></TouchableOpacity></View>) : (<View style={styles.photoButtonsContainer}><TouchableOpacity style={[styles.photoButton, styles.cameraButton]} onPress={takePhoto}><Ionicons name="camera-outline" size={24} color="#FFFFFF" /><Text style={styles.photoButtonText}>Tomar foto</Text></TouchableOpacity><TouchableOpacity style={[styles.photoButton, styles.galleryButton]} onPress={pickImage}><Ionicons name="images-outline" size={24} color="#2563EB" /><Text style={[styles.photoButtonText, { color: '#2563EB' }]}>Galería</Text></TouchableOpacity></View>)}</View>{errors.photo && <Text style={styles.errorText}>{errors.photo}</Text>}</View>
      <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Publicar oferta</Text>}</TouchableOpacity>
    </ScrollView>
  );
}

// Estilos (iguales que antes, no los repito)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { marginTop: 16, marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#0F172A' },
  headerSubtitle: { fontSize: 16, color: '#64748B', marginTop: 4 },
  section: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 8 },
  tradeTypeContainer: { flexDirection: 'row', gap: 12 },
  tradeTypeButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  tradeTypeButtonActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  tradeTypeText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  tradeTypeTextActive: { color: '#2563EB' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 48 },
  inputPrefix: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#0F172A' },
  pickerContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  picker: { height: 48 },
  photoContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, minHeight: 160, justifyContent: 'center', alignItems: 'center' },
  photoButtonsContainer: { flexDirection: 'row', gap: 12, width: '100%' },
  photoButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  cameraButton: { backgroundColor: '#2563EB' },
  galleryButton: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#2563EB' },
  photoButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  photoPreview: { width: '100%', height: 200, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  removePhotoButton: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4 },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 4, marginLeft: 4 },
  submitButton: { backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  submitButtonDisabled: { backgroundColor: '#93C5FD' },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
