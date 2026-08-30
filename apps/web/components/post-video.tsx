"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Hls from "hls.js";

import { becomeActiveVideo, releaseActiveVideo } from "@/lib/media/active-video";
import { cn } from "@/lib/cn";

type PostVideoProps = {
  src: string;
  poster: string | null;
  alt: string;
};

export function PostVideo({ src, poster, alt }: PostVideoProps) {
  const t = useTranslations("feed.post");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    if (!Hls.isSupported()) return;

    const hls = new Hls({ enableWorker: true, maxBufferLength: 20 });
    hls.loadSource(src);
    hls.attachMedia(video);
    return () => {
      hls.destroy();
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.65 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (inView) {
      becomeActiveVideo(video);
      void video.play().catch(() => {
        // Autoplay can be blocked; poster stays visible.
      });
      return;
    }

    video.pause();
    releaseActiveVideo(video);
  }, [inView]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover"
        poster={poster ?? undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
      />
      <button
        type="button"
        data-video-control
        className={cn(
          "absolute bottom-3 left-3 z-10 rounded-full bg-bg/70 px-2.5 py-1 text-caption backdrop-blur-sm",
        )}
        aria-label={muted ? t("a11y.unmute") : t("a11y.mute")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMuted((current) => !current);
        }}
      >
        {muted ? t("a11y.unmute") : t("a11y.mute")}
      </button>
    </>
  );
}
