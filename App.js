
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, StatusBar, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Clipboard from 'expo-clipboard';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();
const apiKey = '05b9fb28434e692b36591d7b7e9c4295'; // Remplace par ta vraie clé API

function HomeScreen({ navigation }) {
  const [imgUri, setImgUri] = useState(null);
  const [grid, setGrid] = useState(3);
  const [map, setMap] = useState([]);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [exportCode, setExportCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const makeSolvedMap = (n) => Array.from({ length: n * n }, (_, i) => i);

  const shuffleMap = (n) => {
    const arr = makeSolvedMap(n).slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const uploadToImgBB = async (localUri) => {
    const formData = new FormData();
    formData.append('image', {
      uri: localUri,
      name: 'photo.jpg',
      type: 'image/jpeg'
    });

    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      return json.data.display_url;
    } catch (err) {
      Alert.alert('Erreur', 'Échec de l’upload de la photo');
      return null;
    }
  };

  const choosePhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (res.canceled || !res.assets?.length) return;
    const uri = res.assets[0].uri;
    const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024, height: 1024 } }], { compress: 1, format: 'jpeg' });
    const hostedUrl = await uploadToImgBB(out.uri);
    if (!hostedUrl) return;
    const m = shuffleMap(grid);
    setImgUri(hostedUrl);
    setMap(m);
    setMoves(0);
    setSolved(false);
    const payload = JSON.stringify({ img: hostedUrl, grid, map: m, msg: message });
    setExportCode(payload);
  };

  const loadPuzzleFromCode = () => {
    try {
      const obj = JSON.parse(importCode);
      navigation.navigate('Puzzle', { puzzle: obj });
    } catch (e) {
      alert('Code invalide');
    }
  };

  const copyExportCode = async () => {
    await Clipboard.setStringAsync(exportCode);
    alert('Code copié dans le presse-papiers 💖');
  };

  const renderPuzzle = () => {
    if (!imgUri || map.length === 0) return null;
    const size = 240;
    const tileSize = size / grid;
    return (
      <View style={{ marginTop: 20 }}>
        <Text style={{ color: '#6c3483', fontWeight: '700' }}>Coups: {moves} {solved ? '✅ Résolu !' : ''}</Text>
        <View style={{ width: size, height: size, flexWrap: 'wrap', flexDirection: 'row' }}>
          {map.map((correctIndex, i) => {
            const row = Math.floor(correctIndex / grid);
            const col = correctIndex % grid;
            const dx = -col * tileSize;
            const dy = -row * tileSize;
            return (
              <View key={i} style={{ width: tileSize, height: tileSize, overflow: 'hidden', borderWidth: 1, borderColor: '#d63384' }}>
                <Image source={{ uri: imgUri }} style={{ width: size, height: size, transform: [{ translateX: dx }, { translateY: dy }] }} />
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar hidden />
      <Text style={styles.title}>💖 LovPuzzle</Text>
      <Text style={styles.subtitle}>Crée un puzzle romantique pour ton partenaire</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
        {[3, 4, 5, 10].map(n => (
          <TouchableOpacity
            key={n}
            style={{ backgroundColor: grid === n ? '#d63384' : '#fce4ec', padding: 10, marginHorizontal: 4, borderRadius: 8 }}
            onPress={() => setGrid(n)}
          >
            <Text style={{ color: '#6c3483', fontWeight: '700' }}>{n}×{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={styles.subtitle}>💌 Message pour ton partenaire :</Text>
        <TextInput
          style={styles.input}
          placeholder="Un petit mot doux..."
          value={message}
          onChangeText={setMessage}
          multiline
        />
      </View>

      <TouchableOpacity style={styles.btn} onPress={choosePhoto}>
        <Text style={styles.btnText}>📷 Choisir une photo</Text>
      </TouchableOpacity>

      {renderPuzzle()}

      {exportCode && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.subtitle}>🔗 Code à partager :</Text>
          <Text selectable style={styles.codeBox}>{exportCode}</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#d63384', marginTop: 10 }]} onPress={copyExportCode}>
            <Text style={styles.btnText}>📋 Copier le code</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ marginTop: 30 }}>
        <Text style={styles.subtitle}>📥 Coller un code reçu :</Text>
        <TextInput
          style={styles.input}
          placeholder="Coller ici le code JSON"
          value={importCode}
          onChangeText={setImportCode}
          multiline
        />
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#6c3483' }]} onPress={loadPuzzleFromCode}>
          <Text style={styles.btnText}>📤 Charger le puzzle</Text>
        </TouchableOpacity>
        {message ? <Text style={{ color: '#d63384', marginTop: 10, fontStyle: 'italic' }}>💌 Message : {message}</Text> : null}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function PuzzleScreen({ route }) {
  const { puzzle } = route.params;
  const [map, setMap] = useState(puzzle.map);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [selected, setSelected] = useState(null);

  const { img, grid, msg } = puzzle;
  const size = 240;
  const tileSize = size / grid;

  const handleTilePress = (index) => {
    if (selected === null) {
      setSelected(index);
    } else {
      const newMap = [...map];
      [newMap[selected], newMap[index]] = [newMap[index], newMap[selected]];
      setMap(newMap);
      setMoves(moves + 1);
      setSelected(null);
      if (JSON.stringify(newMap) === JSON.stringify([...newMap].sort((a, b) => a - b))) {
        setSolved(true);
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧩 Puzzle</Text>
      <Text style={styles.subtitle}>💌 Message : {msg}</Text>
      <Text style={{ color: '#6c3483', fontWeight: '700', textAlign: 'center' }}>Coups : {moves} {solved ? '✅ Résolu !' : ''}</Text>
      <View style={{ width: size, height: size, flexWrap: 'wrap', flexDirection: 'row', alignSelf: 'center', marginTop: 20 }}>
        {map.map((correctIndex, i) => {
          const row = Math.floor(correctIndex / grid);
          const col = correctIndex % grid;
          const dx = -col * tileSize;
          const dy = -row * tileSize;
          const isSelected = selected === i;
          return (
            <TouchableOpacity key={i} onPress={() => handleTilePress(i)}>
              <View style={{ width: tileSize, height: tileSize, overflow: 'hidden', borderWidth: 2, borderColor: isSelected ? '#6c3483' : '#d63384' }}>
                <Image source={{ uri: img }} style={{ width: size, height: size, transform: [{ translateX: dx }, { translateY: dy }] }} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Accueil" component={HomeScreen} />
        <Stack.Screen name="Puzzle" component={PuzzleScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff0f5', padding: 20 },
  title: { color: '#d63384', fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#6c3483', fontSize: 16, textAlign: 'center', marginBottom: 12 },
  btn: { backgroundColor: '#f06292', padding: 12, borderRadius: 10, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 8, minHeight: 60 },
  codeBox: { backgroundColor: '#fce4ec', color: '#6c3483', padding: 10, borderRadius: 8, fontSize: 12 }
});

