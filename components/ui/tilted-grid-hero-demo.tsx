import { TiltedGridHero } from "@/components/ui/tilted-grid-hero";

// Unsplash stock photography. Each URL asks the Unsplash image CDN for a
// 16:9 crop sized for the tiles; object-cover handles any remaining mismatch.
const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&h=675&q=80`;

const IMAGES = [
  {
    src: unsplash("photo-1506905925346-21bda4d32df4"),
    alt: "Mountain peaks rising above a sea of clouds at sunrise",
  },
  {
    src: unsplash("photo-1470071459604-3b5ec3a7fe05"),
    alt: "Misty green hills under a soft morning light",
  },
  {
    src: unsplash("photo-1441974231531-c6227db76b6e"),
    alt: "Sunlight streaming through a dense green forest",
  },
  {
    src: unsplash("photo-1507525428034-b723cf961d3e"),
    alt: "Turquoise ocean waves rolling onto a sandy beach",
  },
  {
    src: unsplash("photo-1501785888041-af3ef285b470"),
    alt: "Lake reflecting mountains and a pastel sky",
  },
  {
    src: unsplash("photo-1469474968028-56623f02e42e"),
    alt: "Sun setting behind a rocky mountain valley",
  },
  {
    src: unsplash("photo-1447752875215-b2761acb3c5d"),
    alt: "Wooden boardwalk leading into an autumn forest",
  },
  {
    src: unsplash("photo-1500530855697-b586d89ba3ee"),
    alt: "Winding road through a wide desert landscape",
  },
  {
    src: unsplash("photo-1433086966358-54859d0ed716"),
    alt: "Waterfall cascading over mossy cliffs",
  },
  {
    src: unsplash("photo-1472214103451-9374bd1c798e"),
    alt: "Rolling meadow at golden hour",
  },
];

export default function TiltedGridHeroDemo() {
  return (
    <TiltedGridHero
      images={IMAGES}
      className="h-[560px] w-full rounded-lg border border-border bg-background"
    >
      <div className="relative z-10 flex h-full flex-col items-center justify-between py-12 text-center">
        <div className="px-6">
          <h1 className="text-balance text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Every frame,
            <br />
            brought into focus.
          </h1>
        </div>
        <p className="max-w-md text-balance px-6 text-sm text-muted-foreground">
          Images curve in from one edge, flatten out at the centre, then fade
          away round the other.
        </p>
      </div>
    </TiltedGridHero>
  );
}
