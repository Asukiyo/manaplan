"use client";

import { useCallback, useEffect, useState } from "react";
import type { NewPlayer, SaveData } from "./types";

const storageKey = "campus-quest-save-data-v1";

export function useSaveData() {
  const [saves, setSaves] = useState<SaveData[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        setSaves(stored ? JSON.parse(stored) : []);
      } catch {
        setSaves([]);
      }
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const commit = useCallback(
    (update: (current: SaveData[]) => SaveData[]) =>
      setSaves((current) => {
        const next = update(current);
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      }),
    [],
  );

  const createSave = useCallback(
    (player: NewPlayer) => {
      const now = new Date().toISOString();
      const save: SaveData = {
        ...player,
        id: crypto.randomUUID(),
        registeredCourseIds: [],
        gameDate: "2026-07-01",
        attackPoints: 0,
        completedCourseIds: [],
        defeatedBossIds: [],
        createdAt: now,
        updatedAt: now,
      };
      commit((current) => [...current, save]);
      return save;
    },
    [commit],
  );

  const updateSave = useCallback(
    (id: string, patch: Partial<SaveData>) =>
      commit((current) =>
        current.map((save) =>
          save.id === id
            ? { ...save, ...patch, updatedAt: new Date().toISOString() }
            : save,
        ),
      ),
    [commit],
  );

  const updateCourses = useCallback(
    (id: string, ids: number[]) => updateSave(id, { registeredCourseIds: ids }),
    [updateSave],
  );
  const deleteSave = useCallback(
    (id: string) => commit((current) => current.filter((save) => save.id !== id)),
    [commit],
  );

  return { saves, loaded, createSave, updateSave, updateCourses, deleteSave };
}
