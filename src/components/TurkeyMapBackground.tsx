import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import provincesPaths from '@/data/provinces-paths.json';

const VIEWBOX_W = 800;
const VIEWBOX_H = 480;

const pathsData = provincesPaths as unknown as Record<string, { path: string; centroid: [number, number] }>;
const provinceIds = Object.keys(pathsData);

export function TurkeyMapBackground() {
  const { width: screenW } = Dimensions.get('window');
  const svgH = Math.round(screenW * VIEWBOX_H / VIEWBOX_W);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width={screenW}
        height={svgH}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      >
        {provinceIds.map(id => {
          const data = pathsData[id];
          if (!data) return null;
          return (
            <Path
              key={id}
              d={data.path}
              fill="#1e3a5f"
              stroke="#334155"
              strokeWidth={0.5}
            />
          );
        })}
      </Svg>
    </View>
  );
}
