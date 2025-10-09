import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, StatusBar, Alert, Dimensions, Modal, Animated, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PinchGestureHandler, GestureHandlerRootView, State } from 'react-native-gesture-handler';
import * as WebBrowser from 'expo-web-browser';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

// 🔑 Firebase
import { auth } from "./firebaseClient";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

// AdMob
import { AdMobInterstitial, AdMobRewarded } from 'expo-ads-admob';

/**
 * LovPuzzle v4 — Galerie EN LIGNE
 */

const Stack = createNativeStackNavigator();
const Footer = () => (
  <View style={{ marginTop: 30, alignItems: 'center' }}>
    <Text style={{ color: '#6c3483', fontWeight: 'bold', fontSize: 14 }}>BY TY</Text>
  </View>
);

const apiKey = '05b9fb28434e692b36591d7b7e9c4295';

const GALLERY = {
  voiture: [
    'https://i.ibb.co/Ng8yS5M7/photo.jpg',
    'https://i.ibb.co/RGj0vDVB/photo.jpg',
    'https://i.ibb.co/gZCBFmdz/photo.jpg',
  ],
  paysage: [
    'https://i.ibb.co/TqkCNFYY/photo.jpg',
    'https://i.ibb.co/RkBH1mgY/photo.jpg',
    'https://i.ibb.co/PGjQ8VYh/photo.jpg',
  ],
  anime: [
    'https://i.ibb.co/gGfTYNJ/photo.jpg',
    'https://i.ibb.co/67gKZPXY/photo.jpg',
    'https://i.ibb.co/216jZPv6/photo.jpg',
  ],
  film: [
    'https://i.ibb.co/FbbVjqWC/photo.jpg',
    'https://i.ibb.co/sJJDKtmh/photo.jpg',
    'https://i.ibb.co/ycwMLCnZ/photo.jpg',
  ],
};

const isModuleAsset = (img) => typeof img === 'number';
const getImageSource = (img) => (typeof img === 'string' ? { uri: img } : img);

