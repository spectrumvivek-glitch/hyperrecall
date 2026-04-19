import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SW, height: SH } = Dimensions.get("window");
const MAX_SCALE = 5;
const MIN_SCALE = 1;

interface Props {
  visible: boolean;
  images: { id: string; uri: string }[];
  initialIndex: number;
  onClose: () => void;
}

export function ZoomableImageViewer({
  visible,
  images,
  initialIndex,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [pagingEnabled, setPagingEnabled] = useState(true);

  useEffect(() => {
    if (visible) setActiveIndex(initialIndex);
  }, [visible, initialIndex]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#000"
          translucent
        />
        <View style={styles.container}>
          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.counter}>
              {activeIndex + 1} / {images.length}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <Feather name="x" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={images}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled={pagingEnabled}
            scrollEnabled={pagingEnabled}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: SW,
              offset: SW * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / SW);
              setActiveIndex(i);
            }}
            renderItem={({ item }) => (
              <ZoomableImage
                uri={item.uri}
                onZoomChange={(zoomed) => setPagingEnabled(!zoomed)}
              />
            )}
          />

          {/* Hint */}
          <View style={[styles.hintBar, { paddingBottom: insets.bottom + 12 }]}>
            <Text style={styles.hint}>
              Pinch to zoom • Double-tap to toggle • Drag to pan
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

interface ZoomableImageProps {
  uri: string;
  onZoomChange: (zoomed: boolean) => void;
}

function ZoomableImage({ uri, onZoomChange }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reset = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    onZoomChange(false);
  };

  const clampTranslation = (s: number, tx: number, ty: number) => {
    "worklet";
    const maxX = (SW * (s - 1)) / 2;
    const maxY = (SH * (s - 1)) / 2;
    return {
      x: Math.min(Math.max(tx, -maxX), maxX),
      y: Math.min(Math.max(ty, -maxY), maxY),
    };
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = Math.min(
        Math.max(savedScale.value * e.scale, MIN_SCALE),
        MAX_SCALE
      );
      scale.value = next;
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
        const c = clampTranslation(
          scale.value,
          translateX.value,
          translateY.value
        );
        translateX.value = withTiming(c.x);
        translateY.value = withTiming(c.y);
        savedTranslateX.value = c.x;
        savedTranslateY.value = c.y;
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      const c = clampTranslation(
        scale.value,
        savedTranslateX.value + e.translationX,
        savedTranslateY.value + e.translationY
      );
      translateX.value = c.x;
      translateY.value = c.y;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  // Notify parent about zoom state to disable horizontal paging while zoomed
  const animatedStyle = useAnimatedStyle(() => {
    const zoomed = scale.value > 1.02;
    // Side-effect notify (run on JS): this is fine inside worklet via runOnJS,
    // but we keep it cheap — only when state crosses the threshold.
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Track zoom state for the parent paging toggle.
  // We poll via a useDerivedValue alternative: useEffect on a tracked state.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      onZoomChange(scale.value > 1.02);
    }, 120);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  return (
    <View style={styles.imageWrap}>
      <GestureDetector gesture={composed}>
        <Animated.Image
          source={{ uri }}
          style={[styles.image, animatedStyle]}
          resizeMode="contain"
        />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  container: { flex: 1, backgroundColor: "#000" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  counter: { color: "#fff", fontSize: 15, fontWeight: "600" },
  closeBtn: { padding: 4 },
  imageWrap: {
    width: SW,
    height: SH,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: SW, height: SH },
  hintBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  hint: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
});
