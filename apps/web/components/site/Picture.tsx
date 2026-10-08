import type { Picture as PictureData } from "@/app/blog/posts";
import styles from "./content.module.css";

// W4: a picture drawn in code (scripts/site-art.ts). Served at the column's
// width from two renders (1200 and 600 wide) with explicit dimensions, so the
// layout never shifts while it loads. Heroes are 16:9, figures 1200 × 700.
const SIZES = { hero: { w: 1200, h: 675 }, figure: { w: 1200, h: 700 } } as const;

export function Picture({ picture, kind, priority = false }: { picture: PictureData; kind: keyof typeof SIZES; priority?: boolean }) {
  const { w, h } = SIZES[kind];
  const img = (
    <img
      src={`/art/${picture.art}.webp`}
      srcSet={`/art/${picture.art}-600.webp 600w, /art/${picture.art}.webp 1200w`}
      sizes="(max-width: 800px) 100vw, 760px"
      width={w}
      height={h}
      alt={picture.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
  if (kind === "hero") return <div className={styles.hero}>{img}</div>;
  return (
    <figure className={styles.figure}>
      {img}
      {picture.caption ? <figcaption>{picture.caption}</figcaption> : null}
    </figure>
  );
}
