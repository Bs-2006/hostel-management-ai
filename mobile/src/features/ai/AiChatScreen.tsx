import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import { chatWithAI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SESSION_KEY = '@ai_session_id';

interface QuickPrompt {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  prompt: string;
}

const STUDENT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: 'Book an outing',
    icon: 'walk-outline',
    prompt: 'Help me book an outing from the hostel.',
  },
  {
    label: 'File a complaint',
    icon: 'megaphone-outline',
    prompt: 'I want to file a complaint about the hostel.',
  },
  {
    label: 'Food menu',
    icon: 'restaurant-outline',
    prompt: 'What is on the food menu this week?',
  },
  {
    label: 'My attendance',
    icon: 'calendar-outline',
    prompt: 'What is my attendance?',
  },
];

const WARDEN_QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: 'Food menu',
    icon: 'restaurant-outline',
    prompt: 'Show me today\'s food menu.',
  },
  {
    label: 'Attendance',
    icon: 'calendar-outline',
    prompt: 'Show me today\'s attendance for all students.',
  },
  {
    label: 'Complaints',
    icon: 'megaphone-outline',
    prompt: 'Show me the pending complaints from students.',
  },
  {
    label: 'Outing requests',
    icon: 'walk-outline',
    prompt: 'Show me the outing requests from students.',
  },
  {
    label: 'Rooms',
    icon: 'bed-outline',
    prompt: 'Show me the available rooms.',
  },
  {
    label: 'Students',
    icon: 'people-outline',
    prompt: 'Show me all students.',
  },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  failed?: boolean;
}

interface SpeechModule {
  start: (options: unknown) => void;
  stop: () => void;
  addListener: (
    event: string,
    fn: (e: any) => void,
  ) => { remove: () => void };
}

type AttachKind = 'file' | 'camera' | 'photos';

interface AttachOption {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  kind: AttachKind;
}

const ATTACH_OPTIONS: AttachOption[] = [
  { label: 'File', icon: 'document-outline', kind: 'file' },
  { label: 'Camera', icon: 'camera-outline', kind: 'camera' },
  { label: 'Photos', icon: 'image-outline', kind: 'photos' },
];

interface AttachmentItem {
  id: string;
  kind: AttachKind;
  label: string;
  uri?: string;
}

let idSeed = 0;
function nextId(): string {
  idSeed += 1;
  return `${Date.now()}-${idSeed}`;
}

