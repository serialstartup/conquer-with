// src/components/TurkeyMap.tsx
import React, { useState } from 'react';
import { Dimensions, View } from 'react-native';
import Svg, { Path, Text as SvgText, Image as SvgImage } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import provincesPaths from '@/data/provinces-paths.json';
import type { Province, Provinces } from '@/types/game';

const VIEWBOX_W = 800;
const VIEWBOX_H = 480;
const PLAYER_COLORS = ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'];
const EMPTY_COLOR = '#334155';
const EMPTY_STROKE = '#475569';
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ICON_ZOOM_THRESHOLD = 1.8;

type PlayerInfo = {
  id: string;
  seat: number;
  main_province_id: number;
};

type Props = {
  provinces: Provinces;
  provinceData: Province[];
  players: PlayerInfo[];
  currentUserId: string;
  currentTurnId: string;
  onProvincePress: (provinceId: number) => void;
  disabled?: boolean;
};

const pathsData = provincesPaths as unknown as Record<string, { path: string; centroid: [number, number] }>;

export function TurkeyMap({
  provinces,
  provinceData,
  players,
  currentUserId,
  currentTurnId,
  onProvincePress,
  disabled = false,
}: Props) {
  const { width: screenW } = Dimensions.get('window');
  const svgH = Math.round(screenW * VIEWBOX_H / VIEWBOX_W);
  const isMyTurn = currentUserId === currentTurnId;
  const [showIcons, setShowIcons] = useState(false);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  useAnimatedReaction(
    () => scale.value,
    (s) => { runOnJS(setShowIcons)(s >= ICON_ZOOM_THRESHOLD); },
    []
  );

  function clampTranslate(tx: number, ty: number, s: number) {
    'worklet';
    const maxTx = ((s - 1) * screenW) / 2;
    const maxTy = ((s - 1) * svgH) / 2;
    return {
      x: Math.min(maxTx, Math.max(-maxTx, tx)),
      y: Math.min(maxTy, Math.max(-maxTy, ty)),
    };
  }

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale));
      const clamped = clampTranslate(savedTx.value, savedTy.value, scale.value);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    });

  const pan = Gesture.Pan()
    .minDistance(5)
    .onUpdate(e => {
      const clamped = clampTranslate(
        savedTx.value + e.translationX,
        savedTy.value + e.translationY,
        scale.value
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  function getColor(provinceId: number): string {
    const owner = provinces[String(provinceId)]?.owner_id;
    if (!owner) return EMPTY_COLOR;
    const player = players.find(p => p.id === owner);
    if (!player) return EMPTY_COLOR;
    return PLAYER_COLORS[(player.seat - 1) % PLAYER_COLORS.length];
  }

  function getCastlePlayer(provinceId: number): PlayerInfo | undefined {
    return players.find(p => p.main_province_id === provinceId);
  }

  function getSoldiers(provinceId: number): number {
    return provinces[String(provinceId)]?.soldiers ?? 0;
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={[{ width: screenW, height: svgH }, animStyle]}>
          <Svg
            width={screenW}
            height={svgH}
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          >
            {provinceData.map(province => {
              const data = pathsData[String(province.id)];
              if (!data) return null;

              const fill = getColor(province.id);
              const castlePlayer = getCastlePlayer(province.id);
              const soldiers = getSoldiers(province.id);
              const owned = !!provinces[String(province.id)]?.owner_id;
              const [cx, cy] = data.centroid;

              return (
                <React.Fragment key={province.id}>
                  <Path
                    d={data.path}
                    fill={fill}
                    stroke={castlePlayer
                      ? PLAYER_COLORS[(castlePlayer.seat - 1) % PLAYER_COLORS.length]
                      : EMPTY_STROKE}
                    strokeWidth={castlePlayer ? 2 : 0.5}
                    strokeOpacity={castlePlayer ? 0.9 : 0.5}
                    onPress={() => {
                      if (!disabled && isMyTurn) onProvincePress(province.id);
                    }}
                  />
                  {showIcons && owned && castlePlayer && (
                    <SvgImage
                      href={require('../../assets/icons/castle.png')}
                      x={cx - 8}
                      y={cy - 8}
                      width={16}
                      height={16}
                    />
                  )}
                  {showIcons && owned && !castlePlayer && soldiers > 0 && (
                    <SvgText
                      x={cx}
                      y={cy + 4}
                      fontSize={9}
                      fill="white"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {soldiers}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
