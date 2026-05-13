import React from "react";
import { Image, ImageStyle, StyleProp, View, ViewStyle } from "react-native";

const TROPHIES = [
  require("@/assets/images/ranks/rank_trophy_0_bronzestone.png"),
  require("@/assets/images/ranks/rank_trophy_1_silverstone.png"),
  require("@/assets/images/ranks/rank_trophy_2_platinumstone.png"),
  require("@/assets/images/ranks/rank_trophy_3_diamondstone.png"),
  require("@/assets/images/ranks/rank_trophy_4_emeraldstone.png"),
  require("@/assets/images/ranks/rank_trophy_5_hero.png"),
  require("@/assets/images/ranks/rank_trophy_6_master.png"),
  require("@/assets/images/ranks/rank_trophy_7_ultimate_master.png"),
  require("@/assets/images/ranks/rank_trophy_8_god_master.png"),
  require("@/assets/images/ranks/rank_trophy_9_the_boss.png"),
];

interface Props {
  rankIndex: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export function RankTrophy({ rankIndex, size = 96, style, imageStyle }: Props) {
  const safeIdx = Math.max(0, Math.min(rankIndex, TROPHIES.length - 1));
  return (
    <View
      style={[
        { width: size, height: size, alignItems: "center", justifyContent: "center" },
        style,
      ]}
    >
      <Image
        source={TROPHIES[safeIdx]}
        style={[{ width: size, height: size }, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}
