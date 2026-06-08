import { useEffect, useRef, useState } from "react";
import { Image, View } from "react-native";
import { crusaderSprites } from "@/data/crusader-sprites";

type AnimationType = "idle" | "attack" | "gotHit" | "death";

type Props = {
  animation: AnimationType;
  flipped?: boolean;
  size?: number;
  onComplete?: () => void;
};

const FPS = 12;
const LOOP_ANIMS: AnimationType[] = ["idle"];

export function CrusaderSprite({ animation, flipped = false, size = 120, onComplete }: Props) {
  const [frameIndex, setFrameIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setFrameIndex(0);
    const frames = crusaderSprites[animation];
    const loop = LOOP_ANIMS.includes(animation);
    let current = 0;

    const timer = setInterval(() => {
      current += 1;
      if (current >= frames.length) {
        if (loop) {
          current = 0;
        } else {
          clearInterval(timer);
          setFrameIndex(frames.length - 1);
          onCompleteRef.current?.();
          return;
        }
      }
      setFrameIndex(current);
    }, 1000 / FPS);

    return () => clearInterval(timer);
  }, [animation]);

  const frames = crusaderSprites[animation];
  const safeIndex = Math.min(frameIndex, frames.length - 1);
  const aspectRatio = 299 / 240;

  return (
    <View style={{ transform: flipped ? [{ scaleX: -1 }] : undefined }}>
      <Image
        source={frames[safeIndex]}
        style={{ width: size, height: size / aspectRatio }}
        resizeMode="contain"
      />
    </View>
  );
}