function TypingDots({ colors }: { colors: ThemeColors }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={typingStyles.row}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[typingStyles.dot, { backgroundColor: colors.muted, opacity }]}
        />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default function AiChatScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const quickPrompts = user?.role === 'warden' ? WARDEN_QUICK_PROMPTS : STUDENT_QUICK_PROMPTS;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const speechRef = useRef<SpeechModule | null>(null);
  const listenerRemoversRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((id) => {
        if (id) setSessionId(id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) {
      setVoiceSupported(false);
      return;
    }

    let mounted = true;
    import('expo-speech-recognition')
      .then((mod) => {
        if (!mounted) return;
        const { ExpoSpeechRecognitionModule } = mod;
        speechRef.current = {
          start: (options) =>
            ExpoSpeechRecognitionModule.start(options as never),
          stop: () => ExpoSpeechRecognitionModule.stop(),
          addListener: (event, fn) => {
            const l = (
              ExpoSpeechRecognitionModule.addListener as unknown as (
                e: string,
                cb: (eventData: any) => void,
              ) => { remove: () => void }
            )(event, fn);
            listenerRemoversRef.current.push(() => l.remove());
            return l;
          },
        };

        speechRef.current.addListener('start', () => setRecognizing(true));
        speechRef.current.addListener('end', () => setRecognizing(false));
        speechRef.current.addListener('result', (e) => {
          setInput(e.results?.[0]?.transcript ?? '');
        });
        speechRef.current.addListener('error', (e) => {
          setRecognizing(false);
          if (e.error !== 'aborted') {
            console.warn('Speech recognition error:', e.error, e.message);
          }
        });
        setVoiceSupported(true);
      })
      .catch(() => {
        if (mounted) setVoiceSupported(false);
      });
    return () => {
      mounted = false;
      listenerRemoversRef.current.forEach((remove) => remove());
      listenerRemoversRef.current = [];
    };
  }, []);

  const scrollToEnd = () => {
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
  };

  const scrollOnFocus = () => {
    requestAnimationFrame(() =>
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60),
    );
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if ((!content && attachments.length === 0) || loading) return;

    const hasAttachments = attachments.length > 0;
    const body =
      content ||
      (hasAttachments
        ? `[${attachments
            .map((a) => a.label)
            .join(', ')} attachment(s) sent]`
        : '');

    if (content) {
      const userMessage: ChatMessage = { id: nextId(), role: 'user', content };
      setMessages((prev) => [...prev, userMessage]);
    }
    setInput('');
    setLoading(true);
    const sentAttachments = attachments;
    setAttachments([]);

    try {
      const data = await chatWithAI(body, sessionId ?? undefined);
      if (data.sessionId) {
        setSessionId(data.sessionId);
        AsyncStorage.setItem(SESSION_KEY, data.sessionId).catch(() => {});
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content:
            "Sorry, I couldn't get a response right now. Please try again in a moment.",
          failed: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMicrophone = async () => {
    if (!speechRef.current) {
      if (voiceSupported === false) {
        Alert.alert(
          'Voice input unavailable',
          'Voice input needs a development build and is not available in Expo Go. Please type your message instead.',
        );
      }
      return;
    }

    if (recognizing) {
      speechRef.current.stop();
      return;
    }

    try {
      const { ExpoSpeechRecognitionModule } = await import(
        'expo-speech-recognition'
      );
      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        console.warn('Microphone permissions not granted', result);
        return;
      }

      speechRef.current.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch (error) {
      console.warn('Unable to start speech recognition', error);
      Alert.alert(
        'Voice input unavailable',
        'Voice input is not available on this device. Please type your message instead.',
      );
    }
  };

  const isEmpty = messages.length === 0;

  const startNewChat = () => {
    if (isEmpty && !sessionId) return;
    setMessages([]);
    setSessionId(null);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  };

  const toggleAttachMenu = () => {
    setAttachMenuOpen((prev) => !prev);
  };

  const addAttachment = (item: AttachmentItem) => {
    setAttachments((prev) => [...prev, item]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const pickAttachment = async (option: AttachOption) => {
    setAttachMenuOpen(false);
    try {
      switch (option.kind) {
        case 'file': {
          const result = await DocumentPicker.getDocumentAsync();
          if (result.canceled || !result.assets?.[0]) return;
          const asset = result.assets[0];
          addAttachment({
            id: nextId(),
            kind: 'file',
            label: asset.name || 'Document',
            uri: asset.uri,
          });
          break;
        }
        case 'photos': {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
          });
          if (result.canceled || !result.assets?.[0]) return;
          const asset = result.assets[0];
          addAttachment({
            id: nextId(),
            kind: 'photos',
            label: 'Image',
            uri: asset.uri,
          });
          break;
        }
        case 'camera': {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert(
              'Camera permission needed',
              'Allow camera access to take photos to attach.',
            );
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
          });
          if (result.canceled || !result.assets?.[0]) return;
          const asset = result.assets[0];
          addAttachment({
            id: nextId(),
            kind: 'camera',
            label: 'Camera photo',
            uri: asset.uri,
          });
          break;
        }
      }
    } catch (error) {
      console.warn('Attachment error', error);
      Alert.alert('Attachment failed', 'Could not attach the selected item.');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.content}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.aiRow}>
                <View style={styles.aiIcon}>
                  <Ionicons name="sparkles" size={13} color="#000000" />
                </View>
                <View style={[styles.aiBubble, item.failed && styles.aiBubbleError]}>
                  <Text style={[styles.aiText, item.failed && styles.aiTextError]}>
                    {item.content}
                  </Text>
                </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={15} color="#000000" />
        </View>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={startNewChat}
            hitSlop={6}
            disabled={isEmpty && !sessionId}
          >
            <Ionicons name="refresh-outline" size={22} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.replace('/(app)/(tabs)/dashboard')}
            hitSlop={6}
          >
            <Ionicons name="home-outline" size={22} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}
        enabled
      >
        {isEmpty ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles" size={26} color="#000000" />
            </View>
            <Text style={styles.emptyTitle}>How can I help you?</Text>
            <Text style={styles.emptySub}>Ask me anything or pick a shortcut.</Text>
            <View style={styles.suggestWrap}>
              {quickPrompts.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={styles.suggestChip}
                  onPress={() => send(p.prompt)}
                  hitSlop={4}
                >
                  <Ionicons name={p.icon} size={16} color="#000000" />
                  <Text style={styles.suggestText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            style={styles.flex}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={scrollToEnd}
            onLayout={scrollToEnd}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              loading ? (
                <View style={styles.aiRow}>
                <View style={styles.aiIcon}>
                  <Ionicons name="sparkles" size={13} color="#000000" />
                </View>
                <View style={styles.aiBubble}>
                  <TypingDots colors={colors} />
                </View>
                </View>
              ) : null
            }
          />
        )}

        <View
          style={[
            styles.inputShell,
            { paddingBottom: Math.max(insets.bottom, 10) + 8 },
          ]}
        >
          {attachMenuOpen && (
            <View style={styles.attachMenu}>
              {ATTACH_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={styles.attachItem}
                  onPress={() => pickAttachment(option)}
                  activeOpacity={0.7}
                >
                  <View style={styles.attachIconWrap}>
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color="#000000"
                    />
                  </View>
                  <Text style={styles.attachLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {attachments.length > 0 && (
            <View style={styles.attachmentsRow}>
              {attachments.map((att) => (
                <View key={att.id} style={styles.attachmentChip}>
                  {att.uri && att.kind !== 'file' ? (
                    <Image source={{ uri: att.uri }} style={styles.attachmentImg} />
                  ) : (
                    <View style={styles.attachmentIcon}>
                      <Ionicons name="document-outline" size={18} color="#000000" />
                    </View>
                  )}
                  <Text style={styles.attachmentLabel} numberOfLines={1}>
                    {att.label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeAttachment(att.id)}
                    hitSlop={6}
                    style={styles.attachmentRemove}
                  >
                    <Ionicons name="close" size={14} color="#000000" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={[styles.iconBtn, attachMenuOpen && styles.addOn]}
              onPress={toggleAttachMenu}
              hitSlop={6}
            >
              <Ionicons
                name={attachMenuOpen ? 'close' : 'add'}
                size={22}
                color={attachMenuOpen ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              onFocus={scrollOnFocus}
              placeholder="Message..."
              placeholderTextColor={colors.muted}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => send()}
              multiline
              underlineColorAndroid="transparent"
              cursorColor={colors.text}
              selectionColor={colors.primary}
              textAlignVertical="center"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.iconBtn, recognizing && styles.micOn]}
              onPress={toggleMicrophone}
              hitSlop={6}
            >
              <Ionicons
                name={recognizing ? 'stop' : 'mic-outline'}
                size={20}
                color={recognizing ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !input.trim() && attachments.length === 0 && styles.sendBtnDisabled,
              ]}
              onPress={() => send()}
              disabled={!input.trim() && attachments.length === 0}
              hitSlop={6}
            >
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    flex: {
      flex: 1,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
    },
    headerBtn: {
      padding: 6,
    },

    // Empty state
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 6,
      textAlign: 'center',
    },
    suggestWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
      marginTop: 28,
      maxWidth: 320,
    },
    suggestChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    suggestText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },

    // Chat list
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    userRow: {
      alignItems: 'flex-end',
      marginBottom: 12,
    },
    userBubble: {
      backgroundColor: colors.text,
      borderRadius: 16,
      borderBottomRightRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: '80%',
    },
    userText: {
      color: colors.textLight,
      fontSize: 15,
      lineHeight: 21,
    },
    aiRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    aiIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      marginTop: 2,
    },
    aiBubble: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      borderBottomLeftRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexShrink: 1,
      maxWidth: '80%',
    },
    aiText: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
    },
    aiBubbleError: {
      backgroundColor: colors.pillRed,
      borderColor: colors.border,
    },
    aiTextError: {
      color: colors.rejected,
    },

    // Input
    inputShell: {
      paddingHorizontal: 12,
      paddingTop: 8,
    },
    attachmentsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    attachmentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 4,
      paddingLeft: 4,
      paddingRight: 8,
      gap: 6,
      maxWidth: 180,
    },
    attachmentImg: {
      width: 28,
      height: 28,
      borderRadius: 8,
    },
    attachmentIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachmentLabel: {
      fontSize: 12,
      color: colors.text,
      flexShrink: 1,
    },
    attachmentRemove: {
      padding: 2,
    },
    attachMenu: {
      flexDirection: 'column',
      gap: 2,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 8,
      marginBottom: 8,
    },
    attachItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 12,
    },
    attachIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachLabel: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '600',
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      paddingLeft: 8,
      paddingRight: 8,
      paddingVertical: 7,
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micOn: {
      backgroundColor: colors.primary,
    },
    addOn: {
      backgroundColor: colors.primary,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      maxHeight: 120,
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      backgroundColor: colors.border,
    },
  });