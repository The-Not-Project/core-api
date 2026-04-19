import type { Request, Response } from "express";
import { fetchStories } from "../.helpers/story.helpers.js";
import { prisma } from "@/prisma/index.js";

export async function getRecommendations(req: Request, res: Response) {
  try {
    const stories = await fetchStories({
      where: { isRecommended: true },
      take: 4,
    });

    res.json(stories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recommended stories" });
  }
};

export async function addRecommendation(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Story ID is required" });
    }

    await prisma.story.update({
      where: { id: id as string },
      data: { isRecommended: true },
    });

    res.status(204).send();
  } catch (err: any) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Story not found" });
    res.status(500).json({ error: "Failed to update recommendation" });
  }
};

export async function removeRecommendation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Story ID is required" });
    }

    await prisma.story.update({
      where: { id: id as string },
      data: { isRecommended: false },
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove recommendation" });
  }
};