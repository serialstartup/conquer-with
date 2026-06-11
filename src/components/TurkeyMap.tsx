import React, { useState, useEffect } from 'react';
import { Dimensions, View, Text } from 'react-native';
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
const PLAYER_COLORS = ['#1e40af', '#991b1b', '#166534', '#854d0e'];
const EMPTY_COLOR = '#1e293b';
const BORDER_COLOR = '#ffffff60';
const CASTLE_STROKE = '#F59E0B';
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ICON_ZOOM_THRESHOLD = 1.8;

type PlayerInfo = {
  id: string;
  seat: number;
  main_province_id: number;
  username: string;
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
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedProvinceId === null) return;
    const t = setTimeout(() => setSelectedProvinceId(null), 3000);
    return () => clearTimeout(t);
  }, [selectedProvinceId]);

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

  const selectedInfo = selectedProvinceId !== null ? {
    pData: provinceData.find(p => p.id === selectedProvinceId),
    soldiers: getSoldiers(selectedProvinceId),
    owner: players.find(p => p.id === provinces[String(selectedProvinceId)]?.owner_id),
  } : null;

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
              const isSelected = province.id === selectedProvinceId;

              return (
                <React.Fragment key={province.id}>
                  <Path
                    d={data.path}
                    fill={fill}
                    fillOpacity={
                      selectedProvinceId !== null && !isSelected
                        ? 0.35
                        : isMyTurn ? 1 : 0.65
                    }
                    stroke={isSelected ? '#F59E0B' : castlePlayer ? CASTLE_STROKE : BORDER_COLOR}
                    strokeWidth={isSelected ? 3 : castlePlayer ? 2.5 : 1}
                    strokeOpacity={isSelected ? 1 : castlePlayer ? 1 : 0.7}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedProvinceId(null);
                        return;
                      }
                      setSelectedProvinceId(null);
                      if (!disabled && isMyTurn) onProvincePress(province.id);
                    }}
                    onLongPress={() => {
                      if (!disabled) setSelectedProvinceId(province.id);
                    }}
                  />
                  {showIcons && owned && castlePlayer && (
                    <SvgImage
                      href={require('../../assets/icons/castle.jpg')}
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
        {selectedInfo && (
          <View className="absolute bottom-0 left-0 right-0 bg-slate-900/90 px-4 py-2 flex-row items-center justify-between">
            <Text className="text-amber-400 font-bold text-sm">{selectedInfo.pData?.name ?? '—'}</Text>
            <Text className="text-slate-400 text-xs">{selectedInfo.pData?.region}</Text>
            <Text className="text-white text-xs">⚔ {selectedInfo.soldiers}</Text>
            <Text className="text-slate-300 text-xs">{selectedInfo.owner?.username ?? 'Boş'}</Text>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}