const shuffleArray = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function HomeScreen({ navigation }) {
  useEffect(() => {
    const loadInterstitial = async () => {
      await AdMobInterstitial.setAdUnitID('ca-app-pub-1008782192504205/1869577567');
      await AdMobInterstitial.requestAdAsync({ servePersonalizedAds: true });
      await AdMobInterstitial.showAdAsync();
    };
    loadInterstitial();
  }, []);

  const [hearts, setHearts] = useState(0);
  const [mode, setMode] = useState('solo');
  const [grid, setGrid] = useState(3);
  const [exportCode, setExportCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState('voiture');

  const [bags, setBags] = useState(() => {
    const initial = {};
    Object.keys(GALLERY).forEach((t) => {
      initial[t] = shuffleArray(GALLERY[t]);
    });
    return initial;
  });
  useEffect(() => {
    (async () => {
      // Permission utile pour le mode Multi (sélection de photo)
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const makeSolvedMap = (n) => Array.from({ length: n * n }, (_, i) => i);
  const shuffleMap = (n) => shuffleArray(makeSolvedMap(n));

  // --- MULTI : choisir photo perso → upload ImgBB → code à partager
  const uploadToImgBB = async (localUri) => {
    const formData = new FormData();
    formData.append('image', { uri: localUri, name: 'photo.jpg', type: 'image/jpeg' });
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
      const json = await res.json();
      return json?.data?.display_url; // URL directe ImgBB
    } catch (err) {
      Alert.alert('Erreur', "Échec de l’upload de la photo");
      return null;
    }
  };

  const choosePhoto = async () => {
    const pickerRes = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (pickerRes.canceled || !pickerRes.assets?.length) return null;
    const uri = pickerRes.assets[0].uri;

    // Upload de la vraie photo
    const out = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024, height: 1024 } }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );
    const originalUrl = await uploadToImgBB(out.uri);
    if (!originalUrl) return null;

    const m = shuffleMap(grid);
    const payload = JSON.stringify({
      img: 'https://i.ibb.co/7gL6jD2/sample-land-1.jpg',
      imgClear: originalUrl,
      grid,
      map: m,
      msg: message
    });
    setExportCode(payload);
  };

  const loadPuzzleFromCode = () => {
    try {
      const obj = JSON.parse(importCode);
      navigation.navigate('Puzzle', { puzzle: obj, addHeart: () => setHearts(h => h + 1) });
    } catch (e) {
      alert('Code invalide');
    }
  };

  // --- SOLO : pioche dans le sac du thème choisi
  const startSolo = () => {
    setBags((prev) => {
      const currentBag = prev[theme] && prev[theme].length ? prev[theme].slice() : shuffleArray(GALLERY[theme]);
      if (currentBag.length === 0) {
        currentBag.push(...shuffleArray(GALLERY[theme]));
      }
      const chosen = currentBag.shift();
      const nextBags = { ...prev, [theme]: currentBag.length ? currentBag : shuffleArray(GALLERY[theme]) };

      const m = shuffleMap(grid);
      navigation.navigate('Puzzle', { puzzle: { img: chosen, grid, map: m, msg: `Mode Solo – thème: ${theme}` }, addHeart: () => setHearts(h => h + 1) });

      return nextBags;
    });
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar hidden />
      <Text style={styles.title}>💖 LovPuzzle</Text>
      <Text style={{ color: '#ff4081', fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginTop: 10 }}>
        ❤️ Cœurs : {hearts}
      </Text>
      <Text style={styles.subtitle}> Solo / Duo</Text>

      {/* Toggle Solo / Multi */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 6 }}>
        {['solo', 'multi'].map((m) => (
          <TouchableOpacity
            key={m}
            style={{
              backgroundColor: mode === m ? '#d63384' : '#fce4ec',
              padding: 10,
              marginHorizontal: 4,
              borderRadius: 8
            }}
            onPress={() => setMode(m)}
          >
            <Text style={{ color: '#6c3483', fontWeight: '700' }}>
              {m === 'solo' ? '🎮 Solo' : '🤝 Multijoueurs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Difficulté */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
        {[4, 5, 6, 8, 10].map((n) => (
          <TouchableOpacity
            key={n}
            style={{
              backgroundColor: grid === n ? '#d63384' : '#fce4ec',
              padding: 10,
              marginHorizontal: 4,
              borderRadius: 8
            }}
            onPress={() => setGrid(n)}
          >
            <Text style={{ color: '#6c3483', fontWeight: '700' }}>{n}×{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* MODE SOLO */}
      {mode === 'solo' && (
        <View style={{ marginTop: 18 }}>
          <Text style={styles.subtitle}>🖼️ Mode Solo – choisis un thème :</Text>

          {/* Thèmes surprises */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
            {['Surprise 1', 'Surprise 2', 'Surprise 3'].map((t) => {
              const requiredHearts = t === 'Surprise 1' ? 50 : t === 'Surprise 2' ? 100 : 500;
              const unlocked = hearts >= requiredHearts;
              return (
                <TouchableOpacity
                  key={t}
                  style={{
                    opacity: unlocked ? 1 : 0.4,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    margin: 6,
                    borderRadius: 20,
                    backgroundColor: unlocked ? '#6c3483' : '#ccc'
                  }}
                  onPress={() => {
                    if (unlocked) setTheme(t);
                  }}
                >
                  <Text style={{ color: unlocked ? '#fff' : '#666', fontWeight: '700' }}>#{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Thèmes normaux */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.keys(GALLERY).map((t) => (
              <TouchableOpacity
                key={t}
                style={{
                  backgroundColor: theme === t ? '#6c3483' : '#fce4ec',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  margin: 6,
                  borderRadius: 20
                }}
                onPress={() => setTheme(t)}
              >
                <Text style={{ color: theme === t ? '#fff' : '#6c3483', fontWeight: '700' }}>#{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#2e7d32', alignSelf: 'center' }]}
            onPress={startSolo}
          >
            <Text style={styles.btnText}>🎮 Jouer en Solo (aléatoire)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODE MULTI */}
      {mode === 'multi' && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.subtitle}>💌 Message pour ton partenaire :</Text>
          <TextInput
            style={styles.input}
            placeholder="Un petit mot..."
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity style={styles.btn} onPress={choosePhoto}>
            <Text style={styles.btnText}>📷 Choisir une photo (upload ImgBB)</Text>
          </TouchableOpacity>

          {exportCode ? (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.subtitle}>🔗 Code à partager :</Text>
              <Text selectable style={styles.codeBox}>{exportCode}</Text>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#d63384', marginTop: 10 }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(exportCode);
                  alert('Code copié 💖');
                }}
              >
                <Text style={styles.btnText}>📋 Copier le code</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={{ marginTop: 30 }}>
            <Text style={styles.subtitle}>📥 Coller un code reçu :</Text>
            <TextInput
              style={styles.input}
              placeholder="Coller ici le code reçu"
              value={importCode}
              onChangeText={setImportCode}
              multiline
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#6c3483' }]}
              onPress={loadPuzzleFromCode}
            >
              <Text style={styles.btnText}>📤 Charger le puzzle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: '#6c3483', alignSelf: 'center' }]}
        onPress={() => navigation.navigate('Notice')}
      >
        <Text style={styles.btnText}>🆘 Aide</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
      <Footer />
    </ScrollView>
  );
}

// === PUZZLE SCREEN ===
function PuzzleScreen({ route }) {
  const [sound, setSound] = useState(null);
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const playMusic = async () => {
        const { sound } = await Audio.Sound.createAsync(
          require('./assets/music.mp3'),
          { isLooping: true, volume: 0.5 }
        );
        if (isMounted) {
          setSound(sound);
          await sound.playAsync();
        }
      };
      playMusic();
      return () => {
        isMounted = false;
        if (sound) {
          sound.stopAsync();
          sound.unloadAsync();
        }
      };
    }, [])
  );

  const { puzzle, addHeart } = route.params; // ✅ on récupère addHeart
  const [map, setMap] = useState(puzzle.map);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const { img, imgClear, grid, msg } = puzzle;
  const imageToUse = imgClear || img;
  const { width } = Dimensions.get('window');
  const size = Math.min(width - 40, 700);
  const tileSize = size / grid;

  // Zoom pincement
  const pinchScale = useRef(new Animated.Value(1)).current;
  const baseScale = useRef(new Animated.Value(1)).current;
  const scale = Animated.multiply(baseScale, pinchScale);
  const lastScale = useRef(1);
  const onPinchGestureEvent = Animated.event([{ nativeEvent: { scale: pinchScale } }], { useNativeDriver: true });
  const onPinchHandlerStateChange = (event) => {
    if (event.nativeEvent.state === State.END || event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current = Math.max(1, Math.min(lastScale.current * event.nativeEvent.scale, 3));
      baseScale.setValue(lastScale.current);
      pinchScale.setValue(1);
    }
  };
  const handleTilePress = (index) => {
    if (selected === null) {
      setSelected(index);
    } else {
      const newMap = [...map];
      [newMap[selected], newMap[index]] = [newMap[index], newMap[selected]];
      setMap(newMap);
      setMoves((m) => m + 1);
      setSelected(null);
      if (JSON.stringify(newMap) === JSON.stringify([...newMap].sort((a, b) => a - b))) {
        setSolved(true);
      }
    }
  };

  useEffect(() => {
    if (solved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const showRewardedAd = async () => {
        await AdMobRewarded.setAdUnitID('ca-app-pub-1008782192504205/8971647317');
        await AdMobRewarded.requestAdAsync();
        await AdMobRewarded.showAdAsync();
      };

      const listener = AdMobRewarded.addEventListener('rewardedVideoUserDidEarnReward', () => {
        console.log('Récompense obtenue !');
        if (addHeart) addHeart(); // ✅ ajoute 1 cœur au compteur global
      });

      showRewardedAd();

      return () => listener.remove();
    }
  }, [solved]);

  const downloadOriginal = async () => {
    try {
      const MediaLibrary = await import('expo-media-library');
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission requise', "Autorise l’accès à la galerie pour enregistrer la photo.");
        return null;
      }

      let finalUri = null;
      if (isModuleAsset(img)) {
        const AssetModule = await import('expo-asset');
        const asset = AssetModule.Asset.fromModule(img);
        await asset.downloadAsync();
        finalUri = asset.localUri || asset.uri || null;
      } else if (typeof img === 'string') {
        const FileSystemModule = await import('expo-file-system');
        const FileSystem = FileSystemModule.default || FileSystemModule;
        const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + 'lovpuzzle.jpg';
        const dl = await FileSystem.downloadAsync(img, fileUri);
        finalUri = dl.uri;
      }

      if (!finalUri) throw new Error('URI introuvable');

      await MediaLibrary.saveToLibraryAsync(finalUri);
      Alert.alert('Succès', 'Photo enregistrée dans ta galerie 💖');
    } catch (e) {
      try {
        if (typeof img === 'string') {
          await WebBrowser.openBrowserAsync(img);
        } else {
          Alert.alert('Info', "Impossible d'enregistrer automatiquement cette image locale.");
        }
      } catch (err) {
        try { Linking.openURL(typeof img === 'string' ? img : ''); } catch {}
      }
    }
  };

  // === RETURN de PuzzleScreen ===
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧩 Puzzle</Text>
      {!!msg && <Text style={styles.subtitle}>💌 {msg}</Text>}
      <Text style={{ color: '#6c3483', fontWeight: '700', textAlign: 'center' }}>
        Coups : {moves} {solved ? '✅ Résolu !' : ''}
      </Text>

      <PinchGestureHandler
        onGestureEvent={onPinchGestureEvent}
        onHandlerStateChange={onPinchHandlerStateChange}
      >
        <Animated.View style={{ transform: [{ scale }], alignSelf: 'center', marginTop: 20 }}>
          <View style={{ width: size, height: size, flexWrap: 'wrap', flexDirection: 'row' }}>
            {map.map((correctIndex, i) => {
              const row = Math.floor(correctIndex / grid);
              const col = correctIndex % grid;
              const dx = -col * tileSize;
              const dy = -row * tileSize;
              const isSelected = selected === i;
              return (
                <TouchableOpacity key={i} onPress={() => handleTilePress(i)}>
                  <View
                    style={{
                      width: tileSize,
                      height: tileSize,
                      overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: isSelected ? '#6c3483' : '#d63384',
                    }}
                  >
                    <Image
                      source={getImageSource(imageToUse)}
                      style={{
                        width: size,
                        height: size,
                        transform: [{ translateX: dx }, { translateY: dy }],
                      }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </PinchGestureHandler>

      {solved && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#2e7d32', alignSelf: 'center', marginTop: 16 }]}
          onPress={() => setShowOriginal(true)}
        >
          <Text style={styles.btnText}>👀 Voir la photo originale</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showOriginal} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <Image
            source={getImageSource(imageToUse)}
            style={{ width: width, height: width, resizeMode: 'contain' }}
          />
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#2e7d32' }]}
              onPress={downloadOriginal}
            >
              <Text style={styles.btnText}>⬇️ Télécharger</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#6c3483', marginLeft: 10 }]}
              onPress={() => setShowOriginal(false)}
            >
              <Text style={styles.btnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Footer />
    </ScrollView>
  );
}
function NoticeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🆘 Aide</Text>
      <Image
        source={require('./assets/notice.png')}
        style={{ width: '100%', height: 400, resizeMode: 'contain', marginBottom: 20 }}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: '#6c3483' }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.btnText}>Retour</Text>
      </TouchableOpacity>
      <Footer />
    </ScrollView>
  );
}

// 👉 Écran Login minimal
function LoginScreen() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState("");

  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage("✅ Compte créé !");
    } catch (e) {
      setMessage("❌ " + e.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("✅ Connecté !");
    } catch (e) {
      setMessage("❌ " + e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔐 Connexion</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: '#6c3483' }]}
        onPress={handleLogin}
      >
        <Text style={styles.btnText}>Se connecter</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: '#2e7d32' }]}
        onPress={handleSignup}
      >
        <Text style={styles.btnText}>Créer un compte</Text>
      </TouchableOpacity>
      {!!message && <Text style={styles.subtitle}>{message}</Text>}
      <Footer />
    </ScrollView>
  );
}

export default function App() {
  React.useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync(Ionicons.font);
    }
    loadFonts();
  }, []);

  const [user, setUser] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1e1e2f',
        }}
      >
        <Text style={{ color: '#d63384', fontSize: 18, fontWeight: '800' }}>
          Chargement…
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="Accueil" component={HomeScreen} />
              <Stack.Screen name="Puzzle" component={PuzzleScreen} />
              <Stack.Screen name="Notice" component={NoticeScreen} />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e2f', padding: 20 },
  title: {
    color: '#d63384',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6c3483',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#f06292',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  btnText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    minHeight: 60,
  },
  codeBox: {
    backgroundColor: '#fce4ec',
    color: '#6c3483',
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
  },
});
