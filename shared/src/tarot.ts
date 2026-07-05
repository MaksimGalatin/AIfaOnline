// Rider-Waite-Smith Major Arcana (public domain, 1909). Images via Wikimedia Special:FilePath.
const MAJOR: [string, string, string, string][] = [
  ["The Fool","Шут","RWS_Tarot_00_Fool.jpg","new beginnings, spontaneity, faith"],
  ["The Magician","Маг","RWS_Tarot_01_Magician.jpg","willpower, manifestation, skill"],
  ["The High Priestess","Жрица","RWS_Tarot_02_High_Priestess.jpg","intuition, secrets, inner voice"],
  ["The Empress","Императрица","RWS_Tarot_03_Empress.jpg","abundance, nurturing, creativity"],
  ["The Emperor","Император","RWS_Tarot_04_Emperor.jpg","structure, authority, stability"],
  ["The Hierophant","Иерофант","RWS_Tarot_05_Hierophant.jpg","tradition, guidance, beliefs"],
  ["The Lovers","Влюблённые","RWS_Tarot_06_Lovers.jpg","love, choices, harmony"],
  ["The Chariot","Колесница","RWS_Tarot_07_Chariot.jpg","drive, victory, willpower"],
  ["Strength","Сила","RWS_Tarot_08_Strength.jpg","courage, patience, inner strength"],
  ["The Hermit","Отшельник","RWS_Tarot_09_Hermit.jpg","introspection, wisdom, solitude"],
  ["Wheel of Fortune","Колесо Фортуны","RWS_Tarot_10_Wheel_of_Fortune.jpg","change, cycles, destiny"],
  ["Justice","Справедливость","RWS_Tarot_11_Justice.jpg","fairness, truth, cause and effect"],
  ["The Hanged Man","Повешенный","RWS_Tarot_12_Hanged_Man.jpg","surrender, new perspective, pause"],
  ["Death","Смерть","RWS_Tarot_13_Death.jpg","transformation, endings, renewal"],
  ["Temperance","Умеренность","RWS_Tarot_14_Temperance.jpg","balance, patience, blending"],
  ["The Devil","Дьявол","RWS_Tarot_15_Devil.jpg","temptation, attachment, shadow"],
  ["The Tower","Башня","RWS_Tarot_16_Tower.jpg","sudden change, awakening, release"],
  ["The Star","Звезда","RWS_Tarot_17_Star.jpg","hope, healing, inspiration"],
  ["The Moon","Луна","RWS_Tarot_18_Moon.jpg","intuition, illusion, the unknown"],
  ["The Sun","Солнце","RWS_Tarot_19_Sun.jpg","joy, success, vitality"],
  ["Judgement","Суд","RWS_Tarot_20_Judgement.jpg","awakening, reckoning, renewal"],
  ["The World","Мир","RWS_Tarot_21_World.jpg","completion, fulfilment, wholeness"],
];
export interface TarotCard { en: string; ru: string; url: string; meaning: string; }
export function drawThree(): TarotCard[] {
  const idx = new Set<number>();
  while (idx.size < 3) idx.add(Math.floor(Math.random() * MAJOR.length));
  return [...idx].map(i => ({ en: MAJOR[i][0], ru: MAJOR[i][1], url: "https://commons.wikimedia.org/wiki/Special:FilePath/" + MAJOR[i][2], meaning: MAJOR[i][3] }));
}
export function tarotReadingPrompt(cards: TarotCard[], question: string, ln: string): string {
  const list = cards.map((c, i) => `${["Past","Present","Future"][i]}: ${c.en} (${c.meaning})`).join("; ");
  return `Write in ${ln}. You are AIfa, a wise tarot reader. The 3-card spread (Past, Present, Future) drawn for the question "${question}" is: ${list}. ` +
    `Interpret EACH of these exact cards in its position and weave them into a clear, warm, insightful answer to the question with concrete guidance. About 250-350 words.`;
}
