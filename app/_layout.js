import { View, Text } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 24, color: '#2563EB', fontWeight: 'bold' }}>
        Dollar Swap
      </Text>
      <Text style={{ fontSize: 16, color: '#64748B', marginTop: 8 }}>
        Cargando...
      </Text>
    </View>
  );
}
