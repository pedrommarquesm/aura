export type DemoPost = {
  id: string;
  username: string;
  caption: string;
  image: string;
  aura: number;
  likes: number;
  comments: number;
};

export const DEMO_POSTS: DemoPost[] = [
  {
    id: "unbothered",
    username: "maya",
    caption: "left the group chat on read. unbothered.",
    image: "/demo/maya.jpg",
    aura: 1280,
    likes: 128,
    comments: 18,
  },
  {
    id: "fit",
    username: "kai",
    caption: "the fit spoke first. i just showed up.",
    image: "/demo/kai.jpg",
    aura: 860,
    likes: 86,
    comments: 9,
  },
  {
    id: "cold",
    username: "noura",
    caption:
      "coldest walk home of my life and i meant it. the air hit different and i did not look back once.",
    image: "/demo/noura.jpg",
    aura: 2140,
    likes: 214,
    comments: 31,
  },
];
