// src/components/TurkeyMap.tsx
import React from 'react';
import { Dimensions, ScrollView } from 'react-native';
import Svg, { Path, Text as SvgText, Image as SvgImage } from 'react-native-svg';
import provincesPaths from '@/data/provinces-paths.json';
import type { Province, Provinces } from '@/types/game';

const VIEWBOX_W = 800;
const VIEWBOX_H = 480;
const PLAYER_COLORS = ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'];
const EMPTY_COLOR = '#334155';
const EMPTY_STROKE = '#475569';

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
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ alignItems: 'center' }}
      scrollEnabled={false}
    >
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
                stroke={castlePlayer ? PLAYER_COLORS[(castlePlayer.seat - 1) % PLAYER_COLORS.length] : EMPTY_STROKE}
                strokeWidth={castlePlayer ? 2 : 0.5}
                strokeOpacity={castlePlayer ? 0.9 : 0.5}
                onPress={() => {
                  if (!disabled && isMyTurn) onProvincePress(province.id);
                }}
              />
              {owned && castlePlayer && (
                <SvgImage
                  href={require('../../assets/icons/castle.png')}
                  x={cx - 8}
                  y={cy - 8}
                  width={16}
                  height={16}
                />
              )}
              {owned && !castlePlayer && soldiers > 0 && (
                <SvgText
                  x={cx}
                  y={cy + 4}
                  fontSize={9}
                  fill="white"
                  textAnchor="middle"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {soldiers}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </ScrollView>
  );
}
