// Mapa uuid -> arquivo local (assets baixados do CDN original)
const ASSETS: Record<string,string> = {
  "08800536-63bc-4981-97e4-738175aa5555": "/images/08800536-63bc-4981-97e4-738175aa5555.webp",
  "17e5e063-03f4-4faa-b074-d2dfce5603a8": "/images/17e5e063-03f4-4faa-b074-d2dfce5603a8.webp",
  "4686fd3f-9edc-47ab-bac1-705a1f2ec809": "/images/4686fd3f-9edc-47ab-bac1-705a1f2ec809.webp",
  "5793b422-0a45-4e4d-b152-62c43a819f84": "/images/5793b422-0a45-4e4d-b152-62c43a819f84.webp",
  "6226e18b-8b49-4e7c-b793-d5d34fe8dab8": "/images/6226e18b-8b49-4e7c-b793-d5d34fe8dab8.webp",
  "794ca8b1-a215-4d00-a44f-49aca35681e4": "/images/794ca8b1-a215-4d00-a44f-49aca35681e4.webp",
  "942c4d59-33e5-465c-bd9f-cea7c0243068": "/images/942c4d59-33e5-465c-bd9f-cea7c0243068.webp",
  "9f862c36-e605-45d9-8c7d-a4293d7418d9": "/images/9f862c36-e605-45d9-8c7d-a4293d7418d9.gif",
  "b2af257b-ce93-4dd3-beae-f732d7afd664": "/images/b2af257b-ce93-4dd3-beae-f732d7afd664.webp",
  "beff6925-66f6-4a50-815d-46680fa5ed8c": "/images/beff6925-66f6-4a50-815d-46680fa5ed8c.jpg",
  "ca925e98-4ec7-4c43-b582-1343ff6bd2fd": "/images/ca925e98-4ec7-4c43-b582-1343ff6bd2fd.jpg",
  "ced992c9-0a2e-44af-86c4-774f8e509de3": "/images/ced992c9-0a2e-44af-86c4-774f8e509de3.png",
  "d661ae3f-2f6b-4f8c-bd4e-fcd7d37d9487": "/images/d661ae3f-2f6b-4f8c-bd4e-fcd7d37d9487.png",
  "d7f4ab85-80de-4674-abc8-8e13370c2b86": "/images/d7f4ab85-80de-4674-abc8-8e13370c2b86.webp"
};

export function asset(uuid?: string | null): string {
  if (!uuid) return '';
  const local = ASSETS[uuid];
  // BASE_URL cobre o subcaminho do GitHub Pages ("/quiz-ia-pro/").
  if (local) return import.meta.env.BASE_URL.replace(/\/$/, '') + local;
  return `https://cdn.xquiz.co/images/${uuid}`;
}
