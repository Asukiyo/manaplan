export type CampusMap = {
  key: string;
  label: string;
  image: string;
};

type BuildingPrefix = "G" | "T" | "L" | "S" | "E";

const availableBuildings: Record<BuildingPrefix, ReadonlySet<number>> = {
  G: new Set([1, 2, 3, 4, 5, 6, 7]),
  T: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 20, 21]),
  L: new Set([1, 2, 3]),
  S: new Set([1, 2, 3, 4, 5]),
  E: new Set([1, 2, 3, 4, 5]),
};

const facultyNames: Record<BuildingPrefix, string> = {
  G: "総合校舎",
  T: "工学部",
  L: "法政経学部",
  S: "理学部",
  E: "教育学部",
};

const specialMaps = {
  informationBuilding: {
    key: "information-building",
    label: "情報・データサイエンス学部講義棟",
    image: "/course-maps/information-building.svg",
  },
  engineeringResearch2: {
    key: "engineering-research-2",
    label: "工学系総合研究棟2",
    image: "/course-maps/engineering-research-2.svg",
  },
  advancedDigitalCenter: {
    key: "advanced-digital-center",
    label: "高度デジタル創造センター",
    image: "/course-maps/advanced-digital-center.svg",
  },
  internationalEducationCenter: {
    key: "international-education-center",
    label: "国際教育センター",
    image: "/course-maps/international-education-center.svg",
  },
  informationStrategyCenter: {
    key: "information-strategy-center",
    label: "情報戦略機構",
    image: "/course-maps/information-strategy-center.svg",
  },
} satisfies Record<string, CampusMap>;

function buildingMap(prefix: BuildingPrefix, buildingNumber: number): CampusMap | null {
  if (!availableBuildings[prefix].has(buildingNumber)) return null;
  const code = `${prefix}${buildingNumber}`;
  return {
    key: code,
    label: `${facultyNames[prefix]} ${buildingNumber}号棟（${code}）`,
    image: `/course-maps/${code}.svg`,
  };
}

function addUnique(target: CampusMap[], map: CampusMap | null) {
  if (map && !target.some((candidate) => candidate.key === map.key)) target.push(map);
}

function mapJapaneseBuilding(segment: string): CampusMap | null {
  const patterns: Array<[RegExp, BuildingPrefix]> = [
    [/^(?:総合校舎|総合)\s*(\d{1,2})/u, "G"],
    [/^(?:工学部|工)\s*(\d{1,2})/u, "T"],
    [/^(?:法政経学部|法)\s*(\d{1,2})/u, "L"],
    [/^(?:理学部|理)\s*(\d{1,2})/u, "S"],
    [/^(?:教育学部|教)\s*(\d{1,2})/u, "E"],
  ];

  for (const [pattern, prefix] of patterns) {
    const match = segment.match(pattern);
    if (match) return buildingMap(prefix, Number(match[1]));
  }
  return null;
}

/** CSVの授業場所表記から、表示するキャンパスマップを順番どおりに返します。 */
export function mapsForLocation(location: string): CampusMap[] {
  const maps: CampusMap[] = [];

  if (/工総研2|工学系総合研究棟2/u.test(location)) addUnique(maps, specialMaps.engineeringResearch2);
  if (/高度デジタル創造センター/u.test(location)) addUnique(maps, specialMaps.advancedDigitalCenter);
  if (/国際教育センター/u.test(location)) addUnique(maps, specialMaps.internationalEducationCenter);
  if (/情報戦略機構/u.test(location)) addUnique(maps, specialMaps.informationStrategyCenter);

  for (const segment of location.split(/[:：]/u).map((part) => part.trim()).filter(Boolean)) {
    const direct = segment.match(/^([GLSTE])\s*(\d{1,2})/iu);
    if (direct) {
      addUnique(maps, buildingMap(direct[1].toUpperCase() as BuildingPrefix, Number(direct[2])));
      continue;
    }

    const japaneseBuilding = mapJapaneseBuilding(segment);
    if (japaneseBuilding) {
      addUnique(maps, japaneseBuilding);
      continue;
    }

    if (/^(?:情(?:報)?\d+|情イノベーションシアター|メディア)/u.test(segment)) {
      addUnique(maps, specialMaps.informationBuilding);
    }
  }

  return maps;
}
